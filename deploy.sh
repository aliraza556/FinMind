#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# FinMind – Universal One-Click Deploy Script
#
# Usage:
#   ./deploy.sh <platform>
#
# Platforms:
#   docker-dev      – Docker Compose (development, hot-reload)
#   docker-prod     – Docker Compose (production)
#   railway         – Railway
#   heroku          – Heroku (container stack)
#   render          – Render (opens dashboard)
#   flyio           – Fly.io
#   digitalocean    – DigitalOcean Droplet
#   aws             – AWS ECS Fargate
#   gcp             – GCP Cloud Run
#   azure           – Azure Container Apps
#   k8s             – Kubernetes via Helm
#   tilt            – Tilt local K8s dev
#   verify          – Verify a running deployment
###############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

ensure_env() {
    if [ ! -f .env ]; then
        info "Creating .env from .env.example..."
        cp .env.example .env
        warn "Please edit .env with your production values (especially JWT_SECRET)."
    fi
}

check_cmd() {
    command -v "$1" &>/dev/null || error "'$1' is not installed. Please install it first."
}

# ── Platform deploy functions ──

deploy_docker_dev() {
    info "Starting FinMind in development mode..."
    check_cmd docker
    ensure_env
    docker compose up --build
}

deploy_docker_prod() {
    info "Starting FinMind in production mode..."
    check_cmd docker
    ensure_env
    docker compose -f docker-compose.prod.yml up -d --build
    info "Waiting for services to start..."
    sleep 15
    verify_deployment "http://localhost"
}

deploy_railway() {
    info "Deploying to Railway..."
    check_cmd railway
    ensure_env
    railway up
    success "Deployed to Railway."
}

deploy_heroku() {
    info "Deploying to Heroku..."
    check_cmd heroku
    local APP="${HEROKU_APP_NAME:-finmind-app}"
    heroku container:login
    heroku create "$APP" --stack container 2>/dev/null || true
    heroku addons:create heroku-postgresql:essential-0 -a "$APP" 2>/dev/null || true
    heroku addons:create heroku-redis:mini -a "$APP" 2>/dev/null || true
    heroku config:set JWT_SECRET="$(openssl rand -hex 32)" -a "$APP"
    git push heroku main
    success "Deployed to Heroku: https://${APP}.herokuapp.com"
}

deploy_render() {
    info "Render uses render.yaml blueprint."
    info "Go to https://render.com/deploy and connect this repo."
    info "Render will auto-detect render.yaml and provision all services."
    success "Blueprint file ready: render.yaml"
}

deploy_flyio() {
    info "Deploying to Fly.io..."
    check_cmd fly
    fly launch --config fly.toml --no-deploy --yes 2>/dev/null || true
    fly postgres create --name finmind-db 2>/dev/null || warn "Postgres may already exist"
    fly postgres attach finmind-db 2>/dev/null || warn "Postgres may already be attached"
    fly secrets set JWT_SECRET="$(openssl rand -hex 32)" 2>/dev/null || true
    fly deploy
    info "Deploying frontend..."
    fly launch --config deploy/fly-frontend.toml --no-deploy --yes 2>/dev/null || true
    fly deploy --config deploy/fly-frontend.toml
    success "Deployed to Fly.io"
}

deploy_digitalocean() {
    info "Deploying to DigitalOcean Droplet..."
    chmod +x deploy/digitalocean-droplet.sh
    exec deploy/digitalocean-droplet.sh
}

deploy_aws() {
    info "Deploying to AWS ECS Fargate..."
    chmod +x deploy/aws-deploy.sh
    exec deploy/aws-deploy.sh
}

deploy_gcp() {
    info "Deploying to GCP Cloud Run..."
    chmod +x deploy/gcp-deploy.sh
    exec deploy/gcp-deploy.sh
}

deploy_azure() {
    info "Deploying to Azure Container Apps..."
    chmod +x deploy/azure-deploy.sh
    exec deploy/azure-deploy.sh
}

deploy_k8s() {
    info "Deploying to Kubernetes via Helm..."
    check_cmd helm
    check_cmd kubectl

    local JWT="${JWT_SECRET:-$(openssl rand -hex 32)}"
    local PG_PASS="${POSTGRES_PASSWORD:-$(openssl rand -hex 16)}"

    helm upgrade --install finmind ./k8s/helm/finmind \
        --namespace finmind \
        --create-namespace \
        --set secrets.jwtSecret="$JWT" \
        --set secrets.postgresPassword="$PG_PASS" \
        --set "secrets.databaseUrl=postgresql+psycopg2://finmind:${PG_PASS}@finmind-postgres:5432/finmind" \
        --wait \
        --timeout 5m

    success "FinMind deployed to Kubernetes namespace 'finmind'"
    kubectl get pods -n finmind
}

