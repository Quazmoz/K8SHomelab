# AI Context: Grafana Alloy (OpenTelemetry Collector)

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Unified telemetry collector. Scrapes Kubernetes pod logs, receives OTLP signals (metrics, logs, traces), and routes to appropriate backends.

## Architecture

- **Type:** Flux HelmRelease
- **Chart:** `alloy` v1.5.2 from `grafana`
- **Namespace:** `apps`
- **Extra Ports:** 4317 (OTLP gRPC), 4318 (OTLP HTTP)
- **No PVC, no Ingress** (collector only)

## Files

| File | Purpose |
|------|---------|
| `kustomization.yaml` | Resource list |
| `helm-release.yaml` | HelmRelease with inline Alloy pipeline config |

## Telemetry Pipeline (in helm-release.yaml values)

1. **K8s Pod Logs** → `discovery.kubernetes` → `loki.source.kubernetes` → Loki push API
2. **OTLP Metrics** → `otelcol.receiver.otlp` → Prometheus remote_write
3. **OTLP Logs** → `otelcol.receiver.otlp` → Loki push API
4. **OTLP Traces** → `otelcol.receiver.otlp` → Phoenix OTLP endpoint

## Dependencies

- **Depends on:** Loki (log target), Prometheus (metrics target via remote_write), Phoenix (trace target at `phoenix.apps.svc.cluster.local:4317`), Sources (HelmRepository)
- **Depended on by:** Nothing directly (receives OTLP from instrumented apps)

## Modification Notes

- The Alloy config language is embedded in `helm-release.yaml` under `alloy.configMap.content`
- Adding a new pipeline: edit the config content in HelmRelease values
- Port 4317/4318 are exposed as Service ports for apps to send OTLP data
- If Loki/Prometheus/Phoenix endpoints change, update the send targets in config
