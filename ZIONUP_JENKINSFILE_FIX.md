# Fixing the ZionUp Jenkinsfile

## Current Issue

When running `zionup-homelab-deploy` job, you get:

```
Error when executing always post condition:
org.jenkinsci.plugins.workflow.steps.MissingContextVariableException: 
Required context class hudson.FilePath is missing
```

## Root Cause

Your Jenkinsfile has a post-condition cleanup step that's **outside a `node` block**. Jenkins Pipeline requires certain steps to run within a `node` context.

## Solution

### If you don't have a Jenkinsfile yet

Create one at: `deploy/homelab/Jenkinsfile`

```groovy
pipeline {
    agent any
    
    options {
        timestamps()
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '10', daysToKeepStr: '30'))
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "✓ Checked out zionup from main branch"
            }
        }
        
        stage('Build') {
            steps {
                echo "Building ZionUp..."
                // Add your build steps here
                // example: sh 'docker build -t zionup:latest .'
            }
        }
        
        stage('Deploy to Homelab') {
            steps {
                echo "Deploying to Homelab Kubernetes..."
                // Add your deployment steps here
                // example: sh 'kubectl apply -f deploy/homelab/'
            }
        }
    }
    
    post {
        always {
            node {
                echo "Cleaning up..."
                // Cleanup steps must be inside node block
                // sh 'rm -rf build/'
            }
        }
        success {
            node {
                echo "✓ Deployment successful!"
            }
        }
        failure {
            node {
                echo "✗ Deployment failed!"
            }
        }
    }
}
```

### If you already have a Jenkinsfile

Look for the `post` section and wrap cleanup steps in `node {}`:

**Before (WRONG):**
```groovy
post {
    always {
        echo "Cleaning up..."
        sh 'rm -rf build/'        // ❌ Outside node block
        deleteDir()               // ❌ Outside node block
    }
    success {
        echo "Success!"
    }
}
```

**After (CORRECT):**
```groovy
post {
    always {
        node {
            echo "Cleaning up..."
            sh 'rm -rf build/'    // ✅ Inside node block
            deleteDir()           // ✅ Inside node block
        }
    }
    success {
        node {
            echo "Success!"
        }
    }
}
```

## Steps to Fix

### 1. Update Your ZionUp Repository

```bash
cd ~/zionup  # or wherever you cloned it

# Create the deploy directory if it doesn't exist
mkdir -p deploy/homelab

# Create/edit the Jenkinsfile
cat > deploy/homelab/Jenkinsfile << 'EOF'
pipeline {
    agent any
    
    options {
        timestamps()
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '10', daysToKeepStr: '30'))
    }
    
    environment {
        REGISTRY = "docker.io"  # Change if using different registry
        KUBE_NAMESPACE = "zionup-production"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "✓ Checked out zionup from main branch"
            }
        }
        
        stage('Build') {
            steps {
                node {
                    echo "Building ZionUp application..."
                    // Add build steps if needed
                    // sh 'docker build -t ${REGISTRY}/zionup:${BUILD_NUMBER} .'
                }
            }
        }
        
        stage('Deploy') {
            steps {
                node {
                    echo "Deploying to Homelab Kubernetes cluster..."
                    echo "Namespace: ${KUBE_NAMESPACE}"
                    echo "Build Number: ${BUILD_NUMBER}"
                    
                    // Deploy using kubectl
                    // sh 'kubectl apply -f deploy/homelab/ -n ${KUBE_NAMESPACE}'
                    
                    // Or update deployment image
                    // sh '''
                    //   kubectl set image deployment/zionup-backend \
                    //     zionup-backend=${REGISTRY}/zionup:${BUILD_NUMBER} \
                    //     -n ${KUBE_NAMESPACE}
                    // '''
                }
            }
        }
    }
    
    post {
        always {
            node {
                echo "Cleaning up..."
                // Clean workspace if desired
                // deleteDir()
            }
        }
        
        success {
            node {
                echo """
                ========================================
                ✓ DEPLOYMENT SUCCESSFUL
                ========================================
                Target: docker
                Environment: homelab
                Build Number: ${BUILD_NUMBER}
                ========================================
                """
            }
        }
        
        failure {
            node {
                echo """
                ========================================
                ✗ DEPLOYMENT FAILED
                ========================================
                Target: docker
                Environment: homelab
                Build Number: ${BUILD_NUMBER}
                Check logs for details
                ========================================
                """
            }
        }
    }
}
EOF
```

### 2. Commit and Push

```bash
git add deploy/homelab/Jenkinsfile
git commit -m "Add Jenkinsfile for homelab deployment"
git push origin main
```

### 3. Jenkins Will Auto-Trigger

Jenkins will automatically trigger the job when it detects the push to main branch (GitHub webhook).

Check the Jenkins UI: `http://localhost:8080`
- The `zionup-homelab-deploy` job should start building

### 4. Monitor the Build

