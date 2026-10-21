# Database Backups

## Overview

Automated daily database backups for PostgreSQL and MongoDB using Kubernetes CronJobs. PostgreSQL backups are stored at `/mnt/backup/postgres` on the Orange Pi SSD, on a different node from the primary database. The former `/dev/sdb1` backup device was absent on 2026-10-21; its stale fstab entry was disabled, with the original saved under `/var/backups/homelab-upgrade-20261021/`. The existing PVC and PV path are preserved; `slow-storage` is a legacy class name for this PV. MongoDB backups remain suspended while MongoDB is disabled.

## Schedule

| Database | Time | Retention |
|----------|------|-----------|
| PostgreSQL | 2:00 AM daily | 7 days |
| MongoDB | 3:00 AM daily | 7 days |

## Configuration

### PostgreSQL Backup
| Setting | Value |
|---------|-------|
| **Image** | `postgres:18.6` |
| **Method** | `pg_dumpall` (compressed) |
| **Storage** | 20Gi PVC (legacy `slow-storage`, Orange Pi SSD) |
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

PostgreSQL dumps use bounded connection/lock/statement waits, private file permissions, and an atomic rename after gzip verification. Failed dumps never publish a final archive or prune older backups; stderr remains in pod logs. Before database upgrades, restore into an isolated PostgreSQL instance, never the production instance.
