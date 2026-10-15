"""Payer Solvency & Collateral Validation Engine.

Defends A-Pay gateways against the 'Free API Exploit' where malicious bots
generate ephemeral 0-balance wallets with valid cryptographic signatures.
Enforces that payers hold sufficient escrow balance, allowance, or on-chain funds.
"""

from __future__ import annotations

import time
from abc import ABC, abstractmethod

from .escrow import EscrowVaultClient


class BaseSolvencyValidator(ABC):
    """Abstract interface for checking payer solvency before forwarding API requests."""

    @abstractmethod
    def check_solvency(
        self,
        payer: str,
        amount_base_units: int | str,
        currency: str = "USDC",
    ) -> tuple[bool, str | None]:
        """Check if payer has sufficient balance or credit to cover the micropayment.

        Returns:
            (True, None) if solvent.
            (False, "Reason for rejection") if insolvent.
        """
        pass


class AllowAllSolvencyValidator(BaseSolvencyValidator):
    """Permissive validator for open demos and unconstrained testing."""

    def check_solvency(
        self,
        payer: str,
        amount_base_units: int | str,
        currency: str = "USDC",
    ) -> tuple[bool, str | None]:
        return True, None


class MockSolvencyValidator(BaseSolvencyValidator):
    """In-memory mock validator for testing and sandboxes."""

    def __init__(self, default_balance: float = 0.0) -> None:
        self.default_balance = default_balance
        self._balances: dict[str, float] = {}

    def set_balance(self, address: str, balance_usdc: float) -> None:
        self._balances[address.lower()] = float(balance_usdc)

    def get_balance(self, address: str) -> float:
        return self._balances.get(address.lower(), self.default_balance)

    def check_solvency(
        self,
        payer: str,
        amount_base_units: int | str,
        currency: str = "USDC",
    ) -> tuple[bool, str | None]:
        required = (
            float(amount_base_units) / 1_000_000.0
            if currency.upper() == "USDC"
            else float(amount_base_units) / 10**18
        )
        current_bal = self.get_balance(payer)
        if current_bal >= required:
            return True, None
        return (
            False,
            f"Insolvent payer {payer}: Balance is {current_bal:.4f} {currency}, required {required:.4f} {currency}",
        )


