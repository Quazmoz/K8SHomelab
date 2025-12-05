# K8SHomelab Setup Summary

## Changes Made

### 1. K8s Troubleshooting Script ✓

**File**: `/workspaces/K8SHomelab/k8s.sh`

A comprehensive bash script with 40+ functions for troubleshooting Kubernetes homelabs.

**Features**:
- Cluster operations (nodes, health checks, certificates)
- Pod management (logs, exec, describe, events)
- Deployment management (deployments, statefulsets, daemonsets)
- Networking (services, ingress, DNS testing)
- Storage (PV/PVC management)
- RBAC (roles, rolebindings, resource quotas)
- Kustomize operations (apply, dry-run, get YAML)
- Colored output for easy readability

**Usage**:
```bash
./k8s.sh show_help              # Display all available commands
./k8s.sh show_pods default      # List pods in default namespace
./k8s.sh describe_pod default my-pod  # Get pod details
./k8s.sh show_pod_logs default my-pod # View pod logs
```

For detailed usage, see `K8S_SCRIPT_README.md`

---

### 2. ZionUp Application ✓

**Directory**: `/workspaces/K8SHomelab/apps/base/zionup`

A complete production-ready Kubernetes application stack with the following components:

#### Files Created:
- `kustomization.yaml` - Kustomize configuration
- `namespace.yaml` - ZionUp namespace (zionup-production)
- `zionup-configmap.yaml` - Non-sensitive configuration
- `zionup-secrets.yaml` - Sensitive data (template)
- `postgres-deployment.yaml` - PostgreSQL 15 StatefulSet
- `redis-deployment.yaml` - Redis 7 Deployment
- `backend-deployment.yaml` - Django backend (2 replicas)
- `frontend-deployment.yaml` - Frontend app (2 replicas)
- `media-pvc.yaml` - Persistent storage for media files
- `ingress.yaml` - Nginx ingress controller configuration
- `README.md` - Comprehensive deployment guide

#### Architecture:

```
ZionUp (zionup-production)
├── Backend (Django/Python)
│   ├── Service: backend:8000
│   ├── Replicas: 2
│   ├── Resources: 512Mi RAM / 500m CPU request, 1Gi RAM / 1000m CPU limit
│   └── Health: /health/ endpoint
├── Frontend (React/Node.js)
│   ├── Service: frontend:80
│   ├── Replicas: 2
│   ├── Resources: 128Mi RAM / 100m CPU request, 256Mi RAM / 200m CPU limit
│   └── Health: / endpoint
├── PostgreSQL
│   ├── Service: postgres:5432 (Headless)
│   ├── Database: pmapp
│   ├── Storage: 10Gi
│   └── Type: StatefulSet (1 replica)
├── Redis
│   ├── Service: redis:6379
│   ├── Storage: Memory only
│   └── Type: Deployment (1 replica)
└── Storage
    └── Media PVC: 5Gi (ReadWriteOnce)

Ingress: nginx ingress controller
  - zionup.yourdomain.com
  - www.zionup.yourdomain.com
```

---

### 3. Jenkins Pipeline Integration ✓

#### Environment Variables for Jenkins:

```groovy
// Docker Images
BACKEND_IMAGE = "your-registry/zionup-backend"
BACKEND_IMAGE_TAG = "${BUILD_NUMBER}"  // or "latest", "v1.0", etc.

FRONTEND_IMAGE = "your-registry/zionup-frontend"
FRONTEND_IMAGE_TAG = "${BUILD_NUMBER}"

// Secrets (use Jenkins Credentials)
POSTGRES_PASSWORD = "your-secure-password"
SECRET_KEY = "django-secret-key"
GEMINI_API_KEY = "google-api-key"
EMAIL_HOST_USER = "email@example.com"
EMAIL_HOST_PASSWORD = "email-password"
AZURE_AD_TENANT_ID = "tenant-id"
AZURE_AD_CLIENT_ID = "client-id"
AZURE_AD_CLIENT_SECRET = "client-secret"
```

#### Jenkins Pipeline Stages:

1. **Build** - Build Docker images for backend and frontend
2. **Push** - Push images to container registry
3. **Create Secrets** - Create Kubernetes secrets with sensitive data
4. **Deploy** - Apply kustomization and wait for rollout

See `apps/base/zionup/README.md` for complete Jenkins pipeline template.

---

### 4. Updated Base Kustomization ✓

**File**: `/workspaces/K8SHomelab/apps/base/kustomization.yaml`

Added zionup to the list of resources:
```yaml
resources:
  # ... other resources ...
  - ./jenkins
  - ./loki
  - ./zionup        # ← NEW
  #- ./wireguard
```

---

## Deployment Instructions

### Prerequisites:
1. Kubernetes cluster with nginx ingress controller
2. Storage provisioner for persistent volumes
3. Docker registry access
4. Jenkins instance (for pipeline deployments)

### Quick Start (Manual):

