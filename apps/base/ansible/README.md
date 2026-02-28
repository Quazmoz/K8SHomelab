# Ansible AWX

## Overview

AWX is the open-source version of Ansible Tower, providing a web UI for managing Ansible playbooks, inventories, and job templates. Deployed via the AWX Operator Helm chart.

## Access

- **URL:** [http://awx.k8s.local](http://awx.k8s.local)
- **Default user:** `admin`
- **Default password:** From `awx-admin-password` secret

## Configuration

| Setting | Value |
|---------|-------|
| **Operator Chart** | `awx-operator` v2.19.1 |
| **Node** | `quinn-hpprobook430g6` |
| **Database** | External PostgreSQL (`awx` DB) |
| **Web Resources** | Requests: 512Mi/100m, Limits: 1.5Gi/1 |
| **Task Resources** | Requests: 512Mi/100m, Limits: 1.5Gi/1 |
| **Projects Storage** | 10Gi PVC |

## How It Works

1. AWX Operator Helm chart installs the CRD and operator
2. `awx-cr.yaml` defines the AWX instance
3. Operator creates and manages AWX pods (web, task, EE)

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `awx-crd.yaml` | AWX CustomResourceDefinition |
| `awx-operator-helmrelease.yaml` | Flux HelmRelease for AWX Operator |
| `awx-postgres-secret.yaml` | External PostgreSQL connection secret |
| `awx-cr.yaml` | AWX instance CustomResource |

## Important Notes

- AWX configuration (projects, inventories, job templates) is stored in the database
- Re-creating the pod loses GUI configuration unless the database is preserved
- AWX config must be managed via the AWX GUI, not GitOps

## Troubleshooting

```bash
# Check operator
kubectl get pods -n apps -l app.kubernetes.io/name=awx-operator

# Check AWX pods
kubectl get pods -n apps -l app.kubernetes.io/name=awx

# View AWX logs
kubectl logs -n apps -l app.kubernetes.io/name=awx -c awx-web --tail=50

# Check HelmRelease
flux get helmrelease awx-operator -n apps
```
