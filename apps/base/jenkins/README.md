# Jenkins GitOps Job Configuration

Jenkins jobs are now provisioned via GitOps using ConfigMaps and the Job DSL plugin.

## Overview

Instead of manually creating jobs through the Jenkins GUI, all jobs are defined in Kubernetes ConfigMaps as Groovy code. The Job DSL plugin automatically generates and manages these jobs.

## How It Works

1. **Job definitions** are stored in `jenkins-jobs.yaml` ConfigMap as Groovy scripts
2. **Jenkins ConfigMap** (`jenkins-config.yaml`) includes the `job-dsl` plugin
3. **Jenkins Deployment** mounts the jobs ConfigMap at `/var/jenkins_home/jobs-config`
4. **Jenkins executes** a seed job that reads and creates all jobs from the ConfigMap

## Job Definition Format

Jobs are defined using Jenkins Job DSL syntax in Groovy. Example:

```groovy
pipelineJob('job-name') {
  description('Job description')
  
  keepBuilds {
    strategy {
      buildDiscarderStrategy {
        daysToKeepStr: '30'
        numToKeepStr: '10'
      }
    }
  }
  
  triggers {
    githubPush()  // Trigger on GitHub push
  }
  
  definition {
    cpsScm {  // Declarative pipeline from Git
      scm {
        git {
          remote {
            url('https://github.com/org/repo.git')
          }
          branches('*/main')
        }
      }
      scriptPath('Jenkinsfile')  // Path to Jenkinsfile in repo
      lightweight(true)
    }
  }
}
```

## Current Jobs

### zionup-homelab-deploy

**Description**: Deploy ZionUp to Homelab Kubernetes Cluster

**Source**: https://github.com/Quazmoz/zionup.git (main branch)

**Jenkinsfile**: `deploy/homelab/Jenkinsfile`

**Triggers**: GitHub push to main branch

**Build History**: Keeps last 10 builds, 30 days of history

## Adding New Jobs

### Step 1: Create Job Definition

Add a new `.groovy` file to `jenkins-jobs.yaml` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: jenkins-jobs
  namespace: default
data:
  my-new-job.groovy: |-
    pipelineJob('my-new-job') {
      description('My new job description')
      # ... job configuration ...
    }
```

### Step 2: Apply Configuration

```bash
kubectl apply -f apps/base/jenkins/jenkins-jobs.yaml
```

### Step 3: Restart Jenkins (for immediate effect)

```bash
kubectl rollout restart statefulset/jenkins -n default
```

Or the seed job will pick it up on next run.

## File Structure

```
apps/base/jenkins/
├── kustomization.yaml          # Includes all jenkins resources
├── jenkins-config.yaml         # Plugins and Jenkins configuration
├── jenkins-jobs.yaml           # Job definitions (NEW)
├── jenkins-deployment.yaml     # StatefulSet and Service
├── jenkins-storage.yaml        # PVC configuration
└── README.md                   # This file
```

## Modifying Existing Jobs

To modify an existing job:

1. Edit the corresponding `.groovy` file in `jenkins-jobs.yaml`
2. Save the file
3. Apply: `kubectl apply -f apps/base/jenkins/jenkins-jobs.yaml`
4. Restart Jenkins pod to pick up changes immediately

## Job DSL Best Practices

### Use Pipeline Jobs

```groovy
pipelineJob('name') {
  // Modern declarative pipelines with Jenkinsfile
  definition {
    cpsScm { ... }
  }
}
```

### Define Build History Strategy

```groovy
keepBuilds {
  strategy {
    buildDiscarderStrategy {
      daysToKeepStr: '30'      // Keep builds for 30 days
      numToKeepStr: '10'       // Keep at most 10 builds
      artifactDaysToKeepStr: '-1'  // Don't discard artifacts by days
      artifactNumToKeepStr: '-1'   // Don't limit artifacts by count
    }
  }
}
```

### Enable Git Triggers

```groovy
triggers {
  githubPush()  // Trigger on any push to monitored branch
  // Or specific branch:
  // githubPush {
  //   branch('main')
  // }
}
```

### Reference Jenkinsfile from Repo

```groovy
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
    scriptPath('path/to/Jenkinsfile')  // Location of Jenkinsfile in repo
    lightweight(true)  // Use lightweight checkout
  }
}
```

## Troubleshooting

### Jobs not creating

1. Check Jenkins logs:
   ```bash
   kubectl logs -f deployment/jenkins -n default | grep -i "dsl\|job"
   ```

2. Verify ConfigMap is mounted:
   ```bash
   kubectl exec -it statefulset/jenkins -n default -- ls -la /var/jenkins_home/jobs-config/
   ```

3. Check seed job execution:
   - Visit Jenkins UI: http://jenkins.k8s.local/
   - Look for job execution logs

### Job configuration syntax error

1. Validate Groovy syntax
2. Check Jenkins logs for parsing errors
3. Common mistakes:
   - Missing closing braces
   - Incorrect indentation
   - Invalid DSL method names

### Changes not taking effect

```bash
# Restart Jenkins to force job regeneration
kubectl rollout restart statefulset/jenkins -n default

