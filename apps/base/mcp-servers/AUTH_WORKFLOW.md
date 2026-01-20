# Per-User Authentication Workflow

This document explains how **Context Forge** and the **GroupMe Backend** work together to provide secure, per-user authentication.

## 🔒 Security Architecture

Unlike simple API wrapping, this setup ensures that **user tokens are never exposed** to the LLM or client context after registration.

```mermaid
sequenceDiagram
    participant User
    participant OpenWebUI
    participant ContextForge
    participant GroupMeBackend
    participant Redis
    participant GroupMeAPI

    Note over User, Redis: 1. Registration (One-Time)
    User->>GroupMeBackend: POST /auth/register (Token + JWT)
    GroupMeBackend->>Redis: SET "user:{id}:groupme" = Encrypted(Token)
    GroupMeBackend-->>User: 200 OK

    Note over User, Redis: 2. Usage (Runtime)
    User->>OpenWebUI: "List my groups"
    OpenWebUI->>ContextForge: SSE Request (Headers: Authorization, X-User-ID)
    ContextForge->>GroupMeBackend: Forward Request (Header: X-Authenticated-User)
    GroupMeBackend->>Redis: GET "user:{id}:groupme"
    Redis-->>GroupMeBackend: Encrypted Token
    GroupMeBackend->>GroupMeBackend: Decrypt Token
    GroupMeBackend->>GroupMeAPI: GET /groups (Header: X-Access-Token: <Token>)
    GroupMeAPI-->>GroupMeBackend: Group Data
    GroupMeBackend-->>OpenWebUI: Tool Result
```

## 🔑 Key Concepts

1.  **Identity Propagation**: OpenWebUI authenticates the user. Context Forge trusts this identity and forwards it as the `X-Authenticated-User` header.
2.  **Secure Storage**: GroupMe Access Tokens are stored in **Redis** (internal to the cluster), encrypted at rest.
3.  **No Leaks**: The LLM never sees the raw Access Token, only the tool outputs.

## 🛠️ User Setup Guide

For a user to enable GroupMe tools, they must perform this one-time registration:

1.  **Get GroupMe Token**: Log in to [dev.groupme.com](https://dev.groupme.com) and copy your Access Token.
2.  **Register Token**:
    Run this command from your terminal (or use a helper tool if configured):

    ```bash
    # Replace keys and token with your actual values
    curl -X POST http://groupme-backend.apps.svc.cluster.local:5000/auth/register \
      -H "Authorization: Bearer <YOUR_OPENWEBUI_JWT>" \
      -H "Content-Type: application/json" \
      -d '{"groupme_token": "YOUR_GROUPME_ACCESS_TOKEN"}'
    ```

3.  **Verify**: The backend will return `{"status": "registered"}`.

## ⚙️ Configuration Verification

Ensure your **Context Forge** deployment has header passthrough enabled:

```yaml
# apps/base/mcp-servers/context-forge.yaml
env:
  - name: ENABLE_HEADER_PASSTHROUGH
    value: "true"
  - name: DEFAULT_PASSTHROUGH_HEADERS
    value: '["X-Authenticated-User", "Authorization"]'
```
