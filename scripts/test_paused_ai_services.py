"""Guard against accidentally pruning temporarily paused Qdrant/Phoenix resources."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APPS = ROOT / "apps/base"


class PausedAiServicesTest(unittest.TestCase):
    def test_gitops_keeps_both_resources_but_stops_pods(self):
        manifest = (APPS / "kustomization.yaml").read_text()
        for app in ("qdrant", "phoenix"):
            with self.subTest(app=app):
                self.assertRegex(manifest, rf"(?m)^  - \./{app}(?:\s+#.*)?$")
                counts = re.findall(
                    rf"(?m)^  - name: {app}\n    count: ([0-9]+)$",
                    manifest,
                )
                self.assertEqual(counts, ["0"])

    def test_component_manifest_still_preserves_persistent_storage(self):
        for app in ("qdrant", "phoenix"):
            with self.subTest(app=app):
                resources = (APPS / app / "kustomization.yaml").read_text()
                self.assertIn(f"  - {app}-pvc.yaml", resources)
                deployment = (APPS / app / f"{app}-deployment.yaml").read_text()
                self.assertRegex(deployment, r"(?m)^  replicas: 1$")

    def test_flux_has_pruning_enabled(self):
        flux = (ROOT / "clusters/my-homelab/apps.yaml").read_text()
        self.assertRegex(flux, r"(?m)^  prune: true$")


if __name__ == "__main__":
    unittest.main()
