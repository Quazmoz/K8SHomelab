# MCP Servers

Model Context Protocol (MCP) servers for AI tools.

## Overview

| Component | Description | Port | Ingress Host |
|-----------|-------------|------|--------------|
| **MCP Gateway (Unla)** | Central management UI for MCP servers | 80 (Web), 5235 (SSE) | `mcp-gateway.k8s.local`, `mcp.k8s.local` |
| **Azure MCP** | Azure tools via Unla subprocess | stdio | Via MCP Gateway |
| **RedisInsight** | Redis GUI | 5540 | `redisinsight.k8s.local` |

## Quick Start

### 1. Create MCP Gateway Secret

```bash
kubectl create secret generic mcp-gateway-secrets -n apps \
  --from-literal=jwt-secret-key=$(openssl rand -base64 32) \
  --from-literal=admin-password=<YOUR_PASSWORD>
```

### 2. Create Azure MCP Credentials (Optional)

Create an Azure Service Principal:
```bash
az ad sp create-for-rbac --name "azure-mcp-k8s" --role contributor
```

Then create the secret with the output values:
```bash
kubectl create secret generic azure-mcp-credentials -n apps \
  --from-literal=AZURE_TENANT_ID=<tenant> \
  --from-literal=AZURE_CLIENT_ID=<appId> \
  --from-literal=AZURE_CLIENT_SECRET=<password>
```

### 3. Access

| URL | Purpose |
|-----|---------|
| `http://mcp-gateway.k8s.local` | MCP Gateway Web UI (login: admin) |
| `http://mcp.k8s.local` | MCP SSE/HTTP endpoints for clients |
| `http://redisinsight.k8s.local` | Redis database GUI |

## Adding MCP Servers via GitOps

MCP servers can be managed through GitOps by editing `mcp-servers-config.yaml`:

### Supported Server Types

1. **stdio** - Runs as a subprocess (e.g., npx commands)
2. **sse** - Connects to remote SSE MCP server  
3. **streamable-http** - Connects to remote HTTP MCP server

### Example: Adding a New MCP Server

Edit `mcp-servers-config.yaml`:

```yaml
mcpServers:
  # Existing servers...
  
  # Add new stdio server
  - type: "stdio"
    name: "my-custom-server"
    command: "npx"
    args:
      - "-y"
      - "@example/mcp-server"
    env:
      API_KEY: "{{ env \"MY_API_KEY\" }}"

routers:
  # Add router for new server
  - server: "my-custom-server"
    prefix: "/gateway/custom"
    cors:
      allowOrigins: ["*"]
      allowMethods: ["GET", "POST", "OPTIONS"]
      allowHeaders: ["Content-Type", "Authorization", "Mcp-Session-Id"]
      exposeHeaders: ["Mcp-Session-Id"]
      allowCredentials: true
```

Then commit and push - Flux will apply the changes.

## Connecting MCP Clients

### Claude Desktop / Cursor

Configure your client to use the SSE endpoint:
```
http://mcp.k8s.local/gateway/azure/sse
```

### Available Endpoints

| Server | SSE Endpoint |
|--------|--------------|
| Azure MCP | `http://mcp.k8s.local/gateway/azure/sse` |
| Filesystem | `http://mcp.k8s.local/gateway/filesystem/sse` |

## File Structure

```
mcp-servers/
├── mcp-gateway-deployment.yaml       # Unla MCP Gateway
├── mcp-gateway-service.yaml
├── mcp-gateway-configmap.yaml
├── mcp-gateway-pvc.yaml
├── mcp-gateway-secrets.yaml.template
├── mcp-servers-config.yaml           # GitOps MCP server definitions
├── azure-mcp-credentials.yaml.template
├── redis-deployment.yaml
├── redisinsight-deployment.yaml
├── ingress.yaml
└── kustomization.yaml
```

## References

- [MCP Gateway (Unla) Docs](https://docs.unla.amoylab.com/)
- [Unla Gateway Configuration](https://docs.unla.amoylab.com/en/configuration/gateways)
- [Azure MCP Server](https://github.com/microsoft/mcp/tree/main/servers/Azure.Mcp.Server)
- [Model Context Protocol](https://modelcontextprotocol.io/)
