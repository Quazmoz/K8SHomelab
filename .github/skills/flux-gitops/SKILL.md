---
name: flux-gitops
description: "Manage Flux CD GitOps workflows in the K8S homelab. USE FOR: reconciling deployments, debugging HelmRelease failures, managing Flux sources, SOPS secret encryption/decryption, understanding the GitOps pipeline, force-syncing after git push, checking Flux status, managing encrypted secrets with AGE/SOPS. Trigger this whenever the user pushes to git and nothing changes, a HelmRelease is stuck or failing, secrets need encrypting/decrypting, or any Flux-related term comes up (reconcile, kustomization, helmrelease, source, sops, age key, gitops)."
---

# Flux CD GitOps Skill

## When to Use

- Reconciling or force-syncing deployments after git push
- Debugging HelmRelease or Kustomization failures
- Managing Flux sources (HelmRepositories, GitRepository)
- Working with SOPS-encrypted secrets
- Understanding why changes aren't applying
- Checking overall Flux health
- Unsticking a failed HelmRelease (upgrade retries exhausted, etc.)

## Architecture

```
Git Push → GitHub Repo → Flux GitRepository (10m interval)
                              ↓
                    Flux Kustomization "apps"
                    (path: ./apps/base, prune: true)
                              ↓
                    apps/base/kustomization.yaml
                    (lists all active app directories)
                              ↓
                    Per-app kustomization.yaml
                    (lists app resource files)
                              ↓
                    Kubernetes resources applied
```

## Key Configuration

| Setting | Value |
|---|---|
| Flux Kustomization | `apps` in `flux-system` namespace |
| Source | GitRepository `flux-system` |
| Path | `./apps/base` |
| Interval | 10 minutes |
| Prune | `true` (orphaned resources deleted) |
| Decryption | SOPS with AGE (`sops-age` secret) |
| Config file | `clusters/my-homelab/apps.yaml` |

## Standard GitOps Workflow

```bash
# 1. Make changes to manifests
# 2. Commit and push
git add -A && git commit -m "<descriptive message>" && git push

# 3. Force reconcile (don't wait 10 min)
flux reconcile kustomization apps --with-source

# 4. Verify
flux get kustomization apps
kubectl get pods -n apps | grep -v Running
```

## Flux Status Commands

```bash
# Overall health
flux get all -A

# Check kustomization status
flux get kustomization apps

# Check all HelmReleases
flux get helmreleases -A

# Check Helm sources
flux get sources helm -A

# Check Git source
flux get sources git -A

# Detailed events
flux events --for Kustomization/apps
```

## Reconciliation Commands

```bash
# Full reconcile (kustomization + source)
flux reconcile kustomization apps --with-source

# HelmRelease only
flux reconcile helmrelease <name> -n apps --with-source

# Helm source only
flux reconcile source helm <repo-name> -n flux-system

# Git source
flux reconcile source git flux-system -n flux-system
```

## SOPS Secret Management

### How It Works

1. Secrets are encrypted with AGE public key
2. Encrypted files use `.secret.enc.yaml` suffix
3. Flux decrypts at apply time using `sops-age` secret in `flux-system` namespace
4. Template files (`.yaml.template`) show secret structure (safe for git)

### Encrypting a Secret

```bash
# Create the secret YAML first
cat > my-secret.yaml << 'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: apps
type: Opaque
stringData:
  KEY: "value"
EOF

# Encrypt with SOPS (AGE key must be configured)
sops --encrypt --age <AGE_PUBLIC_KEY> my-secret.yaml > my-secret.secret.enc.yaml

# Remove the plaintext
rm my-secret.yaml
```

### Decrypting to Inspect

```bash
# Decrypt in-place (requires AGE private key in env)
export SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt
sops --decrypt my-secret.secret.enc.yaml
```

### Creating a Template

Always create a `.yaml.template` alongside encrypted secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: apps
  labels:
    app: my-app
type: Opaque
stringData:
  API_KEY: "<YOUR_API_KEY>"
  DB_PASSWORD: "<YOUR_DB_PASSWORD>"
