# Next Steps After Cleanup

## 🔄 Git Operations

```bash
cd apps/base/mcp-servers

# Stage new directories
git add contextforge/ mcpo/ legacy/

# Stage modified files
git add kustomization.yaml README.md CLEANUP_SUMMARY.md

# Remove deleted files
git rm context-forge.yaml context-forge-servers.yaml \
    context-forge-rbac.yaml context-forge-init.yaml \
    groupme-backend.yaml clickup-mcp-server.yaml \
    azure-mcp-go-deployment.yaml groupme-netpol.yaml \
    mcpo-config.yaml mcpo-deployment.yaml mcpo-rbac.yaml \
    ingress.yaml \
    openwebui-context-forge.json \
    openwebui-azure-mcp.json openwebui-groupme-mcp.json \
    openwebui-groupme-direct.json openwebui-clickup-mcp.json \
    openwebui-clickup-native-mcp.json openwebui-n8n-mcp.json \
    openwebui-postgres-mcp.json openwebui-kubernetes-mcp.json \
    openwebui-prometheus-mcp.json openwebui-freshrss-mcp.json \
    openwebui-tanium-mcp.json tanium-mcp-server.yaml clickup-openapi.json

# Verify status
git status

# Commit
git commit -m "refactor(mcp-servers): organize into context-forge and mcpo directories

- Organize files into semantic directories: /contextforge, /mcpo, /legacy
- Remove duplicate OpenWebUI configs
- Move n8n from Context Forge to MCPO
- Remove ClickUp from MCPO config (moved to Context Forge)
- Update kustomization.yaml with new paths (Flux-compatible)
- Update README with new architecture
- Add CLEANUP_SUMMARY.md documenting all changes

Architecture:
  Context Forge: GroupMe, Azure, ClickUp (per-user auth)
  MCPO: Postgres, Kubernetes, Prometheus, FreshRSS, n8n
  
No overlaps - each server lives in ONE location only"

git push origin main
```

## ✅ Verification Checklist

After push, verify in your cluster:

```bash
# 1. Check Flux sees the changes
kubectl describe kustomization mcp-servers -n flux-system

# 2. Monitor reconciliation
kubectl get kustomization mcp-servers -n flux-system -w

# 3. Verify deployments
kubectl get deployments -n apps | grep -E "context-forge|mcpo"

# 4. Check pods are healthy
kubectl get pods -n apps -l app=context-forge,app=mcpo

# 5. Verify services
kubectl get svc -n apps | grep -E "context-forge|mcpo"

# 6. Check ingresses
kubectl get ingress -n apps | grep -E "context-forge|mcpo"
```

## 🔧 OpenWebUI Updates

### Manual Steps (In OpenWebUI):

1. **Go to Workspace → Tools**
2. **Remove OLD configs:**
   - Delete any old "Azure MCP" (if was pointing to MCPO)
   - Delete any old "GroupMe MCP" (if was pointing to MCPO)
   - Delete any old "ClickUp MCP" (if was pointing to MCPO)
   - Delete any old "n8n MCP" (if was pointing to Context Forge)

3. **Add NEW configs:**
   - Import from `contextforge/openwebui-context-forge.json` ← **Primary entry point**
   - Import from `mcpo/openwebui-postgres-mcp.json`
   - Import from `mcpo/openwebui-kubernetes-mcp.json`
   - Import from `mcpo/openwebui-prometheus-mcp.json`
   - Import from `mcpo/openwebui-freshrss-mcp.json`
   - Import from `mcpo/openwebui-n8n-mcp.json`

4. **Test GroupMe Auth:**
   - Go to **Workspace → Tools → Auth Registration** (GroupMe tool)
   - Paste your GroupMe token in REGISTRATION_TOKEN field
   - In chat: `Register Token`
   - Confirm success message

## ⚠️ Important Notes

### Flux Sync
- All resource paths are relative (Flux-compatible ✅)
- No manual kubectl apply needed
- Changes will auto-apply after next Flux sync (usually 10s)

### Backward Compatibility
- Existing secrets/ConfigMaps preserved
- Existing deployments use same names (no restart needed)
- Network policies unchanged
- RBAC intact

### What Changed
- **File organization only** - No functional changes
- **n8n location** - Now in MCPO, still accessible
- **OpenWebUI configs** - Cleaner, no duplicates

### Legacy Folder
- Tanium files preserved but NOT deployed
- ClickUp OpenAPI spec available for reference
- Can be safely ignored unless working on Tanium integration

## 🐛 Troubleshooting

If deployments don't sync:

```bash
# Force Flux reconciliation
flux reconcile kustomization mcp-servers -n flux-system

# Check Flux logs
flux logs --all-namespaces --follow

# Manual kustomize validation
kubectl kustomize apps/base/mcp-servers | kubectl apply --dry-run=client -f -
```

If services aren't accessible:

```bash
# Check service endpoints
kubectl get endpoints -n apps | grep -E "context-forge|mcpo"

# Check ingress status
kubectl get ingress -n apps -o wide

# Check DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup mcp.k8s.local.cluster.local
```

## 📚 Documentation

- [README.md](README.md) - Architecture overview
- [CLEANUP_SUMMARY.md](CLEANUP_SUMMARY.md) - What changed
- [AUTH_WORKFLOW.md](AUTH_WORKFLOW.md) - GroupMe per-user auth details
