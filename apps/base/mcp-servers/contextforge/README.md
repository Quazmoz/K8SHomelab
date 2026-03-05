# Context Forge — MCP Server Registration Guide

This guide walks you through manually registering the homelab MCP servers inside Context Forge's admin UI.

## Prerequisites

| Requirement | Details |
|---|---|
| **Context Forge URL** | `http://mcp.k8s.local` |
| **Admin Login** | `admin@k8s.local` / *(your password)* |
| **Backend Pods Running** | All three MCP server pods must be healthy before registering |

Verify backend pods are running:

```bash
kubectl get pods -n apps | grep -E "azure-mcp-go|groupme-backend|clickup-mcp-server"
```

---

## Step 1 — Log In to Context Forge

1. Open **http://mcp.k8s.local** in your browser
2. Sign in with `admin@k8s.local` and your password
3. You'll land on the **System Overview** dashboard

---

## Step 2 — Register Backend MCP Servers

Click **MCP Servers** in the left sidebar. Scroll down to the **"Add New MCP Server or Gateway"** form.

Register each server below using the exact values. After filling in each form, click **Add Gateway** to save.

### Server 1: Azure MCP (Go)

| Field | Value |
|---|---|
| **MCP Server Name** | `azure-go` |
| **MCP Server URL** | `http://azure-mcp-go.apps.svc.cluster.local:8080/mcp` |
| **Description** | `Azure Cloud Management (Go)` |
| **Tags** | `azure, cloud, infrastructure` |
| **Visibility** | `Public` |
| **Transport Type** | `HTTP` |
| **Authentication Type** | `None` |
| **Passthrough Headers** | *(leave empty)* |

### Server 2: GroupMe

| Field | Value |
|---|---|
| **MCP Server Name** | `groupme` |
| **MCP Server URL** | `http://groupme-backend.apps.svc.cluster.local:5000/mcp` |
| **Description** | `GroupMe messaging (per-user auth)` |
| **Tags** | `groupme, messaging, social` |
| **Visibility** | `Public` |
| **Transport Type** | `Streamable` |
| **Authentication Type** | `None` |
| **Passthrough Headers** | `X-Authenticated-User` |

> [!NOTE]
> GroupMe uses **per-user authentication**. Users register their own GroupMe tokens
> via the `Auth Registration` tool inside OpenWebUI. The `X-Authenticated-User` header
> passthrough is required so the backend can identify which user's token to use.

### Server 3: ClickUp

| Field | Value |
|---|---|
| **MCP Server Name** | `clickup-native` |
| **MCP Server URL** | `http://clickup-mcp-server.apps.svc.cluster.local:5000/mcp` |
| **Description** | `ClickUp project management` |
| **Tags** | `clickup, project-management, tasks` |
| **Visibility** | `Public` |
| **Transport Type** | `HTTP` |
| **Authentication Type** | `None` |
| **Passthrough Headers** | *(leave empty)* |

---

## Step 3 — Verify Registration

After registering all three servers, the **MCP Servers** page should show them in the list. Context Forge will automatically discover the available tools from each backend.

You can verify connectivity by clicking on each server card — a green status indicator means the backend is reachable.

---

## Step 4 — Create Virtual Servers (Optional)

Virtual Servers let you **bundle tools from one or more backends** into a single logical endpoint for OpenWebUI.

1. Click **Virtual Servers** in the left sidebar
2. Click to add a new virtual server
3. Create the following:

### Virtual Server: Azure MCP

| Field | Value |
|---|---|
| **Name** | `azure mcp` |
| **Description** | `Azure cloud resource management tools` |
| **Backend Servers** | Select `azure-go` |

### Virtual Server: ClickUp MCP

| Field | Value |
|---|---|
| **Name** | `clickup mcp` |
| **Description** | `ClickUp task and project management tools` |
| **Backend Servers** | Select `clickup-native` |

---

## Step 5 — Connect OpenWebUI

OpenWebUI connects to Context Forge's virtual servers via the MCP connection configs in:

```
apps/base/mcp-servers/contextforge/openwebui-context-forge-azure.json
apps/base/mcp-servers/contextforge/openwebui-context-forge-clickup.json
apps/base/mcp-servers/contextforge/openwebui-context-forge-master.json
```

These are pre-configured to point at Context Forge's SSE endpoints. Once the virtual servers exist in Context Forge, OpenWebUI will be able to discover and use the tools.

---

## Architecture Reference

```
                    ┌─────────────────────────────┐
                    │          OpenWebUI           │
                    └──────────────┬──────────────┘
                                   │ SSE / Streamable HTTP
                    ┌──────────────▼──────────────┐
                    │        Context Forge        │
                    │      (mcp.k8s.local)        │
                    │                             │
                    │  Virtual Servers:           │
                    │  ├── azure mcp             │
                    │  └── clickup mcp           │
                    └──┬──────────┬──────────┬───┘
                       │          │          │
            ┌──────────▼┐  ┌─────▼─────┐  ┌─▼──────────┐
            │ azure-go  │  │ groupme   │  │  clickup   │
            │  (HTTP)   │  │(Streamable│  │   (HTTP)   │
            │ :8080/mcp │  │  HTTP)    │  │ :5000/mcp  │
            └───────────┘  │ :5000/mcp │  └────────────┘
                           └───────────┘
```

---

## Troubleshooting

### Server shows as unreachable
```bash
# Check if the backend pod is running
kubectl get pods -n apps -l app=<server-name>

# Test connectivity from the Context Forge pod
kubectl exec -n apps deployment/context-forge -- \
  curl -s http://<service>.<namespace>.svc.cluster.local:<port>/health
```

### Tools not appearing
After registering a server, Context Forge needs a moment to discover tools. Refresh the Tools page. If tools still don't appear, check the server logs:

```bash
kubectl logs -n apps deployment/<server-name> --tail=50
```

### Need to re-register
Delete the server from the MCP Servers page in the UI, then re-add it with the correct values.

---

## Quick Reference — Internal URLs

| Server | Cluster URL | Transport |
|---|---|---|
| Azure MCP Go | `http://azure-mcp-go.apps.svc.cluster.local:8080/mcp` | HTTP |
| GroupMe | `http://groupme-backend.apps.svc.cluster.local:5000/mcp` | Streamable HTTP |
| ClickUp | `http://clickup-mcp-server.apps.svc.cluster.local:5000/mcp` | HTTP |
| Context Forge | `http://context-forge.apps.svc.cluster.local:4444` | — |