# To create manually:
# kubectl create secret generic my-secret -n apps \
#   --from-literal=API_KEY=xxx \
#   --from-literal=DB_PASSWORD=xxx
```

## Debugging HelmRelease Failures

```bash
# Check HelmRelease status and error message
flux get helmrelease <name> -n apps

# Get detailed conditions
kubectl describe helmrelease <name> -n apps

# Check if source is available
flux get sources helm <repo-name> -n flux-system

# Check Helm chart pull
kubectl get helmcharts -n flux-system

# View Flux controller logs
kubectl logs -n flux-system deploy/helm-controller --tail=50
kubectl logs -n flux-system deploy/kustomize-controller --tail=50
```

### Common HelmRelease Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `chart pull error` | Repo URL changed or down | `flux reconcile source helm <repo> -n flux-system` |
| `values validation error` | Bad Helm values | Check `helm-release.yaml` values against chart docs |
| `upgrade retries exhausted` | Previous failed install | Suspend → edit → resume (see below) |
| `dependency not ready` | Missing CRD or resource | Check dependency ordering in kustomization |

### Unsticking a HelmRelease ("upgrade retries exhausted")

When a HelmRelease is stuck with "upgrade retries exhausted", Flux won't retry until you reset it:

```bash
# Option 1: Suspend, fix the values, then resume
flux suspend helmrelease <name> -n apps
# ... fix the issue in git and push ...
flux resume helmrelease <name> -n apps

# Option 2: Force reset the release state (use if values are already correct)
flux suspend helmrelease <name> -n apps
kubectl patch helmrelease <name> -n apps --type=merge \
  -p '{"spec":{"install":{"remediation":{"retries":3}}}}'
flux resume helmrelease <name> -n apps

# Option 3: Nuclear — delete the HelmRelease and let Flux recreate it
kubectl delete helmrelease <name> -n apps
flux reconcile kustomization apps --with-source
```

## Debugging Kustomization Failures

```bash
# Check status
flux get kustomization apps

# Dry-run to see what would be applied
kubectl kustomize apps/base/<app>

# Validate locally before pushing
kubectl kustomize apps/base/ | kubectl apply --dry-run=client -f -

# Check for YAML errors
kubectl kustomize apps/base/<app> 2>&1
```

### Common Kustomization Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `kustomize build failed` | YAML syntax error | Run `kubectl kustomize apps/base/<app>` locally |
| `resource not found` | File listed but missing | Check kustomization.yaml resource list |
| `prune stalled` | Finalizer blocking deletion | `kubectl patch <resource> -p '{"metadata":{"finalizers":null}}'` |
| `decryption failed` | SOPS key issue | Check `sops-age` secret in flux-system |
| `no such file or directory` | Wrong path in resources | Verify file exists and path is relative |

## Enabling/Disabling Apps

### Enable an app

Uncomment the line in `apps/base/kustomization.yaml`:

```yaml
resources:
  - ./<app-name>    # uncomment this line
```

### Disable an app

Comment out with a reason:

```yaml
#  - ./<app-name>  # Temporarily disabled - <reason>
```

**Note:** With `prune: true`, disabling an app removes its resources from the cluster on next reconcile.

## API Versions Reference

| Resource | API Version |
|----------|-------------|
| Flux Kustomization | `kustomize.toolkit.fluxcd.io/v1` |
| HelmRelease | `helm.toolkit.fluxcd.io/v2` |
| HelmRepository | `source.toolkit.fluxcd.io/v1` |
| GitRepository | `source.toolkit.fluxcd.io/v1` |
| Kustomize (app-level) | `kustomize.config.k8s.io/v1beta1` |

**Critical:** Do NOT use `v2beta1` for HelmRelease or `v1beta2` for Flux Kustomization — these are deprecated and will cause reconciliation failures silently.

## Checking Why Nothing Updated After a Push

If `flux reconcile kustomization apps --with-source` completes but pods don't update:

1. Check if Flux even sees the change: `flux get kustomization apps` — look for "Applied revision"
2. Check if the image tag changed in the manifest (Flux only applies changes, it won't re-pull the same tag)
3. For `latest` tag updates: you need to either change the tag to a specific version, or manually rollout: `kubectl rollout restart deployment/<name> -n apps`
4. Check if the HelmRelease chart version pin is blocking: `flux get helmreleases -A`
