# n8n Sandbox Service

Internal code-execution sandbox for n8n Instance AI. n8n reaches the API at:

```text
http://n8n-sandbox-api.apps.svc.cluster.local:8080
```

The service has no Ingress or LoadBalancer. A NetworkPolicy allows API traffic
from the n8n pod and runner traffic from the sandbox API only.

The deployment uses the official `n8n-sandbox-service` Helm chart 0.4.0,
pinned by OCI digest, with the chart's supported 1.1.0 API, runner, and sandbox
image set.

## Runtime and storage

- The runner is scheduled only on `quinn-hpprobook430g6`.
- Sysbox provides the nested-container isolation through `sysbox-runc`.
- The API uses a 1 GiB local PV for routing state.
- The runner uses a 16 GiB local PV with a 12 GiB XFS quota pool.
- Each generated sandbox is limited to 512 MiB RAM, one CPU, 256 PIDs, and a
  1 GiB writable layer. At most four sandboxes may run concurrently.
- Idle sandboxes stop after 15 minutes and are deleted after one hour.

## Secrets

The `*.secret.enc.yaml` files are SOPS-encrypted and contain the API keys plus
the four mTLS identities used between the API and runner. The API key is also
injected into the n8n Deployment.

To print the value needed by the n8n **Add a code sandbox** dialog:

```bash
kubectl get secret -n apps n8n-sandbox-auth \
  -o jsonpath='{.data.api-keys}' | base64 --decode; echo
```

## Verification

```bash
kubectl get runtimeclass sysbox-runc
kubectl get pods,pvc -n apps -l app.kubernetes.io/name=n8n-sandbox-service
kubectl exec -n apps deploy/n8n -- \
  wget -qO- http://n8n-sandbox-api.apps.svc.cluster.local:8080/healthz
kubectl logs -n apps deploy/n8n-sandbox-api --tail=100
kubectl logs -n apps statefulset/n8n-sandbox-sysbox-runner --tail=100
```

The Sysbox manifest is vendored under `apps/base/sysbox/`. Its installer uses
the digest-pinned v0.7.1 amd64 image, which supports Ubuntu 24.04, kernel 6.8+,
and containerd 2.x.
