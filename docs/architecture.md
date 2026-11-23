# Architecture

This document describes what the repository **defines**. Nothing here has been verified against a running AWS account or Kubernetes cluster unless stated.

## Components

| Component | Source | Notes |
|---|---|---|
| Frontend | `app/frontend` | React 18 + Vite, served by `nginxinc/nginx-unprivileged` on container port 8080 |
| Backend API | `app/backend` | Node.js 20, Express, `mysql2`, `zod`, `pino`, container port 8080 |
| Database | `app/database/init.sql` | MySQL 8.4.3, single `records` table, one seed row |
| Registry | `terraform/` | Two ECR repositories: `mg-k8s-platform-02-frontend`, `mg-k8s-platform-02-api` (immutable tags, scan on push, AES256) |
| Orchestration | `kubernetes/` | Manifests for an existing kubeadm cluster, namespace `mg-platform` |
| Monitoring | `monitoring/` | kube-prometheus-stack Helm values, two alert rules, one Grafana dashboard |
| CI | `.github/workflows/` | `docker-build.yml` (test, build, push to ECR on `main`), `terraform-plan.yml` (fmt, init, validate, plan) |

## Request flow

```
Browser -> frontend (Nginx :8080; Service port 80; NodePort 30080)
             |-- /            static React build
             |-- /healthz     Nginx health response
             |-- /api/, /health  proxied to BACKEND_URL (default http://backend:8080)
                                   -> backend (Express :8080)
                                        -> mysql:3306 (ClusterIP Service)
                                             -> PVC mysql-data -> hostPath PV
```

## Backend endpoints (`app/backend/src/app.js`)

| Route | Purpose |
|---|---|
| `GET /health` | Liveness, does not touch the database |
| `GET /health/db` | Readiness, returns 503 if `SELECT 1` fails |
| `GET /api/status` | Application and database status for the dashboard |
| `GET /api/records` | Latest 100 records |
| `POST /api/records` | Create a record (`title` 1-120 chars, `description` up to 1000) |

## Configuration

| Variable | Used by | Source in Kubernetes |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` | backend | ConfigMap `mg-platform-config` |
| `DB_PASSWORD` | backend | Secret `mg-platform-db`, key `MYSQL_PASSWORD` |
| `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD` | MySQL | Secret `mg-platform-db` |
| `BACKEND_URL` | frontend Nginx | ConfigMap `mg-platform-config` |
| `LOG_LEVEL`, `CORS_ORIGIN`, `DB_POOL_SIZE` | backend | optional; defaults in `config.js` |

Locally, Docker Compose reads the `MYSQL_*` and `FRONTEND_PORT` values from `.env` (copy of `.env.example`).

## Storage

MySQL uses a PVC (`mysql-data`, 5Gi, storage class `mg-manual`) bound to a static hostPath PV (`/data/mg-platform/mysql`) pinned to one worker node. This is a single-replica, single-node setup. If that node is lost, the data is lost. It is not highly available.

## Scaling

The `backend` HorizontalPodAutoscaler (`kubernetes/autoscaling/hpa.yaml`) scales the `backend` Deployment between 2 and 5 replicas at 70% average CPU. It requires metrics-server, which this repository does not install.

## Known gaps

See the findings in the audit report and the checklist in [deployment-guide.md](deployment-guide.md). In short: no NetworkPolicies or RBAC, no remote Terraform state, no database backups, no application metrics endpoint.
