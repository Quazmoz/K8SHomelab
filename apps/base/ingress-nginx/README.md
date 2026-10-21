# Homelab ingress (Traefik)

Traefik `v3.7.16` handles application HTTP/HTTPS through its native Kubernetes Ingress NGINX compatibility provider. It replaces the retired ingress-nginx controller. The legacy directory, namespace, `nginx` IngressClass, and `ingress-nginx-controller` Service name remain so existing and paused applications retain their routes.

| Setting | Value |
|---------|-------|
| LoadBalancer address | `192.168.8.40` |
| External traffic policy | `Cluster` |
| Watched namespace | `apps` |
| Controller node | `quinn-hpprobook430g6` |
| Snippet annotations | Enabled for existing application behavior |

`traefik.yaml` declares the non-root controller, health probes, and RBAC. The controller can read routing resources and TLS secrets in `apps`; its only cluster-wide permission is listing/watching IngressClasses. `service.yaml` preserves the existing LoadBalancer object and address while selecting Traefik.

OpenClaw's CSP override precedes its WebSocket `rewrite ... break`, preserving query-token authorization mapping, WebSocket authorization clearing, path rewriting, and trusted client-IP handling. Test with a disposable dummy-token probe that returns booleans; never echo request credentials. Application authentication and the existing TLS secrets are preserved.

```bash
kubectl rollout status -n ingress-nginx deployment/traefik
kubectl get ingress -n apps
kubectl logs -n ingress-nginx deployment/traefik --tail=50
curl -H 'Host: homepage.k8s.local' http://192.168.8.40
```

For controller upgrades, change the pinned image in `traefik.yaml`, validate the existing annotations against the upstream compatibility provider, then verify HTTP, HTTPS, streaming, WebSockets, and application authentication before completion. The 2026-10-21 migration was tested in parallel before changing the production Service selector. See `docs/CLUSTER_HEALTH_2026-10-21.md` for verification and recovery details.
