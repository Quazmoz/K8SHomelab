# AI Context: Local Storage

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Defines all `StorageClass` and `PersistentVolume` resources for the cluster. Every stateful workload depends on PVs defined here.

## Architecture

- **Type:** StorageClass + PersistentVolume definitions
- **Namespace:** N/A (cluster-scoped)
- **Storage Classes:** `local-storage` (SSD), `slow-storage` (SD card)
- **All PVs use `hostPath`** with `nodeAffinity` to pin to specific nodes

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `storage.yaml` | All StorageClasses and PVs (~568 lines) |

## Node Distribution

- **quinn-hpprobook430g6** — Most PVs (SSD-backed, `/home/quinn/k8s-data/`)
- **orangepi6plus** — Backups (SD card), LlamaCpp models, AdGuard, FreshRSS

## Dependencies

- **Depends on:** Nothing
- **Depended on by:** Every deployment using a PVC (Prometheus, Grafana, PostgreSQL, Loki, n8n, OpenWebUI, Qdrant, MongoDB, Jupyter, Phoenix, Authentik, AWX, Context Forge, Backups, LlamaCpp, AdGuard Home, etc.)

## Modification Notes

- When adding a new app that needs storage: add PV here AND create a PVC in the app directory
- PV `claimRef` must match the PVC name and namespace exactly
- The physical directory must exist on the target node before the pod starts
- `Retain` reclaim policy means PVs are NOT deleted when PVCs are removed — manual cleanup required
- Slow-storage PVs (`llamafactory`, `postgres-backup`, `mongodb-backup`) use SD card and are significantly slower
