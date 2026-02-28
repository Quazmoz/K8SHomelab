# AI Context: Mongo Express

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Lightweight web-based MongoDB admin interface for browsing and editing documents.

## Architecture

- **Type:** Deployment
- **Image:** `mongo-express:1.0.2`
- **Namespace:** `apps`
- **Port:** 8081
- **URL:** `http://mongo-express.k8s.local`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `deployment.yaml` | Deployment (image, env, resources) |
| `service.yaml` | ClusterIP Service |
| `ingress.yaml` | Ingress |

## Key Details

- Basic auth credentials hardcoded: `admin` / `admin123`
- Connects to `mongodb.apps.svc.cluster.local:27017`
- No PVC, no ConfigMap, no Secrets
- Stateless — safe to delete and recreate

## Dependencies

- **Depends on:** MongoDB (`mongodb.apps.svc.cluster.local:27017`)
- **Depended on by:** Nothing

## Modification Notes

- Credentials should ideally be moved to a Secret (currently hardcoded in deployment.yaml)
- If MongoDB adds authentication, update the env vars in deployment.yaml
- Very simple deployment — only 4 files
