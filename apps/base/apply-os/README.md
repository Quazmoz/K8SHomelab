# Apply OS (inert)

Private Apply OS runtime ([source](https://github.com/Quazmoz/apply-os), `docs/RUNTIME.md`). **Not deployed.** This directory is deliberately absent from `apps/base/kustomization.yaml`, so merging it changes nothing in the cluster.

## Boundary

- Own `apply-os` namespace with Pod Security `restricted`. Non-root UID 10001, read-only root filesystem, no capabilities, no service-account token.
- NetworkPolicy: default-deny ingress and egress. Port 8080 is reachable only from `ingress-nginx`. The web pod has no egress.
- `apply-os-pipeline` CronJob (hourly, `backoffLimit: 0`, 1.5 Gi limit) discovers jobs, reads application forms with headless Chromium and submits **only jobs the applicant approved and queued** in the web UI ([pipeline](https://github.com/Quazmoz/apply-os/blob/main/docs/PIPELINE.md)). Its pods alone get egress: cluster DNS plus public 80/443, with private, link-local and CGNAT ranges excluded.
- The Paperclip pod (`apps`, `app: paperclip`) may call the web pod's bearer-token API on 8080 (apply-os ADR-010).
- Pinned to `quinn-hpprobook430g6` (24% CPU and 52% memory used at baseline). It shares nothing with Paperclip on `orangepi6plus`: no service, PVC, database or secret. Requests 25m/64Mi, limits 500m/256Mi.
- Dedicated 2 Gi local PV; single SQLite writer with `Recreate`. Nightly online backup CronJob with 7-day rotation **on the same volume**.

## Validation (2026-10-16)

- `kubectl kustomize` builds 9 objects; client dry-run passes.
- Server dry-run: Namespace and PV accepted. The namespaced objects were accepted when dry-run against `apps`, because the `apply-os` namespace doesn't exist yet.
- Flux `apps` had applied `main@818c057` (Ready). Paperclip was at generation 16 with 1 restart, and was neither touched nor affected.

## Activation (2026-10-16)

No registry, pull secret or GitHub Actions: the pods are pinned to `quinn-hpprobook430g6`, so the image only has to exist in that node's containerd.

1. Image. Build on the Mac and import on the HP node (re-run for each new tag):
   `docker build --platform linux/amd64 -t ghcr.io/quazmoz/apply-os:<tag> <apply-os checkout>`
   `docker save ghcr.io/quazmoz/apply-os:<tag> | ssh homelab-worker sudo ctr -n k8s.io images import -`
2. Data folder on the HP node: `sudo install -d -o 10001 -g 10001 -m 0700 /mnt/k8s-data/apply-os`.
   ponytail: plain ext4 (the node's disk is not encrypted), so anyone holding the laptop can read it. Upgrade path: fscrypt on this directory, plus an off-node encrypted backup.
3. `- ./apply-os` in `apps/base/kustomization.yaml`; Flux applies it. Paperclip's rendered manifest is unchanged.
4. TLS: a self-signed `apply-os-tls`, the same as `paperclip-tls`:
   `openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj /CN=apply-os.k8s.local -addext subjectAltName=DNS:apply-os.k8s.local -keyout k.pem -out c.pem && kubectl -n apply-os create secret tls apply-os-tls --cert c.pem --key k.pem`
5. DNS: add `apply-os.k8s.local` to the `192.168.8.40` line in `/etc/hosts`.
6. First account: `kubectl -n apply-os exec -it deploy/apply-os -- python -m apply_os.web create-account <email>`.
   Agent token: `kubectl -n apply-os exec deploy/apply-os -- python -m apply_os.web create-api-token <email>`, stored as the Paperclip APP secret `APPLY_OS_API_TOKEN`.

Rollback: remove the line from step 3. Flux prunes everything except the Retain PV and its data.
