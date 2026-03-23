# AI Context: OpenClaw

## Purpose
OpenClaw runs as an autonomous agent service in the `apps` namespace and is exposed through ingress at `openclaw.k8s.local`.

## Runtime Notes
- The container binds gateway traffic to loopback and uses a `socat` sidecar to expose traffic to Kubernetes networking.
- Device identity and pairing are required by the Control UI.
- TLS is enabled at ingress for secure-context browser requirements.

## Credentials
- Secrets are sourced from `openclaw-credentials`.
- `OPENAI_API_KEY` is provided for OpenAI-compatible mode.
- `OLLAMA_API_KEY` is also exported (mapped to the same secret key) so native Ollama provider auth can work without extra secret wiring.

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
