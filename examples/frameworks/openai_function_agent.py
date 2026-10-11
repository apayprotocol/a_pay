"""OpenAI Function Calling & OpenAI Swarm + A-Pay Protocol Recipe.

Demonstrates how OpenAI Assistants, Swarm Agents, and Chat Completions
can execute autonomous HTTP 402 micropayments on Base L2 when calling tools.
"""

import json
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

from apay.integrations.openai import (
    create_openai_tool,
    create_swarm_tool,
    handle_openai_tool_call,
)
from apay.wallet import AgentWallet


class MockOpenAIVendor(BaseHTTPRequestHandler):
    """Simulates an AI intelligence service protected by A-Pay HTTP 402 paywall."""

    def do_GET(self) -> None:
        auth_header = self.headers.get("Authorization", "")
        currency = self.headers.get("X-APay-Preferred-Currency", "USDC")

        if not auth_header.startswith("APay "):
            self.send_response(402)
            self.send_header("Content-Type", "application/json")
            self.send_header("X-APay-Receiver", "0x5ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc")
            self.send_header("X-APay-Amount", "2500" if currency == "USDC" else "5000000000000000000")  # $0.0025
            self.send_header("X-APay-Currency", currency)
            self.send_header("X-APay-Nonce", "openai-nonce-9921")
            self.end_headers()
            challenge = {
                "status": 402,
                "error": "Payment Required",
                "pricing": {"price": 0.0025 if currency == "USDC" else 5.0, "currency": currency},
                "eip712": {
                    "domain": {"name": "APay Protocol", "version": "1", "chainId": 8453},
                    "types": {
                        "PaymentAuthorization": [
                            {"name": "payer", "type": "address"},
                            {"name": "receiver", "type": "address"},
                            {"name": "amount", "type": "uint256"},
                            {"name": "nonce", "type": "string"},
                        ]
                    },
                    "primaryType": "PaymentAuthorization",
                    "message": {
                        "receiver": "0x5ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc",
                        "amount": 2500 if currency == "USDC" else 5000000000000000000,
                        "nonce": "openai-nonce-9921",
                    },
                },
            }
            self.wfile.write(json.dumps(challenge).encode())
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        response = {
            "status": "success",
            "intelligence": "Whale wallet 0x334... swapped 1,500 ETH to USDC on Aerodrome.",
            "confidence_score": 0.98,
            "provider": "AlphaFlow-V2",
            "settled_via": auth_header[:35] + "...",
        }
        self.wfile.write(json.dumps(response).encode())

    def log_message(self, format: str, *args: object) -> None:
        pass


def run_vendor_server(server: HTTPServer) -> None:
    server.serve_forever()


def main() -> None:
    print("=" * 65)
    print("🤖 A-PAY PROTOCOL: OpenAI Function Calling & Swarm Agent Demo")
    print("=" * 65)

    # 1. Start local mock API vendor
    server = HTTPServer(("127.0.0.1", 0), MockOpenAIVendor)
    port = server.server_address[1]
    thread = threading.Thread(target=run_vendor_server, args=(server,), daemon=True)
    thread.start()
    vendor_url = f"http://127.0.0.1:{port}/api/alpha"
    print(f"📡 Mock Paid Alpha API live at: {vendor_url}")

    # 2. Provision non-custodial AgentWallet
    wallet = AgentWallet.create(
        max_per_call_usdc=0.01,
        daily_budget_usdc=0.50,
        max_per_call_apay=10.0,
        daily_budget_apay=100.0,
    )
    print(f"💳 Agent Wallet Address: {wallet.address}")
    print(f"💰 Daily Limit: ${wallet.daily_budget_usdc} USDC / {wallet.daily_budget_apay} $APAY\n")

    # 3. Create OpenAI Tool Schema
    tool = create_openai_tool(
        name="get_crypto_alpha",
        description="Fetches real-time on-chain whale alpha and momentum signals.",
        target_url=vendor_url,
        wallet=wallet,
        currency="USDC",
    )

    schema = tool.to_openai_tool()
    print("📋 Generated OpenAI Function Tool Schema:")
    print(json.dumps(schema, indent=2))
    print()

    # 4. Simulate OpenAI Function Calling Workflow
    print("🔄 Simulating OpenAI Chat Completion tool invocation...")
    mock_tool_call = {
        "id": "call_openai_991823",
        "type": "function",
        "function": {
            "name": "get_crypto_alpha",
            "arguments": json.dumps({"query": "whale-signals-base"}),
        },
    }

    # Execute payment and retrieve data via A-Pay helper
    tool_message = handle_openai_tool_call(mock_tool_call, [tool])
    print("\n✅ Tool Output Message (Ready to append to OpenAI messages):")
    print(json.dumps(tool_message, indent=2))

    # 5. Check remaining budget
    status = tool.get_wallet_status()
    print(f"\n📊 Agent Wallet Spent: ${status['spent_usdc']:.4f} USDC | Remaining: ${status['remaining_usdc']:.4f} USDC")

    # 6. Swarm Tool Demonstration
    print("\n🐝 Creating OpenAI Swarm Agent Tool...")
    swarm_fn = create_swarm_tool(
        target_url=vendor_url,
        wallet=wallet,
        name="swarm_alpha_reader",
        description="Autonomous Swarm tool with built-in micropayments",
    )
    print(f"Swarm Function: {swarm_fn.__name__}() | Doc: {swarm_fn.__doc__}")

    server.shutdown()
    print("\n🎉 OpenAI Agent Integration successfully demonstrated!")


if __name__ == "__main__":
    main()
