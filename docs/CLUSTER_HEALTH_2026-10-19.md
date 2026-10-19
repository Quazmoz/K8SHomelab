# Homelab resource investigation — 2026-10-19

The initial read-only investigation began at approximately 17:23 UTC /
18:23 BST. No workloads were changed during that pass. The subsequently
authorized upgrade and its verification are recorded below. This receipt
contains operational summaries, not task content, credentials, or raw
application logs.

## Finding

**Inference:** OpenClaw explains most of the additional Orange Pi CPU usage.
At initial inspection its container consumed approximately 1.04 cores, compared with about
0.016 cores in the available hourly samples from October 14–17: roughly 65
times its earlier usage. One additional core on this 12-core node accounts
for approximately 8 percentage points of node CPU, consistent with the
observed increase from about 9–10% to 18–19%.

**Fact:** The HP worker's node CPU is close to its recent baseline. Paperclip
and Context Forge consume substantial resources, but neither shows a new CPU
increase in the sampled history.

## Resource evidence

Receipts: live `kubectl top nodes`, `kubectl top pods -A --containers
--sort-by=cpu`, and the Prometheus queries below, through the Kubernetes API
service proxy for `apps/prometheus-server:80`.

| Workload | Initial observation | Available earlier observations | Classification |
| --- | --- | --- | --- |
| OpenClaw | About 1.04 CPU cores and 2.1 GiB working-set memory | October 14–17: about 0.016 cores and 1.2 GiB memory | Fact |
| Paperclip | About 0.33 CPU cores averaged over five minutes; 1.7 GiB memory | October 14–17: daily sampled means of 0.35–0.40 cores; 2.8–3.5 GiB memory | Fact |
| Context Forge | About 0.048 CPU cores and 2.2 GiB memory | October 14–17: about 0.045–0.046 cores and 2.2–2.3 GiB memory | Fact |
| Orange Pi | Approximately 18–20% CPU; `kubectl top` memory 6,921 MiB / 45% | Available earlier node samples: about 9–10% CPU | Fact |
| HP worker | Approximately 27–31% CPU; `kubectl top` memory 9,119 MiB / 57% | October 14–17: daily sampled means of about 28–29% CPU | Fact |

**Fact:** Historical monitoring is incomplete, including missing October 18
samples in these queries. Earlier figures describe the available samples,
not a continuous measurement across the outage. The instantaneous Paperclip
CPU reading briefly reached 812m; its five-minute and longer averages are
lower. Node-exporter memory based on `MemAvailable` reports approximately
41–43% used; that is a different calculation from kubelet working-set memory.

## OpenClaw abnormal worker and repeated fetch failures

**Fact:** At 17:24 UTC, `ps -eo pid,ppid,pcpu,pmem,rss,etime,comm` inside
`openclaw-6fdc9fcd99-lhpp6`, container `openclaw`, showed the gateway process
averaging about 97% of one CPU over its approximately five-hour lifetime.
`ps -L -p 7 -o pid,tid,pcpu,time,comm` identified worker thread 230 averaging
88.3%, with approximately 4 hours 29 minutes of CPU time. Prometheus hourly
samples since startup show sustained usage near one core.

**Fact:** A 15-minute operational log sample contained 55 repetitions of
`Failed to fetch OpenRouter models: This operation was aborted`, tagged
`openrouter-model-capabilities`. In the installed image, the warning is
emitted at `/app/dist/provider-stream-C5PabBup.mjs:420`, in the model catalogue
fetch error handler. The image remains `2026.9.5-arm64`.

**Hypothesis:** A busy or stuck background worker is responsible for the CPU
regression. The repeated catalogue-fetch failures are a related diagnostic
lead; these observations do not establish that the fetch failures cause the
worker's CPU consumption. No live CPU profile or configuration change was
performed.

**Hypothesis / next test:** Preserve this receipt, then perform an
operator-authorized bounded OpenClaw restart and compare five-minute CPU and
memory with the October 14–17 baseline. If usage remains high or recurs,
profile the busy worker and investigate catalogue-refresh retry behavior
before choosing a configuration or image change. A restart alone would not
establish the underlying defect.

## Paperclip background activity

**Fact:** Aggregate SQL ran in an explicit read-only transaction against
Paperclip's existing embedded database. There were zero `queued`, `running`,
or `scheduled_retry` heartbeat runs. Both routines were paused. The existing
run totals were 57 succeeded, 17 failed, 3 cancelled, 6 interrupted, and 1
timed out; these are historical totals, not current active work.

