# Manual MCP Server Configuration

Since the auto-configuration scripts have been removed, you must manually register the MCP servers in the Context Forge GUI.

## Instructions

1.  Open the Context Forge UI.
2.  Navigate to the **Server Management** or **Add Server** section.
3.  Add the following servers using the details below.

### 1. Azure MCP
*   **Name**: `azure-go` (or similar)
*   **Transport Type**: `Streamable HTTP` (or `SSE` if specified, but backend is configured for HTTP)
    *   *Note: The backend is listening on `/mcp` via Streamable HTTP.*
*   **URL**: `http://azure-mcp-go.apps.svc.cluster.local:8080/mcp`
*   **Headers**: None/Default

### 2. GroupMe MCP
*   **Name**: `groupme`
*   **Transport Type**: `Streamable HTTP`
*   **URL**: `http://groupme-backend.apps.svc.cluster.local:5000/mcp`
*   **Headers**: None/Default (Environment variables handle auth internally)

### 3. ClickUp MCP
*   **Name**: `clickup-native`
*   **Transport Type**: `Streamable HTTP`
*   **URL**: `http://clickup-mcp-server.apps.svc.cluster.local:5000/mcp`
*   **Headers**: None/Default

## Virtual Servers
After resolving the backend servers, ensure you create **Virtual Servers** (e.g., "Azure Tools", "GroupMe Tools") and associate the discovered tools with them so they are exposed to OpenWebUI.
