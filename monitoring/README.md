# Monitoring (Prometheus + Grafana via Helm)

Nothing here is installed automatically. Run these steps yourself, against the right kubectl context.

## 1. Prerequisites
- `helm` 3.x installed, `kubectl` pointing at the kubeadm cluster.
- For persistent Prometheus data a StorageClass must exist (kubeadm has none by default); otherwise data is lost on pod restart.
- `metrics-server` is needed for `kubectl top` and the backend HPA (separate from this stack).

## 2. Install
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
kubectl create namespace monitoring

# Grafana admin credentials (choose your own password; do not commit it)
kubectl -n monitoring create secret generic grafana-admin \
  --from-literal=admin-user=admin --from-literal=admin-password='<choose-a-password>'

# Dashboard ConfigMap
kubectl -n monitoring create configmap mg-platform-dashboard \
  --from-file=mg-platform-dashboard.json=monitoring/grafana/mg-platform-dashboard.json

helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring -f monitoring/prometheus/values.yaml

kubectl apply -f monitoring/prometheus/app-alerts.yaml
```

## 3. Access
Grafana is a NodePort on `30300` (open it in the node security group, ideally to your IP only):
`http://<node-ip>:30300`. Or: `kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3000:80`.

## What you get
- Cluster, node (CPU/memory/disk) and pod dashboards from the chart's built-in Grafana dashboards.
- "MG Platform Overview": pod CPU/memory in `mg-platform`, deployment availability, node usage.
- Alerts for unavailable deployments and crash-looping pods.

## Uninstall
`helm uninstall kube-prometheus-stack -n monitoring`
