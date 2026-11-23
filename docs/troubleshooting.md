# Troubleshooting

> **Status: UNVERIFIED.** These are failure modes predicted from reading the configuration in this repository. They were not observed on a live system. Replace or extend this list with real symptoms as you encounter them.

| Symptom | Likely cause (from the repo) | Where to look |
|---|---|---|
| `kubectl apply` fails on the Deployments, or pods show `InvalidImageName` | Image still contains `<AWS_ACCOUNT_ID>` / `REPLACE_TAG` | `kubernetes/{backend,frontend}/deployment.yaml` |
| `ImagePullBackOff` / `ErrImagePull` | `ecr-pull-secret` missing, or its ECR token expired (about 12 hours) | `imagePullSecrets` in both Deployments |
| MySQL pod or PVC stays `Pending` | PV node name placeholder not replaced, or no node matches it | `kubernetes/database/pv-hostpath.yaml` |
| Frontend pod crash-loops with a "host not found in upstream" style Nginx error | The `backend` Service does not exist yet when Nginx starts | Apply `kubernetes/backend/` first |
| Backend pods not Ready | `/health/db` returns 503 because MySQL is down or the Secret is wrong | readiness probe in `backend/deployment.yaml` |
| Backend exits at startup | Missing `DB_USER`, `DB_PASSWORD` or `DB_NAME` (`assertDbConfig`) | `app/backend/src/config.js` |
| HPA shows `<unknown>` for CPU | metrics-server not installed or not working | `kubernetes/autoscaling/hpa.yaml` |
| Ingress has no address | No Ingress controller for class `nginx` | `kubernetes/ingress/ingress.yaml` |
| `docker push` to ECR fails with a tag error | Repositories use immutable tags, so an existing tag cannot be overwritten | `scripts/ecr-push.sh` |
| `docker compose up` stops with "set in .env" | `.env` missing or incomplete | copy `.env.example` to `.env` |
| MySQL init script did not run | `init.sql` only runs on an empty data directory | `app/database/init.sql` |
| Terraform plan lists everything as "to add" | State is local, so CI plans start from empty state | `terraform/environments/dev/versions.tf` |
