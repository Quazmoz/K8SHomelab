# Loki Log Aggregation

## Overview

Loki is a log aggregation system designed for Kubernetes. It stores and indexes logs shipped by Alloy (the collector agent), and is queried via Grafana.

## Access

- **Internal:** `loki.apps.svc.cluster.local:3100`
- **Queried via:** [http://grafana.k8s.local](http://grafana.k8s.local) (Loki datasource)

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `grafana/loki:3.7.9` |
| **Port** | 3100 |
| **Mode** | Single-binary (all components in one process) |
| **Storage** | 10Gi PVC (`local-storage`, filesystem backend) |
| **Node** | `quinn-hpprobook430g6` |
| **Retention** | 90 days (2160h) |
| **Resources** | Requests: 256Mi/50m, Limits: 2Gi/1000m |
| **Auth** | Disabled (`auth_enabled: false`) |

## Storage Backend

- Uses filesystem for both index (boltdb-shipper) and object storage (chunks)
- All data stored under `/loki/` on the PVC

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `loki-configmap.yaml` | Full Loki configuration |
| `loki-deployment.yaml` | StatefulSet definition |
| `loki-storage.yaml` | PVC + Service definitions |

## Troubleshooting

```bash
# Check pod
kubectl get pods -n apps -l app=loki

# View logs
kubectl logs -n apps -l app=loki --tail=50

# Test readiness
kubectl exec -it -n apps deploy/loki -- wget -qO- http://localhost:3100/ready

# Check log ingestion via Grafana
# Explore → Loki → {namespace="apps"} | last 1h
```

2026-10-21 maintenance: application image `grafana/loki:3.7.9` is pinned explicitly; existing storage and configuration are preserved.
