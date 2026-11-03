"""Async & Sync HTTP Clients with Automatic HTTP 402 Micropayment Negotiation."""

import urllib.parse
from typing import Any

import httpx

from .wallet import DEFAULT_CHAIN_ID, DEFAULT_ROUTER_ADDRESS, AgentWallet


def check_seller_seal(
    pay_to_wallet: str,
    network: str = "eip155:8453",
    timeout: float = 3.0,
) -> dict[str, Any]:
    """Inspect SealKeeper API to verify if seller wallet is proven."""
    url = (
        f"https://api.sealkeeper.run/v1/services/seal"
        f"?pay_to={urllib.parse.quote(pay_to_wallet)}"
        f"&network={urllib.parse.quote(network)}"
    )
    try:
        with httpx.Client(timeout=timeout) as client:
            res = client.get(url, headers={"Accept": "application/json"})
            if res.status_code == 404:
                return {"verified": False, "proven": False, "reason": "Seller not listed on SealKeeper"}
            if not res.is_success:
                return {"verified": False, "proven": False, "reason": f"SealKeeper HTTP {res.status_code}"}
            data = res.json()
            services = data.get("services", [])
            if not services:
                return {"verified": False, "proven": False, "reason": "No matching service found"}
            service = services[0]
            is_proven = bool(service.get("wallet", {}).get("proven") is True)
            return {
                "verified": True,
                "proven": is_proven,
                "handle": service.get("handle"),
                "seal": service.get("seal"),
                "reason": None
                if is_proven
                else "Seller wallet has not proven ownership (wallet.proven is false)",
            }
    except Exception as exc:
        return {"verified": False, "proven": False, "reason": str(exc)}


async def acheck_seller_seal(
    pay_to_wallet: str,
    network: str = "eip155:8453",
    timeout: float = 3.0,
) -> dict[str, Any]:
    """Inspect SealKeeper API asynchronously to verify if seller wallet is proven."""
    url = (
        f"https://api.sealkeeper.run/v1/services/seal"
        f"?pay_to={urllib.parse.quote(pay_to_wallet)}"
        f"&network={urllib.parse.quote(network)}"
    )
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            res = await client.get(url, headers={"Accept": "application/json"})
            if res.status_code == 404:
                return {"verified": False, "proven": False, "reason": "Seller not listed on SealKeeper"}
            if not res.is_success:
                return {"verified": False, "proven": False, "reason": f"SealKeeper HTTP {res.status_code}"}
            data = res.json()
            services = data.get("services", [])
            if not services:
                return {"verified": False, "proven": False, "reason": "No matching service found"}
            service = services[0]
            is_proven = bool(service.get("wallet", {}).get("proven") is True)
            return {
                "verified": True,
                "proven": is_proven,
                "handle": service.get("handle"),
                "seal": service.get("seal"),
                "reason": None
                if is_proven
                else "Seller wallet has not proven ownership (wallet.proven is false)",
            }
    except Exception as exc:
        return {"verified": False, "proven": False, "reason": str(exc)}


