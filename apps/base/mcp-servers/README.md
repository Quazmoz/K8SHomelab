# MCP Servers

Model Context Protocol (MCP) tools for OpenWebUI integration.

## Overview

| Component | Description | Port | Ingress Host |
|-----------|-------------|------|--------------|
| **mcpo** | MCP-to-OpenAPI proxy (Azure MCP) | 8000 | `mcpo.k8s.local` |
| **RedisInsight** | Redis GUI | 5540 | `redisinsight.k8s.local` |

## Quick Start

### 1. Create Azure Credentials

```bash
# Create Azure Service Principal
az ad sp create-for-rbac --name "azure-mcp-homelab" --role contributor

# Create Kubernetes secret with the output
kubectl create secret generic azure-mcp-credentials -n apps \
  --from-literal=AZURE_TENANT_ID=<tenant> \
  --from-literal=AZURE_CLIENT_ID=<appId> \
  --from-literal=AZURE_CLIENT_SECRET=<password>
```

### 2. Deploy

```bash
git add -A && git commit -m "Deploy mcpo with Azure MCP" && git push
flux reconcile kustomization apps --with-source
```

### 3. Configure OpenWebUI

1. Go to `http://openwebui.k8s.local`
2. Navigate to **Admin Settings** → **External Tools**
3. Click **"+"** to add a new tool server
4. Keep type as **OpenAPI** (mcpo exposes an OpenAPI endpoint)
5. Enter URL: `http://mcpo.apps.svc.cluster.local:8000`
6. Save

### 4. Test

- Check mcpo is running: `kubectl get pods -n apps -l app=mcpo`
- View OpenAPI spec: `curl http://mcpo.k8s.local/openapi.json`
- Test with OpenWebUI: Ask a model to "list my Azure resource groups"

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   OpenWebUI     │────►│      mcpo       │────►│   Azure MCP     │
│   (LLM Chat)    │     │   (OpenAPI)     │     │   (stdio)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   Azure APIs    │
                        └─────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `mcpo-deployment.yaml` | mcpo with Azure MCP |
| `redis-deployment.yaml` | Redis cache |
| `redisinsight-deployment.yaml` | Redis GUI |
| `ingress.yaml` | Ingress routes |

## References

- [mcpo](https://github.com/open-webui/mcpo)
- [Azure MCP](https://github.com/microsoft/mcp)
- [OpenWebUI Tools](https://docs.openwebui.com/features/plugin/tools)
