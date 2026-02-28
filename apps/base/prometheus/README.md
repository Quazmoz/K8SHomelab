# Prometheus

## Overview

Prometheus is the primary metrics collection and alerting system for the cluster. Deployed via Flux HelmRelease, it scrapes metrics from all instrumented services and provides data to Grafana.

## Access

- **URL:** [http://prometheus.k8s.local](http://prometheus.k8s.local)

## Components

| Component | Enabled | Purpose |
|-----------|---------|---------|
| Server | Yes | Metrics TSDB and query engine |
| Alertmanager | Yes | Alert routing and notification |
| Pushgateway | Yes | Push-based metric ingestion |
| kube-state-metrics | Yes | Kubernetes object metrics |
| Node Exporter | Yes | Host-level metrics |

## Configuration

| Setting | Value |
|---------|-------|
| **Chart** | `prometheus` v28.3.0 from `prometheus-community` |
| **Storage** | 45Gi PVC (`local-storage`) |
| **Retention** | 15 days |
| **Node** | `quinn-hpprobook430g6` (all components) |
| **Resources** | Requests: 64Mi/10m, Limits: 2Gi/2000m |

## Alert Rules

- `MCPOHighErrorRate` — MCPO HTTP error rate >10% for 5 min
- `MCPODown` — MCPO target down for 2 min
- `MCPOPodRestart` — MCPO pod restarts >3 in 15 min
- `LokiIngestionStopped` — Loki not ingesting for 5 min
- `PostgresExporterDown` — Postgres exporter down for 5 min

## Extra Scrape Targets

- Oracle WireGuard node exporter: `10.49.104.1:9100`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `helm-release.yaml` | Flux HelmRelease with full Helm values |
| `ingress.yaml` | Ingress for `prometheus.k8s.local` |
| `prometheus-pvc.yaml` | 45Gi PVC |

## Troubleshooting

```bash
# Check HelmRelease status
flux get helmrelease prometheus -n apps

# Check pods
kubectl get pods -n apps -l app.kubernetes.io/name=prometheus

# Force reconcile
flux reconcile helmrelease prometheus -n apps --with-source

# Check targets
# Visit http://prometheus.k8s.local/targets
```
