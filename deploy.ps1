<#
.SYNOPSIS
    FinMind – Universal One-Click Deploy Script (Windows/PowerShell)

.DESCRIPTION
    Deploy FinMind to any supported platform with a single command.

.PARAMETER Platform
    Target platform: docker-dev, docker-prod, railway, heroku, render, flyio,
    digitalocean, aws, gcp, azure, k8s, tilt, verify

.PARAMETER Url
    Base URL for verification (used with 'verify' platform)

.EXAMPLE
    .\deploy.ps1 docker-prod
    .\deploy.ps1 k8s
    .\deploy.ps1 verify http://localhost
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet('docker-dev','docker-prod','railway','heroku','render','flyio',
                 'digitalocean','aws','gcp','azure','k8s','tilt','verify')]
    [string]$Platform,

    [Parameter(Position=1)]
    [string]$Url = "http://localhost"
)

$ErrorActionPreference = "Stop"

function Write-Info    { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[OK]   $args" -ForegroundColor Green }
function Write-Warn    { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err     { Write-Host "[ERROR] $args" -ForegroundColor Red; exit 1 }

function Ensure-Env {
    if (-not (Test-Path .env)) {
        Write-Info "Creating .env from .env.example..."
        Copy-Item .env.example .env
        Write-Warn "Please edit .env with production values (especially JWT_SECRET)."
    }
}

function Test-Command($cmd) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Err "'$cmd' is not installed. Please install it first."
    }
}

function Deploy-DockerDev {
    Write-Info "Starting FinMind in development mode..."
    Test-Command docker
    Ensure-Env
    docker compose up --build
}

function Deploy-DockerProd {
    Write-Info "Starting FinMind in production mode..."
    Test-Command docker
    Ensure-Env
    docker compose -f docker-compose.prod.yml up -d --build
    Write-Info "Waiting for services to start..."
    Start-Sleep -Seconds 15
    Verify-Deployment "http://localhost"
}

function Deploy-Railway {
    Write-Info "Deploying to Railway..."
    Test-Command railway
    Ensure-Env
    railway up
    Write-Success "Deployed to Railway."
}

function Deploy-Heroku {
    Write-Info "Deploying to Heroku..."
    Test-Command heroku
    $app = if ($env:HEROKU_APP_NAME) { $env:HEROKU_APP_NAME } else { "finmind-app" }
    heroku container:login
    heroku create $app --stack container 2>$null
    heroku addons:create heroku-postgresql:essential-0 -a $app 2>$null
    heroku addons:create heroku-redis:mini -a $app 2>$null
    $secret = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
    heroku config:set JWT_SECRET=$secret -a $app
    git push heroku main
    Write-Success "Deployed to Heroku: https://$app.herokuapp.com"
}

function Deploy-Render {
    Write-Info "Render uses render.yaml blueprint."
    Write-Info "Go to https://render.com/deploy and connect this repo."
    Write-Success "Blueprint file ready: render.yaml"
}

function Deploy-FlyIo {
    Write-Info "Deploying to Fly.io..."
    Test-Command fly
    fly launch --config fly.toml --no-deploy --yes 2>$null
    fly deploy
    Write-Info "Deploying frontend..."
    fly launch --config deploy/fly-frontend.toml --no-deploy --yes 2>$null
    fly deploy --config deploy/fly-frontend.toml
    Write-Success "Deployed to Fly.io"
}

function Deploy-K8s {
    Write-Info "Deploying to Kubernetes via Helm..."
    Test-Command helm
    Test-Command kubectl
    $jwt = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
    $pgPass = -join ((1..16) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
    helm upgrade --install finmind ./k8s/helm/finmind `
        --namespace finmind `
        --create-namespace `
        --set "secrets.jwtSecret=$jwt" `
        --set "secrets.postgresPassword=$pgPass" `
        --set "secrets.databaseUrl=postgresql+psycopg2://finmind:${pgPass}@finmind-postgres:5432/finmind" `
        --wait --timeout 5m
    Write-Success "FinMind deployed to Kubernetes namespace 'finmind'"
    kubectl get pods -n finmind
}

function Deploy-Tilt {
    Write-Info "Starting Tilt local K8s development..."
    Test-Command tilt
    tilt up
}

function Verify-Deployment($BaseUrl) {
    $backend = "${BaseUrl}:8000"
    $pass = 0; $fail = 0

    Write-Host ""
    Write-Info "=== FinMind Deployment Verification ==="
    Write-Host ""

    # Frontend
    try {
        $null = Invoke-WebRequest -Uri "$BaseUrl/" -UseBasicParsing -TimeoutSec 10
        Write-Success "Frontend reachable"; $pass++
    } catch { Write-Warn "Frontend NOT reachable"; $fail++ }

    # Backend health
    try {
        $null = Invoke-WebRequest -Uri "$backend/health" -UseBasicParsing -TimeoutSec 10
        Write-Success "Backend health passed"; $pass++
    } catch { Write-Warn "Backend health failed"; $fail++ }

    # Deep health
    try {
        $resp = (Invoke-WebRequest -Uri "$backend/health/ready" -UseBasicParsing -TimeoutSec 10).Content
        if ($resp -match '"status":"ok"') {
            Write-Success "DB + Redis connected"; $pass++
        } else { Write-Warn "Deep health degraded: $resp"; $fail++ }
    } catch { Write-Warn "Deep health check failed"; $fail++ }

    Write-Host ""
    Write-Host "=========================================="
    Write-Host "  Results: $pass passed, $fail failed" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
    Write-Host "=========================================="
}

# ── Main dispatch ──
switch ($Platform) {
    'docker-dev'    { Deploy-DockerDev }
    'docker-prod'   { Deploy-DockerProd }
    'railway'       { Deploy-Railway }
    'heroku'        { Deploy-Heroku }
    'render'        { Deploy-Render }
    'flyio'         { Deploy-FlyIo }
    'digitalocean'  { Write-Info "Run: bash deploy/digitalocean-droplet.sh" }
    'aws'           { Write-Info "Run: bash deploy/aws-deploy.sh" }
    'gcp'           { Write-Info "Run: bash deploy/gcp-deploy.sh" }
    'azure'         { Write-Info "Run: bash deploy/azure-deploy.sh" }
    'k8s'           { Deploy-K8s }
    'tilt'          { Deploy-Tilt }
    'verify'        { Verify-Deployment $Url }
}
