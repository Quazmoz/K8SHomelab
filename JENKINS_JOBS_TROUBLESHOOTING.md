# Jenkins Jobs Not Showing - Diagnosis & Solution

## Problem

Jenkins UI shows no jobs even though:
- jenkins-jobs ConfigMap is deployed ✓
- jenkins-config ConfigMap exists ✓
- Flux has synced ✓
- Jenkins pod is running ✓

## Root Cause

**Jenkins doesn't automatically execute Job DSL code to create jobs.** Even though:
1. The ConfigMap is mounted at `/var/jenkins_home/jobs-config`
2. Job DSL plugin is installed
3. Groovy scripts are available

**Jenkins requires explicit action** to:
1. Create a seed job
2. Execute the seed job with Job DSL
3. Which then creates the actual jobs

This is by design - Jenkins doesn't execute arbitrary scripts from mounted files.

## Solution: Three Options

### Option 1: Auto-Create on Startup (RECOMMENDED) ✅

**Status:** Already implemented in your configuration

When you restart Jenkins, it will:
1. Execute the init script at startup: `/var/jenkins_home/init.groovy.d/auto-create-jobs.groovy`
2. This script discovers job definitions in the ConfigMap
3. Creates a seed job
4. Jobs are created automatically

**To activate:**
```bash
# Restart Jenkins to trigger the init script
kubectl rollout restart statefulset/jenkins -n default

# Wait for pod to start
kubectl get pods -n default -l app=jenkins --watch

# Check logs for job creation
kubectl logs -f statefulset/jenkins -n default | grep -i "job\|seed\|creating"
```

**Verify:**
```bash
# Check if seed job was created
kubectl exec -it statefulset/jenkins -n default -- ls -la /var/jenkins_home/jobs/

# Should see: seed-job/ and/or zionup-homelab-deploy/ directories
```

### Option 2: Manually Create Seed Job via Jenkins UI

If the init script doesn't work:

1. **Open Jenkins UI:**
   ```bash
   kubectl port-forward svc/jenkins 8080:8080 -n default
   # Visit: http://localhost:8080
   ```

2. **Create a new job:**
   - Click "New Item"
   - Name: `seed-job`
   - Select: "Pipeline"
   - Click OK

3. **Configure the pipeline:**
   - Go to: Pipeline section
   - Definition: "Pipeline script from SCM"
   - SCM: Git
   - Repository URL: `https://github.com/Quazmoz/zionup.git`
   - Branch: `*/main`
   - Script Path: `deploy/homelab/Jenkinsfile`
   - Save

4. **Run the job:**
   - Click "Build Now"
   - Watch console output

### Option 3: Use Job DSL Plugin Directly

1. **Create seed job in Jenkins UI (as in Option 2)**
2. **Configure as a Job DSL job:**
   - Pipeline script: Use Job DSL syntax
   - Reference ConfigMap: Read from mounted path

**Job DSL script:**
```groovy
// Reads job definitions from ConfigMap
def jobsPath = '/var/jenkins_home/jobs-config'

new File(jobsPath).eachFile { file ->
  if (file.name.endsWith('.groovy')) {
    println("Loading: ${file.name}")
    evaluate(file.text)
  }
}
```

## Troubleshooting

### Check if ConfigMap is Mounted

```bash
# Verify mount exists
kubectl exec -it statefulset/jenkins -n default -- ls -la /var/jenkins_home/jobs-config/

# Should list: zionup-homelab-deploy.groovy, generate-jobs.groovy, etc.
```

### Check Init Script Execution

```bash
# View Jenkins logs during startup
kubectl logs statefulset/jenkins -n default | grep -A 20 "Auto-creating Jenkins jobs"

# Should see output from auto-create-jobs.groovy
```

### Verify Jobs Directory

```bash
# Check if any jobs were created
kubectl exec -it statefulset/jenkins -n default -- ls -la /var/jenkins_home/jobs/

# Output should include:
# - seed-job/
# - zionup-homelab-deploy/
```

### Check Jenkins Configuration

```bash
# Verify plugins are installed
kubectl exec -it statefulset/jenkins -n default -- cat /var/jenkins_home/plugins.txt 2>/dev/null || \
  kubectl exec -it statefulset/jenkins -n default -- ls /var/jenkins_home/plugins/ | grep job-dsl
```

