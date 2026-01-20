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

4. **Register MCP Servers**
   
   Get your admin bearer token:
   ```bash
   kubectl exec -it deploy/context-forge -n apps -- \
     python3 -m mcpgateway.utils.create_jwt_token \
     --username admin@localhost --exp 0 --secret <JWT_SECRET_KEY_FROM_STEP_1>
   ```
   *(Replace `<JWT_SECRET_KEY...>` with the actual value from the secret)*

   Then use the `register.sh` script (or curl) to register your servers:
   ```bash
   # Register GroupMe
   curl -X POST http://mcp.k8s.local/servers \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name": "groupme", "type": "sse", "url": "http://groupme-backend.apps.svc.cluster.local:5000/sse"}'
   ```

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