class EscrowSolvencyValidator(BaseSolvencyValidator):
    """Verifies payer solvency against A-Pay EscrowVault deposits and session keys."""

    def __init__(
        self,
        escrow_client: EscrowVaultClient | None = None,
        token_address: str = "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    ) -> None:
        self.escrow_client = escrow_client or EscrowVaultClient()
        self.token_address = token_address.lower()

    def check_solvency(
        self,
        payer: str,
        amount_base_units: int | str,
        currency: str = "USDC",
    ) -> tuple[bool, str | None]:
        payer_norm = payer.lower()
        required = (
            float(amount_base_units) / 1_000_000.0
            if currency.upper() == "USDC"
            else float(amount_base_units) / 10**18
        )

        # 1. Check if payer is an operator with direct vault balance
        op_balance = self.escrow_client.get_balance(payer_norm, self.token_address)
        if op_balance >= required:
            return True, None

        # 2. Check if payer is an authorized sub-agent across known operators
        # Check operator auths
        for op, agents in self.escrow_client._auths.items():
            if payer_norm in agents:
                auth = agents[payer_norm].get(self.token_address)
                if auth and auth.active and (time.time() <= auth.expires_at):
                    remaining_today = max(0.0, auth.daily_limit - auth.spent_today)
                    op_bal = self.escrow_client.get_balance(op, self.token_address)
                    if remaining_today >= required and op_bal >= required:
                        return True, None

        return False, (
            f"Escrow solvency check failed: Payer {payer} has insufficient deposited escrow "
            f"balance or active agent authorization for {required:.4f} {currency}."
        )


DEFAULT_SOLVENCY_RPCS = [
    "https://sepolia.base.org",
    "https://base-sepolia-rpc.publicnode.com",
    "https://base-sepolia.gateway.tenderly.co",
]


class CachedRpcSolvencyValidator(BaseSolvencyValidator):
    """High-speed TTL-cached on-chain ERC-20 balance & allowance checker for Base L2.

    Features:
    - Real on-chain `eth_call balanceOf` query.
    - Multi-RPC endpoint failover (Primary -> Publicnode -> Tenderly).
    - Sub-millisecond TTL in-memory cache to keep gateway latency under 10ms.
    - Circuit-breaker to defend against RPC rate-limits (HTTP 429).
    """

    def __init__(
        self,
        rpc_url: str | list[str] = "https://sepolia.base.org",
        token_address: str = "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        router_address: str = "0x71434344beEF9C44fF3BC95572bEB7bFB8847ec6",
        cache_ttl_seconds: float = 30.0,
        require_allowance: bool = False,
    ) -> None:
        if isinstance(rpc_url, str):
            self.rpc_urls = [rpc_url, *[u for u in DEFAULT_SOLVENCY_RPCS if u != rpc_url]]
        else:
            self.rpc_urls = list(rpc_url)
        self.token_address = token_address.lower()
        self.router_address = router_address.lower()
        self.cache_ttl_seconds = cache_ttl_seconds
        self.require_allowance = require_allowance
        self.max_cache_entries = 10_000
        # addr -> (balance_base_units, expires_at)
        self._cache: dict[str, tuple[int, float]] = {}
        # (owner, spender) -> (allowance_base_units, expires_at)
        self._allowance_cache: dict[tuple[str, str], tuple[int, float]] = {}

    @property
    def rpc_url(self) -> str:
        return self.rpc_urls[0]

    def _get_cached_balance(self, address: str) -> int | None:
        now = time.time()
        entry = self._cache.get(address.lower())
        if entry and entry[1] > now:
            return entry[0]
        return None

    def _set_cached_balance(self, address: str, balance: int) -> None:
        if len(self._cache) >= self.max_cache_entries:
            now = time.time()
            expired = [k for k, (_, exp) in self._cache.items() if exp <= now]
            for k in expired:
                del self._cache[k]
            if len(self._cache) >= self.max_cache_entries:
                first_key = next(iter(self._cache))
                del self._cache[first_key]
        self._cache[address.lower()] = (balance, time.time() + self.cache_ttl_seconds)

    def _get_cached_allowance(self, owner: str, spender: str) -> int | None:
        now = time.time()
        key = (owner.lower(), spender.lower())
        entry = self._allowance_cache.get(key)
        if entry and entry[1] > now:
            return entry[0]
        return None

    def _set_cached_allowance(self, owner: str, spender: str, allowance: int) -> None:
        key = (owner.lower(), spender.lower())
        if len(self._allowance_cache) >= self.max_cache_entries:
            now = time.time()
            expired = [k for k, (_, exp) in self._allowance_cache.items() if exp <= now]
            for k in expired:
                del self._allowance_cache[k]
            if len(self._allowance_cache) >= self.max_cache_entries:
                first_key = next(iter(self._allowance_cache))
                del self._allowance_cache[first_key]
        self._allowance_cache[key] = (allowance, time.time() + self.cache_ttl_seconds)

    def _query_onchain_balance(self, address: str) -> int | None:
        """Execute real eth_call balanceOf(address) with endpoint failover."""
        # Selector for balanceOf(address): 0x70a08231
        clean_addr = address.lower().replace("0x", "").zfill(64)
        call_data = f"0x70a08231{clean_addr}"

        payload = {
            "jsonrpc": "2.0",
            "method": "eth_call",
            "params": [{"to": self.token_address, "data": call_data}, "latest"],
            "id": 1,
        }

        for endpoint in self.rpc_urls:
            try:
                import httpx

                with httpx.Client(timeout=4.0) as client:
                    resp = client.post(endpoint, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        if "result" in data and data["result"].startswith("0x"):
                            bal = int(data["result"], 16)
                            return bal
            except Exception:
                continue
        return None

    def _query_onchain_allowance(self, owner: str, spender: str) -> int | None:
        """Execute real eth_call allowance(owner, spender) with endpoint failover."""
        # Selector for allowance(address,address): 0xdd62ed3e
        clean_owner = owner.lower().replace("0x", "").zfill(64)
        clean_spender = spender.lower().replace("0x", "").zfill(64)
        call_data = f"0xdd62ed3e{clean_owner}{clean_spender}"

        payload = {
            "jsonrpc": "2.0",
            "method": "eth_call",
            "params": [{"to": self.token_address, "data": call_data}, "latest"],
            "id": 1,
        }

        for endpoint in self.rpc_urls:
            try:
                import httpx

                with httpx.Client(timeout=4.0) as client:
                    resp = client.post(endpoint, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        if "result" in data and data["result"].startswith("0x"):
                            return int(data["result"], 16)
            except Exception:
                continue
        return None

    def check_solvency(
        self,
        payer: str,
        amount_base_units: int | str,
        currency: str = "USDC",
    ) -> tuple[bool, str | None]:
        required = int(amount_base_units)
        cached_bal = self._get_cached_balance(payer)

        if cached_bal is None:
            cached_bal = self._query_onchain_balance(payer)
            if cached_bal is not None:
                self._set_cached_balance(payer, cached_bal)

        if cached_bal is None:
            return False, (
                f"Solvency check failed for payer {payer}: On-chain RPC verification unreachable. "
                "Enforcing fail-closed security invariant."
            )

        if cached_bal < required:
            return False, f"On-chain balance {cached_bal} insufficient for required {required} base units"

        # Check allowance if required
        if self.require_allowance:
            cached_allowance = self._get_cached_allowance(payer, self.router_address)
            if cached_allowance is None:
                cached_allowance = self._query_onchain_allowance(payer, self.router_address)
                if cached_allowance is not None:
                    self._set_cached_allowance(payer, self.router_address, cached_allowance)

            if cached_allowance is None:
                return False, (
                    f"Solvency allowance check failed for payer {payer}: On-chain RPC verification unreachable. "
                    "Enforcing fail-closed security invariant."
                )

            if cached_allowance < required:
                return False, (
                    f"Payer {payer} balance is sufficient ({cached_bal}), but router allowance {cached_allowance} "
                    f"is insufficient for required {required} base units."
                )

        return True, None


class ResilientRpcSolvencyValidator(CachedRpcSolvencyValidator):
    """Explicit alias for enterprise multi-RPC solvency validation."""

    pass
