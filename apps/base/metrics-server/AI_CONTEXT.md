# AI Context: Metrics Server

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Provides resource usage metrics (CPU/memory) for pods and nodes. Required by `kubectl top`, HPA, and Homepage dashboard cluster widgets.

## Architecture

- **Type:** Static manifest (remote/bundled)
- **Namespace:** `kube-system`
- **No PVC, no Ingress, no ConfigMap, no Secrets**

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list + node affinity patches |
| `metrics-server-components.yaml` | Full metrics-server manifest |

## Key Details

- Oracle VMs excluded from scheduling via node affinity patch
- Metrics API available at `metrics.k8s.io/v1beta1`

## Dependencies

- **Depends on:** Nothing
- **Depended on by:** Homepage (cluster resource widgets), `kubectl top`

## Modification Notes

- To upgrade: replace `metrics-server-components.yaml` with new version and reapply patches
- The node affinity patch ensures metrics-server doesn't run on Oracle cloud VMs
