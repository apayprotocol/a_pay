"""
FastAPI & Starlette 1-Line Drop-In HTTP 402 Paywall Middleware
Enables Web2 and Web3 developers to monetize any FastAPI or Starlette endpoint
with 1 line: `Depends(APayPaywall(price_usdc=0.001, receiver_wallet="0x..."))`.
Features O(1) sliding-window replay defense, solvency validation, and 1-RTT session streaming.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass

from starlette.exceptions import HTTPException
from starlette.requests import Request

from .channel import ChannelReceiverValidator, ChannelVoucher
from .nonce_store import BaseNonceStore, SlidingWindowNonceStore
from .relayer import ClaimJournal, ClaimRecord
from .session import SessionManager
from .solvency import AllowAllSolvencyValidator, BaseSolvencyValidator
from .wallet import (
    DEFAULT_CHAIN_ID,
    DEFAULT_ROUTER_ADDRESS,
    AgentWallet,
)


@dataclass
class VerifiedClaim:
    """Represents a cryptographically settled payment claim verified by APayPaywall."""

    payer: str
    receiver: str
    amount_base_units: str
    price: float
    currency: str
    nonce: str
    signature: str
    timestamp: float


class APayPaywall:
    """FastAPI & Starlette Dependency for 1-Line HTTP 402 Paywalls.

    Usage:
        from fastapi import FastAPI, Depends
        from apay.fastapi import APayPaywall

        app = FastAPI()
        paywall = APayPaywall(price_usdc=0.002, receiver_wallet="0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc")

        @app.get("/api/market-alpha")
        async def get_alpha(claim = Depends(paywall)):
            return {"secret": "Alpha Insights", "payer": claim.payer}
    """

    def __init__(
        self,
        price_usdc: float,
        receiver_wallet: str,
        currency: str = "USDC",
        price_apay: float | None = None,
        network: str = "base",
        chain_id: int = DEFAULT_CHAIN_ID,
        router_address: str = DEFAULT_ROUTER_ADDRESS,
        journal: ClaimJournal | None = None,
        nonce_store: BaseNonceStore | None = None,
        solvency_validator: BaseSolvencyValidator | None = None,
        session_manager: SessionManager | None = None,
        channel_validator: ChannelReceiverValidator | None = None,
    ) -> None:
        self.price_usdc = price_usdc
        self.receiver_wallet = receiver_wallet.lower()
        self.currency = currency.upper()
        self.price_apay = price_apay
        self.network = network
        self.chain_id = chain_id
        self.router_address = router_address.lower()
        self.journal = journal
        self.nonce_store = nonce_store or SlidingWindowNonceStore(ttl_seconds=60.0)
        self.solvency_validator = solvency_validator or AllowAllSolvencyValidator()
        self.session_manager = session_manager or SessionManager()
        self.channel_validator = channel_validator or ChannelReceiverValidator(
            receiver_wallet=self.receiver_wallet,
            chain_id=self.chain_id,
            router_address=self.router_address,
        )

    def get_challenge_headers(self, nonce: str) -> dict[str, str]:
        """Generates standard HTTP 402 challenge headers."""
        if self.currency == "APAY":
            amount_base = str(int((self.price_apay or self.price_usdc) * 10**18))
            token_address = "0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3"
        elif self.currency == "DUAL":
            amount_base = str(int(self.price_usdc * 1_000_000))
            token_address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
        else:
            amount_base = str(int(self.price_usdc * 1_000_000))
            token_address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

        headers = {
            "X-APay-Version": "1.0.0",
            "X-APay-Receiver": self.receiver_wallet,
            "X-APay-Amount": amount_base,
            "X-APay-Currency": self.currency,
            "X-APay-Token": token_address,
            "X-APay-Network": self.network,
            "X-APay-Nonce": nonce,
            "X-APay-Scheme": "eip712",
            "X-APay-Chain-Id": str(self.chain_id),
            "X-APay-Router": self.router_address,
        }

        if self.currency == "DUAL":
            headers["X-APay-Amount-USDC"] = str(int(self.price_usdc * 1_000_000))
            price_apay = self.price_apay if self.price_apay is not None else 4.0
            headers["X-APay-Amount-APAY"] = str(int(price_apay * 10**18))
            headers["X-APay-Token-USDC"] = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
            headers["X-APay-Token-APAY"] = "0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3"

        headers["X-APay-Protocol"] = "A-Pay/0.1.8"
        headers["X-APay-Portal"] = "https://apay-network.vercel.app"
        headers["X-APay-Free-Human-Access"] = "true"
        headers["X-APay-Developer-Alert"] = (
            "Autonomous payment required. Visit https://apay-network.vercel.app to integrate A-Pay."
        )

        return headers

    def create_challenge(self, nonce: str | None = None) -> HTTPException:
        """Construct standard HTTP 402 HTTPException with full typed EIP-712 challenge headers."""
        resolved_nonce = nonce or str(uuid.uuid4())
        return HTTPException(
            status_code=402,
            detail="Payment Required: An A-Pay cryptographic micropayment is required to access this endpoint.",
            headers=self.get_challenge_headers(resolved_nonce),
        )

    async def __call__(self, request: Request) -> VerifiedClaim:
        """Evaluates incoming HTTP request.

        If unauthenticated or invalid, raises HTTPException(status_code=402, ...).
        If verified, returns VerifiedClaim object.
        """
        auth_header = request.headers.get("Authorization")

        # 0. Handle 1-RTT streaming session tokens
        if auth_header and auth_header.startswith("APay session:"):
            token = auth_header.replace("APay session:", "").strip()
            amount_base = (
                int((self.price_apay or self.price_usdc) * 10**18)
                if self.currency == "APAY"
                else int(self.price_usdc * 1_000_000)
            )
            valid, reason, record = self.session_manager.verify_and_consume(token, amount_base)
            if not valid or not record:
                raise HTTPException(
                    status_code=402,
                    detail=f"Session authentication rejected: {reason}",
                )
            return VerifiedClaim(
                payer=record.payer,
                receiver=self.receiver_wallet,
                amount_base_units=str(amount_base),
                price=self.price_usdc,
                currency=self.currency,
                nonce=f"sess_{record.session_id}_{int(time.time())}",
                signature="session_token",
                timestamp=time.time(),
            )

        # 0b. Handle 1-RTT cumulative state channel vouchers
        if auth_header and auth_header.startswith("APay channel:"):
            try:
                voucher = ChannelVoucher.from_header(auth_header)
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Malformed channel authorization: {e!s}",
                ) from e

            cost = int(self.price_usdc * 1_000_000)
            if self.currency == "APAY":
                cost = int((self.price_apay or self.price_usdc) * 10**18)
            valid, reason = self.channel_validator.verify_voucher(voucher, cost)
            if not valid:
                raise HTTPException(
                    status_code=402,
                    detail=f"Channel voucher rejected: {reason}",
                )
            return VerifiedClaim(
                payer=voucher.payer,
                receiver=self.receiver_wallet,
                amount_base_units=str(voucher.cumulative_amount_base_units),
                price=self.price_usdc,
                currency=self.currency,
                nonce=f"chan_{voucher.channel_id[:10]}_{voucher.sequence}",
                signature=voucher.signature,
                timestamp=time.time(),
            )

        # 1. No payment header -> Issue 402 challenge
        if not auth_header or not auth_header.startswith("APay "):
            nonce = str(uuid.uuid4())
            challenge_headers = self.get_challenge_headers(nonce)
            raise HTTPException(
                status_code=402,
                detail="Payment Required: An A-Pay cryptographic micropayment is required to access this endpoint.",
                headers=challenge_headers,
            )

        payload = auth_header[len("APay ") :].strip()

        # 2. Parse authorization header
        if payload.startswith("eip712:"):
            scheme = "eip712"
            parts = payload[len("eip712:") :].split(":")
        elif payload.startswith("sig:"):
            scheme = "sig"
            parts = payload[len("sig:") :].split(":")
        else:
            raise HTTPException(
                status_code=400,
                detail="Malformed Authorization header: Unsupported scheme. Expected 'APay eip712:...' or 'APay sig:...'",
            )

        if len(parts) != 4:
            raise HTTPException(
                status_code=400,
                detail="Malformed Authorization header: Expected format 'APay <scheme>:<signature>:<payer>:<nonce>:<amount>'",
            )

        signature, payer, nonce, amount_str = parts

        # 3. Check amount format & underpayment
        try:
            amount_int = int(amount_str)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid amount format: '{amount_str}' is not an integer.",
            ) from None

        if self.currency == "DUAL":
            min_usdc = int(self.price_usdc * 1_000_000)
            min_apay = int((self.price_apay if self.price_apay is not None else 4.0) * 10**18)
            if amount_int < min_usdc and amount_int < min_apay:
                raise HTTPException(
                    status_code=402,
                    detail=f"Underpayment: Provided {amount_int} base units, expected at least {min_usdc} (USDC) or {min_apay} (APAY).",
                )
        else:
            expected_amount = int(
                (self.price_apay or self.price_usdc) * 10**18
                if self.currency == "APAY"
                else self.price_usdc * 1_000_000
            )
            if amount_int < expected_amount:
                raise HTTPException(
                    status_code=402,
                    detail=f"Underpayment: Provided {amount_int} base units, required {expected_amount}.",
                )

        # 4. Anti-Replay Nonce Check in O(1)
        if not self.nonce_store.consume(nonce):
            raise HTTPException(
                status_code=401,
                detail="Replay attack detected: Nonce has already been consumed.",
            )

        # 5. Cryptographic Signature Verification (<15ms)
        try:
            if scheme == "eip712":
                recovered = AgentWallet.verify_typed_payment(
                    payer=payer,
                    receiver=self.receiver_wallet,
                    amount_base_units=amount_str,
                    nonce=nonce,
                    signature=signature,
                    chain_id=self.chain_id,
                    router_address=self.router_address,
                )
            else:
                expected_msg = f"APAY:{self.receiver_wallet.lower()}:{amount_str}:{nonce}"
                recovered = AgentWallet.verify_signature(expected_msg, signature)

            if recovered.lower() != payer.lower():
                raise HTTPException(
                    status_code=401,
                    detail=f"Invalid cryptographic signature: Recovered {recovered} does not match declared payer {payer}.",
                )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=401,
                detail=f"Cryptographic signature verification failed: {e!s}",
            ) from e

        # 6. Solvency validation against Free API Scrape exploit
        is_solvent, solvency_reason = self.solvency_validator.check_solvency(
            payer=payer,
            amount_base_units=amount_str,
            currency=self.currency,
        )
        if not is_solvent:
            raise HTTPException(
                status_code=402,
                detail=f"Solvency check failed: {solvency_reason}",
            )

        # 7. Record in claims journal if provided
        claim_id = f"claim_{int(time.time())}_{uuid.uuid4().hex[:8]}"
        if self.journal:
            self.journal.record(
                ClaimRecord(
                    id=claim_id,
                    payer=payer,
                    receiver=self.receiver_wallet,
                    amount_base_units=amount_str,
                    price_usdc=self.price_usdc,
                    nonce=nonce,
                    signature=signature,
                    timestamp=time.time(),
                    network=self.network,
                )
            )

        return VerifiedClaim(
            payer=payer,
            receiver=self.receiver_wallet,
            amount_base_units=amount_str,
            price=self.price_usdc,
            currency=self.currency,
            nonce=nonce,
            signature=signature,
            timestamp=time.time(),
        )
