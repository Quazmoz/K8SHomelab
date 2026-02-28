# AI Context: Qdrant Vector Database

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Vector similarity search engine for RAG. Stores document embeddings used by OpenWebUI for retrieval-augmented generation.

## Architecture

- **Type:** Deployment
- **Image:** `qdrant/qdrant` (SHA pinned)
- **Namespace:** `apps`
- **Ports:** 6333 (HTTP), 6334 (gRPC)
- **Strategy:** Recreate
- **Storage:** 10Gi PVC (`qdrant-pvc`, `local-storage`)
- **URL:** `http://qdrant.k8s.local`
- **Internal:** `qdrant.apps.svc.cluster.local:6333` (HTTP), `:6334` (gRPC)

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `qdrant-deployment.yaml` | Deployment |
| `qdrant-service.yaml` | ClusterIP Service (both ports) |
| `qdrant-ingress.yaml` | Ingress with 100m body size for uploads |
| `qdrant-pvc.yaml` | 10Gi PVC |
| `qdrant-pdb.yaml` | PodDisruptionBudget |

## Key Details

- Image is SHA-pinned for reproducibility
- Recreate strategy prevents dual-mount of PVC
- No authentication configured (cluster-internal trust)
- 100m proxy body size on ingress for bulk vector uploads

## Dependencies

- **Depends on:** local-storage (PV)
- **Depended on by:** OpenWebUI (RAG vector store), Jupyter (notebook queries)

## Modification Notes

- Image is SHA-pinned — update digest to upgrade
- PDB ensures availability during node maintenance
- No ConfigMap — Qdrant uses default configuration
- High memory limits (6Gi) to handle large vector collections
