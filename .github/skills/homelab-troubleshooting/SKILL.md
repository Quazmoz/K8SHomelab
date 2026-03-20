---
name: homelab-troubleshooting
description: "Diagnose and fix issues in the K8S homelab cluster. USE FOR: pod crashes, CrashLoopBackOff, networking issues, DNS failures, Calico/VXLAN problems, WireGuard tunnel issues, PVC binding failures, node scheduling problems, Flux reconciliation errors, service unreachable, ingress not routing, Oracle VM connectivity, Authentik SSO issues, MetalLB problems, resource exhaustion. Use this skill for ANY 'something is broken' scenario, even if you're not sure what category the problem falls into — it has the full diagnostic decision tree."
---

# Homelab Troubleshooting Skill

## When to Use

- Pods not starting, crashing, or stuck in Pending
- Services unreachable via ingress or internal DNS
- Network connectivity issues (cross-node, WireGuard, Calico)
- PVC stuck in Pending state
- Flux not applying changes
- Authentik SSO/OAuth issues
- MetalLB load balancer problems
- Any "it's broken" scenario — start here

## Cluster Architecture Quick Reference

```
Control Plane: orangepi6plus (192.168.1.21, wg: 10.49.104.3)
Worker:        quinn-hpprobook430g6 (192.168.1.15, wg: 10.49.104.6)
Oracle VM 1:   oracle-wireguard (wg: 10.49.104.1) — VPN hub
Oracle VM 2:   oracle-groupmebot (wg: 10.49.104.4)

CNI: Calico (VXLAN mode)
Pod CIDR: 10.244.0.0/16
Service CIDR: 10.96.0.0/12
MetalLB Pool: 192.168.1.221-250
Ingress IP: 192.168.1.221
```

**Key apps on orangepi6plus (control plane):** AdGuard Home, llama-cpp, freshrss, backup jobs  
**Key apps on quinn (worker):** Everything else (databases, OpenWebUI, n8n, Prometheus, etc.)

## Diagnostic Decision Tree

```
Is the pod running?
├── No → Pod Troubleshooting (below)
└── Yes
    ├── Can I reach it internally? (kubectl exec + curl)
    │   ├── No → Service/Network Troubleshooting
    │   └── Yes
    │       ├── Can I reach it via ingress?
    │       │   ├── No → Ingress Troubleshooting
    │       │   └── Yes → App-level issue (check logs)
    │       └── Is it in the correct state? (data, config)
    │           └── Check ConfigMaps, Secrets, PVC data
```

## Pod Troubleshooting

### Pod stuck in Pending

```bash
kubectl describe pod -n apps <pod> | grep -A10 Events
kubectl get events -n apps --field-selector involvedObject.name=<pod>
```

| Cause | Fix |
|-------|-----|
| No matching node (nodeSelector) | Check `nodeSelector` or `nodeAffinity` — node must exist and be Ready |
| Insufficient CPU/memory | Reduce resource requests or free up resources: `kubectl top nodes` |
| PVC not bound | See PVC Troubleshooting below |
| Toleration missing | Add control-plane toleration for orangepi6plus pods |

**Control-plane toleration** (required for pods on `orangepi6plus`):
```yaml
tolerations:
  - key: "node-role.kubernetes.io/control-plane"
    operator: "Exists"
    effect: "NoSchedule"
```

### Pod in CrashLoopBackOff

```bash
kubectl logs -n apps <pod> --previous --tail=100
kubectl describe pod -n apps <pod>
```

| Cause | Fix |
|-------|-----|
| Missing env var or secret | Check if Secret exists: `kubectl get secret -n apps` |
| Database not reachable | Check PostgreSQL/MongoDB/Redis pods are running |
| Permission denied on volume | Check PVC mount path ownership, use `securityContext.fsGroup` |
| Config error | Compare ConfigMap with expected format |
| Port conflict | Check if another pod is using the same port |

### Pod in ImagePullBackOff

```bash
kubectl describe pod -n apps <pod> | grep -A5 "Failed"
```

| Cause | Fix |
|-------|-----|
| Wrong image tag | Fix image name/tag in deployment |
| Rate limited (Docker Hub) | Wait or use alternative registry |
| Private registry | Add imagePullSecrets |
| Network issue | Check DNS from node: `ssh <node> "curl -I https://registry-1.docker.io"` |

## PVC Troubleshooting

```bash
kubectl get pvc -n apps | grep Pending
kubectl get pv | grep Available
kubectl describe pvc -n apps <pvc-name>
```

| Cause | Fix |
|-------|-----|
| No matching PV | Add PV to `apps/base/local-storage/storage.yaml` |
| PV bound to different PVC | Check `claimRef` in PV spec |
| StorageClass mismatch | Ensure PVC storageClassName matches PV |
| Size mismatch | PV capacity must be >= PVC request |
| Directory doesn't exist | SSH to node, create: `sudo mkdir -p /mnt/k8s-data/<app>` |

### Create missing PV

Add to `apps/base/local-storage/storage.yaml`:

```yaml
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: <app>-local-pv
spec:
  capacity:
    storage: <size>Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-storage
  local:
    path: /mnt/k8s-data/<app>
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
                - quinn-hpprobook430g6
```

## Network Troubleshooting

### DNS resolution test

```bash
kubectl run -it --rm dns-test --image=busybox --restart=Never -- nslookup kubernetes.default
kubectl run -it --rm dns-test --image=busybox --restart=Never -- nslookup postgres-service.apps.svc.cluster.local
```

### Cross-node connectivity

```bash
# Check Calico
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide
kubectl logs -n kube-system -l k8s-app=calico-node --tail=20

# Check node-to-node
kubectl exec -it -n kube-system <calico-node-pod> -- ping <other-node-ip>
```

