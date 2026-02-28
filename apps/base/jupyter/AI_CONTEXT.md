# AI Context: Jupyter Notebook

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Interactive Python notebook environment for RAG development, LLM experimentation, data analysis, and prototyping AI workflows.

## Architecture

- **Type:** Deployment
- **Image:** `quay.io/jupyter/scipy-notebook:python-3.12`
- **Namespace:** `apps`
- **Port:** 8888
- **Node:** `quinn-hpprobook430g6`
- **Storage:** 5Gi PVC (`jupyter-pvc`, `local-storage`)
- **URL:** `http://jupyter.k8s.local` (token: `langchain`)

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `jupyter-deployment.yaml` | Deployment with init container for package installation |
| `jupyter-ingress.yaml` | Ingress with WebSocket and 3600s timeouts |
| `jupyter-pvc.yaml` | 5Gi PVC |

## Key Configuration

- Init container runs `pip install` for AI/ML packages on every startup
- Service name: `jupyter-svc` (avoids `JUPYTER_PORT` env collision from service discovery)
- Ingress annotations enable WebSocket proxying (required for kernels)
- Access token: `langchain` (set via `JUPYTER_TOKEN` env var)

## Dependencies

- **Depends on:** Qdrant (`qdrant.apps.svc.cluster.local:6333` for vector operations), local-storage (PV)
- **Depended on by:** Nothing (end-user tool)

## Modification Notes

- To add more Python packages: edit the init container `pip install` command in `jupyter-deployment.yaml`
- Init container runs on every pod restart — adds 1-3 min to startup
- Consider building a custom image if the package list grows significantly
- WebSocket timeouts in ingress (3600s) are critical for long-running cells
