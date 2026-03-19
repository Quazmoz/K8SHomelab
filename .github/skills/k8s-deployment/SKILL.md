---
name: k8s-deployment
description: "Create, modify, or debug Kubernetes deployments in the K8S homelab. USE FOR: adding new apps, writing deployment/service/ingress/pvc manifests, configuring health checks, setting resource limits, adding to kustomization.yaml, updating Homepage dashboard. Covers the full deployment lifecycle from manifests to GitOps reconciliation."
---

# K8S Homelab Deployment Skill

## When to Use

- Adding a new application to the homelab
- Modifying an existing deployment (image upgrade, env changes, resource tuning)
- Creating Kubernetes manifests (Deployment, Service, Ingress, PVC, ConfigMap)
- Debugging pod scheduling, CrashLoopBackOff, or ImagePullBackOff issues
- Enabling/disabling apps in the main kustomization

## Project Conventions

All manifests follow strict conventions. **Deviate and Flux will reject them.**

| Convention | Value |
|---|---|
| Namespace | `apps` (always) |
| Labels | `app: <name>` on ALL resources |
| Ingress class | `nginx` |
| Ingress domain | `<name>.k8s.local` |
| Service type | `ClusterIP` (default, unless LoadBalancer needed like DNS) |
| Service discovery | `<svc>.apps.svc.cluster.local:<port>` |
| HelmRelease API | `helm.toolkit.fluxcd.io/v2` |
| Kustomization API | `kustomize.config.k8s.io/v1beta1` |
| Primary worker node | `quinn-hpprobook430g6` |
| Control plane node | `orangepi6plus` |
| Secret encryption | SOPS/AGE (`.secret.enc.yaml` suffix) |
| Secret templates | `.yaml.template` for structure reference |

## Procedure: Add a New App

### Step 1: Create the app directory

```
apps/base/<app-name>/
├── kustomization.yaml
├── <app>-deployment.yaml
├── <app>-service.yaml
├── <app>-ingress.yaml        # if external access needed
├── <app>-pvc.yaml            # if persistent storage needed
├── <app>-configmap.yaml      # if config needed
├── <app>-secrets.yaml.template  # if secrets needed
├── README.md                 # human documentation
└── AI_CONTEXT.md             # AI documentation
```

### Step 2: Write the kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - <app>-deployment.yaml
  - <app>-service.yaml
  - <app>-ingress.yaml
```

### Step 3: Write the Deployment

Use this template — includes health checks, resource limits, and node scheduling:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: <app>
  namespace: apps
  labels:
    app: <app>
spec:
  replicas: 1
  selector:
    matchLabels:
      app: <app>
  strategy:
    type: Recreate            # Use Recreate if PVC is RWO; else RollingUpdate
  template:
    metadata:
      labels:
        app: <app>
    spec:
      nodeSelector:
        kubernetes.io/hostname: quinn-hpprobook430g6    # pin to storage node
      containers:
        - name: <app>
          image: <image>:<tag>
          ports:
            - containerPort: <port>
              protocol: TCP
          env:
            - name: TZ
              value: "America/New_York"
          resources:
            requests:
              memory: "64Mi"
              cpu: "10m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          startupProbe:
            tcpSocket:
              port: <port>
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 30
          livenessProbe:
            tcpSocket:
              port: <port>
            periodSeconds: 30
            failureThreshold: 3
          readinessProbe:
            tcpSocket:
              port: <port>
            periodSeconds: 10
            failureThreshold: 3
          volumeMounts:
            - name: data
              mountPath: /data          # adjust per app
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: <app>-pvc
```

### Step 4: Write the Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: <app>
  namespace: apps
  labels:
    app: <app>
spec:
  type: ClusterIP
  selector:
    app: <app>
  ports:
    - name: http
      port: <port>
      targetPort: <port>
      protocol: TCP
```

### Step 5: Write the Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: <app>-ingress
  namespace: apps
  labels:
    app: <app>
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
spec:
  ingressClassName: nginx
  rules:
    - host: <app>.k8s.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: <app>
                port:
                  number: <port>
```

**For WebSocket apps** (Jupyter, OpenWebUI), add these annotations:

```yaml
annotations:
  nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
  nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
  nginx.ingress.kubernetes.io/proxy-connect-timeout: "3600"
```

**For Authentik-protected ingress**, add:

