
import json
import os
import sys
import subprocess
import requests
import time

# Configuration
API_URL = "http://localhost:4444"
SERVERS = [
    # SSE Servers
    # SSE Servers - Manually managed by user
    # {"name": "groupme", ...},
    # {"name": "clickup-native", ...},

    # Stdio Servers
    {
        "name": "azure",
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@azure/mcp@latest", "server", "start"],
        "env": {
            "AZURE_TENANT_ID": os.environ.get("AZURE_TENANT_ID", ""),
            "AZURE_CLIENT_ID": os.environ.get("AZURE_CLIENT_ID", ""),
            "AZURE_CLIENT_SECRET": os.environ.get("AZURE_CLIENT_SECRET", ""),
            "AZURE_SUBSCRIPTION_ID": os.environ.get("AZURE_SUBSCRIPTION_ID", "")
        }
    },
    {
        "name": "kubernetes",
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "kubernetes-mcp-server@latest"]
    },
    {
        "name": "postgres",
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@henkey/postgres-mcp-server"],
        "env": {
            "POSTGRES_HOST": "postgres.apps.svc.cluster.local",
            "POSTGRES_USER": "grafana_user",
            "POSTGRES_PASSWORD": "passwordfortesting123", 
            "POSTGRES_DATABASE": "postgres",
            "POSTGRES_PORT": "5432"
        }
    },
    {
        "name": "prometheus",
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "prometheus-mcp-server"],
        "env": {
            "PROMETHEUS_URL": "http://prometheus-server.apps.svc.cluster.local"
        }
    },
    {
        "name": "freshrss",
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "mcp-server-fetch"],
        "env": {
            "FETCH_URL": "http://freshrss.apps.svc.cluster.local/api/greader.php"
        }
    },
    # {"name": "clickup-openapi", ...}
]

def get_token():
    print("🔑 Generating Token...")
    # Get password from env or assume default for script running in pod
    # We use the internal utility to generate a token
    try:
        # We need the secret key to sign. It should be in JWT_SECRET_KEY env var
        # If running inside pod, this env var is set.
        cmd = [
            sys.executable, "-m", "mcpgateway.utils.create_jwt_token",
            "--username", "admin@localhost",
            "--exp", "0",
            "--secret", os.environ.get("JWT_SECRET_KEY", "changeme")
        ]
        result = subprocess.check_output(cmd, text=True).strip()
        # The output might contain logs, so we need to filter for the token (usually the last line or just the string)
        # However, the tool usually prints JUST the token if structured log is off, but here we have logging.
        # Let's try to assume the output IS the token if it looks like one (eyj...).
        for line in result.split('\n'):
            if line.startswith('eyJ'):
                return line
        return result
    except Exception as e:
        print(f"❌ Failed to generate token: {e}")
        # Fallback: Ask user to provide it? No, script is automated.
        sys.exit(1)

def register(token):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print(f"📡 Connecting to {API_URL}...")
    
    for server in SERVERS:
        name = server["name"]
        print(f"   👉 Registering {name} ({server['type']})...")
        
        try:
            resp = requests.post(f"{API_URL}/servers", headers=headers, json=server)
            if resp.status_code in [200, 201]:
                print(f"      ✅ Success!")
            elif resp.status_code in [400, 409]:
                print(f"      🔹 Already Registered (Skipping)")
            else:
                print(f"      ⚠️  Failed: {resp.status_code} - {resp.text}")
        except Exception as e:
            print(f"      ❌ Network Error: {e}")

if __name__ == "__main__":
    # Ensure we are in the venv if needed
    # But we assume calling with /app/.venv/bin/python3
    token = get_token()
    register(token)
