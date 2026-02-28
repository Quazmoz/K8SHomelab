# AI Context: AdGuard Home (DNS)

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Network-wide DNS ad blocking and local DNS resolution. Serves as the primary DNS server for the local network.

## Architecture

- **Type:** Deployment
- **Image:** `adguard/adguardhome:latest`
- **Namespace:** `apps`
- **Ports:** 53 (DNS TCP+UDP), 80 (web admin), 3000 (setup wizard)
- **Node:** `orangepi6plus` (with control-plane + master tolerations)
- **Service:** LoadBalancer (MetalLB, shared IP annotation)
- **Storage:** 1Gi PVC (`adguard-home-pvc`, `local-storage` on Orange Pi)
- **Admin URL:** `http://192.168.1.222`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `adguard-home.yaml` | Deployment + PVC |
| `AdGuardHome.yaml` | LoadBalancer Service + initial AdGuard configuration |

## Key Details

- Uses LoadBalancer instead of Ingress because DNS needs raw TCP/UDP on port 53
- MetalLB assigns IP `192.168.1.222` (shared IP annotation for multi-port)
- Config is GUI-managed, stored on PVC — NOT declarative
- Recreate strategy for RWO PVC
- Image tag is `latest` — updates on pod restart

## Dependencies

- **Depends on:** MetalLB (LoadBalancer IP), local-storage (PV on Orange Pi)
- **Depended on by:** Network clients using this as DNS

## Modification Notes

- DNS filtering rules and configuration are managed via the AdGuard web UI
- Initial config in `AdGuardHome.yaml` only applies on first setup
- Two files with similar names (`adguard-home.yaml` vs `AdGuardHome.yaml`) — be careful
- If the MetalLB IP pool changes, the DNS IP may change (update all clients)
- Port 53 requires the pod to run as a service type LoadBalancer, not an Ingress
