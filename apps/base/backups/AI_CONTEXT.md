# AI Context: Database Backups

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Automated daily CronJob backups for PostgreSQL and MongoDB. Provides disaster recovery capability with 7-day retention.

## Architecture

- **Type:** CronJobs (2)
- **Namespace:** `apps`
- **Node:** `orangepi6plus` (both, with control-plane toleration)
- **Storage:** `slow-storage` class (SD card on Orange Pi)

### PostgreSQL Backup
- **Image:** `postgres:15`
- **Schedule:** `0 2 * * *` (daily 2 AM)
- **Method:** `pg_dumpall` compressed
- **Storage:** 20Gi PVC (`postgres-backup-pvc`)
- **Retention:** 7 days

### MongoDB Backup
- **Image:** `mongo:8`
- **Schedule:** `0 3 * * *` (daily 3 AM)
- **Method:** `mongodump` + tar.gz
- **Storage:** 20Gi PVC (`mongodb-backup-pvc`)
- **Retention:** 7 days

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `postgres-backup-cronjob.yaml` | PG CronJob + PVC |
| `mongodb-backup-cronjob.yaml` | Mongo CronJob + PVC |

## Dependencies

- **Depends on:** PostgreSQL (source for pg_dumpall), MongoDB (source for mongodump), local-storage (backup PVs)
- **Depended on by:** Nothing

## Modification Notes

- Backup PVCs use `slow-storage` class — physically on Orange Pi SD card
- Both jobs have 1-hour timeout (`activeDeadlineSeconds: 3600`)
- Retention cleanup is part of the job script (deletes files older than 7 days)
- PostgreSQL backup uses `postgres-credentials` secret for connection
- MongoDB backup connects without auth (no auth enabled on MongoDB)
- Control-plane toleration required because backups run on the control plane node
