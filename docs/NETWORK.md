# Homelab Network Architecture

## Overview

This homelab uses a hybrid architecture with local nodes connected to Oracle Cloud VMs via WireGuard VPN.

## Network Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            WIREGUARD VPN MESH                                   │
│                           Network: 10.x.x.0/24                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   HOME NETWORK                               ORACLE CLOUD                       │
│   ┌─────────────────────────────┐            ┌─────────────────────────────┐   │
│   │                             │            │                             │   │
│   │  ┌─────────────────────┐   │   WireGuard│  ┌─────────────────────┐   │   │
│   │  │ Raspberry Pi 4      │◄──┼────────────┼──│ WireGuard Server    │   │   │
│   │  │ (Control Plane)     │   │   Tunnel   │  │ (VPN Hub)           │   │   │
│   │  └─────────────────────┘   │            │  └─────────────────────┘   │   │
│   │                             │            │                             │   │
│   │  ┌─────────────────────┐   │            │  ┌─────────────────────┐   │   │
│   │  │ x86 Workstation     │   │            │  │ Oracle VM 2         │   │   │
│   │  │ (Worker Node)       │   │            │  │ (Worker Node)       │   │   │
│   │  └─────────────────────┘   │            │  └─────────────────────┘   │   │
│   │                             │            │                             │   │
│   │  ┌─────────────────────┐   │            └─────────────────────────────┘   │
│   │  │ Raspberry Pi 3      │   │                                               │
│   │  │ (Worker Node)       │   │                                               │
│   │  └─────────────────────┘   │                                               │
│   │                             │                                               │
│   └─────────────────────────────┘                                               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Node Configuration

| Node | Location | Role | Notes |
|------|----------|------|-------|
| Raspberry Pi 4 | Home | Control Plane | Primary API server |
| x86 Workstation | Home | Worker | High-performance workloads |
| Raspberry Pi 3 | Home | Worker | USB storage for logs |
| Oracle VM 1 | Oracle Cloud | Worker + VPN Server | Always-free tier |
| Oracle VM 2 | Oracle Cloud | Worker | Always-free tier |

## Kubernetes Networking

| Component | Value |
|-----------|-------|
| Pod CIDR | 10.244.0.0/16 |
| Service CIDR | 10.96.0.0/12 |
| CNI | Calico (VXLAN mode) |

## WireGuard Setup

WireGuard VPN connects all nodes for cross-network pod communication.

### Server Configuration (Oracle VM)

See `wireguard-server-template.conf` (not committed - contains secrets)

### Client Configuration (Home Nodes)

```ini
[Interface]
PrivateKey = <generate-with-wg-genkey>
Address = <assigned-vpn-ip>/24

[Peer]
PublicKey = <server-public-key>
Endpoint = <server-public-ip>:51820
AllowedIPs = 10.x.x.0/24
PersistentKeepalive = 25
```

## Adding New Nodes

### Home Node

1. Generate WireGuard keys
2. Add peer on WireGuard server
3. Create client config
4. Join cluster: `kubeadm join <control-plane-ip>:6443 ...`

### Oracle Cloud Node

1. Configure WireGuard client
2. Configure kubelet to advertise VPN IP
3. Join via VPN IP with `--discovery-token-unsafe-skip-ca-verification`

## Security Notes

> [!CAUTION]
> - Never commit private keys to the repository
> - Keep WireGuard configs in `/etc/wireguard/` on each node
> - Rotate kubeadm tokens regularly
> - Use Oracle Cloud security lists to restrict inbound traffic

## Troubleshooting

```bash
# Check WireGuard status
sudo wg show

# Check Calico pods
kubectl get pods -n kube-system -l k8s-app=calico-node

# Test connectivity
ping <vpn-server-ip>
```

