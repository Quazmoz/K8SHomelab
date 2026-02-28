# AI Context: PostgreSQL

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Primary relational database. Shared single-instance PostgreSQL serving multiple application databases. Includes Prometheus metrics exporter.

## Architecture

- **Type:** StatefulSet
- **Image:** `postgres:15`
- **Namespace:** `apps`
- **Port:** 5432
- **Node:** `quinn-hpprobook430g6`
- **Storage:** 10Gi PVC (`postgres-pvc`, `local-storage`)
- **Internal URL:** `postgres-service.apps.svc.cluster.local:5432`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `postgres-manifest.yaml` | StatefulSet (image, volumes, health checks, resources) |
| `postgres-pvc.yaml` | 10Gi PVC |
| `postgres-init-scripts.yaml` | ConfigMap with init SQL — creates all databases |
| `postgres-exporter.yaml` | Prometheus exporter Deployment + Service (port 9187) |
| `postgres-secret.enc.yaml` | Encrypted Secret (`postgres-credentials`) |
| `postgres-service.yaml` | Two ClusterIP services: `postgres-service` and `postgres` |
| `postgres-pdb.yaml` | PodDisruptionBudget (minAvailable: 1) |

## Key Configuration

- Init scripts run on first startup to create all databases and users
- Exporter (`prometheuscommunity/postgres-exporter:v0.15.0`) provides Prometheus scrape endpoint
- Health checks use `pg_isready`
- Dual service names (`postgres-service` and `postgres`) for compatibility

## Dependencies

- **Depends on:** local-storage (PV)
- **Depended on by:** Grafana, OpenWebUI, n8n, Authentik, Phoenix, Context Forge, GroupMe MCP, AWX, pgAdmin, Backups (critical — most services depend on this)

## Modification Notes

- Adding a new database: add CREATE DATABASE/USER to `postgres-init-scripts.yaml` (only runs on fresh init)
- For existing instances, manually run SQL: `kubectl exec -it -n apps statefulset/postgres -- psql -U postgres`
- Secret is SOPS-encrypted (`postgres-secret.enc.yaml`) — use `sops` to edit
- The exporter is a separate Deployment, not a sidecar
- This is a **critical service** — most of the cluster depends on it
