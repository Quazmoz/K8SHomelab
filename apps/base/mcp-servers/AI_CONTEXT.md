# AI Context: MCP Servers

> **AI Maintenance Rule:** If you modify any files in this deployment, you MUST update both this `AI_CONTEXT.md` and the `README.md` to reflect your changes before completing your task.

## Purpose

Multi-component MCP (Model Context Protocol) integration layer. Provides AI tools to OpenWebUI via Context Forge gateway, MCPO proxy, and several specialized MCP servers.

## Architecture

- **Type:** Multi-component (7 sub-deployments across 3 subdirectories)
- **Namespace:** `apps`
- **Gateway:** Context Forge (`mcp.k8s.local`) — central MCP gateway with per-user auth
- **Proxy:** MCPO (`mcpo.k8s.local`) — MCP-to-OpenAPI proxy

### Sub-Deployments

| Component | Image | Port | URL |
|-----------|-------|------|-----|
| Context Forge | `ghcr.io/ibm/mcp-context-forge:v1.0.0-RC1` | 4444 | `http://mcp.k8s.local` |
| GroupMe Backend | `quazmoz/quazmoz:groupme` | 5000 | `http://groupme.k8s.local` |
| ClickUp MCP | `quazmoz/quazmoz:clickup` | 5000 | internal |
| Azure MCP Go | `quazmoz/quazmoz:azure` | 8080 | internal |
| MCPO | `ghcr.io/open-webui/mcpo` (SHA) | 8000 | `http://mcpo.k8s.local` |
| Ansible MCP | `quazmoz/quazmoz:ansible-mcp` | 5000 | internal |

## Directory Structure

```
mcp-servers/
├── kustomization.yaml
├── README.md
├── contextforge/     # Context Forge + GroupMe + ClickUp + Azure
├── mcpo/             # MCPO proxy + README
├── ansible-mcp/      # Ansible MCP server
├── legacy/           # Disabled/reference resources
└── standalone/       # Standalone MCP tools
```

## Key Details

- Context Forge has dedicated RBAC for Kubernetes API access
- MCPO has RBAC and is protected by Authentik forward-auth on ingress
- GroupMe has network policies restricting egress
- Multiple secrets required: `context-forge-secrets`, `azure-mcp-credentials`, `clickup-mcp-credentials`, `groupme-mcp-secret`, `n8n-mcp-credentials`, `ansible-mcp-secrets`, `mcpo-config`

## Dependencies

- **Depends on:** PostgreSQL (Context Forge DB, GroupMe tokens), Redis (Context Forge cache), Authentik (MCPO auth), Prometheus (monitoring), n8n (MCPO tools), local-storage
- **Depended on by:** OpenWebUI (MCP tools), Homepage (monitoring)

## Modification Notes

- Context Forge server registrations are GUI-configured (not in git)
- MCPO tool configs are in its Secret — edit with care
- Adding a new MCP server: create deployment in appropriate subdirectory, add to kustomization.yaml
- GroupMe network policy may need updating if new egress targets are added
- See `README.md` in this directory for detailed MCP setup guide
