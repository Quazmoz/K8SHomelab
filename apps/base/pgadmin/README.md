# pgAdmin

## Overview

pgAdmin is a web-based PostgreSQL management tool pre-configured to connect to the cluster's PostgreSQL instance.

## Access

- **URL:** [http://pgadmin.k8s.local](http://pgadmin.k8s.local)
- **Credentials:** From `pgadmin-credentials` secret (must be manually created)

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `dpage/pgadmin4:9.12` |
| **Port** | 80 |
| **Node** | `quinn-hpprobook430g6` |
| **Resources** | Requests: 64Mi/10m, Limits: 1Gi/1000m |

## Pre-configured Servers

Automatically connects to `postgres-service.apps.svc.cluster.local:5432` via `servers.json` ConfigMap.

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `pgadmin-deployment.yaml` | Deployment |
| `pgadmin-config.yaml` | ConfigMap with `servers.json` |
| `ingress.yaml` | Ingress for `pgadmin.k8s.local` |

## Setup

1. Create the secret manually:
   ```bash
   kubectl create secret generic pgadmin-credentials -n apps \
     --from-literal=PGADMIN_DEFAULT_EMAIL=admin@admin.com \
     --from-literal=PGADMIN_DEFAULT_PASSWORD=<password>
   ```
2. Deploy via GitOps

## Troubleshooting

```bash
# Check pod
kubectl get pods -n apps -l app=pgadmin

# View logs
kubectl logs -n apps -l app=pgadmin --tail=50
```
