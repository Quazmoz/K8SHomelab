# MetalLB Load Balancer

## Overview

MetalLB provides bare-metal LoadBalancer IP address allocation for services in the cluster. It runs in Layer 2 (L2) advertisement mode, making services accessible on the local network.

## Configuration

| Setting | Value |
|---------|-------|
| **Version** | v0.14.5 |
| **Mode** | L2 Advertisement |
| **IP Pool** | `192.168.1.221–192.168.1.250` |
| **Namespace** | `metallb-system` |

## IP Allocation

Services of type `LoadBalancer` are automatically assigned IPs from the pool. Key allocations:

| IP | Service |
|----|---------|
| `192.168.1.221` | NGINX Ingress Controller |
| `192.168.1.222` | AdGuard Home (DNS) |

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list + patches |
| `config.yaml` | IPAddressPool and L2Advertisement |

## Patches Applied

- **Speaker DaemonSet:** Oracle VMs excluded from MetalLB speaker (WireGuard incompatible)

## Troubleshooting

```bash
# Check MetalLB pods
kubectl get pods -n metallb-system

# Check IP allocations
kubectl get svc -A | grep LoadBalancer

# Check speaker logs
kubectl logs -n metallb-system -l component=speaker --tail=50
```
