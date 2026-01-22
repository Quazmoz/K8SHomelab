#!/bin/bash
# Cleanup script to remove duplicate/virtual MCP servers from Context Forge
# Usage: ./cleanup-context-forge-servers.sh <BEARER_TOKEN>

TOKEN=$1
CF_URL="http://context-forge.apps.svc.cluster.local:4444"

if [ -z "$TOKEN" ]; then
  echo "Usage: $0 <BEARER_TOKEN>"
  echo "Get token with:"
  echo "  kubectl exec -it deploy/context-forge -n apps -- \\"
  echo "    python3 -m mcpgateway.utils.create_jwt_token --username admin@localhost --exp 0 --secret <JWT_SECRET_KEY>"
  exit 1
fi

echo "Fetching all registered servers..."
SERVERS=$(curl -s -X GET "$CF_URL/servers" -H "Authorization: Bearer $TOKEN")

if [ -z "$SERVERS" ] || [ "$SERVERS" = "[]" ]; then
  echo "No servers found or error fetching servers"
  exit 1
fi

echo ""
echo "Current servers:"
echo "$SERVERS" | python3 -c "import sys, json; servers = json.load(sys.stdin); [print(f\"  [{s.get('id', 'no-id')}] {s.get('name')}: {s.get('type')} -> {s.get('url', 'stdio')}\") for s in servers]"

echo ""
echo "Servers to KEEP (one of each):"
echo "  - azure-go (HTTP)"
echo "  - groupme (SSE)"
echo "  - clickup-native (SSE)"
echo "  - n8n (SSE)"
echo "  - kubernetes (stdio)"
echo "  - postgres (stdio)"
echo "  - prometheus (stdio)"
echo "  - freshrss (stdio)"
echo "  - clickup-openapi (stdio)"

echo ""
echo "Servers to REMOVE (duplicates/old):"
echo "  - azure (old stdio server, replaced by azure-go)"
echo "  - Any virtual servers or duplicates"

echo ""
read -p "Do you want to delete duplicate servers? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled. Use the Admin UI at http://mcp.k8s.local/admin to manually remove duplicates."
  exit 0
fi

# Delete old azure stdio server if it exists
echo "Checking for old 'azure' server..."
AZURE_IDS=$(echo "$SERVERS" | python3 -c "import sys, json; servers = json.load(sys.stdin); [print(s.get('id')) for s in servers if s.get('name') == 'azure']")

for ID in $AZURE_IDS; do
  echo "Deleting old 'azure' server (ID: $ID)..."
  curl -s -X DELETE "$CF_URL/servers/$ID" -H "Authorization: Bearer $TOKEN"
  echo "  Deleted"
done

echo ""
echo "Done! Check http://mcp.k8s.local/admin to verify servers."
