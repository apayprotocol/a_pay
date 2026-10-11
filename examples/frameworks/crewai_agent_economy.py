"""CrewAI + A-Pay Protocol Multi-Agent Economy Recipe.

Demonstrates how autonomous CrewAI agents can act within an agent-to-agent
micro-economy, with Buyer Agents spending USDC or $APAY to acquire proprietary
context from monetized API services.
"""

import json
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

from apay.integrations.crewai import create_crew_economy_toolkit
from apay.wallet import AgentWallet


class MockDataVendor(BaseHTTPRequestHandler):
    """Simulates a premium paid data service provider for CrewAI agents."""

    def do_GET(self) -> None:
        auth_header = self.headers.get("Authorization", "")
        currency = self.headers.get("X-APay-Preferred-Currency", "USDC")

        # HTTP 402 challenge if unauthenticated
        if not auth_header.startswith("APay "):
            self.send_response(402)
            self.send_header("Content-Type", "application/json")
            self.send_header("X-APay-Receiver", "0x5ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc")
            self.send_header("X-APay-Amount", "1000" if currency == "USDC" else "2000000000000000000")  # $0.001 or 2 APAY
            self.send_header("X-APay-Currency", currency)
            self.send_header("X-APay-Nonce", "crew-vendor-nonce-4412")
            self.end_headers()
            challenge = {
                "status": 402,
                "error": "Payment Required",
                "pricing": {"price": 0.001 if currency == "USDC" else 2.0, "currency": currency},
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
                        "amount": 1000 if currency == "USDC" else 2000000000000000000,
                        "nonce": "crew-vendor-nonce-4412",
                    },
                },
            }
            self.wfile.write(json.dumps(challenge).encode())
            return

        # Settled payload
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("X-APay-Settled", "true")
        self.end_headers()
        self.wfile.write(
            json.dumps(
                {
                    "vendor": "QuantResearch Data Node",
                    "sentiment_score": 0.88,
                    "market_condition": "Strong Bullish Expansion",
                    "timestamp": time.time(),
                }
            ).encode()
        )

    def log_message(self, format: str, *args: object) -> None:
        pass


def main() -> None:
    print("=" * 65)
    print("👥 CREWAI + A-PAY MULTI-AGENT MICRO-ECONOMY RECIPE")
    print("=" * 65)

    # 1. Start Vendor API Server
    port = 8292
    server = HTTPServer(("127.0.0.1", port), MockDataVendor)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    time.sleep(0.1)

    vendor_url = f"http://127.0.0.1:{port}/api/sentiment"
    print(f"🏪 External Data Vendor Endpoint: {vendor_url}")

    # 2. Provision Crew Buyer Agent Wallet
    buyer_wallet = AgentWallet.create(
        max_per_call_usdc=0.02,
        daily_budget_usdc=1.00,
    )
    print(f"🤖 CrewAI Lead Researcher Wallet: {buyer_wallet.address}")

    # 3. Equip Researcher Agent with A-Pay Economy Toolkit
    toolkit = create_crew_economy_toolkit(
        wallet=buyer_wallet,
        endpoints={
            "acquire_market_sentiment": {
                "url": vendor_url,
                "description": "Acquire proprietary real-time sentiment analysis from commercial vendor.",
                "method": "GET",
            }
        },
        currency="USDC",
    )
    sentiment_tool = toolkit[0]

    # 4. Agent purchases data
    print("\n⚡ [CrewAI Task Execution]: Researcher Agent initiates data acquisition...")
    result = sentiment_tool._run(query="ETH market sentiment")
    print(f"📥 [Vendor Data Delivered]: {result}")

    # 5. Review Budget Isolation
    status = sentiment_tool.get_wallet_status()
    print("\n📊 [Buyer Agent Wallet Telemetry]:")
    print(f"   • Wallet Address : {status['address']}")
    print(f"   • Total Spent    : ${status['spent_usdc']:.4f} USDC")
    print(f"   • Remaining Pool : ${status['remaining_usdc']:.4f} USDC")

    server.shutdown()
    print("\n✅ CrewAI Multi-Agent Economy transaction successfully executed!")


if __name__ == "__main__":
    main()
