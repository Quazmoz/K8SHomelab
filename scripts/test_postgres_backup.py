"""Run with python3 scripts/test_postgres_backup.py; no database required."""
import gzip
import os
from pathlib import Path
import subprocess
import tempfile
import textwrap
import time

manifest = (Path(__file__).resolve().parents[1] / "apps/base/backups/postgres-backup-cronjob.yaml").read_text()
script = textwrap.dedent(manifest.split("            - |\n", 1)[1].split("            resources:", 1)[0])

for fail in (False, True):
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        (root / "bin").mkdir()
        (root / "backup").mkdir()
        for name, body in {
            "pg_isready": "exit 0",
            "pg_dumpall": "echo 'SELECT 1;'; echo 'diagnostic only' >&2; exit " + ("1" if fail else "0"),
        }.items():
            command = root / "bin" / name
            command.write_text("#!/bin/sh\n" + body + "\n")
            command.chmod(0o755)
        old = root / "backup/postgres_backup_old.sql.gz"
        old.write_bytes(b"preserve the previous recovery point on failure")
        os.utime(old, (time.time() - 10 * 86400,) * 2)
        env = dict(os.environ, PATH=str(root / "bin") + os.pathsep + os.environ["PATH"],
                   PGHOST="unused", PGPORT="5432", PGUSER="unused",
                   BACKUP_DIR=str(root / "backup"), RETENTION_DAYS="7")
        result = subprocess.run(["bash", "-c", script], env=env, capture_output=True, text=True)
        archives = [p for p in (root / "backup").glob("*.sql.gz") if p != old]
        assert not list((root / "backup").glob(".postgres_backup.*"))
        if fail:
            assert result.returncode != 0 and not archives and old.exists(), result
        else:
            assert result.returncode == 0 and len(archives) == 1 and not old.exists(), result
            assert gzip.decompress(archives[0].read_bytes()) == b"SELECT 1;\n"
            assert archives[0].stat().st_mode & 0o777 == 0o600
print("PostgreSQL backup checks passed: atomic publication, private permissions, stderr isolation, failure preservation.")
