# AI Context: Redis

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

In-memory cache and session store. Used by Authentik (session/cache backend) and Context Forge (caching). RedisInsight provides a management UI.

## Architecture

- **Type:** Two Deployments (Redis + RedisInsight)
- **Redis Image:** `redis:8.4-alpine`
- **RedisInsight Image:** `redis/redisinsight` (SHA pinned)
- **Namespace:** `apps`
- **Redis Port:** 6379, **RedisInsight Port:** 5540
- **Node:** `quinn-hpprobook430g6` (both)
- **Storage:** emptyDir (ephemeral!) with AOF enabled
- **Redis URL:** `redis.apps.svc.cluster.local:6379`
- **RedisInsight URL:** `http://redisinsight.k8s.local`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `redis-deployment.yaml` | Redis Deployment + ClusterIP Service |
| `redisinsight-deployment.yaml` | RedisInsight Deployment + ClusterIP Service |
| `ingress.yaml` | Ingress for RedisInsight |
| `redis-pdb.yaml` | PodDisruptionBudget |

## Key Details

- **No persistent storage** — data lost on pod restart; this is by design (cache only)
- No authentication configured
- AOF enabled for in-lifecycle durability

## Dependencies

- **Depends on:** Nothing
- **Depended on by:** Authentik (session storage, cache), Context Forge (caching)

## Modification Notes

- If persistence is needed, add a PVC and change emptyDir to persistentVolumeClaim
- No secrets configured — Redis is unauthenticated (cluster-internal only)
- RedisInsight image is SHA-pinned for reproducibility
