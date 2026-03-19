---
name: homelab-storage
description: "Manage persistent storage in the K8S homelab. USE FOR: adding PersistentVolumes, creating PVCs, migrating data between nodes, understanding storage classes, debugging PVC binding issues, expanding storage, backup/restore operations, SD card vs SSD storage decisions."
---

# Homelab Storage Skill

## When to Use

- Adding persistent storage for a new or existing app
- Debugging PVC stuck in Pending
- Understanding which node to put data on
- Migrating data between nodes
- Expanding or shrinking storage
- Working with backups

## Storage Architecture

```
quinn-hpprobook430g6 (Worker)
├── /mnt/k8s-data/          ← SSD (local-storage class)
│   ├── prometheus/          45Gi
│   ├── grafana/             25Gi
│   ├── postgres/            10Gi
│   ├── loki/                10Gi
│   ├── qdrant/              10Gi
│   ├── mongodb/             5Gi
│   ├── openwebui/           5Gi
│   ├── jupyter/             5Gi
│   ├── phoenix/             5Gi
│   ├── n8n/                 15Gi
│   ├── authentik-media/     2Gi
│   ├── context-forge/       1Gi
│   ├── mcp-gateway/         1Gi
│   ├── homepage/            1Gi
│   ├── jenkins/             20Gi (disabled)
│   ├── awx-projects/        10Gi
│   ├── librechat/           5Gi  (disabled)
│   └── freshrss/            2Gi  (disabled, moved to OPi)
└── /mnt/sdcard/k8s-data/   ← SD Card (slow-storage class)
    └── llamafactory/        50Gi (disabled)

orangepi6plus (Control Plane)
├── /mnt/k8s-data/          ← SSD/eMMC (local-storage class)
│   ├── llama-cpp-models/    50Gi
│   ├── adguard-home/        1Gi
│   └── freshrss/            2Gi  (disabled)
└── /mnt/backup/            ← SD Card (slow-storage class)
    ├── postgres-backup/     20Gi
    └── mongodb-backup/      20Gi
```

## Storage Classes

| Class | Medium | Speed | Use Case |
|-------|--------|-------|----------|
| `local-storage` | SSD/eMMC | Fast | Active workloads, databases |
| `slow-storage` | SD Card | Slow | Backups, cold data, large model files |

Both use `Retain` reclaim policy — PV data persists even after PVC deletion.

## Procedure: Add Storage for a New App

### Step 1: Add PV to storage.yaml

Edit `apps/base/local-storage/storage.yaml` and add:

```yaml
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: <app>-local-pv
spec:
  capacity:
    storage: <size>Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-storage
  local:
    path: /mnt/k8s-data/<app>
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
                - quinn-hpprobook430g6
```

### Step 2: Create PVC in app directory

Create `apps/base/<app>/<app>-pvc.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: <app>-pvc
  namespace: apps
  labels:
    app: <app>
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-storage
  resources:
    requests:
      storage: <size>Gi
```

### Step 3: Create the directory on the node

```bash
ssh quinn-hpprobook430g6 "sudo mkdir -p /mnt/k8s-data/<app> && sudo chmod 777 /mnt/k8s-data/<app>"
```

### Step 4: Add PVC to app kustomization

In `apps/base/<app>/kustomization.yaml`:

```yaml
resources:
  - <app>-pvc.yaml
  # ... other resources
```

### Step 5: Mount in deployment

```yaml
spec:
  template:
    spec:
      containers:
        - name: <app>
          volumeMounts:
            - name: data
              mountPath: /data    # adjust per app
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: <app>-pvc
```

### Step 6: Use Recreate strategy

If the PVC is `ReadWriteOnce` (almost always), set:

```yaml
spec:
  strategy:
    type: Recreate
```

This prevents two pods trying to mount the same RWO volume during rolling updates.

## Sizing Guidelines

