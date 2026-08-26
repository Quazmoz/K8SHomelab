# Homepage Dashboard

## Overview

Homepage is a modern, customizable dashboard that provides a single pane of glass for all homelab services. It includes service health monitoring, Kubernetes cluster widgets, and quick-access links.

## Access

- **URL:** [http://homepage.k8s.local](http://homepage.k8s.local)

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `ghcr.io/gethomepage/homepage:v2.1.2` |
| **Port** | 3000 |
| **Node** | `quinn-hpprobook430g6` |
| **Resources** | Requests: 64Mi/10m, Limits: 256Mi/500m |

## Dashboard Categories

Homepage is split into two tabs so the dashboard can grow without becoming one long page:

| Tab | Category | Contents |
|-----|----------|----------|
| Applications | AI & LLM | OpenWebUI, LLaMA Factory, Qdrant, FreshRSS, LibreChat, Phoenix, OpenClaw, Hermes |
| Applications | MCP Tools | Context Forge, GroupMe, ClickUp, Kubernetes, and Postgres MCP endpoints |
| Applications | DevOps | Jenkins, n8n, Grafana, Prometheus, Loki |
| Applications | Operations | pgAdmin, RedisInsight, Mongo Express |
| Applications | Admin | Auto-discovered cluster administration services such as Authentik |
| Applications | Portfolio | Personal and professional links |
| Cluster | Kubernetes Cluster | Apps/system pod status and resources, pod health metrics, and PVC/storage metrics |
| Cluster | Cluster Tools | Auto-discovered cluster tools such as Kubernetes Dashboard |

The `Cluster` tab links to the detailed Kubernetes, Pod Resources, and Storage Overview dashboards in Grafana. Pod and storage summary cards refresh every 30 and 60 seconds respectively.

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `manifests.yaml` | All-in-one: Deployment, Service, Ingress, ConfigMap, RBAC, PVC, PDB |

## Architecture Notes

- Uses ServiceAccount with cluster-wide read RBAC to discover Kubernetes resources
- Config is mounted via ConfigMap (settings, services, widgets, bookmarks, CSS/JS)
- Uses `emptyDir` + init container pattern for config initialization
- Monitors all services via `siteMonitor` URLs in the services config
- Uses Homepage's Kubernetes pod integration for namespace-level status, CPU, and memory
- Uses the Prometheus Metric widget for pod phase/readiness/restarts and PVC capacity/usage
- Uses Homepage layout tabs (`Applications` and `Cluster`) to keep the dashboard compact

## Troubleshooting

```bash
# Check pod
kubectl get pods -n apps -l app=homepage

# View logs
kubectl logs -n apps -l app=homepage --tail=50

# Check service monitors
# Visit http://homepage.k8s.local and look for red status indicators

# Confirm the metrics used by the Cluster tab are present
kubectl -n apps port-forward svc/prometheus-server 9090:80
# Then query kube_pod_status_phase and kubelet_volume_stats_used_bytes at http://localhost:9090
```
