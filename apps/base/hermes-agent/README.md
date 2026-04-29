# Hermes Agent Deployment

This directory contains the GitOps-ready manifests for the Hermes Agent, configured to mirror the existing OpenClaw deployment patterns.

## Discovery & Mapping

### LLM Backend Logic
Hermes has been configured to replicate the OpenClaw provider structure:
- **Primary Provider:** Ollama Cloud via OpenAI-compatible endpoint (`https://ollama.com/v1`).
- **Primary Model:** `kimi-k2.5` (matches OpenClaw `main` agent).
- **Fallback Provider:** OpenRouter (referenced via `OPENROUTER_API_KEY`).
- **Secondary Providers:** Google/Gemini, Groq, Mistral, Cerebras, and OpenAI Platform keys are all injected via environment variables, reusing the existing `openclaw-credentials` secret.

### Environment Variable Patterns
All provider-specific environment variables (`OPENAI_API_KEY`, `GEMINI_API_KEY`, etc.) are mapped directly from the `openclaw-credentials` secret, ensuring zero duplication of sensitive data.

### Storage & Persistence
- **PVC:** `hermes-agent-data-pvc` (5Gi, `local-storage`) stores the SQLite memory database, configuration, and skills.
- **Init Container:** `seed-config` ensures the `config.yaml` from Git (via ConfigMap) is placed on the PVC at every boot.

## Manifests

| File | Purpose |
|------|---------|
| `hermes-agent-deployment.yaml` | Main deployment, co-located on `orangepi6plus`. |
| `hermes-agent-configmap.yaml` | Non-secret `config.yaml` with provider mappings. |
| `hermes-agent-pvc.yaml` | Persistent storage for memory and state. |
| `hermes-agent-service.yaml` | Internal ClusterIP service (port 8642). |
| `hermes-agent-ingress.yaml` | External access via `hermes.k8s.local`. |
| `hermes-agent-credentials.secret.enc.yaml` | SOPS stub for the gateway bearer token. |
| `hermes-agent-validation-job.yaml` | Test job to verify health and LLM connectivity. |

## Deployment Instructions

1. **Configure Secrets:**
   Open the secret stub and set a secure `API_SERVER_KEY`:
   ```bash
   .\scripts\sops-edit.ps1 apps\base\hermes-agent\hermes-agent-credentials.secret.enc.yaml
   ```

2. **Apply Manifests:**
   The manifests are already integrated into the base kustomization.
   ```bash
   kubectl apply -k apps/base/hermes-agent
   ```

3. **Validate:**
   Run the validation job to confirm primary and fallback backends are functional:
   ```bash
   kubectl apply -f apps/base/hermes-agent/hermes-agent-validation-job.yaml
   kubectl -n apps logs job/hermes-validation
   ```

## Assumptions & Differences
- **Terminal Backend:** Set to `none` by default for safety. If you want Hermes to execute code in a sidecar, update `config.yaml` to `terminal.backend: docker`.
- **API Server:** Enabled on port 8642 with bearer token authentication.
- **ARM64:** The deployment is pinned to `nousresearch/hermes-agent:v2026.4.23` which has verified ARM64 support.
