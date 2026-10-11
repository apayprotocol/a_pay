"""OpenAI Function Calling & OpenAI Swarm Integration for A-Pay Protocol.

Enables OpenAI Assistants, Swarm Agents, and Chat Completions to execute
autonomous HTTP 402 micropayments on Base L2 when calling tools.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

from apay.client import APayClient, APaySession
from apay.wallet import AgentWallet


class APayOpenAITool:
    """Tool wrapper that generates OpenAI-compatible function calling schemas

    and auto-executes HTTP 402 payments using an AgentWallet.
    """

    def __init__(
        self,
        name: str,
        description: str,
        target_url: str,
        wallet: AgentWallet,
        method: str = "GET",
        parameters: dict[str, Any] | None = None,
        currency: str = "USDC",
        use_eip712: bool = True,
    ) -> None:
        self.name = name
        self.description = description
        self.target_url = target_url
        self.wallet = wallet
        self.method = method.upper()
        self.currency = currency.upper()
        self.use_eip712 = use_eip712

        self.parameters = parameters or {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Input parameter or query for the paid service",
                }
            },
            "required": [],
        }

    def to_openai_tool(self) -> dict[str, Any]:
        """Returns standard OpenAI Function Calling schema:

        {"type": "function", "function": {"name": ..., "description": ..., "parameters": ...}}
        """
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }

    def execute(self, arguments: dict[str, Any] | str | None = None) -> str:
        """Synchronously execute the paid call via APaySession with auto-negotiated 402 handling."""
        args_dict: dict[str, Any] = {}
        if isinstance(arguments, str):
            try:
                args_dict = json.loads(arguments) if arguments.strip() else {}
            except Exception:
                args_dict = {"query": arguments}
        elif isinstance(arguments, dict):
            args_dict = arguments

        query = str(args_dict.get("query", ""))
        session = APaySession(wallet=self.wallet, use_eip712=self.use_eip712)
        try:
            headers = {"X-APay-Preferred-Currency": self.currency}
            if self.method == "GET":
                params = {"q": query} if query else args_dict
                resp = session.get(self.target_url, params=params, headers=headers)
            else:
                payload = args_dict if args_dict else ({"query": query} if query else {})
                resp = session.post(self.target_url, json=payload, headers=headers)
            return resp.text
        finally:
            session.close()

    async def aexecute(self, arguments: dict[str, Any] | str | None = None) -> str:
        """Asynchronously execute the paid call via APayClient."""
        args_dict: dict[str, Any] = {}
        if isinstance(arguments, str):
            try:
                args_dict = json.loads(arguments) if arguments.strip() else {}
            except Exception:
                args_dict = {"query": arguments}
        elif isinstance(arguments, dict):
            args_dict = arguments

        query = str(args_dict.get("query", ""))
        client = APayClient(wallet=self.wallet, use_eip712=self.use_eip712)
        try:
            headers = {"X-APay-Preferred-Currency": self.currency}
            if self.method == "GET":
                params = {"q": query} if query else args_dict
                resp = await client.get(self.target_url, params=params, headers=headers)
            else:
                payload = args_dict if args_dict else ({"query": query} if query else {})
                resp = await client.post(self.target_url, json=payload, headers=headers)
            return resp.text
        finally:
            await client.aclose()

    def get_wallet_status(self) -> dict[str, Any]:
        """Returns the current spending state, limits, and active wallet address."""
        return {
            "address": self.wallet.address,
            "currency": self.currency,
            "spent_usdc": self.wallet.total_spent_usdc,
            "remaining_usdc": max(0.0, self.wallet.daily_budget_usdc - self.wallet.total_spent_usdc),
            "spent_apay": self.wallet.total_spent_apay,
            "remaining_apay": max(0.0, self.wallet.daily_budget_apay - self.wallet.total_spent_apay),
        }


def create_openai_tool(
    name: str,
    description: str,
    target_url: str,
    wallet: AgentWallet,
    method: str = "GET",
    parameters: dict[str, Any] | None = None,
    currency: str = "USDC",
    use_eip712: bool = True,
) -> APayOpenAITool:
    """Helper factory to create an APayOpenAITool instance."""
    return APayOpenAITool(
        name=name,
        description=description,
        target_url=target_url,
        wallet=wallet,
        method=method,
        parameters=parameters,
        currency=currency,
        use_eip712=use_eip712,
    )


def handle_openai_tool_call(
    tool_call: Any,
    tools: list[APayOpenAITool] | dict[str, APayOpenAITool] | APayOpenAITool,
) -> dict[str, Any]:
    """Processes an OpenAI tool_call and returns the tool response message

    ready to append to `messages`:
    {"role": "tool", "tool_call_id": tool_call.id, "content": ...}
    """
    call_id = getattr(tool_call, "id", None)
    if call_id is None and isinstance(tool_call, dict):
        call_id = tool_call.get("id")

    function_name = ""
    arguments_raw: Any = None
    if hasattr(tool_call, "function"):
        function_name = getattr(tool_call.function, "name", "")
        arguments_raw = getattr(tool_call.function, "arguments", "{}")
    elif isinstance(tool_call, dict) and "function" in tool_call:
        fn_dict = tool_call["function"]
        function_name = fn_dict.get("name", "")
        arguments_raw = fn_dict.get("arguments", "{}")

    # Locate tool
    selected_tool: APayOpenAITool | None = None
    if isinstance(tools, APayOpenAITool):
        selected_tool = tools
    elif isinstance(tools, dict):
        selected_tool = tools.get(function_name)
    elif isinstance(tools, list):
        for t in tools:
            if t.name == function_name:
                selected_tool = t
                break

    if not selected_tool:
        content = json.dumps({"error": f"Tool '{function_name}' not found in A-Pay toolkit"})
    else:
        content = selected_tool.execute(arguments_raw)

    return {
        "role": "tool",
        "tool_call_id": call_id or "call_unknown",
        "content": content,
    }


def create_swarm_tool(
    target_url: str,
    wallet: AgentWallet,
    name: str = "query_paid_api",
    description: str = "Fetches intelligence from an A-Pay HTTP 402 protected service",
    method: str = "GET",
    currency: str = "USDC",
) -> Callable[..., str]:
    """Generates a clean Python function with docstrings and type annotations

    for direct assignment to OpenAI Swarm agent `functions=[...]`.
    """
    tool_impl = APayOpenAITool(
        name=name,
        description=description,
        target_url=target_url,
        wallet=wallet,
        method=method,
        currency=currency,
    )

    def swarm_fn(query: str = "") -> str:
        """Call the paid API and negotiate HTTP 402 settlement automatically."""
        return tool_impl.execute({"query": query})

    swarm_fn.__name__ = name
    swarm_fn.__doc__ = description
    return swarm_fn
