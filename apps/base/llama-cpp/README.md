# LlamaCpp / Ollama (LLM Backend)

## Overview

Despite the directory name, this deployment runs **Ollama** — the LLM inference server that provides OpenAI-compatible API access to local language models. It runs on the Orange Pi 6 Plus (ARM64) to leverage its hardware.

## Access

- **Internal:** `llama-cpp.apps.svc.cluster.local:11434`
- **API Compatible:** OpenAI API format (used by OpenWebUI)

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `ollama/ollama:latest` |
| **Port** | 11434 |
| **Storage** | 50Gi PVC (`local-storage` on Orange Pi) |
| **Node** | `orangepi6plus` (ARM64, with control-plane toleration) |
| **Strategy** | Recreate |
| **Resources** | Requests: 8Gi/4000m, Limits: 8Gi/8000m |

## Model Configuration

| Setting | Value |
|---------|-------|
| `OLLAMA_NUM_PARALLEL` | 1 (single concurrent request) |
| `OLLAMA_MAX_LOADED_MODELS` | 1 (one model in memory) |
| `OLLAMA_NUM_CTX` | 16384 (context window) |

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `deployment.yaml` | Deployment + Service |
| `pvc.yaml` | 50Gi PVC for model storage |

## Managing Models

```bash
# Pull a model
kubectl exec -it -n apps deploy/llama-cpp -- ollama pull llama3.2

# List models
kubectl exec -it -n apps deploy/llama-cpp -- ollama list

# Remove a model
kubectl exec -it -n apps deploy/llama-cpp -- ollama rm <model-name>
```

## Important Notes

- Model downloads are stored on PVC (50Gi) — survive pod restarts
- Limited to 1 parallel request and 1 loaded model due to Orange Pi memory constraints
- No ingress — internal-only access via OpenWebUI

## Troubleshooting

```bash
# Check pod
kubectl get pods -n apps -l app=llama-cpp

# View logs
kubectl logs -n apps -l app=llama-cpp --tail=50

# Test API
kubectl exec -it -n apps deploy/llama-cpp -- curl http://localhost:11434/api/tags
```
