"""
A-Pay Multi-Agent Escrow Vault Client
Implements session key budget delegation for AI agent swarms backed by EscrowVault.sol.
Enables operators to fund a master vault and grant sub-agents time-bound, daily-limited
spending authorization without sharing master private keys.
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import eth_abi
import httpx
from eth_account import Account
from eth_hash.auto import keccak

from .wallet import AgentWallet

ESCROW_VAULT_ADDRESS = "0xd08c8a337e5339d1c083e06d74a9265956ceea16"
BASE_SEPOLIA_CHAIN_ID = 84532
DEFAULT_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
DEFAULT_APAY_ADDRESS = "0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3"
BASE_SEPOLIA_RPC_LIST = [
    "https://sepolia.base.org",
    "https://base-sepolia-rpc.publicnode.com",
    "https://base-sepolia.gateway.tenderly.co",
]


def to_token_base_units(token: str, amount: float) -> int:
    """Convert human-readable float token quantity to on-chain base units."""
    clean = token.lower()
    if (
        "036cbd53842c5426634e7929541ec2318f3dcf7e" in clean
        or "833589fcd6edb6e08f4c7c32d4f71b54bda02913" in clean
    ):
        return int(round(amount * 1_000_000))
    return int(round(amount * 10**18))


def from_token_base_units(token: str, base_units: int) -> float:
    """Convert on-chain base units to human-readable float quantity."""
    clean = token.lower()
    if (
        "036cbd53842c5426634e7929541ec2318f3dcf7e" in clean
        or "833589fcd6edb6e08f4c7c32d4f71b54bda02913" in clean
    ):
        return float(base_units) / 1_000_000.0
    return float(base_units) / 10**18


class EscrowError(Exception):
    """Base exception for escrow vault operations."""

    pass


class InsufficientBalanceError(EscrowError):
    pass


class UnauthorizedError(EscrowError):
    pass


class SessionExpiredError(EscrowError):
    pass


class DailyLimitExceededError(EscrowError):
    pass


@dataclass
class AgentSessionAuth:
    daily_limit: float
    spent_today: float
    last_reset_day: int
    expires_at: float
    active: bool


class EscrowVaultClient:
    """Non-custodial session key client for AI agent swarms and master operators."""

    def __init__(
        self,
        vault_address: str = ESCROW_VAULT_ADDRESS,
        chain_id: int = BASE_SEPOLIA_CHAIN_ID,
        state_file: str | Path | None = None,
        persist: bool = True,
        rpc_urls: list[str] | None = None,
    ) -> None:
        self.vault_address = vault_address
        self.chain_id = chain_id
        self.persist = persist
        self.rpc_urls = list(rpc_urls) if rpc_urls else list(BASE_SEPOLIA_RPC_LIST)
        if state_file is None:
            self.state_file = Path.home() / ".apay" / "escrow_state.json"
        else:
            self.state_file = Path(state_file)
        # In-memory protocol simulation state: operator -> token -> balance
        self._balances: dict[str, dict[str, float]] = {}
        # operator -> agent -> token -> AgentSessionAuth
        self._auths: dict[str, dict[str, dict[str, AgentSessionAuth]]] = {}
        if self.persist:
            self._load_state()

    def _load_state(self) -> None:
        if not self.state_file.exists():
            return
        try:
            with open(self.state_file, encoding="utf-8") as f:
                data = json.load(f)
            self._balances = data.get("balances", {})
            raw_auths = data.get("auths", {})
            self._auths = {}
            for op, agents in raw_auths.items():
                self._auths[op] = {}
                for ag, tokens in agents.items():
                    self._auths[op][ag] = {}
                    for tk, auth_data in tokens.items():
                        self._auths[op][ag][tk] = AgentSessionAuth(**auth_data)
        except Exception:
            pass

    def _save_state(self) -> None:
        if not self.persist:
            return
        try:
            self.state_file.parent.mkdir(parents=True, exist_ok=True)
            serializable_auths: dict[str, Any] = {}
            for op, agents in self._auths.items():
                serializable_auths[op] = {}
                for ag, tokens in agents.items():
                    serializable_auths[op][ag] = {}
                    for tk, auth in tokens.items():
                        serializable_auths[op][ag][tk] = asdict(auth)
            payload = {
                "balances": self._balances,
                "auths": serializable_auths,
            }
            with open(self.state_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
        except Exception:
            pass

    def _normalize_addr(self, addr: str) -> str:
        return addr.lower().strip()

    def _call_rpc(self, method: str, params: list[Any]) -> Any:
        """Call JSON-RPC with automated multi-endpoint fallback."""
        payload = {"jsonrpc": "2.0", "method": method, "params": params, "id": 1}
        last_err: Exception | None = None

        for endpoint in self.rpc_urls:
            try:
                with httpx.Client(timeout=8.0) as client:
                    resp = client.post(endpoint, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        if "result" in data:
                            return data["result"]
                        if "error" in data:
                            raise RuntimeError(f"RPC Error: {data['error']}")
            except Exception as err:
                last_err = err
                continue

        if last_err:
            raise RuntimeError(f"All RPC endpoints failed. Last error: {last_err!s}")
        raise RuntimeError("No response from RPC endpoints.")

    def _broadcast_tx(
        self,
        wallet: AgentWallet,
        to: str,
        calldata: str,
        gas_limit: int = 180_000,
        dry_run: bool = False,
    ) -> str:
        """Construct, sign, and broadcast an EIP-1559/legacy transaction via raw JSON-RPC."""
        if dry_run:
            return (
                "0x"
                + hashlib.sha256(f"escrow_sim:{wallet.address}:{calldata}:{time.time()}".encode()).hexdigest()
            )

        try:
            nonce_hex = self._call_rpc("eth_getTransactionCount", [wallet.address, "pending"])
            nonce = int(nonce_hex, 16)

            gas_price_hex = self._call_rpc("eth_gasPrice", [])
            gas_price = int(gas_price_hex, 16)

            from eth_utils import to_checksum_address

            tx = {
                "to": to_checksum_address(to),
                "value": 0,
                "gas": gas_limit,
                "gasPrice": gas_price,
                "nonce": nonce,
                "chainId": self.chain_id,
                "data": calldata,
            }

            signed_tx = Account.sign_transaction(tx, wallet.private_key)
            raw_tx_hex = "0x" + signed_tx.raw_transaction.hex()

            tx_hash = self._call_rpc("eth_sendRawTransaction", [raw_tx_hex])
            return str(tx_hash)
        except Exception as err:
            raise RuntimeError(f"Escrow transaction on-chain broadcast failed: {err!s}") from err

    # --- ABI Calldata Encoders for EscrowVault.sol ---

    def encode_deposit_calldata(self, token: str, amount_units: int) -> str:
        selector = keccak(b"deposit(address,uint256)")[:4]
        encoded = eth_abi.encode(["address", "uint256"], [token, amount_units])
        return "0x" + (selector + encoded).hex()

    def encode_withdraw_calldata(self, token: str, amount_units: int) -> str:
        selector = keccak(b"withdraw(address,uint256)")[:4]
        encoded = eth_abi.encode(["address", "uint256"], [token, amount_units])
        return "0x" + (selector + encoded).hex()

    def encode_authorize_agent_calldata(
        self, agent: str, token: str, daily_limit_units: int, expires_at: int
    ) -> str:
        selector = keccak(b"authorizeAgent(address,address,uint256,uint256)")[:4]
        encoded = eth_abi.encode(
            ["address", "address", "uint256", "uint256"],
            [agent, token, daily_limit_units, expires_at],
        )
        return "0x" + (selector + encoded).hex()

    def encode_revoke_agent_calldata(self, agent: str, token: str) -> str:
        selector = keccak(b"revokeAgent(address,address)")[:4]
        encoded = eth_abi.encode(["address", "address"], [agent, token])
        return "0x" + (selector + encoded).hex()

    def encode_spend_calldata(self, operator: str, token: str, recipient: str, amount_units: int) -> str:
        selector = keccak(b"spend(address,address,address,uint256)")[:4]
        encoded = eth_abi.encode(
            ["address", "address", "address", "uint256"],
            [operator, token, recipient, amount_units],
        )
        return "0x" + (selector + encoded).hex()

    def deposit(
        self,
        token: str,
        amount: float,
        operator_private_key: str | None = None,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        """Deposit funds into operator's master vault balance."""
        if amount <= 0:
            raise ValueError("Deposit amount must be positive.")

        token_norm = self._normalize_addr(token)
        if operator_private_key:
            operator_addr = self._normalize_addr(AgentWallet(private_key=operator_private_key).address)
        else:
            operator_addr = "0x5ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc"

        amount_units = to_token_base_units(token_norm, amount)
        calldata = self.encode_deposit_calldata(token_norm, amount_units)

        if operator_addr not in self._balances:
            self._balances[operator_addr] = {}
        self._balances[operator_addr][token_norm] = (
            self._balances[operator_addr].get(token_norm, 0.0) + amount
        )
        self._save_state()

        if operator_private_key and not dry_run:
            wallet = AgentWallet(private_key=operator_private_key)
            tx_hash = self._broadcast_tx(
                wallet=wallet, to=self.vault_address, calldata=calldata, gas_limit=180_000
            )
        else:
            tx_hash = (
                "0x"
                + hashlib.sha256(
                    f"dep:{operator_addr}:{token_norm}:{amount}:{time.time()}".encode()
                ).hexdigest()
            )

        return {
            "status": "deposited",
            "dry_run": dry_run or (operator_private_key is None),
            "operator": operator_addr,
            "token": token,
            "amount": amount,
            "amount_units": amount_units,
            "vault_balance": self._balances[operator_addr][token_norm],
            "calldata": calldata,
            "tx_hash": tx_hash,
            "explorer_url": f"https://sepolia.basescan.org/tx/{tx_hash}",
        }

    def withdraw(
        self,
        token: str,
        amount: float,
        operator_private_key: str | None = None,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        """Withdraw deposited funds from master vault balance."""
        if amount <= 0:
            raise ValueError("Withdraw amount must be positive.")

        token_norm = self._normalize_addr(token)
        if operator_private_key:
            operator_addr = self._normalize_addr(AgentWallet(private_key=operator_private_key).address)
        else:
            operator_addr = "0x5ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc"

        curr_bal = self._balances.get(operator_addr, {}).get(token_norm, 0.0)
        if curr_bal < amount:
            raise InsufficientBalanceError(
                f"Insufficient vault balance: have {curr_bal:.4f}, requested {amount:.4f}"
            )

        amount_units = to_token_base_units(token_norm, amount)
        calldata = self.encode_withdraw_calldata(token_norm, amount_units)

        self._balances[operator_addr][token_norm] = curr_bal - amount
        self._save_state()

        if operator_private_key and not dry_run:
            wallet = AgentWallet(private_key=operator_private_key)
            tx_hash = self._broadcast_tx(
                wallet=wallet, to=self.vault_address, calldata=calldata, gas_limit=150_000
            )
        else:
            tx_hash = (
                "0x"
                + hashlib.sha256(
                    f"wdr:{operator_addr}:{token_norm}:{amount}:{time.time()}".encode()
                ).hexdigest()
            )

        return {
            "status": "withdrawn",
            "dry_run": dry_run or (operator_private_key is None),
            "operator": operator_addr,
            "token": token,
            "amount": amount,
            "amount_units": amount_units,
            "vault_balance": self._balances[operator_addr][token_norm],
            "calldata": calldata,
            "tx_hash": tx_hash,
            "explorer_url": f"https://sepolia.basescan.org/tx/{tx_hash}",
        }

    def authorize_agent(
        self,
        agent_address: str,
        token: str,
        daily_limit: float,
        expiry_hours: float = 24.0,
        operator_private_key: str | None = None,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        """Authorize a sub-agent session key with a daily spend limit and expiration."""
        if daily_limit <= 0:
            raise ValueError("Daily limit must be positive.")
        if expiry_hours <= 0:
            raise ValueError("Expiry hours must be positive.")

        agent_norm = self._normalize_addr(agent_address)
        token_norm = self._normalize_addr(token)
        if operator_private_key:
            operator_addr = self._normalize_addr(AgentWallet(private_key=operator_private_key).address)
        else:
            operator_addr = "0x5ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc"

        expires_at = time.time() + (expiry_hours * 3600.0)
        current_day = int(time.time() // 86400)
        daily_limit_units = to_token_base_units(token_norm, daily_limit)

        calldata = self.encode_authorize_agent_calldata(
            agent=agent_norm,
            token=token_norm,
            daily_limit_units=daily_limit_units,
            expires_at=int(expires_at),
        )

        if operator_addr not in self._auths:
            self._auths[operator_addr] = {}
        if agent_norm not in self._auths[operator_addr]:
            self._auths[operator_addr][agent_norm] = {}

        self._auths[operator_addr][agent_norm][token_norm] = AgentSessionAuth(
            daily_limit=daily_limit,
            spent_today=0.0,
            last_reset_day=current_day,
            expires_at=expires_at,
            active=True,
        )
        self._save_state()

        if operator_private_key and not dry_run:
            wallet = AgentWallet(private_key=operator_private_key)
            tx_hash = self._broadcast_tx(
                wallet=wallet, to=self.vault_address, calldata=calldata, gas_limit=150_000
            )
        else:
            tx_hash = (
                "0x" + hashlib.sha256(f"auth:{operator_addr}:{agent_norm}:{time.time()}".encode()).hexdigest()
            )

        return {
            "status": "authorized",
            "dry_run": dry_run or (operator_private_key is None),
            "operator": operator_addr,
            "agent": agent_norm,
            "token": token,
            "daily_limit": daily_limit,
            "daily_limit_units": daily_limit_units,
            "expires_at": expires_at,
            "expiry_hours": expiry_hours,
            "calldata": calldata,
            "tx_hash": tx_hash,
            "explorer_url": f"https://sepolia.basescan.org/tx/{tx_hash}",
        }

    def revoke_agent(
        self,
        agent_address: str,
        token: str,
        operator_private_key: str | None = None,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        """Revoke a sub-agent's session key authorization."""
        agent_norm = self._normalize_addr(agent_address)
        token_norm = self._normalize_addr(token)
        if operator_private_key:
            operator_addr = self._normalize_addr(AgentWallet(private_key=operator_private_key).address)
        else:
            operator_addr = "0x5ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc"

        calldata = self.encode_revoke_agent_calldata(agent=agent_norm, token=token_norm)

        auth = self._auths.get(operator_addr, {}).get(agent_norm, {}).get(token_norm)
        if auth:
            auth.active = False
            self._save_state()

        if operator_private_key and not dry_run:
            wallet = AgentWallet(private_key=operator_private_key)
            tx_hash = self._broadcast_tx(
                wallet=wallet, to=self.vault_address, calldata=calldata, gas_limit=100_000
            )
        else:
            tx_hash = (
                "0x" + hashlib.sha256(f"rvk:{operator_addr}:{agent_norm}:{time.time()}".encode()).hexdigest()
            )

        return {
            "status": "revoked",
            "dry_run": dry_run or (operator_private_key is None),
            "operator": operator_addr,
            "agent": agent_norm,
            "token": token,
            "calldata": calldata,
            "tx_hash": tx_hash,
            "explorer_url": f"https://sepolia.basescan.org/tx/{tx_hash}",
        }

    def spend(
        self,
        operator_address: str,
        token: str,
        recipient: str,
        amount: float,
        agent_private_key: str | None = None,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        """Execute spend from operator balance on behalf of authorized sub-agent."""
        if amount <= 0:
            raise ValueError("Spend amount must be positive.")

        operator_norm = self._normalize_addr(operator_address)
        token_norm = self._normalize_addr(token)
        recipient_norm = self._normalize_addr(recipient)

        if agent_private_key:
            agent_addr = self._normalize_addr(AgentWallet(private_key=agent_private_key).address)
        else:
            raise ValueError("Sub-agent private key is required to authorize spend.")

        auth = self._auths.get(operator_norm, {}).get(agent_addr, {}).get(token_norm)
        if not auth or not auth.active:
            raise UnauthorizedError(
                f"Agent {agent_addr} is not actively authorized by operator {operator_norm}."
            )

        now = time.time()
        if now > auth.expires_at:
            raise SessionExpiredError(
                f"Session key expired for agent {agent_addr} at timestamp {auth.expires_at:.0f}."
            )

        # Check and update rolling 24h reset day
        current_day = int(now // 86400)
        if current_day > auth.last_reset_day:
            auth.spent_today = 0.0
            auth.last_reset_day = current_day

        if auth.spent_today + amount > auth.daily_limit:
            remaining = max(0.0, auth.daily_limit - auth.spent_today)
            raise DailyLimitExceededError(
                f"Daily limit exceeded: spend of {amount:.4f} exceeds remaining allowance {remaining:.4f} "
                f"(daily limit: {auth.daily_limit:.4f}, spent today: {auth.spent_today:.4f})."
            )

        op_balance = self._balances.get(operator_norm, {}).get(token_norm, 0.0)
        if op_balance < amount:
            raise InsufficientBalanceError(
                f"Master vault has insufficient balance: {op_balance:.4f} available, required {amount:.4f}."
            )

        amount_units = to_token_base_units(token_norm, amount)
        calldata = self.encode_spend_calldata(
            operator=operator_norm,
            token=token_norm,
            recipient=recipient_norm,
            amount_units=amount_units,
        )

        # Apply state changes
        auth.spent_today += amount
        self._balances[operator_norm][token_norm] = op_balance - amount
        self._save_state()

        if agent_private_key and not dry_run:
            agent_wallet = AgentWallet(private_key=agent_private_key)
            tx_hash = self._broadcast_tx(
                wallet=agent_wallet, to=self.vault_address, calldata=calldata, gas_limit=180_000
            )
        else:
            tx_hash = (
                "0x"
                + hashlib.sha256(
                    f"spn:{operator_norm}:{agent_addr}:{amount}:{time.time()}".encode()
                ).hexdigest()
            )

        return {
            "status": "spent",
            "dry_run": dry_run,
            "operator": operator_norm,
            "agent": agent_addr,
            "recipient": recipient_norm,
            "amount": amount,
            "amount_units": amount_units,
            "spent_today": auth.spent_today,
            "daily_limit": auth.daily_limit,
            "remaining_today": auth.daily_limit - auth.spent_today,
            "calldata": calldata,
            "tx_hash": tx_hash,
            "explorer_url": f"https://sepolia.basescan.org/tx/{tx_hash}",
        }

    def get_authorization(
        self, operator_address: str, agent_address: str, token: str
    ) -> dict[str, Any] | None:
        """Query authorization state for an agent."""
        op_norm = self._normalize_addr(operator_address)
        agent_norm = self._normalize_addr(agent_address)
        token_norm = self._normalize_addr(token)

        auth = self._auths.get(op_norm, {}).get(agent_norm, {}).get(token_norm)
        if not auth:
            return None

        now = time.time()
        is_expired = now > auth.expires_at
        current_day = int(now // 86400)
        spent_today = 0.0 if current_day > auth.last_reset_day else auth.spent_today

        return {
            "operator": op_norm,
            "agent": agent_norm,
            "token": token_norm,
            "active": auth.active and not is_expired,
            "daily_limit": auth.daily_limit,
            "spent_today": spent_today,
            "remaining_today": max(0.0, auth.daily_limit - spent_today),
            "expires_at": auth.expires_at,
            "is_expired": is_expired,
        }

    def get_balance(self, operator_address: str, token: str) -> float:
        """Query vault balance for an operator and token."""
        op_norm = self._normalize_addr(operator_address)
        token_norm = self._normalize_addr(token)
        return self._balances.get(op_norm, {}).get(token_norm, 0.0)

    def get_onchain_balance(self, operator_address: str, token: str) -> float | None:
        """Query real on-chain deposit balance from EscrowVault.balances(operator, token)."""
        op_norm = self._normalize_addr(operator_address)
        token_norm = self._normalize_addr(token)
        try:
            selector = keccak(b"balances(address,address)")[:4]
            data = "0x" + (selector + eth_abi.encode(["address", "address"], [op_norm, token_norm])).hex()
            res_hex = self._call_rpc("eth_call", [{"to": self.vault_address, "data": data}, "latest"])
            if res_hex and res_hex != "0x":
                base_units = int(res_hex, 16)
                bal = from_token_base_units(token_norm, base_units)
                if op_norm not in self._balances:
                    self._balances[op_norm] = {}
                self._balances[op_norm][token_norm] = bal
                self._save_state()
                return bal
        except Exception:
            pass
        return None
