# MCP Servers

Model Context Protocol (MCP) tools for OpenWebUI integration.

## Overview

| Component | Description | Port | Ingress Host |
|-----------|-------------|------|--------------|
| **mcpo** | MCP-to-OpenAPI proxy (Azure + Postgres MCP) | 8000 | `mcpo.k8s.local` |
| **RedisInsight** | Redis GUI | 5540 | `redisinsight.k8s.local` |

## MCP Servers Available

| Server | Route | Description |
|--------|-------|-------------|
| **Azure MCP** | `/azure` | Azure resource management tools |
| **Postgres MCP** | `/postgres` | Database inspection and query tools |

### Postgres MCP Tools

| Tool | Description |
|------|-------------|
| `list_tables` | List all tables in the connected database |
| `describe_table` | Get schema for a specific table |
| `query` | Execute read-only SQL queries |

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
git add -A && git commit -m "Deploy mcpo with Azure + Postgres MCP" && git push
flux reconcile kustomization apps --with-source
```

### 3. Configure OpenWebUI

1. Go to `http://openwebui.k8s.local`
2. Navigate to **Admin Settings** → **External Tools**
3. Click **"+"** to add a new tool server
4. Keep type as **OpenAPI**
5. Add **Azure MCP**: `http://mcpo.apps.svc.cluster.local:8000/azure`
6. Add **Postgres MCP**: `http://mcpo.apps.svc.cluster.local:8000/postgres`
7. Save

### 4. Test

**Check mcpo is running:**
```bash
kubectl get pods -n apps -l app=mcpo
kubectl logs -n apps -l app=mcpo --tail=50
```

**View OpenAPI specs:**
```bash
curl http://mcpo.k8s.local/azure/openapi.json
curl http://mcpo.k8s.local/postgres/openapi.json
```

**Test with OpenWebUI:**
- Ask: "List my Azure resource groups"
- Ask: "List all tables in my postgres database"
- Ask: "Describe the schema of the authentik_core_user table"

## Architecture

```
┌─────────────────┐     ┌─────────────────────────────────┐
│   OpenWebUI     │────►│           mcpo (:8000)          │
│   (LLM Chat)    │     │  ┌─────────┐    ┌────────────┐  │
└─────────────────┘     │  │ /azure  │    │ /postgres  │  │
                        │  └────┬────┘    └─────┬──────┘  │
                        └───────┼───────────────┼─────────┘
                                │               │
                                ▼               ▼
                        ┌─────────────┐  ┌─────────────┐
                        │ Azure APIs  │  │  PostgreSQL │
                        └─────────────┘  └─────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `mcpo-config.yaml` | ConfigMap with MCP server definitions |
| `mcpo-deployment.yaml` | mcpo proxy deployment and service |
| `redis-deployment.yaml` | Redis cache |
| `redisinsight-deployment.yaml` | Redis GUI |
| `ingress.yaml` | Ingress routes |

## Adding More MCP Servers

To add additional MCP servers, edit the `mcpo-config.yaml` ConfigMap:

```yaml
data:
  config.json: |
    {
      "mcpServers": {
        "azure": { ... },
        "postgres": { ... },
        "new-server": {
          "command": "npx",
          "args": ["-y", "@some/mcp-server", "arg1", "arg2"]
        }
      }
    }
```

After updating, restart the mcpo pod:
```bash
kubectl rollout restart deployment/mcpo -n apps
```

## References

- [mcpo](https://github.com/open-webui/mcpo)
- [Azure MCP](https://github.com/microsoft/mcp)
- [Postgres MCP](https://www.npmjs.com/package/@modelcontextprotocol/server-postgres)
- [OpenWebUI Tools](https://docs.openwebui.com/features/plugin/tools)