class APayClient:
    """Asynchronous HTTP Client for AI Agents with auto-settling 402 handling."""

    def __init__(
        self,
        wallet: AgentWallet,
        timeout: float = 30.0,
        use_eip712: bool = True,
        verify_seller_seal: bool = False,
    ) -> None:
        self.wallet = wallet
        self.client = httpx.AsyncClient(timeout=timeout)
        self.use_eip712 = use_eip712
        self.verify_seller_seal = verify_seller_seal

    async def get(self, url: str, **kwargs: Any) -> httpx.Response:
        return await self._request("GET", url, **kwargs)

    async def post(self, url: str, **kwargs: Any) -> httpx.Response:
        return await self._request("POST", url, **kwargs)

    async def put(self, url: str, **kwargs: Any) -> httpx.Response:
        return await self._request("PUT", url, **kwargs)

    async def patch(self, url: str, **kwargs: Any) -> httpx.Response:
        return await self._request("PATCH", url, **kwargs)

    async def delete(self, url: str, **kwargs: Any) -> httpx.Response:
        return await self._request("DELETE", url, **kwargs)

    async def request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        return await self._request(method, url, **kwargs)

    async def _request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        # 1. Initial attempt
        response = await self.client.request(method, url, **kwargs)

        # 2. Intercept HTTP 402 Payment Required
        if response.status_code == 402:
            return await self._handle_402_and_retry(method, url, response, **kwargs)

        return response

    async def _handle_402_and_retry(
        self, method: str, url: str, initial_response: httpx.Response, **kwargs: Any
    ) -> httpx.Response:
        headers = initial_response.headers
        currency = headers.get("X-APay-Currency", "USDC").upper()
        raw_amount = headers.get("X-APay-Amount", "0")
        effective_currency = "USDC"

        try:
            if currency == "DUAL":
                raw_apay = headers.get("X-APay-Amount-APAY")
                raw_usdc = headers.get("X-APay-Amount-USDC")
                if self.wallet.currency == "APAY" and raw_apay:
                    raw_amount = raw_apay
                    price = float(raw_amount) / 1e18
                    effective_currency = "APAY"
                elif raw_usdc:
                    raw_amount = raw_usdc
                    price = float(raw_amount) / 1_000_000.0
                    effective_currency = "USDC"
                else:
                    price = float(raw_amount) / 1_000_000.0
                    effective_currency = "USDC"
            elif currency == "APAY":
                price = float(raw_amount) / 1e18
                effective_currency = "APAY"
            else:
                price = float(raw_amount) / 1_000_000.0
                effective_currency = "USDC"
        except (ValueError, TypeError):
            return initial_response
        receiver = headers.get("X-APay-Receiver")
        nonce = headers.get("X-APay-Nonce")

        if not receiver or not nonce:
            # Not a standard APay 402 response, return original response
            return initial_response

        # Check local wallet budget guardrails with correct currency
        can_pay, reason = self.wallet.can_spend(price, currency=effective_currency)
        if not can_pay:
            curr_label = "$APAY" if effective_currency == "APAY" else "USDC"
            prefix = "" if effective_currency == "APAY" else "$"
            raise PermissionError(
                f"[A-Pay Guardrail Triggered] Cannot pay {prefix}{price} {curr_label}: {reason}"
            )

        scheme = headers.get("X-APay-Scheme", "eip712" if self.use_eip712 else "legacy")
        chain_id = int(headers.get("X-APay-Chain-Id", str(DEFAULT_CHAIN_ID)))
        router = headers.get("X-APay-Router", DEFAULT_ROUTER_ADDRESS)

        if self.verify_seller_seal:
            seal_res = await acheck_seller_seal(receiver, network=f"eip155:{chain_id}")
            if not seal_res.get("proven"):
                reason = seal_res.get("reason") or "wallet.proven is false"
                raise PermissionError(
                    f"[A-Pay SealKeeper Guardrail] Payment blocked: seller wallet {receiver} is not proven on SealKeeper ({reason})"
                )

        if self.use_eip712 and scheme == "eip712":
            signature = self.wallet.sign_typed_payment(
                receiver=receiver,
                amount_base_units=raw_amount,
                nonce=nonce,
                chain_id=chain_id,
                router_address=router,
            )
            auth_header = f"APay eip712:{signature}:{self.wallet.address}:{nonce}:{raw_amount}"
        else:
            payload = f"APAY:{receiver}:{raw_amount}:{nonce}"
            signature = self.wallet.sign_challenge(payload)
            auth_header = f"APay sig:{signature}:{self.wallet.address}:{nonce}:{raw_amount}"

        req_headers = dict(kwargs.get("headers") or {})
        req_headers["Authorization"] = auth_header
        kwargs["headers"] = req_headers

        self.wallet.record_spend(price, currency=effective_currency)
        return await self.client.request(method, url, **kwargs)

    async def aclose(self) -> None:
        await self.client.aclose()


