# Homepage Dashboard

## Overview

Homepage is a modern, customizable dashboard that provides a single pane of glass for all homelab services. It includes service health monitoring, Kubernetes cluster widgets, and quick-access links.

## Access

- **URL:** [http://homepage.k8s.local](http://homepage.k8s.local)

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `ghcr.io/gethomepage/homepage:v2.6.0` |
| **Port** | 3000 |
| **Node** | `quinn-hpprobook430g6` |
| **Resources** | Requests: 64Mi/10m, Limits: 256Mi/500m |

## Dashboard Categories

Homepage is split into two tabs so the dashboard can grow without becoming one long page:

| Tab | Category | Contents |
|-----|----------|----------|
| Applications | Growth OS | n8n, Paperclip, SearXNG, changedetection.io, n8n Sandbox (internal runtime) |
| Applications | Growth OS Storage | Actual directory bytes for three dedicated PVCs, plus shared backing-disk free space |
| Applications | AI & LLM | OpenWebUI, Qdrant, Phoenix, OpenClaw; paused: LLaMA Factory, FreshRSS, LibreChat, Hermes |
| Applications | MCP Tools | Context Forge, MCPO Gateway, Azure, GroupMe, ClickUp, Kubernetes, and Postgres MCP endpoints |
| Applications | DevOps | Grafana, Prometheus, Loki, Grafana Alloy; paused: Jenkins |
| Applications | Operations | pgAdmin, RedisInsight, PostgreSQL and Redis backends; paused: Mongo Express |
| Applications | Admin | Reserved for ingress-discovered administration tools when enabled |
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
- Monitors HTTP services through declared `siteMonitor` endpoints; internal TCP-only services and infrastructure cards deliberately have no HTTP status dot
- Uses Homepage's Kubernetes pod integration for namespace-level status, CPU, and memory
- Uses the Prometheus Metric widget for pod phase/readiness/restarts and PVC capacity/usage
- Uses Homepage layout tabs (`Applications` and `Cluster`) to keep the dashboard compact

## Troubleshooting

```bash
# Check pod
kubectl get pods -n apps -l app.kubernetes.io/name=homepage

# View logs
kubectl logs -n apps deploy/homepage --tail=50

# Check service monitors
# Visit http://homepage.k8s.local and look for red status indicators

# Confirm the metrics used by the Cluster tab are present
kubectl -n apps port-forward svc/prometheus-server 9090:80
# Then query kube_pod_status_phase and kubelet_volume_stats_used_bytes at http://localhost:9090
```

## Inventory authority and deployment

Homepage is a **persistent service inventory**, not only a list of currently running workloads. **Do not remove a card merely because its deployment is disabled, scaled to zero, stopped or temporarily unhealthy.** The six previously listed cards for LLaMA Factory, FreshRSS, LibreChat, Hermes, Jenkins and Mongo Express remain visible in their original categories with a `Paused` description and their original HTTP `siteMonitor` checks. The resulting unavailable indicator is expected while paused, not evidence of an unexpected failure. They retain their UI links for future reactivation. If one is re-enabled, update its description rather than deleting the card.

`apps/base/kustomization.yaml` is authoritative for **desired deployment state**, not Homepage visibility. Hermes is included but scaled to zero through the root `replicas` override; the other five are commented out to save resources or because MongoDB is disabled. The dashboard does not claim that an HTTP card is serving traffic merely because it is listed. Cluster/Prometheus views provide live workload evidence. Add newly adopted services deliberately; remove permanently retired services only with an explicit inventory decision. Other currently unlisted or retired resources (including AWX, Authentik, Coder, Jupyter, MongoDB, Uptime Kuma and Apply OS) are not automatically added or activated by this fix. Suspended MongoDB backups are not presented as active backups.

Cards with a `k8s.local` link open a service UI. Source links to this GitHub repository represent internal-only services without a user-facing UI; they are **not** availability checks. PostgreSQL and Redis cards link to their already listed administration UIs, not to the database protocol ports. ClickUp MCP exposes only a TCP probe, so it intentionally has no HTTP `siteMonitor`. Ingress-accessible MCPO is currently unauthenticated on the LAN; review its network exposure separately before granting broader network access.

**When a service is activated, paused or permanently retired:** keep the card visible unless retirement is explicit; update `services.yaml`, paused-state descriptions, and the categories here. Verify endpoint and probe names against the service manifests. Run `python3 -m unittest discover -s scripts -p 'test_homepage_inventory.py'` to catch inadvertent removals. The ConfigMap is copied to `emptyDir` by an init container, so updating only the ConfigMap is insufficient: change the `checksum/config` pod-template annotation in `manifests.yaml` to trigger a rollout. Flux reconciles the `main` branch, but rollout and runtime reachability must still be checked on the cluster. Suggested checks: `kubectl -n apps rollout status deploy/homepage` and `kubectl -n apps logs deploy/homepage --tail=100`.

2026-10-21 maintenance: the application image is pinned to `v2.6.0`. Persistent state and the existing Helm chart/configuration are preserved; protected file and SQLite recovery copies are under `/var/backups/homelab-upgrade-20261021/` on the worker.
