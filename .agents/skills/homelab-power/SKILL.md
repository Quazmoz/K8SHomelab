---
name: homelab-power
description: >
  Safely sleep, wake, or inspect optional Kubernetes workloads in this
  K8SHomelab to free constrained CPU/RAM without deleting persistent state.
  Uses GitOps/Kustomize replica overrides so Flux remains authoritative.
  Use when the user asks to turn off, stop, sleep, pause, disable, wake,
  start, resume, enable, or check the power state/resource impact of homelab
  apps or agents such as OpenClaw or Hermes.
argument-hint: "sleep|wake|status <workload|group>"
license: MIT
---

# Homelab Power

Manage optional homelab workloads as reversible GitOps power switches.

## Repository facts

- Flux owns application desired state through `clusters/my-homelab/apps.yaml`.
- Flux renders `./apps/base`, has `prune: true`, and normally reconciles every 10 minutes.
- Root Kustomize file: `apps/base/kustomization.yaml`.
- Do not remove a workload from `resources:` just to stop it: with Flux pruning enabled that can delete managed Kubernetes objects.
- OpenClaw Deployment: `apps/base/openclaw/openclaw-deployment.yaml`, normal replicas = 1.
- Hermes Deployment: `apps/base/hermes-agent/hermes-agent-deployment.yaml`, normal replicas = 1.
- Both use persistent PVC-backed state and run in namespace `apps`.

Follow the repository's root `AGENTS.md` instructions first. Use the repository-local Graft launcher when discovery is needed.

## Commands

Interpret natural language as one of:

- `sleep <target>` — stop compute pods while preserving the app's managed resources.
- `wake <target>` — restore the workload's normal replica count.
- `status <target>` — report Git desired state and, when cluster access exists, live state.
- `sleep ai-agents` — sleep OpenClaw and Hermes Agent.
- `wake ai-agents` — wake OpenClaw and Hermes Agent.

Aliases:

- `openclaw`, `open-claw` -> Deployment `openclaw`
- `hermes`, `hermes-agent` -> Deployment `hermes-agent`
- `ai-agents`, `agents` -> `openclaw` + `hermes-agent`

## GitOps mechanism

Prefer a Kustomize replica override in `apps/base/kustomization.yaml`.

Sleeping OpenClaw and Hermes should result in an override equivalent to:

```yaml
replicas:
  - name: openclaw
    count: 0
  - name: hermes-agent
    count: 0
```

Rules:

1. **Sleep**: add or update the target's root Kustomize `replicas` entry to `count: 0`.
2. **Wake**: remove the target's replica override so the workload's own manifest controls its normal replica count again. Do not hard-code `1` unless the base manifest itself must be repaired.
3. Preserve all unrelated existing `replicas` entries and resource ordering.
4. If removing the last override, remove the now-empty `replicas:` section rather than leaving malformed YAML.
5. Never edit PVCs, Secrets, Services, Ingresses, ConfigMaps, or persistent data as part of sleep/wake.
6. Never comment out or delete a resource from `apps/base/kustomization.yaml` solely to sleep it.
7. Never use `kubectl delete` for a sleep operation.

This keeps the workload managed by Flux while rendering its Deployment at zero replicas.

## Discovery for other workloads

For a target not listed above:

1. Use Graft or repository search to locate its Kustomize resource and controller manifest.
2. Confirm it is an optional application workload, not cluster-critical infrastructure.
3. Confirm the controller is safely scalable to zero and that persistent state is externalized where needed.
4. Confirm its resource name is unique enough for the root Kustomize `replicas` transformer.
5. Only then add/remove the root replica override.

Protected infrastructure must not be slept through this skill unless the user explicitly names it and the consequences are analyzed first. Treat at least these as protected:

- `flux-system`
- MetalLB
- ingress-nginx
- local-storage / storage provisioners
- Kubernetes control-plane components
- CoreDNS
- the Flux source/reconciliation objects themselves

If the request would strand cluster access, storage, networking, or GitOps reconciliation, do not apply it as a routine power toggle.

## Validation

Before committing a mutation:

1. Inspect the diff and ensure only the intended power-state configuration changed.
2. Render the Kustomization:
   - preferred: `kubectl kustomize apps/base >/tmp/homelab-power-rendered.yaml`
   - or `kustomize build apps/base >/tmp/homelab-power-rendered.yaml`
3. Verify each sleeping Deployment renders `spec.replicas: 0`.
4. Verify each woken Deployment renders its base manifest replica count.
5. Ensure the render exits successfully.

For `status`, do not mutate Git.

## Commit and reconcile

For a successful mutation:

1. Keep unrelated working-tree changes untouched.
2. Commit only the intended power-state file change.
3. Use concise commit messages:
   - `chore(power): sleep openclaw`
   - `chore(power): wake hermes-agent`
   - `chore(power): sleep ai-agents`
4. Push to the branch Flux actually tracks; this homelab currently uses the repository's main GitOps branch.
5. If the Flux CLI and cluster are reachable, run:
   `flux reconcile kustomization apps -n flux-system --with-source`
6. If Flux/cluster access is unavailable, do not undo the Git change. State that normal reconciliation may take up to the configured 10-minute interval.

Do not force-push or discard unrelated local changes.

## Live verification

When cluster access exists, verify after reconciliation:

```bash
kubectl get deploy -n apps openclaw hermes-agent
```

For sleep, expect desired/current replicas to settle at zero.
For wake, expect the normal replicas to become Ready.

If a wake does not become Ready, inspect rollout status/events rather than repeatedly restarting it.

## Temporary override

Only when the user explicitly asks for a **temporary, non-Git** override may you use:

```bash
kubectl scale deployment <name> -n apps --replicas=0
```

Warn that Flux can revert this because Git remains authoritative. Do not call this a durable sleep.

## Resource reporting

When possible, report both:

- Kubernetes requests released/restored by the target pods.
- Current live usage from `kubectl top pod -n apps` if metrics are available.

Do not equate resource limits with memory actually freed.

Current manifests for OpenClaw and Hermes each request approximately 1 GiB memory and 200m CPU for the main container; always re-read the current manifests before presenting exact resource totals.

## Final response

Keep it operational and short. Report:

- target(s)
- action taken
- Git desired state
- commit SHA
- Flux reconciliation result, or that it will reconcile on schedule
- live replica/health state when available
- requested resources released/restored when verified
