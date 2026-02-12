# Context Forge Setup Guide

1. **Create Secrets**
   Context Forge requires secure secrets for JWT and admin authentication. Run this command in your terminal:
   
   ```bash
   kubectl create secret generic context-forge-secrets -n apps \
     --from-literal=JWT_SECRET_KEY="$(openssl rand -hex 32)" \
     --from-literal=BASIC_AUTH_PASSWORD="$(openssl rand -base64 12)" \
     --from-literal=PLATFORM_ADMIN_PASSWORD="$(openssl rand -base64 12)"
   ```

2. **Deploy**
   Apply the changes to your cluster:
   
   ```bash
   git add -A && git commit -m "Deploy Context Forge" && git push
   flux reconcile kustomization apps --with-source
   ```

3. **Verify Deployment**
   Check that Context Forge is running:
   
   ```bash
   kubectl get pods -n apps -l app=context-forge
   ```

4. **Register MCP Servers (via UI)**
   
   Go to `http://mcp.k8s.local/admin` -> **Add Server**:

   ### SSE Servers (Remote)
   | Name | Type | URL | Headers / Notes |
   |------|------|-----|-----------------|
   | **groupme** | SSE | `http://groupme-backend.apps.svc.cluster.local:5000/sse` | **Passthrough**: `X-Authenticated-User` |
   | **clickup-native** | SSE | `http://clickup-mcp-server.apps.svc.cluster.local:5000/sse` | |
   | **n8n** | SSE | `http://n8n.apps.svc.cluster.local:5678/mcp-server/http` | Header: `Authorization: Bearer <YOUR_N8N_TOKEN>` |

   ### Stdio Servers (Local/Container)
   For these, select **Type: Stdio**.

   **Azure**
   *   **Command**: `npx`
   *   **Args**: `-y @azure/mcp@latest server start`
   *   *(Env vars are auto-injected from deployment)*

   **Kubernetes**
   *   **Command**: `npx`
   *   **Args**: `-y kubernetes-mcp-server@latest`

   **PostgreSQL**
   *   **Command**: `npx`
   *   **Args**: `-y @henkey/postgres-mcp-server`
   *   **Env Vars**:
       *   `POSTGRES_HOST`: `postgres.apps.svc.cluster.local`
       *   `POSTGRES_USER`: `postgres`
       *   `POSTGRES_PASSWORD`: *(from postgres-credentials Secret)*
       *   `POSTGRES_DATABASE`: `postgres`

   **Prometheus**
   *   **Command**: `npx`
   *   **Args**: `-y prometheus-mcp-server`
   *   **Env Vars**:
       *   `PROMETHEUS_URL`: `http://prometheus-server.apps.svc.cluster.local`

   **FreshRSS**
   *   **Command**: `npx`
   *   **Args**: `-y mcp-server-fetch`
   *   **Env Vars**:
       *   `FETCH_URL`: `http://freshrss.apps.svc.cluster.local/api/greader.php`

5. **Configure OpenWebUI**
   - Go to **Admin Settings > External Tools**.
   - Add a new tool:
     - **Name**: Context Forge
     - **URL**: `http://context-forge.apps.svc.cluster.local:4444/sse`
   - Save.

6. **Register Your GroupMe Token**
   - In OpenWebUI Chat, run the command to register your token (if you have a tool for it) OR use a curl command against the backend:
     ```bash
     curl -X POST http://groupme-backend.apps.svc.cluster.local:5000/auth/register \
       -H "Authorization: Bearer <YOUR_OPENWEBUI_JWT>" \
       -d '{"groupme_token": "YOUR_GROUPME_TOKEN"}'
     ```
