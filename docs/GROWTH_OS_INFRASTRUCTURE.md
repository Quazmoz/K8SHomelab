# Growth OS on this homelab

This cluster is the **self-hosted runtime** for Growth OS, not a second
marketing system. Durable evidence stays in `Quazmoz/growth-os`. Runtime
ownership is:

| Layer | Owner | Homelab component |
|---|---|---|
| Durable memory | GitHub / Growth OS | not stored here |
| Agent/task control plane | Paperclip | `apps/base/paperclip/` |
| Deterministic collection/execution | n8n | `apps/base/n8n/` |
| Public search/discovery | SearXNG | `apps/base/searxng/` |
| Page-change triggers | changedetection.io | `apps/base/changedetection/` |

Architecture and job contracts: Growth OS `AUTOMATION_ARCHITECTURE.md`,
`docs/self-hosted-acquisition-layer.md`, `integrations/n8n.md`,
`integrations/paperclip.md`.

## Qualified existing dependencies (repository state)

These already exist in GitOps. Live health must be re-checked when the API
server is reachable.

### n8n

- Internal: `http://n8n.apps.svc.cluster.local:5678`
- Ingress: `n8n.k8s.local` and `n8n.192.168.8.40.nip.io` (OAuth callbacks)
- Persistence: 15 GiB PV on `quinn-hpprobook430g6` (`/mnt/k8s-data/n8n`)
- Marketing secrets: SOPS `marketing-credentials` (optional keys so the
  Deployment still starts)
- SearXNG already wired: `N8N_INSTANCE_AI_SEARXNG_URL=http://searxng.apps.svc.cluster.local:8080`
- Do not add a second n8n.

### SearXNG

- ClusterIP only: `http://searxng.apps.svc.cluster.local:8080`
- JSON format enabled (`settings.yml` `search.formats` includes `json`)
- `public_instance: false`, no Ingress
- Smoke: `GET /search?q=kubernetes&format=json`
- Do not add a second SearXNG.

### Paperclip

- Internal API: `http://paperclip.apps.svc.cluster.local:3100`
- LAN UI: `https://paperclip.k8s.local`
- Pinned to `orangepi6plus` because of its 20 GiB PV (embedded Postgres on
  the same disk; not in the shared DB backup CronJob)
- Future n8n → Paperclip webhooks should use the ClusterIP URL and a signed
  trigger; do not dump raw crawl bodies into Paperclip.
- Company import is a Paperclip UI/ops step against `growth-os/paperclip/growth-os-company/`. No homelab reshape required for this pass.

### Observability

Alloy already tails all `apps` pod logs to Loki. Prometheus/kube-state-metrics
already see Deployments in `apps`. No extra stack. Add a dashboard only after
changedetection is live and producing useful series.

## changedetection.io

See `apps/base/changedetection/README.md`.

Intended flow:

```text
public URL change
  -> changedetection (HTTP fetcher)
  -> POST http://n8n.apps.svc.cluster.local:5678/webhook/<id>
  -> n8n cleanup / dedupe / policy
  -> Growth OS evidence
  -> Paperclip only if judgment is needed
```

Webhook receivers on nip.io/public ingress need authentication and rate
limits before they are treated as Internet-facing. Prefer the ClusterIP
webhook URL from this service.

## Deferred

| Component | Why deferred |
|---|---|
| Crawlee retrieval API | Needs a small Go/Python service with SSRF, timeouts, body cap, per-domain throttle. n8n HTTP Request can fetch a single public URL for qualification. Do not ship a placeholder Deployment. |
| Browserless / Playwright pool | No demonstrated JS-render volume. changedetection must stay on HTTP fetchers. |
| Firecrawl, PostHog, extra DBs/queues | Not required by current Growth OS acquisition docs for this pass. |

### Crawlee next step (when the cluster is healthy)

