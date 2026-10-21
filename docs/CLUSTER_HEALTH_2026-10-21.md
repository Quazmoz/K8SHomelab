# Homelab upgrade receipt — 2026-10-21

All audited software upgrades were deployed through the existing management paths. Application manifests remain authoritative in Flux; kubeadm, containerd and the already operator-managed Calico installation were maintained on the nodes. Final observation results are recorded below. Times are UTC.

## Verified running versions

| Component | Version |
|---|---|
| Kubernetes, both nodes | 1.35.9 |
| containerd, both nodes | 2.2.10 |
| Calico / Tigera operator | 3.33.0 / 1.44.0 |
| Ingress | Traefik 3.7.16; retired ingress-nginx removed |
| Flux distribution | 2.9.6 |
| PostgreSQL | 18.6 |
| Grafana | 13.2.4 |
| Homepage | 2.6.0 |
| Open WebUI | 0.12.3 |
| n8n | 2.44.5 stable |
| ContextForge | 1.1.0 |
| changedetection and storage exporter base | 0.60.9, multiarch index `04eaae7915bad711160cb15abe160f6d3fabe98bbbd658509d4b7a654000fb2d` |
| Prometheus / Alloy / Loki | 3.15.0 / 1.21.0 / 3.7.9 |

Application APIs, binaries, packaged version constants, current image identities and node runtime status were checked. Helm chart versions remain pinned where an explicit application image override provides the update. OpenClaw 2026.10.5, Paperclip 2026.1012.0, Redis 8.10.2, MetalLB 0.16.1 and metrics-server 0.9.0 were already current in the audit. Hermes, Qdrant and Phoenix remain paused with their persistent state intact.

GitOps commits: `58bf119` (backup repair), `7ed3b35` (Grafana/Homepage and CSP compatibility), `22a624e` (PostgreSQL), `d177b15` (Flux), `f8161de` (apps and telemetry), `aa09b1b` (exporters), `935151b` (ingress).

## Recovery points and data checks

The missing external `/dev/sdb1` backup device was the cause of the stale-backup alert. `/mnt/backup/postgres` now exists with mode 0700 on the Orange Pi root SSD, separate from the worker hosting PostgreSQL. The exact absent-device fstab entry was disabled, and the original saved under `/var/backups/homelab-upgrade-20261021/`. No disk was formatted and the original backup PV/PVC was retained. These recovery points are off-worker, within the same homelab.

The backup script now publishes private gzip archives atomically, keeps diagnostic stderr outside the SQL, bounds database waits and retains previous successful archives on failure. The normal seven-day successful-backup retention remains.

- Before the database update, all 14 databases from the 391 MiB SQL archive were restored successfully into a network-isolated PostgreSQL 18.6 test instance, using empty disposable storage. Production databases were never overwritten by a restore test.
- Verified archive: `/mnt/backup/postgres/postgres_backup_20261021_132201.sql.gz`, SHA-256 `4473a8c41a4a778496582d89ea4b898e13082813d04fbd4ff5e6d1da24495165`. Restore receipt: `restore-verified-20261021.txt` in the same private directory.
- The post-upgrade backup completed at 15:18:21: `/mnt/backup/postgres/postgres_backup_20261021_151545.sql.gz`, SHA-256 `adf658591d571984f07e0fc234c1fa1cafe304272ab0f1b5a31f89b5c9ac1434`. Archive size is 391 MiB and permissions are 0600.
- Worker recovery directory `/var/backups/homelab-upgrade-20261021/` holds a 1.8 GiB integrity-checked application-file archive, consistent SQLite backups, and node configuration backups. Live file-copy warnings about changing directory timestamps were covered by separate consistent SQLite backups; this archive is not a filesystem-level atomic snapshot.
- PostgreSQL system identifier and all database OIDs matched before/after. Open WebUI retained 2 users and 435 chats in its active PostgreSQL database; ContextForge retained 52 tools, 2 servers and 2 gateways. n8n uses SQLite and retained 29 workflows, 10 credentials and 1 user. Every workflow ID and activation flag matched its protected pre-upgrade SQLite snapshot; one workflow remains active.
- PostgreSQL 18.6 follow-up checks across all databases found no installed btree_gist/ltree/pgcrypto extensions, replication slots, real collation-version mismatches, or invalid GIN table row estimates. Template0's unset stored collation version was excluded from the mismatch count.

Application migration rollouts use Recreate to avoid concurrent writers. A database-schema rollback requires restoring the corresponding verified database/file recovery point with compatible application binaries; reverting an image alone is insufficient. Old unused image caches were reclaimed, so recovery may require another download.

## Node and network maintenance

Both nodes received the same-minor kubeadm/kubelet/kubectl patch, with package holds restored. Each was briefly cordoned during its node operation and returned schedulable. Existing workload state was preserved. The Orange Pi also has a protected 28 MiB etcd snapshot and node configuration archive.

Kubeadm initially could not contact etcd through its advertised LAN address: the server and peer certificate SANs still named the old `192.168.1.12` address. Loopback authenticated health worked, while `192.168.8.236` failed certificate validation. Native kubeadm regenerated only the etcd server/peer certificates under the existing CA, with protected originals retained. Authenticated LAN health then passed; the explicit server/peer SAN configuration was uploaded to kubeadm-config and the upgrade completed. Etcd remained 3.6.6. Current control-plane certificates expire in October 2027; existing CAs remain unchanged.

