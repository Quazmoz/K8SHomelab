# AI Context: Loki Log Aggregation

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Centralized log aggregation. Receives logs from Alloy, stores them with filesystem backend, serves queries to Grafana. Connected to Prometheus alertmanager for log-based alerts.

## Architecture

- **Type:** StatefulSet
- **Image:** `grafana/loki:3.6.3`
- **Namespace:** `apps`
- **Port:** 3100
- **Mode:** Single-binary (all targets in one process)
- **Node:** `quinn-hpprobook430g6`
- **Storage:** 10Gi PVC (`loki-pvc`, `local-storage`)
- **Internal URL:** `loki.apps.svc.cluster.local:3100`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `loki-configmap.yaml` | Full Loki config YAML (auth, schema, storage, limits, alertmanager) |
| `loki-deployment.yaml` | StatefulSet with volumes and resource limits |
| `loki-storage.yaml` | PVC and ClusterIP Service |

## Key Configuration

- `auth_enabled: false` — no multi-tenancy
- Index: boltdb-shipper with 24h period tables
- Object store: filesystem at `/loki/chunks`
- Retention: 90 days (2160h), compactor runs retention
- Alertmanager: `http://prometheus-alertmanager.apps.svc:9093` (Prometheus-managed)

## Dependencies

- **Depends on:** Prometheus (alertmanager endpoint), local-storage (PV)
- **Depended on by:** Grafana (datasource), Alloy (log shipping target)

## Modification Notes

- Config is in `loki-configmap.yaml` — changes require pod restart
- Schema changes (period/index type) require careful migration
- Retention is enforced by compactor, configured in `limits_config`
- The deployment is a StatefulSet (not a Deployment) for stable storage identity
