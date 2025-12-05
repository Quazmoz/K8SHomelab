# Environment Variables & Setup Documentation Index

Complete reference for all environment variables, credentials, and setup procedures needed for your K8SHomelab infrastructure.

## 📋 Quick Navigation

| Document | Purpose | Time |
|----------|---------|------|
| [AZURE_MCP_QUICK_START.md](AZURE_MCP_QUICK_START.md) | Fast Azure MCP setup | 5-10 min |
| [ENV_VARS_REFERENCE.md](ENV_VARS_REFERENCE.md) | Master env var list | Reference |
| [AZURE_MCP_ENV_SETUP.md](AZURE_MCP_ENV_SETUP.md) | Detailed Azure setup | Detailed |
| [FLUX_JENKINS_INTEGRATION.md](FLUX_JENKINS_INTEGRATION.md) | Flux + Jenkins workflow | Reference |
| [FLUX_BUILD_FIX.md](FLUX_BUILD_FIX.md) | Build issue & fix | Historical |

---

## 🚀 Getting Started

### First Time Setup

**Step 1: Fix Overview**
- ✅ Flux build error fixed (duplicate Service removed from azure-mcp-deployment.yaml)
- ✅ kustomize build now succeeds
- ✅ Jenkins jobs ConfigMap can now be synced

**Step 2: Set Up Azure Credentials**

Follow [AZURE_MCP_QUICK_START.md](AZURE_MCP_QUICK_START.md) (5 minutes):
```bash
# 1. Create Azure service principal
az ad sp create-for-rbac --name azure-mcp-server --role Contributor

# 2. Create Kubernetes secret
kubectl create secret generic azure-mcp-secrets -n mcp-servers \
  --from-literal=tenant-id=... \
  --from-literal=client-id=... \
  --from-literal=client-secret=... \
  --from-literal=subscription-id=...

# 3. Verify
kubectl get secret azure-mcp-secrets -n mcp-servers
```

**Step 3: Flux Sync**
- Wait for Flux to reconcile (max 10 minutes)
- Or trigger manually: `flux reconcile kustomization apps --with-source`
- Azure MCP pod will start automatically

---

## 📊 Environment Variables by Component

### Azure MCP Server
**Location:** `apps/base/mcp-servers/`
**Type:** Required Secrets

```yaml
AZURE_TENANT_ID: "12345678-1234-1234-1234-123456789012"
AZURE_CLIENT_ID: "87654321-4321-4321-4321-210987654321"
AZURE_CLIENT_SECRET: "xxxxxxxxxxx..."
AZURE_SUBSCRIPTION_ID: "11111111-2222-3333-4444-555555555555"
```

**Setup:** [AZURE_MCP_QUICK_START.md](AZURE_MCP_QUICK_START.md)
**Detailed:** [AZURE_MCP_ENV_SETUP.md](AZURE_MCP_ENV_SETUP.md)

### Jenkins
**Location:** `apps/base/jenkins/`
**Type:** ConfigMap + Credentials

**ConfigMap:** `jenkins-config.yaml` (default settings)
**Jobs:** `jenkins-jobs.yaml` (Job DSL definitions)
**Credentials (UI):** GitHub token for GitHub push triggers

**Setup:** [JENKINS_GITOPS_SUMMARY.md](JENKINS_GITOPS_SUMMARY.md)

### ZionUp Application
**Location:** `apps/base/zionup/`
**Type:** ConfigMap + Secrets

**ConfigMap:** Database hosts, ports, environment
**Secrets:** Database password, Django secret key, admin password

**Status:** Template created, secrets need to be set up

### PostgreSQL
**Location:** `apps/base/postgres/`
**Type:** Secrets + ConfigMap

**Secret:** `postgres-credentials` (superuser password)

### Other Services
- Grafana, Prometheus, n8n: Configured in templates
- MetalLB, Ingress-nginx: Ready to deploy

**Full Reference:** [ENV_VARS_REFERENCE.md](ENV_VARS_REFERENCE.md)

---

## 🔐 Security Best Practices

### What's in Git ✅
- `.template` files with placeholders
- ConfigMaps (non-sensitive data)
- Deployment manifests
- Documentation

### What's NOT in Git ❌
- `azure-mcp-secrets.yaml` (actual file)
- `zionup-secrets.yaml` (actual file)
- `.env` files
- Credentials or API keys

### Setup Process
1. Copy `.template` file → Create actual file locally
2. Fill in real values from secure storage
3. Apply to cluster via `kubectl create secret`
4. File stays local (excluded by `.gitignore`)

---

## 📝 File Structure

```
/workspaces/K8SHomelab/
├── apps/base/
│   ├── mcp-servers/
│   │   ├── azure-mcp-deployment.yaml        ✅ Fixed
│   │   ├── azure-mcp-service.yaml
│   │   ├── azure-mcp-configmap.yaml
│   │   ├── azure-mcp-secrets.yaml.template  (local only)
│   │   ├── kustomization.yaml
│   │   └── ...
│   ├── jenkins/
│   │   ├── jenkins-deployment.yaml
│   │   ├── jenkins-config.yaml
│   │   ├── jenkins-jobs.yaml                (Job DSL)
│   │   └── ...
│   ├── zionup/
│   │   ├── zionup-secrets.yaml.template     (local only)
│   │   ├── zionup-configmap.yaml
│   │   └── ...
│   └── ...
├── AZURE_MCP_QUICK_START.md                 ⭐ Start here
├── ENV_VARS_REFERENCE.md                    📋 Reference
├── AZURE_MCP_ENV_SETUP.md                   📚 Detailed guide
├── FLUX_JENKINS_INTEGRATION.md              🔄 Workflow
├── FLUX_BUILD_FIX.md                        🔧 Technical details
└── .gitignore                               🔒 Excludes secrets
```

