# Native Paperclip GitHub connector qualification — 2026-10-13

**DISCOVERED**

**Fact:** Paperclip runs pinned `2026.1012.0`, upstream commit `bba6a45f0d364cfd962ac59b3bdf2426a8222adb`, in authenticated/private mode. Before repair, only AI Consulting had a native GitHub connection. Its managed personal Quazmoz grant covered all 122 repositories, was installed company-wide, and permitted all 45 discovered actions without Ask first. Android and Growth OS had no GitHub connection or grant. Receipt: `/paperclip/github-connector-2026-10-13/inspection-before.json`; the initial effective-policy inspection is also retained in this session's tool output.

**Fact:** Growth OS's workspace was an instructions snapshot with no Git remote, local HEAD `a64ddb6bbd74023d75935c42949b0e9c2912197a`, and an untracked `.claude/` directory. The project and nine active shared execution-workspace records pointed there. The earlier [workspace repair](../apps/base/paperclip/README.md) explicitly did not establish canonical repository access.

**Inference:** The company separation explains the sprint's missing native GitHub tools and shell credentials. A GitHub connection in another company, a repository URL, and a Claude/Codex subscription do not authorize this company's repository access. The snapshot repaired local execution while leaving canonical persistence unresolved.

**Fact:** Live signed Cloud checks confirm active enrollment for `https://paperclip.k8s.local` and advertised profile `github.code`. Native GUI OAuth completed for both companies. HTTPS passed using the existing certificate as an explicit trust anchor; TLS verification stayed enabled. No DNS, ingress, certificate, image, or Flux manifest change was required. A transient earlier Cloud status check was unverified; it was not evidence of missing enrollment.

**IMPLEMENTED**

**Fact:** Quinn explicitly changed the desired scope to all repositories for all three companies, then completed native GUI sign-in. The original per-repository isolation requirement is superseded by that instruction. Each company retains its own managed connection, user grant, credential custody, installations, and action policies.

| Company | Active native GitHub connection | Eligible agents | Repository inventory |
| --- | --- | ---: | ---: |
| Quinn Favo AI Consulting | `4dcdbc36-1f8f-4892-b2be-7d60de5e6c7d` | 12 | 122 |
| Quazmoz Android Development | `25e2b839-0a02-49c5-abd5-1d757bcdcd78` | 7 | 122 |
| Quazmoz Growth OS | `60488e43-90e8-4379-8afe-d93af6cae6a5` | 5 | 122 |

**Fact:** Growth OS installs cover Director, Iris, Quill, Sage, and Scout. Native effective-policy checks allow 27 consulting read actions and 28 Android/Growth OS read actions. Thirteen writes require Ask first. Deletion, merge, repository creation/forking, and Copilot review are Off. Company-wide installations were replaced with the existing active-agent list; paused/terminated agents were not activated. The newer connections discovered one additional read action. Receipt: `permissions.json` in the protected runtime directory.

**Fact:** The GUI created a healthy Android connection separate from the prepared draft. The native removal service archived only that credential-free, unused draft `5716521b-e246-430b-b63f-a146d09d594d`. It did not remove the authorized connection or business history. Receipt: `duplicates.json`.

**Fact:** The operator is [scripts/paperclip/github-connector.mjs](../scripts/paperclip/github-connector.mjs), installed as `/paperclip/github-connector-2026-10-13/operator.mjs`. It uses the installed native setup, grant, policy, health, gateway, secret-custody, project, and execution-workspace services. It never creates a board API key, copies a login from the Mac, adds a custom MCP server, or installs a container-wide GitHub token. Native managed Git credentials are supplied only to the specific Git/gh invocation.

**Fact:** Before migration, the native backup engine restored a fresh SQL backup into an isolated temporary database and matched protected records. That temporary database was removed. A verified Git bundle and mirror recover `a64ddb6`; the full persistent-files archive also preserves untracked artifacts and secret-key material. Checksums, original refs/worktrees/status, and recovery paths are in `recovery.json`. These backups remain protected on the existing PVC.

**Fact:** After native reads passed, a separate authenticated clone was validated against remote `main`. Native project/execution-workspace services changed the original workspace record and nine active shared records to `growth-os.canonical`, preserving their IDs, issue assignments, and history. The old `growth-os` snapshot remains in place. Hosted internal processing remains disabled. Receipts: `workspace-before.json`, `workspace.json`.

**VERIFIED**

**Fact:** Twenty-six successful native Test-tab calls used real agent policy and credential attribution through `createToolGatewayService.executeTestCall`. All five Growth OS agents read private `README.md`, `07-agents/jobs/growth-director.md`, and `schemas/experiment.schema.json`. Representative Claude-, Codex-, and OpenCode-configured agents passed. Each director also read the other two companies' governance README files, verifying Quinn's revised repository scope. Receipt: `reads.json`, with invocation IDs, result hashes, and independently queried `tool_call_events`; no file bodies were exported.

