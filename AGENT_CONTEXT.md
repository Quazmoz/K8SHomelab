# K8S Homelab - AI Agent Context

This document provides context for AI agents working in this repository.

## Repository Purpose

GitOps-managed Kubernetes homelab running on hybrid infrastructure (local nodes + Oracle Cloud VMs).

## Architecture Overview

```
NODES:
├── raspberrypi (Control Plane) - 192.168.1.21 / wg: 10.49.104.3
├── quinn-hpprobook430g6 (Worker) - 192.168.1.15 / wg: 10.49.104.6
├── raspberrypi3 (Worker) - 192.168.1.58 / wg: 10.49.104.5
├── oracle-wireguard (Worker) - wg: 10.49.104.1 (Oracle Cloud)
└── oracle-groupmebot (Worker) - wg: 10.49.104.4 (Oracle Cloud)

NETWORKING:
├── CNI: Calico (VXLAN mode)
├── VPN: WireGuard mesh connecting all nodes
├── Pod CIDR: 10.244.0.0/16
└── Service CIDR: 10.96.0.10
```

## Key File Locations

| Path | Purpose |
|------|---------|
| `apps/base/` | Kubernetes manifests for all applications |
| `apps/base/kustomization.yaml` | Main app resource list |
| `apps/base/local-storage/storage.yaml` | PersistentVolume definitions |
| `clusters/my-homelab/` | Flux kustomization definitions |
| `docs/` | Documentation |

## GitOps Workflow

1. Manifests in `apps/base/<app>/` define Kubernetes resources
2. Flux monitors GitHub repo and applies changes automatically
3. HelmReleases use Flux HelmRepository sources
4. Secrets managed via SOPS encryption

## Common Tasks

### Adding a New Application
1. Create `apps/base/<app>/` directory
2. Add manifests (deployment, service, ingress, pvc)
3. Create `kustomization.yaml` listing resources
4. Add to `apps/base/kustomization.yaml`
5. If using local storage, add PV to `apps/base/local-storage/storage.yaml`
6. Commit and push - Flux will apply

### Deploying Changes
```bash
git add -A && git commit -m "message" && git push
flux reconcile kustomization apps --with-source
```

## Known Issues & Fixes

### Oracle VMs Go NotReady
**Cause**: WireGuard tunnel drops after network outage
**Fix**: `sudo systemctl restart wg-quick@wg0` on Pi

### DNS Fails Cluster-Wide
**Cause**: CoreDNS on Oracle VMs can't respond
**Fix**: See `docs/NETWORK_TROUBLESHOOTING.md`

### Calico Pods Stuck 0/1
**Cause**: VXLAN MTU error from wrong interface detection
**Fix**: Delete vxlan.calico device, restart Calico pod

## Node Scheduling Constraints

| Workload | Node | Reason |
|----------|------|--------|
| CoreDNS | Local nodes only | Oracle VMs have connectivity issues |
| Prometheus | quinn-hpprobook430g6 | Needs local storage |
| Grafana | quinn-hpprobook430g6 | Needs local storage |
| Loki | quinn-hpprobook430g6 | Needs local storage |
| Pi-hole | raspberrypi3 | DNS server for network |

## Important Configuration Details

### Calico IP Autodetection
Set to `interface=eth0,en.*,ens.*` to avoid detecting WireGuard interface.

### Prometheus Static Targets
Oracle VMs are scraped via static configs using WireGuard IPs since autodiscovery fails.

### HelmRelease API Version
All HelmReleases use `helm.toolkit.fluxcd.io/v2` (not v2beta1).

## Debugging Commands

```bash
# Check node status
kubectl get nodes -o wide

# Check Flux status
flux get all -A

# Check DNS
kubectl run -it --rm dns-test --image=busybox --restart=Never -- nslookup kubernetes.default.svc.cluster.local

# Check Calico
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide
kubectl logs -n kube-system -l k8s-app=calico-node --tail=20

# Check WireGuard
sudo wg show
ping 10.49.104.1  # Oracle-wireguard
ping 10.49.104.4  # Oracle-groupmebot
```

## Contact

Repository owner: Quinn Favo
