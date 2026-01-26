# Context Forge Auto-Provisioning System

## Overview

Context Forge now **automatically creates and manages virtual MCP servers** when the pod starts up. No manual registration needed!

## How It Works

### Phase 1: Backend Server Registration
When the init job runs:
1. **azure-go** (HTTP server on port 8080) auto-registers
2. **groupme** (SSE backend on port 5000) auto-registers  
3. **clickup-native** (SSE server on port 5000) auto-registers

### Phase 2: Tool Discovery
The script automatically discovers all tools from the registered backend servers and groups them by backend.

### Phase 3: Virtual Server Creation
The script creates **two virtual servers** for OpenWebUI:

```
Virtual Servers (What OpenWebUI sees)
├── "azure mcp"   → all Azure tools from azure-go
└── "clickup mcp" → all ClickUp tools from clickup-native
```

## Configuration

### Backend Servers
Defined in `context-forge-init.yaml` → `MCP_BACKENDS` array:

```python
MCP_BACKENDS = [
    {
        "name": "azure-go",
        "url": "http://azure-mcp-go.apps.svc.cluster.local:8080/mcp",
        "type": "http"
    },
    {
        "name": "groupme",
        "url": "http://groupme-backend.apps.svc.cluster.local:5000/sse",
        "type": "sse",
        "passthrough_headers": ["X-Authenticated-User"]
    },
    {
        "name": "clickup-native",
        "url": "http://clickup-mcp-server.apps.svc.cluster.local:5000/sse",
        "type": "sse"
    }
]
```

### Virtual Servers
Defined in `context-forge-init.yaml` → `VIRTUAL_SERVERS` array:

```python
VIRTUAL_SERVERS = [
    {
        "name": "azure mcp",
        "description": "Azure cloud resource management tools",
        "backend_servers": ["azure-go"]
    },
    {
        "name": "clickup mcp",
        "description": "ClickUp task and project management tools",
        "backend_servers": ["clickup-native"]
    }
]
```

## How to Customize

### Add a New Backend Server

1. Edit `context-forge-init.yaml`
2. Add to `MCP_BACKENDS` array:

```python
{
    "name": "my-mcp",
    "url": "http://my-service.apps.svc.cluster.local:5000/sse",
    "type": "sse"
}
```

3. Optionally add to `VIRTUAL_SERVERS`:

```python
{
    "name": "my tools",
    "description": "My custom tools",
    "backend_servers": ["my-mcp"]
}
```

### Combine Multiple Backends into One Virtual Server

```python
{
    "name": "productivity suite",
    "description": "Combined task & project management",
    "backend_servers": ["clickup-native", "other-backend"]
}
```

## Execution Flow

### Init Job Logs

```
📡 Step 1: Registering Backend MCP Servers...
   👉 Registering Backend: azure-go...
      ✅ Registered
   👉 Registering Backend: groupme...
      ✅ Registered
   👉 Registering Backend: clickup-native...
      ✅ Registered

🔍 Step 2: Discovering Tools by Backend Server...
      Found 45 tools total.
      - list_resource_groups (from azure-go)
      - list_vm_instances (from azure-go)
      - list_groups (from groupme)
      - search_tasks (from clickup-native)
      ...

      Tool Map: {
        "azure-go": ["tool-uuid-1", "tool-uuid-2", ...],
        "groupme": ["tool-uuid-n", ...],
        "clickup-native": ["tool-uuid-m", ...]
      }

📦 Step 3: Creating/Updating Virtual Servers...

   👉 Virtual Server: 'azure mcp'
      Description: Azure cloud resource management tools
      Backend servers: ['azure-go']
      Associated tools: 20
      ✅ SUCCESS! Virtual Server 'azure mcp' ready.
      🔑 UUID: {uuid}

   👉 Virtual Server: 'clickup mcp'
      Description: ClickUp task and project management tools
      Backend servers: ['clickup-native']
      Associated tools: 15
      ✅ SUCCESS! Virtual Server 'clickup mcp' ready.
      🔑 UUID: {uuid}
```

## GroupMe Special Case

GroupMe doesn't need a virtual server because:
- It uses **per-user authentication** (tokens encrypted in Postgres)
- Users authenticate via **Auth Registration** tool in OpenWebUI
- Once registered, users can call GroupMe tools directly

Future: Could create a "groupme mcp" virtual server if needed.

## Updating Servers

The init job **only runs when Context Forge pod restarts**.

To re-provision:
```bash
kubectl rollout restart deployment/context-forge -n apps
```

To check logs:
```bash
# See the init job (runs after Context Forge deployment)
kubectl logs -n apps -l app=context-forge-init --tail=100

# Or monitor real-time
kubectl logs -f -n apps -l app=context-forge-init
```

## Files to Update

- `contextforge/context-forge-init.yaml` - Main provisioning script
- `contextforge/context-forge-servers.yaml` - Documentation
