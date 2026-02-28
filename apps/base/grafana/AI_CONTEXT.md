# AI Context: Grafana

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Central dashboarding and visualization platform. Consumes metrics from Prometheus, logs from Loki, and application data from PostgreSQL and MongoDB.

## Architecture

- **Type:** Flux HelmRelease
- **Chart:** `grafana` v10.5.5 from `grafana`
- **Namespace:** `apps`
- **Node:** `quinn-hpprobook430g6`
- **Storage:** 25Gi PVC (`grafana`, `local-storage` class)
- **URL:** `http://grafana.k8s.local`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `helm-release.yaml` | HelmRelease with all values (datasources, plugins, sidecar) |
| `ingress.yaml` | Ingress for `grafana.k8s.local` |
| `grafana-pvc.yaml` | 25Gi PersistentVolumeClaim |
| `dashboard-configmap.yaml` | ConfigMap with Kubernetes overview dashboard JSON |
| `dashboards/` | Additional dashboard JSON files |

## Key Configuration

- Sidecar enabled for dashboard auto-discovery (label `grafana_dashboard: "1"`)
- MongoDB plugin (`grafana-mongodb-datasource`) installed via Helm values
- Five datasources configured inline in helm-release.yaml
- PVC is pre-created, not Helm-managed

## Dependencies

- **Depends on:** Prometheus (datasource), Loki (datasource), PostgreSQL (datasources: grafana_db, openwebui_db), MongoDB (datasource: librechat), Sources (HelmRepository), local-storage (PV)
- **Depended on by:** Nothing directly (end-user UI)

## Modification Notes

- Datasources are defined in `helm-release.yaml` under `datasources`
- To add a dashboard: create a ConfigMap with `grafana_dashboard: "1"` label, or add JSON to `dashboards/`
- Database credentials are embedded in Helm values — if DB passwords change, update here
- The `grafana-mongodb-datasource` plugin requires the `grafana` Helm chart's `plugins` field
