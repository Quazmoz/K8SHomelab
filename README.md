# K8S Homelab

A production-grade **GitOps-managed Kubernetes homelab** running on hybrid infrastructure — local ARM/x86 nodes and Oracle Cloud free-tier VMs. Built for real operational use: local LLM inference, AI agent infrastructure (MCP servers), workflow automation, monitoring, and self-hosted tooling.

[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=flat&logo=kubernetes&logoColor=white)](https://kubernetes.io)
[![Flux CD](https://img.shields.io/badge/Flux_CD-5468FF?style=flat&logo=flux&logoColor=white)](https://fluxcd.io)
[![Helm](https://img.shields.io/badge/Helm-0F1689?style=flat&logo=helm&logoColor=white)](https://helm.sh)
[![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=flat&logo=terraform&logoColor=white)](https://www.terraform.io)
[![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=flat&logo=prometheus&logoColor=white)](https://prometheus.io)
[![Grafana](https://img.shields.io/badge/Grafana-F46800?style=flat&logo=grafana&logoColor=white)](https://grafana.com)
[![NGINX](https://img.shields.io/badge/NGINX-009639?style=flat&logo=nginx&logoColor=white)](https://nginx.org)
[![n8n](https://img.shields.io/badge/n8n-EA4B71?style=flat&logo=n8n&logoColor=white)](https://n8n.io)

> All cluster state is declarative and GitOps-driven via Flux CD. No manual `kubectl apply` in production paths.

---

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

**Key design decisions:**
- **Flux CD** for GitOps — all reconciliation is pull-based from this repo
- **Calico VXLAN** for pod networking across heterogeneous node hardware
- **MetalLB** for bare-metal LoadBalancer IPs (no cloud LB dependency)
- **SOPS + Age** for secret encryption — secrets committed to git, never plaintext
- **HelmRelease** + **Kustomization** layering for environment-specific overrides

---

## 🚀 Running Services

| Service | URL | Description |
|---------|-----|-------------|
| **OpenWebUI** | http://openwebui.k8s.local | Local LLM chat interface (Ollama backend) |
| **Grafana** | http://grafana.k8s.local | Dashboards & monitoring |
| **Prometheus** | http://prometheus.k8s.local | Metrics collection & alerting |
| **n8n** | http://n8n.k8s.local | Workflow automation & AI pipelines |
| **Homepage** | http://homepage.k8s.local | Service dashboard |
| **Ansible AWX** | http://awx.k8s.local | Automation & config management |
| **Phoenix** | http://phoenix.k8s.local | LLM observability |
| **MCPO Gateway** | http://mcpo.k8s.local/docs | OpenAPI proxy for MCP servers |
| **Context Forge** | http://mcp.k8s.local | Dynamic MCP server hub |

---

## 📁 Repository Structure

```
K8SHomelab/
├── apps/base/           # Kubernetes manifests (HelmReleases, Deployments, ConfigMaps)
│   ├── grafana/         # Grafana + pre-built dashboards
│   ├── prometheus/      # Prometheus HelmRelease + alerting rules
│   ├── openwebui/       # Local LLM chat interface
│   ├── mcp-servers/     # Context Forge, MCPO gateway, Ansible MCP
│   ├── ansible/         # Ansible AWX operator deployment
│   ├── n8n/             # n8n workflow automation
│   └── ...              # Additional apps
├── clusters/my-homelab/ # Flux Kustomization entrypoints
├── scripts/             # Cluster bootstrap and maintenance scripts
└── docs/                # Network, security, and architecture documentation
```

---

## 🤖 AI & MCP Infrastructure

This cluster runs a self-hosted **Model Context Protocol (MCP)** stack, making local and cloud LLMs agent-capable against real infrastructure:

- **MCPO Gateway** — OpenAPI-compatible proxy that exposes MCP servers as REST endpoints, enabling any LLM client to call them without native MCP support
- **Context Forge** — Dynamic MCP server hub for routing agent requests to the right backend
- **OpenWebUI** — Frontend for local Ollama models with tool-use and agent pipeline support
- **n8n** — Low-code AI workflow automation, integrated with MCP endpoints and external APIs
- **Phoenix** — LLM observability: traces, evals, and prompt monitoring

---

## 🔧 Quick Start

### Deploy Changes
```bash
git add -A && git commit -m "message" && git push
flux reconcile kustomization apps --with-source
```

### Check Cluster Status
```bash
kubectl get pods -n apps -o wide
flux get all -A
```

### Local DNS (add to `/etc/hosts` or Pi-hole)
```
192.168.1.221 homepage.k8s.local openwebui.k8s.local grafana.k8s.local prometheus.k8s.local n8n.k8s.local mcpo.k8s.local mcp.k8s.local pgadmin.k8s.local qdrant.k8s.local awx.k8s.local jupyter.k8s.local phoenix.k8s.local mongo-express.k8s.local authentik.k8s.local redisinsight.k8s.local groupme.k8s.local
```

---

## 🔐 Security

- Secrets managed via **SOPS** with Age encryption — encrypted at rest, safe to commit
- Credentials stored in encrypted `postgres-credentials` and per-app secrets
- No hardcoded values in any manifest
- Detailed guide: [docs/SECURITY.md](docs/SECURITY.md)

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [AGENT_CONTEXT.md](AGENT_CONTEXT.md) | Context file for AI agents working in this repo |
| [SETUP_SUMMARY.md](SETUP_SUMMARY.md) | Complete cluster setup guide |
| [FLUX_JENKINS_INTEGRATION.md](FLUX_JENKINS_INTEGRATION.md) | Flux + Jenkins CI/CD integration |
| [docs/NETWORK.md](docs/NETWORK.md) | Network architecture & IP allocation |
| [apps/base/mcp-servers/README.md](apps/base/mcp-servers/README.md) | MCP server deployment guide |

---

## ⚠️ Known Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| DNS resolution failures | CoreDNS not scaling under load | See [NETWORK_TROUBLESHOOTING.md](docs/NETWORK_TROUBLESHOOTING.md) |

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Orchestration | Kubernetes (bare-metal kubeadm) |
| GitOps | Flux CD v2 |
| Networking | Calico (VXLAN), MetalLB, NGINX Ingress |
| Package Management | Helm, Kustomize |
| Secrets | SOPS + Age |
| Monitoring | Prometheus, Grafana |
| AI/LLM | OpenWebUI, Ollama, Phoenix |
| MCP | MCPO, Context Forge |
| Automation | n8n, Ansible AWX |
| Storage | Local PVs, PostgreSQL, Qdrant, Redis, MongoDB |
| Auth | Authentik (SSO) |
| Infrastructure | Oracle Cloud (free tier VMs), local ARM/x86 nodes |

---

*Part of a broader homelab + automation ecosystem. See [TerraformHomeLab](https://github.com/Quazmoz/TerraformHomeLab) for the IaC layer.*
