# AI Context: OpenClaw

## Purpose
OpenClaw runs as an autonomous agent service in the `apps` namespace and is exposed through ingress at `openclaw.k8s.local`.

## Runtime Notes
- The container binds gateway traffic to loopback and uses a `socat` sidecar to expose traffic to Kubernetes networking.
- Device identity and pairing are required by the Control UI.
- TLS is enabled at ingress for secure-context browser requirements.
- `HOME` is explicitly set to `/home/user` so that OpenClaw's memory workspace (`~/.openclaw/workspace/`) resolves to the PVC mount, not ephemeral storage.

## Memory System
- Provider: `local` (on-device embeddings via node-llama-cpp, no external API needed)
- Model: `nomic-embed-text-v1.5.Q8_0.gguf` (~146MB, cached on PVC at `~/.openclaw/model-cache/`)
- Memory files: `~/.openclaw/workspace/memory/*.md`
- Fallback: `none` (prevents accidental OpenAI API calls with the Ollama Cloud key)
- Config path: `agents.defaults.memorySearch` in `openclaw.json`

## Credentials
- Secrets are sourced from `openclaw-credentials`.
- `OPENAI_API_KEY` is provided for OpenAI-compatible mode (actually an Ollama Cloud key).
- `OLLAMA_API_KEY` is also exported (mapped to the same secret key) so native Ollama provider auth can work without extra secret wiring.
- **Important:** The `OPENAI_API_KEY` is NOT a real OpenAI key. Do not use `auto` or `openai` as the memory embedding provider — it will 401.

## Ollama Cloud Configuration
To use native Ollama provider mode in this build:

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
