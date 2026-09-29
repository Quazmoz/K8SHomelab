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
