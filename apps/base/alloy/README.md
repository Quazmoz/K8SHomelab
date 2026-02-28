# Grafana Alloy (OpenTelemetry Collector)

## Overview

Grafana Alloy is a unified telemetry collector that scrapes Kubernetes logs, receives OTLP data, and forwards everything to the appropriate backends (Loki, Prometheus, Phoenix).

## How It Works

```
K8s Pod Logs ──→ Alloy ──→ Loki (logs)
OTLP gRPC/HTTP ──→ Alloy ──→ Prometheus (metrics)
                         ──→ Loki (logs)
                         ──→ Phoenix (traces)
```

## Configuration

| Setting | Value |
|---------|-------|
| **Chart** | `alloy` v1.5.2 from `grafana` |
| **Extra Ports** | 4317 (OTLP gRPC), 4318 (OTLP HTTP) |
| **Resources** | Requests: 128Mi/50m, Limits: 512Mi/500m |

## Telemetry Pipeline

| Source | Destination | Protocol |
|--------|-------------|----------|
| Kubernetes pod logs | Loki | HTTP push |
| OTLP metrics | Prometheus | remote_write |
| OTLP logs | Loki | HTTP push |
| OTLP traces | Phoenix | OTLP gRPC |

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `helm-release.yaml` | Flux HelmRelease with full Alloy config pipeline |

## Troubleshooting

```bash
# Check HelmRelease
flux get helmrelease alloy -n apps

# Check pods
kubectl get pods -n apps -l app.kubernetes.io/name=alloy

# Force reconcile
flux reconcile helmrelease alloy -n apps --with-source
```
