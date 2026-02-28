# AI Context: Prometheus

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Primary metrics collection, storage, and alerting system. Scrapes Kubernetes metrics, application metrics, and custom endpoints. Provides data to Grafana dashboards and receives remote_write from Alloy.

## Architecture

- **Type:** Flux HelmRelease
- **Chart:** `prometheus` v28.3.0 from `prometheus-community`
- **Namespace:** `apps`
- **Node:** `quinn-hpprobook430g6` (all components)
- **Storage:** 45Gi PVC (`prometheus-server`, `local-storage` class)
- **Retention:** 15 days

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `helm-release.yaml` | HelmRelease with all Helm values (alert rules, scrape configs, etc.) |
| `ingress.yaml` | Ingress for `prometheus.k8s.local` |
| `prometheus-pvc.yaml` | 45Gi PersistentVolumeClaim |

## Key Configuration

- All components pinned to `quinn-hpprobook430g6` via nodeSelector
- Custom alert rules defined inline in HelmRelease values (MCP, Loki, Postgres)
- Extra scrape config for Oracle WireGuard node exporter (`10.49.104.1:9100`)
- Pushgateway enabled for ad-hoc metric pushing
- Alertmanager enabled (internal, no external notification config)

## Dependencies

- **Depends on:** Sources (HelmRepository `prometheus-community`), local-storage (PV)
- **Depended on by:** Grafana (datasource), Alloy (remote_write target)

## Modification Notes

- Alert rules are embedded in `helm-release.yaml` under `serverFiles.alerting_rules.yml`
- Adding new scrape targets: add under `extraScrapeConfigs` in helm-release.yaml
- Adding new alert rules: add under `serverFiles.alerting_rules.yml.groups`
- The PVC is pre-created (not managed by Helm) — deleting the HelmRelease won't delete data
