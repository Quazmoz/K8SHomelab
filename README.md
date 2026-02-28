# K8S Homelab

GitOps-managed Kubernetes homelab running on hybrid infrastructure (local nodes + Oracle Cloud VMs).

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      KUBERNETES CLUSTER                         │
├─────────────────────────────────────────────────────────────────┤
│  Control Plane:  orangepi6plus (192.168.1.21)                   │
│                                                                 │
│  Workers:                                                       │
│    • quinn-hpprobook430g6 (192.168.1.15) - Main workloads       │
├─────────────────────────────────────────────────────────────────┤
│  Networking: Calico (VXLAN)                                     │
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
| **n8n** | http://n8n.k8s.local | Workflow Automation |
| **Homepage** | http://homepage.k8s.local | Dashboard |
| **Ansible AWX** | http://awx.k8s.local | Automation & Config Management |
| **Phoenix** | http://phoenix.k8s.local | LLM Observability |
| **MCPO Gateway** | http://mcpo.k8s.local/docs | OpenAPI Proxy for MCP |
| **Context Forge** | http://mcp.k8s.local | Dynamic MCP Server Hub |

## 📁 Repository Structure

```
K8SHomelab/
├── apps/base/           # Kubernetes manifests
│   ├── grafana/         # Grafana + dashboards
│   ├── prometheus/      # Prometheus HelmRelease
│   ├── openwebui/       # LLM chat interface
│   ├── mcp-servers/     # Context Forge, MCPO, Ansible MCP
│   ├── ansible/         # Ansible AWX
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
192.168.1.221 homepage.k8s.local openwebui.k8s.local grafana.k8s.local prometheus.k8s.local n8n.k8s.local mcpo.k8s.local mcp.k8s.local pgadmin.k8s.local qdrant.k8s.local awx.k8s.local jupyter.k8s.local phoenix.k8s.local mongo-express.k8s.local authentik.k8s.local redisinsight.k8s.local groupme.k8s.local
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [AGENT_CONTEXT.md](AGENT_CONTEXT.md) | Context for AI agents |
| [SETUP_SUMMARY.md](SETUP_SUMMARY.md) | Complete setup guide |
| [docs/NETWORK.md](docs/NETWORK.md) | Network architecture |
| [apps/base/mcp-servers/README.md](apps/base/mcp-servers/README.md) | MCP integration guide |

## ⚠️ Known Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| DNS issues | CoreDNS not scaling | Check [NETWORK_TROUBLESHOOTING.md](docs/NETWORK_TROUBLESHOOTING.md) |

## 🔐 Security

- Detailed guide: [docs/SECURITY.md](docs/SECURITY.md)
- Secrets managed via SOPS (Age encryption)
- Credentials stored in `postgres-credentials` (encrypted)
