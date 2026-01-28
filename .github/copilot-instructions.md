# Copilot Instructions for K8SHomelab

> **Note:** Your laptop is not the Kubernetes cluster. The K8S cluster runs on your Raspberry Pi (control plane) and HP ProBook (worker node), not on your local development machine.

# Copilot Instructions for K8SHomelab

---

## Prerequisites

- **kubectl**: Ensure you have `kubectl` installed and configured to access the homelab cluster. Use `kubectl config get-contexts` to verify your context.
- **Flux CLI**: Install Flux CLI for GitOps reconciliation (`flux reconcile ...`).
- **Kustomize**: Used for overlays and manifest composition (usually bundled with `kubectl`).
- **Helm**: Required for some app deployments (e.g., Grafana, Coder).
- **Git**: All changes are managed via git.

---

## Project Overview
- **K8SHomelab** is a GitOps-managed Kubernetes homelab running on hybrid infrastructure (local nodes + Oracle Cloud VMs).
- All Kubernetes manifests and app configs are under `apps/base/`.
- GitOps is managed via **Flux CD**; deployments are reconciled by pushing to git and running `flux reconcile kustomization apps --with-source`.

- **Cluster**: Control plane on Raspberry Pi, workers on HP ProBook and Oracle Cloud VMs. Your laptop is only used for development and management, not as a cluster node.
- **Networking**: Calico (VXLAN), WireGuard mesh, NGINX ingress, MetalLB for LoadBalancer IPs.
- **Major Services**:
  - **OpenWebUI**: LLM chat interface (`apps/base/openwebui/`)
  - **Grafana**: Dashboards/monitoring (`apps/base/grafana/`)
  - **Prometheus**: Metrics (`apps/base/prometheus/`)
  - **Jenkins**: CI/CD, jobs defined as Groovy in ConfigMaps (`apps/base/jenkins/`)
  - **n8n**: Workflow automation (`apps/base/n8n/`)
  - **LlamaFactory**: LLM fine-tuning (`apps/base/llamafactory/`)
  - **MCP Servers**: Model Context Protocol integration for OpenWebUI (`apps/base/mcp-servers/`)

## Developer Workflows

### Standard GitOps Flow

1. Make changes to manifests or configs under `apps/base/` or `clusters/my-homelab/`.
2. Commit and push to the repository:
   ```sh
   git add -A && git commit -m "<message>" && git push
   ```
3. Reconcile Flux to apply changes:
   ```sh
   flux reconcile kustomization apps --with-source
   ```

### Manual Configuration (Jenkins & Context Forge)

- Jenkins and Context Forge (MCP) must be configured via their GUIs. No YAML/JSON or GitOps flows are functional for these components.

### Using kubectl

- To check cluster status:
  ```sh
  kubectl get nodes
  kubectl get pods -A
  ```
- To debug an app:
  ```sh
  kubectl -n <namespace> describe pod <pod-name>
  kubectl -n <namespace> logs <pod-name>
  ```
- To port-forward a service (e.g., Grafana):
  ```sh
  kubectl -n <namespace> port-forward svc/grafana 3000:3000
  ```

---
- **Deploy changes**:
  1. `git add -A && git commit -m "message" && git push`
  2. `flux reconcile kustomization apps --with-source`
- **Jenkins jobs**: All Jenkins configuration and job management must be performed manually via the Jenkins GUI. The code-first/GitOps flow is currently non-functional.
- **MCP Servers / Context Forge**: All configuration and integration for Context Forge (MCP) must be performed manually via the GUI. The GitOps/code-first flow is currently non-functional.

## Project-Specific Conventions

- **Namespaces**: Most apps are deployed in their own namespace. Namespace manifests are in `apps/base/apps-namespace.yaml`.
- **Secrets**: Store secrets in `*-secrets.yaml` files. Use `.template` files for sharing non-sensitive structure.
- **Persistent Volumes**: PVCs are defined per app (e.g., `*-pvc.yaml`).
- **Helm Releases**: Managed via `helm-release.yaml` in each app directory.
- **Ingress**: Each app typically has its own `ingress.yaml` for subdomain routing.
- **All app configs** are managed declaratively in kustomize overlays under `apps/base/`, except Jenkins and Context Forge (MCP), which are managed manually via their GUIs.
- **No manual changes** to running cluster; all changes must go through GitOps, except for Jenkins and Context Forge (MCP), which require manual GUI configuration.
- **Jenkins**: All job and configuration management is now performed via the Jenkins GUI. The code-first/ConfigMap approach is not in use.
- **MCP/Context Forge**: All integrations and configuration are managed via the GUI. YAML/JSON GitOps flows are not currently functional.
- **Legacy/disabled resources** are kept in `apps/base/mcp-servers/legacy/` for reference.

