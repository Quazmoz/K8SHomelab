# AI Context: NGINX Ingress Controller

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Cluster-wide HTTP/HTTPS ingress controller. Routes all `*.k8s.local` traffic from MetalLB LoadBalancer IP to backend services.

## Architecture

- **Type:** Remote manifest install (ingress-nginx controller v1.14.1)
- **Namespace:** `ingress-nginx`
- **Service Type:** LoadBalancer (IP from MetalLB)

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Pulls remote manifests, applies patches inline |

## Key Details

- `externalTrafficPolicy: Cluster` patch is required for MetalLB to work correctly
- `allow-snippet-annotations: "true"` is required for Authentik forward-auth configurations used by MCPO and other protected ingresses
- All application Ingress resources reference `ingressClassName: nginx`

## Dependencies

- **Depends on:** MetalLB (for LoadBalancer IP assignment)
- **Depended on by:** Every service with an Ingress resource (all `*.k8s.local` URLs)

## Modification Notes

- Upgrading the controller version: change the URL in kustomization.yaml
- If adding new middleware/annotations, ensure the controller ConfigMap allows them
- The controller runs in its own namespace `ingress-nginx`, not `apps`
