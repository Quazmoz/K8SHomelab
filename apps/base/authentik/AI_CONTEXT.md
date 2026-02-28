# AI Context: Authentik Identity Provider

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Self-hosted identity provider (IdP) and SSO platform. Provides forward-auth for NGINX ingress, protecting services like MCPO behind authentication.

## Architecture

- **Type:** Two Deployments (server + worker)
- **Image:** `ghcr.io/goauthentik/server:2025.12.0`
- **Namespace:** `apps`
- **Server Ports:** 9000 (HTTP), 9443 (HTTPS)
- **Node:** `quinn-hpprobook430g6` (both)
- **Storage:** 2Gi PVC (`authentik-media-pvc`, `local-storage`)
- **URL:** `http://authentik.k8s.local`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `authentik-deployment.yaml` | Server + Worker Deployments + Services |
| `authentik-pvc.yaml` | 2Gi media PVC |
| `authentik-configmap.yaml` | ConfigMap with env vars |
| `authentik-secrets.secret.enc.yaml` | SOPS-encrypted Secret (SECRET_KEY, AUTHENTIK_POSTGRESQL__PASSWORD) |
| `authentik-secrets.yaml.template` | Template showing secret structure (for reference) |

## Key Configuration

- Server: `AUTHENTIK_POSTGRESQL__HOST=postgres-service.apps.svc.cluster.local`
- Server: `AUTHENTIK_REDIS__HOST=redis.apps.svc.cluster.local`
- Worker runs the same image with `worker` command
- Secrets are SOPS-encrypted

## Dependencies

- **Depends on:** PostgreSQL (`authentik` database), Redis (session/cache backend)
- **Depended on by:** MCPO ingress (forward-auth annotations), any future auth-protected services

## Modification Notes

- Secrets are SOPS-encrypted — use `sops` CLI to edit `authentik-secrets.secret.enc.yaml`
- The `.yaml.template` file shows secret structure for reference
- Both server and worker share the same ConfigMap and secrets
- Forward-auth is configured via NGINX ingress annotations on protected services (not here)
- Configuration of auth flows, providers, and applications happens in the Authentik GUI
