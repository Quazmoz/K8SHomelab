# AdGuard Home (DNS)

## Overview

AdGuard Home provides network-wide DNS ad blocking and local DNS resolution. Accessible via MetalLB LoadBalancer IP.

## Access

- **Admin UI:** [http://192.168.1.222](http://192.168.1.222)
- **DNS:** `192.168.1.222:53` (TCP + UDP)

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `adguard/adguardhome:latest` |
| **Ports** | 53 (DNS TCP+UDP), 80 (admin), 3000 (setup) |
| **Storage** | 1Gi PVC (`local-storage` on Orange Pi) |
| **Node** | `orangepi6plus` (with control-plane + master tolerations) |
| **Service Type** | LoadBalancer (MetalLB shared IP) |
| **Strategy** | Recreate |

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `adguard-home.yaml` | Deployment, PVC |
| `AdGuardHome.yaml` | Service (LoadBalancer) + initial config |

## How It Works

1. MetalLB assigns IP `192.168.1.222` to the LoadBalancer service
2. Network devices/computers use this IP as their DNS server
3. AdGuard blocks ads and provides local DNS resolution
4. Configuration is persistent on PVC

## Important Notes

- Uses LoadBalancer (not Ingress) because DNS requires raw TCP/UDP
- Config is managed via the web UI — not declarative
- The initial setup wizard runs on port 3000

## Troubleshooting

```bash
# Check pod
kubectl get pods -n apps -l app=adguard-home

# Check service IP
kubectl get svc -n apps adguard-home

# View logs
kubectl logs -n apps -l app=adguard-home --tail=50

# Test DNS
nslookup google.com 192.168.1.222
```
