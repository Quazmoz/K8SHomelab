# AI Context: OpenClaw

## Purpose
OpenClaw runs as an autonomous agent service in the `apps` namespace and is exposed through ingress at `openclaw.k8s.local`.

## Runtime Notes
- The container binds gateway traffic to loopback and uses a `socat` sidecar to expose traffic to Kubernetes networking.
- Device identity and pairing are required by the Control UI.
- TLS is enabled at ingress for secure-context browser requirements.
- `HOME` is explicitly set to `/home/user` so that OpenClaw's memory workspace (`~/.openclaw/workspace/`) resolves to the PVC mount, not ephemeral storage.
- Deployment image is pinned to `ghcr.io/openclaw/openclaw:2026.4.5-arm64` (latest verified ARM64 release).

## Memory System
- Provider: `local` (on-device embeddings via node-llama-cpp, no external API needed)
- Model: `nomic-embed-text-v1.5.Q8_0.gguf` (~146MB, cached on PVC at `~/.openclaw/model-cache/`)
- Memory files: `~/.openclaw/workspace/memory/*.md`
- Fallback: `none` (prevents accidental OpenAI API calls with the Ollama Cloud key)
- Config path: `agents.defaults.memorySearch` in `openclaw.json`

## Skills

Skills live on the PVC at `~/.openclaw/skills/<name>/SKILL.md`.
An `install-skills` initContainer seeds them from ConfigMaps on every pod start,
keeping skill content in Git while placing it where OpenClaw expects it.

| Skill | ConfigMap | Capability |
|-------|-----------|------------|
| `n8n` | `openclaw-n8n-skill` | List and inspect workflows, trigger manual runs, query executions |
| `n8n-editor` | `openclaw-n8n-editor-skill` | Fetch editable workflow JSON, apply validated `PUT` updates, run tested workflow recipes |

### n8n Skill Details
- **ConfigMap:** `apps/base/openclaw/n8n-skill-configmap.yaml`
- **Env vars injected:** `N8N_BASE_URL` (`http://n8n.apps.svc.cluster.local:5678`), `N8N_API_KEY` (from `openclaw-credentials` secret key `N8N_API_KEY`)
- **To add the API key:** Decrypt the SOPS secret, add `N8N_API_KEY: <key>`, re-encrypt. Generate the key in n8n **Settings → API → Create an API key**.
- **Skill path on PVC:** `/home/user/.openclaw/skills/n8n/SKILL.md`
- **Query helper:** `/home/user/.openclaw/skills/n8n/n8n_query_helper.py`
- **Deterministic query pattern:** use helper for list/filter queries (for example GroupMe workflows) with max one retry, then return failure details instead of looping.
- **Live API contract (validated 2026-03-31):**
  - `PATCH /api/v1/workflows/{id}` returns `405 Method Not Allowed`
  - `PUT /api/v1/workflows/{id}` works with a sanitized full workflow body (`name`, `nodes`, `connections`, filtered `settings`)
  - `POST /api/v1/workflows` is supported for creation with the same sanitized body shape

### n8n Editor Helper
- **ConfigMap:** `apps/base/openclaw/n8n-editor-skill-configmap.yaml`
- **Skill path on PVC:** `/home/user/.openclaw/skills/n8n-editor/`
- **Helper script:** `/home/user/.openclaw/skills/n8n-editor/n8n_workflow_helper.py`
- **Verified write paths:**
  - Update: `PUT /api/v1/workflows/{id}` with sanitized workflow body
  - Create: `POST /api/v1/workflows` with sanitized workflow body
- **Built-in recipe:** `groupme-two-videos` updates the GroupMe YouTube forwarder dedupe logic to return up to two unseen videos when the workflow shape matches expectations.

## Bootstrap Cleanup
- A repo-managed init container now runs `bootstrap_openclaw.py` on pod start.
- It seeds skill folders onto the PVC, deletes stale `BOOTSTRAP.md` and `HEARTBEAT.md` files from all workspaces, and replaces the main workspace `AGENTS.md` with a leaner version that does not auto-load `MEMORY.md` every session.
- It now reconciles skills in strict allowlist mode on each startup (clears old skill directories, then reseeds only allowlisted skills from bootstrap sources) so removed skills stay removed.
- Default allowlist is set via `OPENCLAW_SKILL_ALLOWLIST` and currently includes `n8n,n8n-editor,terminal,shell,filesystem,git,web-search,http,memory`.
- Any bundled skill not in the allowlist is excluded, including Apple/macOS/iOS-related skills.
- It now also materializes per-agent runtime directories (`agents/<id>/agent`, `agents/<id>/sessions`) and normalizes agent entries (`main`, `ops`, `research`, `homelab`) so selector-visible agents are fully bootstrap-backed on every restart.
- It now also materializes per-agent runtime directories (`agents/<id>/agent`, `agents/<id>/sessions`) and normalizes agent entries (`main`, `ops`, `research`, `homelab`, `n8n-control`) so selector-visible agents are fully bootstrap-backed on every restart.
- It also seeds optional `chatgpt` and `mistral` provider definitions into `openclaw.json` so those backends survive pod restarts when API keys are present.
- It normalizes agent models to stable OpenAI-compatible Ollama Cloud refs:
  - `main`: `openai/kimi-k2.5`
  - `research`: `openai/kimi-k2.5`
  - `homelab`: `openai/kimi-k2.5`
  - `n8n-control`: `openai/kimi-k2.5`
  - `ops`: `openai/nemotron-3-super`
