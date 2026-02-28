# AI Context: OpenWebUI

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Primary AI chat interface. Connects to local LLM backends, supports RAG via vector search, exports telemetry traces, and integrates MCP tools for extended capabilities.

## Architecture

- **Type:** Deployment
- **Image:** `ghcr.io/open-webui/open-webui:v0.8.5`
- **Namespace:** `apps`
- **Port:** 8080
- **Node:** x86 only (`nodeAffinity: NotIn arm, arm64`)
- **Storage:** 5Gi PVC (`openwebui-pvc`, `local-storage`)
- **URL:** `http://openwebui.k8s.local`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `openwebui-deployment.yaml` | Deployment with extensive env vars (DB, RAG, OTEL, auth) |
| `openwebui-ingress.yaml` | Ingress with 3600s proxy timeouts for long-running LLM streams |
| `openwebui-pvc.yaml` | 5Gi PVC |
| `tools/` | MCP tool Python scripts |

## Key Configuration

- `DATABASE_URL` → PostgreSQL (`openwebui_db`) via `postgres-credentials` secret
- `OLLAMA_BASE_URLS` → `http://llama-cpp.apps.svc.cluster.local:11434`
- `OPENAI_API_BASE_URLS` → `http://llama-cpp.apps.svc.cluster.local:11434/v1`
- RAG: Qdrant engine, `text-embedding-3-small`, chunk 1000, overlap 100, top_k 5
- OTEL: traces to `phoenix.apps.svc.cluster.local:4317` via gRPC
- Auth: `WEBUI_AUTH=true`, signup enabled
- Audit: `AUDIT_LOG_LEVEL=REQUEST_RESPONSE`

## Dependencies

- **Depends on:** PostgreSQL (user data, chat history), Qdrant (RAG vector store), LlamaCpp (LLM backend), Phoenix (trace export), MCP servers (tools)
- **Depended on by:** Nothing directly (end-user UI)

## Modification Notes

- Environment variables control all integrations — check deployment spec carefully
- Ingress timeout of 3600s is critical for LLM streaming responses
- The `tools/` directory contains MCP tool definitions loaded by OpenWebUI
- Password for DB comes from `postgres-credentials` secret
- Resource limits are high (8Gi RAM, 4 CPU) to handle LLM proxy workloads
