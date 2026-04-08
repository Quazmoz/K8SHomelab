# OpenClaw - Autonomous AI Agent

OpenClaw is an autonomous AI agent that can execute tasks, orchestrate tools, and operate continuously as a service.

## Deployment Details

| Setting | Value |
|---------|-------|
| **Image** | `ghcr.io/openclaw/openclaw:2026.4.8-arm64` (pinned to latest verified ARM64 release) |
| **Node** | `orangepi6plus` (with control-plane toleration) |
| **Gateway Port** | `18789` (WebSocket) |
| **Canvas Port** | `18793` (HTTP) |
| **Storage** | 5Gi PV on `/mnt/k8s-data/openclaw` |
| **Memory** | 1Gi request / 6Gi limit |
| **CPU** | 200m request / 2000m limit |

## Security

- Runs as **non-root** user (UID 1000)
- Gateway secured with `OPENCLAW_GATEWAY_TOKEN`
- API keys stored in SOPS-encrypted Kubernetes Secret
- **Do NOT expose the gateway port to the internet** — use SSH tunneling or keep internal

## Setup Steps

### 1. Create data directory on orangepi6plus
```bash
ssh orangepi6plus "sudo mkdir -p /mnt/k8s-data/openclaw && sudo chown 1000:1000 /mnt/k8s-data/openclaw"
```

### 2. Configure credentials
Edit `openclaw-credentials.secret.yaml` with your values:

> This is a local plaintext working file and is gitignored (`*.secret.yaml`).
> If missing, recreate it from the schema in this README or from the encrypted file's structure.

```bash
# Generate a gateway token
openssl rand -hex 32

# Add your LLM provider API key(s) — at least one is required
```

Optional provider keys supported by this deployment:

- `OPENAI_API_KEY`: current Ollama Cloud key used by the repo's existing `openai/*` model refs.
- `CHATGPT_API_KEY`: real OpenAI Platform key for the additional `chatgpt/*` backend. A ChatGPT Plus/Pro subscription alone is not enough; API billing lives on the OpenAI Platform account.
- `MISTRAL_API_KEY`: Mistral API key from `console.mistral.ai` for the additional `mistral/*` backend.
- `OPENROUTER_API_KEY`: enables OpenClaw's bundled `openrouter/*` provider. For a zero-cost starting point, use `openrouter/free`.
- `GEMINI_API_KEY`: enables OpenClaw's bundled `google/*` provider through Google AI Studio.
- `GROQ_API_KEY`: enables OpenClaw's bundled `groq/*` provider.
- `HUGGINGFACE_HUB_TOKEN`: enables OpenClaw's bundled `huggingface/*` provider. The deployment also exports it as `HF_TOKEN` for compatibility.
- `CEREBRAS_API_KEY`: enables OpenClaw's bundled `cerebras/*` provider.
- `ANTHROPIC_API_KEY`: optional non-free fallback already supported by the deployment.

Recommended `stringData` additions when you edit the SOPS secret:

```yaml
stringData:
  GATEWAY_TOKEN: "<existing-or-new-token>"
  OPENAI_API_KEY: "<existing-ollama-cloud-key>"
  OPENROUTER_API_KEY: ""
  GEMINI_API_KEY: ""
  GROQ_API_KEY: ""
  HUGGINGFACE_HUB_TOKEN: ""
  CEREBRAS_API_KEY: ""
  CHATGPT_API_KEY: ""
  MISTRAL_API_KEY: ""
  ANTHROPIC_API_KEY: ""
  N8N_API_KEY: "<existing-n8n-key-if-used>"
```

### 3. Encrypt or edit the secret with SOPS
```bash
sops -e -i openclaw-credentials.secret.yaml
mv openclaw-credentials.secret.yaml openclaw-credentials.secret.enc.yaml
```

For later edits on Windows, prefer the repo helper so `sops` always has an editor:

```powershell
.\scripts\sops-edit.ps1 apps/base/openclaw/openclaw-credentials.secret.enc.yaml
```

