# Network Troubleshooting Guide

Common networking issues in this homelab and how to resolve them.

## Quick Reference

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Oracle VMs `NotReady` | WireGuard tunnel down | Restart WireGuard on Pi |
| DNS timeouts in cluster | CoreDNS on bad node | Restart CoreDNS or constrain to local nodes |
| Flux reconcile fails | DNS can't resolve github.com | Fix CoreDNS first |
| Cross-node pods can't communicate | Calico VXLAN broken | Restart Calico, delete vxlan.calico device |
| metrics-server shows `<unknown>` | Can't reach kubelet on Oracle VMs | Restart WireGuard on metrics-server node |

---

## Issue 1: WireGuard Tunnel Down After Reboot/Outage

### Symptoms
- `kubectl get nodes` shows Oracle VMs as `NotReady`
- `ping 10.49.104.1` from Pi fails
- `sudo wg show` shows stale "latest handshake" (minutes/hours old)

### Cause
After internet outage or power cycle, WireGuard peers lose handshake state. NAT mappings expire.

### Fix
```bash
# On Raspberry Pi (control plane)
sudo systemctl restart wg-quick@wg0
sleep 5
ping -c 2 10.49.104.1

# If HP ProBook also can't reach Oracle
ssh quinn-hpprobook430g6 "sudo systemctl restart wg-quick@wg0"
```

### Prevention
Add to ALL peer sections in `/etc/wireguard/wg0.conf`:
```ini
PersistentKeepalive = 25
```

---

## Issue 2: CoreDNS Scheduled on Oracle VMs

### Symptoms
- `nslookup kubernetes.default.svc.cluster.local` times out
- Flux reconcile fails with DNS errors
- CoreDNS logs show "Failed to watch" errors

### Cause
CoreDNS pods land on Oracle VMs which have network issues. DNS queries can't reach them.

### Fix
Force CoreDNS to run on local nodes only:
```bash
kubectl patch deployment coredns -n kube-system --type='json' -p='[
  {"op": "add", "path": "/spec/template/spec/affinity", "value": {
    "nodeAffinity": {
      "requiredDuringSchedulingIgnoredDuringExecution": {
        "nodeSelectorTerms": [{
          "matchExpressions": [{
            "key": "kubernetes.io/hostname",
            "operator": "In",
            "values": ["raspberrypi", "quinn-hpprobook430g6"]
          }]
        }]
      }
    }
  }}
]'
```

---

## Issue 3: Calico VXLAN MTU Error

### Symptoms
- Calico pods stuck at 0/1 Ready
- Logs show: `Failed to set vxlan tunnel device MTU error=invalid argument`
- Calico autodetects wrong interface (wg0 instead of eth0)

### Cause
Calico tries to create VXLAN tunnel on WireGuard interface which has reduced MTU.

### Fix
```bash
# Delete bad VXLAN device on affected node
ssh <node> "sudo ip link delete vxlan.calico"

# Delete stuck Calico pod
kubectl delete pod -n kube-system <calico-node-xxx>
```

### Prevention
Set Calico IP autodetection to correct interface:
```bash
kubectl set env daemonset/calico-node -n kube-system IP_AUTODETECTION_METHOD="interface=eth0,en.*,ens.*"
```

---

## Issue 4: Cross-Node Pod Communication Broken

### Symptoms
- Pods can communicate on same node but not across nodes
- DNS works when test pod lands on same node as CoreDNS
- Calico BGP peers show "Passive" or "Connect" instead of "Established"

### Cause
Calico BGP mesh not fully established after network disruption.

### Fix
```bash
# Restart Calico on all nodes
kubectl rollout restart daemonset calico-node -n kube-system

# Wait for all to become 1/1 Ready
kubectl get pods -n kube-system -l k8s-app=calico-node -w
```

---

## Issue 5: Prometheus/Grafana Shows Oracle VMs Offline

### Symptoms
- Grafana dashboards show Oracle VMs as OFFLINE
- `kubectl top nodes` shows `<unknown>` for Oracle VMs

### Cause
- Prometheus can't scrape node-exporter on Oracle VMs
- metrics-server can't reach kubelet on Oracle VMs

### Fix
1. Ensure WireGuard is working on all nodes
2. Add static scrape targets for Oracle VMs (already configured in prometheus helm-release)
3. Restart metrics-server on a node that can reach Oracle VMs:
```bash
kubectl rollout restart deployment metrics-server -n kube-system
```

---

## Recovery Sequence After Major Outage

Run these in order:

```bash
# 1. Restart WireGuard on all nodes
sudo systemctl restart wg-quick@wg0
ssh quinn-hpprobook430g6 "sudo systemctl restart wg-quick@wg0"


# 2. Verify connectivity
ping -c 2 10.49.104.1
ping -c 2 10.49.104.4

# 3. Restart Calico
kubectl rollout restart daemonset calico-node -n kube-system

# 4. Wait for Calico
sleep 60
kubectl get pods -n kube-system -l k8s-app=calico-node

# 5. Restart CoreDNS
kubectl rollout restart deployment coredns -n kube-system

# 6. Test DNS
kubectl run -it --rm dns-test --image=busybox --restart=Never -- nslookup kubernetes.default.svc.cluster.local

# 7. If DNS works, reconcile Flux
flux reconcile kustomization apps --with-source
```
