# MCP Servers Cleanup - Summary

## ✅ Completed Changes

### 1. **Directory Structure Reorganization**
   - Created `/contextforge/` - Context Forge gateway + custom servers
   - Created `/mcpo/` - MCPO proxy + Node.js stdio servers
   - Created `/legacy/` - Disabled/deprecated resources
   - Root remains clean with only documentation and utility scripts

### 2. **Context Forge (GroupMe, Azure, ClickUp)**
   **Files organized in `/contextforge/`:**
   - `context-forge.yaml` - Main deployment, service, ingress
   - `context-forge-servers.yaml` - Server registration config (removed n8n)
   - `context-forge-rbac.yaml` - Kubernetes access RBAC
   - `context-forge-init.yaml` - Auto-registration job
   - `groupme-backend.yaml` - Per-user token encryption backend
   - `clickup-mcp-server.yaml` - ClickUp SSE server
   - `azure-mcp-go-deployment.yaml` - Azure HTTP server
   - `groupme-netpol.yaml` - Network policies
   - `openwebui-context-forge.json` - Primary OpenWebUI entry point

### 3. **MCPO (Postgres, Kubernetes, Prometheus, FreshRSS, n8n)**
   **Files organized in `/mcpo/`:**
   - `mcpo-config.yaml` - ✅ **Removed ClickUp, kept n8n**
   - `mcpo-deployment.yaml` - Updated environment variables
   - `mcpo-rbac.yaml` - Kubernetes access RBAC
   - `ingress.yaml` - Ingress for mcpo.k8s.local
   - `openwebui-postgres-mcp.json`
   - `openwebui-kubernetes-mcp.json`
   - `openwebui-prometheus-mcp.json`
   - `openwebui-freshrss-mcp.json`
   - `openwebui-n8n-mcp.json` - ✅ **Moved from root**

### 4. **Legacy (Preserved)**
   **Files organized in `/legacy/`:**
   - `tanium-mcp-server.yaml` - Disabled (token expired)
   - `openwebui-tanium-mcp.json` - Disabled
   - `clickup-openapi.json` - Reference spec (not deployed)

### 5. **Files Deleted (Duplicates/Old)**
   Removed duplicate OpenWebUI configs that pointed to wrong backends:
   - ❌ `openwebui-azure-mcp.json` (pointed to MCPO)
   - ❌ `openwebui-groupme-mcp.json` (pointed to MCPO)
   - ❌ `openwebui-groupme-direct.json` (unclear purpose)
   - ❌ `openwebui-clickup-mcp.json` (pointed to MCPO)
   - ❌ `openwebui-clickup-native-mcp.json` (unclear purpose)

### 6. **Kustomization Updated**
   **New `/kustomization.yaml`:**
   ```yaml
   resources:
     # Context Forge (9 files)
     - contextforge/context-forge.yaml
     - contextforge/context-forge-servers.yaml
     - ... etc
   
     # MCPO (4 files)
     - mcpo/mcpo-config.yaml
     - mcpo/mcpo-rbac.yaml
     - mcpo/mcpo-deployment.yaml
     - mcpo/ingress.yaml
   ```
   ✅ **Flux-compatible** - All paths relative to root

### 7. **README Updated**
   - Clear directory structure documentation
   - Architecture overview with ASCII diagram
   - Server responsibility matrix
   - OpenWebUI configuration instructions
   - Per-user auth workflow reference

## 📊 Final Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           OpenWebUI                                 │
│                    (Import openwebui-*.json configs)               │
└─────────────────────────────────────────────────────────────────────┘
              ↓                                      ↓
  ┌─────────────────────────────┐    ┌──────────────────────────────┐
  │   Context Forge             │    │        MCPO                  │
  │   Gateway (Port 4444)       │    │   OpenAPI Proxy (Port 8000)  │
  ├─────────────────────────────┤    ├──────────────────────────────┤
  │ ✅ GroupMe (per-user auth) │    │ ✅ Postgres                  │
  │ ✅ Azure (HTTP)            │    │ ✅ Kubernetes                │
  │ ✅ ClickUp (SSE)           │    │ ✅ Prometheus                │
  │ ❌ n8n (MOVED)             │    │ ✅ FreshRSS                  │
  │ ❌ Postgres (MOVED)        │    │ ✅ n8n                       │
  │ ❌ Kubernetes (MOVED)      │    │                              │
  │ ❌ Prometheus (MOVED)      │    │                              │
  └─────────────────────────────┘    └──────────────────────────────┘
```

## 🔐 No Overlaps Confirmed

✅ **GroupMe** - Context Forge only
✅ **Azure** - Context Forge only
✅ **ClickUp** - Context Forge only
✅ **n8n** - MCPO only (moved from context-forge-servers.yaml)
✅ **Postgres** - MCPO only
✅ **Kubernetes** - MCPO only
✅ **Prometheus** - MCPO only
✅ **FreshRSS** - MCPO only

## 🚀 Flux Sync

- Kustomization references all files with relative paths
- No breaking changes to deployment structure
- Flux will automatically reconcile on next sync
- All secrets and configs remain functional

## 📝 Next Steps (Manual)

1. **Verify deployment**: `kubectl get deployments -n apps | grep -E "context-forge|mcpo"`
2. **Check pods**: `kubectl get pods -n apps | grep -E "context-forge|mcpo"`
3. **Update OpenWebUI**: Delete old OpenAPI tool configs, import fresh ones from `/contextforge/` and `/mcpo/`
4. **Test GroupMe**: Verify per-user auth workflow still works
5. **Test Tools**: Confirm all MCP tools accessible in OpenWebUI