containerd 2.2.10 binaries are checksum-verified under `/usr/local/lib/containerd-2.2.10/bin`, selected by `/etc/systemd/system/containerd.service.d/50-homelab-version.conf`. Original distribution binaries and runtime configuration are retained. Future node maintenance must account for this explicit override; an apt package update alone does not replace the selected runtime. Removing the drop-in and reloading/restarting systemd would select the original runtime for emergency recovery, subject to its security limitations.

On the worker, `/etc/containerd/config.toml` explicitly disables CRI `enable_unprivileged_ports` and `enable_unprivileged_icmp` for Sysbox compatibility. Both old and new binaries defaulted these to true; this was not a changed-default diagnosis. Native effective configuration validation passed. A fresh Sysbox Job verified user-namespace UID mapping after the change; the existing sandbox runner remains healthy.

Calico followed the supported path 3.29.1 → 3.31.7 → 3.33.0. Official versioned CRDs and operator manifests were applied with server-side ownership migration. Images for both architectures were cached before each network rollout, retrying incomplete downloads. The original v1 datastore mode, `10.244.0.0/16` pool, block size 26, VXLAN CrossSubnet encapsulation, NAT, iptables dataplane, LAN autodetection and rolling availability bounds were preserved.

The newer operator needed its aggregation API server for tier reconciliation. The documented operator-managed resource below was enabled; the operator runs two healthy API-server replicas in `calico-system`. All Calico statuses, including IP pools and tiers, are healthy.

```yaml
apiVersion: operator.tigera.io/v1
kind: APIServer
metadata:
  name: default
spec: {}
```

Future Calico maintenance should use the existing operator method and pinned [official upgrade manifests](https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade), preserving the current datastore/API mode and Installation specification. Optional Goldmane/Whisker components were not enabled.

## Ingress and verification

Traefik was tested in parallel before cutover. The production Service kept its UID, ClusterIP, `192.168.8.40` LoadBalancer address and Cluster traffic policy. Its selector now targets Traefik. The legacy namespace, Service name and nginx IngressClass intentionally remain for application compatibility. Retired ingress-nginx workloads, admission webhook and controller RBAC were pruned by Flux. Traefik's application resource access is scoped to `apps`, with cluster-wide permission only for IngressClass discovery.

Production checks passed for Homepage, Grafana, Open WebUI, n8n, Paperclip, ContextForge, MCPO documentation, OpenClaw, changedetection, pgAdmin and Prometheus. Redirects and authentication responses were checked at their expected paths. Open WebUI and OpenClaw completed real WebSocket upgrade handshakes. WebUI, n8n and Paperclip JavaScript assets returned 200. HTML cache invalidation, single OpenClaw CSP header with both pinned script hashes, dummy-token mapping, WebSocket authorization clearing/path rewriting and rejection of spoofed forwarded client IPs passed. Named Paperclip/OpenClaw TLS certificates matched their existing Secrets; n8n retains its existing default self-signed-certificate policy. Paperclip anonymous API access remains denied.

GroupMe's direct ingress remains intentionally blocked by its existing NetworkPolicy. Its allowed Open WebUI caller returned health 200, while fresh unauthorised Pods on both nodes could not connect. Policy was not weakened for the ingress migration. MCPO retains its existing unauthenticated policy; no new SSO requirement was introduced.

Fresh Pods on both nodes passed DNS resolution and cross-node service checks after each Calico step. Prometheus reported 25/25 targets healthy. Loki returned readiness 200 and recent application logs less than one second old. Alloy's sent counter increased while its startup-observed ingester-drop counter stayed constant at 46,860 through observation; current log delivery works.

Repository checks passed: `test_postgres_backup.py`, `test_paused_ai_services.py`, `test_homepage_inventory.py`, `test-growth-os-storage-exporter.py`, full Kustomize rendering and native Alloy configuration validation. Temporary restore/network/Sysbox/config-check Jobs, the boolean-only ingress probe, preview Service and isolation policy were removed. Protected backup artifacts remain on the nodes.

## Final stability observation

Observed from **15:18:03 to 15:29:16 UTC** (11 minutes 13 seconds) after the production ingress cutover. All **56 running non-Job Pods were Ready**, with **zero increasing container restart counters**. Both nodes were Ready and schedulable, with NetworkUnavailable, MemoryPressure, DiskPressure and PIDPressure false. All 18 PVCs were Bound. All Flux sources, two Kustomizations and four Helm releases were Ready; native `flux check` passed. All 25 Prometheus targets were up and the final alert list was empty, including the repaired backup and backing-disk warnings.

The worker filesystem finished at **67% used, 37 GiB available** by `df`. The storage alert uses available blocks including reserved-space accounting, rather than df's percentage; its measured value was 68.51%, below the unchanged 70% threshold. Temporary image staging pins were removed after rollout. Historical restart counts and the startup-observed Alloy ingester-drop counter were retained as evidence; no new restart loops or growing log-drop counter occurred during the observation.

Capacity work removed only reviewed obsolete image versions after comparing their identities against every running container. Persistent application data, including the disabled Jupyter volume, and recovery archives were retained. Worker journald is bounded to 1 GiB/14 days. The 70% storage warning threshold remains unchanged; capacity still merits routine monitoring on the 117 GiB worker filesystem.
