# AI Context: LlamaCpp / Ollama (LLM Backend)

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Local LLM inference server (Ollama) providing OpenAI-compatible API. Primary LLM backend for OpenWebUI.

## Architecture

- **Type:** Deployment
- **Image:** `ollama/ollama:latest`
- **Namespace:** `apps`
- **Port:** 11434
- **Node:** `orangepi6plus` (ARM64, with control-plane + master tolerations)
- **Strategy:** Recreate
- **Storage:** 50Gi PVC (`llama-cpp-models-pvc`, `local-storage` on Orange Pi)
- **Internal URL:** `llama-cpp.apps.svc.cluster.local:11434`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `deployment.yaml` | Deployment + ClusterIP Service |
| `pvc.yaml` | 50Gi PVC for model storage |

## Key Configuration

- `OLLAMA_NUM_PARALLEL=1` — single concurrent inference (memory constrained)
- `OLLAMA_MAX_LOADED_MODELS=1` — keep only one model loaded
- `OLLAMA_NUM_CTX=16384` — context window size
- Resource limits: 8Gi RAM, 8 CPU (matches Orange Pi capacity)
- Recreate strategy: required for RWO PVC

## Dependencies

- **Depends on:** local-storage (PV on Orange Pi)
- **Depended on by:** OpenWebUI (LLM backend via `OLLAMA_BASE_URLS` and `OPENAI_API_BASE_URLS`)

## Modification Notes

- **Directory name is misleading** — this runs Ollama, not llama.cpp
- Image is `latest` tag — be aware of uncontrolled updates on pod restart
- Models must be pulled via `ollama pull` inside the pod (not declarative)
- 50Gi PVC is on Orange Pi local storage — model downloads survive restarts
- Memory constraints on Orange Pi mean only 1 model can be loaded at a time
- No ingress — cluster-internal only, accessed by OpenWebUI
