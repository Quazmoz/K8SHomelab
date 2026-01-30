# Copilot Instructions for K8SHomelab

> **Note:** Your laptop is not the Kubernetes cluster. The K8S cluster runs on your Orange Pi 6 Plus (control plane) and HP ProBook (worker node), not on your local development machine.

---

## Prerequisites

| Tool | Purpose | Verification |
|------|---------|--------------|
| **kubectl** | Cluster management | `kubectl config get-contexts` |
| **Flux CLI** | GitOps reconciliation | `flux --version` |
| **Kustomize** | Manifest composition | `kubectl kustomize --help` |
| **Helm** | App deployments (Grafana, Prometheus, Coder, AWX) | `helm version` |
| **Git** | Version control | `git --version` |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      KUBERNETES CLUSTER                         │
├─────────────────────────────────────────────────────────────────┤
│  Control Plane:  orangepi6plus (192.168.1.21)                   │
│                                                                 │
│  Workers:                                                       │
│    • quinn-hpprobook430g6 (192.168.1.15)                        │
├─────────────────────────────────────────────────────────────────┤
│  CNI: Calico (VXLAN)                                            │
│  GitOps: Flux CD v2                                             │
│  Ingress: NGINX + MetalLB (192.168.1.220-250)                   │
│  DNS: *.k8s.local resolves to ingress                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Overview

- **K8SHomelab** is a GitOps-managed Kubernetes homelab running on local infrastructure.
- All Kubernetes manifests and app configs live under `apps/base/`.
- GitOps is managed via **Flux CD**; deployments reconcile automatically on push or via `flux reconcile kustomization apps --with-source`.

### Active Services (by Category)

| Category | Service | URL | Directory |
|----------|---------|-----|-----------|
| **AI & LLM** | OpenWebUI | `http://openwebui.k8s.local` | `apps/base/openwebui/` |
| | LibreChat | `http://librechat.k8s.local` | `apps/base/librechat/` |
| | LlamaFactory | `http://llamafactory.k8s.local` | `apps/base/llamafactory/` |
| | Qdrant | `http://qdrant.k8s.local` | `apps/base/qdrant/` |
| | Jupyter | `http://jupyter.k8s.local` | `apps/base/jupyter/` |
| | Phoenix | `http://phoenix.k8s.local` | `apps/base/phoenix/` |
| **MCP Tools** | Context Forge | `http://mcp.k8s.local` | `apps/base/mcp-servers/contextforge/` |
| | MCPO Proxy | `http://mcpo.k8s.local` | `apps/base/mcp-servers/mcpo/` |
| **DevOps** | Jenkins | `http://jenkins.k8s.local` | `apps/base/jenkins/` |
| | n8n | `http://n8n.k8s.local` | `apps/base/n8n/` |
| | Ansible AWX | `http://awx.k8s.local` | `apps/base/ansible/` |
| | Coder | `http://coder.k8s.local` | `apps/base/coder/` |
| **Monitoring** | Grafana | `http://grafana.k8s.local` | `apps/base/grafana/` |
| | Prometheus | `http://prometheus.k8s.local` | `apps/base/prometheus/` |
| | Loki | (via Grafana) | `apps/base/loki/` |
| | Alloy | (collector) | `apps/base/alloy/` |
| **Data** | PostgreSQL | internal | `apps/base/postgres/` |
| | Redis | internal | `apps/base/redis/` |
| | MongoDB | internal | `apps/base/mongodb/` |
| | pgAdmin | `http://pgadmin.k8s.local` | `apps/base/pgadmin/` |
| | Mongo Express | `http://mongo-express.k8s.local` | `apps/base/mongo-express/` |
| **Other** | Homepage | `http://homepage.k8s.local` | `apps/base/homepage/` |
| | FreshRSS | `http://freshrss.k8s.local` | `apps/base/freshrss/` |
| | Authentik | `http://authentik.k8s.local` | `apps/base/authentik/` |

---

## Developer Workflows

### Standard GitOps Flow

```bash
# 1. Make changes to manifests under apps/base/
# 2. Commit and push
git add -A && git commit -m "<descriptive message>" && git push

# 3. Reconcile (or wait for automatic sync)
flux reconcile kustomization apps --with-source
```

### Quick Commands Reference

```bash
# Check cluster health
kubectl get nodes -o wide
kubectl get pods -A | grep -v Running

# Check Flux status
flux get all -A

# Debug a pod
kubectl -n apps describe pod <pod-name>
kubectl -n apps logs <pod-name> --tail=100

# Port-forward for local access
kubectl -n apps port-forward svc/<service> <local-port>:<service-port>

# Force reconciliation
flux reconcile kustomization apps --with-source
flux reconcile helmrelease <name> -n apps --with-source
```