deploy_tilt() {
    info "Starting Tilt local K8s development..."
    check_cmd tilt
    check_cmd kubectl
    tilt up
}

# ── Verification ──

verify_deployment() {
    local BASE_URL="${1:-http://localhost}"
    local BACKEND="${BASE_URL}:8000"
    local PASS=0
    local FAIL=0

    echo ""
    info "=== FinMind Deployment Verification ==="
    echo ""

    # Frontend
    if curl -sf "${BASE_URL}/" >/dev/null 2>&1; then
        success "Frontend reachable at ${BASE_URL}/"
        PASS=$((PASS+1))
    else
        warn "Frontend NOT reachable at ${BASE_URL}/"
        FAIL=$((FAIL+1))
    fi

    # Backend health
    if curl -sf "${BACKEND}/health" >/dev/null 2>&1; then
        success "Backend health check passed"
        PASS=$((PASS+1))
    else
        warn "Backend health check failed at ${BACKEND}/health"
        FAIL=$((FAIL+1))
    fi

    # Deep health (DB + Redis)
    local READY
    READY=$(curl -sf "${BACKEND}/health/ready" 2>/dev/null || echo "")
    if echo "$READY" | grep -q '"status":"ok"'; then
        success "DB + Redis connected (deep health passed)"
        PASS=$((PASS+1))
    else
        warn "Deep health check failed: ${READY}"
        FAIL=$((FAIL+1))
    fi

    # Auth flow
    local REG_RESP
    REG_RESP=$(curl -sf -X POST "${BACKEND}/auth/register" \
        -H "Content-Type: application/json" \
        -d '{"email":"verify-test@example.com","password":"TestPass123!"}' 2>/dev/null || echo "")
    local LOGIN_RESP
    LOGIN_RESP=$(curl -sf -X POST "${BACKEND}/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"verify-test@example.com","password":"TestPass123!"}' 2>/dev/null || echo "")
    if echo "$LOGIN_RESP" | grep -q "access_token"; then
        success "Auth flow working (register + login)"
        PASS=$((PASS+1))
    else
        warn "Auth flow verification failed"
        FAIL=$((FAIL+1))
    fi

    # Core modules (with token)
    local TOKEN
    TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
    if [ -n "$TOKEN" ]; then
        for endpoint in expenses/ bills/ reminders/ categories/ dashboard/summary insights/; do
            local RESP_CODE
            RESP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" \
                -H "Authorization: Bearer ${TOKEN}" \
                "${BACKEND}/${endpoint}" 2>/dev/null || echo "000")
            if [ "$RESP_CODE" -ge 200 ] && [ "$RESP_CODE" -lt 500 ]; then
                success "/${endpoint} reachable (HTTP ${RESP_CODE})"
                PASS=$((PASS+1))
            else
                warn "/${endpoint} failed (HTTP ${RESP_CODE})"
                FAIL=$((FAIL+1))
            fi
        done
    else
        warn "Could not obtain auth token – skipping module checks"
        FAIL=$((FAIL+6))
    fi

    echo ""
    echo "============================================"
    echo -e "  Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}"
    echo "============================================"

    [ "$FAIL" -eq 0 ] && return 0 || return 1
}

# ── Main ──

usage() {
    echo "Usage: $0 <platform>"
    echo ""
    echo "Platforms:"
    echo "  docker-dev      Docker Compose (development)"
    echo "  docker-prod     Docker Compose (production)"
    echo "  railway         Railway"
    echo "  heroku          Heroku"
    echo "  render          Render"
    echo "  flyio           Fly.io"
    echo "  digitalocean    DigitalOcean Droplet"
    echo "  aws             AWS ECS Fargate"
    echo "  gcp             GCP Cloud Run"
    echo "  azure           Azure Container Apps"
    echo "  k8s             Kubernetes (Helm)"
    echo "  tilt            Tilt local K8s"
    echo "  verify [URL]    Verify deployment"
    exit 1
}

PLATFORM="${1:-}"
[ -z "$PLATFORM" ] && usage

case "$PLATFORM" in
    docker-dev)     deploy_docker_dev ;;
    docker-prod)    deploy_docker_prod ;;
    railway)        deploy_railway ;;
    heroku)         deploy_heroku ;;
    render)         deploy_render ;;
    flyio)          deploy_flyio ;;
    digitalocean)   deploy_digitalocean ;;
    aws)            deploy_aws ;;
    gcp)            deploy_gcp ;;
    azure)          deploy_azure ;;
    k8s)            deploy_k8s ;;
    tilt)           deploy_tilt ;;
    verify)         verify_deployment "${2:-http://localhost}" ;;
    *)              error "Unknown platform: $PLATFORM" ;;
esac
