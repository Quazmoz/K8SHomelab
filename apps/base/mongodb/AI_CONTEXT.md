# AI Context: MongoDB

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Document database for LibreChat and Grafana datasource. Includes Prometheus metrics exporter.

## Architecture

- **Type:** Deployment
- **Image:** `mongo:8`
- **Namespace:** `apps`
- **Port:** 27017
- **Node:** `quinn-hpprobook430g6`
- **Strategy:** Recreate
- **Storage:** 5Gi PVC (`mongodb-pvc`, `local-storage`)
- **Internal URL:** `mongodb.apps.svc.cluster.local:27017`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `mongodb-deployment.yaml` | Deployment + ClusterIP Service |
| `mongodb-pvc.yaml` | 5Gi PVC |
| `mongodb-exporter.yaml` | Percona mongodb_exporter Deployment + Service (port 9216) |
| `mongodb-pdb.yaml` | PodDisruptionBudget |

## Key Details

- No authentication (unauthenticated, cluster-internal only)
- Init database: `librechat` (via `MONGO_INITDB_DATABASE` env)
- Exporter runs with `--collect-all` flag for comprehensive metrics
- Recreate strategy required for RWO PVC

## Dependencies

- **Depends on:** local-storage (PV)
- **Depended on by:** Mongo Express (UI), Grafana (MongoDB datasource), Backups (mongodump)

## Modification Notes

- No secrets — if authentication is added, update all dependent services
- Adding a new database: just create it via `mongosh` — no init script mechanism
- Exporter is a separate Deployment, not a sidecar
- PDB ensures at least 1 replica stays available during maintenance
