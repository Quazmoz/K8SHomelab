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

    async def list_groups(self, __user_valves__: UserValves) -> str:
        """
        List your GroupMe groups to get group_id.
        :param __user_valves__: User configuration
        """
        return await self._call_mcp("groupme_list_groups", {}, __user_valves__.GROUPME_TOKEN)

    async def list_messages(self, group_id: str, __user_valves__: UserValves) -> str:
        """
        List messages from a group.
        :param group_id: The ID of the group
        """
        return await self._call_mcp("groupme_list_messages", {"group_id": group_id}, __user_valves__.GROUPME_TOKEN)

    async def send_message(self, group_id: str, text: str, __user_valves__: UserValves) -> str:
        """
        Send a message to a group.
        :param group_id: The ID of the group
        :param text: The content of the message
        """
        return await self._call_mcp("groupme_send_message", {"group_id": group_id, "text": text}, __user_valves__.GROUPME_TOKEN)

    async def list_polls(self, group_id: str, __user_valves__: UserValves, status: str = "active") -> str:
        """
        List polls in a group.
        :param group_id: The ID of the group
        :param status: Filter by 'active', 'past', or 'all'
        """
        return await self._call_mcp("groupme_list_polls", {"group_id": group_id, "status": status}, __user_valves__.GROUPME_TOKEN)

    async def create_poll(self, group_id: str, subject: str, options: str, __user_valves__: UserValves) -> str:
        """
        Create a new poll.
        :param group_id: The ID of the group
        :param subject: The question to ask
        :param options: Comma-separated list of options (e.g. "Yes,No,Maybe")
        """
        return await self._call_mcp("groupme_create_poll", {"group_id": group_id, "subject": subject, "options": options}, __user_valves__.GROUPME_TOKEN)

    async def get_poll(self, group_id: str, poll_id: str, __user_valves__: UserValves) -> str:
        """
        Get details of a specific poll.
        :param group_id: The ID of the group
        :param poll_id: The ID of the poll
        """
        return await self._call_mcp("groupme_get_poll", {"group_id": group_id, "poll_id": poll_id}, __user_valves__.GROUPME_TOKEN)

    # --- DM Tools ---

    async def list_chats(self, __user_valves__: UserValves) -> str:
        """
        List your direct message conversations.
        """
        return await self._call_mcp("groupme_list_chats", {}, __user_valves__.GROUPME_TOKEN)

    async def list_dm_messages(self, other_user_id: str, __user_valves__: UserValves) -> str:
        """
        Get messages from a DM conversation.
        :param other_user_id: The user ID of the other person
        """
        return await self._call_mcp("groupme_list_dm_messages", {"other_user_id": other_user_id}, __user_valves__.GROUPME_TOKEN)

    async def send_dm(self, recipient_id: str, text: str, __user_valves__: UserValves) -> str:
        """
        Send a direct message.
        :param recipient_id: The user ID to send to
        :param text: Message text
        """
        return await self._call_mcp("groupme_send_dm", {"recipient_id": recipient_id, "text": text}, __user_valves__.GROUPME_TOKEN)

    # --- Bot Tools ---

    async def list_bots(self, __user_valves__: UserValves) -> str:
        """
        List all your bots.
        """
        return await self._call_mcp("groupme_list_bots", {}, __user_valves__.GROUPME_TOKEN)

    async def post_bot_message(self, bot_id: str, text: str, __user_valves__: UserValves) -> str:
        """
        Post a message as a bot.
        :param bot_id: The ID of the bot
        :param text: Message text
        """
        return await self._call_mcp("groupme_post_bot_message", {"bot_id": bot_id, "text": text}, __user_valves__.GROUPME_TOKEN)

    # --- Member Tools ---

    async def list_group_members(self, group_id: str, __user_valves__: UserValves) -> str:
        """
        List members of a group.
        :param group_id: ID of the group
        """
        return await self._call_mcp("groupme_list_group_members", {"group_id": group_id}, __user_valves__.GROUPME_TOKEN)
    
    async def remove_member(self, group_id: str, member_id: str, __user_valves__: UserValves) -> str:
        """
        Remove a member from a group.
        :param group_id: ID of the group
        :param member_id: ID of the member to remove
        """
        return await self._call_mcp("groupme_remove_member", {"group_id": group_id, "member_id": member_id}, __user_valves__.GROUPME_TOKEN)

    async def who_is(self, name: str, __user_valves__: UserValves) -> str:
        """
        Find a person across all your groups and DMs.
        :param name: Name to search for
        """
        return await self._call_mcp("groupme_who_is", {"name": name}, __user_valves__.GROUPME_TOKEN)

    # --- Block Tools ---

    async def list_blocks(self, user_id: str, __user_valves__: UserValves) -> str:
        """
        List users you have blocked.
        :param user_id: Your user ID (get from get_current_user)
        """
        return await self._call_mcp("groupme_list_blocks", {"user_id": user_id}, __user_valves__.GROUPME_TOKEN)

    async def get_current_user(self, __user_valves__: UserValves) -> str:
        """
        Get your own user details.
        """
        return await self._call_mcp("groupme_get_current_user", {}, __user_valves__.GROUPME_TOKEN)

    async def block_user(self, my_user_id: str, other_user_id: str, __user_valves__: UserValves) -> str:
        """
        Block a user.
        :param my_user_id: Your user ID (get from get_current_user)
        :param other_user_id: The ID of the person to block
        """
        return await self._call_mcp("groupme_block_user", {"user_id": my_user_id, "other_user_id": other_user_id}, __user_valves__.GROUPME_TOKEN)

    async def unblock_user(self, my_user_id: str, other_user_id: str, __user_valves__: UserValves) -> str:
        """
        Unblock a user.
        """
        return await self._call_mcp("groupme_unblock_user", {"user_id": my_user_id, "other_user_id": other_user_id}, __user_valves__.GROUPME_TOKEN)

    # --- Group Management ---

    async def list_former_groups(self, __user_valves__: UserValves) -> str:
        """
        List groups you have left.
        """
        return await self._call_mcp("groupme_list_former_groups", {}, __user_valves__.GROUPME_TOKEN)

    async def rejoin_group(self, group_id: str, __user_valves__: UserValves) -> str:
        """
        Rejoin a group you previously left.
        """
        return await self._call_mcp("groupme_rejoin_group", {"group_id": group_id}, __user_valves__.GROUPME_TOKEN)

    # --- Advanced / Missing Tools ---

    async def create_bot(self, name: str, group_id: str, __user_valves__: UserValves, callback_url: str = None) -> str:
        """
        Create a bot.
        """
        return await self._call_mcp("groupme_create_bot", {"name": name, "group_id": group_id, "callback_url": callback_url}, __user_valves__.GROUPME_TOKEN)

    async def destroy_bot(self, bot_id: str, __user_valves__: UserValves) -> str:
        """
        Delete a bot.
        """
        return await self._call_mcp("groupme_destroy_bot", {"bot_id": bot_id}, __user_valves__.GROUPME_TOKEN)

    async def update_group(self, group_id: str, __user_valves__: UserValves, name: str = None, description: str = None, image_url: str = None, share: bool = None) -> str:
        """
        Update a group's details.
        """
        args = {"group_id": group_id}
        if name: args["name"] = name
        if description: args["description"] = description
        if image_url: args["image_url"] = image_url
        if share is not None: args["share"] = share
        return await self._call_mcp("groupme_update_group", args, __user_valves__.GROUPME_TOKEN)

    async def destroy_group(self, group_id: str, __user_valves__: UserValves) -> str:
        """
        Delete a group (if you are the owner).
        """
        return await self._call_mcp("groupme_destroy_group", {"group_id": group_id}, __user_valves__.GROUPME_TOKEN)

    async def update_group_nickname(self, group_id: str, nickname: str, __user_valves__: UserValves) -> str:
        """
        Change your nickname in a specific group.
        """
        return await self._call_mcp("groupme_update_group_nickname", {"group_id": group_id, "nickname": nickname}, __user_valves__.GROUPME_TOKEN)

    async def like_message(self, conversation_id: str, message_id: str, __user_valves__: UserValves) -> str:
        """
        Like a message.
        :param conversation_id: Group ID or Chat ID
        :param message_id: The ID of the message
        """
        return await self._call_mcp("groupme_like_message", {"conversation_id": conversation_id, "message_id": message_id}, __user_valves__.GROUPME_TOKEN)

    async def unlike_message(self, conversation_id: str, message_id: str, __user_valves__: UserValves) -> str:
        """
        Unlike a message.
        """
        return await self._call_mcp("groupme_unlike_message", {"conversation_id": conversation_id, "message_id": message_id}, __user_valves__.GROUPME_TOKEN)

    async def search_messages(self, group_id: str, query: str, __user_valves__: UserValves) -> str:
        """
        Search for messages in a group.
        """
        return await self._call_mcp("groupme_search_messages", {"group_id": group_id, "query": query}, __user_valves__.GROUPME_TOKEN)
