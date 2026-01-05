# K8S Homelab

GitOps-managed Kubernetes homelab running on hybrid infrastructure (local nodes + Oracle Cloud VMs).

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      KUBERNETES CLUSTER                         │
├─────────────────────────────────────────────────────────────────┤
│  Control Plane:  raspberrypi (192.168.1.21)                     │
│                                                                 │
│  Workers:                                                       │
│    • quinn-hpprobook430g6 (192.168.1.15) - Main workloads       │
│    • oracle-wireguard (10.49.104.1) - Oracle Cloud              │
│    • oracle-groupmebot (10.49.104.4) - Oracle Cloud             │
├─────────────────────────────────────────────────────────────────┤
│  Networking: Calico (VXLAN) + WireGuard mesh                    │
│  GitOps: Flux CD                                                │
│  Ingress: NGINX + MetalLB (192.168.1.220-250)                   │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Services

| Service | URL | Description |
|---------|-----|-------------|
| **OpenWebUI** | http://openwebui.k8s.local | LLM Chat Interface |
| **Grafana** | http://grafana.k8s.local | Dashboards & Monitoring |
| **Prometheus** | http://prometheus.k8s.local | Metrics Collection |
| **Jenkins** | http://jenkins.k8s.local | CI/CD Pipelines |
| **n8n** | http://n8n.k8s.local | Workflow Automation |
| **Homepage** | http://homepage.k8s.local | Dashboard |
| **LlamaFactory** | http://llamafactory.k8s.local | LLM Fine-Tuning |
| **Azure MCP** | http://mcpo.k8s.local/docs | Azure MCP via OpenAPI |

| **Plex** | http://192.168.1.221:32400 | Media Server |

## 📁 Repository Structure

```
K8SHomelab/
├── apps/base/           # Kubernetes manifests
│   ├── grafana/         # Grafana + dashboards
│   ├── prometheus/      # Prometheus HelmRelease
│   ├── openwebui/       # LLM chat interface
│   ├── mcp-servers/     # Azure MCP (mcpo)
│   ├── jenkins/         # CI/CD
│   ├── n8n/             # Workflow automation
│   └── ...              # Other apps
├── clusters/my-homelab/ # Flux kustomizations
└── docs/                # Network docs
```

## 🔧 Quick Start

### Deploy Changes
```bash
git add -A && git commit -m "message" && git push
flux reconcile kustomization apps --with-source
```

### Check Status
```bash
kubectl get pods -n apps -o wide
flux get all -A
```

### Add to Hosts File
```
192.168.1.221 openwebui.k8s.local grafana.k8s.local prometheus.k8s.local jenkins.k8s.local n8n.k8s.local homepage.k8s.local llamafactory.k8s.local mcpo.k8s.local pgadmin.k8s.local
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [AGENT_CONTEXT.md](AGENT_CONTEXT.md) | Context for AI agents |
| [SETUP_SUMMARY.md](SETUP_SUMMARY.md) | Complete setup guide |
| [docs/NETWORK.md](docs/NETWORK.md) | Network architecture |
| [apps/base/ORACLE_NODE_POLICY.md](apps/base/ORACLE_NODE_POLICY.md) | Oracle VM scheduling policy |
| [apps/base/mcp-servers/README.md](apps/base/mcp-servers/README.md) | MCP integration guide |

## ⚠️ Known Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Oracle VMs NotReady | WireGuard tunnel drops | `sudo systemctl restart wg-quick@wg0` |
| DNS fails cluster-wide | CoreDNS on Oracle VMs | See [NETWORK_TROUBLESHOOTING.md](docs/NETWORK_TROUBLESHOOTING.md) |
| Homepage metrics error | metrics-server on Oracle | Affinity excludes Oracle VMs |

## 🔐 Security

- Secrets managed via SOPS encryption
- Template files (`.template`) in Git with placeholders
- Actual secrets excluded via `.gitignore`
