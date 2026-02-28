# Database Backups

## Overview

Automated daily database backups for PostgreSQL and MongoDB using Kubernetes CronJobs. Backups are stored on the Orange Pi's SD card for off-node redundancy.

## Schedule

| Database | Time | Retention |
|----------|------|-----------|
| PostgreSQL | 2:00 AM daily | 7 days |
| MongoDB | 3:00 AM daily | 7 days |

## Configuration

### PostgreSQL Backup
| Setting | Value |
|---------|-------|
| **Image** | `postgres:15` |
| **Method** | `pg_dumpall` (compressed) |
| **Storage** | 20Gi PVC (`slow-storage` on Orange Pi) |
| **Node** | `orangepi6plus` (control-plane toleration) |
| **Timeout** | 1 hour |

### MongoDB Backup
| Setting | Value |
|---------|-------|
| **Image** | `mongo:8` |
| **Method** | `mongodump` + tar.gz |
| **Storage** | 20Gi PVC (`slow-storage` on Orange Pi) |
| **Node** | `orangepi6plus` (control-plane toleration) |
| **Timeout** | 1 hour |

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `postgres-backup-cronjob.yaml` | PostgreSQL backup CronJob |
| `mongodb-backup-cronjob.yaml` | MongoDB backup CronJob |

## Verifying Backups

```bash
# Check recent CronJob runs
kubectl get jobs -n apps | grep backup

# Check backup files on Orange Pi
ssh orangepi6plus ls -la /path/to/backups/

# Manual trigger
kubectl create job --from=cronjob/postgres-backup -n apps postgres-backup-manual
kubectl create job --from=cronjob/mongodb-backup -n apps mongodb-backup-manual
```

## Troubleshooting

```bash
# Check CronJob status
kubectl get cronjobs -n apps

# View last job logs
kubectl logs -n apps job/$(kubectl get jobs -n apps -l job-name -o name | tail -1)
```
