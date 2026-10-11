"""
Model Context Protocol (MCP) Server for A-Pay Protocol
Enables autonomous AI agents (Claude Desktop, Cursor, Antigravity, etc.)
to discover, inspect, and pay for HTTP 402 protected APIs on the fly.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any

from . import __version__
from .client import APaySession
from .wallet import AgentWallet


class APayMCPServer:
    """Standard Model Context Protocol (MCP) stdio server for A-Pay."""

    def __init__(self, wallet: AgentWallet | None = None) -> None:
        network = os.getenv("APAY_NETWORK", "base-mainnet").lower()
        self.chain_id = 8453 if "mainnet" in network else 84532
        self.network_name = "Base Mainnet" if self.chain_id == 8453 else "Base Sepolia Testnet"
        self.rpc_urls = (
            ["https://mainnet.base.org", "https://base-rpc.publicnode.com"]
            if self.chain_id == 8453
            else ["https://sepolia.base.org", "https://base-sepolia-rpc.publicnode.com"]
        )
        self.usdc_address = (
            "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
            if self.chain_id == 8453
            else "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
        )
        self.apay_address = (
            "0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3"
            if self.chain_id == 8453
            else "0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3"
        )

        if wallet is not None:
            self.wallet = wallet
        else:
            pk = os.getenv("APAY_PRIVATE_KEY")
            max_call = float(os.getenv("APAY_MAX_PER_CALL", "0.05"))
            daily = float(os.getenv("APAY_DAILY_BUDGET", "2.0"))
            max_call_apay = float(os.getenv("APAY_MAX_PER_CALL_APAY", "10.0"))
            daily_apay = float(os.getenv("APAY_DAILY_BUDGET_APAY", "100.0"))
            currency = os.getenv("APAY_CURRENCY", "DUAL")
            if pk:
                self.wallet = AgentWallet.from_private_key(
                    private_key=pk,
                    max_per_call_usdc=max_call,
                    daily_budget_usdc=daily,
                    max_per_call_apay=max_call_apay,
                    daily_budget_apay=daily_apay,
                    currency=currency,
                )
            else:
                self.wallet = AgentWallet.create(
                    max_per_call_usdc=max_call,
                    daily_budget_usdc=daily,
                )
                self.wallet.max_per_call_apay = max_call_apay
                self.wallet.daily_budget_apay = daily_apay
                self.wallet.currency = currency.upper()
        self.session = APaySession(self.wallet)

    def _call_rpc(self, method: str, params: list[Any]) -> Any:
        """Call JSON-RPC with multi-endpoint fallback."""
        import httpx

        payload = {"jsonrpc": "2.0", "method": method, "params": params, "id": 1}
        for endpoint in self.rpc_urls:
            try:
                with httpx.Client(timeout=6.0) as client:
                    resp = client.post(endpoint, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        if "result" in data:
                            return data["result"]
            except Exception:
                continue
        return None

    def _fetch_onchain_balances(self) -> dict[str, Any]:
        """Fetches live on-chain balances for ETH, USDC, and $APAY tokens."""
        # 1. Native ETH balance
        eth_bal_hex = self._call_rpc("eth_getBalance", [self.wallet.address, "latest"])
        eth_wei = int(eth_bal_hex, 16) if eth_bal_hex else 0
        eth_bal = eth_wei / 1e18

        # 2. USDC balance (balanceOf selector 0x70a08231)
        addr_padded = self.wallet.address[2:].lower().zfill(64)
        balance_of_data = "0x70a08231" + addr_padded

        usdc_res_hex = self._call_rpc(
            "eth_call", [{"to": self.usdc_address, "data": balance_of_data}, "latest"]
        )
        usdc_base = int(usdc_res_hex, 16) if usdc_res_hex and usdc_res_hex != "0x" else 0
        usdc_bal = usdc_base / 1e6

        # 3. APAY balance
        apay_res_hex = self._call_rpc(
            "eth_call", [{"to": self.apay_address, "data": balance_of_data}, "latest"]
        )
        apay_base = int(apay_res_hex, 16) if apay_res_hex and apay_res_hex != "0x" else 0
        apay_bal = apay_base / 1e18

        return {
            "wallet_address": self.wallet.address,
            "network": f"Base L2 ({self.network_name} - Chain ID: {self.chain_id})",
            "balances": {
                "native_eth": f"{eth_bal:.6f} ETH",
                "usdc": f"{usdc_bal:.4f} USDC",
                "apay": f"{apay_bal:,.2f} $APAY",
            },
            "status": "Solvent" if (usdc_bal > 0 or apay_bal > 0) else "Needs Deposit",
        }

    def get_tool_definitions(self) -> list[dict[str, Any]]:
        """Returns MCP-compliant tool specifications."""
        return [
            {
                "name": "apay_request",
                "description": (
                    "Make an HTTP request (GET, POST, etc.) to any API or website. "
                    "If the endpoint returns an HTTP 402 Payment Required challenge, "
                    "A-Pay automatically signs the cryptographic payment authorization "
                    "within your budget limits and unlocks the data in <25ms."
                ),
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "url": {
                            "type": "string",
                            "description": "Target endpoint URL to fetch or query",
                        },
                        "method": {
                            "type": "string",
                            "enum": ["GET", "POST", "PUT", "DELETE"],
                            "default": "GET",
                            "description": "HTTP request method (default: GET)",
                        },
                        "json_body": {
                            "type": "object",
                            "description": "Optional JSON payload for POST/PUT requests",
                        },
                        "headers": {
                            "type": "object",
                            "description": "Optional additional HTTP headers",
                        },
                    },
                    "required": ["url"],
                },
            },
            {
                "name": "apay_get_wallet_status",
                "description": (
                    "Inspect the agent's active non-custodial wallet address, "
                    "current spending guardrails, and total spent in USDC and $APAY."
                ),
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                },
            },
            {
                "name": "apay_set_budget",
                "description": (
                    "Configure agent safety invariants and spending guardrails. "
                    "Prevents runaway loops or overcharging."
                ),
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "max_per_call_usdc": {
                            "type": "number",
                            "description": "Maximum USDC allowance for a single API call",
                        },
                        "daily_budget_usdc": {
                            "type": "number",
                            "description": "Maximum USDC rolling 24-hour spending budget",
                        },
                        "max_per_call_apay": {
                            "type": "number",
                            "description": "Maximum $APAY token allowance for a single API call",
                        },
                        "daily_budget_apay": {
                            "type": "number",
                            "description": "Maximum $APAY token rolling 24-hour spending budget",
                        },
                    },
                },
            },
            {
                "name": "apay_inspect_endpoint",
                "description": (
                    "Inspect an endpoint to check if it requires an A-Pay micropayment, "
                    "inspect the exact price quote, currency, and payout receiver without spending any funds."
                ),
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "url": {
                            "type": "string",
                            "description": "The URL to probe for HTTP 402 payment requirements",
                        },
                    },
                    "required": ["url"],
                },
            },
            {
                "name": "apay_get_balance",
                "description": (
                    "Inspect the agent's live on-chain balances on Base Layer 2, "
                    "including native ETH (for gas), USDC, and $APAY tokens."
                ),
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                },
            },
        ]

    def handle_tool_call(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Executes the tool call and returns the MCP content format."""
        try:
            if name == "apay_request":
                url = arguments.get("url")
                if not url:
                    return {"isError": True, "content": [{"type": "text", "text": "Missing 'url' argument"}]}
                method = arguments.get("method", "GET").upper()
                json_body = arguments.get("json_body")
                headers = arguments.get("headers", {})

                if method == "POST":
                    resp = self.session.post(url, json=json_body, headers=headers)
                elif method == "PUT":
                    resp = self.session.put(url, json=json_body, headers=headers)
                elif method == "DELETE":
                    resp = self.session.delete(url, headers=headers)
                else:
                    resp = self.session.get(url, headers=headers)

                settled = resp.headers.get("X-APay-Settled") == "true"
                result_data = {
                    "status_code": resp.status_code,
                    "settled_via_apay": settled,
                    "headers": {
                        k: v
                        for k, v in resp.headers.items()
                        if k.lower().startswith("x-apay") or k.lower() == "content-type"
                    },
                    "body": resp.text,
                }
                return {"content": [{"type": "text", "text": json.dumps(result_data, indent=2)}]}

            elif name == "apay_get_balance":
                balances = self._fetch_onchain_balances()
                return {"content": [{"type": "text", "text": json.dumps(balances, indent=2)}]}

            elif name == "apay_get_wallet_status":
                status = {
                    "wallet_address": self.wallet.address,
                    "network": f"Base L2 ({self.network_name} - Chain ID: {self.chain_id})",
                    "guardrails": {
                        "usdc": {
                            "max_per_call": self.wallet.max_per_call_usdc,
                            "daily_budget": self.wallet.daily_budget_usdc,
                            "total_spent": self.wallet.total_spent_usdc,
                            "remaining_budget": max(
                                0.0, self.wallet.daily_budget_usdc - self.wallet.total_spent_usdc
                            ),
                        },
                        "apay": {
                            "max_per_call": self.wallet.max_per_call_apay,
                            "daily_budget": self.wallet.daily_budget_apay,
                            "total_spent": self.wallet.total_spent_apay,
                            "remaining_budget": max(
                                0.0, self.wallet.daily_budget_apay - self.wallet.total_spent_apay
                            ),
                        },
                    },
                }
                return {"content": [{"type": "text", "text": json.dumps(status, indent=2)}]}

            elif name == "apay_set_budget":
                updated = {}
                if "max_per_call_usdc" in arguments and arguments["max_per_call_usdc"] is not None:
                    self.wallet.max_per_call_usdc = float(arguments["max_per_call_usdc"])
                    updated["max_per_call_usdc"] = self.wallet.max_per_call_usdc
                if "daily_budget_usdc" in arguments and arguments["daily_budget_usdc"] is not None:
                    self.wallet.daily_budget_usdc = float(arguments["daily_budget_usdc"])
                    updated["daily_budget_usdc"] = self.wallet.daily_budget_usdc
                if "max_per_call_apay" in arguments and arguments["max_per_call_apay"] is not None:
                    self.wallet.max_per_call_apay = float(arguments["max_per_call_apay"])
                    updated["max_per_call_apay"] = self.wallet.max_per_call_apay
                if "daily_budget_apay" in arguments and arguments["daily_budget_apay"] is not None:
                    self.wallet.daily_budget_apay = float(arguments["daily_budget_apay"])
                    updated["daily_budget_apay"] = self.wallet.daily_budget_apay

                return {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(
                                {"status": "success", "updated_guardrails": updated}, indent=2
                            ),
                        }
                    ]
                }

            elif name == "apay_inspect_endpoint":
                url = arguments.get("url")
                if not url:
                    return {"isError": True, "content": [{"type": "text", "text": "Missing 'url' argument"}]}

                # Raw probe using underlying client without sending payment header
                probe_resp = self.session.client.get(url)
                if probe_resp.status_code == 402:
                    try:
                        pricing_body = probe_resp.json()
                    except Exception:
                        pricing_body = probe_resp.text

                    info = {
                        "is_apay_protected": True,
                        "status_code": 402,
                        "currency": probe_resp.headers.get("X-APay-Currency", "USDC"),
                        "receiver": probe_resp.headers.get("X-APay-Receiver"),
                        "amount_base_units": probe_resp.headers.get("X-APay-Amount"),
                        "challenge_nonce": probe_resp.headers.get("X-APay-Nonce"),
                        "pricing_details": pricing_body,
                    }
                else:
                    info = {
                        "is_apay_protected": False,
                        "status_code": probe_resp.status_code,
                        "message": "Endpoint is open or returned a non-402 response.",
                    }

                return {"content": [{"type": "text", "text": json.dumps(info, indent=2)}]}

            else:
                return {
                    "isError": True,
                    "content": [{"type": "text", "text": f"Unknown tool: {name}"}],
                }

        except Exception as e:
            return {"isError": True, "content": [{"type": "text", "text": f"Error executing {name}: {e!s}"}]}

    def process_rpc_message(self, message: dict[str, Any]) -> dict[str, Any] | None:
        """Processes a single JSON-RPC 2.0 MCP message."""
        method = message.get("method")
        msg_id = message.get("id")

        if method == "initialize":
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {
                        "name": "apay-mcp",
                        "version": __version__,
                    },
                },
            }

        elif method == "notifications/initialized":
            return None

        elif method == "tools/list":
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {"tools": self.get_tool_definitions()},
            }

        elif method == "tools/call":
            params = message.get("params", {})
            tool_name = params.get("name", "")
            tool_args = params.get("arguments", {})
            result = self.handle_tool_call(tool_name, tool_args)
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": result,
            }

        elif method == "ping":
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {},
            }

        if msg_id is not None:
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {
                    "code": -32601,
                    "message": f"Method not found: {method}",
                },
            }
        return None

    def run_stdio(self) -> None:
        """Standard IO event loop for MCP."""
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
                response = self.process_rpc_message(msg)
                if response is not None:
                    sys.stdout.write(json.dumps(response) + "\n")
                    sys.stdout.flush()
            except Exception as err:
                err_resp = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {"code": -32700, "message": f"Parse error: {err!s}"},
                }
                sys.stdout.write(json.dumps(err_resp) + "\n")
                sys.stdout.flush()
