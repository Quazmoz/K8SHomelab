# SearXNG

Private metasearch backend for AI assistants. The service is deliberately
ClusterIP-only: it has no Ingress and is not reachable directly from the LAN.

## AI assistant configuration

Enter this as the SearXNG instance URL:

```text
http://searxng.apps.svc.cluster.local:8080
```

Workloads in the `apps` namespace may use the shorter equivalent
`http://searxng:8080`.

The JSON search API is enabled at:

```text
http://searxng.apps.svc.cluster.local:8080/search?q=kubernetes&format=json
```

## Operations

```bash
kubectl get pods,svc -n apps -l app.kubernetes.io/name=searxng
kubectl logs -n apps deployment/searxng
kubectl run -n apps searxng-smoke-test --rm -i --restart=Never \
  --image=curlimages/curl -- \
  curl -fsS 'http://searxng:8080/search?q=kubernetes&format=json'
```

To inspect the HTML UI without exposing it through Ingress:

```bash
kubectl port-forward -n apps service/searxng 8080:8080
```

Then open <http://localhost:8080>.

Configuration is stored in `searxng-configmap.yaml`. The application secret is
encrypted with SOPS in `searxng-secret.enc.yaml`. Search cache data is
disposable and uses a size-limited `emptyDir`, so no local PV is required.