class APaySession:
    """Synchronous HTTP Session for simple Python scripts, LangChain, and CrewAI."""

    def __init__(
        self,
        wallet: AgentWallet,
        timeout: float = 30.0,
        use_eip712: bool = True,
        verify_seller_seal: bool = False,
    ) -> None:
        self.wallet = wallet
        self.client = httpx.Client(timeout=timeout)
        self.use_eip712 = use_eip712
        self.verify_seller_seal = verify_seller_seal

    def get(self, url: str, **kwargs: Any) -> httpx.Response:
        return self._request("GET", url, **kwargs)

    def post(self, url: str, **kwargs: Any) -> httpx.Response:
        return self._request("POST", url, **kwargs)

    def put(self, url: str, **kwargs: Any) -> httpx.Response:
        return self._request("PUT", url, **kwargs)

    def patch(self, url: str, **kwargs: Any) -> httpx.Response:
        return self._request("PATCH", url, **kwargs)

    def delete(self, url: str, **kwargs: Any) -> httpx.Response:
        return self._request("DELETE", url, **kwargs)

    def request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        return self._request(method, url, **kwargs)

    def _request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        response = self.client.request(method, url, **kwargs)

        if response.status_code == 402:
            headers = response.headers
            currency = headers.get("X-APay-Currency", "USDC").upper()
            raw_amount = headers.get("X-APay-Amount", "0")
            effective_currency = "USDC"

            try:
                if currency == "DUAL":
                    raw_apay = headers.get("X-APay-Amount-APAY")
                    raw_usdc = headers.get("X-APay-Amount-USDC")
                    if self.wallet.currency == "APAY" and raw_apay:
                        raw_amount = raw_apay
                        price = float(raw_amount) / 1e18
                        effective_currency = "APAY"
                    elif raw_usdc:
                        raw_amount = raw_usdc
                        price = float(raw_amount) / 1_000_000.0
                        effective_currency = "USDC"
                    else:
                        price = float(raw_amount) / 1_000_000.0
                        effective_currency = "USDC"
                elif currency == "APAY":
                    price = float(raw_amount) / 1e18
                    effective_currency = "APAY"
                else:
                    price = float(raw_amount) / 1_000_000.0
                    effective_currency = "USDC"
            except (ValueError, TypeError):
                return response
            receiver = headers.get("X-APay-Receiver")
            nonce = headers.get("X-APay-Nonce")

            if not receiver or not nonce:
                return response

            # Check local wallet budget guardrails with correct currency
            can_pay, reason = self.wallet.can_spend(price, currency=effective_currency)
            if not can_pay:
                curr_label = "$APAY" if effective_currency == "APAY" else "USDC"
                prefix = "" if effective_currency == "APAY" else "$"
                raise PermissionError(
                    f"[A-Pay Guardrail Triggered] Cannot pay {prefix}{price} {curr_label}: {reason}"
                )

            scheme = headers.get("X-APay-Scheme", "eip712" if self.use_eip712 else "legacy")
            chain_id = int(headers.get("X-APay-Chain-Id", str(DEFAULT_CHAIN_ID)))
            router = headers.get("X-APay-Router", DEFAULT_ROUTER_ADDRESS)

            if self.verify_seller_seal:
                seal_res = check_seller_seal(receiver, network=f"eip155:{chain_id}")
                if not seal_res.get("proven"):
                    reason = seal_res.get("reason") or "wallet.proven is false"
                    raise PermissionError(
                        f"[A-Pay SealKeeper Guardrail] Payment blocked: seller wallet {receiver} is not proven on SealKeeper ({reason})"
                    )

            if self.use_eip712 and scheme == "eip712":
                signature = self.wallet.sign_typed_payment(
                    receiver=receiver,
                    amount_base_units=raw_amount,
                    nonce=nonce,
                    chain_id=chain_id,
                    router_address=router,
                )
                auth_header = f"APay eip712:{signature}:{self.wallet.address}:{nonce}:{raw_amount}"
            else:
                payload = f"APAY:{receiver}:{raw_amount}:{nonce}"
                signature = self.wallet.sign_challenge(payload)
                auth_header = f"APay sig:{signature}:{self.wallet.address}:{nonce}:{raw_amount}"

            req_headers = dict(kwargs.get("headers") or {})
            req_headers["Authorization"] = auth_header
            kwargs["headers"] = req_headers

            self.wallet.record_spend(price, currency=effective_currency)
            return self.client.request(method, url, **kwargs)

        return response

    def close(self) -> None:
        self.client.close()
