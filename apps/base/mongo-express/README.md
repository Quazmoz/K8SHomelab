# Mongo Express

## Overview

Mongo Express is a lightweight web-based MongoDB admin interface.

## Access

- **URL:** [http://mongo-express.k8s.local](http://mongo-express.k8s.local)
- **Credentials:** `admin` / `admin123` (basic auth)

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `mongo-express:1.0.2` |
| **Port** | 8081 |
| **Resources** | Requests: 64Mi/10m, Limits: 256Mi/500m |
| **MongoDB Target** | `mongodb.apps.svc.cluster.local:27017` |

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `deployment.yaml` | Deployment |
| `service.yaml` | ClusterIP Service |
| `ingress.yaml` | Ingress for `mongo-express.k8s.local` |

## Important Notes

- Credentials are hardcoded in the deployment spec (basic auth: admin/admin123)
- No persistent storage needed
- Provides read/write access to all MongoDB databases

## Troubleshooting

```bash
# Check pod
kubectl get pods -n apps -l app=mongo-express

# View logs
kubectl logs -n apps -l app=mongo-express --tail=50
```
