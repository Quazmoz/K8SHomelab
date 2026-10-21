---
title: Complete homelab upgrades need live backend and network checks
author: Quinn
date: 2026-10-21
branch: main
touches:
  - docs/CLUSTER_HEALTH_2026-10-21.md
  - apps/base/ingress-nginx/traefik.yaml
  - apps/base/ingress-nginx/service.yaml
  - apps/base/n8n/n8n-deployment.yaml
  - apps/base/openwebui/openwebui-deployment.yaml
  - apps/base/mcp-servers/contextforge/context-forge.yaml
---

## Decided

Use the 2026-10-21 health receipt for exact deployed versions and recovery artifacts. Kubernetes is 1.35.9 and containerd 2.2.10 on both nodes; Calico reached 3.33.0 through 3.31.7. Calico remains manually operator-managed with its existing v1 datastore, network pool and dataplane. APIServer/default must be enabled for healthy tier reconciliation; the operator runs the aggregation server in calico-system. Traefik 3.7.16 now owns the existing ingress Service and VIP, retaining the nginx class and namespace for compatibility.

All fourteen PostgreSQL databases were restore-tested in isolation before upgrading. OpenWebUI and ContextForge actively use PostgreSQL despite stale SQLite files; n8n actively uses SQLite. Preserve these actual backends and the recorded row counts/activation states. Process Recreate strategies prevent concurrent migration writers without recreating any PVC.

## Tried and ruled out

The kubeadm timeout was etcd certificates containing the old LAN SAN, not missing resources: loopback health passed but advertised-address TLS failed. Regenerate server/peer certificates under the existing CA and persist the correct SANs. Do not disable TLS checks. Worker Sysbox needs explicit CRI enable_unprivileged_ports=false and enable_unprivileged_icmp=false; both runtime binaries had true defaults, so do not claim a default changed.

A credential-echo probe was rejected by automatic review. A fixed dummy token with boolean-only responses safely verifies authorization mapping/clearing, rewrite, CSP and spoofed forwarding rejection. The OpenClaw WebSocket path is /__openclaw__/ws; CSP override must precede rewrite/break. GroupMe ingress is intentionally denied by policy while approved internal clients work. Paperclip requires an allowed Host header; preserve these safeguards when testing.

## Watch out

With slow uplink and layer resets, cache both architectures before rollout and retry partial pulls. Temporary native image pins prevent kubelet GC from discarding staged targets; release them once deployed, preserving the permanent sandbox pin. CRI removal timeout syntax on these nodes is a duration such as 120s. Reclaim only reviewed obsolete caches after checking running image identities, never application files or recovery archives.

containerd's systemd override selects versioned upstream binaries under /usr/local/lib; apt upgrades alone do not replace that selection. Backups currently live on the Pi SSD, not the absent external disk. Old app schema rollback requires compatible database/file recovery, not just an image change. Flux can restore old rolling defaults until it has fetched the new revision, so clear legacy strategy defaults immediately before reconciling that revision. Final stability checks covered every running Pod, both nodes, auth/TLS/WebSockets, fresh DNS/policy checks, recent log timestamps, all monitoring targets and alerts.