### Manual Configuration (GUI-Only Components)

| Component | Reason | Workflow |
|-----------|--------|----------|
| **Jenkins** | Code-first flow non-functional | Configure jobs via Jenkins GUI |
| **Context Forge** | Dynamic MCP registration | Configure via `mcp.k8s.local` GUI |

---

## Project-Specific Conventions

### Directory Structure

```
K8SHomelab/
├── apps/base/                    # All Kubernetes manifests
│   ├── kustomization.yaml        # Main resource list (enable/disable apps here)
│   ├── apps-namespace.yaml       # Namespace definitions
│   ├── sources/                  # Helm repositories
│   ├── local-storage/            # PersistentVolume definitions
│   ├── <app>/                    # Per-app directory
│   │   ├── kustomization.yaml    # App resources list
│   │   ├── *-deployment.yaml     # Deployments
│   │   ├── *-service.yaml        # Services
│   │   ├── *-ingress.yaml        # Ingress rules
│   │   ├── *-pvc.yaml            # PersistentVolumeClaims
│   │   ├── *-configmap.yaml      # Configuration
│   │   ├── *-secrets.yaml        # Secrets (not in git)
│   │   └── helm-release.yaml     # Helm releases (if applicable)
│   └── mcp-servers/              # MCP integration
│       ├── contextforge/         # Context Forge gateway
│       ├── mcpo/                 # MCPO OpenAPI proxy
│       └── legacy/               # Disabled/reference resources
├── clusters/my-homelab/          # Flux kustomizations
│   └── apps.yaml                 # Points to apps/base
└── docs/                         # Network troubleshooting docs
```

### File Naming Conventions

| Pattern | Purpose |
|---------|---------|
| `*-deployment.yaml` | Deployment resources |
| `*-service.yaml` | Service definitions |
| `*-ingress.yaml` | Ingress rules (subdomain routing) |
| `*-pvc.yaml` | PersistentVolumeClaims |
| `*-configmap.yaml` | ConfigMaps |
| `*-secrets.yaml` | Secrets (excluded from git) |
| `*-secrets.yaml.template` | Secret templates (structure only) |
| `helm-release.yaml` | Flux HelmRelease definitions |
| `kustomization.yaml` | Kustomize resource lists |

### Helm Repositories (Defined in `apps/base/sources/`)

| Repository | URL | Used By |
|------------|-----|---------|
| prometheus-community | prometheus-community.github.io | Prometheus |
| grafana | grafana.github.io | Grafana, Loki, Alloy |
| coder | helm.coder.com/v2 | Coder |
| awx-operator | ansible-community.github.io | Ansible AWX |

---

## Adding a New Application

1. **Create directory**: `apps/base/<app-name>/`

2. **Create manifests** (copy from existing app as template):
   ```bash
   # Minimum required files:
   kustomization.yaml
   <app>-deployment.yaml
   <app>-service.yaml
   <app>-ingress.yaml  # if external access needed
   <app>-pvc.yaml      # if persistent storage needed
   ```

3. **Add PersistentVolume** (if using local storage):
   - Edit `apps/base/local-storage/storage.yaml`
   - Add PV with `hostPath` on `quinn-hpprobook430g6`

4. **Enable in main kustomization**:
   - Add `- ./<app-name>` to `apps/base/kustomization.yaml`

5. **Update Homepage** (for visibility):
   - Edit `apps/base/homepage/manifests.yaml`
   - Add entry under appropriate category in `services.yaml`

6. **Deploy**:
   ```bash
   git add -A && git commit -m "Add <app-name>" && git push
   flux reconcile kustomization apps --with-source
   ```

---

## MCP Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           OpenWebUI                                 │
│                    (Workspace → Tools)                              │
└─────────────────────────────────────────────────────────────────────┘
                    ↓                           ↓
        ┌──────────────────────────┐   ┌──────────────────┐
        │   Context Forge          │   │      MCPO        │
        │   (MCP Gateway)          │   │  (OpenAPI Proxy) │
        ├──────────────────────────┤   ├──────────────────┤
        │ - GroupMe (per-user auth)│   │ - Postgres       │
        │ - Azure (HTTP)           │   │ - Kubernetes     │
        │ - ClickUp (SSE)          │   │ - Prometheus     │
        │ Port: 4444               │   │ - FreshRSS       │
        │ URL: mcp.k8s.local       │   │ - n8n            │
        │                          │   │ Port: 8000       │
        │                          │   │ URL: mcpo.k8s.lo │
        └──────────────────────────┘   └──────────────────┘