```bash
# Watch Jenkins logs (if pod still running)
kubectl logs -f statefulset/jenkins -n default | grep -i "zionup\|deploy"

# Or check Jenkins UI build console for live output
```

## Template Jenkinsfile Features

The template above includes:

✅ **Pipeline structure** - Basic pipeline with stages
✅ **Agent configuration** - Uses any available executor
✅ **Environment variables** - Registry, namespace, etc.
✅ **Multiple stages** - Checkout, Build, Deploy
✅ **Post-conditions** - Always, Success, Failure handlers
✅ **Proper node blocks** - All steps wrapped correctly
✅ **Build options** - Timeout, build history retention, timestamps
✅ **Logging** - Clear output messages
✅ **Error handling** - Success/failure output formatting

## Customization

### Add Docker Build Step

```groovy
stage('Build') {
    steps {
        node {
            echo "Building Docker image..."
            sh '''
                docker build \
                  -t ${REGISTRY}/zionup-backend:${BUILD_NUMBER} \
                  -f docker/Dockerfile.backend .
                
                docker build \
                  -t ${REGISTRY}/zionup-frontend:${BUILD_NUMBER} \
                  -f docker/Dockerfile.frontend .
            '''
        }
    }
}
```

### Add Push to Registry

```groovy
stage('Push to Registry') {
    steps {
        node {
            sh '''
                docker login -u $REGISTRY_USER -p $REGISTRY_PASS
                docker push ${REGISTRY}/zionup-backend:${BUILD_NUMBER}
                docker push ${REGISTRY}/zionup-frontend:${BUILD_NUMBER}
            '''
        }
    }
}
```

### Add Kubernetes Deployment

```groovy
stage('Deploy to K8s') {
    steps {
        node {
            sh '''
                kubectl set image deployment/zionup-backend \
                  zionup-backend=${REGISTRY}/zionup-backend:${BUILD_NUMBER} \
                  -n ${KUBE_NAMESPACE}
                
                kubectl set image deployment/zionup-frontend \
                  zionup-frontend=${REGISTRY}/zionup-frontend:${BUILD_NUMBER} \
                  -n ${KUBE_NAMESPACE}
                
                kubectl rollout status deployment/zionup-backend -n ${KUBE_NAMESPACE}
            '''
        }
    }
}
```

### Add Tests

```groovy
stage('Test') {
    steps {
        node {
            echo "Running tests..."
            sh '''
                # Backend tests
                cd backend
                python -m pytest tests/
                cd ..
                
                # Frontend tests
                cd frontend
                npm test
                cd ..
            '''
        }
    }
}
```

## Verification

After creating the Jenkinsfile:

1. **Push to GitHub:**
   ```bash
   git push origin main
   ```

2. **Check Jenkins UI:**
   - Open Jenkins at `http://localhost:8080`
   - Click on `zionup-homelab-deploy` job
   - Should see a new build starting

3. **Watch Build Progress:**
   - Click on the build number (e.g., `#2`)
   - Click "Console Output"
   - Should see pipeline stages executing

4. **Expected Output:**
   ```
   [Pipeline] Start of Pipeline
   [Pipeline] node
   Running on Jenkins in /var/jenkins_home/workspace/zionup-homelab-deploy
   [Pipeline] stage
   [Pipeline] { (Checkout)
   [Pipeline] checkout
   ...
   [Pipeline] stage
   [Pipeline] { (Deploy)
   ...
   [Pipeline] echo
   ✓ DEPLOYMENT SUCCESSFUL
   [Pipeline] End of Pipeline
   Finished: SUCCESS
   ```

## Troubleshooting

### Still Getting "FilePath is missing"

Make sure **all steps** in post conditions are wrapped in `node {}`:

```groovy
post {
    always {
        node {  // ← Must be here
            sh 'echo "cleanup"'
            deleteDir()
        }
    }
}
```

### Build Still Failing

Check for other missing requirements:
- Secrets: `zionup-staging-secrets`, `zionup-prod-secrets`
- Credentials: Docker registry credentials, Kubernetes access
- Environment: Docker daemon, kubectl access, npm/python installed

Add to Jenkinsfile to see what's available:

```groovy
stage('Debug') {
    steps {
        node {
            sh '''
                echo "=== Environment ==="
                env | sort
                echo "=== Git ==="
                git --version
                echo "=== Docker ==="
                docker --version 2>/dev/null || echo "Docker not available"
                echo "=== Kubernetes ==="
                kubectl version --client 2>/dev/null || echo "kubectl not available"
            '''
        }
    }
}
```

## Success Indicators

✅ Jenkins job `zionup-homelab-deploy` runs without errors  
✅ Jenkinsfile is found and executed  
✅ Pipeline stages show in Jenkins UI  
✅ Build completes with "Finished: SUCCESS"  
✅ Deployment updates are applied to Kubernetes (if configured)

## Next Steps

1. Create/fix the Jenkinsfile in your zionup repo
2. Push to main branch
3. Jenkins will auto-trigger
4. Monitor build in Jenkins UI
5. Celebrate! 🎉
