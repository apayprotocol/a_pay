"""
Model Context Protocol (MCP) Server for A-Pay Protocol
Enables autonomous AI agents (Claude Desktop, Cursor, Antigravity, etc.)
to discover, inspect, and pay for HTTP 402 protected APIs on the fly.
"""

from __future__ import annotations

import ipaddress
import json
import math
import os
import sys
import urllib.parse
from typing import Any

from . import __version__
from .client import APaySession
from .wallet import AgentWallet


def _is_safe_public_url(url: str) -> tuple[bool, str]:
    """Validates that a URL is safe to fetch and not targeting internal subnets or cloud metadata."""
    if not url or not isinstance(url, str):
        return False, "URL must be a non-empty string"
    try:
        parsed = urllib.parse.urlparse(url.strip())
    except Exception:
        return False, f"Invalid URL format: '{url}'"

    if parsed.scheme.lower() not in ("http", "https"):
        return False, f"Forbidden URL scheme '{parsed.scheme}'. Only HTTP and HTTPS are permitted."

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        return False, "URL hostname is missing"

    # Cloud metadata defense (AWS, GCP, Azure, OpenStack)
    blocked_hosts = {
        "169.254.169.254",
        "169.254.169.253",
        "metadata.google.internal",
        "metadata",
        "instance-data",
        "fd00:ec2::254",
    }
    if hostname in blocked_hosts:
        return False, "Access to cloud instance metadata service is strictly forbidden."

    # Blocked suffixes for internal/private domains
    blocked_suffixes = (".local", ".internal", ".lan", ".corp", ".home", ".onion", ".arpa")
    if any(hostname.endswith(sfx) for sfx in blocked_suffixes):
        return False, f"Access to private internal domain '{hostname}' is forbidden."

    # Loopback / local host check (allow only if explicit env flag set)
    allow_local = os.getenv("APAY_ALLOW_LOCALHOST", "").lower() in ("true", "1")
    if hostname in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
        if not allow_local:
            return False, "Access to localhost/loopback addresses is forbidden in production."

    # Check for direct private IP literals
    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_loopback:
            if not allow_local:
                return False, "Access to loopback IP addresses is forbidden in production."
        elif ip.is_private or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False, f"Access to private/reserved IP '{hostname}' is forbidden."
    except ValueError:
        pass

    return True, ""


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

    def _fetch_onchain_balances(self, address: str | None = None) -> dict[str, Any]:
        """Fetches live on-chain balances for ETH, USDC, and $APAY tokens."""
        target_addr = (
            address if (address and address.startswith("0x") and len(address) == 42) else self.wallet.address
        )
        # 1. Native ETH balance
        eth_bal_hex = self._call_rpc("eth_getBalance", [target_addr, "latest"])
        eth_wei = int(eth_bal_hex, 16) if eth_bal_hex else 0
        eth_bal = eth_wei / 1e18

        # 2. USDC balance (balanceOf selector 0x70a08231)
        addr_padded = target_addr[2:].lower().zfill(64)
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
            "wallet_address": target_addr,
            "network": f"Base L2 ({self.network_name} - Chain ID: {self.chain_id})",
            "balances": {
                "native_eth": f"{eth_bal:.6f} ETH",
                "usdc": f"{usdc_bal:.4f} USDC",
                "apay": f"{apay_bal:,.2f} $APAY",
            },
            "status": "Solvent" if (usdc_bal > 0 or apay_bal > 0) else "Needs Deposit",
        }

    def get_tool_definitions(self) -> list[dict[str, Any]]:
        """Returns MCP-compliant tool specifications with full annotations and parameter schemas."""
        return [
            {
                "name": "apay_request",
                "description": (
                    "Make an HTTP request (GET, POST, etc.) to any API or website. "
                    "If the endpoint returns an HTTP 402 Payment Required challenge, "
                    "A-Pay automatically signs the cryptographic payment authorization "
                    "within your budget limits and unlocks the data in <25ms."
                ),
                "annotations": {
                    "readOnlyHint": False,
                    "destructiveHint": True,
                    "idempotentHint": False,
                    "openWorldHint": True,
                },
                "readOnlyHint": False,
                "destructiveHint": True,
                "idempotentHint": False,
                "openWorldHint": True,
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "url": {
                            "type": "string",
                            "description": (
                                "Target endpoint URL to fetch or query with HTTP 402 payment support "
                                "(e.g. 'https://api.example.com/v1/market-data' or 'https://apayprotocol.org/api/ping')."
                            ),
                        },
                        "method": {
                            "type": "string",
                            "enum": ["GET", "POST", "PUT", "DELETE"],
                            "default": "GET",
                            "description": (
                                "HTTP request method to execute against the target URL. "
                                "Allowed values: 'GET', 'POST', 'PUT', 'DELETE' (default: 'GET')."
                            ),
                        },
                        "json_body": {
                            "type": "object",
                            "description": (
                                "Optional JSON payload object for POST or PUT requests "
                                '(e.g. {"query": "ETH-USD", "limit": 10}).'
                            ),
                        },
                        "headers": {
                            "type": "object",
                            "description": (
                                "Optional additional HTTP request headers as key-value pairs "
                                '(e.g. {"Accept": "application/json", "User-Agent": "APayAgent/1.0"}).'
                            ),
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
                "annotations": {
                    "readOnlyHint": True,
                    "destructiveHint": False,
                    "idempotentHint": True,
                    "openWorldHint": False,
                },
                "readOnlyHint": True,
                "destructiveHint": False,
                "idempotentHint": True,
                "openWorldHint": False,
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
                "annotations": {
                    "readOnlyHint": False,
                    "destructiveHint": False,
                    "idempotentHint": True,
                    "openWorldHint": False,
                },
                "readOnlyHint": False,
                "destructiveHint": False,
                "idempotentHint": True,
                "openWorldHint": False,
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "max_per_call_usdc": {
                            "type": "number",
                            "description": "Maximum USDC allowance for a single API call (e.g. 0.05).",
                        },
                        "daily_budget_usdc": {
                            "type": "number",
                            "description": "Maximum USDC rolling 24-hour spending budget (e.g. 2.0).",
                        },
                        "max_per_call_apay": {
                            "type": "number",
                            "description": "Maximum $APAY token allowance for a single API call (e.g. 10.0).",
                        },
                        "daily_budget_apay": {
                            "type": "number",
                            "description": "Maximum $APAY token rolling 24-hour spending budget (e.g. 100.0).",
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
                "annotations": {
                    "readOnlyHint": True,
                    "destructiveHint": False,
                    "idempotentHint": True,
                    "openWorldHint": True,
                },
                "readOnlyHint": True,
                "destructiveHint": False,
                "idempotentHint": True,
                "openWorldHint": True,
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "url": {
                            "type": "string",
                            "description": (
                                "The HTTP or HTTPS URL to probe for HTTP 402 payment requirements "
                                "(e.g. 'https://api.example.com/premium-feed')."
                            ),
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
                "annotations": {
                    "readOnlyHint": True,
                    "destructiveHint": False,
                    "idempotentHint": True,
                    "openWorldHint": False,
                },
                "readOnlyHint": True,
                "destructiveHint": False,
                "idempotentHint": True,
                "openWorldHint": False,
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "address": {
                            "type": "string",
                            "description": (
                                "Optional EVM address to inspect balances for (e.g. '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc'). "
                                "Defaults to the agent's active wallet address if omitted."
                            ),
                        },
                    },
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
                safe, err_msg = _is_safe_public_url(url)
                if not safe:
                    return {
                        "isError": True,
                        "content": [{"type": "text", "text": f"Security Policy Violation: {err_msg}"}],
                    }

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
                target_address = arguments.get("address")
                if target_address:
                    if (
                        not isinstance(target_address, str)
                        or not target_address.startswith("0x")
                        or len(target_address) != 42
                    ):
                        return {
                            "isError": True,
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Invalid EVM 'address' format. Must be a 42-character 0x-prefixed hex string.",
                                }
                            ],
                        }
                balances = self._fetch_onchain_balances(address=target_address)
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
                numeric_keys = [
                    ("max_per_call_usdc", "max_per_call_usdc"),
                    ("daily_budget_usdc", "daily_budget_usdc"),
                    ("max_per_call_apay", "max_per_call_apay"),
                    ("daily_budget_apay", "daily_budget_apay"),
                ]
                for arg_key, wallet_attr in numeric_keys:
                    if arg_key in arguments and arguments[arg_key] is not None:
                        try:
                            val = float(arguments[arg_key])
                            if val < 0 or math.isnan(val) or math.isinf(val):
                                return {
                                    "isError": True,
                                    "content": [
                                        {
                                            "type": "text",
                                            "text": f"Invalid budget value for '{arg_key}': must be a finite non-negative number.",
                                        }
                                    ],
                                }
                            setattr(self.wallet, wallet_attr, val)
                            updated[arg_key] = val
                        except (ValueError, TypeError):
                            return {
                                "isError": True,
                                "content": [
                                    {
                                        "type": "text",
                                        "text": f"Invalid numeric value for '{arg_key}'.",
                                    }
                                ],
                            }

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
                safe, err_msg = _is_safe_public_url(url)
                if not safe:
                    return {
                        "isError": True,
                        "content": [{"type": "text", "text": f"Security Policy Violation: {err_msg}"}],
                    }

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
            params = message.get("params") or {}
            client_version = params.get("protocolVersion")
            supported_versions = ["2025-06-18", "2024-11-05"]
            negotiated_version = client_version if client_version in supported_versions else "2025-06-18"
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "protocolVersion": negotiated_version,
                    "capabilities": {
                        "tools": {
                            "listChanged": False,
                        },
                        "resources": {},
                        "prompts": {},
                        "logging": {},
                    },
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
