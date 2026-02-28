# Jupyter Notebook

## Overview

JupyterLab provides an interactive Python notebook environment pre-configured with AI/ML libraries for RAG development, data analysis, and LLM experimentation.

## Access

- **URL:** [http://jupyter.k8s.local](http://jupyter.k8s.local)
- **Token:** `langchain`

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `quay.io/jupyter/scipy-notebook:python-3.12` |
| **Port** | 8888 |
| **Storage** | 5Gi PVC (`local-storage`) |
| **Node** | `quinn-hpprobook430g6` |
| **Resources** | Requests: 256Mi/50m, Limits: 4Gi/2000m |

## Pre-installed Libraries

Installed via init container on startup:
- `langchain`, `langchain-community`, `langchain-openai`
- `qdrant-client`, `openai`, `tiktoken`
- `sentence-transformers`, `pypdf`, `chromadb`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `jupyter-deployment.yaml` | Deployment with init container for pip installs |
| `jupyter-ingress.yaml` | Ingress with WebSocket support and 3600s timeouts |
| `jupyter-pvc.yaml` | 5Gi PVC |

## Important Notes

- Service name is `jupyter-svc` (not `jupyter`) to avoid env var collision with `JUPYTER_PORT`
- Init container installs Python packages on every pod start (adds startup time)
- WebSocket support is required for notebook kernel communication

## Troubleshooting

```bash
# Check pod
kubectl get pods -n apps -l app=jupyter

# View logs (including init container)
kubectl logs -n apps -l app=jupyter -c install-packages
kubectl logs -n apps -l app=jupyter -c jupyter --tail=50

# Check if packages installed
kubectl exec -it -n apps deploy/jupyter -- pip list | grep langchain
```
