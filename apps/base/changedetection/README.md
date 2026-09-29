# changedetection.io

Growth OS change-trigger layer. n8n owns webhooks and normalization; this
service only watches public URLs and emits events. It is not a crawler and
does not replace SearXNG.

Upstream: https://github.com/dgtlmoon/changedetection.io

Growth OS contract: `Quazmoz/growth-os` `docs/self-hosted-acquisition-layer.md`.

## Current deployment

| Area | State |
|---|---|
| Image | `docker.io/dgtlmoon/changedetection.io:0.60.8` (digest pinned, multi-arch; verified sha256:34df3680…) |
| Service | `http://changedetection.apps.svc.cluster.local:5000` |
| LAN UI | `http://changedetection.k8s.local` (ingress-nginx, not public Internet) |
| Storage | 5 GiB RWO `local-storage` PV `changedetection-local-pv` |
| Security | `allowPrivilegeEscalation: false`, `capabilities: drop: [ALL]`, `seccompProfile: RuntimeDefault`. Image runs as root (no USER directive upstream) — `runAsNonRoot` cannot be set. |
| Host path | `/mnt/k8s-data/changedetection` must exist on that node before the PVC can bind |
| Browser pool | Not deployed. Use the built-in HTTP fetcher only. |

## n8n contract

Create a **Webhook** node in n8n (POST). Call it from a changedetection
notification / Apprise URL using the **in-cluster** service, not nip.io:

```text
http://n8n.apps.svc.cluster.local:5678/webhook/<id>
```

Keep the payload small (watch URL, UUID, change summary). n8n then diffs,
dedupes, applies policy, and writes Growth OS evidence. Do not send raw HTML
to Paperclip.

n8n → changedetection API (after you copy the API key from Settings → API):

```text
GET http://changedetection.apps.svc.cluster.local:5000/api/v1/watch
Header: x-api-key: <runtime secret, not Git>
```

The API key is generated in the datastore on first boot. Store it in n8n
credentials, not this repository.

## Homepage

Add a `changedetection` tile under Growth OS only after the pod is Ready
(`apps/base/homepage/manifests.yaml`).

## Recovery

PVC reclaim is `Retain`. If the HP worker is lost, restore `/mnt/k8s-data/changedetection`
onto a replacement node only after updating the PV `nodeAffinity` hostname
in Git. The control-plane Orange Pi does not hold this data.

Homepage: add a `changedetection` tile under Growth OS only after the pod is Ready (see `apps/base/homepage/manifests.yaml`).

## Operations

```bash
ssh quinn-hpprobook430g6 "sudo mkdir -p /mnt/k8s-data/changedetection && sudo chown 1000:1000 /mnt/k8s-data/changedetection"
kubectl get pods,svc,pvc,ingress -n apps -l app.kubernetes.io/name=changedetection
kubectl exec -n apps deploy/n8n -- wget -qO- http://changedetection.apps.svc.cluster.local:5000/ | head
kubectl exec -n apps deploy/changedetection -- wget -qO- http://n8n.apps.svc.cluster.local:5678/healthz
```
