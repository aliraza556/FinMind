#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# FinMind – AWS ECS Fargate one-click deploy
#
# Prerequisites:
#   - AWS CLI v2 configured (aws configure)
#   - Docker installed
#   - Existing VPC with public subnets
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

echo "==> FinMind AWS ECS Fargate Deploy"
echo "    Region  : ${REGION}"
echo "    Account : ${ACCOUNT_ID}"

# ── 1. Create ECR repositories ──
echo "==> Creating ECR repositories..."
for repo in "$REPO_BACKEND" "$REPO_FRONTEND"; do
  aws ecr describe-repositories --repository-names "$repo" --region "$REGION" 2>/dev/null || \
    aws ecr create-repository --repository-name "$repo" --region "$REGION"
done

# ── 2. Authenticate Docker to ECR ──
echo "==> Authenticating Docker to ECR..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# ── 3. Build & push images ──
echo "==> Building backend..."
docker build -t "${REPO_BACKEND}:latest" -f packages/backend/Dockerfile packages/backend/
docker tag "${REPO_BACKEND}:latest" "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_BACKEND}:latest"
docker push "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_BACKEND}:latest"

echo "==> Building frontend..."
docker build -t "${REPO_FRONTEND}:latest" -f app/Dockerfile app/
docker tag "${REPO_FRONTEND}:latest" "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_FRONTEND}:latest"
docker push "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_FRONTEND}:latest"

# ── 4. Create ECS cluster ──
echo "==> Creating ECS cluster..."
aws ecs describe-clusters --clusters "$CLUSTER_NAME" --region "$REGION" 2>/dev/null | \
  grep -q "ACTIVE" || \
  aws ecs create-cluster --cluster-name "$CLUSTER_NAME" --region "$REGION"

# ── 5. Create Secrets Manager secrets (if not exist) ──
echo "==> Ensuring secrets exist..."
for secret in "finmind/database-url" "finmind/redis-url" "finmind/jwt-secret"; do
  aws secretsmanager describe-secret --secret-id "$secret" --region "$REGION" 2>/dev/null || \
    aws secretsmanager create-secret --name "$secret" --secret-string "CHANGE_ME" --region "$REGION"
done

# ── 6. Create CloudWatch log group ──
aws logs create-log-group --log-group-name "/ecs/finmind" --region "$REGION" 2>/dev/null || true

# ── 7. Register task definition ──
echo "==> Registering task definition..."
TASK_DEF=$(cat deploy/aws-ecs-task-definition.json | \
  sed "s/ACCOUNT_ID/${ACCOUNT_ID}/g" | \
  sed "s/REGION/${REGION}/g")
echo "$TASK_DEF" | aws ecs register-task-definition --cli-input-json file:///dev/stdin --region "$REGION"

echo ""
echo "============================================"
echo "  ECR images pushed, cluster + task created."
echo "  Next steps:"
echo "    1. Update secrets in AWS Secrets Manager"
echo "    2. Create ALB + target group"
echo "    3. Create ECS service (see aws-ecs-service.json)"
echo "============================================"