- It enforces token-efficiency defaults at bootstrap time:
  - replaces `agents.defaults.models` with a curated small model set (removes stale legacy model entries)
  - `agents.defaults.maxConcurrent = 2`
  - removes deprecated keys rejected by newer OpenClaw builds (`subagents.maxConcurrent`, `thinkingDefault`) from defaults and agent entries during bootstrap
- It forces `commands.restart = false` so in-app restart requests do not cause pod flapping.
- It forces `commands.native = false` and `commands.nativeSkills = false` so bundled native tools and skill catalogs stay disabled.
- It removes stale explicit per-agent `skills` lists during bootstrap to prevent drift from old runtime catalogs.
- It removes stale top-level `plugins` config entries from older runtimes to prevent invalid plugin warnings.
- Deployment sets `OPENCLAW_BUNDLED_PLUGINS_DIR=/home/user/.openclaw/skills`, constraining discovery to curated PVC-backed skills.
- Deployment masks `/app/extensions` with `bundled-extensions-mask` (`emptyDir`) so built-in bundled skill catalogs are hidden in pod runtime.
- The dedicated `n8n-control` agent seeds a workspace-specific `AGENTS.md` that forces single-path helper usage for read queries.
- No routing bindings are configured in repo because the current runtime has no external chat channels configured; Control UI agent selection is still done via the dropdown + new chat.

## Probe Behavior
- Deployment probes check `http://127.0.0.1:18789` from inside the OpenClaw container.
- Probe success accepts both `200` and `401` responses to tolerate auth-state transitions while still failing closed on socket errors/timeouts.

## Credentials
- Secrets are sourced from `openclaw-credentials`.
- `OPENAI_API_KEY` is provided for OpenAI-compatible mode (actually an Ollama Cloud key).
- `OLLAMA_API_KEY` is also exported (mapped to the same secret key) so native Ollama provider auth can work without extra secret wiring.
- `CHATGPT_API_KEY` is optional and should be an OpenAI Platform API key for the repo-managed `chatgpt/*` provider entries. A ChatGPT web subscription by itself does not supply API credits.
- `MISTRAL_API_KEY` is optional and should come from `console.mistral.ai` for the repo-managed `mistral/*` provider entries.
- **Important:** The `OPENAI_API_KEY` is NOT a real OpenAI key. Do not use `auto` or `openai` as the memory embedding provider — it will 401.

## Additional Backends
- OpenAI Platform is exposed in OpenClaw as `chatgpt/*` model refs to avoid colliding with the existing Ollama Cloud `openai/*` provider mapping.
- Seeded ChatGPT model refs: `chatgpt/gpt-4.1-mini`, `chatgpt/gpt-4.1`, `chatgpt/gpt-4o-mini`.
- Seeded Mistral model refs: `mistral/ministral-14b-2512`, `mistral/codestral-2508`, `mistral/mistral-medium-2508`, `mistral/devstral-2512`.
- The default Mistral seed set is budget-oriented: it avoids premium-priced `mistral-large-*` and `magistral-medium-*` while still keeping stronger general and coding options.
- The older weak-budget `mistral-small-*` seeds remain intentionally excluded, and the remaining seeded Mistral refs are version-pinned instead of `*-latest` aliases to avoid provider-side rotations changing behavior under OpenClaw.
- Both providers are configured via OpenAI-compatible chat-completions endpoints in bootstrap so they persist after every pod restart.

## Ollama Cloud Configuration
Native `ollama/<model>` mode can return `401` on some newer builds even when keys are present.
Preferred recovery path is OpenAI-compatible Ollama Cloud + OpenRouter fallback:

```bash
kubectl -n apps exec deploy/openclaw -c openclaw -- \
  openclaw config set models.providers.openai '{"baseUrl":"https://ollama.com/v1","api":"openai-completions","apiKey":"env:OPENAI_API_KEY","models":[{"id":"nemotron-3-super","name":"nemotron-3-super","reasoning":false,"input":["text"],"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0},"contextWindow":262144,"maxTokens":8192}]}' --strict-json
kubectl -n apps exec deploy/openclaw -c openclaw -- \
  openclaw config set agents.defaults.model.primary 'openai/kimi-k2.5'
kubectl -n apps exec deploy/openclaw -c openclaw -- \
  openclaw config set agents.defaults.thinkingDefault 'minimal'
kubectl -n apps rollout restart deploy/openclaw
```

Current runtime caveats:
- `ollama/<model>` refs return `401` in this build even with valid API keys.
- Use `openai/<model>` refs for Ollama Cloud (`openai/kimi-k2.5`, `openai/nemotron-3-super`).
- `openai/gemma3:27b` can return provider `500` from OpenClaw runtime; keep `openai/kimi-k2.5` as default.

To use native Ollama provider mode when healthy again:

```bash
kubectl -n apps exec deploy/openclaw -c openclaw -- \
  openclaw config set models.providers.ollama '{"api":"ollama","baseUrl":"https://ollama.com","models":[]}' --strict-json
kubectl -n apps rollout restart deploy/openclaw
```

## Verification
Use these checks after rollout:

```bash
kubectl -n apps exec deploy/openclaw -c openclaw -- openclaw config get models.providers.chatgpt
kubectl -n apps exec deploy/openclaw -c openclaw -- openclaw config get models.providers.mistral
kubectl -n apps exec deploy/openclaw -c openclaw -- openclaw config get models.providers.ollama
kubectl -n apps exec deploy/openclaw -c openclaw -- openclaw models list
```
