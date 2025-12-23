# MCP Servers

Model Context Protocol (MCP) servers for AI tools like LM Studio and Claude Code.

## Overview

This namespace contains:

| Component | Description | Port | Ingress Host |
|-----------|-------------|------|--------------|
| **MCP Gateway (Unla)** | Central management UI for MCP servers | 80 (Web), 5235 (MCP) | `mcp-gateway.k8s.local`, `mcp.k8s.local` |
| **Azure MCP Server** | Interact with Azure resources | 3001 | `azure-mcp.k8s.local` |
| **Excel MCP Server** | Read/manipulate Excel/CSV files | 3000 | `excel-mcp.k8s.local` |

## Quick Start

### 1. Build and Push Docker Images

On your laptop or homelab machine with Docker installed:

```bash
cd apps/base/mcp-servers/build

# Login to Docker Hub
docker login

# Build and push all images
./build-and-push.sh
```

This creates:
- `quazmoz/azure-mcp:latest`
- `quazmoz/excel-mcp:latest`

### 2. Create Secrets

```bash
# Docker Hub credentials (for pulling private images)
kubectl create secret docker-registry dockerhub-regcred \
  --namespace mcp-servers \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=quazmoz \
  --docker-password=<YOUR_DOCKER_HUB_API_KEY> \
  --docker-email=<YOUR_EMAIL>

# MCP Gateway secrets
kubectl create secret generic mcp-gateway-secrets -n mcp-servers \
  --from-literal=jwt-secret-key=$(openssl rand -base64 32) \
  --from-literal=admin-password=<YOUR_SECURE_PASSWORD>

# Azure credentials (if using Azure MCP)
kubectl create secret generic azure-mcp-secrets -n mcp-servers \
  --from-literal=tenant-id=<TENANT_ID> \
  --from-literal=client-id=<CLIENT_ID> \
  --from-literal=client-secret=<CLIENT_SECRET> \
  --from-literal=subscription-id=<SUBSCRIPTION_ID>
```

### 3. Enable MCP Servers

Uncomment in `apps/base/kustomization.yaml`:

```yaml
  - ./mcp-servers
```

### 4. Deploy

```bash
# Trigger Flux reconciliation
flux reconcile kustomization apps --with-source

# Or apply manually
kubectl apply -k apps/base/mcp-servers
```

### 5. Access

| URL | Purpose |
|-----|---------|
| `http://mcp-gateway.k8s.local` | MCP Gateway Web UI |
| `http://mcp.k8s.local` | MCP SSE/HTTP endpoints for clients |
| `http://azure-mcp.k8s.local` | Direct Azure MCP access |

## MCP Gateway (Unla)

A lightweight gateway service with Web UI for managing MCP servers.

**Features:**
- Central management interface for all MCP servers
- SSE and HTTP transport support
- Session management and authentication
- Built-in MCP Chat for testing

**Default credentials:** `admin` / (password you set in secret)

## File Structure

```
mcp-servers/
├── build/
│   ├── Dockerfile.azure-mcp
│   ├── Dockerfile.excel-mcp
│   └── build-and-push.sh
├── azure-mcp-deployment.yaml
├── azure-mcp-service.yaml
├── azure-mcp-configmap.yaml
├── azure-mcp-secrets.yaml.template
├── excel-mcp-deployment.yaml
├── excel-mcp-service.yaml
├── excel-mcp-configmap.yaml
├── mcp-gateway-deployment.yaml
├── mcp-gateway-service.yaml
├── mcp-gateway-configmap.yaml
├── mcp-gateway-pvc.yaml
├── mcp-gateway-secrets.yaml.template
├── dockerhub-regcred-secret.yaml.template
├── ingress.yaml
├── namespace.yaml
└── kustomization.yaml
```

## Troubleshooting

```bash
# Check pods
./k8s.sh show_pods mcp-servers

# View logs
./k8s.sh show_pod_logs mcp-servers <pod-name>

# Describe pod for events
./k8s.sh describe_pod mcp-servers <pod-name>

# Test health endpoints
curl http://mcp-gateway.k8s.local/
curl http://azure-mcp.k8s.local/health
```

## References

- [MCP Gateway (Unla) Documentation](https://docs.unla.amoylab.com/)
- [Azure MCP Server](https://github.com/haris-musa/azure-mcp-server)
- [Excel MCP Server](https://github.com/haris-musa/excel-mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io/)