```bash
# Create namespace
kubectl apply -f apps/base/zionup/namespace.yaml

# Create ConfigMap
kubectl apply -f apps/base/zionup/zionup-configmap.yaml

# Create secrets (replace placeholders)
kubectl create secret generic zionup-secrets \
  --from-literal=POSTGRES_PASSWORD=secure-password \
  --from-literal=SECRET_KEY=django-key \
  --from-literal=GEMINI_API_KEY=google-key \
  --from-literal=EMAIL_HOST_USER=email@example.com \
  --from-literal=EMAIL_HOST_PASSWORD=email-password \
  --from-literal=AZURE_AD_TENANT_ID=tenant-id \
  --from-literal=AZURE_AD_CLIENT_ID=client-id \
  --from-literal=AZURE_AD_CLIENT_SECRET=client-secret \
  --from-literal=DATABASE_URL=postgresql+asyncpg://pmapp:secure-password@postgres:5432/pmapp \
  -n zionup-production

# Deploy all resources
kubectl apply -k apps/base/zionup
```

### Jenkins Pipeline Deployment:

1. Configure Jenkins credentials for kubeconfig and registry
2. Set environment variables for image tags and secrets
3. Run pipeline stages:
   - Build Docker images
   - Push to registry
   - Create Kubernetes secrets
   - Apply kustomization

---

## Configuration Details

### ConfigMap Variables (zionup-configmap.yaml):

| Variable | Value |
|----------|-------|
| POSTGRES_SERVER | postgres |
| POSTGRES_PORT | 5432 |
| POSTGRES_DB | pmapp |
| POSTGRES_USER | pmapp |
| REDIS_URL | redis://redis:6379/0 |
| DEBUG | false |
| DJANGO_LOG_LEVEL | INFO |
| EMAIL_HOST | smtp.gmail.com |
| EMAIL_PORT | 587 |
| EMAIL_USE_TLS | true |
| ALLOWED_HOSTS | backend,localhost,127.0.0.1 |
| AZURE_AD_ENABLED | true |

### Secret Variables (zionup-secrets.yaml):

- POSTGRES_PASSWORD
- SECRET_KEY (Django)
- DATABASE_URL
- GEMINI_API_KEY
- EMAIL_HOST_USER
- EMAIL_HOST_PASSWORD
- AZURE_AD_TENANT_ID
- AZURE_AD_CLIENT_ID
- AZURE_AD_CLIENT_SECRET

### Ingress Configuration:

- **Controller**: Nginx ingress controller
- **Hostnames**: 
  - zionup.yourdomain.com
  - www.zionup.yourdomain.com
- **Paths**:
  - `/api` → backend:8000
  - `/admin` → backend:8000
  - `/health` → backend:8000
  - `/` → frontend:80

---

## Troubleshooting

### View ZionUp Resources:
```bash
./k8s.sh show_all_resources zionup-production
./k8s.sh show_pods zionup-production
./k8s.sh show_deployments zionup-production
```

### Check Pod Status:
```bash
./k8s.sh describe_pod zionup-production backend-<pod-suffix>
./k8s.sh show_pod_logs zionup-production backend-<pod-suffix>
```

### Test Database Connection:
```bash
./k8s.sh exec_pod zionup-production postgres-0 sh
# Inside pod: pg_isready -U pmapp -d pmapp -h postgres
```

### Port Forward for Local Testing:
```bash
./k8s.sh port_forward zionup-production svc/backend 8000 8000
./k8s.sh port_forward zionup-production svc/frontend 3000 80
```

---

## Files Summary

### Created:
- `/k8s.sh` - Main troubleshooting script
- `/K8S_SCRIPT_README.md` - k8s.sh documentation
- `/apps/base/zionup/` - Complete ZionUp application stack (10 files)

### Modified:
- `/apps/base/kustomization.yaml` - Added zionup reference

### From Temphold (Migrated):
- namespace.yaml → namespace.yaml (renamed)
- configmap.yaml → zionup-configmap.yaml
- secrets.yaml.template → zionup-secrets.yaml
- backend-deployment.yaml → backend-deployment.yaml
- frontend-deployment.yaml → frontend-deployment.yaml
- postgres-deployment.yaml → postgres-deployment.yaml
- redis-deployment.yaml → redis-deployment.yaml
- ingress.yaml → ingress.yaml
- media-pvc.yaml → media-pvc.yaml

---

## Next Steps

1. **Update Domain**: Replace `yourdomain.com` with your actual domain in ingress
2. **Update Image Names**: Update image registry paths in deployment files
3. **Configure Storage**: Adjust storageClassName if needed
4. **Set Jenkins Variables**: Configure environment variables in Jenkins pipeline
5. **Create Secrets**: Use Jenkins or kubectl to create actual secret values
6. **Deploy**: Run Jenkins pipeline or use kubectl apply

---

## Additional Resources

- `apps/base/zionup/README.md` - Detailed ZionUp deployment guide
- `K8S_SCRIPT_README.md` - Complete k8s.sh documentation
- Jenkins pipeline template in `apps/base/zionup/README.md`

