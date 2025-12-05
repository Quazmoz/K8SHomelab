# Jenkins + Flux Integration Guide

## TL;DR

**Yes, this works perfectly with Flux!** Flux will sync the Jenkins ConfigMaps, and the jobs will be ready automatically. Jenkins doesn't need to be rebuilt - ConfigMaps are mounted at runtime.

## How It Works

### The Flow

1. **You push to Git** with updated `jenkins-jobs.yaml`
2. **Flux detects the change** (every 10 minutes by default, or webhook for instant)
3. **Flux applies the kustomization** to your cluster
4. **Kubernetes updates the ConfigMap** (jenkins-jobs)
5. **Jenkins pod mounts the ConfigMap** at `/var/jenkins_home/jobs-config`
6. **Jenkins sees the new job definitions** immediately
7. **Jobs are available** without rebuilding Jenkins

### Key Advantages

✅ **No Jenkins rebuild needed** - Jobs are ConfigMap-driven
✅ **Automatic sync** - Flux handles Git → Cluster synchronization
✅ **Declarative** - All changes version-controlled in Git
✅ **Atomic updates** - Flux applies changes as a unit
✅ **Easy rollback** - Just revert the commit

## Checking Flux Status

### Quick Status Commands

```bash
# 1. Check if Flux is installed
kubectl get ns flux-system

# 2. Check Flux components running
kubectl get deployment -n flux-system

# 3. Check Kustomization status (your apps)
flux get kustomization

# 4. Check Git sync source
flux get source git

# 5. Watch Flux reconciliation in real-time
flux get kustomization --watch

# 6. Check last sync time and status
flux get kustomization -A

# 7. Detailed status of apps kustomization
kubectl describe kustomization apps -n flux-system

# 8. Check for any errors
kubectl logs -n flux-system -l app=kustomize-controller -f

# 9. Get all Flux resources
kubectl get all -n flux-system

# 10. Check if Jenkins ConfigMap was synced
kubectl get configmap -n default | grep jenkins
```

### Using the k8s.sh Script

You can also use your k8s.sh script:

```bash
# Show all Flux system resources
./k8s.sh show_all_resources flux-system

# Watch Flux deployments
./k8s.sh show_deployments flux-system

# View Flux logs
./k8s.sh show_pod_logs flux-system <pod-name>

# Get source git status
./k8s.sh get_resource_yaml GitRepository flux-system -n flux-system
```

## Flux Workflow for Jenkins Jobs

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────────┐
│ 1. Update jenkins-jobs.yaml locally                     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Commit and push to Git                               │
│    git add apps/base/jenkins/jenkins-jobs.yaml          │
│    git commit -m "Add new Jenkins job"                  │
│    git push                                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Flux detects change (webhook or polling)             │
│    - Default: every 10m (see apps.yaml interval)        │
│    - Webhook: instant (if configured)                   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Flux pulls latest Git commit                         │
│    kustomize-controller reconciles                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Kubernetes updates ConfigMaps                        │
│    - jenkins-config updated                             │
│    - jenkins-jobs updated                               │
│    - jenkins-deployment unchanged (already running)     │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Jenkins pod reads ConfigMap (mounted volume)         │
│    - ConfigMap auto-updated from Kubernetes             │
│    - No pod restart needed                              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 7. Jobs immediately available in Jenkins UI             │
│    - No rebuild needed                                  │
│    - zionup-homelab-deploy ready to run                 │
└─────────────────────────────────────────────────────────┘
```

### Timeline Example

```
10:00 AM - You commit jenkins-jobs.yaml to main branch
10:05 AM - Flux polls Git repo (or webhook triggers immediately)
10:06 AM - Kustomization applied, ConfigMap updated
10:07 AM - New jobs visible in Jenkins UI
```

## Monitoring Jenkins Job Sync

### Watch Jenkins ConfigMap

```bash
# See current jenkins-jobs ConfigMap
kubectl get configmap jenkins-jobs -n default -o yaml

# Watch for changes
kubectl get configmap jenkins-jobs -n default -w

# Or using k8s.sh
./k8s.sh get_resource_yaml ConfigMap jenkins-jobs default
```

### Check Jenkins Pod Logs

```bash
# View Jenkins logs for job loading
./k8s.sh show_pod_logs default jenkins-0 | grep -i "dsl\|job\|seed"

# Or raw
kubectl logs -f statefulset/jenkins -n default
```

### Verify ConfigMap is Mounted

```bash
# Check if ConfigMap is mounted in Jenkins pod
kubectl exec -it statefulset/jenkins -n default -- ls -la /var/jenkins_home/jobs-config/

