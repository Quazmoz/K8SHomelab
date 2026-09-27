# Supabase Knowledge Layer Reference

**Status:** reference architecture / design candidate only. Supabase is **not currently deployed by this repository**.

This document records a reusable pattern for AI-enabled business/knowledge systems where the authoritative source data lives in systems such as Google Drive, but agents need a governed, portable, searchable business-memory layer.

## Role in the architecture

Supabase is a candidate managed data platform because a single Postgres system can provide:

- ordinary relational data;
- business entities and relationships;
- document/source metadata;
- synchronization state;
- provenance;
- authorization metadata;
- Postgres Row Level Security where appropriate; and
- vector embeddings/similarity search through the `vector`/pgvector extension.

This avoids introducing a dedicated vector database before workload evidence requires one.

Official references:

- pgvector: https://supabase.com/docs/guides/database/extensions/pgvector
- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- database security: https://supabase.com/docs/guides/database/secure-data

## Source-of-truth invariant

Supabase is the **derived knowledge layer**, not the canonical copy of every upstream record.

For a Google-Drive-first system:

```text
Google Drive / Shared Drives
      authoritative content
               |
               v
 sync / extract / normalize / classify
               |
               v
Supabase PostgreSQL + pgvector
       derived/searchable state
```

If the vector/index layer can no longer be rebuilt from authoritative records plus durable business metadata, the design has accidentally made the index a primary datastore.

## Recommended responsibilities

### Keep in source systems

- authoritative document body;
- source-system identity;
- native revision history where available;
- source ownership;
- source retention/legal-hold behavior;
- native ACL/permission state.

### Keep in the knowledge layer

- source connection identifiers;
- canonical source IDs/URLs;
- last observed revision/change token/checksum;
- extracted text;
- chunk boundaries;
- embeddings;
- derived classification;
- ACL/permission mirror needed for retrieval;
- entities and relationships;
- provenance;
- sync errors/reconciliation state;
- retrieval/audit metadata.

### Do not use as an implicit policy engine

A vector similarity score must never decide whether data is authorized for a user/agent.

Authorization must be a deterministic precondition to retrieval/generation.

## Candidate schema

Illustrative—not a migration contract:

```text
source_connections
source_sync_cursors

documents
document_versions
document_permissions
document_chunks

embedding_models
embedding_jobs

business_entities
entity_relationships

clients
projects
people
vendors
contracts
proposals
meetings
decisions
tasks

retrieval_audit
sync_failures
```

Important keys/metadata typically include:

- `source_system`
- `source_tenant_id`
- `source_drive_id`
- `source_file_id`
- `source_revision_id`
- `checksum`
- `modified_at`
- `classification`
- `domain`
- `provenance`
- `deleted_or_revoked_at`

Do not use filenames or folder paths as durable identity when the source platform exposes stable IDs.

## Google Drive synchronization

Official Drive reference:

- changes: https://developers.google.com/workspace/drive/api/guides/about-changes
- shared-drive support: https://developers.google.com/workspace/drive/api/guides/enable-shareddrives

Preferred sync lifecycle:

```text
initial authorized inventory
        |
        v
persist source IDs + change cursor(s)
        |
        v
replay Drive Changes
        |
        +--> new/changed: refetch metadata/content/ACL
        +--> revoked/deleted: make unavailable downstream
        +--> unchanged: no re-embedding work
        |
        v
periodic full reconciliation
```

### Shared Drive permission caveat

Google documents that inherited permission changes do not necessarily produce a distinct change event for every descendant.

A correct implementation therefore needs a strategy to:

- propagate changed inherited capabilities in its own model; or
- refetch descendants/affected scopes when a parent/shared-drive permission changes.

Do not treat "we consume change events" as proof that the local permission mirror is complete.

## Retrieval pattern

Use layered retrieval rather than vector-only retrieval:

```text
identity + request
       |
       v
authorization/domain filtering
       |
       v
structured filters
       |
       +--> keyword/full-text search
       +--> vector similarity
       |
       v
optional reranking
       |
       v
minimum necessary chunks + source citations
```

Structured relational data should answer structured questions whenever possible. Do not ask an LLM to infer basic client/project relationships that the database already knows.

## Row Level Security

RLS can provide defense in depth for row-scoped access models, but it is not a substitute for understanding the trust boundary.

Important operational rules:

- enable RLS on exposed tables;
- define explicit grants and policies;
- test both allow and deny cases;
- keep privileged/service-role credentials server-side;
- do not give agent runtimes a credential that bypasses RLS;
- prefer a narrow Knowledge API/MCP service identity over direct broad database access.

If the application uses only a trusted backend, direct Postgres roles/grants plus service-level authorization may be more appropriate for some paths. Choose deliberately; do not assume "Supabase" automatically means browser-direct access.

## Knowledge API / MCP

The preferred agent-facing boundary is a dedicated knowledge service.

```text
Paperclip agent
     |
     v
Knowledge MCP/API
     |
     +-- caller identity
     +-- policy enforcement
     +-- source/domain filters
     +-- retrieval
     +-- provenance
     |
     v
Supabase/Postgres
```

