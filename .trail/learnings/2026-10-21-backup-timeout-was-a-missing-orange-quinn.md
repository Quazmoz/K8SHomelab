---
title: "Backup timeout was a missing Orange Pi disk, use the SSD recovery path"
author: Quinn
date: 2026-10-21
branch: main
touches:
  - apps/base/backups/AI_CONTEXT.md
  - apps/base/backups/README.md
  - apps/base/backups/postgres-backup-cronjob.yaml
  - apps/base/local-storage/AI_CONTEXT.md
  - apps/base/local-storage/README.md
  - apps/base/local-storage/storage.yaml
  - scripts/test_postgres_backup.py
---

## Decided
On 2026-10-21, a fresh PostgreSQL backup Job failed to mount /mnt/backup/postgres. The fstab entry targeted /dev/sdb1, but that block device was absent and /mnt/backup was an empty directory on the root filesystem. Preserve the existing PV/PVC and path; create a mode-0700 directory on the Orange Pi SSD, disable the absent-device fstab entry, and keep the original fstab under /var/backups/homelab-upgrade-20261021/. This remains a different node from the production database. The slow-storage class name is now historical for PostgreSQL backups.

## Tried and ruled out
Increasing the one-hour Job deadline would not fix FailedMount. The database was accepting connections and had no stuck dump query. Do not invent a device, format a disk, recreate the PV/PVC, or mount a replacement disk over the new backups without migration. The backup script now keeps stderr out of SQL, uses private partial files and atomic publication, verifies gzip, and retains older recovery points on dump failure. scripts/test_postgres_backup.py checks those failure and success paths.

## Watch out
The live PostgreSQL resource remains StatefulSet/postgres with pod postgres-0. Trail check's lexical matches on the words PostgreSQL/postgre/sql are false positives against the earlier learning about a mistaken Deployment lookup; these manifest and documentation changes do not convert the StatefulSet or repeat that mistake. The unrelated .claude/settings.json modification is user work and must not be committed with these changes. Restore checks must use an isolated PostgreSQL instance and keep sensitive dump contents within the cluster.
