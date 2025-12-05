# ZionUp Application

This directory contains the Kubernetes manifests for the ZionUp application stack, including:
- Backend (Django/Python)
- Frontend (Node.js/React)
- PostgreSQL database
- Redis cache
- Ingress configuration

## Overview

The ZionUp application is deployed with the following components:

- **Backend**: Django-based Python application running on port 8000
- **Frontend**: React-based frontend application running on port 80
- **PostgreSQL**: Primary database (postgres:15-alpine)
- **Redis**: Caching layer (redis:7-alpine)
- **Ingress**: nginx-based ingress controller for external access

## Namespace

All resources are deployed in the `zionup-production` namespace.

## Configuration

### ConfigMap: `zionup-config`

Contains non-sensitive configuration:
- Database connection details
- Redis URL
- Email settings
- CORS origins
- Azure AD settings
- Webhook configuration

### Secrets: `zionup-secrets`

Contains sensitive data (managed via Jenkins):
- Database password
- Django secret key
- API keys (Gemini, Azure AD)
- Email credentials

**IMPORTANT**: Never commit actual secret values to this repository. Use the template in `zionup-secrets.yaml` and populate values through Jenkins pipeline.

## Jenkins Pipeline Integration

### Environment Variables Required

For your Jenkins pipeline, set the following environment variables:

```bash
# Docker Images (with registry and tags)
BACKEND_IMAGE=your-registry/zionup-backend
BACKEND_IMAGE_TAG=latest

FRONTEND_IMAGE=your-registry/zionup-frontend
FRONTEND_IMAGE_TAG=latest

# Secret Values (provided by Jenkins Credentials)
POSTGRES_PASSWORD=<generated-password>
SECRET_KEY=<django-secret-key>
GEMINI_API_KEY=<google-api-key>
EMAIL_HOST_USER=<email-address>
EMAIL_HOST_PASSWORD=<email-password>
AZURE_AD_TENANT_ID=<tenant-id>
AZURE_AD_CLIENT_ID=<client-id>
AZURE_AD_CLIENT_SECRET=<client-secret>
```

### Jenkins Pipeline Template

```groovy
pipeline {
    agent any
    
    environment {
        KUBECONFIG = credentials('kubeconfig-homelab')
        BACKEND_IMAGE = 'your-registry/zionup-backend'
        BACKEND_IMAGE_TAG = "${BUILD_NUMBER}"
        FRONTEND_IMAGE = 'your-registry/zionup-frontend'
        FRONTEND_IMAGE_TAG = "${BUILD_NUMBER}"
    }
    
    stages {
        stage('Build') {
            steps {
                // Build your Docker images
                sh '''
                    docker build -t ${BACKEND_IMAGE}:${BACKEND_IMAGE_TAG} ./backend
                    docker build -t ${FRONTEND_IMAGE}:${FRONTEND_IMAGE_TAG} ./frontend
                '''
            }
        }
        
        stage('Push') {
            steps {
                // Push to registry
                sh '''
                    docker push ${BACKEND_IMAGE}:${BACKEND_IMAGE_TAG}
                    docker push ${FRONTEND_IMAGE}:${FRONTEND_IMAGE_TAG}
                '''
            }
        }
        
        stage('Create Secrets') {
            steps {
                // Create Kubernetes secrets
                sh '''
                    kubectl -n zionup-production delete secret zionup-secrets --ignore-not-found
                    kubectl -n zionup-production create secret generic zionup-secrets \
                        --from-literal=POSTGRES_PASSWORD="${POSTGRES_PASSWORD}" \
                        --from-literal=SECRET_KEY="${SECRET_KEY}" \
                        --from-literal=GEMINI_API_KEY="${GEMINI_API_KEY}" \
                        --from-literal=EMAIL_HOST_USER="${EMAIL_HOST_USER}" \
                        --from-literal=EMAIL_HOST_PASSWORD="${EMAIL_HOST_PASSWORD}" \
                        --from-literal=AZURE_AD_TENANT_ID="${AZURE_AD_TENANT_ID}" \
                        --from-literal=AZURE_AD_CLIENT_ID="${AZURE_AD_CLIENT_ID}" \
                        --from-literal=AZURE_AD_CLIENT_SECRET="${AZURE_AD_CLIENT_SECRET}" \
                        --from-literal=DATABASE_URL="postgresql+asyncpg://pmapp:${POSTGRES_PASSWORD}@postgres:5432/pmapp"
                '''
            }
        }
        
        stage('Deploy') {
            steps {
                // Deploy using kustomize with variable substitution
                sh '''
                    # Substitute Jenkins variables in deployment files
                    export BACKEND_IMAGE_TAG="${BACKEND_IMAGE_TAG}"
                    export FRONTEND_IMAGE_TAG="${FRONTEND_IMAGE_TAG}"
                    
                    # Apply the kustomization
                    kubectl apply -k ./apps/base/zionup
                    
                    # Wait for rollout
                    kubectl -n zionup-production rollout status deployment/backend
                    kubectl -n zionup-production rollout status deployment/frontend
                '''
            }
        }
    }
    
    post {
        always {
            // Cleanup
            cleanWs()
        }
        success {
            echo 'ZionUp deployment completed successfully!'
        }
        failure {
            echo 'ZionUp deployment failed!'
        }
    }
}
```

