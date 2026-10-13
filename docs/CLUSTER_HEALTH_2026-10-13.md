# Homelab health and Paperclip upgrade — 2026-10-13

**Fact:** A LAN ingress fault was found and repaired through GitOps. Paperclip was upgraded from `2026.1005.0` to the latest stable `2026.1012.0`. Final checks show both Kubernetes nodes Ready, all 56 active pods Ready, and both Flux Kustomizations plus all four Helm releases Ready.

## Ingress fault and repair

**Fact:** Before repair, the Mac could not resolve ARP for `192.168.8.40` and HTTPS to the ingress IP timed out. MetalLB `ServiceL2Status` selected `quinn-hpprobook430g6`; that node's LAN interface is Wi-Fi `wlp2s0`. The Mac also could not connect to the worker's ingress NodePort. The same HTTPS request through the Pi's NodePort returned 200, proving that the ingress backend path worked.

**Inference:** Wi-Fi peer isolation or ARP filtering explains the failed external path. Router policy was not inspected or changed. A request to a LoadBalancer IP from a cluster node can take the CNI path and does not establish working external ARP advertisement; see the upstream [MetalLB troubleshooting guide](https://metallb.io/troubleshooting/).

**Fact:** Commit `1d37303` restricts `L2Advertisement/example` to `orangepi6plus` and wired interface `enp97s0`, and adds the supported speaker flag `--ignore-exclude-lb` for kubeadm's control-plane exclusion label. Oracle exclusions, the address pool, and ingress `externalTrafficPolicy: Cluster` remain intact. The built pinned MetalLB overlay passed server-side dry-run validation and the installed speaker's help confirmed flag support. Both speakers completed rollout; live `ServiceL2Status` now reports `orangepi6plus` / `enp97s0`.

**Fact:** From the external Mac, the normal `https://paperclip.k8s.local/api/health` request resolves to `192.168.8.40` and returns 200. The UI and `/assets/index-xCoSuYwt.js` also return 200; unauthenticated `/api/companies` returns 403. Grafana's ingress health returns 200. n8n redirects HTTP to HTTPS, and its HTTPS health endpoint returns 200. The existing Paperclip hosts entry is correct; a local DNS cache flush was performed without changing hosts mappings or VPN/router configuration.

The pool currently has one eligible wired announcer. Another announcer requires a verified wired interface and an external LAN reachability check. The updated [MetalLB README](../apps/base/metallb-system/README.md) and [AI context](../apps/base/metallb-system/AI_CONTEXT.md) record this policy.

## Remaining cluster checks

**Fact:** API server `/readyz?verbose`, including etcd readiness, passes. Both nodes report no memory, disk, PID, or network pressure. Observed CPU/memory were 5%/44% on the Pi and 22%/51% on the HP worker. The Pi had 291 GiB filesystem space available; the worker had about 36 GiB. Cluster DNS resolved Kubernetes and Paperclip services from n8n, and the worker-to-Pi Paperclip health request returned 200.

**Fact:** Large historical restart counts remain visible. The previous source-controller log classified `no route to host`; its latest restart was on 2026-10-12, and current reconciliation passes. These counters were not reset. One Paperclip startup-probe warning records connection refusal during new-process initialization; startup completed, the pod is Ready, and its restart count is zero. MongoDB backup is intentionally suspended; the active PostgreSQL backup schedule last ran overnight.

## Paperclip upgrade verification

**Fact:** Commit `d4999a1` pins the official [2026.1012.0 release](https://github.com/paperclipai/paperclip/releases/tag/v2026.1012.0), published 2026-10-12. OCI provenance matches `bba6a45f0d364cfd962ac59b3bdf2426a8222adb`. The index digest is `sha256:1661b3dd3fdf7a9b59542d1ced464c3faf9dc8309798b4d15a9923ed32795307`; Linux ARM64 digest is `sha256:f40c29335cf2ff74dbbdd86ef0a2cb067bbadc1129058eb8c90bb0b6bef13c31`. The image was cached before rollout, and the runtime reports `v2026.1012.0-0-gbba6a45f0` with 304 migrations applied.

**Fact:** The native 4,049,616-byte database backup was restored into a temporary database and compared successfully. The 14,845,600-byte persistent-files archive also passed integrity listing. Backups and private snapshots remain on the existing PVC at `/paperclip/upgrade-2026-10-13-2026.1012.0/`; no credentials or business records were exported. This recovery point shares the deployment's disk.

**Fact:** The instance had zero active/queued/scheduled-retry runs and two paused routines. `Recreate` stopped old writers before startup. The new init step preserves legacy directory-lock evidence and leaves permanent SQLite files/inodes unchanged. `python3 scripts/paperclip/test-upgrade-locks.py` passes migration, unchanged-rerun, inode preservation, and collision checks. It follows the upstream [workspace lock migration requirements](https://raw.githubusercontent.com/paperclipai/paperclip/v2026.1012.0/doc/workspace-restore-locks.md).

**Fact:** Verification at `2026-10-13T07:58:58.290Z` confirmed unchanged protected configuration and counts: 3 companies, 34 agents, 20 issues, 4 projects, 2 routines, 9 connections, 9 grants, and 18 installations. All 7 Claude agents use `claude-opus-5-5`; all 11 Codex agents use `gpt-6.1-sol`. Exact original column sets are compared, excluding diagnosed GitHub webhook/cache timestamps and access revision plus connection health-check timestamps. Repository access lists, account identity, credentials, scopes, health states, model/effort settings, budgets, reporting, and permissions remain checked. The original backup and metadata-change history are retained separately.

**Fact:** Native strict connection selection passes for all 18 subscription agents. All 7 AI connections are healthy, all 9 grants active, and one tool integration remains `unchecked` as it was before upgrade. Organization verification passes; the existing synthetic Claude reconnect tests pass against the new native runner with no provider calls. No task or marketing workflow was started. Full ACP task/file-collection and new-model inference on this image were not tested.

Receipts: `backup-manifest.json`, `pre-upgrade-snapshot.json`, `metadata-change-diagnosis.json`, `verified.json`, and `connections-verified.json` in the protected upgrade directory. Deployment policy and rollback constraints are in the [Paperclip README](../apps/base/paperclip/README.md).
