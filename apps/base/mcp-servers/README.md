# MCP Servers

Model Context Protocol (MCP) tools for OpenWebUI integration via **Context Forge** and **MCPO**.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           OpenWebUI                                 │
│  (Workspace → Tools → Auth Registration for GroupMe)               │
└─────────────────────────────────────────────────────────────────────┘
                    ↓                           ↓
        ┌──────────────────────────┐   ┌──────────────────┐
        │   Context Forge          │   │      MCPO        │
        │   (MCP Gateway)          │   │  (OpenAPI Proxy) │
        ├──────────────────────────┤   ├──────────────────┤
        │ - GroupMe (per-user auth)│   │ - Postgres       │
        │ - Azure (HTTP)           │   │ - Kubernetes     │
        │ - ClickUp (SSE)          │   │ - Prometheus     │
        │ Port: 4444               │   │ - FreshRSS       │
        │ URL: mcp.k8s.local       │   │ - n8n            │
        │                          │   │ Port: 8000       │
        │                          │   │ URL: mcpo.k8s.lo │
        └──────────────────────────┘   └──────────────────┘
```

## Directory Structure

```
mcp-servers/
├── contextforge/              # Context Forge gateway + custom MCP servers
│   ├── context-forge.yaml           # Main deployment, service, ingress
│   ├── context-forge-servers.yaml   # Server registration config
│   ├── context-forge-rbac.yaml      # RBAC for Kubernetes access
│   ├── context-forge-init.yaml      # Auto-registration job
│   ├── groupme-backend.yaml         # GroupMe SSE backend (per-user auth)
│   ├── clickup-mcp-server.yaml      # ClickUp SSE server
│   ├── azure-mcp-go-deployment.yaml # Azure HTTP server
│   ├── groupme-netpol.yaml          # Network policies
│   └── openwebui-context-forge.json # OpenWebUI config (primary entry point)
│
├── mcpo/                      # MCPO proxy + Node.js MCP servers
│   ├── mcpo-config.yaml             # MCPO configuration
│   ├── mcpo-deployment.yaml         # Deployment + service
│   ├── mcpo-rbac.yaml               # RBAC for Kubernetes access
│   ├── ingress.yaml                 # Ingress for mcpo.k8s.local
│   ├── openwebui-postgres-mcp.json  # OpenWebUI config
│   ├── openwebui-kubernetes-mcp.json
│   ├── openwebui-prometheus-mcp.json
│   ├── openwebui-freshrss-mcp.json
│   └── openwebui-n8n-mcp.json
│
├── legacy/                    # Deprecated/disabled resources
│   ├── tanium-mcp-server.yaml       # Tanium server (disabled)
│   ├── openwebui-tanium-mcp.json    # Tanium config (disabled)
│   └── clickup-openapi.json         # Reference OpenAPI spec
│
├── kustomization.yaml         # Main kustomization (Flux sync)
├── README.md                  # This file
└── AUTH_WORKFLOW.md          # Per-user authentication details
```

## System Architecture

### Context Forge (Primary Gateway)
- **Purpose**: Centralized MCP gateway with per-user authentication
- **Servers**:
  - **GroupMe** (SSE) - Custom backend with token encryption in Postgres
  - **Azure** (HTTP) - Cloud resource management  
  - **ClickUp** (SSE) - Task management
- **Authentication**: JWT tokens, per-user header passthrough for GroupMe
- **Port**: 4444 (internal cluster)
- **Public URL**: `mcp.k8s.local`

### MCPO (Node.js Tools Proxy)
- **Purpose**: Expose Node.js-based MCP servers as OpenAPI endpoints
- **Servers**:
  - **Postgres** - Database inspection and queries
  - **Kubernetes** - Cluster resource management
  - **Prometheus** - Metrics and alerting queries
  - **FreshRSS** - RSS feed reading
  - **n8n** - Workflow automation
- **Port**: 8000 (internal cluster)
- **Public URL**: `mcpo.k8s.local`

### No Overlap
✅ Each server lives in ONE location only
✅ No duplicate registrations between Context Forge and MCPO
✅ Clear separation of concerns

## OpenWebUI Configuration

### Setup in OpenWebUI

Import tool configs in OpenWebUI (`Workspace → Tools`):

1. **Context Forge** (Primary gateway)
   - File: `contextforge/openwebui-context-forge.json`
   - Provides: GroupMe, Azure, ClickUp tools
   - Auth: Basic (admin:password)

2. **MCPO** (Node.js tools)
   - Files: `mcpo/openwebui-*.json`
   - Provides: Postgres, Kubernetes, Prometheus, FreshRSS, n8n

### Per-User Authentication (GroupMe)

GroupMe requires per-user token registration:

1. Go to **Workspace → Tools → Auth Registration** (GroupMe tool settings)
2. Paste your GroupMe token in **REGISTRATION_TOKEN**
3. In chat, message: `Register Token`
4. Backend securely stores your encrypted token in Postgres
5. All future GroupMe calls use your token (auto-decrypted)

See [AUTH_WORKFLOW.md](AUTH_WORKFLOW.md) for detailed flow.

## Flux Sync

Kustomization includes all resources in proper directory structure:
- Context Forge: `contextforge/*`
- MCPO: `mcpo/*`
- Legacy (disabled): `legacy/*`

Flux will auto-sync on commit to main branch.
| **ClickUp** | MCP Server | 5000 | `http://clickup-mcp-server.apps.svc.cluster.local:5000` | None (Shared Key) |

## Quick Start for GroupMe Auth

1.  **Configure Token**:
    *   In OpenWebUI, go to **Workspace** -> **Tools** -> **Auth Registration**.
    *   Click the **Gear Icon** (User Settings).
    *   Paste your GroupMe Access Token in `REGISTRATION_TOKEN`.
    *   Click **Save**.

2.  **Register**:
    *   Open a new chat.
    *   Type: **"Register my GroupMe token"**.
    *   Wait for success message.

3.  **Cleanup**:
    *   Go back to **Workspace** -> **Tools** -> **Auth Registration** settings.
    *   Delete your token from `REGISTRATION_TOKEN` (it's now safely stored in the backend).

4.  **Use Tools**:
    *   "List my GroupMe groups"
    *   "Send a message to 'Family': Hello!"