### Calico VXLAN issues

**Symptom:** Pods on different nodes can't communicate.

```bash
# Fix: Delete vxlan.calico device and restart
kubectl delete pod -n kube-system -l k8s-app=calico-node

# Nuclear option: restart all Calico
kubectl rollout restart daemonset calico-node -n kube-system
```

### WireGuard tunnel issues

**Symptom:** Oracle VMs appear offline, cross-cloud connectivity broken.

```bash
# On the affected VM (SSH required):
sudo wg show
sudo systemctl restart wg-quick@wg0

# Verify from cluster:
ping 10.49.104.1   # Oracle VM 1
ping 10.49.104.4   # Oracle VM 2
```

## Ingress Troubleshooting

```bash
# Check ingress exists and has correct host
kubectl get ingress -n apps
kubectl describe ingress -n apps <ingress-name>

# Check NGINX controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=50

# Test from host
curl -v -H "Host: <app>.k8s.local" http://192.168.1.221
```

| Cause | Fix |
|-------|-----|
| Hosts file missing entry | Add `<app>.k8s.local` to hosts pointing to `192.168.1.221` |
| Wrong backend service/port | Check Ingress spec matches Service name and port |
| NGINX controller down | `kubectl rollout restart deployment -n ingress-nginx ingress-nginx-controller` |
| SSL redirect loop | Remove tls section or add `ssl-redirect: "false"` annotation |
| 413 Request Entity Too Large | Add `nginx.ingress.kubernetes.io/proxy-body-size: "50m"` annotation |

## Authentik / SSO Troubleshooting

**Symptom:** Getting 401/403 after Authentik protects an ingress, or OAuth redirect fails.

```bash
# Check Authentik server is running
kubectl get pods -n apps -l app=authentik

# Check outpost is healthy
kubectl logs -n apps -l app.kubernetes.io/name=authentik -c proxy --tail=50

# Test auth endpoint
curl -sv http://authentik-server.apps.svc.cluster.local:9000/outpost.goauthentik.io/auth/nginx
```

| Cause | Fix |
|-------|-----|
| Authentik pod down | Restart: `kubectl rollout restart deployment authentik-server -n apps` |
| OAuth redirect URI mismatch | Check provider redirect URIs in Authentik admin UI |
| Session expired | User needs to re-auth at `auth.k8s.local` |
| Forward auth annotation wrong | Verify `auth-url` and `auth-signin` annotation values in ingress |

## MetalLB Troubleshooting

**Symptom:** LoadBalancer service stuck in `<pending>` for external IP.

```bash
# Check MetalLB pods
kubectl get pods -n metallb-system

# Check IP pool config
kubectl get ipaddresspools -n metallb-system
kubectl get l2advertisements -n metallb-system

# Check service
kubectl describe svc <service-name> -n <namespace>
```

| Cause | Fix |
|-------|-----|
| MetalLB speaker crashed | Restart: `kubectl rollout restart daemonset speaker -n metallb-system` |
| IP pool exhausted | Add more IPs to IPAddressPool |
| L2 advertisement missing | Ensure L2Advertisement exists referencing the pool |

## Service Troubleshooting

```bash
# Check service exists and has endpoints
kubectl get svc -n apps <service>
kubectl get endpoints -n apps <service>

# Test from within cluster
kubectl run -it --rm curl-test --image=curlimages/curl --restart=Never -- \
  curl -v http://<service>.apps.svc.cluster.local:<port>
```

**No endpoints?** → Labels on pod don't match selector on Service.

## Major Outage Recovery Sequence

If multiple things are broken, follow this order:

1. **WireGuard** — Restore VPN connectivity
   ```bash
   # On each Oracle VM
   sudo systemctl restart wg-quick@wg0
   ```

2. **Node health** — Check all nodes are Ready
   ```bash
   kubectl get nodes -o wide
   ```

3. **Calico** — Restore pod networking
   ```bash
   kubectl rollout restart daemonset calico-node -n kube-system
   # Wait 2 minutes
   ```

4. **CoreDNS** — Restore cluster DNS
   ```bash
   kubectl rollout restart deployment coredns -n kube-system
   ```

5. **Verify DNS**
   ```bash
   kubectl run -it --rm dns-test --image=busybox --restart=Never -- nslookup kubernetes.default
   ```

6. **MetalLB** — Restore load balancer IPs
   ```bash
   kubectl rollout restart daemonset speaker -n metallb-system
   ```

7. **Flux reconcile** — Re-sync all apps
   ```bash
   flux reconcile kustomization apps --with-source
   flux get all -A
   ```

8. **Check critical services first:**
   - PostgreSQL (`kubectl get pods -n apps -l app=postgres`)
   - Redis (`kubectl get pods -n apps -l app=redis`)
   - Ingress NGINX (`kubectl get pods -n ingress-nginx`)
   - Authentik (`kubectl get pods -n apps -l app.kubernetes.io/name=authentik`)

## Quick Health Check Script

```bash
echo "=== Nodes ==="
kubectl get nodes -o wide

echo -e "\n=== Non-Running Pods ==="
kubectl get pods -A | grep -v Running | grep -v Completed

echo -e "\n=== Flux Status ==="
flux get kustomization apps

echo -e "\n=== HelmReleases ==="
flux get helmreleases -A

echo -e "\n=== PVC Issues ==="
kubectl get pvc -A | grep -v Bound

echo -e "\n=== MetalLB ==="
kubectl get pods -n metallb-system

echo -e "\n=== Recent Events (Warnings) ==="
kubectl get events -A --field-selector type=Warning --sort-by='.lastTimestamp' | tail -20
```