| Workload Type | Recommended Size | Rationale |
|---------------|-----------------|-----------|
| Config-only (Homepage) | 1Gi | Just config files |
| Small app (pgAdmin) | No PVC | Stateless |
| Standard app (n8n) | 5-15Gi | Workflows, uploads |
| Database (Postgres) | 10Gi | Multiple DBs, moderate data |
| Monitoring (Prometheus) | 45Gi | 15 days retention at high cardinality |
| Monitoring (Grafana) | 25Gi | Dashboards, plugins, cache |
| Vector DB (Qdrant) | 10Gi | Embeddings for RAG |
| LLM Models (Ollama) | 50Gi | Multiple models, 7B = ~4GB each |
| Backups | 20Gi each | 7 days retention |

## Node Decision Matrix

| Criteria | Node | Reason |
|----------|------|--------|
| App needs fast I/O | `quinn-hpprobook430g6` | SSD |
| App is database | `quinn-hpprobook430g6` | SSD + worker node |
| Backup storage | `orangepi6plus` | Off-worker-node redundancy |
| LLM model storage | `orangepi6plus` | Runs Ollama inference there |
| Cold/archival data | `orangepi6plus` | SD card slow-storage |
| Most workloads | `quinn-hpprobook430g6` | Default choice |

## Backup Architecture

```
Daily at 2AM: pg_dumpall → /mnt/backup/postgres-backup/ (Orange Pi)
Daily at 3AM: mongodump  → /mnt/backup/mongodb-backup/ (Orange Pi)
Retention: 7 days (auto-cleanup in CronJob)
```

Both run on `orangepi6plus` with control-plane toleration to keep backups on a different node than the primary data.

### Manual Backup

```bash
# Trigger PostgreSQL backup
kubectl create job --from=cronjob/postgres-backup -n apps pg-backup-manual

# Trigger MongoDB backup
kubectl create job --from=cronjob/mongodb-backup -n apps mongo-backup-manual
```

### Restore from Backup

```bash
# PostgreSQL - copy backup into pod and restore
kubectl cp /path/to/backup.sql.gz apps/postgres-0:/tmp/
kubectl exec -it -n apps postgres-0 -- bash -c "gunzip -c /tmp/backup.sql.gz | psql -U postgres"

# MongoDB - copy backup and restore
kubectl cp /path/to/backup.tar.gz apps/<mongodb-pod>:/tmp/
kubectl exec -it -n apps <mongodb-pod> -- bash -c "cd /tmp && tar xzf backup.tar.gz && mongorestore dump/"
```

## Debugging PVC Issues

```bash
# Check PVC status
kubectl get pvc -n apps

# Check PV status and bindings
kubectl get pv

# Describe stuck PVC
kubectl describe pvc -n apps <pvc-name>

# Check if physical directory exists
ssh <node> "ls -la /mnt/k8s-data/<app>"

# Check node has expected hostname
kubectl get nodes --show-labels | grep hostname
```

| Symptom | Cause | Fix |
|---------|-------|-----|
| PVC Pending, no events | No matching PV | Add PV to `storage.yaml` |
| PVC Pending, "node affinity" | Pod scheduled on wrong node | Add `nodeSelector` to deployment |
| PV Available but PVC Pending | `claimRef` mismatch | Check PV `claimRef.name` matches PVC name |
| PV Released (not Available) | Previous PVC deleted | `kubectl patch pv <name> -p '{"spec":{"claimRef":null}}'` |
| Permission denied in pod | Directory ownership | `ssh <node> "sudo chown -R 1000:1000 /mnt/k8s-data/<app>"` |

## Expanding Storage

1. **Update PV** in `storage.yaml` (increase `capacity.storage`)
2. **Update PVC** (increase `resources.requests.storage`)
3. **Expand physical directory** if on a separate partition
4. **Restart pod** to pick up the change

**Note:** local-path PVs don't enforce size limits — the size is advisory. But keep it accurate for documentation.

## Documentation Requirement

When adding or modifying storage, update:
1. `apps/base/local-storage/storage.yaml` — the PV definition
2. `apps/base/local-storage/README.md` — PV table
3. `apps/base/local-storage/AI_CONTEXT.md` — PV details
4. The app's own `README.md` and `AI_CONTEXT.md` — storage section
