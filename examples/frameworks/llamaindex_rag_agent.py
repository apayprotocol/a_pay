"""LlamaIndex RAG Pipeline + A-Pay Protocol Recipe.

Demonstrates how LlamaIndex query engines, readers, and agents can seamlessly
query paid HTTP 402 knowledge bases or proprietary vector stores on Base L2.
"""

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from apay.integrations.llamaindex import APayLlamaIndexTool, create_llamaindex_tool
from apay.wallet import AgentWallet


class MockVectorStoreVendor(BaseHTTPRequestHandler):
    """Simulates a premium paid vector database/RAG service protected by A-Pay."""

    def do_GET(self) -> None:
        auth_header = self.headers.get("Authorization", "")
        currency = self.headers.get("X-APay-Preferred-Currency", "USDC")

        # HTTP 402 challenge if not paid
        if not auth_header.startswith("APay "):
            self.send_response(402)
            self.send_header("Content-Type", "application/json")
            self.send_header("X-APay-Receiver", "0x5ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc")
            self.send_header("X-APay-Amount", "1000" if currency == "USDC" else "2000000000000000000")  # $0.001 or 2 APAY
            self.send_header("X-APay-Currency", currency)
            self.send_header("X-APay-Nonce", "llama-vector-nonce-1044")
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
                        "nonce": "llama-vector-nonce-1044",
                    },
                },
            }
            self.wfile.write(json.dumps(challenge).encode())
            return

        # Settled RAG context
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        response = {
            "results": [
                {
                    "node_id": "doc_sec_filing_9981",
                    "text": "Base L2 total transaction volume hit an all-time high with sub-cent gas fees.",
                    "score": 0.942,
                }
            ],
            "auth": "APay EIP-712 Verified",
        }
        self.wfile.write(json.dumps(response).encode())

    def log_message(self, format: str, *args: object) -> None:
        pass


def run_vendor_server(server: HTTPServer) -> None:
    server.serve_forever()


def main() -> None:
    print("=" * 65)
    print("🦙 A-PAY PROTOCOL: LlamaIndex Paid Knowledge Tool Demo")
    print("=" * 65)

    # 1. Start local mock paid vector store
    server = HTTPServer(("127.0.0.1", 0), MockVectorStoreVendor)
    port = server.server_address[1]
    thread = threading.Thread(target=run_vendor_server, args=(server,), daemon=True)
    thread.start()
    vendor_url = f"http://127.0.0.1:{port}/api/rag"
    print(f"📡 Mock Paid RAG Index live at: {vendor_url}")

    # 2. Provision non-custodial AgentWallet with dual spending limits
    wallet = AgentWallet.create(
        max_per_call_usdc=0.02,
        daily_budget_usdc=1.00,
        max_per_call_apay=10.0,
        daily_budget_apay=100.0,
    )
    print(f"💳 Agent Wallet Address: {wallet.address}")
    print(f"💰 Daily Budget: ${wallet.daily_budget_usdc} USDC / {wallet.daily_budget_apay} $APAY\n")

    # 3. Create LlamaIndex Tool
    tool = APayLlamaIndexTool(
        target_url=vendor_url,
        wallet=wallet,
        name="paid_sec_filings",
        description="Search proprietary regulatory filings database with verified accuracy.",
        currency="USDC",
    )
    print(f"🔧 Initialized LlamaIndex Tool: '{tool.name}' (Currency: {tool.currency})")

    # 4. Execute RAG retrieval (automatically settles HTTP 402 challenge)
    print("\n🔍 Querying paid vector store: 'Base L2 volume trends'...")
    response_data = tool.query("Base L2 volume trends")
    print("\n📦 RAG Retrieval Result:")
    parsed = json.loads(response_data)
    print(json.dumps(parsed, indent=2))

    # 5. Check remaining budget
    print(f"\n📊 Spending Telemetry: Spent ${wallet.total_spent_usdc:.4f} USDC | Remaining: ${wallet.daily_budget_usdc - wallet.total_spent_usdc:.4f} USDC")

    # 6. Verify helper function
    print("\n🛠️ Testing factory helper create_llamaindex_tool()...")
    helper_tool = create_llamaindex_tool(vendor_url, wallet=wallet)
    assert helper_tool is not None
    print("✅ Factory helper generated valid tool successfully!")

    server.shutdown()
    print("\n🎉 LlamaIndex Agent Integration successfully demonstrated!")


if __name__ == "__main__":
    main()
