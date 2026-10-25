# Homelab maintenance receipt — 2026-10-25

Times below are UTC. Application changes use the existing Flux `main` source.
Kubernetes 1.35.9, containerd 2.2.10, Calico 3.33.0/operator 1.44.0, and
Traefik 3.7.16 were already deployed when this maintenance began.

## Application upgrades

| Application | Previous | Deployed | Verification |
|---|---|---|---|
| Prometheus | 3.15.0 | 3.15.1 | Deployed; Helm release Ready, all 25 targets up |
| Homepage | 2.6.0 | 2.7.0 | Deployed; packaged version and Node 24.22.1 checked |
| n8n | 2.44.5 | 2.44.6 stable | Deployed; readiness 200, saved state unchanged |
| Alloy | 1.21.0 | 1.21.2 | Deployed; binary version and native configuration validation pass |
| Open WebUI | 0.12.3 | 0.12.4 | Deployed; API version, HTTPS/assets, PostgreSQL backend and 2 users/435 chats verified |
| OpenClaw | 2026.10.5 | 2026.10.7 | Deployed; migration exit 0, policies unchanged, HTTPS/CSP/WebSocket checks pass |
| Paperclip | 2026.1012.0 | 2026.1023.0 | Deployed; 332 migrations applied, zero pending, original configuration and data preserved |

Targets came from official stable release metadata and registry manifests.
Homepage, n8n, and the three larger application images have explicit digest
pins. Existing Helm charts are retained for Prometheus and Alloy, with their
application image overrides updated. Images are staged before replacing serving
instances. Disabled applications remain disabled, including the three retained
zero-replica workloads Hermes, Qdrant, and Phoenix.