Direct `sops` also works if you set `SOPS_EDITOR` first:

```powershell
$env:SOPS_EDITOR = 'Code.exe --wait'
sops apps/base/openclaw/openclaw-credentials.secret.enc.yaml
```

### 4. Enable the encrypted secret in kustomization.yaml
Uncomment the secret reference line in `kustomization.yaml`.

### 5. Commit and push
```bash
git add -A && git commit -m "Add OpenClaw deployment" && git push
flux reconcile kustomization apps --with-source
```

## Accessing OpenClaw

The gateway is only exposed as a ClusterIP service. To connect from your local machine:

```bash
# Port-forward the gateway
kubectl port-forward -n apps svc/openclaw 18789:18789

# Then connect to ws://localhost:18789
```

## Ollama Cloud Setup Notes

- The deployment exports both `OPENAI_API_KEY` and `OLLAMA_API_KEY` from the same secret-backed key.
- If OpenClaw returns `HTTP 401: unauthorized` with `ollama/<model>` after an upgrade, switch to OpenAI-compatible Ollama Cloud models and keep OpenRouter as fallback.

Recommended recovery commands:

```bash
# 1) Use OpenAI-compatible provider for Ollama Cloud
kubectl -n apps exec deploy/openclaw -c openclaw -- \
	openclaw config set models.providers.openai '{"baseUrl":"https://ollama.com/v1","api":"openai-completions","apiKey":"env:OPENAI_API_KEY","models":[{"id":"nemotron-3-super","name":"nemotron-3-super","reasoning":false,"input":["text"],"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0},"contextWindow":262144,"maxTokens":8192}]}' --strict-json

# 2) Set a stable default and avoid OpenRouter "reasoning required" failures
kubectl -n apps exec deploy/openclaw -c openclaw -- \
	openclaw config set agents.defaults.model.primary 'openai/kimi-k2.5'
kubectl -n apps exec deploy/openclaw -c openclaw -- \
	openclaw config set agents.defaults.thinkingDefault 'minimal'

# 3) Restart deployment
kubectl -n apps rollout restart deploy/openclaw
```

If native Ollama mode works again in a future release, you can re-enable it:

```bash
kubectl -n apps exec deploy/openclaw -c openclaw -- \
	openclaw config set models.providers.ollama '{"api":"ollama","baseUrl":"https://ollama.com","models":[]}' --strict-json
```

- Restart OpenClaw after changing provider config:

Known behavior in current build:

- `ollama/<model>` refs still return `401` in OpenClaw even when keys are valid.
- Use `openai/<model>` refs for Ollama Cloud routing (`openai/kimi-k2.5`, `openai/nemotron-3-super`).
- `openai/gemma3:27b` may return provider-side `500` errors from this runtime path; use `openai/kimi-k2.5` as the stable default.

## Additional Hosted Backends

- Pod startup now seeds persistent `chatgpt` and `mistral` provider definitions into `openclaw.json` via the bootstrap init container.
- The bootstrap init container now resolves env-backed provider `apiKey` values before writing runtime config on the PVC because this OpenClaw build can otherwise send the literal string `env:...` during model calls.
- These providers are kept separate from the existing Ollama Cloud `openai/*` routing so your current defaults do not break.
- Optional providers with blank secrets are omitted from the runtime provider map and model catalog, so they no longer appear as selectable dead backends in Control UI.
- Bundled providers that are auth-profile-backed in OpenClaw (`openrouter`, `google`, `groq`, `huggingface`, `cerebras`) are now also written into each managed agent's `auth-profiles.json` as `keyRef` entries pointing at the pod env vars. This keeps non-main agents from losing provider auth during lane execution.
- Seeded Mistral refs are now biased toward the cheapest still-strong hosted options instead of the premium tiers.
- This keeps a low-cost general model, a stronger multimodal fallback, and two coding-focused options without paying for `mistral-large-*` or `magistral-medium-*` by default.
- Seeded Mistral refs are pinned to explicit versioned IDs instead of `*-latest` aliases so provider-side rotations do not silently change behavior.
- Seeded model refs available in OpenClaw after restart:
	- `chatgpt/gpt-4.1-mini`
	- `chatgpt/gpt-4.1`
	- `chatgpt/gpt-4o-mini`
	- `mistral/ministral-14b-2512`
	- `mistral/codestral-2508`
	- `mistral/mistral-medium-2508`
	- `mistral/devstral-2512`
	- `openrouter/free`
	- `google/gemini-2.5-flash-lite`
	- `google/gemini-2.5-flash`
	- `google/gemini-2.5-pro`
	- `groq/llama-3.1-8b-instant`
	- `groq/llama-3.3-70b-versatile`
	- `huggingface/Qwen/Qwen3-8B:cheapest`
	- `huggingface/deepseek-ai/DeepSeek-R1:fastest`
