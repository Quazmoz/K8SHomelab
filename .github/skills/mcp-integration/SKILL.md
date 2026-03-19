---
name: mcp-integration
description: "Work with MCP (Model Context Protocol) servers in the K8S homelab. USE FOR: adding new MCP servers, configuring Context Forge or MCPO, connecting MCP tools to OpenWebUI, troubleshooting MCP connectivity, understanding MCP architecture, GroupMe/Azure/ClickUp/Ansible MCP servers, MCP-to-OpenAPI proxy setup."
---

# MCP Integration Skill

## When to Use

- Adding a new MCP server to the cluster
- Configuring Context Forge gateway or MCPO proxy
- Connecting MCP tools to OpenWebUI
- Debugging MCP server connectivity or tool failures
- Understanding the MCP architecture

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    OpenWebUI                         │
│              (Workspace → Tools)                     │
└───────────┬───────────────────────┬─────────────────┘
            ↓                       ↓
┌───────────────────────┐  ┌──────────────────┐
│    Context Forge      │  │      MCPO         │
│    (MCP Gateway)      │  │  (OpenAPI Proxy)  │
│    Port: 4444         │  │  Port: 8000       │
│    mcp.k8s.local      │  │  mcpo.k8s.local   │
├───────────────────────┤  ├──────────────────┤
│ GroupMe (SSE, 5000)   │  │ Postgres MCP     │
│ Azure (HTTP, 8080)    │  │ Kubernetes MCP   │
│ ClickUp (SSE, 5000)   │  │ Prometheus MCP   │
└───────────────────────┘  │ n8n MCP          │
                           └──────────────────┘
                           
┌───────────────────────┐
│    Ansible MCP        │
│    (Standalone, 5000) │
└───────────────────────┘
```

## Two Gateway Systems

| Feature | Context Forge | MCPO |
|---------|---------------|------|
| Purpose | MCP gateway with per-user auth | MCP-to-OpenAPI proxy |
| Image | `ghcr.io/ibm/mcp-context-forge:v1.0.0-RC1` | `ghcr.io/open-webui/mcpo` (SHA) |
| Port | 4444 | 8000 |
| URL | `http://mcp.k8s.local` | `http://mcpo.k8s.local` |
| Node | `quinn-hpprobook430g6` | `orangepi6plus` |
| Auth | Per-user JWT tokens | Authentik forward-auth |
| Config | GUI-managed | Secret-based (`mcpo-config`) |
| Database | PostgreSQL (`context_forge`) | None |
| Cache | Redis | None |
| RBAC | Yes (K8s API access) | Yes (K8s API access) |

## Directory Structure

```
apps/base/mcp-servers/
├── kustomization.yaml        # Lists subdirectories
├── README.md                 # Detailed MCP guide
├── AI_CONTEXT.md             # AI context
├── contextforge/
│   ├── kustomization.yaml
│   ├── context-forge-deployment.yaml    # Context Forge main
│   ├── context-forge-service.yaml
│   ├── context-forge-ingress.yaml
│   ├── context-forge-pvc.yaml
│   ├── context-forge-rbac.yaml          # K8s API access
│   ├── context-forge-servers.yaml       # Server registrations
│   ├── groupme-backend.yaml             # GroupMe MCP server
│   ├── groupme-ingress.yaml
│   ├── groupme-netpol.yaml              # Network policy
│   ├── clickup-mcp.yaml                 # ClickUp MCP
│   └── azure-mcp.yaml                   # Azure MCP
├── mcpo/
│   ├── kustomization.yaml
│   ├── mcpo-deployment.yaml
│   ├── mcpo-service.yaml
│   ├── mcpo-ingress.yaml                # Authentik-protected
│   ├── mcpo-rbac.yaml
│   └── README.md
├── ansible-mcp/
│   ├── kustomization.yaml
│   └── ansible-mcp-deployment.yaml
└── legacy/                               # Disabled resources
```

## Procedure: Add a New MCP Server

### Step 1: Choose the gateway

- **Context Forge** — if the server needs per-user auth or SSE/WebSocket transport
- **MCPO** — if the server uses stdio transport and needs OpenAPI exposure
- **Standalone** — if neither gateway applies

