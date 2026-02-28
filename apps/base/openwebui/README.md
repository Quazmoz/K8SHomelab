# OpenWebUI

## Overview

OpenWebUI is the primary AI chat interface for the homelab. It connects to LLM backends (Ollama/LlamaCpp), supports RAG via Qdrant, exports traces to Phoenix for observability, and integrates MCP tools.

## Access

- **URL:** [http://openwebui.k8s.local](http://openwebui.k8s.local)
- **Auth:** Built-in authentication (signup enabled)

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `ghcr.io/open-webui/open-webui:v0.8.5` |
| **Port** | 8080 |
| **Storage** | 5Gi PVC (`local-storage`) |
| **Node** | x86 only (NotIn arm/arm64) |
| **Resources** | Requests: 1Gi/500m, Limits: 8Gi/4000m |
| **Database** | PostgreSQL (`openwebui_db`) |

## Integrations

| Integration | Target |
|-------------|--------|
| LLM Backend | `llama-cpp.apps.svc.cluster.local:11434/v1` (OpenAI-compatible) |
| Vector DB (RAG) | Qdrant (`qdrant.apps.svc.cluster.local:6333`) |
| Traces (OTEL) | Phoenix (`phoenix.apps.svc.cluster.local:4317` gRPC) |
| MCP Tools | Via Context Forge and MCPO |

## RAG Configuration

- **Engine:** Qdrant
- **Embedding Model:** `text-embedding-3-small`
- **Chunk Size:** 1000, Overlap: 100

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `openwebui-deployment.yaml` | Deployment with all env vars |
| `openwebui-ingress.yaml` | Ingress (3600s proxy timeouts for streaming) |
| `openwebui-pvc.yaml` | 5Gi PVC |
| `tools/` | MCP tool definitions |

## Troubleshooting

```bash
# Check pod
kubectl get pods -n apps -l app=openwebui

# View logs
kubectl logs -n apps -l app=openwebui --tail=100

# Check database connectivity
kubectl exec -it -n apps deploy/openwebui -- python -c "import psycopg2; print('OK')"
```
