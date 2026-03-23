# OpenClaw - Autonomous AI Agent

OpenClaw is an autonomous AI agent that can execute tasks, orchestrate tools, and operate continuously as a service.

## Deployment Details

| Setting | Value |
|---------|-------|
| **Image** | `ghcr.io/openclaw/openclaw:latest` (ARM64 multi-arch) |
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

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n apps -l app=openclaw

# View logs
kubectl logs -n apps -l app=openclaw --tail=50

# Check if the gateway is responding
kubectl exec -n apps -it deploy/openclaw -- curl -s http://localhost:18789
```
