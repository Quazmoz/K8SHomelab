# AI Context: Homelab ingress

> **AI Maintenance Rule:** Update this file and `README.md` when changing this deployment.

Traefik `v3.7.16` replaces retired ingress-nginx using its Kubernetes Ingress NGINX compatibility provider. Local manifests are managed by Flux. Keep the existing `ingress-nginx` namespace, `nginx` IngressClass (`k8s.io/ingress-nginx`), and `ingress-nginx-controller` LoadBalancer Service at `192.168.8.40`; changing these breaks existing and paused application routes or reassigns the load-balancer address.

- `traefik.yaml`: controller Deployment, Namespace, IngressClass, ServiceAccount and scoped RBAC.
- `service.yaml`: existing LoadBalancer name/address and `Cluster` traffic policy, selecting `app: traefik`.
- `kustomization.yaml`: local resources, with no retired upstream controller/webhook installation.
- Watches only `apps`; reads its services, EndpointSlices, configmaps and TLS secrets, updates ingress status. Cluster-wide access is limited to IngressClass discovery.
- Runs non-root on the HP worker with a read-only filesystem, no capabilities, health probes and bounded resources.
- Existing NGINX annotations/snippets are interpreted by the compatibility provider. Preserve application auth, CSP hash values, timeouts, caching, TLS secrets, OpenClaw token mapping and WebSocket rewriting. CSP override must precede `rewrite ... break`.
- MetalLB advertises the existing address. All application Ingresses retain `ingressClassName: nginx`.
- Do not add SSO to intentionally unauthenticated MCPO or wake paused services during controller maintenance.

Use a boolean-only dummy-token probe for header behavior; never expose actual credentials. Stage upgrades in parallel and verify all active hostnames before changing the production Service. Recovery details belong in `docs/CLUSTER_HEALTH_2026-10-21.md`.
