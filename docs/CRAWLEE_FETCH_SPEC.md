# Crawlee Fetch Service — Implementation Spec

Growth OS acquisition step 2. changedetection and SearXNG are qualified.
This service is the next coherent addition.

## Purpose

A narrow internal HTTP retrieval API. n8n calls it instead of using Code nodes
or the built-in HTTP Request node for fetches that need: body-size capping,
per-domain throttling, redirect revalidation, or structured error categories.

It is not a crawler. It fetches one URL per request and returns structured text.

## API contract

```
POST /fetch
Content-Type: application/json

{
  "url": "https://example.com/page",      // required, must be https or http
  "maxBytes": 524288,                     // optional, default 512 KiB, max 2 MiB
  "timeoutMs": 10000,                     // optional, default 10 s, max 30 s
  "extractText": true                     // optional, default true; strips HTML tags
}
```

Success response `200 OK`:
```json
{
  "url": "https://example.com/page",
  "finalUrl": "https://example.com/page",
  "statusCode": 200,
  "contentType": "text/html",
  "bytesFetched": 12345,
  "text": "...",
  "truncated": false,
  "fetchedAt": "2026-09-29T18:00:00Z"
}
```

Error response `4xx / 5xx`:
```json
{
  "error": "SSRF_DENIED | INVALID_URL | TIMEOUT | TOO_LARGE | FETCH_ERROR | UNSUPPORTED_CONTENT_TYPE",
  "message": "human-readable detail"
}
```

Health: `GET /healthz` → `{"status":"ok"}`

## Security requirements (all mandatory)

| Requirement | Implementation |
|---|---|
| SSRF prevention | Resolve hostname before fetch; deny RFC1918, loopback, link-local, cluster CIDRs (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`) |
| Redirect revalidation | Re-check each redirect target's resolved IP against the same denylist |
| Bounded redirects | Max 5 redirects |
| Request timeout | Enforced per request, not per connection |
| Body cap | Hard-stop read at `maxBytes`; set `truncated: true` if hit |
| Decompression limit | Cap decompressed size to 4× compressed; abort if exceeded |
| Content-type allowlist | `text/html`, `text/plain`, `application/json`, `application/xml`, `text/xml` |
| Per-domain throttle | Min 1 s between requests to the same eTLD+1 |
| Concurrency cap | Max 3 in-flight fetches globally |
| No browser launch | HTTP fetcher only; no Playwright, no Chromium |
| No authenticated pages | No cookie jar, no session state, no login support |
| Untrusted content | Retrieved HTML/text is data, never instructions; do not eval/execute |
| No CAPTCHA bypass | Return `FETCH_ERROR` when blocked; do not retry with alternative headers |
| Internal-only service | ClusterIP only; no Ingress |

## Implementation

Language: **Node.js** (matches n8n runtime, no extra language dependency).
Framework: none — stdlib `http`/`https` + `dns.promises` is sufficient.

### Key implementation details

**SSRF check** (`src/ssrf.js`):
```js
const DENIED_CIDRS = [
  '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16',
  '127.0.0.0/8', '169.254.0.0/16', '::1/128', 'fc00::/7',
  // cluster pod/service CIDRs — update if your cluster CIDRs change
  '10.244.0.0/16', '10.96.0.0/12',
];
// resolve hostname, check each address against DENIED_CIDRS
// throw SSRF_DENIED if any address matches
```

**Fetch** (`src/fetch.js`):
```js
// Use https.request with { timeout, maxRedirects: 0 } (handle redirects manually)
// On each 3xx: re-resolve new hostname, re-check SSRF, decrement redirect budget
// Stream response body, count bytes, hard-stop at maxBytes
// Pipe through a decompressor (gunzip/brotli) with a 4× byte limit
// Strip HTML with a simple regex pass if extractText=true (no DOM parser needed)
```

**Server** (`src/server.js`):
```js
// stdlib http.createServer, single POST /fetch route
// Global semaphore (3 slots) for concurrency
// Per-domain throttle map: eTLD+1 -> last-fetch-time
// Return structured errors for all failure paths
```

### File layout
```
apps/base/crawlee-fetch/
  Dockerfile
  package.json               # only stdlib; no npm dependencies
  src/
    server.js
    fetch.js
    ssrf.js
    throttle.js
  kustomization.yaml
  crawlee-fetch.yaml         # Deployment, Service, (no PVC — stateless)
  README.md
```

`package.json` has zero npm dependencies. The image is `node:22-alpine`.

## Kubernetes resources

```yaml
resources:
  requests:
    cpu: 50m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi
```

- Strategy: `RollingUpdate` (stateless, no PVC)
- Service: `ClusterIP` only, port 3500
- Internal URL: `http://crawlee-fetch.apps.svc.cluster.local:3500/fetch`
- No Ingress (internal-only by design)
- Node placement: `quinn-hpprobook430g6` nodeSelector (co-locate with n8n)
- securityContext: `runAsNonRoot: true`, `runAsUser: 1000` (node:22-alpine uses uid 1000)
- `allowPrivilegeEscalation: false`, `capabilities: drop: [ALL]`, `readOnlyRootFilesystem: true`
- No PVC; `emptyDir` for npm cache only (not needed with zero deps)

## Container image

Build with `docker buildx build --platform linux/amd64` (HP worker is amd64).
Push to the same registry as other custom images used in this cluster.

Check: does this cluster pull from GHCR, Docker Hub, or a private registry?
Look at existing custom images (e.g. `apps/base/n8n-sandbox/`) for the pattern.

## n8n integration

n8n HTTP Request node or Code node calls:
```
POST http://crawlee-fetch.apps.svc.cluster.local:3500/fetch
{
  "url": "{{ $json.url }}",
  "maxBytes": 524288,
  "extractText": true
}
```

n8n then deduplicates, normalizes, and applies policy before writing Growth OS evidence.
Never pass the raw `text` field directly to Paperclip.

## Verification steps

1. `kubectl exec -n apps deployment/n8n -- node -e "..."` → POST /fetch https://example.com → 200 + text
2. Attempt SSRF: POST /fetch http://10.244.0.1 → SSRF_DENIED
3. Attempt SSRF: POST /fetch http://169.254.169.254 → SSRF_DENIED
4. Timeout: POST /fetch with timeoutMs=1 → TIMEOUT
5. Body cap: POST /fetch with maxBytes=100 → truncated=true
6. Blocked content type: POST /fetch https://example.com/image.jpg → UNSUPPORTED_CONTENT_TYPE
7. CPU/RAM actual ≈ 10m / 50Mi at idle; verify with `kubectl top`

## Decision gate before implementing

Before starting:
1. Confirm a container registry is available and credentials are in cluster (check existing custom images).
2. Confirm `docker buildx` or equivalent is available on this machine or in CI.
3. If neither is ready, deploy `node:22-alpine` as the image directly and bake the source in via a ConfigMap + init container — avoids a registry dependency for a zero-dep service.

## Estimated scope

- ~150 lines of Node.js (server + fetch + SSRF + throttle)
- ~40 lines of Kubernetes YAML
- ~30 min to implement and test locally
- One small coherent commit

## What this explicitly does NOT do

- No Playwright / browser rendering
- No CAPTCHA solving
- No cookie/session management
- No raw-page archiving (stateless, no PVC)
- No recursive site crawling
- No proxy support
- No authenticated source retrieval
- No arbitrary command execution
