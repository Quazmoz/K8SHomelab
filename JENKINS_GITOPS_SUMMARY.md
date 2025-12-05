# Jenkins GitOps Job Provisioning Summary

## What Was Done

### 1. ✅ MCP Servers Disabled
- Commented out `./mcp-servers` in `/apps/base/kustomization.yaml`
- Code remains available in `/apps/base/mcp-servers/` for future use
- Can be re-enabled by uncommenting the line

### 2. ✅ Jenkins Job Provisioning via GitOps
Job definitions are now managed through Kubernetes ConfigMaps instead of manual GUI configuration.

## File Structure

```
apps/base/jenkins/
├── kustomization.yaml           # Updated to include jenkins-jobs.yaml
├── jenkins-config.yaml          # Added job-dsl plugin
├── jenkins-jobs.yaml            # NEW: Job definitions as code
├── jenkins-deployment.yaml      # Updated to mount jobs ConfigMap
├── jenkins-storage.yaml         # PVC for Jenkins home
└── README.md                    # Comprehensive GitOps documentation
```

## Job Configuration

### Added Jenkins Plugins
- `job-dsl` - Groovy-based job generation
- `pipeline-model-definition` - Declarative pipeline support
- `pipeline-stage-view` - Pipeline visualization

### Job Defined: zionup-homelab-deploy

```groovy
pipelineJob('zionup-homelab-deploy') {
  description('Deploy ZionUp to Homelab Kubernetes Cluster')
  
  keepBuilds {
    strategy {
      buildDiscarderStrategy {
        daysToKeepStr: '30'
        numToKeepStr: '10'
        artifactDaysToKeepStr: '-1'
        artifactNumToKeepStr: '-1'
      }
    }
  }
  
  triggers {
    githubPush()
  }
  
  definition {
    cpsScm {
      scm {
        git {
          remote {
            url('https://github.com/Quazmoz/zionup.git')
          }
          branches('*/main')
        }
      }
      scriptPath('deploy/homelab/Jenkinsfile')
      lightweight(true)
    }
  }
}
```

**Features:**
- Pulls Jenkinsfile from: `deploy/homelab/Jenkinsfile` in zionup repository
- Triggers on GitHub push to main branch
- Keeps last 10 builds + 30 days of history
- Lightweight SCM checkout for efficiency

## How It Works

1. **jenkins-config.yaml**: Defines plugins to install (job-dsl included)
2. **jenkins-jobs.yaml**: Contains Groovy-DSL job definitions
3. **jenkins-deployment.yaml**: Mounts jobs ConfigMap at `/var/jenkins_home/jobs-config`
4. **Jenkins startup**: Automatically creates/updates jobs from ConfigMap definitions

## Adding New Jobs

To add another job, edit `jenkins-jobs.yaml` and add a new Groovy file entry:

```yaml
data:
  another-job.groovy: |-
    pipelineJob('another-job') {
      description('Another job')
      definition {
        cpsScm {
          scm {
            git {
              remote {
                url('https://github.com/org/repo.git')
              }
              branches('*/main')
            }
          }
          scriptPath('Jenkinsfile')
          lightweight(true)
        }
      }
    }
```

Then apply:
```bash
kubectl apply -f apps/base/jenkins/jenkins-jobs.yaml
```

## Deployment

To deploy Jenkins with GitOps job provisioning:

```bash
kubectl apply -k apps/base/jenkins
```

## Verification

After deployment, verify the job was created:

```bash
# Check Jenkins pod is running
./k8s.sh show_pods default | grep jenkins

# View Jenkins logs
./k8s.sh show_pod_logs default jenkins-0

# Access Jenkins UI
# http://jenkins.k8s.local/ (or your configured domain)
```

The job `zionup-homelab-deploy` should appear in Jenkins UI automatically.

## Next Steps

1. **Create Jenkinsfile** in zionup repository at `deploy/homelab/Jenkinsfile`
2. **Add GitHub credentials** to Jenkins (UI: Manage Jenkins → Credentials)
3. **Test trigger**: Push commit to zionup main branch
4. **Monitor**: Job will automatically trigger from GitHub push

## Benefits of GitOps Job Provisioning

✅ **Version Control**: All job configurations in Git
✅ **Reproducibility**: Same jobs across environments
✅ **Code Review**: PR review process for job changes
✅ **Auditability**: Complete history of job changes
✅ **No Manual Steps**: Jobs created automatically with deployment
✅ **Disaster Recovery**: Easy to recreate jobs if Jenkins pod is lost

## Files Modified

- `/apps/base/kustomization.yaml` - Disabled mcp-servers
- `/apps/base/jenkins/kustomization.yaml` - Added jenkins-jobs.yaml
- `/apps/base/jenkins/jenkins-config.yaml` - Added job-dsl plugin
- `/apps/base/jenkins/jenkins-deployment.yaml` - Mounted jobs ConfigMap
- `/apps/base/jenkins/jenkins-jobs.yaml` - NEW: Job definitions
- `/apps/base/jenkins/README.md` - NEW: Comprehensive documentation

## Reverting Changes

To re-enable MCP servers:
```bash
# Edit kustomization.yaml
# Change: #- ./mcp-servers
# To:     - ./mcp-servers
```

To remove Job DSL provisioning and return to manual job creation, simply remove `jenkins-jobs.yaml` and references from `kustomization.yaml`.
