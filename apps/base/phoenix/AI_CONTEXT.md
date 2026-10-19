# AI Context: Phoenix (LLM Observability)

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

LLM observability platform. Receives OpenTelemetry traces from OpenWebUI and Alloy, stores them in PostgreSQL, and provides a web UI for trace exploration and LLM evaluation.

## Architecture

- **Type:** Deployment
- **Image:** `arizephoenix/phoenix:latest`
- **Namespace:** `apps`
- **Ports:** 6006 (HTTP UI), 4317 (gRPC OTLP), 9090 (Prometheus metrics)
- **Node:** x86 only (`nodeAffinity: NotIn arm, arm64`)
- **Storage:** 5Gi PVC (`phoenix-pvc`, `local-storage`)
- **URL:** `http://phoenix.k8s.local`
- **OTLP Endpoint:** `phoenix.apps.svc.cluster.local:4317`

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `phoenix-deployment.yaml` | Deployment (image, env, ports, volumes) |
| `phoenix-service.yaml` | ClusterIP Service with 3 ports |
| `phoenix-ingress.yaml` | Ingress for web UI |
| `phoenix-pvc.yaml` | 5Gi PVC |

## Current operational state (2026-10-19)

- Root `apps/base/kustomization.yaml` preserves the resource and sets Phoenix to **0 replicas**. Component Deployment remains `replicas: 1`.
- Do not remove the root resource: Flux `prune: true` could delete its PVC; the PostgreSQL trace database also remains unchanged.
- To resume, change the root override to `count: 1`; reconcile and verify trace UI/rollout.
- OpenWebUI and Alloy still export traces to Phoenix; delivery retry/error logs may result while paused. Homepage should retain Phoenix's offline card.
- No live usage statistics were verified; this is a temporary operator pause.

## Key Configuration

- `PHOENIX_SQL_DATABASE_URL` → PostgreSQL (`phoenix` DB via `postgres-credentials` secret)
- `PHOENIX_DISABLE_TELEMETRY=true` — no usage telemetry sent external
- `PHOENIX_GRPC_PORT=4317` — standard OTLP gRPC port
- `PHOENIX_PORT=6006` — web UI port

## Dependencies

- **Depends on:** PostgreSQL (`phoenix` database)
- **Depended on by:** OpenWebUI (sends traces), Alloy (forwards traces)

## Modification Notes

- The image tag is `latest` — be aware this may change on pod restart
- Consider pinning to a specific version or SHA for stability
- Database URL comes from `postgres-credentials` secret
- Port 4317 must match what OpenWebUI and Alloy are configured to send to
