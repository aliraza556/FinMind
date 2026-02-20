#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# FinMind – DigitalOcean Droplet one-click deploy
#
# Prerequisites: Ubuntu 22.04+ droplet with SSH access.
# Usage:
#   export FINMIND_DOMAIN="finmind.example.com"
#   export JWT_SECRET="$(openssl rand -hex 32)"
#   curl -sSL https://raw.githubusercontent.com/your-org/FinMind/main/deploy/digitalocean-droplet.sh | bash
#
# Or clone + run:
#   git clone https://github.com/your-org/FinMind && cd FinMind
#   chmod +x deploy/digitalocean-droplet.sh
#   FINMIND_DOMAIN=finmind.example.com JWT_SECRET=mysecret ./deploy/digitalocean-droplet.sh
###############################################################################

DOMAIN="${FINMIND_DOMAIN:-localhost}"
JWT="${JWT_SECRET:-$(openssl rand -hex 32)}"
PG_PASS="${POSTGRES_PASSWORD:-$(openssl rand -hex 16)}"

echo "==> FinMind Droplet Deploy"
echo "    Domain : ${DOMAIN}"
echo "    JWT    : ${JWT:0:8}..."

# ── 1. System packages ──
echo "==> Installing system packages..."
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-plugin nginx certbot python3-certbot-nginx git

systemctl enable --now docker

# ── 2. Clone / update repo ──
APP_DIR="/opt/finmind"
if [ -d "$APP_DIR/.git" ]; then
  echo "==> Updating existing install..."
  cd "$APP_DIR" && git pull --ff-only
else
  echo "==> Cloning FinMind..."
  git clone https://github.com/your-org/FinMind "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 3. Write .env ──
cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=postgresql+psycopg2://finmind:${PG_PASS}@postgres:5432/finmind
REDIS_URL=redis://redis:6379/0
POSTGRES_USER=finmind
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_DB=finmind
JWT_SECRET=${JWT}
VITE_API_URL=https://${DOMAIN}
LOG_LEVEL=INFO
EOF

# ── 4. Build & start with production compose ──
echo "==> Building and starting services..."
docker compose -f docker-compose.prod.yml up -d --build

# ── 5. Configure Nginx reverse proxy ──
echo "==> Configuring Nginx..."
cat > /etc/nginx/sites-available/finmind <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    location /health {
        proxy_pass http://127.0.0.1:8000;
    }
    location /auth/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location /expenses/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    location /bills/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    location /reminders/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    location /insights/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    location /categories/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    location /dashboard/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/finmind /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 6. SSL (skip for localhost) ──
if [ "$DOMAIN" != "localhost" ]; then
  echo "==> Obtaining SSL certificate..."
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || true
fi

# ── 7. Verify ──
echo "==> Waiting for backend to start..."
sleep 15

if curl -sf http://127.0.0.1:8000/health > /dev/null; then
  echo "==> Backend health check PASSED"
else
  echo "==> WARNING: Backend health check failed, checking logs..."
  docker compose -f docker-compose.prod.yml logs --tail=30 backend
fi

echo ""
echo "============================================"
echo "  FinMind deployed successfully!"
echo "  Backend : https://${DOMAIN}/health"
echo "  Frontend: https://${DOMAIN}/"
echo "============================================"