This service is the correct place to implement:

- agent-specific read scopes;
- organization/domain boundaries;
- source allowlists;
- query limits;
- output size/token limits;
- citation/source packaging;
- sensitive-field suppression;
- audit metadata; and
- separate write/side-effect authorization.

## Example read tools

- `knowledge.search`
- `knowledge.get_document`
- `knowledge.get_client`
- `knowledge.get_project`
- `knowledge.get_decisions`
- `knowledge.get_meeting_history`
- `knowledge.find_related`

A write API should be separately scoped and should normally create drafts or proposals rather than silently modifying authoritative source records.

## Business entities vs embeddings

Embeddings are useful for fuzzy semantic retrieval. They are not a replacement for a business model.

Model explicit entities where they matter:

```text
Client
  |
  +-- Project
  |     +-- Meeting
  |     +-- Decision
  |     +-- Document
  |     +-- Task
  |
  +-- Contract
  +-- Proposal
```

This improves:

- deterministic filtering;
- provenance;
- reporting;
- lifecycle handling;
- access policy;
- agent context assembly; and
- portability to other model providers.

## When to add Qdrant or another vector database

Do not add a second vector system simply because the application uses RAG.

Re-evaluate a dedicated vector tier if measured evidence shows that:

- vector volume/latency dominates the workload;
- specialized filtering/search features are required;
- vector workloads must scale independently from relational workloads;
- isolation/blast-radius needs justify separation; or
- Postgres index/operational characteristics become a demonstrated bottleneck.

Until then, Postgres + pgvector keeps relational metadata, ACLs, provenance, and embeddings in one transactional platform.

## Embedding lifecycle

Store enough information to know how an embedding was created:

- embedding model/provider;
- model/version identifier where available;
- dimensions;
- chunking strategy/version;
- source document version;
- creation timestamp;
- migration/re-embedding state.

A changed embedding model should not silently mix incompatible vectors in the same index.

## Deletion and revocation

Removal is a correctness/security path, not a housekeeping feature.

When source content is deleted or access is revoked:

1. mark the source/version unavailable immediately for retrieval;
2. invalidate or remove affected chunks/embeddings;
3. propagate authorization changes;
4. preserve only audit metadata that policy permits;
5. reconcile downstream caches.

Do not wait for a nightly rebuild to enforce a known access revocation.

## Reliability

Design for:

- duplicate Drive change events;
- out-of-order sync work;
- retries after timeout;
- partial extraction failures;
- embedding provider outage;
- deleted/moved files;
- permission changes;
- schema/model migrations;
- re-embedding;
- source API rate limits;
- restart/process death.

Useful invariants:

- source ID + source revision should make ingestion idempotent;
- one source version should not create duplicate active chunks;
- a failed embedding step must not publish partially updated retrieval state;
- cursor advancement must not lose unprocessed work;
- periodic reconciliation must repair drift.

## Observability and evaluation

Measure retrieval independently from generation.

Candidate telemetry:

- sync lag;
- failed source operations;
- documents/versions/chunks by status;
- ACL reconciliation errors;
- embedding queue latency/error rate;
- retrieval latency;
- candidate count and rerank latency;
- zero-result rate;
- citation/provenance coverage;
- unauthorized-access denial tests;
- golden-set retrieval precision/recall or task-specific relevance metrics.

Avoid storing sensitive document text in logs.

## Relationship to Paperclip

Supabase/business knowledge answers:

> What does the business know, where did it come from, and may this caller retrieve it?

Paperclip answers:

> What is the AI organization trying to accomplish, who is doing the work, what needs approval, and what happened?

See [../apps/base/paperclip/README.md](../apps/base/paperclip/README.md).

## Relationship to n8n

Use n8n or normal code for deterministic ingestion/orchestration steps when possible:

- scheduled reconciliation;
- notifications;
- fixed transformation chains;
- webhook routing;
- deterministic integrations.

Use an agent only where dynamic reasoning/tool selection materially improves the task.

## Security checklist

Before production use:

- [ ] authoritative source/owner defined per data class;
- [ ] source scopes are least privilege;
- [ ] ACL inheritance/revocation behavior tested;
- [ ] RLS/grants tested where exposed;
- [ ] service-role/admin secrets stay server-side;
- [ ] agent credentials are scoped;
- [ ] retrieval policy runs before model generation;
- [ ] cross-company/domain flows require explicit authorization;
- [ ] source citations/provenance preserved;
- [ ] deletion/revocation path tested;
- [ ] backups and restore tested for non-rebuildable relational state;
- [ ] logs do not leak source content/secrets;
- [ ] model/embedding providers approved for the relevant data classes.

## Status in this repository

As of 2026-09-27:

- PostgreSQL, Qdrant, Redis, and MongoDB exist elsewhere in the homelab stack.
- Paperclip is deployed.
- Supabase is **not** deployed.
- This file is a reusable architecture reference, not a declaration of current cluster state or a recommendation to replace existing homelab databases.
