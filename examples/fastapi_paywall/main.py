"""
Example: 1-Line HTTP 402 Paywall with FastAPI & A-Pay
Demonstrates how to monetize any FastAPI endpoint in 1 line.

Run:
    uv run uvicorn examples.fastapi_paywall.main:app --port 8000 --reload
"""

from fastapi import Depends, FastAPI

from apay import APayPaywall, VerifiedClaim

app = FastAPI(title="FastAPI Paywalled Intelligence Service")

# 1-Line Drop-in Paywall: $0.002 USDC per request on Base L2
paywall = APayPaywall(
    price_usdc=0.002,
    receiver_wallet="0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc",
    network="base",
)


@app.get("/")
def home():
    return {"message": "Welcome. Access /premium-alpha for paid proprietary market intelligence."}


@app.get("/premium-alpha")
def get_alpha(claim: VerifiedClaim = Depends(paywall)):
    return {
        "status": "success",
        "secret_data": "CONFIDENTIAL: Base L2 institutional daily inflows exceeded $450M.",
        "paid_by": claim.payer,
        "amount_paid": f"${claim.price} USDC",
        "settled": True,
    }