### View Full Jenkins Logs

```bash
# Get all logs
kubectl logs statefulset/jenkins -n default -f

# Filter for errors
kubectl logs statefulset/jenkins -n default | grep -i "error\|exception\|failed"
```

## Manual Job Creation Steps

If automated options don't work, manually create the `zionup-homelab-deploy` job:

### Using Jenkins UI

1. Open Jenkins: `http://localhost:8080`
2. Click **"+ New Item"**
3. **Name:** `zionup-homelab-deploy`
4. **Type:** "Pipeline"
5. Click **OK**

**Configure Pipeline:**
- **Definition:** Pipeline script from SCM
- **SCM:** Git
- **Repository URL:** `https://github.com/Quazmoz/zionup.git`
- **Branch:** `*/main`
- **Script Path:** `deploy/homelab/Jenkinsfile`

**Configure Triggers:**
- Check: **"GitHub hook trigger for GITScm polling"**

**Build Settings:**
- Check: **"Do not allow concurrent builds"**
- Check: **"Discard old builds"**
  - Days to keep: 30
  - Max builds to keep: 10

Click **Save**

### Using Jenkins CLI

```bash
# Get Jenkins URL
JENKINS_URL=$(kubectl get ingress jenkins -n default -o jsonpath='{.spec.rules[0].host}')

# Create job via CLI (requires auth token)
curl -X POST http://${JENKINS_URL}/createItem \
  -H "Content-Type: application/xml" \
  -d @job-config.xml
```

## After Creating Jobs

### Verify Job Shows in UI

1. Refresh Jenkins page
2. Should see `zionup-homelab-deploy` in job list

### Test GitHub Trigger

```bash
# Push a change to zionup repo main branch
cd ~/zionup
git commit --allow-empty -m "test trigger"
git push origin main

# Jenkins should automatically trigger the job
# Watch in Jenkins UI
```

## Files Involved

```
apps/base/jenkins/
├── jenkins-config.yaml          # Contains init script + plugins
│   └── auto-create-jobs.groovy  # Runs on startup
├── jenkins-jobs.yaml            # Job definitions in ConfigMap
│   ├── zionup-homelab-deploy.groovy
│   └── generate-jobs.groovy
├── jenkins-deployment.yaml      # Pod definition
│   └── Mounts both ConfigMaps
└── kustomization.yaml
```

## What Changed

**New in this update:**
- Added `auto-create-jobs.groovy` init script to `jenkins-config.yaml`
- Script runs automatically on Jenkins startup
- Discovers job definitions from the mounted ConfigMap
- Creates jobs without manual intervention
- Handles errors gracefully

**To activate:**
```bash
kubectl rollout restart statefulset/jenkins -n default
```

## Expected Behavior After Restart

```
Jenkins startup logs should show:
============================================================
Auto-creating Jenkins jobs from ConfigMap...
============================================================
Found 1 job definition file(s)

>>> Processing job definition: zionup-homelab-deploy.groovy
Content preview: pipelineJob('zionup-homelab-deploy') {...
Job definition loaded successfully: zionup-homelab-deploy.groovy

Creating seed job to execute Job DSL definitions...
Seed job created: seed-job
============================================================
Job auto-creation process completed
============================================================
```

Then in Jenkins UI, you should see:
- `seed-job` in the job list
- `zionup-homelab-deploy` in the job list
- Both ready to run

## Next Steps

1. **Restart Jenkins:**
   ```bash
   kubectl rollout restart statefulset/jenkins -n default
   ```

2. **Monitor logs:**
   ```bash
   kubectl logs -f statefulset/jenkins -n default | grep -i "job\|seed"
   ```

3. **Check Jenkins UI:**
   ```bash
   kubectl port-forward svc/jenkins 8080:8080 -n default
   # Visit: http://localhost:8080
   ```

4. **If jobs appear:** ✅ Success!
   - Test GitHub trigger by pushing to zionup repo
   
5. **If jobs don't appear:** See "Manual Job Creation Steps" above

---

**Status:** Ready to test  
**Activate with:** `kubectl rollout restart statefulset/jenkins -n default`
