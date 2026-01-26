
import requests
import json
import sys

API_URL = "http://localhost:4444"

def check_state():
    try:
        # Get Servers
        print("--- SERVERS ---")
        servers = requests.get(f"{API_URL}/servers").json()
        server_map = {}
        for s in servers:
            name = s['name']
            sid = s['id']
            stype = s.get('type', 'virtual')
            tools = s.get('associatedTools', [])
            print(f"Server: {name} (ID: {sid})")
            print(f"  Type: {stype}")
            print(f"  Tools: {len(tools)}")
            if name.lower() in server_map:
                print(f"  ⚠️  DUPLICATE NAME DETECTED: {name} (matches {server_map[name.lower()]})")
            server_map[name.lower()] = sid

        # Get Tools
        print("\n--- TOOLS ---")
        tools = requests.get(f"{API_URL}/tools").json()
        print(f"Total Tools: {len(tools)}")
        
        # Check ownership
        for s in servers:
            s_tools = [t for t in tools if s['name'].split('-')[0] in t['name'].lower()]
            print(f"Tools matching '{s['name']}': {len(s_tools)}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_state()
