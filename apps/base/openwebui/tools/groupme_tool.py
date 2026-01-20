import os
import requests
import json
from pydantic import BaseModel, Field

class Tools:
    # 1. Global Valves (Admin Settings)
    class Valves(BaseModel):
        MCP_SERVER_URL: str = Field(
            default="http://groupme-backend.apps.svc.cluster.local:5000/tool/execute",
            description="The internal URL of the GroupMe MCP Server tool execution endpoint"
        )

    # 2. User Valves (Per-User Secure Settings)
    class UserValves(BaseModel):
        GROUPME_TOKEN: str = Field(
            default="", 
            description="Your GroupMe Access Token. Get it from dev.groupme.com"
        )

    def __init__(self):
        self.valves = self.Valves()

    # 3. Wrapper Helper
    async def _call_mcp(self, tool_name: str, arguments: dict, token: str) -> str:
        if not token:
            return "Error: Please configure your GroupMe Token in the Tool Settings (Gear Icon)."
        
        url = self.valves.MCP_SERVER_URL
        headers = {
            "Content-Type": "application/json",
            "X-GroupMe-Access-Token": token # Secure injection
        }
        
        payload = {
            "name": tool_name,
            "arguments": arguments
        }
        try:
            # Using sync requests with timeout
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            
            # MCP returns a result object, usually list of Content items
            return json.dumps(response.json(), indent=2)
        except Exception as e:
            return f"Failed to execute {tool_name}: {str(e)}"

    # --- Tool Definitions ---

    def _get_token(self, __user__: dict) -> str:
        """Extract token from __user__ dict safely."""
        valves = __user__.get("valves") if isinstance(__user__, dict) else None
        if valves and hasattr(valves, "GROUPME_TOKEN"):
            return valves.GROUPME_TOKEN
        return ""

    async def list_groups(self, __user__: dict = {}) -> str:
        """
        List your GroupMe groups to get group_id.
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_list_groups", {}, token)

    async def list_messages(self, group_id: str, __user__: dict = {}) -> str:
        """
        List messages from a group.
        :param group_id: The ID of the group
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_list_messages", {"group_id": group_id}, token)

    async def send_message(self, group_id: str, text: str, __user__: dict = {}) -> str:
        """
        Send a message to a group.
        :param group_id: The ID of the group
        :param text: The content of the message
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_send_message", {"group_id": group_id, "text": text}, token)

    async def list_polls(self, group_id: str, status: str = "active", __user__: dict = {}) -> str:
        """
        List polls in a group.
        :param group_id: The ID of the group
        :param status: Filter by 'active', 'past', or 'all'
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_list_polls", {"group_id": group_id, "status": status}, token)

    async def create_poll(self, group_id: str, subject: str, options: str, __user__: dict = {}) -> str:
        """
        Create a new poll.
        :param group_id: The ID of the group
        :param subject: The question to ask
        :param options: Comma-separated list of options (e.g. "Yes,No,Maybe")
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_create_poll", {"group_id": group_id, "subject": subject, "options": options}, token)

    async def get_poll(self, group_id: str, poll_id: str, __user__: dict = {}) -> str:
        """
        Get details of a specific poll.
        :param group_id: The ID of the group
        :param poll_id: The ID of the poll
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_get_poll", {"group_id": group_id, "poll_id": poll_id}, token)

    # --- DM Tools ---

    async def list_chats(self, __user__: dict = {}) -> str:
        """
        List your direct message conversations.
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_list_chats", {}, token)

    async def list_dm_messages(self, other_user_id: str, __user__: dict = {}) -> str:
        """
        Get messages from a DM conversation.
        :param other_user_id: The user ID of the other person
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_list_dm_messages", {"other_user_id": other_user_id}, token)

    async def send_dm(self, recipient_id: str, text: str, __user__: dict = {}) -> str:
        """
        Send a direct message.
        :param recipient_id: The user ID to send to
        :param text: Message text
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_send_dm", {"recipient_id": recipient_id, "text": text}, token)

    # --- Bot Tools ---

    async def list_bots(self, __user__: dict = {}) -> str:
        """
        List all your bots.
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_list_bots", {}, token)

    async def post_bot_message(self, bot_id: str, text: str, __user__: dict = {}) -> str:
        """
        Post a message as a bot.
        :param bot_id: The ID of the bot
        :param text: Message text
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_post_bot_message", {"bot_id": bot_id, "text": text}, token)

    # --- Member Tools ---

    async def list_group_members(self, group_id: str, __user__: dict = {}) -> str:
        """
        List members of a group.
        :param group_id: ID of the group
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_list_group_members", {"group_id": group_id}, token)
    
    async def remove_member(self, group_id: str, member_id: str, __user__: dict = {}) -> str:
        """
        Remove a member from a group.
        :param group_id: ID of the group
        :param member_id: ID of the member to remove
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_remove_member", {"group_id": group_id, "member_id": member_id}, token)

    async def who_is(self, name: str, __user__: dict = {}) -> str:
        """
        Find a person across all your groups and DMs.
        :param name: Name to search for
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_who_is", {"name": name}, token)

    # --- Block Tools ---

    async def list_blocks(self, user_id: str, __user__: dict = {}) -> str:
        """
        List users you have blocked.
        :param user_id: Your user ID (get from get_current_user)
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_list_blocks", {"user_id": user_id}, token)

    async def get_current_user(self, __user__: dict = {}) -> str:
        """
        Get your own user details.
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_get_current_user", {}, token)

    async def block_user(self, my_user_id: str, other_user_id: str, __user__: dict = {}) -> str:
        """
        Block a user.
        :param my_user_id: Your user ID (get from get_current_user)
        :param other_user_id: The ID of the person to block
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_block_user", {"user_id": my_user_id, "other_user_id": other_user_id}, token)

    async def unblock_user(self, my_user_id: str, other_user_id: str, __user__: dict = {}) -> str:
        """
        Unblock a user.
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_unblock_user", {"user_id": my_user_id, "other_user_id": other_user_id}, token)

    # --- Group Management ---

    async def list_former_groups(self, __user__: dict = {}) -> str:
        """
        List groups you have left.
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_list_former_groups", {}, token)

    async def rejoin_group(self, group_id: str, __user__: dict = {}) -> str:
        """
        Rejoin a group you previously left.
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_rejoin_group", {"group_id": group_id}, token)

    # --- Advanced / Missing Tools ---

    async def create_bot(self, name: str, group_id: str, callback_url: str = None, __user__: dict = {}) -> str:
        """
        Create a bot.
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_create_bot", {"name": name, "group_id": group_id, "callback_url": callback_url}, token)

    async def destroy_bot(self, bot_id: str, __user__: dict = {}) -> str:
        """
        Delete a bot.
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_destroy_bot", {"bot_id": bot_id}, token)

    async def update_group(self, group_id: str, name: str = None, description: str = None, image_url: str = None, share: bool = None, __user__: dict = {}) -> str:
        """
        Update a group's details.
        """
        token = self._get_token(__user__)
        args = {"group_id": group_id}
        if name: args["name"] = name
        if description: args["description"] = description
        if image_url: args["image_url"] = image_url
        if share is not None: args["share"] = share
        return await self._call_mcp("groupme_update_group", args, token)

    async def destroy_group(self, group_id: str, __user__: dict = {}) -> str:
        """
        Delete a group (if you are the owner).
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_destroy_group", {"group_id": group_id}, token)

    async def update_group_nickname(self, group_id: str, nickname: str, __user__: dict = {}) -> str:
        """
        Change your nickname in a specific group.
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_update_group_nickname", {"group_id": group_id, "nickname": nickname}, token)

    async def like_message(self, conversation_id: str, message_id: str, __user__: dict = {}) -> str:
        """
        Like a message.
        :param conversation_id: Group ID or Chat ID
        :param message_id: The ID of the message
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_like_message", {"conversation_id": conversation_id, "message_id": message_id}, token)

    async def unlike_message(self, conversation_id: str, message_id: str, __user__: dict = {}) -> str:
        """
        Unlike a message.
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_unlike_message", {"conversation_id": conversation_id, "message_id": message_id}, token)

    async def search_messages(self, group_id: str, query: str, __user__: dict = {}) -> str:
        """
        Search for messages in a group.
        """
        token = self._get_token(__user__)
        return await self._call_mcp("groupme_search_messages", {"group_id": group_id, "query": query}, token)

