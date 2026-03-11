#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# FinMind – AWS ECS Fargate one-click deploy (end-to-end)
#
# Deploys both backend AND frontend behind an Application Load Balancer.
# The script handles: ECR repos, images, ECS cluster, ALB, target groups,
# path-based routing, security groups, IAM roles, and service creation.
#
# Prerequisites:
#   - AWS CLI v2 configured (aws configure)
#   - Docker installed
#
# Usage:
#   export AWS_REGION=us-east-1
#   export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
#   ./deploy/aws-deploy.sh
###############################################################################

REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
CLUSTER_NAME="finmind-cluster"
REPO_BACKEND="finmind-backend"
REPO_FRONTEND="finmind-frontend"
EXECUTION_ROLE="ecsTaskExecutionRole"
SG_NAME="finmind-ecs-sg"

echo "==> FinMind AWS ECS Fargate Deploy"
echo "    Region  : ${REGION}"
echo "    Account : ${ACCOUNT_ID}"

# ── 1. Create ECR repositories ──
echo "==> Creating ECR repositories..."
for repo in "$REPO_BACKEND" "$REPO_FRONTEND"; do
  aws ecr describe-repositories --repository-names "$repo" --region "$REGION" 2>/dev/null || \
    aws ecr create-repository --repository-name "$repo" --region "$REGION" --output text
done

# ── 2. Authenticate Docker to ECR ──
echo "==> Authenticating Docker to ECR..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# ── 3. Create ECS cluster ──
echo "==> Creating ECS cluster..."
aws ecs describe-clusters --clusters "$CLUSTER_NAME" --region "$REGION" 2>/dev/null | \
  grep -q "ACTIVE" || \
  aws ecs create-cluster --cluster-name "$CLUSTER_NAME" --region "$REGION" --output text

# ── 4. Create Secrets Manager secrets (if not exist) ──
echo "==> Ensuring secrets exist..."
for secret in "finmind/database-url" "finmind/redis-url" "finmind/jwt-secret"; do
  aws secretsmanager describe-secret --secret-id "$secret" --region "$REGION" 2>/dev/null || \
    aws secretsmanager create-secret --name "$secret" --secret-string "CHANGE_ME" --region "$REGION" --output text
done

# ── 5. Create CloudWatch log group ──
aws logs create-log-group --log-group-name "/ecs/finmind" --region "$REGION" 2>/dev/null || true

# ── 6. Ensure IAM execution role exists ──
echo "==> Ensuring ECS execution role..."
if ! aws iam get-role --role-name "$EXECUTION_ROLE" 2>/dev/null; then
  aws iam create-role --role-name "$EXECUTION_ROLE" \
    --assume-role-policy-document '{
      "Version":"2012-10-17",
      "Statement":[{
        "Effect":"Allow",
        "Principal":{"Service":"ecs-tasks.amazonaws.com"},
        "Action":"sts:AssumeRole"
      }]
    }' --output text
  aws iam attach-role-policy --role-name "$EXECUTION_ROLE" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
  aws iam attach-role-policy --role-name "$EXECUTION_ROLE" \
    --policy-arn "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
  echo "    Waiting for role propagation..."
  sleep 10
fi

# ── 7. Networking: detect VPC, subnets, create security group ──
echo "==> Setting up networking..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" \
  --query "Vpcs[0].VpcId" --output text --region "$REGION")
if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
  echo "ERROR: No default VPC found. Create one with: aws ec2 create-default-vpc"
  exit 1
fi
echo "    VPC: ${VPC_ID}"

