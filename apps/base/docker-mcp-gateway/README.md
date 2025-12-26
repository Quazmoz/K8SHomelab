# Docker MCP Gateway

Docker's official Model Context Protocol (MCP) Gateway for orchestrating MCP servers.

## Overview

| Component | Description | Port | Ingress Host |
|-----------|-------------|------|--------------|
| **Docker MCP Gateway** | Official Docker MCP Gateway v0.34.0 | 8811 | `docker-mcp.k8s.local` |

## Quick Start

### 1. Create Storage Directory

```bash
ssh quinn-hpprobook430g6 "sudo mkdir -p /mnt/k8s-data/docker-mcp-gateway && sudo chmod 755 /mnt/k8s-data/docker-mcp-gateway"
```

### 2. Deploy via Flux

Push changes to Git and wait for Flux reconciliation (~10 minutes), or force reconcile:

```bash
flux reconcile kustomization apps --with-source
```

### 3. Add Hosts Entry (if not using DNS)

```bash
echo "<INGRESS_IP> docker-mcp.k8s.local" | sudo tee -a /etc/hosts
```

### 4. Access

| URL | Purpose |
|-----|---------|
| `http://docker-mcp.k8s.local` | Docker MCP Gateway UI |

## Configuration

Edit `docker-mcp-gateway-configmap.yaml` to configure your MCP server catalog.

## Resources

- **Requests**: 1Gi RAM, 500m CPU
- **Limits**: 4Gi RAM, 2000m CPU
- **Storage**: 20Gi persistent volume

## Upgrading

Check for new releases at https://github.com/docker/mcp-gateway/releases and update the image tag in `docker-mcp-gateway-deployment.yaml`.

## References

- [Docker MCP Gateway](https://github.com/docker/mcp-gateway)
- [Model Context Protocol](https://modelcontextprotocol.io/)
