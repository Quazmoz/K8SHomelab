# AI Context: MetalLB Load Balancer

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Provides bare-metal LoadBalancer IP allocation using Layer 2 ARP advertisement. This is the core networking infrastructure that allows Kubernetes services to get external IPs on the local network.

## Architecture

- **Type:** Remote manifest install (MetalLB v0.16.1 native manifests)
- **Namespace:** `metallb-system`
- **Mode:** L2 Advertisement (ARP-based)
- **IP Pool:** `192.168.8.40-192.168.8.99`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Pulls remote MetalLB manifests + local config + patches |
| `config.yaml` | `IPAddressPool` and `L2Advertisement` CRDs |

## Key Details

- Oracle VMs (`oracle-wireguard`, `oracle-groupmebot`) are excluded from speaker DaemonSet via node affinity patch (WireGuard causes L2 issues)
- The IPAddressPool `first-pool` serves `192.168.8.40-192.168.8.99`
- L2Advertisement `example` selects `first-pool`, node `orangepi6plus`, and wired interface `enp97s0`
- Speaker argument `--ignore-exclude-lb` bypasses kubeadm's default control-plane exclusion label; the L2 node selector still bounds eligible announcers
- The HP worker uses Wi-Fi (`wlp2s0`). On 2026-10-13, the Mac could not reach its advertised ingress VIP, while the Pi's ingress NodePort worked. Keep this pool on the wired Pi; do not restore Wi-Fi election without an external LAN reachability check.

## Dependencies

- **Depends on:** Nothing
- **Depended on by:** ingress-nginx (LoadBalancer IP), any future LoadBalancer services

## Modification Notes

- Changing the IP pool range affects all LoadBalancer services
- Adding new nodes may require updating the speaker exclusion patches
- Adding another announcer requires a verified wired LAN interface and an update to the L2 node/interface selectors
- MetalLB CRDs (IPAddressPool, L2Advertisement) are part of the MetalLB install, not defined here