---

## 🔄 Flux Integration

**Current Status:** ✅ Fixed and Working

### How It Works

1. You commit to Git (YAML files)
2. Flux detects changes (every 10 minutes or via webhook)
3. Flux applies Kustomization to cluster
4. ConfigMaps and Deployments updated
5. Pods read environment variables from secrets and ConfigMaps

### Jenkins Job Sync

```
Git push → Flux sync → jenkins-jobs.yaml applied → 
Jenkins reads ConfigMap → Jobs created → Ready to run
```

**Timeline:** 1-10 minutes (depending on polling vs webhook)

**Details:** [FLUX_JENKINS_INTEGRATION.md](FLUX_JENKINS_INTEGRATION.md)

---

## ✅ Checklist

### Pre-Deployment
- [ ] Kubernetes cluster running
- [ ] Flux CD installed
- [ ] Git repository cloned

### Azure MCP
- [ ] Service principal created
- [ ] Kubernetes secret created
- [ ] Secret verified with `kubectl get secret`

### Jenkins
- [ ] Pod running: `kubectl get statefulset jenkins`
- [ ] ConfigMap synced: `kubectl get configmap jenkins-jobs`
- [ ] GitHub credentials added (Jenkins UI)
- [ ] Job visible: Jenkins → zionup-homelab-deploy

### Verification
- [ ] All pods running: `kubectl get pods --all-namespaces`
- [ ] Flux status: `flux get kustomization`
- [ ] No failed deployments: `kubectl get deployments`

---

## 🆘 Quick Troubleshooting

### Flux Build Failed
**Issue:** `kustomize build failed`
**Status:** ✅ Fixed - see [FLUX_BUILD_FIX.md](FLUX_BUILD_FIX.md)

### Secret Not Found
```bash
# Recreate secret
kubectl create secret generic azure-mcp-secrets -n mcp-servers \
  --from-literal=tenant-id=... \
  --from-literal=client-id=... \
  --from-literal=client-secret=... \
  --from-literal=subscription-id=...
```

### Pod Not Starting
```bash
# Check pod logs
kubectl logs -n mcp-servers -l app=azure-mcp

# Check pod events
kubectl describe pod -n mcp-servers -l app=azure-mcp
```

### Environment Variables Not Set
```bash
# Check pod environment
kubectl exec -it <POD_NAME> -n mcp-servers -- env | grep AZURE
```

**Full Troubleshooting:** [AZURE_MCP_ENV_SETUP.md](AZURE_MCP_ENV_SETUP.md)

---

## 📚 Complete Documentation Index

| Document | Last Updated | Status |
|----------|--------------|--------|
| AZURE_MCP_QUICK_START.md | 2025-12-05 | ✅ Ready |
| ENV_VARS_REFERENCE.md | 2025-12-05 | ✅ Ready |
| AZURE_MCP_ENV_SETUP.md | 2025-12-05 | ✅ Ready |
| FLUX_JENKINS_INTEGRATION.md | 2025-12-05 | ✅ Ready |
| FLUX_BUILD_FIX.md | 2025-12-05 | ✅ Ready |
| SETUP_SUMMARY.md | 2025-09-12 | 📝 Legacy |
| JENKINS_GITOPS_SUMMARY.md | 2025-09-12 | 📝 Legacy |

---

## 🔗 Related Systems

- **Kubernetes Cluster:** K8SHomelab (production ready)
- **GitOps:** Flux CD v2 (syncing ./apps/base)
- **CI/CD:** Jenkins with GitOps job provisioning
- **Infrastructure:** MetalLB, Nginx Ingress, Local Storage
- **Applications:** Grafana, Prometheus, n8n, ZionUp, PostgreSQL, Redis

---

## 💡 Key Takeaways

1. **Templates + Local Secrets:** Keep `.template` files in Git, create actual files locally
2. **Kubernetes Secrets:** All credentials managed via `kubectl create secret`
3. **Flux Automation:** Changes to Git automatically applied to cluster
4. **Documentation:** All setup procedures documented for easy rebuild
5. **No Hardcoded Secrets:** All credentials injected via environment variables

---

## 🚀 Next Steps

1. ✅ Fix is committed - Flux will now build successfully
2. 🔵 Create Azure service principal (5 minutes)
3. 🔵 Set up Kubernetes secrets (1 minute)
4. 🔵 Wait for Flux sync (up to 10 minutes)
5. 🔵 Verify Azure MCP running

**Start with:** [AZURE_MCP_QUICK_START.md](AZURE_MCP_QUICK_START.md)

---

**Repository:** Quazmoz/K8SHomelab  
**Branch:** main  
**Last Updated:** 2025-12-05  
**Status:** ✅ Ready for Setup
