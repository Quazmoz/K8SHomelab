#!/usr/bin/env python3
"""Check the deployed lock migration preserves legacy evidence and SQLite inodes."""
from pathlib import Path
import subprocess
import tempfile
import textwrap

manifest = Path(__file__).resolve().parents[2] / "apps/base/paperclip/paperclip.yaml"
source = manifest.read_text()
start = source.index("          # Recreate has stopped the old instance;")
stop = source.index("          if ! test -f /paperclip/otel/", start)
script = textwrap.dedent(source[start:stop])

with tempfile.TemporaryDirectory(prefix="paperclip-lock-check-") as directory:
    volume = Path(directory)
    locks = volume / "instances/default/locks/directory-merge"
    locks.mkdir(parents=True)
    legacy = locks / ("a" * 64 + ".lock")
    legacy.mkdir()
    (legacy / "owner.json").write_text('{"pid":123}')
    sqlite = locks / ("b" * 64 + ".lock.sqlite")
    sqlite.write_bytes(b"preserve this lock inode")
    inode = sqlite.stat().st_ino
    command = ["sh", "-ec", script.replace("/paperclip/", str(volume) + "/")]
    subprocess.run(command, check=True)
    preserved = volume / "upgrade-2026-10-13-2026.1012.0/legacy-locks" / legacy.name
    assert not legacy.exists() and (preserved / "owner.json").read_text() == '{"pid":123}'
    assert sqlite.stat().st_ino == inode and sqlite.read_bytes() == b"preserve this lock inode"
    subprocess.run(command, check=True)  # An unchanged rerun is safe.
    legacy.mkdir()
    (legacy / "owner.json").write_text('{"pid":456}')
    assert subprocess.run(command, capture_output=True).returncode != 0
    assert (legacy / "owner.json").read_text() == '{"pid":456}'
    assert (preserved / "owner.json").read_text() == '{"pid":123}'

print("Paperclip upgrade lock checks passed")