**Fact:** A 15-minute log sample contained 585 successful workspace Git scans
across two workspace hashes. All had `queuedCount: 0`, `activeCount: 1`,
`cacheHit: false`, and successful exit outcomes. Mean execution time was
33 ms, maximum 88 ms. The same interval contained 30 setup-token lease
cleanup failure warnings.

**Fact:** The installed `/app/server/src/services/setup-token-session.ts:320`
onward retains cleanup records after lease-release/removal failures and
retries them on later sweeps. Its catch block at line 346 omits the underlying
exception from the warning, so the specific cause is not established here.
Paperclip's own automatic embedded-database backup completed successfully
during this investigation; it is separate from the failing shared-Postgres
CronJob below.

**Inference:** Paperclip has repetitive housekeeping activity and a cleanup
failure worth investigating. The sampled queues and run counts do not show a
stuck agent execution or a growing Git-scan backlog, and its CPU consumption
does not explain today's increase.

## Other findings

- **Fact:** Both nodes are Ready, with no memory, disk, PID, or network
  pressure. All 54 Running pods were Ready; another eight pods had succeeded.
  Both Flux Kustomizations and all four HelmReleases were Ready. No monitored
  scrape targets were down at the time of inspection.
- **Fact:** Node-exporter boot times are `2026-10-19T12:14:34Z` for the Pi and
  `12:14:37Z` for the HP: approximately 13:14 BST. Current container startup
  times agree with a cluster-wide restart. Some Pi last-termination timestamps
  misleadingly precede their recorded startup dates; current clock-offset
  metrics are approximately zero. Old displayed restart ages are therefore
  unsuitable for dating this restart.
- **Fact:** `PostgresBackupStale` is firing at critical severity. The shared
  PostgreSQL CronJob last succeeded at `2026-10-14T02:01:54Z`. Retained jobs on
  October 16 and 17 reached their one-hour deadline; the October 19 job reached
  its retry limit. There is no currently active backup job. The failed pods
  are absent, and a bounded Loki query for the most recent failure returned
  no lines, so the underlying failure is unresolved.
- **Fact:** `GrowthOSBackingDiskWarning` is firing for the HP. Its root
  filesystem has approximately 30.3 GiB / 26% available, equivalent to about
  74% used. The Pi has approximately 280.9 GiB available. Kubernetes reports
  no disk pressure on either node.
- **Fact:** Qdrant and Phoenix have zero desired and available replicas, as
  intentionally documented in the root README and root replica overrides.
  Their unavailability is an expected consequence of the earlier pause.

**Inference / priority:** Investigate OpenClaw's abnormal worker first to
address CPU waste, restore successful shared-Postgres backups, then diagnose
Paperclip's retained lease cleanup failure. Investigate HP disk growth before
it reaches the critical threshold. No cleanup or deletion was performed.

## Authorized OpenClaw upgrade — subsequent investigation