```

> See `apps/base/mcp-servers/README.md` for detailed MCP setup.

---

## Integration & Cross-Component Patterns

### Service Discovery
- Internal DNS: `<service>.<namespace>.svc.cluster.local`
- Example: `postgres.apps.svc.cluster.local:5432`

### Network & RBAC
- Network policies defined per-app for least-privilege access
- RBAC enforced per-app (see `*-rbac.yaml` files)
- MCP servers have dedicated RBAC for Kubernetes API access

### Ingress Routing
- All services use `*.k8s.local` subdomains
- NGINX Ingress controller handles routing
- MetalLB provides LoadBalancer IPs (192.168.1.220-250)

### Node Scheduling Constraints

| Workload | Allowed Nodes | Reason |
|----------|---------------|--------|
| Prometheus, Grafana, Loki | quinn-hpprobook430g6 | Requires local storage |
| Most workloads | quinn-hpprobook430g6 | Storage availability |

---

## Key Files & Quick Reference

| File | Purpose |
|------|---------|
| `apps/base/kustomization.yaml` | Enable/disable apps |
| `apps/base/apps-namespace.yaml` | Namespace definitions |
| `apps/base/sources/helm-repositories.yaml` | Helm repo sources |
| `apps/base/local-storage/storage.yaml` | PV definitions |
| `apps/base/homepage/manifests.yaml` | Dashboard config |
| `apps/base/mcp-servers/README.md` | MCP integration guide |
| `clusters/my-homelab/apps.yaml` | Flux kustomization |
| `AGENT_CONTEXT.md` | AI agent context |
| `docs/NETWORK.md` | Network architecture |
| `docs/NETWORK_TROUBLESHOOTING.md` | Network issues |

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Flux not applying changes | Commit not pushed | `git push` then `flux reconcile kustomization apps --with-source` |
| Pod CrashLoopBackOff | Config/resource issue | `kubectl describe pod` + `kubectl logs` |
| Ingress not working | DNS/ingress rules | Check hosts file, ingress YAML, NGINX controller logs |
| PVC Pending | Missing PV | Add PV to `local-storage/storage.yaml` |
| Calico pods stuck 0/1 | VXLAN MTU error | Delete vxlan.calico, restart Calico |
| HelmRelease not reconciling | Source issue | `flux reconcile source helm <repo> -n flux-system` |
| Jenkins/Context Forge config lost | Pod recreated | Re-apply via GUI |

### Debugging Commands

```bash
# Check node status
kubectl get nodes -o wide

# Check Flux status
flux get all -A

# Check DNS resolution
kubectl run -it --rm dns-test --image=busybox --restart=Never -- nslookup kubernetes.default

# Check Calico
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide
kubectl logs -n kube-system -l k8s-app=calico-node --tail=20

# Check HelmRelease status
flux get helmreleases -A

# Force HelmRelease reconciliation
flux reconcile helmrelease <name> -n apps --with-source
```

---

## Best Practices

1. **GitOps First**: All changes go through git (except Jenkins/Context Forge)
2. **Test Locally**: Use `kubectl kustomize apps/base/<app>` before committing
3. **Secrets Management**: Use `.template` files for structure, actual secrets excluded via `.gitignore`
4. **Homepage Visibility**: Always add new apps to homepage dashboard
5. **Local Storage**: Use `quinn-hpprobook430g6` for stateful workloads
6. **Descriptive Commits**: Include what changed and why
7. **Incremental Changes**: Deploy and verify one change at a time
8. **Backup PVCs**: Regularly backup persistent data

---

## Hosts File Entry

Add to your local machine's hosts file:

```
192.168.1.221 homepage.k8s.local openwebui.k8s.local grafana.k8s.local prometheus.k8s.local jenkins.k8s.local n8n.k8s.local llamafactory.k8s.local mcpo.k8s.local mcp.k8s.local pgadmin.k8s.local qdrant.k8s.local librechat.k8s.local freshrss.k8s.local jupyter.k8s.local phoenix.k8s.local awx.k8s.local mongo-express.k8s.local authentik.k8s.local coder.k8s.local
```

---

## Useful Links

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Flux CD Documentation](https://fluxcd.io/docs/)
- [Kustomize Reference](https://kubectl.docs.kubernetes.io/references/kustomize/)
- [Helm Documentation](https://helm.sh/docs/)
- [Calico Documentation](https://docs.tigera.io/calico/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)

---

For more details, see the relevant `README.md` in each app directory.
