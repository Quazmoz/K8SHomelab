"""Small read-only check for the ConfigMap's real storage walk."""
import os
import tempfile
import unittest
from pathlib import Path


MANIFEST = Path(__file__).resolve().parents[1] / 'apps/base/growth-os-storage/manifests.yaml'
lines = MANIFEST.read_text().splitlines()
start = lines.index('  exporter.py: |') + 1
end = lines.index('---', start)
script = '\n'.join(line[4:] for line in lines[start:end]) + '\n'

class StorageExporterTest(unittest.TestCase):
    def test_allocated_bytes_do_not_follow_symlinks_or_double_count_hardlinks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'n8n-data-pvc'
            root.mkdir()
            (root / 'data').write_bytes(b'x' * 5000)
            os.link(root / 'data', root / 'hardlink')
            (root / 'symlink').symlink_to('/etc')
            os.environ['VOLUMES'] = 'n8n-data-pvc'
            os.environ['DATA_ROOT'] = directory
            namespace = {'__name__': 'test_exporter'}
            exec(compile(script, str(MANIFEST), 'exec'), namespace)
            measured = namespace['allocated_bytes'](str(root))
            self.assertGreaterEqual(measured, 8192)
            self.assertLess(measured, 20000)
            self.assertRaises(OSError, namespace['allocated_bytes'], str(root / 'missing'))

if __name__ == '__main__':
    unittest.main()
