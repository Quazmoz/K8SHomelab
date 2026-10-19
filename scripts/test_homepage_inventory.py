"""Regression guard: Homepage lists paused services even when GitOps excludes them."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "apps/base/homepage/manifests.yaml"
APPS = ROOT / "apps/base/kustomization.yaml"
PAUSED = {
    "LLaMA Factory": "llamafactory",
    "FreshRSS": "freshrss",
    "LibreChat": "librechat",
    "Jenkins": "jenkins",
    "Mongo Express": "mongo-express",
}


class HomepageInventoryTest(unittest.TestCase):
    def test_paused_cards_remain_listed_and_monitored(self):
        manifest = MANIFEST.read_text()
        services = manifest.split("  services.yaml: |-", 1)[1].split(
            "\n  widgets.yaml: |", 1
        )[0]
        for name in (*PAUSED, "Hermes"):
            with self.subTest(service=name):
                matches = list(re.finditer(
                    rf"(?m)^        - {re.escape(name)}:\n", services
                ))
                self.assertEqual(len(matches), 1, f"{name} must remain visible")
                start = matches[0].end()
                tail = services[start:]
                boundary = re.search(r"(?m)^(?:        - |    - )", tail)
                card = tail[:boundary.start()] if boundary else tail
                self.assertIn("description: Paused", card)
                self.assertIn("href:", card)
                self.assertIn("siteMonitor:", card)

    def test_paused_labels_match_desired_gitops_state(self):
        config = APPS.read_text()
        for name, path in PAUSED.items():
            with self.subTest(service=name):
                self.assertRegex(
                    config, rf"(?m)^#\s*-\s+\./{re.escape(path)}\b"
                )
        self.assertRegex(
            config, r"(?m)^  - name: hermes-agent\s*\n    count: 0\s*$"
        )


if __name__ == "__main__":
    unittest.main()
