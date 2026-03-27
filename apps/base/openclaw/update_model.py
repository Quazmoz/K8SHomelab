import json
import os

path = "/home/user/.openclaw/openclaw.json"
if not os.path.exists(path):
    print(f"File not found: {path}")
    exit(1)

with open(path, "r") as f:
    data = json.load(f)

# Update defaults
if "agents" in data and "defaults" in data["agents"]:
    if "model" not in data["agents"]["defaults"]:
        data["agents"]["defaults"]["model"] = {}
    
    if isinstance(data["agents"]["defaults"]["model"], dict):
        data["agents"]["defaults"]["model"]["primary"] = "ollama/nemotron-3-super"
    else:
        # If it's a string, just overwrite it?
        data["agents"]["defaults"]["model"] = {"primary": "ollama/nemotron-3-super"}

# Update individual agents if they have overrides
if "agents" in data and "list" in data["agents"]:
    for agent in data["agents"]["list"]:
        if "model" in agent:
            if isinstance(agent["model"], dict):
                agent["model"]["primary"] = "ollama/nemotron-3-super"
            elif isinstance(agent["model"], str):
                agent["model"] = {"primary": "ollama/nemotron-3-super"}

with open(path, "w") as f:
    json.dump(data, f, indent=2)
print("Updated openclaw.json successfully.")
