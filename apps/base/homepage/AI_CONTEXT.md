# AI Context: Homepage Dashboard

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Central dashboard providing visibility into all homelab services with health monitoring, Kubernetes widgets, and quick-access links.

## Architecture

- **Type:** Custom Deployment (all resources in single `manifests.yaml`)
- **Image:** `ghcr.io/gethomepage/homepage:v2.1.2`
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

- **RBAC:** ClusterRole with wide read access to pods, deployments, services, ingresses, nodes, etc.
- **ConfigMap (`homepage-config`):** Contains `settings.yaml`, `services.yaml`, `widgets.yaml`, `bookmarks.yaml`, `kubernetes.yaml`, `custom.css`, `custom.js`
- **Service list** in ConfigMap includes siteMonitor URLs for all services
- Config is loaded into an emptyDir volume via init container, not directly from PVC
- **Tabs:** `Applications` contains the service/portfolio/admin groups; `Cluster` contains Kubernetes workload, storage health, and auto-discovered cluster tools
- **Kubernetes summaries:** Blank `podSelector` values aggregate all pods in the `apps` and `kube-system` namespaces
- **Prometheus summaries:** The `prometheusmetric` widgets show running/not-ready pods, pending/failed pods, recent restarts, bound/pending PVCs, requested bytes, and aggregate PVC utilization

## Dependencies

- **Depends on:** All services (monitors via siteMonitor), metrics-server (for cluster resource widgets)
- **Depended on by:** Nothing (end-user UI)

## Modification Notes

- When adding a new service to the homelab, add an entry to `services.yaml` section of the ConfigMap in `manifests.yaml`
- The manifests.yaml is a single large file (~650 lines) containing ALL resources — be careful with edits
- Dashboard sections: AI & LLM, MCP Tools, DevOps, Operations, Admin, Portfolio, Kubernetes Cluster, Cluster Tools
- Widget configuration provides cluster CPU/memory stats from metrics-server
- Keep new application groups on the `Applications` tab unless they are cluster-operational views; put cluster-operational groups on the `Cluster` tab
- The Cluster tab depends on Prometheus scraping kube-state-metrics and kubelet volume stats; detailed views use Grafana dashboard UIDs `pod-resources` and `storage`
