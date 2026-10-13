# MetalLB Load Balancer

## Overview

MetalLB provides bare-metal LoadBalancer IP address allocation for services in the cluster. It runs in Layer 2 (L2) advertisement mode, making services accessible on the local network.

## Configuration

| Setting | Value |
|---------|-------|
| **Version** | v0.16.1 |
| **Mode** | L2 Advertisement |
| **IP Pool** | `192.168.8.40-192.168.8.99` |
| **Namespace** | `metallb-system` |
| **Announcer** | `orangepi6plus`, wired interface `enp97s0` |

## IP Allocation

Services of type `LoadBalancer` are automatically assigned IPs from the pool. Key allocations:

| IP | Service |
|----|---------|
| `192.168.8.40` | NGINX Ingress Controller |

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list + patches |
| `config.yaml` | IPAddressPool and L2Advertisement |

## Patches Applied

- **Speaker DaemonSet:** Oracle VMs excluded from MetalLB speaker (WireGuard incompatible)
- **Speaker arguments:** `--ignore-exclude-lb` lets the wired control-plane node participate despite kubeadm's default exclusion label.
- **L2Advertisement:** `first-pool` is announced only by `orangepi6plus` on `enp97s0`. The HP worker remains available for workloads.

On 2026-10-13, `192.168.8.40` was allocated and all pods were Ready, but the Mac's ARP resolution and HTTPS requests to that address failed. MetalLB elected the HP worker on `wlp2s0`; ingress through the Pi's NodePort returned HTTP 200. Restricting announcements to the wired Pi fixes this entry path. Wi-Fi peer isolation or ARP filtering is an inference; router policy was not inspected or changed. A second wired announcer would be required for independent ingress failover.

This follows the upstream [L2 node/interface selection](https://metallb.io/configuration/_advanced_l2_configuration/) and [control-plane exclusion guidance](https://metallb.io/troubleshooting/).

## Troubleshooting

```bash
# Check MetalLB pods
kubectl get pods -n metallb-system

# Check IP allocations
kubectl get svc -A | grep LoadBalancer

# Check speaker logs
kubectl logs -n metallb-system -l component=speaker --tail=50
```