# Get public subnets (fall back to all subnets)
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[?MapPublicIpOnLaunch==\`true\`].SubnetId" --output text --region "$REGION")
if [ -z "$SUBNET_IDS" ]; then
  SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" \
    --query "Subnets[*].SubnetId" --output text --region "$REGION")
fi
SUBNET_CSV=$(echo "$SUBNET_IDS" | tr '\t' ',' | tr ' ' ',')
echo "    Subnets: ${SUBNET_CSV}"

# Create or find security group
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$VPC_ID" \
  --query "SecurityGroups[0].GroupId" --output text --region "$REGION" 2>/dev/null || echo "None")
if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
  SG_ID=$(aws ec2 create-security-group --group-name "$SG_NAME" \
    --description "FinMind ECS security group" \
    --vpc-id "$VPC_ID" --region "$REGION" --query 'GroupId' --output text)
fi
echo "    Security Group: ${SG_ID}"

# Allow inbound HTTP (idempotent)
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0 --region "$REGION" 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 8000 --cidr 0.0.0.0/0 --region "$REGION" 2>/dev/null || true

# ── 8. Create Application Load Balancer ──
echo "==> Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 describe-load-balancers --names finmind-alb --region "$REGION" \
  --query "LoadBalancers[0].LoadBalancerArn" --output text 2>/dev/null || echo "None")
if [ "$ALB_ARN" = "None" ] || [ -z "$ALB_ARN" ]; then
  ALB_ARN=$(aws elbv2 create-load-balancer --name finmind-alb \
    --subnets $SUBNET_IDS --security-groups "$SG_ID" \
    --region "$REGION" --query 'LoadBalancers[0].LoadBalancerArn' --output text)
  echo "    Waiting for ALB to become active..."
  aws elbv2 wait load-balancer-available --load-balancer-arns "$ALB_ARN" --region "$REGION"
fi
ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns "$ALB_ARN" \
  --query 'LoadBalancers[0].DNSName' --output text --region "$REGION")
echo "    ALB DNS: ${ALB_DNS}"

# ── 9. Build & push images ──
echo "==> Building backend..."
docker build -t "${REPO_BACKEND}:latest" -f packages/backend/Dockerfile packages/backend/
docker tag "${REPO_BACKEND}:latest" "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_BACKEND}:latest"
docker push "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_BACKEND}:latest"

echo "==> Building frontend (VITE_API_URL=http://${ALB_DNS})..."
docker build --build-arg "VITE_API_URL=http://${ALB_DNS}" \
  -t "${REPO_FRONTEND}:latest" -f app/Dockerfile app/
docker tag "${REPO_FRONTEND}:latest" "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_FRONTEND}:latest"
docker push "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_FRONTEND}:latest"

# ── 10. Create target groups ──
echo "==> Creating target groups..."
BACKEND_TG_ARN=$(aws elbv2 describe-target-groups --names finmind-backend-tg --region "$REGION" \
  --query "TargetGroups[0].TargetGroupArn" --output text 2>/dev/null || echo "None")
if [ "$BACKEND_TG_ARN" = "None" ] || [ -z "$BACKEND_TG_ARN" ]; then
  BACKEND_TG_ARN=$(aws elbv2 create-target-group --name finmind-backend-tg \
    --protocol HTTP --port 8000 --vpc-id "$VPC_ID" --target-type ip \
    --health-check-path /health --health-check-interval-seconds 30 \
    --healthy-threshold-count 2 --unhealthy-threshold-count 3 \
    --region "$REGION" --query 'TargetGroups[0].TargetGroupArn' --output text)
fi

FRONTEND_TG_ARN=$(aws elbv2 describe-target-groups --names finmind-frontend-tg --region "$REGION" \
  --query "TargetGroups[0].TargetGroupArn" --output text 2>/dev/null || echo "None")
if [ "$FRONTEND_TG_ARN" = "None" ] || [ -z "$FRONTEND_TG_ARN" ]; then
  FRONTEND_TG_ARN=$(aws elbv2 create-target-group --name finmind-frontend-tg \
    --protocol HTTP --port 80 --vpc-id "$VPC_ID" --target-type ip \
    --health-check-path / --health-check-interval-seconds 30 \
    --healthy-threshold-count 2 --unhealthy-threshold-count 3 \
    --region "$REGION" --query 'TargetGroups[0].TargetGroupArn' --output text)
fi

# ── 11. Configure ALB listener + path-based routing ──
echo "==> Configuring ALB routing..."
LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" --region "$REGION" \
  --query "Listeners[?Port==\`80\`].ListenerArn | [0]" --output text 2>/dev/null || echo "None")
if [ "$LISTENER_ARN" = "None" ] || [ -z "$LISTENER_ARN" ]; then
  LISTENER_ARN=$(aws elbv2 create-listener --load-balancer-arn "$ALB_ARN" \
    --protocol HTTP --port 80 \
    --default-actions "Type=forward,TargetGroupArn=$FRONTEND_TG_ARN" \
    --region "$REGION" --query 'Listeners[0].ListenerArn' --output text)
fi

# Route backend API paths to backend target group
aws elbv2 create-rule --listener-arn "$LISTENER_ARN" --priority 10 \
  --conditions '[{"Field":"path-pattern","Values":["/health","/health/*","/auth/*","/expenses/*","/bills/*","/reminders/*","/insights/*","/categories/*","/dashboard/*"]}]' \
  --actions '[{"Type":"forward","TargetGroupArn":"'"$BACKEND_TG_ARN"'"}]' \
  --region "$REGION" 2>/dev/null || true

# ── 12. Register task definition ──
echo "==> Registering task definition..."
TASK_DEF=$(cat deploy/aws-ecs-task-definition.json | \
  sed "s/ACCOUNT_ID/${ACCOUNT_ID}/g" | \
  sed "s/REGION/${REGION}/g")
echo "$TASK_DEF" | aws ecs register-task-definition --cli-input-json file:///dev/stdin --region "$REGION" --output text

# ── 13. Create or update ECS service ──
echo "==> Creating ECS service..."
EXISTING_SERVICE=$(aws ecs describe-services --cluster "$CLUSTER_NAME" --services finmind --region "$REGION" \
  --query "services[?status=='ACTIVE'].serviceName | [0]" --output text 2>/dev/null || echo "None")

if [ "$EXISTING_SERVICE" != "None" ] && [ -n "$EXISTING_SERVICE" ]; then
  echo "    Updating existing service..."
  aws ecs update-service --cluster "$CLUSTER_NAME" --service finmind \
    --task-definition finmind --force-new-deployment --region "$REGION" --output text
else
  aws ecs create-service \
    --cluster "$CLUSTER_NAME" \
    --service-name finmind \
    --task-definition finmind \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_CSV],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=$BACKEND_TG_ARN,containerName=finmind-backend,containerPort=8000" "targetGroupArn=$FRONTEND_TG_ARN,containerName=finmind-frontend,containerPort=80" \
    --health-check-grace-period-seconds 120 \
    --region "$REGION" --output text
fi

# ── 14. Wait for service to stabilize ──
echo "==> Waiting for service to stabilize (this may take 3-5 minutes)..."
aws ecs wait services-stable --cluster "$CLUSTER_NAME" --services finmind --region "$REGION" || true

echo ""
echo "============================================"
echo "  FinMind deployed to AWS ECS Fargate!"
echo ""
echo "  ALB URL  : http://${ALB_DNS}"
echo "  Backend  : http://${ALB_DNS}/health"
echo "  Frontend : http://${ALB_DNS}/"
echo ""
echo "  NOTE: Update secrets in AWS Secrets Manager"
echo "  with real DATABASE_URL, REDIS_URL, JWT_SECRET"
echo "============================================"
