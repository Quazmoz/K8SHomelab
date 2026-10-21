# AI Context: Homepage Dashboard

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Central dashboard providing visibility into all homelab services with health monitoring, Kubernetes widgets, and quick-access links.

## Architecture

- **Type:** Custom Deployment (all resources in single `manifests.yaml`)
- **Image:** `ghcr.io/gethomepage/homepage:v2.6.0`
- **Namespace:** `apps`
- **Node:** `quinn-hpprobook430g6`
- **Port:** 3000
- **URL:** `http://homepage.k8s.local`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `manifests.yaml` | All-in-one: ServiceAccount, ConfigMap, ClusterRole, ClusterRoleBinding, Service, PVC, Deployment, PDB, Ingress (~650 lines) |

## Key Configuration

- **RBAC:** Read-only ClusterRole for pods, nodes, services, namespaces, ingresses, and node/pod metrics (not deployments or secrets).
- **ConfigMap (`homepage-config`):** Contains `settings.yaml`, `services.yaml`, `widgets.yaml`, `bookmarks.yaml`, `kubernetes.yaml`, `custom.css`, `custom.js`
- **Service list** has HTTP `siteMonitor` URLs only where a meaningful HTTP endpoint exists; TCP-only and internal platform cards are informational.
- Config is loaded into an emptyDir volume via init container, not directly from PVC
- **Tabs:** `Applications` contains Growth OS (n8n, Paperclip, SearXNG, changedetection.io, n8n Sandbox), active and paused AI/MCP, DevOps, data operations, and portfolio; `Cluster` contains Kubernetes workload/storage health, internal platform service source links, and discovered tools
- **Kubernetes summaries:** Blank `podSelector` values aggregate all pods in the `apps` and `kube-system` namespaces
- **Prometheus summaries:** The `prometheusmetric` widgets show running/not-ready pods, pending/failed pods, recent restarts, bound/pending PVCs, requested bytes, and aggregate PVC utilization

## Dependencies

- **Depends on:** Kubernetes API and metrics-server for cluster widgets; Prometheus for metrics summaries. HTTP service checks are informational, not startup dependencies.
- **Depended on by:** Nothing (end-user UI)

## Modification Notes

- When adding a new service to the homelab, add an entry to `services.yaml` section of the ConfigMap in `manifests.yaml`
- The manifests.yaml is a single large file (~800 lines) containing ALL Homepage resources — be careful with edits
- Dashboard sections: Growth OS, Growth OS Storage, AI & LLM, MCP Tools, DevOps, Operations, Admin, Portfolio, Kubernetes Cluster, Cluster Tools, Platform Services
- Widget configuration provides cluster CPU/memory stats from metrics-server
- Keep new application groups on the `Applications` tab unless they are cluster-operational views; put cluster-operational groups on the `Cluster` tab
- The Cluster tab depends on Prometheus scraping kube-state-metrics and kubelet volume stats; detailed views use Grafana dashboard UIDs `pod-resources` and `storage`

## Inventory sync (2026-10-18)

- Inventory visibility is independent of active deployment state. Keep known application cards visible when paused, down or scaled to zero; use the root `apps/base/kustomization.yaml` only to determine GitOps desired state. A permanently decommissioned service requires a deliberate inventory removal.
- Restored paused cards for LLaMA Factory, FreshRSS, LibreChat, Hermes, Jenkins and Mongo Express to their original sections, with `Paused` descriptions and original HTTP checks. Hermes is included but scaled to 0; the other five are excluded by commented root resources. Red/unavailable status while paused is expected, not a claim of a live failure. Jupyter was already a commented placeholder and remains unlisted.
- Added n8n Sandbox, MCPO Gateway, Azure MCP, Grafana Alloy, PostgreSQL, Redis, Flux CD, NGINX Ingress, MetalLB, metrics-server, Sysbox and PostgreSQL backups.
- Non-HTTP backends/infrastructure link to their UI or GitOps source and have **no synthetic uptime indicators**. The ClickUp MCP service has TCP-only liveness/readiness; remove its unreliable HTTP `siteMonitor`. The RedisInsight service and `/api/health` probe are aligned with its deployment, correcting the previous `redis-insight` DNS name.
- MCPO is currently unauthenticated via LAN ingress, so that card explicitly identifies its access boundary. Do not embed new secrets in ConfigMap service cards.
- `checksum/config` bumped to `v41-restore-paused-20261019` to reload the restored inventory on rollout.
- Regression check: `python3 -m unittest discover -s scripts -p 'test_homepage_inventory.py'`. Update the paused-state assertions when reactivating a service rather than removing its card.
- Validate GitOps build and rendered Homepage YAML, then Flux reconciliation and dashboard URLs on the real cluster. GitHub contents alone cannot establish pod readiness or on-LAN reachability.

2026-10-21 maintenance: the application image is pinned to `v2.6.0`. Persistent state and the existing Helm chart/configuration are preserved; protected file and SQLite recovery copies are under `/var/backups/homelab-upgrade-20261021/` on the worker.
