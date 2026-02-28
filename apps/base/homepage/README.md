# Homepage Dashboard

## Overview

Homepage is a modern, customizable dashboard that provides a single pane of glass for all homelab services. It includes service health monitoring, Kubernetes cluster widgets, and quick-access links.

## Access

- **URL:** [http://homepage.k8s.local](http://homepage.k8s.local)

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `ghcr.io/gethomepage/homepage:v1.10.1` |
| **Port** | 3000 |
| **Node** | `orangepi6plus` (with control-plane toleration) |
| **Resources** | Requests: 64Mi/10m, Limits: 256Mi/500m |

## Dashboard Categories

| Category | Services |
|----------|----------|
| AI & LLM | OpenWebUI, Qdrant, Jupyter, Phoenix, LlamaCpp, Ollama API, n8n |
| MCP Tools | Context Forge, GroupMe, Azure MCP, ClickUp MCP, MCPO |
| DevOps | AWX, Grafana, Prometheus, Loki, Alloy |
| Operations | pgAdmin, Mongo Express, RedisInsight, AdGuard Home |

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

## Troubleshooting

```bash
# Check pod
kubectl get pods -n apps -l app=homepage

# View logs
kubectl logs -n apps -l app=homepage --tail=50

# Check service monitors
# Visit http://homepage.k8s.local and look for red status indicators
```