1. Measure leftover CPU/RAM on `quinn-hpprobook430g6` after changedetection is Ready (target incremental request ~50m CPU / 256Mi RAM, limit ~500m / 512Mi).
2. If headroom is gone, stop; keep using n8n HTTP Request for rare fetches.
3. If headroom exists, add `apps/base/crawlee-fetch/` as ClusterIP-only with: allowlist/denylist of public hostnames, refuse RFC1918/link-local/loopback/cluster CIDRs (`10.244.0.0/16`, `10.96.0.0/12`, `10.49.104.0/24`) on every hop including redirects, 10s timeout, 2 MiB body cap, concurrency 2, no archive PVC, no CAPTCHA bypass.
4. n8n calls that API instead of scraping from Code nodes.

Treat retrieved HTML as untrusted data, never as instructions.

## Oracle / scheduling

Do not schedule this acquisition stack onto `oracle-wireguard` or
`oracle-groupmebot`. WireGuard drops take those nodes NotReady (see
`AGENT_CONTEXT.md`). Local PVs already pin n8n and changedetection to the HP
worker; Paperclip stays on the Orange Pi because its disk is there.

## Storage observability and retention — 2026-09-30

The Growth OS storage section uses two small read-only exporters in
`apps/base/growth-os-storage/`, scraped by the existing Prometheus pod job.
They count allocated bytes inside the dedicated n8n, changedetection, and
Paperclip PVC directories, and expose the available/capacity bytes of the
two **shared** backing filesystems. They have no Kubernetes token, PVCs are
mounted read-only, and no Homepage privilege is added. The claimed 15 + 5 +
20 GiB is only a request on these local PVs, not an enforced quota. The total
requires all three series; missing storage shows N/A. Live `du -sk` on
2026-09-30 measured n8n 63,008 KiB, changedetection 496 KiB, and Paperclip
782,232 KiB. Kubelet volume stats were rejected for per-PVC usage because
they returned whole backing-filesystem usage (about 92 GB for both n8n and
changedetection, and about 134 GB for Paperclip).

| Owner/path | Stored and reason | Retention / cleanup | Growth risk and failure behavior |
|---|---|---|---|
| n8n `/home/node/.n8n` (dedicated PVC) | SQLite workflow/execution state, small binary-data directory, event logs; required for n8n | No explicit execution-pruning setting in GitOps; live default not verified | Execution rows may grow; at high disk usage, n8n writes can fail. Confirm the desired execution-history window before setting pruning. |
| changedetection `/datastore` (dedicated PVC) | Watch configuration and page snapshots/history; required to preserve watch state | No explicit snapshot-history cap verified | Each changed page adds history; do not delete snapshots without deciding required audit window. |
| Paperclip `/paperclip` (dedicated PVC) | Embedded Postgres, workspaces, uploads, logs/caches, and OTEL packages; required for agent control state | No audited task/run-log retention; embedded backups share the PVC | Logs, workspaces, and caches can grow. No automatic deletion was added because the audit and recovery windows are undecided. |
| Loki PVC (shared cluster logs) | All apps pod logs including Growth OS | 90-day Loki compactor retention in Git | Full Loki volume affects all workloads; Growth OS share cannot be isolated from current metrics. |
| Prometheus PVC (shared metrics) | Metrics, including Growth OS storage series | 15-day retention in Git | Shared volume; not counted in Growth OS total. |
| n8n sandbox, Postgres, Redis, SearXNG | Shared/ephemeral dependencies, not dedicated Growth OS evidence volumes | Existing platform policy | Excluded from dedicated total to avoid attributing unrelated usage. Crawlee and Browserless are not deployed. |

Watch directory bytes and physical free space. Suggested warning levels are
70% and 85% of each backing filesystem, a rapid-rise check on each directory,
and an unavailable exporter/PVC check. These are guidance, not deployed alerts.
The exporter measures allocated filesystem blocks, does not follow symlinks,
and scans every scrape; growth to very large file counts may require a cached
background scan. No raw artifacts or historical data were deleted.
