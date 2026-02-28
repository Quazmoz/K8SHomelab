# n8n Workflow Automation

## Overview

n8n is a workflow automation platform used for building integrations, RAG pipelines, and MCP-connected automations. Provides a visual workflow editor.

## Access

- **URL:** [http://n8n.k8s.local](http://n8n.k8s.local)

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `n8nio/n8n:2.8.3` |
| **Port** | 5678 |
| **Storage** | 15Gi PVC (`local-storage`) |
| **Node** | `quinn-hpprobook430g6` |
| **Resources** | Requests: 256Mi/100m, Limits: 2Gi/2000m |
| **MCP** | Enabled (`N8N_MCP_ENABLED=true`) |
| **Timezone** | `America/New_York` |

## Features

- Visual workflow builder
- MCP integration enabled
- GroupMe bot workflows (via optional secret)
- LangChain RAG workflows
- Interview agent workflows

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `n8n-deployment.yaml` | Deployment with env vars and health checks |
| `n8n-service.yaml` | ClusterIP service on port 5678 |
| `n8n-ingress.yaml` | Ingress for `n8n.k8s.local` (50m body size) |
| `n8n-pv.yaml` | PersistentVolume (15Gi) |
| `n8n-pvc.yaml` | PersistentVolumeClaim |
| `n8n-configmap.yaml` | Environment configuration |
| `n8n-groupme-workflows.yaml` | GroupMe bot workflow definitions |
| `n8n-langchain-rag-workflow.yaml` | RAG workflow definitions |
| `n8n-interview-agent-workflows.yaml` | Interview agent workflow |
| `workflows/` | Additional workflow JSON files |

## Troubleshooting

```bash
# Check pod
kubectl get pods -n apps -l app=n8n

# View logs
kubectl logs -n apps -l app=n8n --tail=100

# Health check
curl http://n8n.k8s.local/healthz
```
