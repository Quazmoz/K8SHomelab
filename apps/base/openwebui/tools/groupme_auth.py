
import requests
import json
from pydantic import BaseModel, Field

class Tools:
    class Valves(BaseModel):
        BACKEND_URL: str = Field(
            default="http://groupme-backend.apps.svc.cluster.local:5000/auth/register",
            description="Internal URL for GroupMe backend registration endpoint"
        )

    class UserValves(BaseModel):
        REGISTRATION_TOKEN: str = Field(
            default="",
            description="Paste your GroupMe Access Token here to register it, then run the 'Register Token' command."
        )

    def __init__(self):
        self.valves = self.Valves()
        self.user_valves = self.UserValves()

    def _get_user_valves(self, __user__: dict) -> UserValves:
        """Safely extract user valves."""
        try:
            valves_dict = __user__.get("valves", {})
            return self.UserValves(**valves_dict)
        except Exception:
            return self.UserValves()

    async def register_token(self, __user__: dict = {}) -> str:
        """
        Securely register the token you saved in the Tool Settings (UserValves).
        """
        user_valves = self._get_user_valves(__user__)
        token = user_valves.REGISTRATION_TOKEN

        if not token:
            return "❌ Error: No token found. Please go to **Workspace > Tools > Auth Registration > Gear Icon** and paste your token in the 'REGISTRATION_TOKEN' field."

        # Get OpenWebUI JWT from the user context
        jwt = __user__.get("token", "")
        if not jwt:
            return "Error: Could not retrieve your OpenWebUI session token. Please try refreshing the page."

        url = self.valves.BACKEND_URL
        headers = {
            "Authorization": f"Bearer {jwt}",
            "Content-Type": "application/json"
        }
        payload = {
            "groupme_token": token
        }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code == 200:
                return "✅ Success! Your GroupMe token has been securely registered. It is now encrypted in the backend database. You can clear the token from the settings now."
            else:
                return f"❌ Registration failed (Status {response.status_code}): {response.text}"
        except Exception as e:
            return f"❌ Connection error: {str(e)}"
