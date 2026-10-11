"""LlamaIndex Integration for A-Pay Protocol.

Enables LlamaIndex query engines, agents, and RAG pipelines to query paid HTTP 402 data sources
and settle crypto micropayments autonomously on Base L2.
"""

from __future__ import annotations

from typing import Any

from apay.client import APaySession
from apay.wallet import AgentWallet

try:
    from llama_index.core.tools import FunctionTool as LlamaFunctionTool
except ImportError:  # pragma: no cover
    LlamaFunctionTool = None  # type: ignore[assignment, misc]


class APayLlamaIndexTool:
    """A-Pay micropayment tool wrapper for LlamaIndex pipelines."""

    def __init__(
        self,
        target_url: str,
        wallet: AgentWallet,
        name: str = "paid_data_reader",
        description: str = "Query paid knowledge base or API endpoint protected by A-Pay micropayments.",
        method: str = "GET",
        currency: str = "USDC",
        use_eip712: bool = True,
    ) -> None:
        self.target_url = target_url
        self.wallet = wallet
        self.name = name
        self.description = description
        self.method = method
        self.currency = currency
        self.use_eip712 = use_eip712

    def query(self, query_str: str = "") -> str:
        """Executes query and auto-handles HTTP 402 payment challenge."""
        session = APaySession(wallet=self.wallet, use_eip712=self.use_eip712)
        try:
            headers = {"X-APay-Preferred-Currency": self.currency}
            if self.method.upper() == "GET":
                params = {"q": query_str} if query_str else {}
                resp = session.get(self.target_url, params=params, headers=headers)
            else:
                payload = {"query": query_str} if query_str else {}
                resp = session.post(self.target_url, json=payload, headers=headers)
            return resp.text
        finally:
            session.close()

    def to_tool(self) -> Any:
        """Converts to a native LlamaIndex FunctionTool if llama-index is installed."""
        if LlamaFunctionTool is not None:  # pragma: no cover
            return LlamaFunctionTool.from_defaults(
                fn=self.query,
                name=self.name,
                description=self.description,
            )
        return self


def create_llamaindex_tool(
    target_url: str,
    wallet: AgentWallet,
    name: str = "paid_data_reader",
    description: str = "Query paid knowledge base or API endpoint protected by A-Pay micropayments.",
    method: str = "GET",
    currency: str = "USDC",
    use_eip712: bool = True,
) -> Any:
    """Factory helper to build a LlamaIndex-ready A-Pay tool."""
    wrapper = APayLlamaIndexTool(
        target_url=target_url,
        wallet=wallet,
        name=name,
        description=description,
        method=method,
        currency=currency,
        use_eip712=use_eip712,
    )
    return wrapper.to_tool()
