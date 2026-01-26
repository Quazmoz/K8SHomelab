
import requests
import json
import sys
import time

SSE_URL = "http://clickup-mcp-server.apps.svc.cluster.local:5000/sse"

def debug_server():
    print(f"Connecting to {SSE_URL}...")
    try:
        # Start SSE connection
        s = requests.Session()
        resp = s.get(SSE_URL, stream=True, timeout=5)
        
        endpoint = None
        
        print("Reading SSE stream...")
        for line in resp.iter_lines():
            if line:
                decoded = line.decode('utf-8')
                print(f"RX: {decoded}")
                if decoded.startswith("event: endpoint"):
                    # Next line should be data
                    continue
                if decoded.startswith("data:"):
                    endpoint = decoded.split("data:")[1].strip()
                    print(f"Endpoint found: {endpoint}")
                    break
        
        if not endpoint:
            print("Failed to get endpoint from SSE")
            return

        # Construct POST URL
        # endpoint is relative like "/messages?sessionId=..."
        post_url = f"http://clickup-mcp-server.apps.svc.cluster.local:5000{endpoint}"
        print(f"POST URL: {post_url}")
        
        # Initialize
        init_payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05", # Try a recent version
                "capabilities": {},
                "clientInfo": {"name": "debug", "version": "1.0"}
            }
        }
        
        print("Sending initialize...")
        r = requests.post(post_url, json=init_payload)
        print(f"Init Resp: {r.text}")
        
        # Initialized notification
        requests.post(post_url, json={
            "jsonrpc": "2.0",
            "method": "notifications/initialized"
        })
        
        # List Tools
        tool_payload = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list",
            "params": {}
        }
        
        print("Sending tools/list...")
        r = requests.post(post_url, json=tool_payload)
        print(f"Tools Resp: {r.text}")
        
        # Parse tools
        try:
            data = r.json()
            tools = data.get("result", {}).get("tools", [])
            print(f"Found {len(tools)} tools:")
            for t in tools:
                print(f" - {t['name']}")
        except:
            print("Failed to parse tools JSON")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_server()
