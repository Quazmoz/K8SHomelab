---
title: "Large homelab upgrades: pin staged images and qualify Paperclip metadata"
author: Quinn
date: 2026-10-25
branch: main
touches:
  - apps/base/paperclip/README.md
  - scripts/paperclip/test-upgrade-locks.py
  - docs/CLUSTER_HEALTH_2026-10-25.md
---

## Decided
For the 2026-10-25 maintenance, official stable releases were staged before Flux replacement. Containerd canceled a slow OpenClaw pull after five minutes without progress. Temporarily label exact target content indexes containerd.io/gc.root=<timestamp> to retain completed layers; native ctr images pull --local avoids the CRI progress deadline. After a native pull, run cached crictl pull to register the canonical image reference with Kubernetes. Remove temporary content labels with an empty value (containerd.io/gc.root=), not a trailing dash. Preserve permanent sandbox pins.

Paperclip 2026.1023.0 passed native restore, 332 applied migrations/zero pending, and preservation checks. Its numeric cost migration changes JavaScript values from numbers to strings: compare money exactly using PostgreSQL numeric equality, never ignore amounts or round through floats. GitHub adds repository ownerType metadata derived from the existing owner classification. All original repository identities, access lists, grants, and configuration fields matched after qualifying only that additive descriptor. Keep the original strict receipt and a separate qualified receipt. Preflight must distinguish human and agent legacy member roles, and check budget policies.

## Tried and ruled out
Ready Pods and absent alerts missed broken monitoring; inspect every Prometheus target. Calico's system tier permits only tigera-prometheus by default, so add a separate same-tier metrics-only exception for the actual Prometheus namespace and labels; do not edit operator policies or broaden access. Increasing scrape concurrency would not fix the Pi cpufreq hang.

The existing Paperclip backup operator also needs separately captured protected columns/rows. Verify their fingerprints against the restored backup before using them. Its lock test hardcoded an old upgrade directory; locate the recovery directory actually created by the manifest, retaining inode, idempotence, and collision checks.

## Watch out
Keep recovery contents on the nodes. Full restore tests use disposable storage, denied networking, a Unix-socket listener, and may disable fsync only in that temporary instance to reduce I/O. Transient API/Calico probe warnings were observed in the I/O-intensive window without API-server restarts; this is correlation, not a proven cause. Final observation must verify recovery and no recurrence. Reclaim only superseded unused image caches, leaving application data and archives intact. Worker storage remains close to its unchanged 70 percent warning. See docs/CLUSTER_HEALTH_2026-10-25.md for the final receipt.