Release sources: [Prometheus](https://github.com/prometheus/prometheus/releases/tag/v3.15.1),
[Homepage](https://github.com/gethomepage/homepage/releases/tag/v2.7.0),
[n8n](https://github.com/n8n-io/n8n/releases/tag/n8n%402.44.6),
[Alloy](https://github.com/grafana/alloy/releases/tag/v1.21.2),
[Open WebUI](https://github.com/open-webui/open-webui/releases/tag/v0.12.4),
[OpenClaw](https://github.com/openclaw/openclaw/releases/tag/v2026.10.7),
[Paperclip](https://github.com/paperclipai/paperclip/releases/tag/v2026.1023.0).
Prometheus and Open WebUI explicitly document security fixes. The intervening
OpenClaw 2026.10.6 release requires the patched Node runtime shipped in its
official images.

## Monitoring repairs

Ready Pods and an empty alert list initially hid a failed Pi node-exporter
target. Its endpoint returned HTTP 503, "Limit of concurrent requests reached
(40)". The native goroutine profile showed all 40 scrapes waiting inside
`cpuFreqCollector.Update` / `procfs.SystemCpufreq`, with waits over five days.
The existing Helm subchart now passes `--no-collector.cpufreq`. Both exporters
return HTTP 200 and retain CPU usage, memory, disk, thermal, and network metrics;
CPU-frequency metrics are intentionally omitted on both nodes. `NodeExporterDown`
alerts after five minutes of failed scrapes using the actual namespace/service
labels. Native `promtool check rules` validates all ten rules.

Renewed scrapes also exposed a Calico controller metrics timeout. The controller
served metrics locally, but its operator-managed `calico-system` policy tier
allowed only the separate `tigera-prometheus` installation. A separate GitOps
policy now permits TCP 9094 from the exact existing Prometheus server labels in
`apps`. Operator policies and their default-deny remain intact. Prometheus can
scrape successfully; Homepage remains blocked. All 25 targets recovered.

## Recovery and state preservation

- A fresh run of the existing PostgreSQL backup CronJob completed at 11:41:27.
  Archive: `/mnt/backup/postgres/postgres_backup_20261025_113850.sql.gz`,
  409,326,122 bytes, SHA-256
  `7027250b3180e8d7f54b6d7a8a6dafc3426bb448dca1fb19aac59c0e8be56857`.
  All 14 databases restored successfully in a disposable PostgreSQL 18.6 Job
  with read-only backup access, empty temporary storage, no service-account
  token, deny-all networking, and a Unix-socket-only database listener.
  Open WebUI's restored database matched production at 2 users and 435 chats.
  Write-sync overhead was disabled only in that disposable test instance.
  The temporary restore/backup Jobs and isolation policy were removed; the
  recovery archive and normal CronJob remain.
- Private worker directory `/var/backups/homelab-upgrade-20261025/` holds a
  consistent n8n SQLite backup plus Homepage/Open WebUI file archives. SQLite
  integrity passes. After upgrading n8n, all 29 workflow IDs and activation
  flags, all ten credential rows, and the user row exactly match the backup.
  File archives are recovery copies, not atomic filesystem snapshots.
- OpenClaw's native `backup create --verify` produced a mode-0600 archive,
  1,425,670,607 bytes, at
  `/home/user/.openclaw/upgrade-20261025/before-2026.10.7.tar.gz` on its PVC.
  Native creation must write outside the state tree; the verified archive was
  then moved into the private PVC directory.
- Paperclip's existing upgrade operator was reused under
  `/paperclip/upgrade-2026-10-25-2026.1023.0/`. Its native SQL backup was restored
  into a temporary isolated database, and configuration fingerprints matched.
  A separate protected file archive and the original column/row snapshots
  support post-migration comparisons. Preflight confirmed no active runs,
  both routines paused, and the exact unchanged telemetry dependency versions.
  Human memberships are four owners; the 46 legacy `member` memberships belong
  to agents. There are no budget policies. The new Operator defaults and
  default blocking of unpriced budgets therefore do not change existing human
  Operator access or budget policies here.

These are homelab upgrade recovery points. Paperclip/OpenClaw archives remain
on their application volumes; they do not establish off-node disaster recovery.
A schema downgrade requires restoring compatible database/files, not just
reverting an image. No RTO/RPO is claimed.

## Paperclip migration verification

Paperclip build `v2026.1023.0-0-g1b4c80381` runs as UID 1000 on Node 24.22.1,
with authenticated/private exposure. All eight business table counts match:
4 companies, 44 agents, 42 issues, 8 projects, 2 routines, 14 connections,
13 grants, and 48 installations. All original agent settings, models,
connection identities, repository access lists, and grant scopes are preserved.
There are zero active/queued/retry runs and both routines remain paused.

The original strict configuration receipt remains on the PVC and records two
expected representation differences. The cost migration changes
`spent_monthly_cents` from integer to numeric, so the JavaScript driver returns
strings. Exact PostgreSQL numeric comparisons verified all 44 amounts unchanged.
GitHub refresh adds `ownerType` to 496 cached repository entries, derived from
GitHub's existing owner classification in `tool-access.ts`. Each of four grants
retains the same ordered 124 repository identities and every original field.
The separate runnable `verify-qualified.mjs` asserts exact numeric equality,
permits only that validated additive descriptor, and then compares every
original protected configuration field. It passes, as does native migration
inspection: `upToDate`, 332 applied, zero pending. The private
`qualified-verification.json` and metadata-only diagnosis receipts preserve this
qualification without overwriting the original strict receipt or backups.

## Capacity and validation

Only reviewed superseded image versions were removed after comparing their
identities with every running container. Persistent application files and
recovery archives were retained. CRI removals require the `120s` timeout syntax;
the default timeout can expire after removal has already started. The unchanged
storage warning uses available blocks, rather than `df`'s percentage.

Large pulls were interrupted by containerd's five-minute CRI no-progress
deadline. Temporary `containerd.io/gc.root` labels on the exact target indexes
retained completed layers. Paperclip used native `ctr images pull --local`,
followed by a cached `crictl pull` to register the canonical reference with
Kubernetes. Runtime configuration was unchanged. All three temporary content
roots were removed after successful deployment; content-label removal uses an
empty value (`containerd.io/gc.root=`), not kubectl's trailing-dash syntax.

Transient API-server and Calico probe warnings occurred in the disk-intensive
restore/staging window. The API-server restart count remained zero and its full
readiness check recovered. The disposable restore's write-sync overhead was
disabled without changing production durability settings. Final stability
results below distinguish current health from these historical events.

Full Kustomize rendering, server dry runs, native Prometheus/Alloy validators,
and the existing backup, paused-services, Homepage inventory, storage-exporter,
and Paperclip lock checks pass. The unrelated pre-existing edits to
`.claude/settings.json`, `.cursor/hooks/trail-hooks.cjs`, and `.trail/hook.cjs`
are excluded. `trail check` reports a conflict in that pre-existing Claude
permission change; upgrade commits explain the exclusion.

The final documentation diff also produces lexical Trail matches against
historical lessons (Ready Pods/alerts, repository tags, write modes, backup
deadlines, and certificate timeouts). These are documented false positives:
the receipt verifies every Prometheus target and live application versions;
it does not rely on Pod readiness or tags alone. Permission settings are
unchanged, production SQL probes are read-only, restores target temporary
isolated databases, backup deadlines were not raised to address a missing
disk, and kubeadm/etcd certificates or TLS settings were not changed. The
follow-up audit commit records this rationale without weakening the checks.

OpenClaw's staged image independently verified Node 24.22.1 and the two
unchanged CSP bootstrap hashes. The existing migration init container exited
successfully, and the new Pod reached 2/2 Ready with zero restarts. Gateway,
agent, channel, model-routing, tool, skill, and approval configuration hashes
match the private pre-upgrade baseline. Production HTTPS and frontend assets
return 200, the WebSocket route returns 101, and fresh Pi-workload DNS and
cross-node PostgreSQL TCP connectivity pass.

Open WebUI 0.12.4 reports its expected version through the live API, retains
the 2 users/435 chats and existing Alembic revision `0bd252b206fb`, and has
four client connections to its active PostgreSQL database. Production HTTPS
and its JavaScript bundle return 200.

## Final stability observation

Observed from **13:00:55 to 13:09:13 UTC** (8 minutes 18 seconds): the same
**56 workload Pods remained Ready**, with **zero increasing restart counters**
and **no new Warning events**. Both nodes were Ready and schedulable, with
NetworkUnavailable, MemoryPressure, DiskPressure, and PIDPressure false.
All 18 PVCs were Bound. The Flux source, two Kustomizations, and four Helm
releases were Ready. All four Calico status resources were available and
not progressing or degraded. The API server's complete readiness check passed.

Prometheus reported **25/25 targets up and no pending or firing alerts**.
Loki contained 132 recent application entries in the sampled minute. Alloy's
first-observed `ingester_error` drop counter remained at 171,107 while sent
entries rose from 211,085 to 229,621; the other drop reasons stayed zero.
Current delivery was verified separately from these retained counters.

The worker finished at **68% used / 36 GiB available** by `df`, with the
alert's reserved-block-aware measurement at **69.17%**, below the unchanged
70% threshold. The Pi had 267 GiB available and measured 41.65% used by the
same exporter. Capacity still merits routine monitoring on the 117 GiB worker
filesystem. Node CPU/memory snapshots were 6%/43% on the Pi and 23%/46% on
the worker.

Production HTTPS, frontend JavaScript, OpenClaw's single CSP header and both
bootstrap hashes, and Paperclip's anonymous-company HTTP 403 check pass.
OpenClaw and Open WebUI WebSocket transport handshakes return HTTP 101.
HTTPS probes explicitly accepted the existing homelab self-signed-certificate
policy. Fresh Pi-to-worker PostgreSQL TCP and worker-to-Pi Paperclip HTTP
checks pass, including DNS. Verification did not invoke a model or start an
agent task. No temporary restore/check workloads, isolation policies, active
image transfers, or maintenance content roots remain.

The final full Kustomize build and the five regression scripts used for this
maintenance pass.
The Paperclip lock check now discovers the versioned recovery directory made
by the current manifest instead of hardcoding the prior release; legacy
evidence, SQLite inodes, safe reruns, and collision refusal remain checked.
The Trail graph was rebuilt after this one-line test change. All seven
application updates were committed and deployed through Flux; the final
documentation/check commit does not change running application manifests.
