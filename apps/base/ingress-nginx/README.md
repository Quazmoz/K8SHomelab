# NGINX Ingress Controller

## Overview

The NGINX Ingress Controller handles all HTTP/HTTPS routing for `*.k8s.local` services. It receives traffic via a MetalLB LoadBalancer IP and routes to backend services based on Ingress rules.

## Configuration

| Setting | Value |
|---------|-------|
| **Version** | v1.14.1 |
| **Service Type** | LoadBalancer (via MetalLB) |
| **External Traffic Policy** | Cluster |
| **Snippet Annotations** | Enabled (for Authentik) |

## How It Works

1. MetalLB assigns a LoadBalancer IP (192.168.1.221)
2. DNS entries in hosts file point `*.k8s.local` → 192.168.1.221
3. NGINX routes based on `Host` header to appropriate backend services

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Remote manifest + patches |

## Patches Applied

- `externalTrafficPolicy: Cluster` — required for MetalLB compatibility
- `allow-snippet-annotations: "true"` — enables Authentik auth snippets in Ingress resources

## Troubleshooting

```bash
# Check ingress controller pods
kubectl get pods -n ingress-nginx

# Check all ingress rules
kubectl get ingress -A

# View NGINX logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=50

# Test routing
curl -H "Host: homepage.k8s.local" http://192.168.1.221
```
