"""A-Pay Monetized FastAPI Agent Service.

Monetize AI agent endpoints and APIs in 1 line on Base L2 with USDC and $APAY tokens.
"""

import os
from fastapi import Depends, FastAPI
from apay import APayPaywall, VerifiedClaim

app = FastAPI(
    title="Monetized Agent Intelligence Service",
    description="Protected by A-Pay HTTP 402 Protocol on Base Layer 2",
    version="1.0.0",
)

# Read configuration from environment
RECEIVER_WALLET = os.getenv("APAY_RECEIVER_WALLET", "0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc")
PRICE_USDC = float(os.getenv("APAY_PRICE_USDC", "0.002"))
NETWORK = os.getenv("APAY_NETWORK", "base-mainnet")

# 1-Line Drop-in Paywall
paywall = APayPaywall(
    price_usdc=PRICE_USDC,
    receiver_wallet=RECEIVER_WALLET,
    network=NETWORK,
)


@app.get("/")
def home():
    return {
        "service": "A-Pay Monetized AI Agent API",
        "network": NETWORK,
        "receiver": RECEIVER_WALLET,
        "endpoints": {
            "/api/agent": f"Paywalled agent query endpoint (${PRICE_USDC} USDC or discounted $APAY)",
        },
    }


@app.get("/api/agent")
def agent_query(query: str = "default", claim: VerifiedClaim = Depends(paywall)):
    """Protected intelligence endpoint that requires authentic payment."""
    return {
        "status": "success",
        "query": query,
        "result": f"Synthesized AI response for '{query}' with cryptographic proof of payment.",
        "settled": True,
        "payer": claim.payer,
        "amount_settled": f"${claim.price} {claim.currency}",
    }
