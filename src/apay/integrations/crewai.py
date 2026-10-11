"""CrewAI Integration for A-Pay Protocol.

Enables CrewAI autonomous agents to seamlessly execute HTTP 402 micropayments
when accessing restricted data feeds or services.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from apay.client import APayClient, APaySession
from apay.wallet import AgentWallet

try:
    from crewai.tools import BaseTool as CrewAIBaseTool
except ImportError:  # pragma: no cover
    CrewAIBaseTool = None  # type: ignore[assignment, misc]


class APayCrewToolInput(BaseModel):
    """Input arguments schema for CrewAI tool execution."""

    query: str = Field(default="", description="Input or parameters passed to the paid API endpoint")


class _BaseCrewToolImpl(BaseModel):
    name: str
    description: str
    target_url: str
    wallet: AgentWallet
    method: str = "GET"
    use_eip712: bool = True
    currency: str = "USDC"
    model_config = ConfigDict(arbitrary_types_allowed=True)

    def _run(self, *args: Any, **kwargs: Any) -> str:
        """Synchronously call API with auto-negotiating HTTP 402 payments."""
        query = str(kwargs.get("query", args[0] if args else ""))
        session = APaySession(wallet=self.wallet, use_eip712=self.use_eip712)
        try:
            headers = {"X-APay-Preferred-Currency": self.currency}
            if self.method.upper() == "GET":
                params = {"q": query} if query else {}
                resp = session.get(self.target_url, params=params, headers=headers)
            else:
                payload = {"query": query} if query else {}
                resp = session.post(self.target_url, json=payload, headers=headers)
            return resp.text
        finally:
            session.close()

    async def _arun(self, *args: Any, **kwargs: Any) -> str:
        """Asynchronously call API with auto-negotiating HTTP 402 payments."""
        query = str(kwargs.get("query", args[0] if args else ""))
        client = APayClient(wallet=self.wallet, use_eip712=self.use_eip712)
        try:
            headers = {"X-APay-Preferred-Currency": self.currency}
            if self.method.upper() == "GET":
                params = {"q": query} if query else {}
                resp = await client.get(self.target_url, params=params, headers=headers)
            else:
                payload = {"query": query} if query else {}
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


if CrewAIBaseTool is not None:  # pragma: no cover

    class APayCrewTool(_BaseCrewToolImpl, CrewAIBaseTool):  # type: ignore[misc]
        args_schema: type[BaseModel] = APayCrewToolInput
else:

    class APayCrewTool(_BaseCrewToolImpl):  # type: ignore[no-redef]
        args_schema: type[BaseModel] = APayCrewToolInput


def create_crew_tool(
    name: str,
    description_or_url: str = "",
    target_url: str | AgentWallet | None = None,
    wallet: AgentWallet | None = None,
    method: str = "GET",
    use_eip712: bool = True,
    currency: str = "USDC",
    **kwargs: Any,
) -> APayCrewTool:
    """Factory helper to equip a CrewAI Agent with an A-Pay micropayment tool.

    Supports both (name, description, target_url, wallet) and (name, target_url, wallet) signatures.
    """
    final_desc = description_or_url
    final_url: str = str(target_url) if isinstance(target_url, str) else str(kwargs.get("target_url", ""))
    final_wallet: AgentWallet | None = wallet or kwargs.get("wallet")

    # If 2nd arg looks like a URL or 3rd arg is AgentWallet
    if isinstance(target_url, AgentWallet):
        final_wallet = target_url
        final_url = description_or_url
        final_desc = kwargs.get("description", f"A-Pay protected service {name}")
    elif description_or_url.startswith("http://") or description_or_url.startswith("https://"):
        if not final_url:
            final_url = description_or_url
            final_desc = kwargs.get("description", f"A-Pay protected service {name}")

    if not final_wallet:
        raise ValueError("AgentWallet must be provided to create_crew_tool.")

    return APayCrewTool(
        name=name,
        description=final_desc or f"A-Pay protected service {name}",
        target_url=final_url,
        wallet=final_wallet,
        method=method,
        use_eip712=use_eip712,
        currency=currency,
    )


# Alias for backwards and documentation compatibility
create_apay_crew_tool = create_crew_tool


def create_crew_economy_toolkit(
    wallet: AgentWallet,
    endpoints: dict[str, dict[str, Any]],
    currency: str = "USDC",
) -> list[APayCrewTool]:
    """Generates a toolkit of paid API tools for CrewAI multi-agent crews."""
    tools: list[APayCrewTool] = []
    for tool_name, config in endpoints.items():
        tools.append(
            create_crew_tool(
                name=tool_name,
                description=config.get("description", f"A-Pay protected service {tool_name}"),
                target_url=config["url"],
                wallet=wallet,
                method=config.get("method", "GET"),
                use_eip712=config.get("use_eip712", True),
                currency=currency,
            )
        )
    return tools
