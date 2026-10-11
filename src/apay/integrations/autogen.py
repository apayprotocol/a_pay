"""Microsoft AutoGen Integration for A-Pay Protocol.

Enables AutoGen ConversableAgents and multi-agent conversations to autonomously
negotiate and settle HTTP 402 micro-payments on Base L2.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from apay.client import APaySession
from apay.wallet import AgentWallet


class APayAutoGenToolkit:
    """Manages A-Pay micro-payment tools for AutoGen multi-agent workflows."""

    def __init__(self, wallet: AgentWallet, currency: str = "USDC", use_eip712: bool = True) -> None:
        self.wallet = wallet
        self.currency = currency
        self.use_eip712 = use_eip712

    def create_paid_query_function(
        self,
        target_url: str,
        method: str = "GET",
    ) -> Callable[[str], str]:
        """Creates a standalone typed Python function suitable for AutoGen function calling."""

        def query_paid_api(query: str = "") -> str:
            """Query a premium HTTP 402 API, automatically settling payments via A-Pay."""
            session = APaySession(wallet=self.wallet, use_eip712=self.use_eip712)
            try:
                headers = {"X-APay-Preferred-Currency": self.currency}
                if method.upper() == "GET":
                    params = {"q": query} if query else {}
                    resp = session.get(target_url, params=params, headers=headers)
                else:
                    payload = {"query": query} if query else {}
                    resp = session.post(target_url, json=payload, headers=headers)
                return resp.text
            finally:
                session.close()

        return query_paid_api

    def get_wallet_status(self) -> dict[str, Any]:
        """Inspect the current spending state, limits, and active wallet address."""
        return {
            "address": self.wallet.address,
            "currency": self.currency,
            "spent_usdc": self.wallet.total_spent_usdc,
            "remaining_usdc": max(0.0, self.wallet.daily_budget_usdc - self.wallet.total_spent_usdc),
            "spent_apay": self.wallet.total_spent_apay,
            "remaining_apay": max(0.0, self.wallet.daily_budget_apay - self.wallet.total_spent_apay),
        }

    def register(
        self,
        assistant: Any,
        user_proxy: Any,
        target_url: str,
        name: str = "query_paid_service",
        description: str = "Fetch verified information from a paid A-Pay HTTP 402 data provider",
        method: str = "GET",
    ) -> None:
        """Registers the tool with both AutoGen Assistant and UserProxyAgent if available."""
        fn = self.create_paid_query_function(target_url=target_url, method=method)

        # AutoGen v0.2 / v0.4 function registration pattern
        if hasattr(assistant, "register_for_llm") and hasattr(user_proxy, "register_for_execution"):
            decorator_llm = assistant.register_for_llm(name=name, description=description)
            decorator_exec = user_proxy.register_for_execution(name=name)
            decorator_llm(fn)
            decorator_exec(fn)
        elif hasattr(user_proxy, "register_function"):
            user_proxy.register_function(
                function_map={name: fn},
            )


def create_autogen_payment_tool(
    target_url: str,
    wallet: AgentWallet,
    method: str = "GET",
    currency: str = "USDC",
    use_eip712: bool = True,
) -> Callable[[str], str]:
    """Convenience helper to create an AutoGen-ready tool function."""
    toolkit = APayAutoGenToolkit(wallet=wallet, currency=currency, use_eip712=use_eip712)
    return toolkit.create_paid_query_function(target_url=target_url, method=method)