```yaml
annotations:
  nginx.ingress.kubernetes.io/auth-url: "http://authentik-server.apps.svc.cluster.local:9000/outpost.goauthentik.io/auth/nginx"
  nginx.ingress.kubernetes.io/auth-signin: "http://auth.k8s.local/outpost.goauthentik.io/start?rd=$scheme://$host$escaped_request_uri"
  nginx.ingress.kubernetes.io/auth-response-headers: "Set-Cookie,X-authentik-username,X-authentik-groups"
  nginx.ingress.kubernetes.io/auth-snippet: "proxy_set_header X-Forwarded-Host $http_host;"
```

### Step 6: Write PVC (if needed)

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: <app>-pvc
  namespace: apps
  labels:
    app: <app>
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-storage
  resources:
    requests:
      storage: <size>Gi
```

**Then add the PV** to `apps/base/local-storage/storage.yaml` — see the [homelab-storage skill](../homelab-storage/SKILL.md).

### Step 7: Enable in main kustomization

Add `- ./<app-name>` to `apps/base/kustomization.yaml` resources list.

### Step 8: Update Homepage dashboard

Edit `apps/base/homepage/manifests.yaml` — add entry under appropriate category in the ConfigMap `services.yaml` section:

```yaml
- <AppName>:
    href: http://<app>.k8s.local
    icon: si-<icon>
    description: Short description
    siteMonitor: http://<app>.apps.svc.cluster.local:<port>
    statusStyle: dot
```

### Step 9: Create documentation

Create both `README.md` (human) and `AI_CONTEXT.md` (AI) in the app directory. The AI_CONTEXT.md MUST include:

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

### Step 10: Add to hosts file

Add `<app>.k8s.local` to the hosts file entry pointing to `192.168.1.221`.

### Step 11: Deploy

```bash
git add -A && git commit -m "Add <app-name>" && git push
flux reconcile kustomization apps --with-source
```

## Procedure: Add a Helm-Based App

### HelmRelease template

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: <app>
  namespace: apps
spec:
  interval: 5m
  chart:
    spec:
      chart: <chart-name>
      version: "<pinned-version>"
      sourceRef:
        kind: HelmRepository
        name: <repo-name>
        namespace: flux-system
      interval: 1m
  values:
    # Chart-specific values here
```

**If a new Helm repo is needed**, add it to `apps/base/sources/helm-repositories.yaml`:

```yaml
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: <repo-name>
  namespace: flux-system
spec:
  interval: 24h
  url: https://<helm-repo-url>/
```

## Resource Sizing Guide

| Workload Type | Memory Request | Memory Limit | CPU Request | CPU Limit |
|---------------|---------------|-------------|------------|----------|
| Lightweight UI | 64Mi | 256Mi | 10m | 500m |
| Standard app | 256Mi | 1Gi | 50m | 1000m |
| Database | 512Mi | 4Gi | 200m | 2000m |
| AI/LLM workload | 1Gi | 8Gi | 500m | 4000m |
| LLM inference | 8Gi | 8Gi | 4000m | 8000m |

## Node Scheduling Rules

| Workload | Node | Reason |
|----------|------|--------|
| Most workloads | `quinn-hpprobook430g6` | Worker with SSD storage |
| LLM inference (Ollama) | `orangepi6plus` | ARM64 with NPU potential |
| Backups | `orangepi6plus` | SD card slow-storage |
| DNS (AdGuard) | `orangepi6plus` | Always-on, minimal resources |
| Homepage | `orangepi6plus` | Lightweight, needs control-plane toleration |

**Control plane toleration** (needed for pods on `orangepi6plus`):

```yaml
tolerations:
  - key: "node-role.kubernetes.io/control-plane"
    operator: "Exists"
    effect: "NoSchedule"
```

## Debugging Commands

```bash
# Pod not starting
kubectl describe pod -n apps <pod-name>
kubectl logs -n apps <pod-name> --previous

# CrashLoopBackOff
kubectl logs -n apps <pod-name> --tail=100
kubectl get events -n apps --field-selector involvedObject.name=<pod-name>

# Image pull issues
kubectl describe pod -n apps <pod-name> | grep -A5 "Events"

# PVC not binding
kubectl get pv | grep <app>
kubectl get pvc -n apps | grep <app>

# Ingress not routing
kubectl get ingress -n apps <app>-ingress
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=20
```
