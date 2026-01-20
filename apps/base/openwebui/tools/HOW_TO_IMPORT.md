# How to Import GroupMe Tool into Open WebUI

This guide explains how to import the `groupme_tool.py` script into your Open WebUI instance to enable secure, per-user GroupMe integration.

## Prerequisites
- You must have the `groupme_tool.py` file content ready (located in this directory).
- You need your **GroupMe Access Token** from [dev.groupme.com](https://dev.groupme.com/).

## Step 1: Import the Tool

1.  Log in to your Open WebUI instance.
2.  Navigate to **Workspace** > **Tools**.
3.  Click the **Import Tools** button (usually near the top right).
4.  Upload the file `apps/base/openwebui/tools/groupme_tool_export.json` from this repository.
5.  Click **Import**.
6.  You should now see **GroupMe Tool** in your list.

## Step 2: Configure Your Personal Token (User Valves)

> **Important**: `UserValves` (per-user settings like your API token) are configured from the **Chat interface**, NOT from the Admin Tools panel. The Admin panel only shows global `Valves` (like `MCP_SERVER_URL`).

1.  Start a **New Chat**.
2.  Select your desired Model.
3.  Look for the **Tools** icon (wrench/plug icon) in the chat input area.
4.  Click to open the Tools panel.
5.  Find **GroupMe Tool** and click the **Gear Icon (⚙️)** next to it.
    *   This opens the **User-specific settings** for this tool.
6.  Enter your **GROUPME_TOKEN** (your personal Access Token from [dev.groupme.com](https://dev.groupme.com/)).
7.  Click **Save**.

Your token is now stored securely and will be used for all your GroupMe tool calls.

## Step 3: Verify & Use

1.  In the same chat, ensure **GroupMe Tool** is enabled (checkmark visible).
2.  Type a command to test:
    *   *"List my GroupMe groups"*
    *   *"Who is Quinn?"*
    *   *"Send a message to [group name]"*
3.  If successful, the AI will respond with information fetched using your personal token.

## Troubleshooting

-   **"Error: Please configure your GroupMe Token..."**: You missed Step 2. Go to a Chat, open the Tools panel, click the Gear icon on GroupMe Tool.
-   **Can't find Gear icon for token?**: Make sure you're in a **Chat**, not the Admin panel. UserValves are per-user and accessed from the chat tools selector.
-   **"Connection Refused" / "Endpoint not found"**:
    *   Admin Check: Go to **Workspace > Tools > GroupMe Tool > (three dots menu) > Edit**.
    *   Check the `MCP_SERVER_URL` Valve (Admin setting).
    *   Ensure it points to: `http://groupme-backend.apps.svc.cluster.local:5000/tool/execute`