# Or delete and reapply
kubectl delete configmap jenkins-jobs -n default
kubectl apply -f apps/base/jenkins/jenkins-jobs.yaml
```

## Common Job Patterns

### Simple Pipeline from Git

```groovy
pipelineJob('deploy-app') {
  description('Deploy application')
  triggers {
    githubPush()
  }
  definition {
    cpsScm {
      scm {
        git {
          remote {
            url('https://github.com/myorg/myapp.git')
          }
          branches('*/main', '*/develop')
        }
      }
      scriptPath('Jenkinsfile')
      lightweight(true)
    }
  }
}
```

### Job with Build Parameters

```groovy
pipelineJob('deploy-with-params') {
  parameters {
    string(
      name: 'ENVIRONMENT',
      defaultValue: 'staging',
      description: 'Deployment environment'
    )
    choice(
      name: 'VERSION',
      choices: ['1.0', '1.1', '2.0'],
      description: 'Application version'
    )
  }
  definition {
    cpsScm {
      scm {
        git {
          remote {
            url('https://github.com/myorg/myapp.git')
          }
          branches('*/main')
        }
      }
      scriptPath('Jenkinsfile')
    }
  }
}
```

### Job with Custom Triggers

```groovy
pipelineJob('scheduled-job') {
  triggers {
    cron('H 2 * * *')  // Daily at 2 AM
  }
  // ... definition ...
}
```

## GitOps Workflow

1. **Developer** updates `jenkins-jobs.yaml` in Git
2. **CI/CD pipeline** applies changes: `kubectl apply -f jenkins-jobs.yaml`
3. **Kubernetes** updates the ConfigMap
4. **Jenkins** detects changes and regenerates jobs
5. **New jobs** are available immediately in Jenkins UI

## Security Considerations

- **GitHub Credentials**: Add via Jenkins UI (Settings → Credentials)
- **Sensitive Data**: Use Jenkins Secrets plugin, not plain text in ConfigMap
- **Access Control**: Use Jenkins security realm (SAML, LDAP, etc.)
- **Job Permissions**: Restrict job execution based on user roles

## References

- [Job DSL Documentation](https://jenkinsci.github.io/job-dsl-plugin/)
- [Jenkins Kubernetes Plugin](https://plugins.jenkins.io/kubernetes/)
- [Jenkins Configuration as Code](https://www.jenkins.io/projects/jcasc/)
- [Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/)

## Next Steps

1. Add GitHub credentials to Jenkins
2. Create Jenkinsfile in zionup repository at `deploy/homelab/Jenkinsfile`
3. Push a commit to main branch to trigger the job
4. Monitor Jenkins UI for job execution
5. Add more jobs as needed following the same pattern
