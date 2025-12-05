# Azure MCP Quick Start

**Fastest way to set up Azure MCP credentials for your homelab.**

## 1️⃣ Create Azure Service Principal (5 minutes)

```bash
# Login to Azure
az login

# Create service principal with Contributor role
az ad sp create-for-rbac \
  --name azure-mcp-server \
  --role Contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID
```

**Save the output:**
```json
{
  "appId": "YOUR_CLIENT_ID",
  "password": "YOUR_CLIENT_SECRET",
  "tenant": "YOUR_TENANT_ID"
}
```

Your subscription ID:
```bash
az account show --query id -o tsv
```

## 2️⃣ Create Kubernetes Secret (1 minute)

```bash
# Replace with YOUR values from step 1
kubectl create secret generic azure-mcp-secrets \
  -n mcp-servers \
  --from-literal=tenant-id=YOUR_TENANT_ID \
  --from-literal=client-id=YOUR_CLIENT_ID \
  --from-literal=client-secret=YOUR_CLIENT_SECRET \
  --from-literal=subscription-id=YOUR_SUBSCRIPTION_ID
```

## 3️⃣ Verify Secret Created

```bash
# Check secret exists
kubectl get secret azure-mcp-secrets -n mcp-servers

# Verify keys (won't show values)
kubectl describe secret azure-mcp-secrets -n mcp-servers
```

## 4️⃣ Trigger Flux Sync

When Flux next reconciles (up to 10 minutes), it will:
1. Apply the azure-mcp deployment
2. Mount the secret as environment variables
3. Start the Azure MCP server

Or manually:
```bash
# Wait for pod to start
kubectl get pods -n mcp-servers --watch

# View logs
kubectl logs -f deployment/azure-mcp -n mcp-servers
```

## 5️⃣ Test Connection

```bash
# Port forward to the service
kubectl port-forward -n mcp-servers svc/azure-mcp 3001:3001

# In another terminal, test health endpoint
curl http://localhost:3001/health

# Expected response: 200 OK
```

---

## Troubleshooting

### Secret creation failed
```bash
# Check if namespace exists
kubectl get ns mcp-servers

# If not, create it
kubectl create namespace mcp-servers
```

### Pod not starting
```bash
# Check pod status
kubectl describe pod -n mcp-servers -l app=azure-mcp

# View logs
kubectl logs -n mcp-servers -l app=azure-mcp
```

### Azure authentication error
```bash
# Verify service principal has Contributor role
az role assignment list \
  --assignee YOUR_CLIENT_ID \
  --query "[].roleDefinitionName"

# Test credentials manually
az login --service-principal \
  -u YOUR_CLIENT_ID \
  -p YOUR_CLIENT_SECRET \
  --tenant YOUR_TENANT_ID
```

---

## For Rebuilding Your Environment

Keep these values safe:
- TENANT_ID: `12345678-...`
- CLIENT_ID: `87654321-...`
- CLIENT_SECRET: `xxxxxxxxxxxx...`
- SUBSCRIPTION_ID: `11111111-...`

To set up again, just repeat steps 2-4 above.

---

## Full Documentation

See [AZURE_MCP_ENV_SETUP.md](AZURE_MCP_ENV_SETUP.md) for complete details including:
- Security best practices
- Detailed troubleshooting
- Credential rotation
- Service principal deletion