# Or using k8s.sh
./k8s.sh exec_pod default jenkins-0 ls -la /var/jenkins_home/jobs-config/
```

## Important: ConfigMap Updates Don't Auto-Reload

**Note**: While Kubernetes updates the ConfigMap immediately, Jenkins may not automatically reload it. You have two options:

### Option 1: Manual Reload (No Restart)
1. Go to Jenkins → Manage Jenkins → Script Console
2. Run: `loadScriptBindings()` or reload configuration
3. Jobs appear without pod restart

### Option 2: Pod Restart (Guaranteed)
```bash
# Force Jenkins pod to reload ConfigMap
kubectl rollout restart statefulset/jenkins -n default

# Or using k8s.sh
./k8s.sh watch_resource pods default
```

### Option 3: Automated via Init Container
The Jenkins deployment can have an init container that runs job generation on pod start, ensuring jobs are created immediately.

## Flux Configuration for Jenkins

Your current Flux setup:

```yaml
# clusters/my-homelab/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m0s  # Poll every 10 minutes
  sourceRef:
    kind: GitRepository
    name: flux-system  # References your Git repo
  path: ./apps/base  # Syncs this path
  prune: true  # Deletes resources not in Git
```

### Speeding Up Sync Time

To make Flux react faster to Jenkins job changes:

**Option 1: Reduce polling interval**
```yaml
spec:
  interval: 1m0s  # Check every 1 minute instead of 10
```

**Option 2: Use GitHub webhook (instant sync)**
```bash
# Check if webhook is configured
flux get source git

# If not configured, add webhook:
flux create source git flux-system \
  --url=https://github.com/Quazmoz/K8SHomelab \
  --branch=main \
  --interval=1m \
  --secret-ref=flux-system
```

## Recommended Workflow

### 1. Add New Job

Edit `apps/base/jenkins/jenkins-jobs.yaml`:
```groovy
my-new-job.groovy: |-
  pipelineJob('my-new-job') {
    description('My new job')
    # ...
  }
```

### 2. Commit and Push

```bash
git add apps/base/jenkins/jenkins-jobs.yaml
git commit -m "Add my-new-job"
git push origin main
```

### 3. Monitor Flux Sync

```bash
# Check Flux status
flux get kustomization --watch

# Or watch Jenkins ConfigMap
kubectl get configmap jenkins-jobs -n default -w
```

### 4. (Optional) Restart Jenkins Pod

```bash
# If jobs don't appear immediately
kubectl rollout restart statefulset/jenkins -n default
```

### 5. Verify Jobs in Jenkins UI

```bash
# Port forward to Jenkins
./k8s.sh port_forward default svc/jenkins 8080 8080

# Visit: http://localhost:8080
# New job should be visible
```

## Troubleshooting

### ConfigMap not updating

```bash
# Check Flux kustomization status
flux get kustomization

# Check for errors
kubectl describe kustomization apps -n flux-system

# Check Flux logs
kubectl logs -n flux-system -l app=kustomize-controller
```

### Jobs not appearing in Jenkins

```bash
# Verify ConfigMap is updated
kubectl get configmap jenkins-jobs -o jsonpath='{.data}'

# Check if ConfigMap is mounted
kubectl exec -it statefulset/jenkins -- cat /var/jenkins_home/jobs-config/zionup-homelab-deploy.groovy

# Check Jenkins pod logs
./k8s.sh show_pod_logs default jenkins-0
```

### Flux not syncing from Git

```bash
# Check Git source status
flux get source git

# Check Git credentials
kubectl get secret -n flux-system

# View Git source details
kubectl describe gitrepository flux-system -n flux-system
```

## Best Practices

1. **Always push to Git first** - Flux syncs from Git, not local state
2. **Use shorter intervals for testing** - Change back to 10m after testing
3. **Enable GitHub webhooks** - For instant sync (if available)
4. **Review ConfigMap changes** - Check `kubectl diff` before applying
5. **Keep jobs in Git** - Don't create jobs manually in Jenkins UI
6. **Test locally first** - Validate Groovy syntax before pushing

## Summary

✅ Yes, Jenkins + Flux works perfectly
✅ ConfigMaps update automatically
✅ Jobs appear without Jenkins rebuild
✅ Monitor with `flux get kustomization --watch`
✅ Typical sync time: instant (webhook) or 1-10 minutes (polling)
