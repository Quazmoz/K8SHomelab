# AI Context: pgAdmin

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Web-based PostgreSQL management interface. Pre-configured to connect to the cluster's shared PostgreSQL instance.

## Architecture

- **Type:** Deployment
- **Image:** `dpage/pgadmin4:9.12`
- **Namespace:** `apps`
- **Port:** 80
- **Node:** `quinn-hpprobook430g6`
- **URL:** `http://pgadmin.k8s.local`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `pgadmin-deployment.yaml` | Deployment |
| `pgadmin-config.yaml` | ConfigMap with `servers.json` (pre-configured PG connection) |
| `ingress.yaml` | Ingress |

## Key Details

- Server config auto-populates the PostgreSQL connection in the UI
- No PVC — pgAdmin settings are ephemeral
- `pgadmin-credentials` secret must be created manually (not in git)

## Dependencies

- **Depends on:** PostgreSQL (`postgres-service.apps.svc.cluster.local:5432`)
- **Depended on by:** Nothing

## Modification Notes

- To add additional server connections, edit `servers.json` in `pgadmin-config.yaml`
- Credentials secret is not in git — must be created manually on fresh deploy
