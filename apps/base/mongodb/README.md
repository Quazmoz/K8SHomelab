# MongoDB

## Overview

MongoDB is a document database used by LibreChat (when enabled) and Grafana. Includes a Prometheus exporter for monitoring.

## Access

- **Internal:** `mongodb.apps.svc.cluster.local:27017`
- **Management UI:** [http://mongo-express.k8s.local](http://mongo-express.k8s.local)

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `mongo:8` |
| **Port** | 27017 |
| **Storage** | 5Gi PVC (`local-storage`) |
| **Node** | `quinn-hpprobook430g6` |
| **Strategy** | Recreate |
| **Resources** | Requests: 256Mi/50m, Limits: 1Gi/1000m |
| **Init Database** | `librechat` |

## Prometheus Exporter

- **Image:** `percona/mongodb_exporter:0.47.2`
- **Port:** 9216
- **Flags:** `--collect-all`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `mongodb-deployment.yaml` | Deployment + Service (port 27017) |
| `mongodb-pvc.yaml` | 5Gi PVC |
| `mongodb-exporter.yaml` | Prometheus exporter Deployment + Service |
| `mongodb-pdb.yaml` | PodDisruptionBudget |

## Important Notes

- No authentication enabled — cluster-internal trust model
- Recreate strategy prevents dual PVC mount
- Only `librechat` database is pre-initialized

## Troubleshooting

```bash
# Check pod
kubectl get pods -n apps -l app=mongodb

# Connect to mongo shell
kubectl exec -it -n apps deploy/mongodb -- mongosh

# List databases
kubectl exec -it -n apps deploy/mongodb -- mongosh --eval "show dbs"
```