**Fact:** Director's Growth OS read invocation IDs are `c1b274f6-ad7f-4c62-acaa-981979448685` (README), `4f583ecc-f11a-4a26-a0e1-c5051208a872` (job), and `60c499bc-0a1c-4ba5-a974-a6694771b639` (schema). Matching completion events are retained by Paperclip. These were connector calls, not shell or public-web substitutes.

**Fact:** Six cross-company identity combinations rejected foreign agents before provider dispatch with Paperclip reason `agent_not_found`; foreign connection IDs exposed zero tools. This intentional Paperclip scope response is distinct from GitHub's unauthenticated private-repository 404. Repository separation itself is intentionally broad under the revised instruction. Receipt: `boundaries.json`.

**Fact:** The controlled write pushed `44baf8250e43fe7f6588e5e79c019feb14812077` to `paperclip/github-connector-verification-2026-10-13`. It changes only `integration-verification/paperclip-github-2026-10-13.md`. The remote commit matched. After Quinn explicitly instructed “push and merge to main,” [Growth OS PR #2](https://github.com/Quazmoz/growth-os/pull/2) merged normally at `2026-10-13T12:45:54Z`, producing `cb09e473381de0ac27ddffa244fa44edf830a44b`. The canonical checkout was fast-forwarded to that verified remote main commit. No admin bypass or branch deletion was used. Receipts: `write-staged.json`, `write.json`, `merge-before.json`, `workspace.json`.

**Fact:** Native setup and permissions reruns retain connection identities and no-op. Canonical workspace repair also no-ops after the approved merge. JavaScript syntax/self-check, Kustomize build, lock regression, certificate-verified HTTPS, and Kubernetes server-side dry run pass. Flux and the existing deployment remain Ready.

**Fact:** The installed upstream regression suite passed 73 tests across `github-operation-credentials`, `github-grant-metadata`, `connection-grant-resolution`, `tool-gateway-service`, and `tool-connection-removal`. Coverage includes credential revocation/refresh, low-trust export denial, reviewed writes, restart recovery, partial-success handling, and removal failures. Growth OS structural/secret validation and 19 unit tests pass on a clean archive of tracked source plus the new qualification receipt. The full working-tree secret scan also flags an existing pip dependency under local `.venv`, outside that source validation; it was not changed or removed.

**UNVERIFIED / BLOCKED**

**Fact:** Qualification uses the native per-agent Test interface and native workspace realization/validation. Full model-driven Claude/Codex/OpenCode ACP turns, provider prompts, and a live agent/pod restart were not launched. A connected model badge or these native tests must not be described as a complete autonomous marketing execution. The existing subscription bindings are checked independently, with no inference or metered fallback.

**Fact:** One consulting read returned `mcp_remote_fetch_failed`; a later native retry succeeded with the expected hash. Its failed audit record remains alongside the successful receipt. Transport status checks passed afterward. No public-only fallback was used. The precise cause of that transient provider fetch failure was not recovered.

**RISKS**

**Fact:** All-repository scope is deliberate and includes future repositories under the existing installation. Personal managed grants work for Quinn-responsible runs; another person or an ownerless/low-trust execution does not inherit that authorization. Repository access does not override evidence sensitivity or hosted-model policy.

**Fact:** Paperclip action approvals govern gateway calls. The managed shell identity can perform Git/gh operations under its GitHub permissions; gateway merge-Off and Ask first are not shell enforcement. Authenticated metadata reports `protected: false` for the default branches of all three governance repositories. An agent shell can therefore bypass those gateway controls under the identity's GitHub permissions. No GitHub rules were changed. Observations: `verified.json`; behavior: [native GitHub access boundary](https://docs.paperclip.ing/connectors/github/) and [setup guide](https://docs.paperclip.ing/connectors/github-setup/).

**Fact:** Recovery archives share the application disk. A successful isolated restore does not establish off-node disaster recovery, an RTO, or an RPO.

**USER ACTION**

**Fact:** The two required native GUI authorizations and the remote-write/merge approval are complete. No further sign-in or token creation is required for the qualified Quinn-responsible path. Full agent-turn qualification and stronger GitHub-side write controls remain separate work.

The existing operator can be inspected or rerun without an external write:

```sh
kubectl -n apps exec deployment/paperclip -c paperclip -- gosu node node \
  --import /app/server/node_modules/tsx/dist/loader.mjs \
  /paperclip/github-connector-2026-10-13/operator.mjs verify
```

**Inference:** Keep recovery, per-agent connector proof, workspace proof, and remote persistence as separate receipts. A connected badge, subscription hello, local commit, and successful Git push establish different boundaries.
