# Azure MCP Server Setup Guide

## Quick Start

### 1. Deploy Azure MCP Server

```bash
kubectl apply -k apps/base/mcp-servers
```

### 2. Create Azure Service Principal

Get your Azure credentials first:

```bash
# Create service principal with Contributor role
az ad sp create-for-rbac --name mcp-server --role Contributor

# You'll get output like:
# {
#   "appId": "xxxx-xxxx-xxxx",
#   "displayName": "mcp-server",
#   "password": "xxxx-xxxx-xxxx",
#   "tenant": "xxxx-xxxx-xxxx"
# }

# Get subscription ID
az account show --query id -o tsv
```

**Save these values:**
- `appId` → AZURE_CLIENT_ID
- `password` → AZURE_CLIENT_SECRET
- `tenant` → AZURE_TENANT_ID
- subscription ID → AZURE_SUBSCRIPTION_ID

### 3. Create Kubernetes Secret

```bash
kubectl create secret generic azure-mcp-secrets \
  --from-literal=tenant-id='<AZURE_TENANT_ID>' \
  --from-literal=client-id='<AZURE_CLIENT_ID>' \
  --from-literal=client-secret='<AZURE_CLIENT_SECRET>' \
  --from-literal=subscription-id='<AZURE_SUBSCRIPTION_ID>' \
  -n mcp-servers
```

### 4. Restart Azure MCP Pod

```bash
kubectl rollout restart deployment/azure-mcp -n mcp-servers
```

### 5. Get Server URL

```bash
# Option A: LoadBalancer IP
kubectl get svc -n mcp-servers azure-mcp
# Use the EXTERNAL-IP with port 3001

# Option B: Port forward
./k8s.sh port_forward mcp-servers svc/azure-mcp 3001 3001
# Use http://localhost:3001

# Option C: Ingress (requires DNS)
# http://azure-mcp.k8s.local:3001
```

### 6. Configure in LM Studio / Claude Code

**LM Studio:**
1. Settings → Server
2. Add MCP Server
3. Name: `Azure MCP`
4. URL: `http://<EXTERNAL-IP>:3001` or `http://localhost:3001`
5. Type: `HTTP REST`

**Claude Code:**
```json
{
  "mcpServers": {
    "azure": {
      "command": "curl",
      "args": ["http://<EXTERNAL-IP>:3001"]
    }
  }
}
```

### 7. Test Connection

```bash
# From your laptop
curl http://<EXTERNAL-IP>:3001/health

# Expected response:
# {"status":"ok","uptime":xxx}
```

## Azure Credentials in Jenkins Pipeline

For GitOps-based secrets creation:

```groovy
pipeline {
  environment {
    AZURE_TENANT_ID = credentials('azure-tenant-id')
    AZURE_CLIENT_ID = credentials('azure-client-id')
    AZURE_CLIENT_SECRET = credentials('azure-client-secret')
    AZURE_SUBSCRIPTION_ID = credentials('azure-subscription-id')
  }
  
  stages {
    stage('Deploy MCP Servers') {
      steps {
        sh '''
          kubectl create secret generic azure-mcp-secrets \
            --from-literal=tenant-id="${AZURE_TENANT_ID}" \
            --from-literal=client-id="${AZURE_CLIENT_ID}" \
            --from-literal=client-secret="${AZURE_CLIENT_SECRET}" \
            --from-literal=subscription-id="${AZURE_SUBSCRIPTION_ID}" \
            -n mcp-servers --dry-run=client -o yaml | kubectl apply -f -
          
          kubectl apply -k apps/base/mcp-servers
          kubectl rollout status deployment/azure-mcp -n mcp-servers
        '''
      }
    }
  }
}
```

## Troubleshooting

### Pod not starting

```bash
./k8s.sh describe_pod mcp-servers azure-mcp-xxxx
./k8s.sh show_pod_logs mcp-servers azure-mcp-xxxx
```

### Secret not mounted

```bash
# Verify secret exists
kubectl get secret azure-mcp-secrets -n mcp-servers

# Check environment variables in pod
kubectl exec -it deployment/azure-mcp -n mcp-servers -- env | grep AZURE
```

### Connection failing

```bash
# Test from within cluster
kubectl run -it --rm debug --image=alpine --restart=Never -n mcp-servers \
  -- sh -c "apk add curl && curl -v http://azure-mcp:3001/health"

# Test credentials
kubectl exec -it deployment/azure-mcp -n mcp-servers -- sh
# Inside pod: printenv | grep AZURE
```

## File Structure

```
apps/base/mcp-servers/
├── namespace.yaml                  # mcp-servers namespace
├── azure-mcp-configmap.yaml        # Configuration
├── azure-mcp-deployment.yaml       # Deployment
├── azure-mcp-service.yaml          # LoadBalancer service
├── azure-mcp-secrets.yaml.template # Secrets template (DO NOT COMMIT)
├── excel-mcp-* (disabled)          # Excel MCP (commented out)
├── ingress.yaml                    # Ingress routes
├── kustomization.yaml              # Kustomize config
└── README.md                       # Documentation
```

## Security Best Practices

1. **Never commit secrets** - Use template file or Jenkins credentials
2. **Least privilege** - Create service principal with minimal required permissions
3. **Rotate credentials** - Update service principal passwords regularly
4. **RBAC** - Limit access to specific resource groups
5. **Network policies** - Restrict MCP server access if needed

## Service Principal Permissions

### For specific Resource Group (more secure):

```bash
az ad sp create-for-rbac \
  --name mcp-server \
  --role Contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group-name}
```

### For read-only access:

```bash
az ad sp create-for-rbac \
  --name mcp-server \
  --role Reader
```

## Next Steps

1. Deploy Azure MCP: `kubectl apply -k apps/base/mcp-servers`
2. Create Azure credentials
3. Add secret to Kubernetes
4. Restart pod: `kubectl rollout restart deployment/azure-mcp -n mcp-servers`
5. Configure in LM Studio or Claude Code
6. Test connection to Azure resources
