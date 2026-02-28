# Grafana

## Overview

Grafana provides dashboards and visualization for metrics (Prometheus), logs (Loki), and application data (PostgreSQL, MongoDB). Deployed via Flux HelmRelease.

## Access

- **URL:** [http://grafana.k8s.local](http://grafana.k8s.local)
- **Default credentials:** Set in Helm values

## Datasources

| Name | Type | Target |
|------|------|--------|
| Prometheus | prometheus | `http://prometheus-server.apps.svc.cluster.local:80` |
| Loki | loki | `http://loki.apps.svc.cluster.local:3100` |
| PostgreSQL-Grafana | postgres | `grafana_db` |
| PostgreSQL-OpenWebUI | postgres | `openwebui_db` |
| MongoDB | mongodb | `librechat` via plugin |

## Configuration

| Setting | Value |
|---------|-------|
| **Chart** | `grafana` v10.5.5 from `grafana` |
| **Storage** | 25Gi PVC (`local-storage`) |
| **Node** | `quinn-hpprobook430g6` |
| **Resources** | Requests: 128Mi/50m, Limits: 2Gi/2000m |
| **Plugins** | `grafana-mongodb-datasource` |

## Dashboard Auto-Discovery

Grafana sidecar watches for ConfigMaps with label `grafana_dashboard: "1"` and auto-loads them.

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `helm-release.yaml` | Flux HelmRelease with Helm values |
| `ingress.yaml` | Ingress for `grafana.k8s.local` |
| `grafana-pvc.yaml` | 25Gi PVC |
| `dashboard-configmap.yaml` | Kubernetes overview dashboard |
| `dashboards/` | Additional dashboard JSON files |

## Troubleshooting

```bash
# Check HelmRelease
flux get helmrelease grafana -n apps

# Check pods
kubectl get pods -n apps -l app.kubernetes.io/name=grafana

# Force reconcile
flux reconcile helmrelease grafana -n apps --with-source
```
