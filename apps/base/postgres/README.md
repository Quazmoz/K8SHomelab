# PostgreSQL

## Overview

PostgreSQL is the primary relational database for the cluster. Multiple services share this single instance, each with its own database. Includes a Prometheus exporter for monitoring.

## Access

- **Internal:** `postgres-service.apps.svc.cluster.local:5432`
- **Management UI:** [http://pgadmin.k8s.local](http://pgadmin.k8s.local) (via pgAdmin)

## Databases

| Database | Used By |
|----------|---------|
| `grafana_db` | Grafana |
| `authentik` | Authentik |
| `n8n` | n8n |
| `openwebui_db` | OpenWebUI |
| `freshrss` | FreshRSS |
| `coder` | Coder |
| `langfuse` | Langfuse (legacy) |
| `azure_mcp_go` | Azure MCP Server |
| `context_forge` | Context Forge |
| `groupme_tokens` | GroupMe MCP |
| `phoenix` | Phoenix |

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `postgres:18` |
| **Port** | 5432 |
| **Storage** | 10Gi PVC (`local-storage`) |
| **Node** | `quinn-hpprobook430g6` |
| **Resources** | Requests: 512Mi/200m, Limits: 4Gi/2000m |
| **Exporter** | `postgres-exporter:v0.19.1` on port 9187 |

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `postgres-manifest.yaml` | StatefulSet definition |
| `postgres-pvc.yaml` | 10Gi PVC |
| `postgres-init-scripts.yaml` | Init SQL ConfigMap (creates databases) |
| `postgres-exporter.yaml` | Prometheus exporter Deployment + Service |
| `postgres-secret.enc.yaml` | Encrypted credentials |
| `postgres-service.yaml` | ClusterIP services (`postgres-service`, `postgres`) |
| `postgres-pdb.yaml` | PodDisruptionBudget |

## Troubleshooting

```bash
# Check pod
kubectl get pods -n apps -l app=postgres

# Connect to psql
kubectl exec -it -n apps statefulset/postgres -- psql -U postgres

# List databases
kubectl exec -it -n apps statefulset/postgres -- psql -U postgres -c "\l"

# Check exporter
kubectl get pods -n apps -l app=postgres-exporter

# Verify PostgreSQL version
kubectl exec -n apps postgres-0 -- psql -U postgres -d postgres -Atc "SELECT version();"

# Inspect PostgreSQL 18 checkpoint/bgwriter stats split
kubectl exec -n apps postgres-0 -- psql -U postgres -d postgres -Atc "SELECT column_name FROM information_schema.columns WHERE table_schema = 'pg_catalog' AND table_name = 'pg_stat_bgwriter' ORDER BY ordinal_position;"
kubectl exec -n apps postgres-0 -- psql -U postgres -d postgres -Atc "SELECT column_name FROM information_schema.columns WHERE table_schema = 'pg_catalog' AND table_name = 'pg_stat_checkpointer' ORDER BY ordinal_position;"
```

## PostgreSQL 18 Exporter Note

PostgreSQL 18 no longer exposes checkpoint counters like `checkpoints_timed` in `pg_stat_bgwriter`; those counters live in `pg_stat_checkpointer`.
Use `prometheuscommunity/postgres-exporter:v0.19.1` or another release that includes the PostgreSQL 17+ stats-view update, and keep the exporter probes on `/metrics` rather than `/healthz`.
