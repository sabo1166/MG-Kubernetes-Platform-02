# MG Kubernetes Platform 02

A three-tier application (React + Nginx, Node.js/Express API, MySQL 8.4) packaged as Docker images, published to AWS ECR (provisioned with Terraform) and deployed to an **existing kubeadm cluster on EC2**. Monitoring uses Prometheus and Grafana via Helm.

Owner: MG / Mohammed Gamal - https://github.com/sabo1166

> This repo creates **no** cluster, EC2 instances or VPC. Terraform only manages two ECR repositories. Nothing is applied, deployed or pushed automatically.

## Architecture

```
User -> Frontend (Nginx :80 -> container :8080, serves React, proxies /api)
          -> Backend API (Express :8080)
               -> MySQL 8.4 (ClusterIP :3306, PVC)
```

See [docs/architecture.md](docs/architecture.md).

## Technology stack
React 18 + Vite, Nginx (unprivileged), Node.js 20 + Express + mysql2 + zod + pino, MySQL 8.4, Docker/Compose, Terraform (AWS provider 5.x), Kubernetes, GitHub Actions, kube-prometheus-stack.

## Repository structure
```
app/frontend      React dashboard, nginx.conf, Dockerfile
app/backend       Express API, tests, Dockerfile
app/database      init.sql
docker-compose.yml, .env.example
terraform/        environments/dev + modules/ecr
kubernetes/       manifests (namespace, config, frontend, backend, database, ingress, hpa)
monitoring/       Helm values, alerts, Grafana dashboard
scripts/          ecr-push.sh
.github/workflows terraform-plan.yml, docker-build.yml
docs/             architecture, deployment guide (unverified checklist), troubleshooting
```

## Prerequisites
Docker Desktop, Node 20+, Terraform >= 1.5, AWS CLI v2, kubectl, Helm (monitoring), Git Bash.

## Local Docker setup
```bash
cp .env.example .env        # then edit the passwords
docker compose up --build -d
curl http://localhost:8081/healthz       # frontend
curl http://localhost:8081/api/status    # via Nginx proxy -> API -> DB
docker compose down                      # data survives (named volume); add -v to wipe it
```
MySQL has no published port. The frontend is on `FRONTEND_PORT` (default 8081; set `80` if free).

## Terraform setup
```bash
cd terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION=us-east-1
terraform init
terraform plan          # review, then apply manually when you decide to
```
State is local and gitignored. See the remote-state notes in [docs/deployment-guide.md](docs/deployment-guide.md).

## ECR image publishing
`IMAGE_TAG=$(git rev-parse --short HEAD) ./scripts/ecr-push.sh` (tags are immutable; use a new tag per build). CI pushes `:<commit-sha>` from `main` automatically.

## Kubernetes deployment
Manual, step-by-step: [docs/deployment-guide.md](docs/deployment-guide.md). Storage, ECR pull secret, metrics-server and Ingress controller are prerequisites you must provide.

## Monitoring
[monitoring/README.md](monitoring/README.md).

## Testing
```bash
cd app/backend && npm ci && npm test      # unit + API tests (mocked DB)
cd app/frontend && npm ci && npm run build
cd terraform && terraform fmt -check -recursive
cd terraform/environments/dev && terraform init -backend=false && terraform validate
kubectl apply --dry-run=client -f kubernetes/namespace.yaml   # needs a reachable cluster for most kinds
```

## GitHub Actions secrets
Repository -> Settings -> Secrets and variables -> Actions: add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`. Static keys only (no OIDC). Use an IAM user limited to ECR actions (and read-only for plan).

## Security considerations
No secrets in code or images; DB credentials via env/Secret; MySQL not exposed; non-root containers; immutable, scanned, encrypted ECR repos; CI uses `contents: read` and never applies Terraform. MySQL here is a single-replica learning setup, not HA. Static IAM keys are long-lived: rotate them and scope them tightly.

## Troubleshooting
[docs/troubleshooting.md](docs/troubleshooting.md)

## Screenshots
_Add dashboard and Grafana screenshots here after you deploy._