### Step 2: Create the deployment

For a new standalone MCP server:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: <mcp-name>-mcp
  namespace: apps
  labels:
    app: <mcp-name>-mcp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: <mcp-name>-mcp
  template:
    metadata:
      labels:
        app: <mcp-name>-mcp
    spec:
      containers:
        - name: <mcp-name>-mcp
          image: <image>:<tag>
          ports:
            - containerPort: 5000
          env:
            - name: MCP_TRANSPORT
              value: "sse"        # or "http", "stdio"
          resources:
            requests:
              memory: "128Mi"
              cpu: "50m"
            limits:
              memory: "512Mi"
              cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: <mcp-name>-mcp
  namespace: apps
spec:
  selector:
    app: <mcp-name>-mcp
  ports:
    - port: 5000
      targetPort: 5000
```

### Step 3: Register with gateway

**For Context Forge:** Configure via the GUI at `http://mcp.k8s.local`

**For MCPO:** Add to the `mcpo-config` secret's server list:

```json
{
  "name": "<mcp-name>",
  "url": "http://<mcp-name>-mcp.apps.svc.cluster.local:5000"
}
```

### Step 4: Connect to OpenWebUI

1. Go to OpenWebUI → Workspace → Tools
2. Add the MCP endpoint URL
3. For Context Forge tools: use `http://mcp.k8s.local/...`
4. For MCPO tools: use `http://mcpo.k8s.local/...`

### Step 5: Add to kustomization

Add the new files to the appropriate `kustomization.yaml` under `mcp-servers/`.

## Secrets Required

| Secret | Used By | Contains |
|--------|---------|----------|
| `context-forge-secrets` | Context Forge | Admin credentials, JWT secret |
| `azure-mcp-credentials` | Azure MCP | Azure subscription, tenant, client ID/secret |
| `clickup-mcp-credentials` | ClickUp MCP | ClickUp API token |
| `groupme-mcp-secret` | GroupMe MCP | Internal auth token |
| `n8n-mcp-credentials` | MCPO | n8n API key |
| `ansible-mcp-secrets` | Ansible MCP | SSH keys, inventory |
| `mcpo-config` | MCPO | Server list configuration |

## Network Policies

GroupMe MCP has a `NetworkPolicy` restricting egress to:
- PostgreSQL (token storage)
- GroupMe API (external)
- DNS (kube-system)

Apply similar policies for new MCP servers handling sensitive data.

## RBAC Pattern

For MCP servers that need Kubernetes API access:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: <mcp-name>-sa
  namespace: apps
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: <mcp-name>-role
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "namespaces"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: <mcp-name>-binding
subjects:
  - kind: ServiceAccount
    name: <mcp-name>-sa
    namespace: apps
roleRef:
  kind: ClusterRole
  name: <mcp-name>-role
  apiGroup: rbac.authorization.k8s.io
```

## Debugging MCP Issues

```bash
# Check all MCP pods
kubectl get pods -n apps | grep -E "mcp|context-forge|mcpo|groupme|clickup|azure|ansible"

# Context Forge logs
kubectl logs -n apps -l app=context-forge --tail=50

# MCPO logs
kubectl logs -n apps -l app=mcpo --tail=50

# Test MCP server connectivity from within cluster
kubectl run -it --rm curl-test --image=curlimages/curl --restart=Never -- \
  curl -v http://context-forge.apps.svc.cluster.local:4444/health

# Check MCPO tools list
kubectl run -it --rm curl-test --image=curlimages/curl --restart=Never -- \
  curl http://mcpo.apps.svc.cluster.local:8000/openapi.json
```

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Tools not appearing in OpenWebUI | Server not registered in gateway | Register via GUI (Context Forge) or secret (MCPO) |
| 401 Unauthorized on MCPO | Authentik session expired | Re-authenticate at `auth.k8s.local` |
| MCP server CrashLoop | Missing secret/env var | Check logs, verify all secrets exist |
| Slow responses | Resource limits too low | Increase memory/CPU limits |
| GroupMe token expired | Token rotation needed | Update via Context Forge GUI |
