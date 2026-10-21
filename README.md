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

## 🎥 Video walkthroughs

| Homelab tour | MCP + OpenWebUI on Kubernetes | Grafana monitoring |
| :---: | :---: | :---: |
| [![Homelab Walkthrough: Kubernetes Cluster on Orange Pi 6 Plus & HP ProBook](https://img.youtube.com/vi/JsVBrGkCoos/0.jpg)](https://www.youtube.com/watch?v=JsVBrGkCoos) | [![Supercharging OpenWebUI with MCP, Kubernetes & MCPO](https://img.youtube.com/vi/JqYFe6K03HE/0.jpg)](https://www.youtube.com/watch?v=JqYFe6K03HE) | [![Ultimate Homelab Dashboard: Monitoring OpenWebUI & MCP with Grafana](https://img.youtube.com/vi/rFQtDQ-dZis/0.jpg)](https://www.youtube.com/watch?v=rFQtDQ-dZis) |
| **[Kubernetes Homelab Walkthrough](https://www.youtube.com/watch?v=JsVBrGkCoos)** | **[MCP + OpenWebUI Integration](https://www.youtube.com/watch?v=JqYFe6K03HE)** | **[Grafana Monitoring Dashboard](https://www.youtube.com/watch?v=rFQtDQ-dZis)** |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      KUBERNETES CLUSTER                         │
├─────────────────────────────────────────────────────────────────┤
│  Control Plane:  orangepi6plus (192.168.8.236)                   │
│                                                                 │
│  Workers:                                                       │
│    • quinn-hpprobook430g6 (192.168.8.162) - Main workloads       │
├─────────────────────────────────────────────────────────────────┤
│  Networking: Calico (VXLAN)                                     │
│  GitOps: Flux CD                                                │
│  Ingress: NGINX + MetalLB (192.168.8.40-192.168.8.99)                   │
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
| **changedetection.io** | http://changedetection.k8s.local | Growth OS page-change triggers (LAN UI; ClusterIP for n8n) |
| **Homepage** | http://homepage.k8s.local | Service dashboard |
| **Ansible AWX** | http://awx.k8s.local | Automation & config management |
| **Paperclip** | https://paperclip.k8s.local | AI-agent organization/orchestration control plane |
| **MCPO Gateway** | http://mcpo.k8s.local/docs | OpenAPI proxy for MCP servers |
| **Context Forge** | http://mcp.k8s.local | Dynamic MCP server hub |

### Temporarily paused AI services (2026-10-19)

**Qdrant** and **Phoenix** remain in the Flux resource list, but the root
`apps/base/kustomization.yaml` overrides each Deployment to `replicas: 0`.
Their Services, Ingresses, PVCs, PostgreSQL data and original code remain
managed and preserved; they are not decommissioned. Homepage should continue
to show both as unavailable until restarted.

| Paused service | Impact while offline |
|----------------|----------------------|
| Qdrant (`qdrant.k8s.local`) | OpenWebUI document/RAG retrieval and Qdrant-backed n8n workflows unavailable |
| Phoenix (`phoenix.k8s.local`) | OTLP trace collection/UI unavailable; OpenWebUI and Alloy may report retry/export errors |

Plain OpenWebUI chat can still operate without these integrations, but actual
end-to-end behavior must be checked after Flux reconciles. This is a
temporary operator-directed resource reduction; the cluster's recent usage
metrics were **not** available from GitHub.

To restore one service, change its **root** `replicas` override `count: 0`
to `count: 1`, commit to the Flux-tracked branch, and check the Deployment
rollout and retained data. **Do not comment out `./qdrant` or `./phoenix`**
in the root resource list: Flux has `prune: true` and could delete PVCs.

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
- **Paperclip** — AI-agent business/control-plane layer for goals, org structure, work, budgets, approvals, and execution coordination

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
192.168.8.40 homepage.k8s.local openwebui.k8s.local grafana.k8s.local prometheus.k8s.local n8n.k8s.local changedetection.k8s.local mcpo.k8s.local mcp.k8s.local pgadmin.k8s.local qdrant.k8s.local awx.k8s.local jupyter.k8s.local phoenix.k8s.local mongo-express.k8s.local authentik.k8s.local redisinsight.k8s.local groupme.k8s.local paperclip.k8s.local
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
| [apps/base/paperclip/README.md](apps/base/paperclip/README.md) | Paperclip deployment, architectural role, and productionization guidance |
| [docs/SUPABASE_KNOWLEDGE_LAYER_REFERENCE.md](docs/SUPABASE_KNOWLEDGE_LAYER_REFERENCE.md) | Reference Postgres + pgvector business-knowledge layer and Drive sync/ACL pattern |
| [docs/GROWTH_OS_INFRASTRUCTURE.md](docs/GROWTH_OS_INFRASTRUCTURE.md) | Homelab runtime boundary for Growth OS (n8n, Paperclip, SearXNG, changedetection) |
| [docs/CLUSTER_HEALTH_2026-10-21.md](docs/CLUSTER_HEALTH_2026-10-21.md) | Full upgrade receipt, recovery points, node repairs and stability checks |
| [docs/CLUSTER_HEALTH_2026-10-13.md](docs/CLUSTER_HEALTH_2026-10-13.md) | Verified wired-ingress repair and Paperclip 2026.1012.0 upgrade receipt |

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
| Networking | Calico (VXLAN), MetalLB, Traefik |
| Package Management | Helm, Kustomize |
| Secrets | SOPS + Age |
| Monitoring | Prometheus, Grafana |
| AI/LLM | OpenWebUI, Ollama, Phoenix |
| MCP | MCPO, Context Forge |
| Automation | n8n, Ansible AWX |
| Agent orchestration | Paperclip |
| Storage | Local PVs, PostgreSQL, Qdrant, Redis, MongoDB |
| Auth | Authentik (SSO) |
| Infrastructure | Oracle Cloud (free tier VMs), local ARM/x86 nodes |

---

*Part of a broader homelab + automation ecosystem. See [TerraformHomeLab](https://github.com/Quazmoz/TerraformHomeLab) for the IaC layer.*
