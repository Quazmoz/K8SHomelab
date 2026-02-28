# Qdrant Vector Database

## Overview

Qdrant is a high-performance vector similarity search engine. It stores embeddings for RAG (Retrieval-Augmented Generation) used by OpenWebUI and Jupyter notebooks.

## Access

- **HTTP API:** [http://qdrant.k8s.local](http://qdrant.k8s.local)
- **Internal HTTP:** `qdrant.apps.svc.cluster.local:6333`
- **Internal gRPC:** `qdrant.apps.svc.cluster.local:6334`

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `qdrant/qdrant` (SHA pinned) |
| **Ports** | 6333 (HTTP), 6334 (gRPC) |
| **Storage** | 10Gi PVC (`local-storage`) |
| **Strategy** | Recreate |
| **Resources** | Requests: 1Gi/200m, Limits: 6Gi/2000m |

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `qdrant-deployment.yaml` | Deployment |
| `qdrant-service.yaml` | ClusterIP service (HTTP + gRPC) |
| `qdrant-ingress.yaml` | Ingress (100m proxy body size for uploads) |
| `qdrant-pvc.yaml` | 10Gi PVC |
| `qdrant-pdb.yaml` | PodDisruptionBudget |

## Usage

- OpenWebUI uses Qdrant as its RAG vector store (embedding model: `text-embedding-3-small`)
- Jupyter notebooks can connect via `qdrant-client` Python library

## Troubleshooting

```bash
# Check pod
kubectl get pods -n apps -l app=qdrant

# Check health
curl http://qdrant.k8s.local/healthz

# List collections
curl http://qdrant.k8s.local/collections
```
