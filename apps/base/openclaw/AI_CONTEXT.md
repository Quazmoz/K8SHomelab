# AI Context: OpenClaw

## Purpose
OpenClaw runs as an autonomous agent service in the `apps` namespace and is exposed through ingress at `openclaw.k8s.local`.

## Runtime Notes
- The container binds gateway traffic to loopback and uses a `socat` sidecar to expose traffic to Kubernetes networking.
- Device identity and pairing are required by the Control UI.
- TLS is enabled at ingress for secure-context browser requirements.
- `HOME` is explicitly set to `/home/user` so that OpenClaw's memory workspace (`~/.openclaw/workspace/`) resolves to the PVC mount, not ephemeral storage.
- Deployment image is pinned to `ghcr.io/openclaw/openclaw:2026.3.28` to avoid `latest` regressions.

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
| `n8n` | `openclaw-n8n-skill` | List, trigger, activate, deactivate n8n workflows; query executions |

### n8n Skill Details
- **ConfigMap:** `apps/base/openclaw/n8n-skill-configmap.yaml`
- **Env vars injected:** `N8N_BASE_URL` (`http://n8n.apps.svc.cluster.local:5678`), `N8N_API_KEY` (from `openclaw-credentials` secret key `N8N_API_KEY`)
- **To add the API key:** Decrypt the SOPS secret, add `N8N_API_KEY: <key>`, re-encrypt. Generate the key in n8n **Settings → API → Create an API key**.
- **Skill path on PVC:** `/home/user/.openclaw/skills/n8n/SKILL.md`

## Credentials
- Secrets are sourced from `openclaw-credentials`.
- `OPENAI_API_KEY` is provided for OpenAI-compatible mode (actually an Ollama Cloud key).
- `OLLAMA_API_KEY` is also exported (mapped to the same secret key) so native Ollama provider auth can work without extra secret wiring.
- **Important:** The `OPENAI_API_KEY` is NOT a real OpenAI key. Do not use `auto` or `openai` as the memory embedding provider — it will 401.

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
kubectl -n apps exec deploy/openclaw -c openclaw -- openclaw config get models.providers.ollama
kubectl -n apps exec deploy/openclaw -c openclaw -- openclaw models list
```
