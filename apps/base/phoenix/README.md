# Phoenix (LLM Observability)

## Overview

Arize Phoenix provides LLM observability — tracing, evaluation, and debugging for AI/LLM applications. Receives OpenTelemetry traces from OpenWebUI and Alloy.

## Current GitOps state: paused (2026-10-19)

The root `apps/base/kustomization.yaml` still includes `./phoenix` but sets
`replicas: 0`. The 5Gi PVC, PostgreSQL trace database, ingress, Service and
source definitions remain. No recent cluster trace-volume statistics were
available from GitHub. **OpenWebUI and Alloy still target Phoenix; OTLP export
errors or retries may occur while the receiver is offline.**

**Resume:** change only the root `phoenix` override to `count: 1`, let
Flux reconcile, and check `kubectl -n apps rollout status deploy/phoenix`
and the retained trace data. Do not remove `./phoenix` with Flux
`prune: true`; that could delete the PVC.

## Access

- **URL:** [http://phoenix.k8s.local](http://phoenix.k8s.local)

## Configuration

| Setting | Value |
|---------|-------|
| **Image** | `arizephoenix/phoenix:latest` |
| **Ports** | 6006 (HTTP UI), 4317 (gRPC OTLP), 9090 (Prometheus) |
| **Storage** | 5Gi PVC (`local-storage`) |
| **Node** | x86 only (NotIn arm/arm64) |
| **Database** | PostgreSQL (`phoenix` DB) |
| **Resources** | Requests: 256Mi/100m, Limits: 1Gi/1000m |
| **Telemetry** | Disabled (`PHOENIX_DISABLE_TELEMETRY=true`) |

## How It Works

1. OpenWebUI sends OTEL traces to Phoenix via gRPC (port 4317)
2. Alloy also forwards OTEL traces to Phoenix
3. Phoenix stores traces in PostgreSQL and provides a web UI for exploration

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `phoenix-deployment.yaml` | Deployment |
| `phoenix-service.yaml` | ClusterIP Service (3 ports) |
| `phoenix-ingress.yaml` | Ingress for `phoenix.k8s.local` |
| `phoenix-pvc.yaml` | 5Gi PVC |

## Troubleshooting

```bash
# Check pod
kubectl get pods -n apps -l app=phoenix

# View logs
kubectl logs -n apps -l app=phoenix --tail=50

# Access UI
# Visit http://phoenix.k8s.local
```
