# MCPO Authentication with Authentik

This directory contains the deployment configuration for the Kubernetes MCP Server (`mcpo`), secured by Authentik.

## Authentication Flow

Access to `mcpo.k8s.local` is protected by Authentik's Embedded Outpost running in the cluster. The flow works as follows:

1.  **Request Interception**: The NGINX Ingress Controller intercepts all incoming requests to the `mcpo-ingress`.
2.  **Auth Subrequest**: NGINX sends a subrequest to the Authentik Outpost service (`http://authentik.apps.svc.cluster.local:9000/outpost.goauthentik.io/auth/nginx`).
    -   **Critical Configuration**: The Ingress definition includes an `auth-snippet` to strictly pass the original `Host` header (`proxy_set_header Host $http_host;`). Without this, the Outpost receives the internal service hostname and rejects the request (404).
3.  **Validation**:
    -   If the user has a valid session cookie for the application, Authentik returns `200 OK`.
    -   If not, it returns `401 Unauthorized` causing NGINX to redirect the user to the login page (`auth.k8s.local`).
4.  **Forwarding**: Upon successful authentication, NGINX forwards the request to the `mcpo` service on port 8000. It injects user identity headers (e.g., `X-authentik-username`, `X-authentik-email`) which the backend application can consume.

## Troubleshooting

### Symptoms
-   **500 Internal Server Error**: Often caused by NGINX failing the auth subrequest.
-   **404 on Auth Subrequest**: Authentik logs show 404 for `/outpost.goauthentik.io/auth/nginx`. This usually means the `Host` header is missing or incorrect.

### Verifying Fixes
Check the `ingress.yaml` for:
```yaml
nginx.ingress.kubernetes.io/auth-snippet: |
  proxy_set_header Host $http_host;
```
Ensure the NGINX Ingress Controller is configured to allow snippets (`allow-snippet-annotations: "true"`).
