# MCP Servers - Laptop Connection Guide

## Quick Start

Your Excel MCP server is now ready to use with LM Studio and Claude Code from your laptop.

## Step 1: Deploy the Server

```bash
# From the K8SHomelab directory
kubectl apply -k apps/base/mcp-servers

# Verify it's running
kubectl get pods -n mcp-servers
kubectl get svc -n mcp-servers
```

## Step 2: Get the Server Address

### Option A: LoadBalancer IP (Recommended for local network)

```bash
kubectl get svc -n mcp-servers excel-mcp

# Look for the EXTERNAL-IP column
# Example output:
# NAME        TYPE           CLUSTER-IP     EXTERNAL-IP    PORT(S)
# excel-mcp   LoadBalancer   10.x.x.x       192.168.x.x    3000:xxxxx/TCP
```

Use: `http://192.168.x.x:3000` on your laptop

### Option B: Port Forward (For testing)

```bash
./k8s.sh port_forward mcp-servers svc/excel-mcp 3000 3000

# Then use on laptop: http://localhost:3000
```

### Option C: Ingress (Requires DNS)

Edit your `/etc/hosts` or configure DNS:
```
192.168.x.x excel-mcp.k8s.local
```

Use: `http://excel-mcp.k8s.local:3000`

## Step 3: Configure in LM Studio

1. Open **LM Studio**
2. Go to **Settings** → **Server** (or relevant section)
3. Add new MCP Server:
   - **Type**: HTTP REST
   - **URL**: `http://192.168.x.x:3000` (or your chosen address from Step 2)
   - **Name**: Excel MCP

## Step 4: Configure in Claude Code

1. In Claude Code settings
2. Add Model Context Protocol server:
   - **Type**: MCP
   - **URL**: `http://192.168.x.x:3000`
   - **Protocol**: HTTP

Or if using configuration file, add to your MCP config:

```json
{
  "mcpServers": {
    "excel": {
      "command": "curl",
      "args": ["http://192.168.x.x:3000"]
    }
  }
}
```

## Verification

Test the connection from your laptop:

```bash
# From your laptop (on the same network)
curl http://192.168.x.x:3000/health

# Expected response:
# {"status":"ok","uptime":xxx}
```

## Available Endpoints

Once connected, the Excel MCP server provides:

- **GET /health** - Server health status
- **POST /api/read-excel** - Read Excel file
- **POST /api/read-csv** - Read CSV file
- **POST /api/write-excel** - Write to Excel file
- **POST /api/execute-formula** - Execute Excel formulas

## Troubleshooting

### Server won't start
```bash
./k8s.sh describe_pod mcp-servers excel-mcp-xxxx
./k8s.sh show_pod_logs mcp-servers excel-mcp-xxxx
```

### Can't connect from laptop
1. Verify LoadBalancer has external IP: `kubectl get svc -n mcp-servers`
2. Check firewall rules on your homelab
3. Test connectivity: `ping 192.168.x.x` from laptop
4. Check pod logs: `./k8s.sh show_pod_logs mcp-servers <pod-name>`

### Getting 503 Service Unavailable
- Pod may still be starting (check readiness probe)
- Check logs: `./k8s.sh show_pod_logs mcp-servers <pod-name>`
- Wait 30-60 seconds for initial deployment

## Next Steps

### Adding More MCP Servers

To add another MCP server (e.g., PDF handler, Web scraper), follow the pattern in `apps/base/mcp-servers/README.md`.

### Production Setup

For production use:
1. Enable TLS/SSL with proper certificates
2. Add authentication layer
3. Implement rate limiting
4. Restrict CORS origins
5. Set up network policies
6. Add persistent storage if needed

## Network Diagram

```
Your Laptop (on homelab network)
         |
         | HTTP requests
         | (port 3000)
         v
    Homelab Router
         |
         v
K8s Cluster (LoadBalancer Service)
         |
         v
excel-mcp Pod (Node.js MCP Server)
```

## File Structure

```
apps/base/mcp-servers/
├── kustomization.yaml          # Kustomize configuration
├── namespace.yaml              # mcp-servers namespace
├── excel-mcp-deployment.yaml   # Excel server deployment
├── excel-mcp-service.yaml      # LoadBalancer service
├── excel-mcp-configmap.yaml    # Configuration
├── ingress.yaml                # Nginx ingress
└── README.md                   # Detailed documentation
```

## Useful Commands

```bash
# Check all MCP server resources
./k8s.sh show_all_resources mcp-servers

# Watch pod status
./k8s.sh watch_resource pods mcp-servers

# Execute commands in pod (for debugging)
./k8s.sh exec_pod mcp-servers <pod-name> sh

# View real-time logs
./k8s.sh show_pod_logs mcp-servers <pod-name>

# Get pod resource usage
./k8s.sh show_pod_resources mcp-servers

# Restart the server (redeploy)
kubectl rollout restart deployment/excel-mcp -n mcp-servers
```

## References

- Excel MCP Server: https://github.com/haris-musa/excel-mcp-server
- Model Context Protocol: https://modelcontextprotocol.io/
- LM Studio: https://lmstudio.ai/
- Claude Code: https://www.anthropic.com/claude

## Support

For issues or questions:
1. Check logs: `./k8s.sh show_pod_logs mcp-servers <pod-name>`
2. Verify connectivity from laptop: `curl http://<server-ip>:3000/health`
3. Review README in `apps/base/mcp-servers/`
4. Check K8S_SCRIPT_README.md for troubleshooting commands
