---
title: "Homelab upgrade audit: verify live versions and recovery before patching"
author: Quinn
date: 2026-10-21
branch: main
---

## Decided
The 2026-10-21 audit used live Kubernetes state plus official upstream release metadata. This was an assessment only: no workload, image, node, or GitOps configuration was changed. Before upgrades, resolve the firing PostgresBackupStale alert and verify recovery. The last successful shared PostgreSQL backup was 2026-10-20T02:02:11Z; the October 21 job failed. Recheck these transient facts before acting.

## Tried and ruled out
Repository image tags alone do not establish running versions, especially floating tags such as postgres:18 and digest-only images. The graph primarily indexes JavaScript/Python, so YAML inventory required scoped repository searches after Trail discovery. The pinned Graft launcher currently falls back to the parent workspace graph when there is no local graft directory; do not treat matches in sibling projects as homelab evidence. PostgreSQL is a StatefulSet, with pod postgres-0, not a Deployment.

## Watch out
The live audit found Calico 3.29.1 / operator 1.36.2 alongside Kubernetes 1.35.0, and containerd 2.2.1 on HP / 2.2.2 on Pi. Official containerd 2.2.10 release and GHSA-vwhp-8p66-mq4f identify a patched 2.2 baseline. Plan Calico as a staged operator/CRD upgrade: the 3.33 procedure covers only the previous two minor versions. ingress-nginx 1.15.1 matches its final release, but the project retired in March 2026: version equality does not mean continued security maintenance. The HP root filesystem had about 29 GiB available and a backing-disk warning; neither node had resource pressure. Hermes, Qdrant, and Phoenix intentionally have zero replicas. OpenClaw 2026.10.5 and Paperclip 2026.1012.0 matched latest stable at audit time. All versions, alerts, resource readings, and upstream release targets are time-sensitive and must be checked again before implementation.
