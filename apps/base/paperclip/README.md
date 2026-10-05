# Paperclip

Paperclip is the homelab's AI-agent orchestration/control-plane service.

Upstream: https://github.com/paperclipai/paperclip

## Current Homelab Deployment

This document describes the repository state, not a generic production recommendation.

Current manifest: `paperclip.yaml`.

| Area | Current state |
|---|---|
| Image | `ghcr.io/paperclipai/paperclip:2026.916.1`, digest pinned |
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
