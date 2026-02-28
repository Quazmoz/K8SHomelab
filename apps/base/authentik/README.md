# Authentik Identity Provider

## Overview

Authentik is a self-hosted identity provider (IdP) that provides SSO and forward-auth for protected services in the cluster. Runs as a server + worker pair.

## Access

- **URL:** [http://authentik.k8s.local](http://authentik.k8s.local)
- **Admin:** Initial setup via first-run wizard

## Components

| Component | Purpose |
|-----------|---------|
| Server | HTTP frontend (ports 9000/9443) |
| Worker | Background task processing |

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `ghcr.io/goauthentik/server:2025.12.0` |
| **Server Ports** | 9000 (HTTP), 9443 (HTTPS) |
| **Node** | `quinn-hpprobook430g6` (both) |
| **Server Resources** | Requests: 256Mi/100m, Limits: 2Gi/2000m |
| **Worker Resources** | Requests: 256Mi/100m, Limits: 1Gi/2000m |
| **Database** | PostgreSQL (`authentik` DB) |
| **Cache** | Redis (`redis.apps.svc.cluster.local:6379`) |
| **Media Storage** | 2Gi PVC |

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `authentik-deployment.yaml` | Server + Worker Deployments, Services |
| `authentik-pvc.yaml` | 2Gi media PVC |
| `authentik-configmap.yaml` | Environment configuration |
| `authentik-secrets.secret.enc.yaml` | SOPS-encrypted secrets (SECRET_KEY, PG password) |
| `authentik-secrets.yaml.template` | Template showing secret structure |

## Protected Services

- MCPO ingress uses Authentik forward-auth annotations

## Troubleshooting

```bash
# Check pods
kubectl get pods -n apps -l app=authentik

# View server logs
kubectl logs -n apps -l app=authentik,component=server --tail=50

# View worker logs
kubectl logs -n apps -l app=authentik,component=worker --tail=50
```
