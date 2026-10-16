# Apply OS (inert)

Private Apply OS runtime ([source](https://github.com/Quazmoz/apply-os), `docs/RUNTIME.md`). **Not deployed.** This directory is deliberately absent from `apps/base/kustomization.yaml`, so merging it changes nothing in the cluster.

## Boundary

- Own `apply-os` namespace with Pod Security `restricted`. Non-root UID 10001, read-only root filesystem, no capabilities, no service-account token.
- NetworkPolicy: default-deny ingress and egress. Port 8080 is reachable only from `ingress-nginx`. The web pod has no egress.
- `apply-os-pipeline` CronJob (hourly, `backoffLimit: 0`, 1.5 Gi limit) discovers jobs, reads application forms with headless Chromium and submits **only jobs the applicant approved and queued** in the web UI ([pipeline](https://github.com/Quazmoz/apply-os/blob/main/docs/PIPELINE.md)). Its pods alone get egress: cluster DNS plus public 80/443, with private, link-local and CGNAT ranges excluded.
- Pinned to `quinn-hpprobook430g6` (24% CPU and 52% memory used at baseline). It shares nothing with Paperclip on `orangepi6plus`: no service, PVC, database or secret. Requests 25m/64Mi, limits 500m/256Mi.
- Dedicated 2 Gi local PV; single SQLite writer with `Recreate`. Nightly online backup CronJob with 7-day rotation **on the same volume**.

## Validation (2026-10-16)

- `kubectl kustomize` builds 9 objects; client dry-run passes.
- Server dry-run: Namespace and PV accepted. The namespaced objects were accepted when dry-run against `apps`, because the `apply-os` namespace doesn't exist yet.
- Flux `apps` had applied `main@818c057` (Ready). Paperclip was at generation 16 with 1 restart, and was neither touched nor affected.

## Activation gates (all required)

1. Publish `ghcr.io/quazmoz/apply-os:0.4.0` with the apply-os **Apply OS Image** workflow (manual dispatch, tag `0.4.0`); it stays a **private** package. Add a SOPS-encrypted pull secret and reference it from the Deployment and both CronJobs.
2. On the HP node: `/mnt/k8s-data/apply-os` on an **encrypted** filesystem, owned by `10001:10001`, mode 0700.
3. Create `apply-os-tls` the same way as `paperclip-tls`, and add `apply-os.k8s.local` to local DNS.
4. Add `- ./apply-os` to `apps/base/kustomization.yaml`, run `kubectl kustomize apps/base` and a server dry-run, and confirm Paperclip's rendered manifest is unchanged.
5. After rollout, create the first account with `kubectl -n apply-os exec -it deploy/apply-os -- python -m apply_os.web create-account <email>`.
6. Real applicant data stays blocked until the `docs/RUNTIME.md` "Before real applicant data" list, including an off-node encrypted backup and a tested restore, is done.

Rollback: remove the line from step 4. Flux prunes everything except the Retain PV and its data.
