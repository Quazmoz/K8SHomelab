# MCP Servers

Model Context Protocol (MCP) servers for AI tools.

## Overview

| Component | Description | Port | Ingress Host |
|-----------|-------------|------|--------------|
| **MCP Gateway (Unla)** | Central management UI for MCP servers | 80 (Web), 5235 (MCP) | `mcp-gateway.k8s.local`, `mcp.k8s.local` |
| **Web Search MCP** | Free Google search, no API keys | 3002 | `websearch-mcp.k8s.local` |

## Quick Start

### 1. Create MCP Gateway Secret

```bash
kubectl create secret generic mcp-gateway-secrets -n mcp-servers \
  --from-literal=jwt-secret-key=$(openssl rand -base64 32) \
  --from-literal=admin-password=<YOUR_PASSWORD>
```

### 2. Access

| URL | Purpose |
|-----|---------|
| `http://mcp-gateway.k8s.local` | MCP Gateway Web UI (login: admin) |
| `http://mcp.k8s.local` | MCP SSE/HTTP endpoints for clients |
| `http://websearch-mcp.k8s.local` | Web Search MCP direct access |

## File Structure

```
mcp-servers/
├── mcp-gateway-deployment.yaml
├── mcp-gateway-service.yaml
├── mcp-gateway-configmap.yaml
├── mcp-gateway-pvc.yaml
├── mcp-gateway-secrets.yaml.template
├── websearch-mcp-deployment.yaml
├── ingress.yaml
├── namespace.yaml
└── kustomization.yaml
```

## References

- [MCP Gateway (Unla)](https://docs.unla.amoylab.com/)
- [Web Search MCP](https://github.com/pskill9/web-search)
- [Model Context Protocol](https://modelcontextprotocol.io/)