## Deployment

### Prerequisites

1. Kubernetes cluster with nginx ingress controller installed
2. Storage provisioner for persistent volumes
3. Jenkins instance with Kubernetes plugin
4. Docker registry access

### Manual Deployment

For manual testing without Jenkins:

```bash
# 1. Create namespace
kubectl apply -f namespace.yaml

# 2. Create ConfigMap
kubectl apply -f zionup-configmap.yaml

# 3. Create secrets (replace placeholder values)
kubectl create secret generic zionup-secrets \
  --from-literal=POSTGRES_PASSWORD=your-secure-password \
  --from-literal=SECRET_KEY=your-django-secret-key \
  --from-literal=GEMINI_API_KEY=your-gemini-key \
  --from-literal=EMAIL_HOST_USER=your-email \
  --from-literal=EMAIL_HOST_PASSWORD=your-email-password \
  --from-literal=AZURE_AD_TENANT_ID=your-tenant-id \
  --from-literal=AZURE_AD_CLIENT_ID=your-client-id \
  --from-literal=AZURE_AD_CLIENT_SECRET=your-client-secret \
  --from-literal=DATABASE_URL=postgresql+asyncpg://pmapp:your-password@postgres:5432/pmapp \
  -n zionup-production

# 4. Deploy all resources
kubectl apply -k .
```

## Resource Scaling

Adjust replicas and resource limits in the deployment files:

- **Backend**: Default 2 replicas
- **Frontend**: Default 2 replicas
- **PostgreSQL**: 1 replica (StatefulSet)
- **Redis**: 1 replica

## Troubleshooting

### Check deployment status
```bash
kubectl get all -n zionup-production
```

### View pod logs
```bash
kubectl logs -n zionup-production deployment/backend -f
kubectl logs -n zionup-production deployment/frontend -f
```

### Check for events
```bash
kubectl describe pod -n zionup-production <pod-name>
```

### Port forward for local access
```bash
kubectl port-forward -n zionup-production svc/backend 8000:8000
kubectl port-forward -n zionup-production svc/frontend 3000:80
```

## Domain Configuration

Update the ingress hostname in `ingress.yaml`:

Replace `zionup.yourdomain.com` with your actual domain.

## Storage Configuration

The default storage configuration uses dynamically provisioned storage. For specific environments:

### Local Storage (Self-hosted)
Uncomment `storageClassName: local-storage` in relevant YAML files.

### Cloud Providers
Adjust `storageClassName` based on your cloud provider:
- AWS: `gp3` or `ebs-sc`
- Azure: `managed-premium`
- GCP: `standard-rwo` or `premium-rwo`

## Monitoring

To monitor ZionUp with Prometheus and Grafana (if deployed):

Add scrape configs for backend metrics endpoint:
```yaml
- job_name: 'zionup-backend'
  static_configs:
    - targets: ['backend.zionup-production.svc.cluster.local:8000']
```

## Health Checks

The backend exposes a health endpoint at `/health/` which is used for:
- Liveness probes (30s initial delay, 30s interval)
- Readiness probes (30s initial delay, 10s interval)

## Additional Resources

For more information, refer to:
- [Kubernetes Ingress Documentation](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [ConfigMaps and Secrets](https://kubernetes.io/docs/concepts/configuration/configmap/)
