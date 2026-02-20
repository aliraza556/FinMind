#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# FinMind – GCP Cloud Run one-click deploy
#
# Prerequisites:
#   - gcloud CLI authenticated (gcloud auth login)
#   - Project set (gcloud config set project PROJECT_ID)
#   - Docker installed
#   - Cloud SQL (PostgreSQL) + Memorystore (Redis) provisioned
#
# Usage:
#   export GCP_PROJECT=your-project-id
#   export GCP_REGION=us-central1
#   ./deploy/gcp-deploy.sh
###############################################################################

PROJECT="${GCP_PROJECT:-$(gcloud config get-value project)}"
REGION="${GCP_REGION:-us-central1}"

echo "==> FinMind GCP Cloud Run Deploy"
echo "    Project: ${PROJECT}"
echo "    Region : ${REGION}"

# ── 1. Enable required APIs ──
echo "==> Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project="$PROJECT"

# ── 2. Build & push backend image ──
echo "==> Building backend with Cloud Build..."
gcloud builds submit packages/backend/ \
  --tag "gcr.io/${PROJECT}/finmind-backend:latest" \
  --project="$PROJECT"

# ── 3. Build & push frontend image ──
echo "==> Building frontend with Cloud Build..."
gcloud builds submit app/ \
  --tag "gcr.io/${PROJECT}/finmind-frontend:latest" \
  --project="$PROJECT"

# ── 4. Create secrets (if not exist) ──
echo "==> Ensuring secrets exist..."
for secret in finmind-database-url finmind-redis-url finmind-jwt-secret; do
  gcloud secrets describe "$secret" --project="$PROJECT" 2>/dev/null || \
    echo -n "CHANGE_ME" | gcloud secrets create "$secret" --data-file=- --project="$PROJECT"
done

# ── 5. Deploy backend to Cloud Run ──
echo "==> Deploying backend..."
gcloud run deploy finmind-backend \
  --image "gcr.io/${PROJECT}/finmind-backend:latest" \
  --platform managed \
  --region "$REGION" \
  --port 8000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars "LOG_LEVEL=INFO,PORT=8000" \
  --set-secrets "DATABASE_URL=finmind-database-url:latest,REDIS_URL=finmind-redis-url:latest,JWT_SECRET=finmind-jwt-secret:latest" \
  --allow-unauthenticated \
  --project="$PROJECT"

BACKEND_URL=$(gcloud run services describe finmind-backend --region="$REGION" --project="$PROJECT" --format="value(status.url)")

# ── 6. Deploy frontend to Cloud Run ──
echo "==> Deploying frontend..."
gcloud run deploy finmind-frontend \
  --image "gcr.io/${PROJECT}/finmind-frontend:latest" \
  --platform managed \
  --region "$REGION" \
  --port 80 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 5 \
  --set-env-vars "VITE_API_URL=${BACKEND_URL}" \
  --allow-unauthenticated \
  --project="$PROJECT"

FRONTEND_URL=$(gcloud run services describe finmind-frontend --region="$REGION" --project="$PROJECT" --format="value(status.url)")

echo ""
echo "============================================"
echo "  FinMind deployed to GCP Cloud Run!"
echo "  Backend : ${BACKEND_URL}/health"
echo "  Frontend: ${FRONTEND_URL}"
echo "============================================"
