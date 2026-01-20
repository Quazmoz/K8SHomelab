import requests
import sys

# Configuration
# This must match what is in your Python Tool Code / Admin Valves
BACKEND_URL = "http://groupme-backend.apps.svc.cluster.local:5000/tool/execute"
# Paste your token here for testing, or pass as arg
TOKEN = sys.argv[1] if len(sys.argv) > 1 else ""

if not TOKEN:
    print("Usage: python verify_connection.py <YOUR_GROUPME_TOKEN>")
    sys.exit(1)

print(f"Testing connection to: {BACKEND_URL}")
print(f"Using Token: {TOKEN[:5]}...{TOKEN[-5:]}")

payload = {
    "name": "groupme_get_current_user",
    "arguments": {}
}

headers = {
    "Content-Type": "application/json",
    "X-GroupMe-Access-Token": TOKEN
}

try:
    response = requests.post(BACKEND_URL, json=payload, headers=headers, timeout=10)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response Body: {response.text}")
    
    if response.status_code == 200:
        print("\n✅ SUCCESS! Backend is reachable and token is valid.")
    else:
        print("\n❌ FAILED. Backend reachable but returned error.")

except Exception as e:
    print(f"\n❌ CONNECTION ERROR: {e}")
