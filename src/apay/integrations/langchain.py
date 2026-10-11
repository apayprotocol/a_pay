"""LangChain Integration for A-Pay Protocol.

Provides drop-in tools and requests wrappers enabling LangChain AI agents
to autonomously navigate HTTP 402 payment-gated APIs using AgentWallet.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from apay.client import APayClient, APaySession
from apay.wallet import AgentWallet

try:
    from langchain_core.tools import BaseTool as LangchainBaseTool
except ImportError:  # pragma: no cover
    LangchainBaseTool = None  # type: ignore[assignment, misc]


class APayRequestsWrapper:
    """Drop-in HTTP client wrapper for LangChain with automated HTTP 402 negotiation."""

    def __init__(self, wallet: AgentWallet, use_eip712: bool = True, timeout: float = 30.0) -> None:
        self.wallet = wallet
        self.session = APaySession(wallet=wallet, timeout=timeout, use_eip712=use_eip712)
        self.async_client = APayClient(wallet=wallet, timeout=timeout, use_eip712=use_eip712)

    def get(self, url: str, **kwargs: Any) -> str:
        """Synchronously execute GET request, auto-negotiating HTTP 402 if challenged."""
        resp = self.session.get(url, **kwargs)
        return resp.text

    def post(self, url: str, **kwargs: Any) -> str:
        """Synchronously execute POST request, auto-negotiating HTTP 402 if challenged."""
        resp = self.session.post(url, **kwargs)
        return resp.text

    async def aget(self, url: str, **kwargs: Any) -> str:
        """Asynchronously execute GET request, auto-negotiating HTTP 402 if challenged."""
        resp = await self.async_client.get(url, **kwargs)
        return resp.text

    async def apost(self, url: str, **kwargs: Any) -> str:
        """Asynchronously execute POST request, auto-negotiating HTTP 402 if challenged."""
        resp = await self.async_client.post(url, **kwargs)
        return resp.text

    def close(self) -> None:
        self.session.close()

    async def aclose(self) -> None:
        await self.async_client.aclose()


class APayToolInput(BaseModel):
    """Input arguments for invoking an A-Pay gated tool."""

    query: str = Field(default="", description="Query string or instructions to pass to the endpoint")


class _BaseToolImpl(BaseModel):
    name: str
    description: str
    target_url: str
    wallet: AgentWallet
    method: str = "GET"
    use_eip712: bool = True
    currency: str = "USDC"
    model_config = ConfigDict(arbitrary_types_allowed=True)

    def _execute(self, query: str = "") -> str:
        session = APaySession(wallet=self.wallet, use_eip712=self.use_eip712)
        try:
            url = self.target_url
            headers = {"X-APay-Preferred-Currency": self.currency}
            if self.method.upper() == "GET":
                params = {"q": query} if query else {}
                resp = session.get(url, params=params, headers=headers)
            else:
                payload = {"query": query} if query else {}
                resp = session.post(url, json=payload, headers=headers)
            return resp.text
        finally:
            session.close()

    async def _aexecute(self, query: str = "") -> str:
        client = APayClient(wallet=self.wallet, use_eip712=self.use_eip712)
        try:
            url = self.target_url
            headers = {"X-APay-Preferred-Currency": self.currency}
            if self.method.upper() == "GET":
                params = {"q": query} if query else {}
                resp = await client.get(url, params=params, headers=headers)
            else:
                payload = {"query": query} if query else {}
                resp = await client.post(url, json=payload, headers=headers)
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

    def run(self, tool_input: str | dict[str, Any] = "") -> str:
        q = tool_input if isinstance(tool_input, str) else str(tool_input.get("query", ""))
        return self._execute(query=q)

    def _run(self, *args: Any, **kwargs: Any) -> str:
        q = str(kwargs.get("query", args[0] if args else ""))
        return self._execute(query=q)

    async def _arun(self, *args: Any, **kwargs: Any) -> str:
        q = str(kwargs.get("query", args[0] if args else ""))
        return await self._aexecute(query=q)


if LangchainBaseTool is not None:  # pragma: no cover

    class APayTool(_BaseToolImpl, LangchainBaseTool):  # type: ignore[misc]
        args_schema: type[BaseModel] = APayToolInput
else:

    class APayTool(_BaseToolImpl):  # type: ignore[no-redef]
        args_schema: type[BaseModel] = APayToolInput


def create_apay_tool(
    name: str,
    description: str,
    target_url: str,
    wallet: AgentWallet,
    method: str = "GET",
    use_eip712: bool = True,
    currency: str = "USDC",
) -> APayTool:
    """Convenience factory to create a LangChain-compatible tool for an HTTP 402 API."""
    return APayTool(
        name=name,
        description=description,
        target_url=target_url,
        wallet=wallet,
        method=method,
        use_eip712=use_eip712,
        currency=currency,
    )
