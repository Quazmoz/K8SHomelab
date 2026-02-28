# Metrics Server

## Overview

Kubernetes Metrics Server provides resource usage metrics (CPU/memory) for pods and nodes. Required for `kubectl top`, Horizontal Pod Autoscaler, and Homepage dashboard widgets.

## Configuration

| Setting | Value |
|---------|-------|
| **Type** | Static manifest |
| **Namespace** | `kube-system` |

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list + patches |
| `metrics-server-components.yaml` | Full metrics-server deployment manifest |

## Patches Applied

- Oracle VMs (`oracle-wireguard`, `oracle-groupmebot`) excluded from scheduling via node affinity

## Troubleshooting

```bash
# Check if metrics are available
kubectl top nodes
kubectl top pods -n apps

# Check metrics-server pod
kubectl get pods -n kube-system -l k8s-app=metrics-server
```
