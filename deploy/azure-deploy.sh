#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# FinMind – Azure Container Apps one-click deploy
#
# Prerequisites:
#   - Azure CLI authenticated (az login)
#   - Subscription selected (az account set -s SUBSCRIPTION_ID)
#
# Usage:
#   export AZURE_RESOURCE_GROUP=finmind-rg
#   export AZURE_LOCATION=eastus
#   ./deploy/azure-deploy.sh
###############################################################################

RG="${AZURE_RESOURCE_GROUP:-finmind-rg}"
LOCATION="${AZURE_LOCATION:-eastus}"
ACR_NAME="finmindregistry"
ENV_NAME="finmind-env"

echo "==> FinMind Azure Container Apps Deploy"
echo "    Resource Group: ${RG}"
echo "    Location      : ${LOCATION}"

# ── 1. Create resource group ──
echo "==> Creating resource group..."
az group create --name "$RG" --location "$LOCATION" -o none

# ── 2. Create Container Registry ──
echo "==> Creating ACR..."
az acr create --resource-group "$RG" --name "$ACR_NAME" --sku Basic --admin-enabled true -o none
ACR_SERVER="${ACR_NAME}.azurecr.io"
ACR_PASS=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

# ── 3. Build & push images ──
echo "==> Building backend image..."
az acr build --registry "$ACR_NAME" --image finmind-backend:latest --file packages/backend/Dockerfile packages/backend/

echo "==> Building frontend image..."
az acr build --registry "$ACR_NAME" --image finmind-frontend:latest --file app/Dockerfile app/

# ── 4. Create Container Apps environment ──
echo "==> Creating Container Apps environment..."
az containerapp env create \
  --name "$ENV_NAME" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  -o none

# ── 5. Deploy backend ──
echo "==> Deploying backend..."
az containerapp create \
  --name finmind-backend \
  --resource-group "$RG" \
  --environment "$ENV_NAME" \
  --image "${ACR_SERVER}/finmind-backend:latest" \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASS" \
  --target-port 8000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars "LOG_LEVEL=INFO" "PORT=8000" \
  --secrets "jwt-secret=CHANGE_ME" \
  --command "sh" "-c" "python -m flask --app wsgi:app init-db && gunicorn -w 2 -k gthread --timeout 120 -b 0.0.0.0:8000 wsgi:app" \
  -o none

BACKEND_FQDN=$(az containerapp show --name finmind-backend --resource-group "$RG" --query "properties.configuration.ingress.fqdn" -o tsv)

# ── 6. Deploy frontend ──
echo "==> Deploying frontend..."
az containerapp create \
  --name finmind-frontend \
  --resource-group "$RG" \
  --environment "$ENV_NAME" \
  --image "${ACR_SERVER}/finmind-frontend:latest" \
  --registry-server "$ACR_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASS" \
  --target-port 80 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 5 \
  --cpu 0.25 \
  --memory 0.5Gi \
  -o none

FRONTEND_FQDN=$(az containerapp show --name finmind-frontend --resource-group "$RG" --query "properties.configuration.ingress.fqdn" -o tsv)

echo ""
echo "============================================"
echo "  FinMind deployed to Azure Container Apps!"
echo "  Backend : https://${BACKEND_FQDN}/health"
echo "  Frontend: https://${FRONTEND_FQDN}"
echo ""
echo "  IMPORTANT: Set DATABASE_URL, REDIS_URL,"
echo "  JWT_SECRET as Container App secrets."
echo "============================================"
