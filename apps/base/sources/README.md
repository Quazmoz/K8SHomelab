# Helm Repository Sources

## Overview

Defines Flux CD `HelmRepository` resources used by other deployments in the cluster. These are the external Helm chart registries that Flux pulls from.

## Repositories

| Name | URL | Used By |
|------|-----|---------|
| `prometheus-community` | `https://prometheus-community.github.io/helm-charts` | Prometheus |
| `grafana` | `https://grafana.github.io/helm-charts` | Grafana, Loki, Alloy |
| `mojo2600-pihole` | `https://mojo2600.github.io/pihole-kubernetes` | (legacy) |
| `coder` | `https://helm.coder.com/v2` | Coder |
| `awx-operator` | `https://ansible-community.github.io/awx-operator-helm` | Ansible AWX |

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `helm-repositories.yaml` | All HelmRepository definitions |

## Adding a New Repository

1. Add a new `HelmRepository` resource to `helm-repositories.yaml`
2. Reference it in your app's `HelmRelease` under `spec.chart.spec.sourceRef`
3. Commit, push, and reconcile

## Troubleshooting

```bash
# Check repo sync status
flux get sources helm -A

# Force reconcile a repo
flux reconcile source helm <repo-name> -n flux-system
```
