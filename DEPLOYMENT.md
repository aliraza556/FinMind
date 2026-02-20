# FinMind – Universal Deployment Guide

Production-grade, one-click deployment for FinMind across all major platforms.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Docker (Local / Production)](#docker-local--production)
- [Railway](#railway)
- [Heroku](#heroku)
- [Render](#render)
- [Fly.io](#flyio)
- [DigitalOcean App Platform](#digitalocean-app-platform)
- [DigitalOcean Droplet](#digitalocean-droplet)
- [AWS ECS Fargate](#aws-ecs-fargate)
- [AWS App Runner](#aws-app-runner)
- [GCP Cloud Run](#gcp-cloud-run)
- [Azure Container Apps](#azure-container-apps)
- [Netlify (Frontend)](#netlify-frontend)
- [Vercel (Frontend)](#vercel-frontend)
- [Kubernetes (Cloud-Agnostic)](#kubernetes-cloud-agnostic)
- [Tilt (Local K8s Development)](#tilt-local-k8s-development)
- [Health Checks & Verification](#health-checks--verification)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  Frontend   │────▶│   Backend    │────▶│ PostgreSQL  │
│ React/Nginx │     │ Flask/Gunicorn│    │   16        │
│  port 80    │     │  port 8000   │────▶│────────────│
└─────────────┘     └──────────────┘     │   Redis 7  │
                                          └────────────┘
```

| Component | Technology | Port |
|-----------|-----------|------|
| Frontend | React 18 + Vite + Nginx | 80 |
| Backend | Flask 3 + Gunicorn | 8000 |
| Database | PostgreSQL 16 | 5432 |
| Cache | Redis 7 | 6379 |

---

## Prerequisites

- **Docker** 20.10+ and Docker Compose v2
- **Node.js** 20+ (for frontend builds)
- **Python** 3.11+ (for backend)
- **Git**

Platform-specific CLIs as needed (railway, heroku, flyctl, gcloud, az, aws).

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql+psycopg2://finmind:finmind@postgres:5432/finmind` | PostgreSQL connection |
| `REDIS_URL` | Yes | `redis://redis:6379/0` | Redis connection |
| `JWT_SECRET` | Yes | `change-me` | JWT signing key (**change in production**) |
| `VITE_API_URL` | Yes | `http://localhost:8000` | Backend URL for frontend |
| `POSTGRES_USER` | No | `finmind` | PostgreSQL username |
| `POSTGRES_PASSWORD` | No | `finmind` | PostgreSQL password |
| `POSTGRES_DB` | No | `finmind` | PostgreSQL database name |
| `LOG_LEVEL` | No | `INFO` | Logging level |
| `OPENAI_API_KEY` | No | - | OpenAI API key (for AI insights) |
| `GEMINI_API_KEY` | No | - | Google Gemini key |
| `TWILIO_ACCOUNT_SID` | No | - | Twilio SID (for WhatsApp reminders) |
| `TWILIO_AUTH_TOKEN` | No | - | Twilio auth token |

---

## Docker (Local / Production)

### Development (with hot-reload)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Health: http://localhost:8000/health

### Production

```bash
cp .env.example .env
# Edit .env with production values (strong JWT_SECRET, etc.)
docker compose -f docker-compose.prod.yml up -d --build
```

- Frontend: http://localhost:80
- Backend: http://localhost:8000
- Deep health: http://localhost:8000/health/ready

---

## Railway

### One-Click

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

### Manual

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and initialize
railway login
railway init

# Add PostgreSQL and Redis plugins
railway add -p postgresql
railway add -p redis

# Set environment variables
railway variables set JWT_SECRET=$(openssl rand -hex 32)
railway variables set LOG_LEVEL=INFO

# Deploy
railway up
```

Configuration: `railway.json` / `railway.toml`

---

## Heroku

### One-Click

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

### Manual (Container Stack)

```bash
# Login
heroku login
heroku container:login

# Create app with addons
heroku create finmind-app --stack container
heroku addons:create heroku-postgresql:essential-0
heroku addons:create heroku-redis:mini

# Set config vars
heroku config:set JWT_SECRET=$(openssl rand -hex 32)
heroku config:set LOG_LEVEL=INFO

# Deploy using heroku.yml
git push heroku main
```

Configuration: `heroku.yml`, `app.json`, `Procfile`

---

## Render

### One-Click

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Manual

1. Connect your GitHub repository to Render.
2. Render auto-detects `render.yaml` (Blueprint).
3. Click **New Blueprint Instance**.
4. Render provisions PostgreSQL, Redis, backend, and frontend automatically.

Configuration: `render.yaml`

---

## Fly.io

### Backend

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch backend
fly launch --config fly.toml --no-deploy

# Create PostgreSQL and Redis
fly postgres create --name finmind-db
fly postgres attach finmind-db
fly redis create --name finmind-redis

# Set secrets
fly secrets set JWT_SECRET=$(openssl rand -hex 32)
fly secrets set REDIS_URL=redis://...

# Deploy
fly deploy
```

### Frontend

```bash
fly launch --config deploy/fly-frontend.toml --no-deploy
fly deploy --config deploy/fly-frontend.toml
```

Configuration: `fly.toml`, `deploy/fly-frontend.toml`

---

## DigitalOcean App Platform

### One-Click

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps).
2. Connect your GitHub repo.
3. Import `.do/app.yaml` as the App Spec.
4. Review and deploy.

Configuration: `.do/app.yaml`

---

## DigitalOcean Droplet

### One-Click (SSH into droplet)

```bash
export FINMIND_DOMAIN="finmind.example.com"
export JWT_SECRET=$(openssl rand -hex 32)
curl -sSL https://raw.githubusercontent.com/your-org/FinMind/main/deploy/digitalocean-droplet.sh | bash
```

### Manual

```bash
git clone https://github.com/your-org/FinMind /opt/finmind
cd /opt/finmind
chmod +x deploy/digitalocean-droplet.sh
FINMIND_DOMAIN=finmind.example.com ./deploy/digitalocean-droplet.sh
```

The script installs Docker, Nginx, Certbot, and deploys with `docker-compose.prod.yml`.

Configuration: `deploy/digitalocean-droplet.sh`

---

## AWS ECS Fargate

### One-Click

```bash
export AWS_REGION=us-east-1
chmod +x deploy/aws-deploy.sh
./deploy/aws-deploy.sh
```

### Manual Steps

1. Create ECR repositories for `finmind-backend` and `finmind-frontend`.
2. Build and push Docker images.
3. Create secrets in AWS Secrets Manager.
4. Register ECS task definition from `deploy/aws-ecs-task-definition.json`.
5. Create ALB with target group.
6. Create ECS service from `deploy/aws-ecs-service.json`.

Configuration: `deploy/aws-ecs-task-definition.json`, `deploy/aws-ecs-service.json`, `deploy/aws-deploy.sh`

---

## AWS App Runner

```bash
# Create App Runner service via console or CLI using:
# deploy/aws-apprunner.yaml

aws apprunner create-service \
  --service-name finmind-backend \
  --source-configuration file://deploy/aws-apprunner.yaml
```

Configuration: `deploy/aws-apprunner.yaml`

---

## GCP Cloud Run

### One-Click

```bash
export GCP_PROJECT=your-project-id
export GCP_REGION=us-central1
chmod +x deploy/gcp-deploy.sh
./deploy/gcp-deploy.sh
```

### Manual

```bash
# Build with Cloud Build
gcloud builds submit packages/backend/ --tag gcr.io/$PROJECT/finmind-backend

# Deploy
gcloud run deploy finmind-backend \
  --image gcr.io/$PROJECT/finmind-backend \
  --port 8000 \
  --allow-unauthenticated
```

Configuration: `deploy/gcp-cloudrun.yaml`, `deploy/gcp-deploy.sh`

---

## Azure Container Apps

### One-Click

```bash
export AZURE_RESOURCE_GROUP=finmind-rg
export AZURE_LOCATION=eastus
chmod +x deploy/azure-deploy.sh
./deploy/azure-deploy.sh
```

### Manual

1. Create resource group and Container Registry.
2. Build and push images via ACR.
3. Create Container Apps environment.
4. Deploy using `deploy/azure-containerapp.yaml`.

Configuration: `deploy/azure-containerapp.yaml`, `deploy/azure-deploy.sh`

---

## Netlify (Frontend)

### One-Click

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

### Manual

1. Connect your GitHub repo to Netlify.
2. Set **Base directory** to `app/`.
3. Set **Build command** to `npm ci && npm run build`.
4. Set **Publish directory** to `app/dist`.
5. Add environment variable `VITE_API_URL` pointing to your backend.

Configuration: `netlify.toml`

---

## Vercel (Frontend)

### One-Click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd app
vercel --prod
```

Set `VITE_API_URL` in Vercel project environment variables.

Configuration: `vercel.json`

---

## Kubernetes (Cloud-Agnostic)

Full Helm chart with production features: autoscaling, TLS, health probes, network policies, observability.

### Quick Start

```bash
# Create namespace and install
helm install finmind ./k8s/helm/finmind \
  --namespace finmind \
  --create-namespace \
  --set secrets.jwtSecret=$(openssl rand -hex 32) \
  --set secrets.postgresPassword=$(openssl rand -hex 16) \
  --set ingress.hosts[0].host=finmind.example.com
```

### With Custom Values

```bash
# Copy and edit values
cp k8s/helm/finmind/values.yaml my-values.yaml
# Edit my-values.yaml with your settings

helm install finmind ./k8s/helm/finmind \
  --namespace finmind \
  --create-namespace \
  -f my-values.yaml
```

### Upgrade

```bash
helm upgrade finmind ./k8s/helm/finmind \
  --namespace finmind \
  -f my-values.yaml
```

### Features

| Feature | Status |
|---------|--------|
| Helm charts | Included |
| Ingress + TLS (cert-manager) | Included |
| HPA autoscaling (CPU/Memory) | Included |
| Secret management | Kubernetes Secrets |
| Health probes (startup/readiness/liveness) | All components |
| Network policies | PostgreSQL + Redis isolated |
| ServiceMonitor (Prometheus) | Optional (`observability.serviceMonitor.enabled=true`) |
| Init-DB job (Helm hook) | Automatic |

### TLS Setup

Requires [cert-manager](https://cert-manager.io/) installed in the cluster:

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Observability

Enable Prometheus ServiceMonitor:

```bash
helm install finmind ./k8s/helm/finmind \
  --set observability.serviceMonitor.enabled=true
```

---

## Tilt (Local K8s Development)

Tilt provides rapid local Kubernetes development with live-reload.

### Prerequisites

1. [Tilt](https://docs.tilt.dev/install.html) installed.
2. Local Kubernetes cluster (kind, minikube, or k3d).

### Quick Start

```bash
# Create a local cluster
kind create cluster --name finmind

# Start Tilt
tilt up
```

### What Tilt Does

- Builds Docker images locally (no push needed).
- Deploys all services to your local K8s cluster using Helm.
- Live-syncs code changes (no rebuild needed for Python/JS changes).
- Port-forwards all services:
  - Frontend: http://localhost:5173
  - Backend: http://localhost:8000
  - PostgreSQL: localhost:5432
  - Redis: localhost:6379

### Tilt UI

Open http://localhost:10350 to see the Tilt dashboard with:
- Build/deploy status for each service
- Live logs
- Resource health
- Manual action buttons (DB init, run tests)

### Cleanup

```bash
tilt down
kind delete cluster --name finmind
```

Configuration: `Tiltfile`

---

## Health Checks & Verification

After deploying on any platform, verify:

### 1. Frontend Reachable

```bash
curl -f https://your-domain.com/
```

### 2. Backend Health

```bash
# Basic health
curl -f https://your-domain.com/health
# Expected: {"status":"ok"}

# Deep health (DB + Redis)
curl -f https://your-domain.com/health/ready
# Expected: {"checks":{"database":"connected","redis":"connected"},"status":"ok"}
```

### 3. Auth Flow

```bash
# Register
curl -X POST https://your-domain.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# Login
curl -X POST https://your-domain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
```

### 4. Core Modules

```bash
TOKEN="your-access-token"

# Dashboard
curl -H "Authorization: Bearer $TOKEN" https://your-domain.com/dashboard/summary

# Expenses
curl -H "Authorization: Bearer $TOKEN" https://your-domain.com/expenses/

# Bills
curl -H "Authorization: Bearer $TOKEN" https://your-domain.com/bills/

# Reminders
curl -H "Authorization: Bearer $TOKEN" https://your-domain.com/reminders/

# Insights
curl -H "Authorization: Bearer $TOKEN" https://your-domain.com/insights/

# Categories
curl -H "Authorization: Bearer $TOKEN" https://your-domain.com/categories/
```

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
docker compose logs backend
# or
kubectl logs -n finmind deploy/finmind-backend
```

Common causes:
- Database not ready (wait for PostgreSQL health check)
- Invalid `DATABASE_URL` format
- Missing `JWT_SECRET`

### Database connection refused

- Ensure PostgreSQL is running and healthy
- Verify `DATABASE_URL` matches the PostgreSQL host/port
- For K8s: check service DNS (`finmind-postgres.finmind.svc.cluster.local`)

### Redis connection refused

- Ensure Redis is running
- Verify `REDIS_URL` format
- For K8s: check service DNS (`finmind-redis.finmind.svc.cluster.local`)

### Frontend shows blank page

- Check browser console for errors
- Verify `VITE_API_URL` was set correctly at **build time**
- Rebuild frontend if `VITE_API_URL` changed

### TLS/SSL not working

- Ensure cert-manager is installed (K8s)
- Verify DNS points to your ingress/load balancer
- Check certificate status: `kubectl get certificates -n finmind`