## Integration & Cross-Component Patterns

- **Service Discovery**: Apps communicate via internal DNS (e.g., `service.namespace.svc.cluster.local`).
- **Network Policies**: Defined per app for least-privilege access.
- **RBAC**: Role-based access control is enforced per app.
- **OpenWebUI** uses JSON configs in `mcp-servers/contextforge/` and `mcpo/` to connect to MCP endpoints.
- **RBAC** and network policies are defined per app for least-privilege access.
- **Ingress**: Each app typically has its own `ingress.yaml` for subdomain routing.

## Key Files & Directories

- `apps/base/<app>/kustomization.yaml` — Kustomize overlays for each app
- `apps/base/<app>/helm-release.yaml` — Helm release definitions (if used)
- `apps/base/<app>/*-deployment.yaml` — App deployments
- `apps/base/<app>/*-service.yaml` — Service definitions
- `apps/base/<app>/*-ingress.yaml` — Ingress rules
- `apps/base/<app>/*-configmap.yaml` — App configs
- `apps/base/<app>/*-secrets.yaml` — App secrets (not in git)
- `apps/base/` — All app manifests
- `apps/base/mcp-servers/` — MCP integration, context forge, MCPO
- `apps/base/jenkins/jenkins-jobs.yaml` — Jenkins job definitions (Groovy DSL)
- `clusters/my-homelab/` — Flux kustomizations for cluster state
- `README.md` (root, mcp-servers, jenkins) — Architecture, workflows, and conventions

## Examples

- **Deploy a new app**:
  1. Create a new directory under `apps/base/` (copy an existing app as a template).
  2. Add `kustomization.yaml`, deployment, service, ingress, and config files as needed.
  3. Commit and push changes, then reconcile Flux.

- **Debug a failing pod**:
  1. Find the pod: `kubectl get pods -A | grep <app>`
  2. Describe the pod: `kubectl -n <namespace> describe pod <pod-name>`
  3. Check logs: `kubectl -n <namespace> logs <pod-name>`

- **Update an app config**:
  1. Edit the relevant ConfigMap or Secret YAML in the app directory.
  2. Commit, push, and reconcile Flux.

- **Scale a deployment**:
  ```sh
  kubectl -n <namespace> scale deployment <deployment-name> --replicas=3
  ```
---

## Troubleshooting

- **Flux not applying changes**: Ensure your commit is pushed and run `flux reconcile kustomization apps --with-source`.
- **Pod CrashLoopBackOff**: Check logs and describe the pod for error messages.
- **Ingress not working**: Verify ingress rules and DNS. Check NGINX ingress controller logs.
- **Persistent Volume issues**: Check PVC and PV status with `kubectl get pvc -A` and `kubectl get pv`.
- **Jenkins/Context Forge config lost**: All changes must be re-applied via the GUI if the pod is recreated.

---

## Best Practices

- Use overlays and kustomize for environment-specific configs.
- Keep secrets out of git; use templates for structure.
- Use descriptive commit messages.
- Prefer declarative configs; only Jenkins and Context Forge are exceptions.
- Regularly backup persistent data (PVCs, databases).

---


## App Visibility Convention

- **After deploying any new app, always add it to the homepage app (`apps/base/homepage/`) for visibility and access.** Update the homepage manifests/configs as needed to reflect the new app in the dashboard or UI.

---

## Useful Links

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Flux CD Documentation](https://fluxcd.io/docs/)
- [Kustomize Documentation](https://kubectl.docs.kubernetes.io/references/kustomize/)
- [Helm Documentation](https://helm.sh/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)

---
- To add a new MCP/Context Forge integration: use the Context Forge GUI to add and configure integrations. Do not edit YAML/JSON or use GitOps for this process.
- To add or modify a Jenkins job: use the Jenkins GUI to create or update jobs. Do not edit `jenkins-jobs.yaml` or rely on code-first provisioning.

---
For more details, see the relevant `README.md` in each app directory.
