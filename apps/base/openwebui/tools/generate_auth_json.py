import json
import os

tool_path = 'c:/Users/flyin/OneDrive/Documents/personalgit/K8SHomelab/apps/base/openwebui/tools/groupme_auth.py'
export_path = 'c:/Users/flyin/OneDrive/Documents/personalgit/K8SHomelab/apps/base/openwebui/tools/groupme_auth_export.json'

with open(tool_path, 'r', encoding='utf-8') as f:
    content = f.read()

export_data = {
    "id": "groupme_auth",
    "name": "Auth Registration",
    "content": content,
    "description": "Helper tool to register your API tokens securely with the backend.",
    "access_control": None,
    "meta": {
        "description": "Helper tool to register your API tokens securely with the backend.",
        "manifest": {
            "title": "Auth Registration",
            "url": "https://quinnfavo.com",
            "version": "1.0.0",
            "author": "Antigravity",
            "description": "Helper tool to register your API tokens securely with the backend."
        }
    }
}

with open(export_path, 'w', encoding='utf-8') as f:
    json.dump([export_data], f, indent=4) 

print(f"Created {export_path}")
