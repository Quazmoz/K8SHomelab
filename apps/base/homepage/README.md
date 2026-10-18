# Homepage Dashboard

## Overview

Homepage is a modern, customizable dashboard that provides a single pane of glass for all homelab services. It includes service health monitoring, Kubernetes cluster widgets, and quick-access links.

## Access

- **URL:** [http://homepage.k8s.local](http://homepage.k8s.local)

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `ghcr.io/gethomepage/homepage:v2.4.0` |
| **Port** | 3000 |
| **Node** | `quinn-hpprobook430g6` |
| **Resources** | Requests: 64Mi/10m, Limits: 256Mi/500m |

## Dashboard Categories

Homepage is split into two tabs so the dashboard can grow without becoming one long page:

| Tab | Category | Contents |
|-----|----------|----------|
| Applications | Growth OS | n8n, Paperclip, SearXNG, changedetection.io, n8n Sandbox (internal runtime) |
| Applications | Growth OS Storage | Actual directory bytes for three dedicated PVCs, plus shared backing-disk free space |
| Applications | AI & LLM | OpenWebUI, Qdrant, Phoenix, OpenClaw |
| Applications | MCP Tools | Context Forge, MCPO Gateway, Azure, GroupMe, ClickUp, Kubernetes, and Postgres MCP endpoints |
| Applications | DevOps | Grafana, Prometheus, Loki, Grafana Alloy |
| Applications | Operations | pgAdmin, RedisInsight, PostgreSQL and Redis backends |
| Applications | Admin | Auto-discovered cluster administration services such as Authentik |
| Applications | Portfolio | Personal and professional links |
| Cluster | Kubernetes Cluster | Apps/system pod status and resources, pod health metrics, and PVC/storage metrics |
| Cluster | Cluster Tools | Auto-discovered ingress-backed cluster services (if present) |
| Cluster | Platform Services | Flux CD, NGINX Ingress, MetalLB, metrics-server, Sysbox and PostgreSQL backups (source links, not health checks) |

The `Cluster` tab links to the detailed Kubernetes, Pod Resources, and Storage Overview dashboards in Grafana. Pod and storage summary cards refresh every 30 and 60 seconds respectively.

Growth OS Storage uses `growth_os_storage_used_bytes` from two read-only, no-token exporters under `apps/base/growth-os-storage/`. The total requires all three PVC series; a missing exporter or PVC shows N/A instead of a false partial total. The `Requested` and `% request` values are PVC requests, **not enforced local-PV quotas**. The HP and Orange Pi backing-disk cards show shared physical filesystem availability, including unrelated workloads. Kubelet's `kubelet_volume_stats_used_bytes` is intentionally not used for these local PVs: live checks showed it reporting the host filesystem's usage for each claim.

Production check on 2026-09-30: the rendered dashboard showed n8n `64.5 MB`, changedetection `504 kB`, and HP shared free space `26.9 GB`. Paperclip, Orange Pi free space, and the combined total rendered as `-` because the Orange Pi exporter returned HTTP 503 on a UID/GID 1000 protected Paperclip directory. A local permission fix exists but has not been approved for deployment. See [the exporter qualification](../growth-os-storage/README.md) for current status and retention notes.

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `manifests.yaml` | All-in-one: Deployment, Service, Ingress, ConfigMap, RBAC, PVC, PDB |

## Architecture Notes

- Uses ServiceAccount with cluster-wide read RBAC to discover Kubernetes resources
- Config is mounted via ConfigMap (settings, services, widgets, bookmarks, CSS/JS)
- Uses `emptyDir` + init container pattern for config initialization
- Monitors HTTP services with verified `siteMonitor` endpoints; internal TCP-only services and infrastructure cards deliberately have no HTTP status dot
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

## Inventory authority and deployment

The dashboard is an inventory of components **enabled in `apps/base/kustomization.yaml`**, not a claim that every pod is healthy right now. The actual cluster and Prometheus cards are the runtime evidence. The list intentionally omits disabled AWX, Jenkins, Authentik, FreshRSS, LLaMA Factory, LibreChat, Coder, Jupyter, MongoDB, Mongo Express and Uptime Kuma. Hermes Agent is declared but scaled to zero by the top-level `replicas` override; Apply OS is not in the active Kustomization. Suspended MongoDB backups are not presented as active backups.

Cards with a `k8s.local` link open a service UI. Source links to this GitHub repository represent internal-only services without a user-facing UI; they are **not** availability checks. PostgreSQL and Redis cards link to their already listed administration UIs, not to the database protocol ports. ClickUp MCP exposes only a TCP probe, so it intentionally has no HTTP `siteMonitor`. Ingress-accessible MCPO is currently unauthenticated on the LAN; review its network exposure separately before granting broader network access.

**When the active manifest inventory changes:** update `services.yaml` and the categories here; verify endpoint and probe names against the currently included manifests. The ConfigMap is copied to `emptyDir` by an init container, so updating only the ConfigMap is insufficient: change the `checksum/config` pod-template annotation in `manifests.yaml` to trigger a rollout. Flux reconciles the `main` branch, but rollout and runtime reachability must still be checked on the cluster. Suggested checks: `kubectl -n apps rollout status deploy/homepage` and `kubectl -n apps logs deploy/homepage --tail=100`.
