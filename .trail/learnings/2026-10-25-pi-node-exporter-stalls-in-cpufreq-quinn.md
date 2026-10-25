---
title: Pi node exporter stalls in cpufreq; disable the collector in GitOps
author: Quinn
date: 2026-10-25
branch: main
touches:
  - apps/base/prometheus/helm-release.yaml
---

## Decided
On 2026-10-25 the Pi node-exporter returned HTTP 503 (40 concurrent requests). Its native goroutine profile showed all 40 scrapes waiting in cpuFreqCollector.Update / procfs.SystemCpufreq, including waits over five days. Configure the existing prometheus-node-exporter Helm subchart with --no-collector.cpufreq; retain CPU usage, memory, disk, thermal and network collection. Add NodeExporterDown for the actual namespace/service labels so failed node scrapes alert after five minutes.

## Tried and ruled out
Ready Pods and an empty alert list did not prove all targets healthy: only 24/25 Prometheus targets were up. Increasing the concurrency limit or restarting without changing the collector would leave the same hang. No NFS/CIFS mounts or blocked storage threads explained it; the old USB-device kernel errors were historical.

## Watch out
The chart is pinned and application image overrides carry patch upgrades. Worker root storage is constrained, so pre-pull one upgrade at a time and check capacity. Trail check may report the pre-existing user change in .claude/settings.json; keep that unrelated file out of upgrade commits.
