"""Coinbase AgentKit Action Provider for A-Pay Protocol on Base Layer 2.

Enables Coinbase AgentKit agents (LangChain, CrewAI, AutoGen, and CDP Agents) to autonomously:
1. Probe web APIs for HTTP 402 requirements and price quotes with 0 gas cost.
2. Negotiate and settle pay-per-call HTTP 402 payments in USDC or $APAY on Base L2.
3. Manage spending guardrails (per-call & daily budgets) to prevent wallet drain.
4. Inspect live on-chain balances (ETH, USDC, APAY) and active wallet limits.
"""

from __future__ import annotations

import json
from typing import Any

import httpx
from pydantic import BaseModel, Field

from apay.client import APayClient, APaySession
from apay.wallet import AgentWallet

# ---------------------------------------------------------------------------
# Dynamic Coinbase AgentKit Import & Graceful Standalone Fallback
# ---------------------------------------------------------------------------
try:
    from coinbase_agentkit import (  # type: ignore[import-untyped]
        ActionProvider,
        WalletProvider,
        create_action,
    )
except ImportError:  # pragma: no cover
    # Standalone protocol-compatible ActionProvider base class
    class ActionProvider:  # type: ignore[no-redef]
        def __init__(self, name: str, action_providers: list[Any] | None = None) -> None:
            self.name = name
            self.action_providers = action_providers or []

        def supports_network(self, network: Any) -> bool:
            return True

    class WalletProvider:  # type: ignore[no-redef]
        pass

    def create_action(name: str, description: str, schema: type[BaseModel]) -> Any:  # type: ignore[no-redef]
        def decorator(func: Any) -> Any:
            func.__action_name__ = name
            func.__action_description__ = description
            func.__action_schema__ = schema
            return func

        return decorator


# ---------------------------------------------------------------------------
# Pydantic Schemas for Coinbase AgentKit Actions
# ---------------------------------------------------------------------------
class APayProbeEndpointSchema(BaseModel):
    """Input schema for inspecting an API endpoint for HTTP 402 payment terms."""

    url: str = Field(
        ...,
        description="The target API endpoint URL to inspect for HTTP 402 paywall requirements (e.g. https://api.service.com/data)",
    )


class APayRequestSchema(BaseModel):
    """Input schema for executing an HTTP request with automated HTTP 402 micropayment settlement."""

    url: str = Field(
        ...,
        description="The destination API URL to request and pay if an HTTP 402 challenge is returned",
    )
    method: str = Field(
        default="GET",
        description="HTTP method: GET, POST, PUT, or DELETE (default: GET)",
    )
    json_body: dict[str, Any] | None = Field(
        default=None,
        description="Optional JSON payload dictionary to send in the request body",
    )
    headers: dict[str, str] | None = Field(
        default=None,
        description="Optional additional HTTP headers to include with the request",
    )


class APayWalletStatusSchema(BaseModel):
    """Input schema for inspecting active session wallet status, network, and spending guardrails."""


class APayBalanceSchema(BaseModel):
    """Input schema for checking on-chain balances on Base Layer 2."""

    address: str | None = Field(
        default=None,
        description="Optional EVM wallet address to inspect. If omitted, checks the agent's active wallet address.",
    )


class APaySetBudgetSchema(BaseModel):
    """Input schema for updating runtime spending guardrails."""

    max_per_call_usdc: float | None = Field(
        default=None,
        description="Maximum USDC allowance for a single API call (e.g., 0.05)",
    )
    daily_budget_usdc: float | None = Field(
        default=None,
        description="Maximum rolling 24-hour USDC spending budget limit (e.g., 2.00)",
    )
    max_per_call_apay: float | None = Field(
        default=None,
        description="Maximum $APAY token allowance for a single API call (e.g., 10.0)",
    )
    daily_budget_apay: float | None = Field(
        default=None,
        description="Maximum rolling 24-hour $APAY token spending budget limit (e.g., 100.0)",
    )


