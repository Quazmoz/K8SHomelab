# MCP Servers

Model Context Protocol (MCP) servers for AI tools like LM Studio and Claude Code.

## Overview

This directory contains deployments for Model Context Protocol servers that provide specialized functionality to AI applications. Currently includes:

- **Azure MCP Server** - Interact with Microsoft Azure resources via MCP protocol
- **Excel MCP Server** (disabled) - Read and manipulate Excel/CSV files via MCP protocol

## Architecture

All MCP servers run in the `mcp-servers` namespace with the following characteristics:

- **Network Access**: LoadBalancer service for direct network access from your laptop
- **Ingress**: Nginx ingress controller for domain-based access
- **Probes**: Health checks (livenessProbe and readinessProbe)
- **Resources**: Conservative defaults, easily adjustable per server
- **Secrets**: Sensitive credentials stored as Kubernetes secrets

## Azure MCP Server

### What It Does

The Azure MCP server allows AI models to:
- Query Azure resources (VMs, storage, databases, etc.)
- Manage Azure subscriptions and resource groups
- Execute Azure operations through natural language
- Interact with Azure services (App Service, Functions, etc.)

### Connection Details

**For LM Studio / Claude Code on your laptop:**

```
Server URL: http://<your-homelab-ip>:3001
Protocol: HTTP/REST MCP
Type: Azure Resource Management
```

Or via ingress (requires DNS entry):
```
Server URL: http://azure-mcp.k8s.local:3001
```

### Configuration

ConfigMap: `azure-mcp-config`
- `MCP_SERVER_PORT`: 3001
- `NODE_ENV`: production
- `LOG_LEVEL`: info
- `AZURE_TIMEOUT`: 30000ms
- `MAX_QUERY_RESULTS`: 1000

### Azure Credentials

Azure credentials are stored in a Kubernetes secret: `azure-mcp-secrets`

**Required credentials:**
- `tenant-id` - Azure AD Tenant ID
- `client-id` - Service Principal Client ID
- `client-secret` - Service Principal Client Secret
- `subscription-id` - Azure Subscription ID

#### Creating the Secret

**Option 1: Manual kubectl**
```bash
kubectl create secret generic azure-mcp-secrets \
  --from-literal=tenant-id='your-tenant-id' \
  --from-literal=client-id='your-client-id' \
  --from-literal=client-secret='your-client-secret' \
  --from-literal=subscription-id='your-subscription-id' \
  -n mcp-servers
```

**Option 2: From template file**
```bash
# Edit azure-mcp-secrets.yaml.template with actual values
kubectl apply -f azure-mcp-secrets.yaml.template
```

**Option 3: Jenkins Pipeline** (GitOps)
```groovy
stage('Create Azure MCP Secrets') {
  steps {
    sh '''
      kubectl delete secret azure-mcp-secrets -n mcp-servers --ignore-not-found
      kubectl create secret generic azure-mcp-secrets \
        --from-literal=tenant-id="${AZURE_TENANT_ID}" \
        --from-literal=client-id="${AZURE_CLIENT_ID}" \
        --from-literal=client-secret="${AZURE_CLIENT_SECRET}" \
        --from-literal=subscription-id="${AZURE_SUBSCRIPTION_ID}" \
        -n mcp-servers
    '''
  }
}
```

### Getting Azure Credentials

1. **Create Service Principal** in Azure:
   ```bash
   az ad sp create-for-rbac --name mcp-server --role Contributor
   ```

2. Extract from output:
   - `appId` → `AZURE_CLIENT_ID`
   - `password` → `AZURE_CLIENT_SECRET`
   - `tenant` → `AZURE_TENANT_ID`

3. Get Subscription ID:
   ```bash
   az account show --query id -o tsv
   ```

### Resources

- **Requests**: 256Mi RAM, 250m CPU
- **Limits**: 512Mi RAM, 500m CPU
- **Replicas**: 1

## Excel MCP Server (Disabled)

The Excel MCP server code remains in the repository but is disabled. To re-enable:

1. Edit `kustomization.yaml`
2. Uncomment the excel-mcp lines:
   ```yaml
   #- excel-mcp-deployment.yaml
   #- excel-mcp-service.yaml
   #- excel-mcp-configmap.yaml
   ```