- The premium-priced `mistral-large-*` and `magistral-medium-*` seeds were intentionally removed from the default set.
- The older weak-budget `mistral-small-*` seeds remain intentionally excluded.
- If your OpenAI or Mistral account only exposes different model IDs, keep the provider wiring and adjust the seeded model names in `openclaw-bootstrap-configmap.yaml`.
- Bundled providers such as `openrouter`, `google`, `groq`, `huggingface`, and `cerebras` are activated by environment variables and curated model refs, not by persistent `models.providers.<id>` entries. If the key is blank, the provider stays hidden from the default catalog.
- The bootstrap now also seeds SecretRef-backed auth profiles for those bundled providers into every managed agent directory so `main`, `ops`, `research`, `homelab`, and `n8n-control` all resolve the same provider auth consistently.
- Cerebras remains wired via env/auth profiles, but its model seeds are currently hidden from the default OpenClaw catalog in this repo. On April 8, 2026, `gpt-oss-120b` returned provider `404 model_not_found`, while `llama3.1-8b` succeeded via direct API but still returned provider `400` through `openclaw infer model run`, so leaving Cerebras advertised in the default catalog would surface a broken option.

## n8n Skill Notes

- OpenClaw includes an `n8n` skill seeded onto the PVC at startup.
- Current verified behavior: list workflows, inspect workflow JSON, trigger manual runs, inspect executions.
- Read/query operations now include a bundled helper script (`n8n_query_helper.py`) to avoid repeated plan loops for simple lookups.
- For requests like "show GroupMe workflows", the recommended path is:
	- `python3 /home/user/.openclaw/skills/n8n/n8n_query_helper.py workflows --match groupme --limit 50`
- n8n read-query retry policy is intentionally strict to reduce loops and token burn:
	- one initial attempt
	- at most one retry on transport/auth errors
	- then stop and return the exact failure
- Live contract in this environment:
	- `PATCH /api/v1/workflows/{id}` returns `405 Method Not Allowed`
	- `PUT /api/v1/workflows/{id}` updates workflows when sent a sanitized full workflow body
	- `POST /api/v1/workflows` creates workflows with the same sanitized body shape
- Use the `n8n-editor` helper for durable updates/creates instead of hand-written raw calls.

### n8n Control Agent Profile

- OpenClaw now seeds a dedicated Control UI agent id `n8n-control` with workspace `workspace-n8n`.
- This profile is tuned for deterministic n8n operations and lower tool noise.
- Its workspace `AGENTS.md` constrains behavior to n8n tasks and enforces:
	- one direct helper path for list/filter queries
	- max one retry on auth/transport failure
	- no subagent spawning for simple n8n reads
- In Control UI, select the `n8n-control` agent when asking for workflow listings, GroupMe lookups, run status checks, or n8n workflow edits.

## n8n Editor Helper

- OpenClaw now also seeds an `n8n-editor` skill containing a Python helper at `/home/user/.openclaw/skills/n8n-editor/n8n_workflow_helper.py`.
- The helper uses the live, tested write path for this n8n build: `PUT /api/v1/workflows/{id}`.
- The helper supports both validated write paths for this n8n build:
	- update via `PUT /api/v1/workflows/{id}`
	- create via `POST /api/v1/workflows`
