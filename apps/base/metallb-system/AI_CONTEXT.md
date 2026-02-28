# AI Context: MetalLB Load Balancer

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Provides bare-metal LoadBalancer IP allocation using Layer 2 ARP advertisement. This is the core networking infrastructure that allows Kubernetes services to get external IPs on the local network.

## Architecture

- **Type:** Remote manifest install (MetalLB v0.14.5 native manifests)
- **Namespace:** `metallb-system`
- **Mode:** L2 Advertisement (ARP-based)
- **IP Pool:** `192.168.1.221–192.168.1.250`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Pulls remote MetalLB manifests + local config + patches |
| `config.yaml` | `IPAddressPool` and `L2Advertisement` CRDs |

## Key Details

- Oracle VMs (`oracle-wireguard`, `oracle-groupmebot`) are excluded from speaker DaemonSet via node affinity patch (WireGuard causes L2 issues)
- The IPAddressPool `homelab-pool` is the only pool and serves all LoadBalancer services
- L2Advertisement has no specific ipAddressPools selector (advertises all pools)

## Dependencies

- **Depends on:** Nothing
- **Depended on by:** ingress-nginx (LoadBalancer IP), AdGuard Home (LoadBalancer IP), any future LoadBalancer services

## Modification Notes

- Changing the IP pool range affects all LoadBalancer services
- Adding new nodes may require updating the speaker exclusion patches
- MetalLB CRDs (IPAddressPool, L2Advertisement) are part of the MetalLB install, not defined here
