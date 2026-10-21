# AI Context: Database Backups

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Automated daily CronJob backups for PostgreSQL and MongoDB. Provides disaster recovery capability with 7-day retention.

## Architecture

- **Type:** CronJobs (2)
- **Namespace:** `apps`
- **Node:** `orangepi6plus` (both, with control-plane toleration)
- **Storage:** legacy `slow-storage` class; PostgreSQL uses the Orange Pi SSD at `/mnt/backup/postgres` after the former backup disk disappeared on 2026-10-21

### PostgreSQL Backup
- **Image:** `postgres:18.6`
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

- Preserve the backup PV/PVC and path. PostgreSQL now uses the Orange Pi root SSD, separate from the database node; the missing `/dev/sdb1` fstab entry is disabled. MongoDB remains suspended.
- Both jobs have 1-hour timeout (`activeDeadlineSeconds: 3600`)
- Retention cleanup is part of the job script (deletes files older than 7 days)
- PostgreSQL backup uses `postgres-credentials` secret for connection
- MongoDB backup connects without auth (no auth enabled on MongoDB)
- Control-plane toleration required because backups run on the control plane node

- PostgreSQL publishes only verified complete gzip archives using an atomic rename and mode 0600; pipefail preserves dump errors and stderr stays outside SQL. Connection/lock/statement timeouts bound database waits. Restore verification must use an isolated instance.
