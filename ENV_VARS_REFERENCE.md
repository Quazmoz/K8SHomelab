# Complete Environment Variables Documentation

This document provides a single reference for all environment variables and credentials needed across your K8SHomelab infrastructure. Use this when rebuilding or initializing your environment.

## Quick Reference

| Component | Type | Count | Status | Docs |
|-----------|------|-------|--------|------|
| Azure MCP | Required Secrets | 4 | 🟢 Configured | [AZURE_MCP_ENV_SETUP.md](AZURE_MCP_ENV_SETUP.md) |
| ZionUp Application | ConfigMap/Secrets | 6 | 🟡 Partial | [See below](#zionup-application) |
| Jenkins | ConfigMap | 1 | 🟢 Configured | [See below](#jenkins) |
| PostgreSQL | Secret | 1 | 🟢 Configured | [See below](#postgresql) |

---

## Azure MCP Server

**Files:**
- Template: `apps/base/mcp-servers/azure-mcp-secrets.yaml.template`
- Actual (local only): `apps/base/mcp-servers/azure-mcp-secrets.yaml` (in `.gitignore`)

**Required Environment Variables:**

| Variable | Source | Example Value |
|----------|--------|----------------|
| `AZURE_TENANT_ID` | Azure AD → Service Principal | `12345678-1234-1234-1234-123456789012` |
| `AZURE_CLIENT_ID` | Azure AD → Service Principal (appId) | `87654321-4321-4321-4321-210987654321` |
| `AZURE_CLIENT_SECRET` | Azure AD → Service Principal (password) | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscriptions | `11111111-2222-3333-4444-555555555555` |

**Setup Steps:**
```bash
# 1. Create Azure service principal (one-time)
az ad sp create-for-rbac --name azure-mcp-server --role Contributor

# 2. Create Kubernetes secret
kubectl create secret generic azure-mcp-secrets -n mcp-servers \
  --from-literal=tenant-id=<TENANT_ID> \
  --from-literal=client-id=<CLIENT_ID> \
  --from-literal=client-secret=<CLIENT_SECRET> \
  --from-literal=subscription-id=<SUBSCRIPTION_ID>

# 3. Verify
kubectl get secret -n mcp-servers
```

**See:** [AZURE_MCP_ENV_SETUP.md](AZURE_MCP_ENV_SETUP.md) for detailed instructions

---

## ZionUp Application

**Files:**
- Template: `apps/base/zionup/zionup-secrets.yaml.template`
- Actual (local only): `apps/base/zionup/zionup-secrets.yaml` (in `.gitignore`)
- ConfigMap: `apps/base/zionup/zionup-configmap.yaml`

**Required Secrets:**

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `db_password` | Secret | PostgreSQL password | `your-secure-postgres-password` |
| `django_secret_key` | Secret | Django SECRET_KEY | `django-insecure-xxxxxxxxxxxxxxxxxxxxx` |
| `django_superuser_password` | Secret | Django admin password | `your-secure-admin-password` |

**ConfigMap Variables (non-sensitive):**

| Variable | Value | Description |
|----------|-------|-------------|
| `db_host` | `postgres-service.default.svc.cluster.local` | PostgreSQL service hostname |
| `db_port` | `5432` | PostgreSQL port |
| `db_user` | `zionup` | PostgreSQL username |
| `db_name` | `zionup_production` | Database name |
| `redis_host` | `redis-service.default.svc.cluster.local` | Redis service hostname |
| `redis_port` | `6379` | Redis port |
| `environment` | `production` | Deployment environment |

**Setup Steps:**
```bash
# 1. Generate Django secret key
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# 2. Create secrets
kubectl create secret generic zionup-secrets -n zionup-production \
  --from-literal=db_password=<POSTGRES_PASSWORD> \
  --from-literal=django_secret_key=<DJANGO_SECRET_KEY> \
  --from-literal=django_superuser_password=<ADMIN_PASSWORD>

# 3. Verify ConfigMap
kubectl get configmap zionup-config -n zionup-production -o yaml
```

**Status:** 🟡 Partial - ConfigMap configured, secrets need to be created

---

## Jenkins

**Files:**
- ConfigMap: `apps/base/jenkins/jenkins-config.yaml`
- Job Definitions: `apps/base/jenkins/jenkins-jobs.yaml`
- Deployment: `apps/base/jenkins/jenkins-deployment.yaml`

**ConfigMap Variables (in `jenkins-config.yaml`):**

| Variable | Default | Description |
|----------|---------|-------------|
| `Jenkins URL` | `http://jenkins:8080` | Jenkins instance URL |
| `Executors` | `2` | Number of parallel build executors |
| `Timezone` | `UTC` | Jenkins timezone |

**Required Credentials (configured in Jenkins UI):**

| Credential Type | ID | Purpose | Setup |
|-----------------|----|-----------|----|
| Username/Password | `github-credentials` | GitHub API access | Create GitHub PAT, add in Jenkins |
| Secret file | N/A | kubeconfig (if needed) | Upload kubeconfig file |

**Jenkins Job Environment Variables:**

The `zionup-homelab-deploy` job uses these (from Jenkinsfile):

| Variable | Purpose | Source |
|----------|---------|--------|
| `BACKEND_IMAGE` | Docker image tag | Jenkins job parameter |
| `BACKEND_IMAGE_TAG` | Backend version | Jenkins job parameter |
| `FRONTEND_IMAGE` | Frontend image repo | Jenkins job parameter |
| `FRONTEND_IMAGE_TAG` | Frontend version | Jenkins job parameter |
| `KUBE_NAMESPACE` | Target namespace | `zionup-production` |

**Setup Steps:**
```bash
# 1. Add GitHub credentials in Jenkins UI
# Navigate to: Jenkins → Credentials → System → Global Credentials
# Add: GitHub Personal Access Token with repo:* scope

# 2. Verify Job ConfigMap is synced
kubectl get configmap jenkins-jobs -n default

# 3. Jenkins will auto-load jobs from ConfigMap on restart
kubectl rollout restart statefulset/jenkins -n default

# 4. Check Jenkins logs
kubectl logs statefulset/jenkins -n default -f
```

**Status:** 🟢 Configured - Job definitions ready, needs GitHub credentials

---

## PostgreSQL

**Files:**
- Secret: `apps/base/postgres/postgres-secret.yaml`
- Deployment: `apps/base/postgres/postgres-manifest.yaml`
- Service: `apps/base/postgres/postgres-service.yaml`

**Required Secrets:**

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `POSTGRES_PASSWORD` | Secret | Superuser password | `your-secure-postgres-password` |

**ConfigMap Variables:**

| Variable | Value | Description |
|----------|-------|-------------|
| `POSTGRES_DB` | `postgres` | Default database |
| `POSTGRES_USER` | `postgres` | Superuser username |
| `PGDATA` | `/var/lib/postgresql/data/pgdata` | Data directory |

**Setup Steps:**
```bash
# 1. Create secret
kubectl create secret generic postgres-credentials -n default \
  --from-literal=password=<SECURE_PASSWORD>

# 2. Verify deployment
kubectl get statefulset postgres -n default

# 3. Check database is running
kubectl exec -it statefulset/postgres -n default -- psql -U postgres -l
```

**Status:** 🟢 Configured - Ready for deployment

---

## Other Services

### Grafana
**Files:** `apps/base/grafana/` (Helm Release)
- Admin password: Configured in helm-values (see deployment)
- Data source: Prometheus (auto-configured)
- **Status:** 🟢 Configured

### Prometheus
**Files:** `apps/base/prometheus/` (Helm Release)
- ConfigMap: Scrape targets configured
- **Status:** 🟢 Configured

### n8n
**Files:** `apps/base/n8n/` (Deployment)
- N8N_USER_MANAGEMENT_JWT_SECRET: ConfigMap
- **Status:** 🟢 Configured

### MetalLB
**Files:** `apps/base/metallb-system/`
- IPAddressPool: Configured
- L2Advertisement: Configured
- **Status:** 🟢 Configured

---

## Initialization Checklist

When setting up or rebuilding your environment:

### Pre-Deployment
- [ ] Kubernetes cluster running with Flux CD installed
- [ ] `kubectl` configured and authenticated
- [ ] Git repository cloned locally

### Azure MCP Setup
- [ ] Created Azure service principal: `az ad sp create-for-rbac ...`
- [ ] Saved tenant-id, client-id, client-secret, subscription-id
- [ ] Created Kubernetes secret: `kubectl create secret generic azure-mcp-secrets ...`
- [ ] Verified secret: `kubectl get secret -n mcp-servers`

### Jenkins Setup
- [ ] Jenkins pod running: `kubectl get statefulset jenkins -n default`
- [ ] Jenkins jobs ConfigMap synced: `kubectl get configmap jenkins-jobs -n default`
- [ ] GitHub credentials added in Jenkins UI
- [ ] Verified job definition: Jenkins UI → zionup-homelab-deploy

### ZionUp Setup
- [ ] PostgreSQL running: `kubectl get statefulset postgres -n default`
- [ ] Redis running: `kubectl get deployment redis -n zionup-production`
- [ ] Created ZionUp secrets: `kubectl create secret generic zionup-secrets ...`
- [ ] ConfigMap verified: `kubectl get configmap zionup-config -n zionup-production`
- [ ] Frontend and backend deployed: `kubectl get deployment -n zionup-production`

### Verification
- [ ] All pods running: `kubectl get pods --all-namespaces`
- [ ] Ingress routes working: `kubectl get ingress --all-namespaces`
- [ ] Flux synced successfully: `flux get kustomization`
- [ ] No failed deployments: `kubectl get deployments --all-namespaces`

---

## Environment Variable Naming Convention

Across the cluster, we follow these naming patterns:

| Pattern | Example | Usage |
|---------|---------|-------|
| UPPERCASE_SNAKE_CASE | `AZURE_TENANT_ID` | Environment variables |
| lowercase-kebab-case | `azure-mcp` | Kubernetes resource names |
| lowercase_snake_case | `db_password` | Secret keys |
| UPPERCASE_SNAKE_CASE | `POSTGRES_DB` | ConfigMap keys |

---

## Security Notes

### What's in Git (Safe)
✅ `*.template` files - Contain placeholders only
✅ ConfigMaps - Non-sensitive configuration
✅ Deployment manifests - No embedded secrets
✅ Documentation - Setup instructions

### What's NOT in Git (Local Only)
❌ `*-secrets.yaml` - Actual secret files with credentials
❌ `.env` files - Local environment files
❌ Kubeconfig files - Cluster access credentials
❌ Private keys - SSH or TLS private keys

### Secure Setup Process

1. **Create secret template** - Check into Git with placeholders
2. **Generate/retrieve actual values** - Locally or from secure storage
3. **Create actual secret file** - From template, fill in real values
4. **Apply to cluster** - Via kubectl or pipeline
5. **Add to .gitignore** - Ensure file is never committed
6. **Store credentials securely** - Password manager, vault, etc.

---

## Troubleshooting

### Secret Not Found
```bash
# List all secrets
kubectl get secrets --all-namespaces

# Check specific secret
kubectl describe secret <SECRET_NAME> -n <NAMESPACE>

# Recreate if missing
kubectl create secret generic <SECRET_NAME> -n <NAMESPACE> \
  --from-literal=key=value
```

### ConfigMap Not Found
```bash
# List all ConfigMaps
kubectl get configmaps --all-namespaces

# View ConfigMap contents
kubectl get configmap <CONFIGMAP_NAME> -n <NAMESPACE> -o yaml

# Recreate from manifest
kubectl apply -f apps/base/<app>/<configmap>.yaml
```

### Pod Not Reading Environment Variables
```bash
# Check pod's environment variables
kubectl exec <POD_NAME> -n <NAMESPACE> -- env | grep VARIABLE

# Check deployment mounts
kubectl describe pod <POD_NAME> -n <NAMESPACE> | grep -A 20 "Mounts:"

# Check secret references
kubectl get deployment <DEPLOYMENT_NAME> -n <NAMESPACE> -o yaml | grep -A 5 "secretKeyRef"
```

### Flux Not Syncing
```bash
# Check Flux status
flux get kustomization

# Reconcile manually
flux reconcile kustomization apps --with-source

# View Flux controller logs
kubectl logs -n flux-system -l app=kustomize-controller -f
```

---

## Related Documentation

- [FLUX_JENKINS_INTEGRATION.md](FLUX_JENKINS_INTEGRATION.md) - Flux + Jenkins workflow
- [AZURE_MCP_ENV_SETUP.md](AZURE_MCP_ENV_SETUP.md) - Detailed Azure MCP setup
- [SETUP_SUMMARY.md](SETUP_SUMMARY.md) - Overall homelab setup
- [JENKINS_GITOPS_SUMMARY.md](JENKINS_GITOPS_SUMMARY.md) - Jenkins GitOps provisioning

---

## Quick Commands

```bash
# Show all secrets in cluster
kubectl get secrets --all-namespaces

# Show all ConfigMaps
kubectl get configmaps --all-namespaces

# Verify all deployments
kubectl get deployments --all-namespaces

# Check Flux sync status
flux get kustomization --watch

# Watch pod creation
kubectl get pods --all-namespaces --watch

# Get pod details
kubectl describe pod <POD_NAME> -n <NAMESPACE>

# View pod logs
kubectl logs <POD_NAME> -n <NAMESPACE> -f

# Trigger Flux reconciliation
flux reconcile kustomization apps --with-source

# Dry-run kubectl apply
kubectl apply -f <FILE> --dry-run=client -o yaml
```

Last Updated: 2025-12-05
Version: 1.0
