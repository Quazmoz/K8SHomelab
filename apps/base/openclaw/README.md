# OpenClaw - Autonomous AI Agent

OpenClaw is an autonomous AI agent that can execute tasks, orchestrate tools, and operate continuously as a service.

## Deployment Details

| Setting | Value |
|---------|-------|
| **Image** | `ghcr.io/openclaw/openclaw:2026.3.28` (pinned to avoid `latest` regressions) |
| **Node** | `orangepi6plus` (with control-plane toleration) |
| **Gateway Port** | `18789` (WebSocket) |
| **Canvas Port** | `18793` (HTTP) |
| **Storage** | 5Gi PV on `/mnt/k8s-data/openclaw` |
| **Memory** | 512Mi request / 1Gi limit |
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

### 3. Encrypt the secret with SOPS
```bash
sops -e -i openclaw-credentials.secret.yaml
mv openclaw-credentials.secret.yaml openclaw-credentials.secret.enc.yaml
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

## n8n Skill Notes

- OpenClaw includes an `n8n` skill seeded onto the PVC at startup.
- Current verified behavior: list workflows, inspect workflow JSON, trigger manual runs, inspect executions.
- Current limitation: the live n8n instance rejects `PATCH /api/v1/workflows/{id}` with `405 Method Not Allowed`, so workflow edits and activation toggles should be treated as unsupported until a tested helper path is added.
- For workflow authoring or structural changes, use the n8n UI at `http://n8n.k8s.local` or add a dedicated helper script/tool instead of relying on pure prompt instructions.

## n8n Editor Helper

- OpenClaw now also seeds an `n8n-editor` skill containing a Python helper at `/home/user/.openclaw/skills/n8n-editor/n8n_workflow_helper.py`.
- The helper uses the live, tested write path for this n8n build: `PUT /api/v1/workflows/{id}`.
- It sanitizes workflow payloads before update so the agent only sends fields this n8n build accepts: `name`, `nodes`, `connections`, filtered `settings`, and optional `staticData` / `pinData`.
- Supported workflows updates include:
	- export a workflow into editable JSON
	- apply an edited JSON file back to n8n
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
- Agent models are normalized to stable provider refs:
	- `main`: `openai/kimi-k2.5`
	- `research`: `openai/kimi-k2.5`
	- `homelab`: `openai/kimi-k2.5`
	- `ops`: `openai/nemotron-3-super`
- No chat-channel bindings are applied by default because the current deployment only exposes Control UI and has no external routed channels configured.

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n apps -l app=openclaw

# View logs
kubectl logs -n apps -l app=openclaw --tail=50

# Check if the gateway is responding
kubectl exec -n apps -it deploy/openclaw -- curl -s http://localhost:18789
```