**Fact:** Quinn subsequently requested a fix and OpenClaw update. The selected
official stable release is
[2026.10.5](https://github.com/openclaw/openclaw/releases/tag/v2026.10.5),
published `2026-10-18T21:47:25Z`. The image's OCI revision matches the tagged
release commit `1b58cb9a1b4f4353e1add63c8506db4d890962e8`. The gateway and
migration init container are prepared with the same immutable ARM64 manifest:
`sha256:31a4b7eb2bb9574527a1e46b2208e1b653f060753dd36fe3da444f79a7d03f0c`.

**Fact:** The complete root Kustomize build and the OpenClaw overlay build
pass. The updated Deployment passes Kubernetes server-side dry-run validation
using the existing `kustomize-controller` field manager. Its `Recreate`
strategy, UID/GID, volume, network/authentication policy and resource limits
are preserved.

**Fact:** OpenClaw 2026.9.5's native `backup create --verify` captured the live
state and workspaces at `2026-10-19T18:07:58.555Z`. The archive remains on the
Orange Pi at
`/mnt/k8s-data/openclaw-upgrade-2026-10-19/before-2026.10.5.tar.gz`, outside
the live source tree, with mode 600 in a UID/GID 1000-owned mode-700 directory.
It is 1,419,092,375 bytes; SHA-256 is
`f48d5c2f51d5970f00fd70a278d73840f26a6219d5d0e6211c364a6c46c0c807`.
The native restore verified and extracted 1,336 entries successfully into a
separate `restored/` directory while the live state mount was read-only.
No credentials, conversations, or archive data were exported to the Mac or
committed to Git.

**Fact:** Native backup verification covers OpenClaw's managed database
snapshots. It explicitly treats the nested Codex CLI's unrelated SQLite/WAL
files as opaque bytes, without snapshot/integrity guarantees for those
files. Regenerable plugin dependencies and temporary files are excluded by
the native backup engine. This recovery archive shares the node's backing
disk and does not constitute off-node disaster recovery.

**Fact:** The downloaded candidate reports `OpenClaw 2026.10.5 (1b58cb9)`.
Its production migration command, `doctor --fix --non-interactive`, completed
successfully against the restored copy under the production 2 GiB memory
limit. Live state was not mounted into the candidate migration container.
Candidate diagnostics remain private beside the archive.

**Fact:** Commit `b4379dc` deployed the upgrade through the Flux-tracked
`main` branch. Both live init containers completed with exit code zero;
the production migration finished at `18:20:03Z`. The gateway started at
`18:20:05Z` and the replacement pod became Ready at `18:21:24Z`.
`openclaw-6c969f9d77-wws6r` runs the verified ARM64 manifest and reports zero
restarts for both containers.

**Fact:** The new Control UI includes two different inline bootstrap
scripts. The ingress previously allowed only the 2026.9.5 script hash, which
would block both new scripts. Follow-up commit `2fb5709` updates only that
script-hash allowlist; both new hashes were computed from the downloaded
image and independently checked against the live HTTPS response. Kubernetes
admission dry-run passes, Flux applied the follow-up, and the live policy
permits both scripts without `unsafe-inline` in `script-src`. The HTTPS UI
and its `/assets/index-BXEdQku5.js` bundle both return 200.

**Fact:** The authenticated native gateway health check returns `ok: true`
in 104 ms, with the five existing agents and no external chat channels.
A deliberate invalid-token health request is rejected with
`AUTH_TOKEN_MISMATCH`. No model inference or paid provider probe was used
for verification.

**Fact:** After verification commands finished, two observations at
`18:26:16Z` and `18:26:46Z` reported approximately **0.055 CPU cores** and
**1,313 MiB** working-set memory. The last-interval CPU observation uses
`irate(container_cpu_usage_seconds_total[5m])` for the new pod, giving a
roughly **95% reduction** from the initial 1.04 cores. A subsequent
`kubectl top` sample reported **27m CPU / 1,389 MiB** for the gateway. The Pi
reported **8% CPU / 39% memory**, versus approximately 19% / 45% at initial
inspection. The short samples differ in timing and averaging; they are not
long-term averages.

**Fact:** A bounded five-minute gateway log check contained 21 lines, with
zero instances of the earlier `Failed to fetch OpenRouter models` warning,
invalid configuration, or fatal/OOM messages. Authentication warnings from
the deliberate invalid-token test were expected. Both Flux Kustomizations
and all four HelmReleases remained Ready after the application and ingress
changes.

**Inference:** The observed continuous one-core idle regression is resolved
in this post-upgrade observation window. The update and restart happened
together, so these results do not isolate the contribution of a specific
upstream fix or establish behavior over days of uptime. Shared-Postgres
backup failures and the HP disk warning remain separate unresolved findings.

Operational post-rollout metric snapshots were retained temporarily at
`/private/tmp/openclaw-upgrade-20261019/`. The durable results are recorded
above. A one-minute CPU rate query returned no vector with the current
scrape spacing; missing data was never treated as zero CPU.

## Reproducible read-only checks

```sh
kubectl top nodes
kubectl top pods -A --containers --sort-by=cpu
kubectl get pods -A -o wide
kubectl get events -A --field-selector type=Warning --sort-by=.lastTimestamp
kubectl get jobs,cronjobs -A
kubectl get kustomizations.kustomize.toolkit.fluxcd.io,helmreleases.helm.toolkit.fluxcd.io -A
```

PromQL used for current and seven-day hourly historical observations:

```promql
sum by (pod) (
  rate(container_cpu_usage_seconds_total{
    pod=~"openclaw.*|paperclip.*|context-forge.*",
    container!="",container!="POD"
  }[5m])
)

sum by (pod) (
  container_memory_working_set_bytes{
    pod=~"openclaw.*|paperclip.*|context-forge.*",
    container!="",container!="POD"
  }
) / 1048576

100 * (1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])))
node_boot_time_seconds
node_timex_offset_seconds
node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay"} / 1073741824
growth_os_storage_backing_available_bytes / growth_os_storage_backing_capacity_bytes * 100
kube_cronjob_status_last_successful_time{cronjob="postgres-backup"}
ALERTS{alertstate="firing"}
up == 0
```

Raw operational metric responses and the pod status snapshot were retained
temporarily on the operator machine at
`/private/tmp/homelab-inspection-20261019/`. The substantive observations above
are the durable receipt; the temporary directory is not a required dependency.
