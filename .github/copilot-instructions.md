# Copilot Instructions for K8SHomelab

## Project Overview
- **K8SHomelab** is a GitOps-managed Kubernetes homelab running on hybrid infrastructure (local nodes + Oracle Cloud VMs).
- All Kubernetes manifests and app configs are under `apps/base/`.
- GitOps is managed via **Flux CD**; deployments are reconciled by pushing to git and running `flux reconcile kustomization apps --with-source`.

## Architecture & Key Components
- **Cluster**: Control plane on Raspberry Pi, workers on local and Oracle Cloud VMs.
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
- **Deploy changes**:
  1. `git add -A && git commit -m "message" && git push`
  2. `flux reconcile kustomization apps --with-source`
- **Jenkins jobs**: Define in `jenkins-jobs.yaml` as Groovy DSL. Jobs are auto-provisioned via Job DSL plugin and ConfigMap mounting.
- **MCP Servers**: Integrate new context sources by editing/adding YAML/JSON in `apps/base/mcp-servers/contextforge/` or `mcpo/`.

## Project-Specific Conventions
- **All app configs** are managed declaratively in kustomize overlays under `apps/base/`.
- **No manual changes** to running cluster; all changes must go through GitOps.
- **Jenkins**: No GUI job creation; all jobs are code-first via ConfigMap.
- **MCP**: Each integration (e.g., GroupMe, Azure, ClickUp) has a dedicated YAML/JSON config and is registered in `context-forge-servers.yaml`.
- **Legacy/disabled resources** are kept in `apps/base/mcp-servers/legacy/` for reference.

## Integration & Cross-Component Patterns
- **OpenWebUI** uses JSON configs in `mcp-servers/contextforge/` and `mcpo/` to connect to MCP endpoints.
- **RBAC** and network policies are defined per app for least-privilege access.
- **Ingress**: Each app typically has its own `ingress.yaml` for subdomain routing.

## Key Files & Directories
- `apps/base/` — All app manifests
- `apps/base/mcp-servers/` — MCP integration, context forge, MCPO
- `apps/base/jenkins/jenkins-jobs.yaml` — Jenkins job definitions (Groovy DSL)
- `clusters/my-homelab/` — Flux kustomizations for cluster state
- `README.md` (root, mcp-servers, jenkins) — Architecture, workflows, and conventions

## Examples
- To add a new MCP integration: copy an existing YAML/JSON in `mcp-servers/contextforge/`, update endpoints, and register in `context-forge-servers.yaml`.
- To add a Jenkins job: edit `jenkins-jobs.yaml` with Groovy DSL, commit, and let Flux/Job DSL handle provisioning.

---
For more details, see the relevant `README.md` in each app directory.