- It sanitizes workflow payloads before update so the agent only sends fields this n8n build accepts: `name`, `nodes`, `connections`, filtered `settings`, and optional `staticData` / `pinData`.
- Supported workflows updates include:
	- export a workflow into editable JSON
	- apply an edited JSON file back to n8n
	- create a new workflow from JSON
	- apply tested recipes such as `groupme-two-videos`
- Example usage inside the OpenClaw container:

```bash
python3 /home/user/.openclaw/skills/n8n-editor/n8n_workflow_helper.py export ldih2yDXF9sgHbt1 --output /tmp/groupme.json
python3 /home/user/.openclaw/skills/n8n-editor/n8n_workflow_helper.py apply-recipe ldih2yDXF9sgHbt1 groupme-two-videos
```

## Agent Bootstrap Cleanup

- Pod startup now runs a repo-managed bootstrap script before the main container starts.
- This prunes stale `BOOTSTRAP.md` and `HEARTBEAT.md` files from the PVC workspaces.
- The main workspace `AGENTS.md` is replaced with a lighter version that avoids auto-loading the large `MEMORY.md` on every chat.
- Skills are now reconciled in strict allowlist mode on every startup: old skill directories are removed and only allowlisted skills are reseeded from `/opt/bootstrap/skills`.
- Default allowlist is tuned for deterministic low-noise behavior: `n8n, n8n-editor, terminal, shell, filesystem, git, web-search, http, memory`.
- Any bundled skill not in `OPENCLAW_SKILL_ALLOWLIST` is excluded, including Apple/macOS/iOS-related skills.
- Per-agent runtime directories are now materialized at startup (`agents/<id>/agent` and `agents/<id>/sessions`) and all configured agents are normalized in config so selector-visible agents stay usable after restart.
- Agent models are normalized to stable provider refs:
	- `main`: `openai/kimi-k2.5`
	- `research`: `openai/kimi-k2.5`
	- `homelab`: `openai/kimi-k2.5`
	- `n8n-control`: `openai/kimi-k2.5`
	- `ops`: `openai/nemotron-3-super`
- Agent defaults are now token-tuned and deterministic on each restart:
	- model catalog is replaced with a small curated set (stale legacy model entries are removed)
	- `maxConcurrent` is set to `2`
	- deprecated keys rejected by newer OpenClaw builds are removed during bootstrap (`subagents.maxConcurrent`, `thinkingDefault`)
- Bootstrap now forces `commands.restart = false` so in-app restart requests do not flap the Kubernetes pod lifecycle.
- Bootstrap now forces `commands.native = false` and `commands.nativeSkills = false` so bundled native tools/skill catalogs are disabled.
- Bootstrap now hard-pins every agent's `skills` list to core homelab skills only: `n8n`, `n8n-editor`.
- Bootstrap removes stale `plugins` config entries from older runtimes to prevent plugin warning churn.
- Deployment sets `OPENCLAW_BUNDLED_PLUGINS_DIR=/home/user/.openclaw/skills` so discovery is limited to curated PVC-backed skills.
- Deployment also masks `/app/extensions` with an `emptyDir` volume (`bundled-extensions-mask`) to hide bundled built-in skill catalogs in pod runtime.
- Probes now accept both `200` and `401` on localhost gateway checks to stay healthy when auth state changes during startup.
- No chat-channel bindings are applied by default because the current deployment only exposes Control UI and has no external routed channels configured.

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n apps -l app=openclaw

# View logs
kubectl logs -n apps -l app=openclaw --tail=50

# Check if the gateway is responding
kubectl exec -n apps -it deploy/openclaw -- curl -s http://localhost:18789

# Verify repo-managed additional backends
kubectl -n apps exec deploy/openclaw -c openclaw -- openclaw config get models.providers.chatgpt
kubectl -n apps exec deploy/openclaw -c openclaw -- openclaw config get models.providers.mistral
kubectl -n apps exec deploy/openclaw -c openclaw -- openclaw models list
```