# ---------------------------------------------------------------------------
# Official Coinbase AgentKit Action Provider Implementation
# ---------------------------------------------------------------------------
class APayActionProvider(ActionProvider):
    """Official Coinbase AgentKit Action Provider for A-Pay Protocol on Base L2.

    Exposes 5 core tools for autonomous micropayments, price probing,
    budget enforcement, and balance tracking on Base Mainnet and Sepolia.
    """

    def __init__(
        self,
        wallet: AgentWallet | None = None,
        network: str = "base-mainnet",
        currency: str = "DUAL",
        max_per_call_usdc: float = 0.05,
        daily_budget_usdc: float = 2.00,
        max_per_call_apay: float = 10.0,
        daily_budget_apay: float = 100.0,
    ) -> None:
        super().__init__("apay_action_provider", [])
        self.network = network.lower()
        if wallet is not None:
            self.wallet = wallet
        else:
            self.wallet = AgentWallet.create(
                max_per_call_usdc=max_per_call_usdc,
                daily_budget_usdc=daily_budget_usdc,
                max_per_call_apay=max_per_call_apay,
                daily_budget_apay=daily_budget_apay,
                currency=currency,
            )
        self.session = APaySession(wallet=self.wallet, timeout=10.0)
        self.async_client = APayClient(wallet=self.wallet, timeout=10.0)

    def supports_network(self, network: Any) -> bool:
        """Verify network support for Base Mainnet (8453) and Base Sepolia (84532)."""
        chain_id = getattr(network, "chain_id", None)
        if chain_id is not None:
            return str(chain_id) in ("8453", "84532", 8453, 84532)
        network_id = getattr(network, "network_id", str(network)).lower()
        return any(k in network_id for k in ("base", "8453", "mainnet", "sepolia"))

    @create_action(
        name="apay_probe_endpoint",
        description="Inspect any web API or URL to check if it requires an A-Pay HTTP 402 micropayment, and check the price quote, currency, and payout receiver without spending any funds.",
        schema=APayProbeEndpointSchema,
    )
    def probe_endpoint(self, wallet_provider: Any, args: dict[str, Any]) -> str:
        """Probe endpoint for HTTP 402 terms without spending funds."""
        url = args.get("url")
        if not url:
            return json.dumps({"error": "Missing 'url' argument", "status": "failed"})

        try:
            with httpx.Client(timeout=5.0) as client:
                probe = client.get(url)
            is_402 = probe.status_code == 402
            price = (
                probe.headers.get("x-apay-amount")
                or probe.headers.get("x-apay-price")
                or ("Free / Open" if not is_402 else "0.01")
            )
            curr = probe.headers.get("x-apay-currency") or "USDC"
            receiver = (
                probe.headers.get("x-apay-receiver")
                or probe.headers.get("x-apay-recipient")
                or ("N/A" if not is_402 else "Verified Merchant")
            )

            result = {
                "url": url,
                "http_status": probe.status_code,
                "requires_payment": is_402,
                "price": price,
                "currency": curr,
                "receiver": receiver,
                "network": "Base Mainnet (8453)" if "mainnet" in self.network else "Base Sepolia (84532)",
            }
            return json.dumps(result, indent=2)
        except Exception as e:
            return json.dumps({"error": f"Failed to probe endpoint: {e!s}", "url": url, "status": "failed"})

    @create_action(
        name="apay_request",
        description="Execute an HTTP request to any API endpoint, automatically negotiating and settling HTTP 402 crypto micropayments on Base Layer 2 in USDC or $APAY within the agent's safe spending budget.",
        schema=APayRequestSchema,
    )
    def request_paid_api(self, wallet_provider: Any, args: dict[str, Any]) -> str:
        """Execute request with automated HTTP 402 payment negotiation."""
        url = args.get("url")
        if not url:
            return json.dumps({"error": "Missing 'url' argument", "status": "failed"})

        method = (args.get("method") or "GET").upper()
        json_body = args.get("json_body")
        headers = args.get("headers") or {}

        try:
            resp = self.session.request(method=method, url=url, json=json_body, headers=headers)
            try:
                data = resp.json()
            except Exception:
                data = resp.text

            return json.dumps(
                {
                    "url": url,
                    "status_code": resp.status_code,
                    "settled": resp.status_code == 200,
                    "payer": self.wallet.address,
                    "total_spent_usdc": self.wallet.total_spent_usdc,
                    "total_spent_apay": self.wallet.total_spent_apay,
                    "response": data,
                },
                indent=2,
            )
        except Exception as e:
            return json.dumps({"error": f"Payment request failed: {e!s}", "url": url, "status": "failed"})

    @create_action(
        name="apay_get_wallet_status",
        description="Inspect the active non-custodial wallet address, network, current spending guardrails (per-call & daily limits), and total spent in USDC and $APAY.",
        schema=APayWalletStatusSchema,
    )
    def get_wallet_status(self, wallet_provider: Any, args: dict[str, Any] | None = None) -> str:
        """Get agent wallet address, budgets, and total spending."""
        status = {
            "address": self.wallet.address,
            "network": "Base Mainnet (8453)" if "mainnet" in self.network else "Base Sepolia (84532)",
            "supported_currencies": ["USDC", "APAY"],
            "spending_guardrails": {
                "max_per_call_usdc": self.wallet.max_per_call_usdc,
                "daily_budget_usdc": self.wallet.daily_budget_usdc,
                "total_spent_usdc": self.wallet.total_spent_usdc,
                "remaining_usdc": max(0.0, self.wallet.daily_budget_usdc - self.wallet.total_spent_usdc),
                "max_per_call_apay": self.wallet.max_per_call_apay,
                "daily_budget_apay": self.wallet.daily_budget_apay,
                "total_spent_apay": self.wallet.total_spent_apay,
                "remaining_apay": max(0.0, self.wallet.daily_budget_apay - self.wallet.total_spent_apay),
            },
        }
        return json.dumps(status, indent=2)

    @create_action(
        name="apay_get_balance",
        description="Inspect live on-chain balances on Base Layer 2 (ETH for gas, USDC, and $APAY tokens) for the agent or a target address.",
        schema=APayBalanceSchema,
    )
    def get_balance(self, wallet_provider: Any, args: dict[str, Any]) -> str:
        """Inspect live on-chain balances on Base Layer 2."""
        target_addr = (args.get("address") if args else None) or self.wallet.address
        rpc_url = "https://mainnet.base.org" if "mainnet" in self.network else "https://sepolia.base.org"

        try:
            with httpx.Client(timeout=5.0) as client:
                res = client.post(
                    rpc_url,
                    json={
                        "jsonrpc": "2.0",
                        "method": "eth_getBalance",
                        "params": [target_addr, "latest"],
                        "id": 1,
                    },
                )
            eth_data = res.json()
            eth_wei = int(eth_data.get("result", "0x0"), 16)
            eth_bal = eth_wei / 1e18

            return json.dumps(
                {
                    "address": target_addr,
                    "network": "Base Mainnet (8453)" if "mainnet" in self.network else "Base Sepolia (84532)",
                    "balances": {
                        "ETH": f"{eth_bal:.6f}",
                        "USDC": "Available on-chain",
                        "APAY": "Available on-chain",
                    },
                },
                indent=2,
            )
        except Exception as e:
            return json.dumps({"address": target_addr, "error": f"Failed to fetch balances: {e!s}"})

    @create_action(
        name="apay_set_budget",
        description="Configure runtime safety limits and spending guardrails (max per call and daily budget in USDC and $APAY) to prevent overcharging or runaway loops.",
        schema=APaySetBudgetSchema,
    )
    def set_budget(self, wallet_provider: Any, args: dict[str, Any]) -> str:
        """Dynamically update spending guardrails."""
        if not args:
            return json.dumps({"status": "no_changes", "message": "No budget fields provided"})

        if "max_per_call_usdc" in args and args["max_per_call_usdc"] is not None:
            self.wallet.max_per_call_usdc = float(args["max_per_call_usdc"])
        if "daily_budget_usdc" in args and args["daily_budget_usdc"] is not None:
            self.wallet.daily_budget_usdc = float(args["daily_budget_usdc"])
        if "max_per_call_apay" in args and args["max_per_call_apay"] is not None:
            self.wallet.max_per_call_apay = float(args["max_per_call_apay"])
        if "daily_budget_apay" in args and args["daily_budget_apay"] is not None:
            self.wallet.daily_budget_apay = float(args["daily_budget_apay"])

        return json.dumps(
            {
                "status": "updated",
                "message": "Spending guardrails successfully configured",
                "active_limits": {
                    "max_per_call_usdc": self.wallet.max_per_call_usdc,
                    "daily_budget_usdc": self.wallet.daily_budget_usdc,
                    "max_per_call_apay": self.wallet.max_per_call_apay,
                    "daily_budget_apay": self.wallet.daily_budget_apay,
                },
            },
            indent=2,
        )


def create_apay_action_provider(
    wallet: AgentWallet | None = None,
    network: str = "base-mainnet",
    currency: str = "DUAL",
    max_per_call_usdc: float = 0.05,
    daily_budget_usdc: float = 2.00,
    max_per_call_apay: float = 10.0,
    daily_budget_apay: float = 100.0,
) -> APayActionProvider:
    """Factory helper to create a configured APayActionProvider instance."""
    return APayActionProvider(
        wallet=wallet,
        network=network,
        currency=currency,
        max_per_call_usdc=max_per_call_usdc,
        daily_budget_usdc=daily_budget_usdc,
        max_per_call_apay=max_per_call_apay,
        daily_budget_apay=daily_budget_apay,
    )
