"""Microsoft AutoGen + A-Pay Protocol Multi-Agent Conversation Recipe.

Demonstrates how AutoGen conversational agents can register and execute
A-Pay payment functions to purchase computational or data services on Base L2.
"""

import json
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

from apay.integrations.autogen import APayAutoGenToolkit
from apay.wallet import AgentWallet


class MockServiceServer(BaseHTTPRequestHandler):
    """Simulates an HTTP 402 API monetized for AutoGen agent usage."""

    def do_GET(self) -> None:
        auth_header = self.headers.get("Authorization", "")
        if not auth_header.startswith("APay "):
            self.send_response(402)
            self.send_header("Content-Type", "application/json")
            self.send_header("X-APay-Receiver", "0x5ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc")
            self.send_header("X-APay-Amount", "1500")  # $0.0015 USDC
            self.send_header("X-APay-Currency", "USDC")
            self.send_header("X-APay-Nonce", "autogen-nonce-7721")
            self.end_headers()
            challenge = {
                "status": 402,
                "error": "Payment Required",
                "pricing": {"price": 0.0015, "currency": "USDC"},
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
                        "amount": 1500,
                        "nonce": "autogen-nonce-7721",
                    },
                },
            }
            self.wfile.write(json.dumps(challenge).encode())
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("X-APay-Settled", "true")
        self.end_headers()
        self.wfile.write(
            json.dumps(
                {
                    "result": "Computation complete: Optimal DEX swap routing verified on Aerodrome.",
                    "status": "success",
                }
            ).encode()
        )

    def log_message(self, format: str, *args: object) -> None:
        pass


def main() -> None:
    print("=" * 65)
    print("🤖 MICROSOFT AUTOGEN + A-PAY AGENT RECIPE")
    print("=" * 65)

    # 1. Start Server
    port = 8293
    server = HTTPServer(("127.0.0.1", port), MockServiceServer)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    time.sleep(0.1)

    service_url = f"http://127.0.0.1:{port}/api/compute"
    print(f"⚡ Paid Compute Service Endpoint: {service_url}")

    # 2. Provision Wallet
    wallet = AgentWallet.create(
        max_per_call_usdc=0.01,
        daily_budget_usdc=0.20,
    )
    toolkit = APayAutoGenToolkit(wallet=wallet, currency="USDC")
    print(f"💳 AutoGen Agent Wallet: {wallet.address}")

    # 3. Create Function Tool
    query_fn = toolkit.create_paid_query_function(target_url=service_url, method="GET")

    # 4. Trigger Execution
    print("\n⚡ [AutoGen Execution]: Calling paid compute tool...")
    output = query_fn("optimize swap route")
    print(f"📥 [Service Output]: {output}")

    status = toolkit.get_wallet_status()
    print("\n📊 [Agent Wallet Status]:")
    print(f"   • Spent Today    : ${status['spent_usdc']:.4f} USDC")
    print(f"   • Remaining Pool : ${status['remaining_usdc']:.4f} USDC")

    server.shutdown()
    print("\n✅ AutoGen A-Pay autonomous payment completed successfully!")


if __name__ == "__main__":
    main()
