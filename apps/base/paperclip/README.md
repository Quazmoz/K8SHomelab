# Paperclip

Paperclip is the homelab's AI-agent orchestration/control-plane service.

Upstream: https://github.com/paperclipai/paperclip

## Current Homelab Deployment

This document describes the repository state, not a generic production recommendation.

Current manifest: `paperclip.yaml`.

| Area | Current state |
|---|---|
| Image | `ghcr.io/paperclipai/paperclip:2026.1005.0`, digest pinned |
| Deployment | Kubernetes `Deployment`, 1 replica, `Recreate` strategy |
| Scheduling | Pinned to `orangepi6plus` |
| Exposure | `authenticated` + `private` |
| Public URL | `https://paperclip.k8s.local` |
| Agent/API URL | in-cluster service URL |
| Storage | 20 GiB local RWO PVC |
| Database | Paperclip embedded Postgres on the same PVC |
| Observability | OpenTelemetry exported to Phoenix |
| Secrets | SOPS-encrypted Kubernetes Secret referenced through `envFrom` |
| Agent/model runtime | External/provider adapters; Paperclip coordinates rather than being the model runtime |

The HTTPS ingress exists because Paperclip Cloud connector enrollment for services such as GitHub/Drive requires a secure non-loopback origin.

## Important durability limitation

The current deployment is intentionally homelab-sized.

Paperclip's embedded Postgres, workspaces, uploads, and secret-key material share the local PVC. The manifest notes that the embedded Postgres backup path is on the same disk and is not covered by the repository's general database backup CronJobs.

That means:

- the current deployment is useful for experimentation and reference architecture work;
- it is **not** the durability pattern to copy blindly into a client-owned production system;
- if Paperclip state becomes business-critical, move its database to a separately managed/durable Postgres service and define tested backup/restore behavior;
- workspace/artifact storage, identity, secrets, monitoring, and recovery ownership also need explicit production decisions.

Do not claim an RTO/RPO until restore procedures have actually been tested.

## Model configuration receipt — 2026-10-12

