# Azure MCP Server Environment Setup

This guide documents all environment variables and credentials needed for the Azure MCP server deployment. Follow these steps to initialize or rebuild your environment.

## Prerequisites

- Azure subscription with contributor access
- Azure CLI installed and authenticated: `az login`
- kubectl access to your Kubernetes cluster
- An existing K8S cluster with mcp-servers namespace created

## Step 1: Create Azure Service Principal

The Azure MCP server needs a service principal to authenticate with Azure resources.

### Create Service Principal (One-time setup)

```bash
# Create a service principal with Contributor role
az ad sp create-for-rbac \
  --name azure-mcp-server \
  --role Contributor \
  --scopes /subscriptions/<YOUR_SUBSCRIPTION_ID>
```

**Output example:**
```json
{
  "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "displayName": "azure-mcp-server",
  "password": "xxxxxxx~xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**Save these values securely!** You'll need them for the next step.

### Map Output to Kubernetes Secret Fields

- `appId` → `client-id`
- `password` → `client-secret`
- `tenant` → `tenant-id`
- Your subscription ID → `subscription-id`

## Step 2: Create Kubernetes Secret

Create the secret from the service principal credentials:

```bash
# Create secret with Azure credentials (REPLACE VALUES)
kubectl create secret generic azure-mcp-secrets \
  -n mcp-servers \
  --from-literal=tenant-id=<YOUR_TENANT_ID> \
  --from-literal=client-id=<YOUR_CLIENT_ID> \
  --from-literal=client-secret=<YOUR_CLIENT_SECRET> \
  --from-literal=subscription-id=<YOUR_SUBSCRIPTION_ID> \
  --dry-run=client \
  -o yaml | kubectl apply -f -
```

**Example with actual values:**
```bash
kubectl create secret generic azure-mcp-secrets \
  -n mcp-servers \
  --from-literal=tenant-id=12345678-1234-1234-1234-123456789012 \
  --from-literal=client-id=87654321-4321-4321-4321-210987654321 \
  --from-literal=client-secret='MyClientSecretHereXXXXXXX' \
  --from-literal=subscription-id=11111111-2222-3333-4444-555555555555 \
  --dry-run=client \
  -o yaml | kubectl apply -f -
```

**Or use the template file:**
```bash
# Edit the secrets template with real values
nano apps/base/mcp-servers/azure-mcp-secrets.yaml.template

# Apply the secret (file should not be committed to git!)
kubectl apply -f apps/base/mcp-servers/azure-mcp-secrets.yaml
```

## Step 3: Verify Secret is Mounted

After Flux syncs or you manually apply the deployment:

```bash
# Check if secret was created
kubectl get secret -n mcp-servers

# View secret keys (not values)
kubectl describe secret azure-mcp-secrets -n mcp-servers

# Verify deployment is using the secret
kubectl describe deployment azure-mcp -n mcp-servers | grep -A 20 "Mounts:"
```

## Step 4: Monitor Azure MCP Deployment

```bash
# Watch deployment status
kubectl rollout status deployment/azure-mcp -n mcp-servers

# Check pod logs for initialization
kubectl logs -f deployment/azure-mcp -n mcp-servers

# Verify container is running
kubectl get pods -n mcp-servers
```

## Environment Variables Reference

### Required (for Azure authentication)

| Variable | Source | Description | Example |
|----------|--------|-------------|---------|
| `AZURE_TENANT_ID` | Secret: `tenant-id` | Azure AD tenant ID | `12345678-1234-1234-1234-123456789012` |
| `AZURE_CLIENT_ID` | Secret: `client-id` | Service principal app ID | `87654321-4321-4321-4321-210987654321` |
| `AZURE_CLIENT_SECRET` | Secret: `client-secret` | Service principal password | `MyClientSecret...` |
| `AZURE_SUBSCRIPTION_ID` | Secret: `subscription-id` | Azure subscription ID | `11111111-2222-3333-4444-555555555555` |

### Optional (configured in ConfigMap)

| Variable | Default | Description | ConfigMap |
|----------|---------|-------------|-----------|
| `MCP_SERVER_PORT` | 3001 | Server listening port | `azure-mcp-config` |
| `NODE_ENV` | production | Node environment | `azure-mcp-config` |
| `LOG_LEVEL` | info | Logging level | `azure-mcp-config` |
| `AZURE_TIMEOUT` | 30000 | Azure API timeout (ms) | `azure-mcp-config` |
| `MAX_QUERY_RESULTS` | 1000 | Max results per query | `azure-mcp-config` |

## Files in Git vs Local

### ✅ COMMITTED TO GIT (safe)
- `apps/base/mcp-servers/azure-mcp-deployment.yaml` - Deployment manifest (no secrets)
- `apps/base/mcp-servers/azure-mcp-service.yaml` - Service definition
- `apps/base/mcp-servers/azure-mcp-configmap.yaml` - Configuration (non-sensitive)
- `apps/base/mcp-servers/azure-mcp-secrets.yaml.template` - Template with placeholders
- `apps/base/mcp-servers/kustomization.yaml` - Kustomization config
- `AZURE_MCP_ENV_SETUP.md` - This documentation

### ❌ NOT COMMITTED TO GIT (local only)
- `apps/base/mcp-servers/azure-mcp-secrets.yaml` - Actual secret with real credentials
  - Add to `.gitignore` if not already there
  - Create locally only, never commit real values

### .gitignore Rule

```bash
# Add to /workspaces/K8SHomelab/.gitignore
apps/base/mcp-servers/azure-mcp-secrets.yaml
```

## Rebuilding Environment

If you need to rebuild your K8S cluster or start fresh:

### Option 1: Using Kubernetes Secret (Recommended)

```bash
# 1. Ensure namespace exists
kubectl create namespace mcp-servers --dry-run=client -o yaml | kubectl apply -f -

