# Deployment guide

> **Status: UNVERIFIED.** This guide is derived from reading the manifests, comments and scripts in this repository. The steps have **not** been executed against AWS or a Kubernetes cluster. Treat it as a checklist, and correct it as you verify each step.

## 1. What must be provided before deploying

These are not created by this repository:

- A working kubeadm cluster and a `kubectl` context pointing at it.
- A storage solution. kubeadm has no default StorageClass. The MySQL PVC uses the static hostPath PV in `kubernetes/database/pv-hostpath.yaml`.
- `metrics-server`, required by the backend HPA.
- An Ingress controller (the manifest uses `ingressClassName: nginx`), only if you use the Ingress.
- An ECR image-pull Secret named `ecr-pull-secret` in namespace `mg-platform`. ECR authorization tokens expire after about 12 hours, so the Secret must be refreshed.
- The database Secret `mg-platform-db` (see `kubernetes/secret.yaml.example`). Never commit the real file.

## 2. Placeholders that must be replaced

| File | Placeholder |
|---|---|
| `kubernetes/backend/deployment.yaml` (image) | `<AWS_ACCOUNT_ID>`, `REPLACE_TAG` |
| `kubernetes/frontend/deployment.yaml` (image) | `<AWS_ACCOUNT_ID>`, `REPLACE_TAG` |
| `kubernetes/database/pv-hostpath.yaml` | `REPLACE_WITH_WORKER_NODE_NAME` (see `kubectl get nodes --show-labels`) |
| `kubernetes/ingress/ingress.yaml` | host `mg-platform.example.com` |

Image tags: the `docker-build` workflow pushes the full commit SHA (`github.sha`) on pushes to `main`. `scripts/ecr-push.sh` pushes whatever `IMAGE_TAG` you give it. Use the same tag scheme in the manifests.

## 3. Suggested apply order

Derived from object dependencies, not from a tested run:

1. `kubernetes/namespace.yaml`
2. The `mg-platform-db` Secret and the `ecr-pull-secret`
3. `kubernetes/configmap.yaml`
4. `kubernetes/database/` (PV, PVC, init ConfigMap, Service, Deployment)
5. `kubernetes/backend/` (apply before the frontend, because Nginx resolves the `backend` Service name at startup)
6. `kubernetes/frontend/`
7. `kubernetes/autoscaling/hpa.yaml` (after metrics-server is working)
8. `kubernetes/ingress/ingress.yaml` (optional)

The frontend is reachable at `http://<node-ip>:30080` through the NodePort (open the port in the node security group).

## 4. Terraform state

State is **remote** in S3 (`terraform/environments/dev/backend.tf`):

| Setting | Value |
|---|---|
| Bucket | `mg-k8s-platform-02-terraform-state-2026` (repository variable `TF_STATE_BUCKET`) |
| Key | `mg-k8s-platform-02/terraform.tfstate` |
| Region | `us-east-1` |
| Encryption | `encrypt = true`, bucket default SSE-S3 |
| Locking | `use_lockfile = true` (native S3 lock file, Terraform >= 1.10, no DynamoDB) |

Every `terraform init` in CI is followed by `scripts/verify-tf-backend.sh`, which fails the job if the backend is not exactly this S3 location, if locking or encryption is off, if a local `terraform.tfstate` exists, or if the remote state cannot be read.

Apply runs only on pushes to `main`, only when the repository variable `TF_REMOTE_STATE_VERIFIED` is `true`, and only after approval on the `project-1` environment. Apply uses the saved plan from the same run.

Rules:

- Never commit state files (they are gitignored).
- Never run `terraform init -reconfigure` or `-migrate-state` against this backend without first downloading a copy of the current state object.
- Keep bucket versioning **enabled** so any state version can be restored.
- If you ever have a local `terraform.tfstate` with resources in it, migrate it with `terraform init -migrate-state` after backing it up; do not just delete it.

## 5. Monitoring

See [../monitoring/README.md](../monitoring/README.md).

## 6. Verification checklist (to be completed by you)

- [ ] `docker compose up --build` works locally and `http://localhost:8081/api/status` reports the database connected
- [ ] Images pushed to ECR and visible in both repositories
- [ ] Pods `Running` and `Ready` in `mg-platform`
- [ ] Frontend reachable on NodePort 30080
- [ ] HPA reports current CPU metrics (not `<unknown>`)
- [ ] Prometheus targets up, Grafana dashboard shows data
