
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

    def _get_token(self, __user__: dict) -> str:
        """Extract token from user valves using multiple methods."""
        # Method 1: Direct valves dict
        if "valves" in __user__:
            valves = __user__["valves"]
            if isinstance(valves, dict) and "REGISTRATION_TOKEN" in valves:
                return valves.get("REGISTRATION_TOKEN", "")
            if hasattr(valves, "REGISTRATION_TOKEN"):
                return valves.REGISTRATION_TOKEN
        
        # Method 2: user_valves attribute
        if "user_valves" in __user__:
            uv = __user__["user_valves"]
            if isinstance(uv, dict) and "REGISTRATION_TOKEN" in uv:
                return uv.get("REGISTRATION_TOKEN", "")
            if hasattr(uv, "REGISTRATION_TOKEN"):
                return uv.REGISTRATION_TOKEN
        
        # Method 3: Check self.user_valves (set by OpenWebUI directly)
        if hasattr(self, "user_valves") and self.user_valves:
            if hasattr(self.user_valves, "REGISTRATION_TOKEN"):
                return self.user_valves.REGISTRATION_TOKEN
            if isinstance(self.user_valves, dict):
                return self.user_valves.get("REGISTRATION_TOKEN", "")
        
        return ""

    async def register_token(self, __user__: dict = {}) -> str:
        """
        Securely register the token you saved in the Tool Settings (UserValves).
        Go to Workspace > Tools > Auth Registration > click the gear icon and paste your token.
        """
        token = self._get_token(__user__)

        if not token:
            # Debug info
            debug_keys = list(__user__.keys()) if __user__ else []
            return f"❌ No token found. Please go to **Workspace > Tools > Auth Registration > Gear Icon** and paste your token in 'REGISTRATION_TOKEN'. (Debug: user keys={debug_keys})"

        # Get user identity
        user_email = __user__.get("email", "") or __user__.get("id", "") or __user__.get("name", "")
        
        if not user_email:
            debug_keys = list(__user__.keys()) if __user__ else []
            return f"❌ Could not determine your user identity. (Debug: user keys={debug_keys})"

        url = self.valves.BACKEND_URL
        headers = {
            "Content-Type": "application/json",
            "X-User-Email": user_email
        }
        payload = {
            "groupme_token": token,
            "user_id": user_email
        }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code == 200:
                return f"✅ Success! Your GroupMe token has been registered for {user_email}. You can now clear the token from settings."
            else:
                return f"❌ Registration failed (Status {response.status_code}): {response.text}"
        except Exception as e:
            return f"❌ Connection error: {str(e)}"

