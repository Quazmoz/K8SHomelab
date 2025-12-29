# MCP Servers

Model Context Protocol (MCP) servers for AI tools.

## Overview

| Component | Description | Port | Ingress Host |
|-----------|-------------|------|--------------|
| **MCP Gateway (Unla)** | Multi-container MCP management | 80 (Web), 5235 (MCP) | `mcp-gateway.k8s.local`, `mcp.k8s.local` |
| **RedisInsight** | Redis GUI | 5540 | `redisinsight.k8s.local` |

## Quick Start

### 1. Create MCP Gateway Secret

```bash
kubectl create secret generic mcp-gateway-secrets -n apps \
  --from-literal=jwt-secret-key=$(openssl rand -base64 32) \
  --from-literal=admin-password=<YOUR_PASSWORD>
```

### 2. Create Azure MCP Credentials

```bash
# Create Azure Service Principal (if not done)
az ad sp create-for-rbac --name "azure-mcp-homelab" --role contributor

# Create secret with the output values
kubectl create secret generic azure-mcp-credentials -n apps \
  --from-literal=AZURE_TENANT_ID=<tenant> \
  --from-literal=AZURE_CLIENT_ID=<appId> \
  --from-literal=AZURE_CLIENT_SECRET=<password>
```

### 3. Deploy

```bash
git add -A && git commit -m "Deploy multi-container Unla" && git push
flux reconcile kustomization apps --with-source
```

### 4. Access

| URL | Purpose |
|-----|---------|
| `http://mcp-gateway.k8s.local` | MCP Gateway Web UI (login: admin) |
| `http://mcp.k8s.local` | MCP SSE/HTTP endpoints |
| `http://redisinsight.k8s.local` | Redis database GUI |

---

## Connecting OpenWebUI to MCP

OpenWebUI v0.6.31+ has native MCP support.

### Step 1: Add MCP Server in Unla

1. Go to `http://mcp-gateway.k8s.local`
2. Login as admin
3. Click "Create" → Add new MCP server
4. Use Form Mode or YAML:

```yaml
name: "azure-mcp"
tenant: "default"
routers:
  - server: "azure-mcp"
    prefix: "/gateway/azure"
mcpServers:
  - type: "stdio"
    name: "azure-mcp"
    command: "npx"
    args: ["-y", "@azure/mcp@latest", "server", "start"]
    env:
      AZURE_TENANT_ID: '{{ env "AZURE_TENANT_ID" }}'
      AZURE_CLIENT_ID: '{{ env "AZURE_CLIENT_ID" }}'
      AZURE_CLIENT_SECRET: '{{ env "AZURE_CLIENT_SECRET" }}'
```

### Step 2: Configure OpenWebUI

1. Go to `http://openwebui.k8s.local`
2. Navigate to **Admin Settings** → **External Tools** → **MCP**
3. Add new MCP server:
   - **URL**: `http://mcp-gateway.apps.svc.cluster.local:5235/gateway/azure/mcp`
   - **Name**: Azure MCP
4. Save and test

### Step 3: Use MCP Tools

When chatting in OpenWebUI, the Azure MCP tools will be available if your LLM provider supports tool calling (e.g., OpenAI, Anthropic).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Gateway Pod                          │
├───────────────┬───────────────┬─────────────────────────────┤
│   apiserver   │  mcp-gateway  │           web               │
│   (5234)      │  (5235/5335)  │           (80)              │
├───────────────┴───────────────┴─────────────────────────────┤
│                    Shared SQLite (PVC)                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                  ┌─────────────────┐
                  │     Redis       │
                  │     (6379)      │
                  └─────────────────┘
```

## File Structure

```
mcp-servers/
├── mcp-gateway-deployment.yaml   # Multi-container deployment
├── mcp-gateway-service.yaml
├── mcp-gateway-configmap.yaml
├── mcp-gateway-pvc.yaml
├── redis-deployment.yaml
├── redisinsight-deployment.yaml
├── ingress.yaml
└── kustomization.yaml
```

## References

- [MCP Gateway (Unla)](https://docs.unla.amoylab.com/)
- [OpenWebUI MCP Support](https://docs.openwebui.com/features/mcp)
- [Azure MCP Server](https://github.com/microsoft/mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
