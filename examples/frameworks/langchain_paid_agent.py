"""LangChain + A-Pay Protocol Autonomous Micropayment Recipe.

Demonstrates how a LangChain agent can autonomously discover an HTTP 402 paywall,
negotiate micro-pricing in USDC or $APAY, sign EIP-712 payment authorizations on Base L2,
and respect strict spending guardrails.
"""

import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
import json

from apay.integrations.langchain import create_apay_tool
from apay.wallet import AgentWallet


class MockPaidServer(BaseHTTPRequestHandler):
    """Simulates an HTTP 402 Monetized API Endpoint."""

    def do_GET(self) -> None:
        auth_header = self.headers.get("Authorization", "")
        # If no authorization provided, challenge with HTTP 402
        if not auth_header.startswith("APay "):
            self.send_response(402)
            self.send_header("Content-Type", "application/json")
            self.send_header("X-APay-Receiver", "0x5ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc")
            self.send_header("X-APay-Amount", "2000")  # $0.002 USDC
            self.send_header("X-APay-Currency", "USDC")
            self.send_header("X-APay-Nonce", "recipe-nonce-98765")
            self.end_headers()
            challenge_body = {
                "status": 402,
                "error": "Payment Required",
                "pricing": {"price": 0.002, "currency": "USDC"},
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
                        "amount": 2000,
                        "nonce": "recipe-nonce-98765",
                    },
                },
            }
            self.wfile.write(json.dumps(challenge_body).encode())
            return

        # Payment received and settled! Deliver payload
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("X-APay-Settled", "true")
        self.end_headers()
        self.wfile.write(
            json.dumps(
                {
                    "status": "success",
                    "data": "CONFIDENTIAL: Base L2 daily active addresses surpassed 1.5M today.",
                    "source": "A-Pay Alpha Intel",
                }
            ).encode()
        )

    def log_message(self, format: str, *args: object) -> None:
        pass


def main() -> None:
    print("=" * 65)
    print("🔗 LANGCHAIN + A-PAY AUTONOMOUS MICROPAYMENT RECIPE")
    print("=" * 65)

    # 1. Start background mock HTTP 402 server
    port = 8291
    server = HTTPServer(("127.0.0.1", port), MockPaidServer)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    time.sleep(0.1)

    url = f"http://127.0.0.1:{port}/api/crypto-intel"
    print(f"📡 Premium Monetized API running at: {url}")

    # 2. Initialize Agent Wallet with spending limits
    wallet = AgentWallet.create(
        max_per_call_usdc=0.01,  # Max $0.01 per query
        daily_budget_usdc=0.50,  # Max $0.50 per day
    )
    print(f"🤖 LangChain Agent Non-Custodial Wallet: {wallet.address}")
    print(f"🛡️ Spending Safety Limits: Max/Call = ${wallet.max_per_call_usdc} | Daily = ${wallet.daily_budget_usdc}")

    # 3. Create LangChain APayTool
    tool = create_apay_tool(
        name="crypto_intel_feed",
        description="Query proprietary institutional intelligence feed on Base L2.",
        target_url=url,
        wallet=wallet,
        currency="USDC",
    )

    print("\n⚡ [Agent Execution]: Tool called by LangChain Agent Executor...")
    response_text = tool.run({"query": "latest base metrics"})
    print(f"📥 [Delivered Data]: {response_text}")

    # 4. Check Wallet Budget Telemetry
    status = tool.get_wallet_status()
    print("\n📊 [Agent Wallet Status]:")
    print(f"   • Address        : {status['address']}")
    print(f"   • Spent Today    : ${status['spent_usdc']:.4f} USDC")
    print(f"   • Remaining Daily: ${status['remaining_usdc']:.4f} USDC")

    server.shutdown()
    print("\n✅ LangChain A-Pay autonomous payment completed successfully!")


if __name__ == "__main__":
    main()
