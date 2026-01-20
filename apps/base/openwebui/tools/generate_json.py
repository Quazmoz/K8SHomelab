import json
import os

tool_path = 'c:/Users/flyin/OneDrive/Documents/personalgit/K8SHomelab/apps/base/openwebui/tools/groupme_tool.py'
export_path = 'c:/Users/flyin/OneDrive/Documents/personalgit/K8SHomelab/apps/base/openwebui/tools/groupme_tool_export.json'

with open(tool_path, 'r', encoding='utf-8') as f:
    content = f.read()

export_data = {
    "id": "groupme_tool",
    "name": "GroupMe Tool",
    "content": content,
    "description": "Secure GroupMe Integration via MCP with UserValves.",
    "access_control": None,
    "meta": {
        "description": "Manage your GroupMe groups, polls, and messages securely using your personal Access Token.",
        "manifest": {
            "title": "GroupMe Tool",
            "url": "https://groupme.com",
            "version": "1.0.1",
            "author": "Antigravity",
            "description": "Secure GroupMe Integration via MCP with UserValves."
        }
    }
}

with open(export_path, 'w', encoding='utf-8') as f:
    json.dump([export_data], f, indent=4) 

print(f"Created {export_path}")
