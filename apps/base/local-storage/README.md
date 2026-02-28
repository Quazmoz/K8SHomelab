# Local Storage

## Overview

Defines `StorageClass` and `PersistentVolume` resources for all stateful workloads in the cluster. Uses `hostPath` volumes on specific nodes.

## Storage Classes

| Class | Type | Reclaim Policy |
|-------|------|----------------|
| `local-storage` | SSD | Retain |
| `slow-storage` | SD Card | Retain |

## PersistentVolumes

| PV Name | Size | Class | Node | Used By |
|---------|------|-------|------|---------|
| `prometheus-pv` | 45Gi | local-storage | quinn-hpprobook430g6 | Prometheus |
| `grafana-pv` | 25Gi | local-storage | quinn-hpprobook430g6 | Grafana |
| `jenkins-pv` | 20Gi | local-storage | quinn-hpprobook430g6 | Jenkins |
| `postgres-pv` | 10Gi | local-storage | quinn-hpprobook430g6 | PostgreSQL |
| `loki-pv` | 10Gi | local-storage | quinn-hpprobook430g6 | Loki |
| `mcp-gateway-pv` | 1Gi | local-storage | quinn-hpprobook430g6 | Context Forge |
| `homepage-pv` | 1Gi | local-storage | quinn-hpprobook430g6 | Homepage |
| `openwebui-pv` | 5Gi | local-storage | quinn-hpprobook430g6 | OpenWebUI |
| `qdrant-pv` | 10Gi | local-storage | quinn-hpprobook430g6 | Qdrant |
| `mongodb-pv` | 5Gi | local-storage | quinn-hpprobook430g6 | MongoDB |
| `jupyter-pv` | 5Gi | local-storage | quinn-hpprobook430g6 | Jupyter |
| `phoenix-pv` | 5Gi | local-storage | quinn-hpprobook430g6 | Phoenix |
| `context-forge-pv` | 1Gi | local-storage | quinn-hpprobook430g6 | Context Forge |
| `authentik-media-pv` | 2Gi | local-storage | quinn-hpprobook430g6 | Authentik |
| `awx-projects-pv` | 10Gi | local-storage | quinn-hpprobook430g6 | AWX |
| `n8n-pv` | 15Gi | local-storage | quinn-hpprobook430g6 | n8n |
| `llamafactory-pv` | 50Gi | slow-storage | quinn-hpprobook430g6 | LlamaFactory |
| `freshrss-pv` | 2Gi | local-storage | orangepi6plus | FreshRSS |
| `librechat-pv` | 5Gi | local-storage | quinn-hpprobook430g6 | LibreChat |
| `postgres-backup-pv` | 20Gi | slow-storage | orangepi6plus | PG Backups |
| `mongodb-backup-pv` | 20Gi | slow-storage | orangepi6plus | MongoDB Backups |
| `llama-cpp-models-pv` | 50Gi | local-storage | orangepi6plus | LlamaCpp/Ollama |
| `adguard-home-pv` | 1Gi | local-storage | orangepi6plus | AdGuard Home |

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `storage.yaml` | All StorageClasses and PersistentVolumes |

## Adding Storage for a New App

1. Add a new `PersistentVolume` entry in `storage.yaml`
2. Set `hostPath` to a directory on the target node
3. Set `nodeAffinity` to the correct node name
4. Create a matching PVC in your app's directory
5. Ensure the directory exists on the node: `sudo mkdir -p /path/to/data`

## Troubleshooting

```bash
# Check PV status
kubectl get pv

# Check PVC bindings
kubectl get pvc -n apps

# Check if PV is bound or available
kubectl describe pv <pv-name>
```