# 2. Create secret from stored credentials
kubectl create secret generic azure-mcp-secrets \
  -n mcp-servers \
  --from-literal=tenant-id=<SAVED_TENANT_ID> \
  --from-literal=client-id=<SAVED_CLIENT_ID> \
  --from-literal=client-secret=<SAVED_CLIENT_SECRET> \
  --from-literal=subscription-id=<SAVED_SUBSCRIPTION_ID> \
  --dry-run=client \
  -o yaml | kubectl apply -f -

# 3. Let Flux sync (or apply manually)
flux reconcile kustomization apps --with-source

# 4. Verify deployment
kubectl rollout status deployment/azure-mcp -n mcp-servers
```

### Option 2: Using Secret Template File

```bash
# 1. Edit template with real values
cp apps/base/mcp-servers/azure-mcp-secrets.yaml.template apps/base/mcp-servers/azure-mcp-secrets.yaml
nano apps/base/mcp-servers/azure-mcp-secrets.yaml  # Add real credentials

# 2. Apply secret
kubectl apply -f apps/base/mcp-servers/azure-mcp-secrets.yaml

# 3. Verify
kubectl get secret -n mcp-servers
```

## Troubleshooting

### Secret Not Found

```bash
# Check if secret exists
kubectl get secret azure-mcp-secrets -n mcp-servers

# Recreate if missing
kubectl create secret generic azure-mcp-secrets \
  -n mcp-servers \
  --from-literal=tenant-id=<VALUE> \
  --from-literal=client-id=<VALUE> \
  --from-literal=client-secret=<VALUE> \
  --from-literal=subscription-id=<VALUE>
```

### Pod Not Starting

```bash
# Check pod status
kubectl get pod -n mcp-servers

# View logs
kubectl logs <POD_NAME> -n mcp-servers

# Check events
kubectl describe pod <POD_NAME> -n mcp-servers

# Common issue: ImagePullBackOff
# The deployment clones from GitHub in init container. Check git access:
kubectl logs <POD_NAME> -n mcp-servers -c azure-mcp-init
```

### Azure Authentication Failures

```bash
# Verify service principal has Contributor role
az role assignment list \
  --assignee <CLIENT_ID> \
  --query "[].{role:roleDefinitionName, scope:scope}"

# Test credentials manually
az login --service-principal \
  -u <CLIENT_ID> \
  -p <CLIENT_SECRET> \
  --tenant <TENANT_ID>

# List subscriptions
az account list
```

### Secret Values Not Injected

```bash
# Check if pod can read secret
kubectl exec -it <POD_NAME> -n mcp-servers -- env | grep AZURE

# Verify environment variable references in deployment
kubectl get deployment azure-mcp -n mcp-servers -o yaml | grep -A 10 "secretKeyRef"
```

## Security Best Practices

1. **Never commit credentials** - Keep actual secret files out of Git
2. **Rotate secrets regularly** - Azure service principals should be rotated periodically
3. **Use temporary secrets** - For testing, create temporary credentials
4. **Scope permissions** - Service principal should only have necessary roles
5. **Monitor access** - Use Azure Activity Log to track service principal usage
6. **Use secret management** - Consider Sealed Secrets or External Secrets for production

## Deleting the Service Principal

If you need to remove the service principal:

```bash
# Get service principal ID
az ad sp list --display-name azure-mcp-server

# Delete it
az ad sp delete --id <OBJECT_ID>

# Or by app ID
az ad app delete --id <CLIENT_ID>
```

## Related Files

- Deployment manifest: `apps/base/mcp-servers/azure-mcp-deployment.yaml`
- Service definition: `apps/base/mcp-servers/azure-mcp-service.yaml`
- ConfigMap: `apps/base/mcp-servers/azure-mcp-configmap.yaml`
- Kustomization: `apps/base/mcp-servers/kustomization.yaml`
- Ingress routes: `apps/base/mcp-servers/ingress.yaml`
