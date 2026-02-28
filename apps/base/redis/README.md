# Redis

## Overview

Redis provides in-memory caching and session storage. Includes RedisInsight for visual management.

## Access

- **Redis Internal:** `redis.apps.svc.cluster.local:6379`
- **RedisInsight UI:** [http://redisinsight.k8s.local](http://redisinsight.k8s.local)

## Components

| Component | Image | Port |
|-----------|-------|------|
| Redis | `redis:8.4-alpine` | 6379 |
| RedisInsight | `redis/redisinsight` (SHA pinned) | 5540 |

## Configuration

| Setting | Value |
|---------|-------|
| **Node** | `quinn-hpprobook430g6` (both) |
| **Redis Storage** | emptyDir (ephemeral, AOF enabled) |
| **Redis Resources** | Requests: 64Mi/25m, Limits: 512Mi/500m |
| **RedisInsight Resources** | Requests: 64Mi/10m, Limits: 1Gi/1000m |

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `redis-deployment.yaml` | Redis Deployment + Service |
| `redisinsight-deployment.yaml` | RedisInsight Deployment + Service |
| `ingress.yaml` | Ingress for RedisInsight (`redisinsight.k8s.local`) |
| `redis-pdb.yaml` | PodDisruptionBudget |

## Important Notes

- Redis uses `emptyDir` — **data is NOT persistent across pod restarts**
- AOF (Append Only File) is enabled for durability within the pod lifecycle
- Used primarily for caching, not as a primary data store

## Troubleshooting

```bash
# Check pods
kubectl get pods -n apps -l app=redis
kubectl get pods -n apps -l app=redisinsight

# Connect to Redis CLI
kubectl exec -it -n apps deploy/redis -- redis-cli

# Check memory usage
kubectl exec -it -n apps deploy/redis -- redis-cli info memory
```
