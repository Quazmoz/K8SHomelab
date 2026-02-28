# AI Context: n8n Workflow Automation

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Visual workflow automation platform for integrations, MCP-connected automations, RAG pipelines, and bot workflows.

## Architecture

- **Type:** Deployment
- **Image:** `n8nio/n8n:2.8.3`
- **Namespace:** `apps`
- **Port:** 5678
- **Node:** `quinn-hpprobook430g6`
- **Storage:** 15Gi PVC (`n8n-data-pvc`, `local-storage`)
- **URL:** `http://n8n.k8s.local`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `n8n-deployment.yaml` | Deployment (image, env, health checks, volumes) |
| `n8n-service.yaml` | ClusterIP service |
| `n8n-ingress.yaml` | Ingress with 50m body size |
| `n8n-pv.yaml` | PersistentVolume |
| `n8n-pvc.yaml` | PersistentVolumeClaim |
| `n8n-configmap.yaml` | ConfigMap (`N8N_PORT`, `N8N_HOST`, `TZ`, `N8N_MCP_ENABLED`) |
| `n8n-groupme-workflows.yaml` | GroupMe workflow ConfigMap |
| `n8n-langchain-rag-workflow.yaml` | RAG workflow ConfigMap |
| `n8n-interview-agent-workflows.yaml` | Interview agent workflow ConfigMap |
| `workflows/` | Additional workflow JSON files |

## Key Configuration

- MCP integration enabled via `N8N_MCP_ENABLED=true`
- Optional `GROUPME_TOKEN` from secret `groupme-mcp-credentials`
- Health checks: HTTP `/healthz` on port 5678
- Database: uses n8n's built-in SQLite by default (stored on PVC)
- Ingress allows 50m request body for file uploads

## Dependencies

- **Depends on:** PostgreSQL (if DB configured externally), local-storage (PV)
- **Depended on by:** MCPO (n8n MCP tools), Homepage (monitoring)

## Modification Notes

- Workflow ConfigMaps are separate from the main deployment
- Environment variables are split between ConfigMap and deployment spec
- The PV is defined separately (`n8n-pv.yaml`) from the main `local-storage/storage.yaml`
- GroupMe token is optional — deployment works without it
