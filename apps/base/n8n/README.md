# n8n Workflow Automation

## Overview

n8n is a workflow automation platform used for building integrations, RAG pipelines, and MCP-connected automations. Provides a visual workflow editor.

## Access

- **URL:** [http://n8n.k8s.local](http://n8n.k8s.local)

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `n8nio/n8n:2.8.3` |
| **Port** | 5678 |
| **Storage** | 15Gi PVC (`local-storage`) |
| **Node** | `quinn-hpprobook430g6` |
| **Resources** | Requests: 256Mi/100m, Limits: 2Gi/2000m |
| **MCP** | Enabled (`N8N_MCP_ENABLED=true`) |
| **Timezone** | `America/New_York` |

## Features

- Visual workflow builder
- MCP integration enabled
- GroupMe bot workflows (via optional secret)
- LangChain RAG workflows
- Interview agent workflows

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `n8n-deployment.yaml` | Deployment with env vars and health checks |
| `n8n-service.yaml` | ClusterIP service on port 5678 |
| `n8n-ingress.yaml` | Ingress for `n8n.k8s.local` (50m body size) |
| `n8n-pv.yaml` | PersistentVolume (15Gi) |
| `n8n-pvc.yaml` | PersistentVolumeClaim |
| `n8n-configmap.yaml` | Environment configuration |
| `n8n-groupme-workflows.yaml` | GroupMe bot workflow definitions |
| `n8n-langchain-rag-workflow.yaml` | RAG workflow definitions |
| `n8n-interview-agent-workflows.yaml` | Interview agent workflow |
| `workflows/` | Additional workflow JSON files |

## Troubleshooting

```bash
# Check pod
kubectl get pods -n apps -l app=n8n

# View logs
kubectl logs -n apps -l app=n8n --tail=100

# Health check
curl http://n8n.k8s.local/healthz
```

## Configuring OAuth APIs (Google, etc.)

When setting up external OAuth integrations (such as the Gmail OAuth2 API), you may encounter strict security policies from providers like Google:

1. **HTTPS and Domain Requirements:** Google strictly requires `https://` callbacks and will completely block local domains (like `.local`) or private IPs in their "Authorized redirect URIs" settings.
2. **The `nip.io` Workaround:** To satisfy Google's public TLD requirement within a homelab environment without a real domain, we use `nip.io` (a wildcard DNS service that resolves to the IP inside it).
    - Example: Instead of `n8n.k8s.local`, we use `n8n.<CLUSTER_IP>.nip.io` (e.g., `n8n.192.168.1.221.nip.io`).
    - The `n8n-ingress.yaml` has been configured with this `nip.io` hostname under both the `rules` and the `tls` block so it is served via HTTPS.
    - The `n8n-configmap.yaml` has its `N8N_HOST`, `N8N_EDITOR_BASE_URL`, and `WEBHOOK_URL` updated to `https://n8n.<CLUSTER_IP>.nip.io` so n8n internally generates the matching callback URLs for OAuth.
3. **The "Unauthorized" Callback Error:** n8n v2+ introduced a very strict security policy that verifies your browser's session cookie during the precise moment of the OAuth callback. Often, your browser will drop the session cookie during the redirect from Google, resulting in a blank page with `{"status":"error","message":"Unauthorized"}`.
    - We bypass this by keeping `N8N_SKIP_AUTH_ON_OAUTH_CALLBACK="true"` in the `n8n-configmap.yaml`. This allows n8n to securely save the generated tokens from Google without strictly verifying session cookies mid-flight. 
    
**Flow to add a new API:** 
- Open n8n from `https://n8n.<CLUSTER_IP>.nip.io`
- Generate your Credential in the n8n UI, copy the provided OAuth Redirect URL.
- Paste it exactly into your OAuth App settings (e.g., Google Cloud Console Web Application).
- Click "Sign in with Google," and the tokens will capture seamlessly!