**Fact:** All 7 `claude_local` agents now use [`claude-opus-5-5` (Opus 5.5)](https://platform.claude.com/docs/en/models/opus-5-5/migration-guide), retaining high effort. All 11 `codex_local` agents now use [`gpt-6.1-sol` (GPT-6.1 Sol)](https://developers.openai.com/api/docs/models/gpt-6.1-sol), retaining medium reasoning. The other 16 agents keep their previous models and states. Installed runtimes are Claude Code `2.1.291` and Codex CLI `0.160.1`; the Claude adapter advertises Opus 5.5, and this Paperclip release accepts GPT-6.1 Sol as a custom Codex identifier.

**Fact:** The operator's `models` phase applied all 18 changes in one database transaction using Paperclip's schema, recording configuration revisions and native audit entries. A comparison of all 34 agent records confirmed that only the targeted model fields changed; authentication bindings, environment entries, reasoning settings, permissions, budgets, reporting lines, and runtime schedules were preserved. The general native updater normalized `env`, so its guarded attempt was rolled back before the model-only patch. Protected rollback configuration and the applied receipt live under `/paperclip/model-update-2026-10-12/`. The original reorganization revision and original subscription qualification history remain intact.

**Fact:** The updated `verify` phase passes company/reporting/assignment/membership/history, instruction readability, and concurrency checks, with Growth OS routines still paused. A repeated `models` run no-ops. Local JavaScript syntax and diff checks pass. Automatic approval review rejected live subscription/inference probes because the configuration update did not authorize provider calls or possible cost; new-model inference availability remains unqualified. Any later authorized `qualify` run writes a separate `/paperclip/model-update-2026-10-12/subscription-qualification.json` receipt.

From the repository root, safely recheck/apply this model revision:

```bash
kubectl exec -i -n apps deployment/paperclip -c paperclip -- \
  node --import /app/server/node_modules/tsx/dist/loader.mjs --input-type=module - models \
  < scripts/paperclip/reorganize.mjs
```

## Upgrade receipt — 2026-10-12

**Fact:** The reviewed target is stable [v2026.1005.0](https://github.com/paperclipai/paperclip/releases/tag/v2026.1005.0), replacing `2026.1001.0`. Both containers use multi-architecture index `sha256:de762433b50d56ed9180fef96a13fa236b37856c5c7a7718e8f19afe3d1e8670`; its Linux ARM64 manifest is `sha256:0d4b41c1b40d6804c8812dc0af98286af5de90b8ada647681dd15512ad4a5937` (1,786,521,434 compressed bytes). The existing five OpenTelemetry peer versions match this release; their verified PVC cache was staged before restart.

**Fact:** At preflight there were no queued/running agent executions. Paperclip's native backup/restore functions restored the pre-upgrade SQL backup into an isolated temporary database, reproducing 3 companies, 34 agents, 18 issues, 4 projects, 2 routines, and the agent configuration fingerprint. The temporary database was removed after verification. Database and persistent-file recovery archives, including local authentication/instruction files but excluding the live database directory and dependency caches, are protected on the existing PVC under `/paperclip/upgrade-2026-10-12-2026.1005.0/`; `backup-manifest.json` records paths, sizes, SHA-256 checksums, and restore verification. Automatic approval review rejected copying these sensitive archives to the Mac; no off-node recovery copy was created.

**Fact:** The Paperclip and complete `apps/base` Kustomize builds and Kubernetes server-side dry run pass. After the exact target digest was cached on `orangepi6plus`, Flux applied upgrade commit `fcc8f401c28fa596761e2465f65f8a33429dd157` from `main`. Deployment `paperclip` successfully rolled out; pod `paperclip-7d4475fd84-czsxv` was Ready with zero restarts. The running build is `v2026.1005.0-0-g467125faf`, matching release commit `467125fafb47a8520856504fecc48d6e32055db1`; `inspectMigrations` reports `upToDate` with zero pending migrations, the runtime user is UID 1000, and OpenTelemetry reports service version `2026.1005.0`.

**Fact:** HTTPS checks through `192.168.8.40` returned 200 for `/api/health`, `/`, and the referenced JavaScript bundle, and 403 for unauthenticated `/api/companies`. Health still reports `authenticated` / `private`; the existing self-signed certificate was accepted explicitly for these checks. Post-upgrade counts and the full agent configuration fingerprint match the pre-upgrade receipt. The existing operator's `verify` phase passes company/reporting/assignment/membership/history invariants and paused Growth OS routines. No model inference or external agent task was triggered to verify the upgrade. Automatic approval review rejected exporting potentially sensitive application logs; verification used sanitized health, migration, and configuration checks instead.

**Fact:** Upstream removes UI snippet injection and keyboard-shortcut preference settings, and agent mentions no longer launch runs; use explicit assignment/review requests. Neither removed UI snippet environment setting is configured here. Migration `0289_drop_user_keyboard_shortcuts.sql` drops the old preference column, so an image-only downgrade is not a tested recovery path: coordinate a GitOps rollback with restoration of the pre-upgrade database/files if recovery is needed. The backup remains on the same disk; this restore check does not establish off-node disaster recovery or an RTO/RPO.

**Inference:** Pre-pulling the single large image and staging the unchanged telemetry cache before GitOps reconciliation is a reusable upgrade procedure for this slow-uplink, `Recreate` deployment. Future upgrades should repeat the backup/restore check and review migration compatibility before triggering Flux.

## Organization configuration receipt — 2026-10-06

**Fact:** The live instance now has three companies: Quinn Favo AI Consulting (12 configured active agents), Quazmoz Android Development (7), and Quazmoz Growth OS (5). Nine redundant administration/test roles are paused, and the previously terminated test agent remains terminated. Existing mobile/research agents were reused; only the Android and Growth OS directors were added.

**Inference:** Claude Opus 5 handles leadership, architecture, security review, and experiment judgment. Codex `gpt-6-sol` with medium reasoning handles implementation and substantive synthesis. Ollama Cloud `nemotron-3-super` and Cloudflare `@cf/zai-org/glm-4.7-flash`, through OpenCode, handle bounded research and support roles. Runtime/model assignments are deployment policy; the Growth OS portable package remains provider-independent.

**Fact:** Backend services and transactional database changes configured reporting, memberships, transferred task ownership, company objectives, repository-linked projects, isolated instruction/workspace paths, and paused Growth OS routines. Timers are disabled and per-agent concurrency is one. Agents cannot hire more agents. Historical execution identity, audit records, and costs keep their original company attribution; provider sessions do not resume prior company context. New-company repository links do not establish full checkouts or qualified GitHub connectors.

**Fact:** Before the change, Paperclip's own backup engine produced `/paperclip/reorganization-2026-10-06/before-three-companies-20261006-073645.sql.gz` and archived agent instructions. Restoring this SQL backup into an isolated temporary database reproduced the original one company, 32 agents, and 15 issues. Live relationship, runtime-user file-readability, and historical attribution checks pass. An unchanged migration revision no-ops on reapplication. The backup remains on the existing PVC; this check does not establish off-node recovery.

**Fact:** Ollama Cloud and Cloudflare authenticate and list the configured models. The initial Claude HTTP 401 and Codex sign-in blockers were resolved through an isolated Claude browser login and three separate Codex device sign-ins. All 18 subscription agents passed strict connection selection, and all six provider/company checks passed ACP readiness plus native CLI hello inference. The checks do not exercise a complete ACP task/approval workflow. No metered Anthropic/OpenAI fallback was enabled, and marketing schedules remain paused. Authentication tasks `QUI-16`, `QUA-13`, and `QUAA-16` are resolved.

The instance-specific operator implementation is [`scripts/paperclip/reorganize.mjs`](../../../scripts/paperclip/reorganize.mjs). It requires the existing backup receipt and runs inside the pinned container with the installed `tsx` loader. It does not mint a board/admin API key. Database authentication comes from runtime configuration or the pinned server's embedded bootstrap defaults; passwords are not stored in the operator source.

From the repository root, check the current configuration:

```bash
kubectl exec -i -n apps deployment/paperclip -- \
  node --import /app/server/node_modules/tsx/dist/loader.mjs --input-type=module - verify \
  < scripts/paperclip/reorganize.mjs
```

Provider setup must run as the runtime user. Use `gosu node node` in place of `node` for `prepare`, `claude-login`, `connections`, and `qualify`; these phases reject root execution. `claude-login` prepares/promotes the isolated consulting Claude login. After native sign-in, run `connections` to promote Codex logins and install the verified Claude connection in each company, then `qualify`, `finish-auth`, and `verify`. Other phases are `apply`, `history`, `permissions`, `goals`, and `handoffs`; they are scoped to this reviewed migration revision. Authentication promotion uses Paperclip's native account service and separate Codex login homes, not copies of the MacBook login. Do not assume a database change is a qualified agent/business execution.

The `qualify` phase writes sanitized check codes to `/paperclip/reorganization-2026-10-06/subscription-qualification.json`. Successful unchanged inputs no-op; `PAPERCLIP_QUALIFY_PROVIDER=openai` or `anthropic` narrows troubleshooting. Codex's hello probe adds `--skip-git-repo-check` for the empty agent workspace; the production agent configuration is unchanged. `finish-auth` resolves only the three authentication handoffs after all six probes pass.

**Fact:** The initial operator-created login directories were root-owned with mode `0700`. Paperclip's `node` user could not reap expired attempts, causing both providers' sign-in-start endpoints to return HTTP 500 (`EACCES`, `scandir`). The three affected directories were reassigned to UID/GID 1000; native cleanup then removed the expired attempts, and fresh sign-in preparation succeeded as `node`. Run the displayed CLI command through `kubectl exec ... -- gosu node env CODEX_HOME=... codex ...` or `gosu node env CLAUDE_CONFIG_DIR=... claude auth login`; retain the native attempt's isolated home.

Growth OS holds the durable business receipt at `integrations/paperclip-reorganization-2026-10-06.md`. Its runtime received only the reviewed instructions/job-specification package, excluding customer evidence and Git history. The entire evidence-to-experiment loop still requires real evidence and manual qualification.

## Architectural role

Paperclip should sit at the **operating/orchestration layer**, not become the canonical enterprise knowledge store.

```text
Human / Board
      |
      v
Paperclip
goals | org | work | budgets | approvals | audit
      |
      +----------------------+----------------------+
      |                                             |
      v                                             v
AI agent runtimes                            deterministic automation
Claude / Codex / Gemini / etc.                      n8n
      |                                             |
      +----------------------+----------------------+
                             |
                             v
                    Knowledge API / MCP
                             |
                             v
                  governed business knowledge
                             |
                             v
                    authoritative sources
```

Paperclip is responsible for questions such as:

- What is the organization trying to accomplish?
- Which AI employee owns this work?
- Why does the task exist?
- What is blocked or awaiting approval?
- What did this work cost?
- Which work products and decisions were produced?
- Which agent/runtime should execute the next step?

It should not be responsible for answering:

- Which copy of a Google Drive document is authoritative?
- Which source-system ACL allows a user to read that document?
- Which document revision was embedded?
- Which business entity does the document describe?
- Whether a cross-company data transfer is authorized.

Those belong in the source/knowledge/policy layers.

## Reference AI-enabled business pattern

A candidate client/reference pattern is:

```text
Google Drive / approved business systems
        authoritative source memory
                    |
                    v
       sync / extraction / provenance
                    |
                    v
Supabase PostgreSQL + pgvector
   derived business knowledge
                    |
                    v
          Knowledge API / MCP
 auth | policy | retrieval | provenance
                    |
                    v
               Paperclip
          AI business control plane
                    |
          +---------+---------+
          |         |         |
          v         v         v
        Chief    Knowledge  Research /
       of Staff   Manager    Operations
```

See [../../../docs/SUPABASE_KNOWLEDGE_LAYER_REFERENCE.md](../../../docs/SUPABASE_KNOWLEDGE_LAYER_REFERENCE.md) for the data-layer design.

## Separation of memory

Use three different concepts deliberately:

1. **Source memory** — Google Drive, Gmail, CRM, project systems, recordings, and other authoritative records.
2. **Business knowledge** — derived searchable representation, business entities, relationships, provenance, ACL metadata, and embeddings.
3. **Agent/operating memory** — Paperclip goals, tasks, agent state, approvals, budgets, work products, and activity.

This separation preserves provider portability and makes it possible to rebuild a retrieval index without losing source records or agent governance history.

## Agent design

For an AI-enabled business, start with a small governed organization rather than dozens of agents.

A representative first organization:

```text
Human / Board
    |
AI Chief of Staff
    |
    +-- Knowledge Manager
    +-- Research / Strategy Analyst
    +-- Operations Assistant
    +-- Communication / Content Specialist (optional)
```

Recommended boundaries:

- **Chief of Staff:** coordinate goals/work, summarize, escalate decisions.
- **Knowledge Manager:** retrieve source-linked information and surface stale/conflicting records.
- **Research / Strategy:** research and decision support.
- **Operations:** coordinate repeatable internal work, preferring deterministic automation where possible.
- **Communication / Content:** draft artifacts; external send/publish remains approval-gated until explicitly authorized.

The model/provider for an employee should remain replaceable where practical. Paperclip owns the role and organizational context; the adapter/runtime performs execution.

## Knowledge access boundary

Do not give every agent broad Google Drive or database credentials.

Prefer a narrow service boundary such as:

```text
agent
  |
  v
Knowledge API / MCP
  |
  +-- authenticate caller
  +-- authorize source/domain/role
  +-- apply structured + keyword + vector retrieval
  +-- return minimum necessary content
  +-- include source/provenance
```

Example tools:

- `knowledge.search`
- `knowledge.get_document`
- `knowledge.get_client`
- `knowledge.get_project`
- `knowledge.get_decisions`
- `knowledge.get_meeting_history`
- `knowledge.find_related`

Write-capable tools should use separate scopes and explicit approval policy.

## Security invariants

- Retrieved content and model output are untrusted.
- Authorization is deterministic and enforced outside the model.
- Apply access policy before generation.
- Do not let an agent infer whether confidential data may cross an organizational boundary.
- Use least-privilege agent/tool credentials.
- Never put service-role/database admin credentials directly in agent prompts/config.
- External side effects should be approval-gated until a workflow is intentionally authorized and tested.
- Preserve provenance for important retrieved claims.
- Bound model/tool spend through Paperclip budgets and runtime limits.
- Since `2026.1001.0`, agents with no stored permission mode run **full auto** (OpenCode `allow`, ACPX Claude `approve-all`, Codex `never`), including connected tools. Agents that must keep provider-side gates need an explicit restrictive mode (OpenCode `ask`/`deny`; ACPX `approve-paperclip`/`approve-reads`/`deny-all`). Paperclip approvals, company isolation, and workspace boundaries still apply. See the [v2026.1001.0 release notes](https://github.com/paperclipai/paperclip/releases/tag/v2026.1001.0).

## Observability and evaluation

The current deployment already exports Paperclip OpenTelemetry traces to Phoenix. A production-grade AI business should extend observability to include:

- orchestration/task traces;
- tool-call traces;
- model/provider latency/cost;
- retrieval source IDs and policy decisions;
- agent approval/rejection events;
- retrieval-quality evaluation;
- generation-quality evaluation;
- representative regression/golden-set cases; and
- side-effect authorization tests.

Avoid logging sensitive source content merely for convenience.

## Paperclip vs n8n

Use Paperclip when the work benefits from:

- goal-aware delegation;
- dynamic reasoning;
- multiple specialized agents;
- human approval/governance;
- budget tracking;
- persistent AI work state.

Use n8n or ordinary deterministic software when:

- the sequence is known in advance;
- transformation/routing rules are deterministic;
- an LLM is optional rather than essential;
- retries/idempotency can be expressed directly.

Paperclip should orchestrate a business, not replace reliable deterministic workflow code.

## Productionization checklist

Before copying this pattern into a client deployment:

- [ ] choose durable external Postgres strategy for Paperclip if its state is critical;
- [ ] define and test backup + restore;
- [ ] define artifact/workspace storage;
- [ ] define human identity/SSO and agent/service identities;
- [ ] define source/data authorization boundaries;
- [ ] define knowledge-layer deployment and retrieval API;
- [ ] define provider/model permissions per data class;
- [ ] define outbound side-effect approvals;
- [ ] define budgets/rate limits/retry limits;
- [ ] define audit retention and sensitive-log policy;
- [ ] run failure/restart/permission/revocation tests;
- [ ] document ownership and handoff/recovery procedures.

## Related files

- [paperclip.yaml](paperclip.yaml) — deployed Kubernetes resources.
- [paperclip-secrets.secret.enc.yaml](paperclip-secrets.secret.enc.yaml) — encrypted secret manifest; never document plaintext values.
- [../../../docs/SUPABASE_KNOWLEDGE_LAYER_REFERENCE.md](../../../docs/SUPABASE_KNOWLEDGE_LAYER_REFERENCE.md) — reference derived knowledge/data layer.
- [../../../docs/MCP_SECURITY_SHOWCASE.md](../../../docs/MCP_SECURITY_SHOWCASE.md) — MCP security concepts.
- [../../../docs/SECURITY.md](../../../docs/SECURITY.md) — cluster security notes.
