# MCP Servers

Model Context Protocol (MCP) servers for AI tools.

## Overview

| Component | Description | Port | Ingress Host |
|-----------|-------------|------|--------------|
| **MCP Gateway (Unla)** | Central management UI for MCP servers | 80 (Web), 5235 (MCP) | `mcp-gateway.k8s.local`, `mcp.k8s.local` |
| **Azure MCP Server** | Microsoft's official Azure AI tools | 5010 | Internal service |
| **RedisInsight** | Redis GUI | 5540 | `redisinsight.k8s.local` |

## Quick Start

### 1. Create MCP Gateway Secret

```bash
kubectl create secret generic mcp-gateway-secrets -n apps \
  --from-literal=jwt-secret-key=$(openssl rand -base64 32) \
  --from-literal=admin-password=<YOUR_PASSWORD>
```

### 2. Create Azure MCP Credentials

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

### 3. Create Storage Directory

```bash
ssh quinn-hpprobook430g6 "sudo mkdir -p /mnt/k8s-data/azure-mcp-server && sudo chmod 755 /mnt/k8s-data/azure-mcp-server"
```

### 4. Access

| URL | Purpose |
|-----|---------| 
| `http://mcp-gateway.k8s.local` | MCP Gateway Web UI (login: admin) |
| `http://mcp.k8s.local` | MCP SSE/HTTP endpoints for clients |
| `http://redisinsight.k8s.local` | Redis database GUI |

## Azure MCP Server

The Azure MCP Server (`mcr.microsoft.com/azure-sdk/azure-mcp`) provides AI-powered access to Azure services:

- Azure Resource Management
- Azure AI Search, AI Services, Foundry
- Azure App Service, Container Apps, AKS
- Azure Cosmos DB, SQL Database, Storage
- Azure Key Vault, Monitor
- And many more...

### Connecting to Azure MCP Server

Configure your MCP client to connect to:
```
http://azure-mcp-server.apps.svc.cluster.local:5010
```

## File Structure

```
mcp-servers/
├── mcp-gateway-deployment.yaml      # Unla MCP Gateway
├── mcp-gateway-service.yaml
├── mcp-gateway-configmap.yaml
├── mcp-gateway-pvc.yaml
├── mcp-gateway-secrets.yaml.template
├── azure-mcp-server-deployment.yaml # Azure MCP Server
├── azure-mcp-credentials.yaml.template
├── redis-deployment.yaml
├── redisinsight-deployment.yaml
├── ingress.yaml
└── kustomization.yaml
```

## References

- [MCP Gateway (Unla)](https://docs.unla.amoylab.com/)
- [Azure MCP Server](https://github.com/microsoft/mcp/tree/main/servers/Azure.Mcp.Server)
- [Azure MCP Documentation](https://learn.microsoft.com/azure/developer/azure-mcp-server/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
