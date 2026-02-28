# AI Context: Homepage Dashboard

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Central dashboard providing visibility into all homelab services with health monitoring, Kubernetes widgets, and quick-access links.

## Architecture

- **Type:** Custom Deployment (all resources in single `manifests.yaml`)
- **Image:** `ghcr.io/gethomepage/homepage:v1.10.1`
- **Namespace:** `apps`
- **Node:** `orangepi6plus` (with `node-role.kubernetes.io/control-plane` toleration)
- **Port:** 3000
- **URL:** `http://homepage.k8s.local`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `manifests.yaml` | All-in-one: ServiceAccount, ConfigMap, ClusterRole, ClusterRoleBinding, Service, PVC, Deployment, PDB, Ingress (~530 lines) |

## Key Configuration

- **RBAC:** ClusterRole with wide read access to pods, deployments, services, ingresses, nodes, etc.
- **ConfigMap (`homepage-config`):** Contains `settings.yaml`, `services.yaml`, `widgets.yaml`, `bookmarks.yaml`, `kubernetes.yaml`, `custom.css`, `custom.js`
- **Service list** in ConfigMap includes siteMonitor URLs for all services
- Config is loaded into an emptyDir volume via init container, not directly from PVC

## Dependencies

- **Depends on:** All services (monitors via siteMonitor), metrics-server (for cluster resource widgets)
- **Depended on by:** Nothing (end-user UI)

## Modification Notes

- When adding a new service to the homelab, add an entry to `services.yaml` section of the ConfigMap in `manifests.yaml`
- The manifests.yaml is a single large file (~530 lines) containing ALL resources — be careful with edits
- Dashboard sections: AI & LLM, MCP Tools, DevOps, Operations, Portfolio (bookmarks)
- Widget configuration provides cluster CPU/memory stats from metrics-server