3. Apply: `kubectl apply -k apps/base/mcp-servers`
- `EXCEL_TIMEOUT`: 30000ms
- `MAX_FILE_SIZE`: 50MB

### Resources

- **Requests**: 256Mi RAM, 250m CPU
- **Limits**: 512Mi RAM, 500m CPU
- **Replicas**: 1

## Accessing from Your Laptop

### Option 1: Direct IP Access (Simplest)

```bash
# Get the LoadBalancer IP
kubectl get svc -n mcp-servers excel-mcp

# In LM Studio or Claude Code:
# Server URL: http://<EXTERNAL-IP>:3000
```

### Option 2: Using Ingress

Ensure your laptop's DNS (or /etc/hosts) resolves:
```
<homelab-ip> excel-mcp.k8s.local
```

Then use:
```
http://excel-mcp.k8s.local/
```

### Option 3: Port Forward

```bash
./k8s.sh port_forward mcp-servers svc/excel-mcp 3000 3000

# Then on your laptop:
# http://localhost:3000
```

## Deploying

```bash
# Deploy with kustomize
kubectl apply -k apps/base/mcp-servers

# Or just the Excel server
kubectl apply -k apps/base/mcp-servers --selector app=excel-mcp

# Check status
./k8s.sh show_pods mcp-servers
./k8s.sh show_services mcp-servers

# View logs
./k8s.sh show_pod_logs mcp-servers <pod-name>

# Port forward for testing
./k8s.sh port_forward mcp-servers svc/excel-mcp 3000 3000
```

## Health Check

```bash
# Test the server is responding
curl http://excel-mcp.k8s.local:3000/health

# Or from within cluster
kubectl run -it --rm debug --image=alpine --restart=Never -n mcp-servers \
  -- sh -c "apk add curl && curl http://excel-mcp:3000/health"
```

## Adding More MCP Servers

To add another MCP server:

1. Create a new deployment YAML file: `<server-name>-deployment.yaml`
2. Create a service file: `<server-name>-service.yaml`
3. Add resources to `kustomization.yaml`
4. Update ingress with new route (or create separate ingress)

Example structure for hypothetical "pdf-mcp" server:
```yaml
# pdf-mcp-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pdf-mcp
  namespace: mcp-servers
  labels:
    app: pdf-mcp
# ... deployment spec ...

---
# pdf-mcp-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: pdf-mcp
  namespace: mcp-servers
# ... service spec ...
```

Then update `kustomization.yaml`:
```yaml
resources:
  - namespace.yaml
  - excel-mcp-deployment.yaml
  - excel-mcp-service.yaml
  - pdf-mcp-deployment.yaml
  - pdf-mcp-service.yaml
```

## Troubleshooting

### Pod not starting

```bash
./k8s.sh describe_pod mcp-servers <pod-name>
./k8s.sh show_pod_events mcp-servers
```

### Server not responding

```bash
# Check if service is up
./k8s.sh show_services mcp-servers

# Check logs
./k8s.sh show_pod_logs mcp-servers <pod-name>

# Test connectivity
kubectl run -it --rm debug --image=alpine --restart=Never -n mcp-servers \
  -- sh -c "apk add curl && curl -v http://excel-mcp:3000/health"
```

### Network access from laptop

```bash
# Verify LoadBalancer has an external IP
kubectl get svc -n mcp-servers

# If MetalLB is configured, it should assign an IP from your pool
# Test from laptop:
curl http://<assigned-ip>:3000/health
```

## Security Considerations

- **CORS Enabled**: Currently allows all origins for development
- **No Authentication**: Add auth layer in production
- **File Access**: Server can access any file it mounts
- **Resource Limits**: Set to prevent resource exhaustion

For production:
1. Implement authentication/API keys
2. Restrict CORS to known origins
3. Use network policies to limit access
4. Enable TLS/SSL with proper certificates
5. Add rate limiting

## References

- [Excel MCP Server Repository](https://github.com/haris-musa/excel-mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [LM Studio Documentation](https://lmstudio.ai/)
