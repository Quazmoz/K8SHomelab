# Flux Build Issue: RESOLVED ✅

## Problem

Flux was failing to build and sync the `apps/base` Kustomization with the following error:

```
kustomize build failed: accumulating resources: 
accumulation err='merging resources from 'azure-mcp-service.yaml': 
may not add resource with an already registered id: 
Service.v1.[noGrp]/azure-mcp.mcp-servers'
```

## Root Cause

The `azure-mcp-deployment.yaml` file contained an embedded Service definition that duplicated the standalone `azure-mcp-service.yaml` file. This caused Kustomize to try to register the same Service resource twice, causing the build failure.

### Files Involved

- `apps/base/mcp-servers/azure-mcp-deployment.yaml` - Had embedded Service (fixed ✅)
- `apps/base/mcp-servers/azure-mcp-service.yaml` - Standalone Service definition

## Solution

Removed the embedded Service definition from `azure-mcp-deployment.yaml` (lines 126-143).

### Before (ERROR)
```yaml
---
# Azure MCP Service
apiVersion: v1
kind: Service
metadata:
  name: azure-mcp
  namespace: mcp-servers
  labels:
    app: azure-mcp
spec:
  type: ClusterIP
  selector:
    app: azure-mcp
  ports:
  - name: mcp
    port: 3001
    targetPort: 3001
    protocol: TCP
```

### After (FIXED ✅)
Removed entirely. Now uses only `azure-mcp-service.yaml` which has:
- `type: LoadBalancer` (proper for external access)
- Same labels and selectors

## Verification

```bash
# Test kustomize build
cd /workspaces/K8SHomelab
kubectl kustomize apps/base/mcp-servers  # ✅ Succeeds

# Full kustomize build
kubectl kustomize apps/base  # ✅ Succeeds
```

## Next Steps

1. **Commit the fix** to Git
2. **Flux will automatically sync** (on next reconciliation)
3. **Jenkins ConfigMap will be synced** (no longer blocked by build error)
4. **Jobs will be loaded** into Jenkins

## Azure MCP Environment Setup

The Azure MCP server requires credentials to be set up. See [AZURE_MCP_ENV_SETUP.md](AZURE_MCP_ENV_SETUP.md) for:

- Creating Azure service principal
- Setting up Kubernetes secrets
- Rebuilding procedures
- Troubleshooting

Quick setup:
```bash
# 1. Create Azure service principal
az ad sp create-for-rbac --name azure-mcp-server --role Contributor

# 2. Create Kubernetes secret
kubectl create secret generic azure-mcp-secrets -n mcp-servers \
  --from-literal=tenant-id=<TENANT_ID> \
  --from-literal=client-id=<CLIENT_ID> \
  --from-literal=client-secret=<CLIENT_SECRET> \
  --from-literal=subscription-id=<SUBSCRIPTION_ID>
```

## Files Modified

- ✅ `apps/base/mcp-servers/azure-mcp-deployment.yaml` - Removed embedded Service

## Files Created (Documentation)

- ✅ `AZURE_MCP_ENV_SETUP.md` - Complete Azure MCP setup guide
- ✅ `ENV_VARS_REFERENCE.md` - Master reference for all environment variables
- ✅ `.gitignore` - Updated to exclude secret files

## Security Notes

- Template files (`.template`) are committed to Git with placeholders
- Actual secret files are excluded from Git via `.gitignore`
- No real credentials are stored in the repository
- Setup process uses local `kubectl create secret` commands

## Status

✅ **RESOLVED** - Flux can now successfully build and sync the cluster

Next action: Set up Azure service principal and create Kubernetes secrets
