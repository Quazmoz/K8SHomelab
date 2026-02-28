# AI Context: Helm Repository Sources

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Infrastructure component that defines Flux CD `HelmRepository` resources. Other HelmRelease-based deployments reference these repositories to pull Helm charts.

## Architecture

- **Type:** Flux HelmRepository definitions
- **Namespace:** `flux-system`
- **No runtime pods** — these are metadata resources consumed by Flux

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Kustomize resource list |
| `helm-repositories.yaml` | All HelmRepository CRDs |

## Repositories Defined

- `prometheus-community` → used by Prometheus HelmRelease
- `grafana` → used by Grafana, Loki, Alloy HelmReleases
- `mojo2600-pihole` → legacy, not actively used
- `coder` → used by Coder HelmRelease
- `awx-operator` → used by AWX Operator HelmRelease

## Dependencies

- **Depends on:** Nothing
- **Depended on by:** All HelmRelease-based deployments (Prometheus, Grafana, Alloy, AWX, Coder)

## Modification Notes

- When adding a new Helm-based app, add its repository here first
- Repository names must match `sourceRef.name` in HelmRelease specs
- All repos use `flux-system` namespace; HelmReleases use `crossNamespaceReferences`
