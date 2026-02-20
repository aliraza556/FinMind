# FinMind – Tilt local Kubernetes development
# Prerequisites: Docker, kubectl, a local K8s cluster (minikube/kind/k3d), Tilt
#
# Quick start:
#   kind create cluster --name finmind
#   tilt up

# ── Configuration ──
load('ext://namespace', 'namespace_create', 'namespace_inject')
namespace_create('finmind')

# ── Docker builds with live-reload ──
docker_build(
    'finmind-backend',
    context='./packages/backend',
    dockerfile='./packages/backend/Dockerfile',
    live_update=[
        sync('./packages/backend/app', '/app/app'),
        sync('./packages/backend/wsgi.py', '/app/wsgi.py'),
        run('pip install -r /app/requirements.txt', trigger='./packages/backend/requirements.txt'),
    ],
)

docker_build(
    'finmind-frontend',
    context='./app',
    dockerfile='./app/Dockerfile',
    live_update=[
        sync('./app/src', '/app/src'),
        sync('./app/public', '/app/public'),
        run('npm install', trigger='./app/package.json'),
    ],
)

# ── Deploy Kubernetes manifests via Helm ──
k8s_yaml(
    helm(
        './k8s/helm/finmind',
        name='finmind',
        namespace='finmind',
        values=['./k8s/helm/finmind/values.yaml'],
        set=[
            'backend.image.pullPolicy=Never',
            'frontend.image.pullPolicy=Never',
            'backend.autoscaling.enabled=false',
            'frontend.autoscaling.enabled=false',
            'backend.replicas=1',
            'frontend.replicas=1',
            'ingress.enabled=false',
        ],
    )
)

# ── Resource grouping ──
k8s_resource(
    'finmind-backend',
    port_forwards=['8000:8000'],
    labels=['backend'],
    resource_deps=['finmind-postgres', 'finmind-redis'],
)

k8s_resource(
    'finmind-frontend',
    port_forwards=['5173:80'],
    labels=['frontend'],
    resource_deps=['finmind-backend'],
)

k8s_resource(
    'finmind-postgres',
    port_forwards=['5432:5432'],
    labels=['infrastructure'],
)

k8s_resource(
    'finmind-redis',
    port_forwards=['6379:6379'],
    labels=['infrastructure'],
)

# ── Buttons for common actions ──
local_resource(
    'db-init',
    cmd='kubectl exec -n finmind deploy/finmind-backend -- python -m flask --app wsgi:app init-db',
    labels=['tasks'],
    auto_init=False,
)

local_resource(
    'backend-tests',
    cmd='kubectl exec -n finmind deploy/finmind-backend -- python -m pytest tests/ -v',
    labels=['tasks'],
    auto_init=False,
)
