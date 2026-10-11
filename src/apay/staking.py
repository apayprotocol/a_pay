"""
AI Agent Anti-Spam Staking & Slashing Client for A-Pay Protocol
Implements Pillar 3.4 of RULEBOOK.md:
AI Agents providing paid APIs stake a minimum 500 $APAY collateral bond.
Malicious outputs or SLA violations trigger slashing:
- 50% paid to challenger as bounty/compensation
- 50% permanently burned via APAYToken.burn()
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import eth_abi
import httpx
from eth_account import Account
from eth_hash.auto import keccak

from .wallet import AgentWallet

BASE_MAINNET_CHAIN_ID = 8453
BASE_SEPOLIA_CHAIN_ID = 84532

STAKING_VAULT_MAINNET = "0x3e35a9e802627a3d9a86d6554e72b1c446e34aaf"
STAKING_VAULT_SEPOLIA = "0xD2f3F4D97f4a3fdC9d4eEDfB9747BF9D80CF6225"

APAY_TOKEN_MAINNET = "0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3"
APAY_TOKEN_SEPOLIA = "0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3"

BASE_MAINNET_RPC_LIST = [
    "https://mainnet.base.org",
    "https://base-rpc.publicnode.com",
    "https://1rpc.io/base",
]

BASE_SEPOLIA_RPC_LIST = [
    "https://sepolia.base.org",
    "https://base-sepolia-rpc.publicnode.com",
    "https://base-sepolia.gateway.tenderly.co",
]

MIN_BOND_AMOUNT_APAY = 500.0


@dataclass
class StakeInfo:
    """Represents an agent's on-chain staking and bonding state."""

    agent_address: str
    active_stake_apay: float
    active_stake_wei: int
    unbonding_amount_apay: float
    unbonding_amount_wei: int
    unbonding_unlock_time: int
    is_bonded: bool


class StakingClient:
    """Client for managing AI agent collateral bonds, unbonding, and challenge slashing."""

    def __init__(
        self,
        vault_address: str | None = None,
        token_address: str | None = None,
        min_bond_amount: float = MIN_BOND_AMOUNT_APAY,
        network: str = "base-sepolia",
        rpc_urls: list[str] | None = None,
    ) -> None:
        self.network = network.lower()
        is_mainnet = self.network in ("base", "mainnet", "8453", "base-mainnet")
        self.chain_id = BASE_MAINNET_CHAIN_ID if is_mainnet else BASE_SEPOLIA_CHAIN_ID
        self.vault_address = vault_address or (STAKING_VAULT_MAINNET if is_mainnet else STAKING_VAULT_SEPOLIA)
        self.token_address = token_address or (APAY_TOKEN_MAINNET if is_mainnet else APAY_TOKEN_SEPOLIA)
        self.min_bond_amount = min_bond_amount
        default_rpcs = BASE_MAINNET_RPC_LIST if is_mainnet else BASE_SEPOLIA_RPC_LIST
        self.rpc_urls = list(rpc_urls) if rpc_urls else list(default_rpcs)

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

    # --- ABI Encoders ---

    def encode_stake_calldata(self, agent: str, amount_wei: int) -> str:
        """Encode ABI calldata for StakingVault.stake(address agent, uint256 amount)."""
        selector = keccak(b"stake(address,uint256)")[:4]
        encoded = eth_abi.encode(["address", "uint256"], [agent, amount_wei])
        return "0x" + (selector + encoded).hex()

    def encode_initiate_unstake_calldata(self, amount_wei: int) -> str:
        """Encode ABI calldata for StakingVault.initiateUnstake(uint256 amount)."""
        selector = keccak(b"initiateUnstake(uint256)")[:4]
        encoded = eth_abi.encode(["uint256"], [amount_wei])
        return "0x" + (selector + encoded).hex()

    def encode_finalize_unstake_calldata(self) -> str:
        """Encode ABI calldata for StakingVault.finalizeUnstake()."""
        selector = keccak(b"finalizeUnstake()")[:4]
        return "0x" + selector.hex()

    def encode_is_bonded_calldata(self, agent: str) -> str:
        """Encode ABI calldata for StakingVault.isBonded(address agent)."""
        selector = keccak(b"isBonded(address)")[:4]
        encoded = eth_abi.encode(["address"], [agent])
        return "0x" + (selector + encoded).hex()

    def encode_get_stake_info_calldata(self, agent: str) -> str:
        """Encode ABI calldata for StakingVault.getStakeInfo(address agent)."""
        selector = keccak(b"getStakeInfo(address)")[:4]
        encoded = eth_abi.encode(["address"], [agent])
        return "0x" + (selector + encoded).hex()

    def encode_slash_calldata(
        self,
        agent: str,
        challenger: str,
        slash_amount_wei: int,
        reason: str,
    ) -> str:
        """Encode ABI calldata for StakingVault.slash(address,address,uint256,string)."""
        selector = keccak(b"slash(address,address,uint256,string)")[:4]
        encoded = eth_abi.encode(
            ["address", "address", "uint256", "string"],
            [agent, challenger, slash_amount_wei, reason],
        )
        return "0x" + (selector + encoded).hex()

    # --- Client Operations ---

    def stake(
        self,
        agent_address: str,
        amount_apay: float,
        operator_private_key: str | None = None,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        """Deposits $APAY collateral into StakingVault for the specified agent."""
        amount_wei = int(amount_apay * 10**18)
        calldata = self.encode_stake_calldata(agent_address, amount_wei)

        if dry_run or not operator_private_key:
            return {
                "status": "simulated",
                "dry_run": True,
                "agent_address": agent_address,
                "amount_apay": amount_apay,
                "amount_wei": str(amount_wei),
                "is_bonded": amount_apay >= self.min_bond_amount,
                "calldata": calldata,
                "vault_address": self.vault_address,
                "chain_id": BASE_SEPOLIA_CHAIN_ID,
                "message": f"Staking simulation for {amount_apay} $APAY completed successfully.",
            }

        wallet = AgentWallet(private_key=operator_private_key)
        try:
            nonce_hex = self._call_rpc("eth_getTransactionCount", [wallet.address, "pending"])
            nonce = int(nonce_hex, 16)
            gas_price_hex = self._call_rpc("eth_gasPrice", [])
            gas_price = int(gas_price_hex, 16)

            tx = {
                "to": self.vault_address,
                "value": 0,
                "gas": 150_000,
                "gasPrice": gas_price,
                "nonce": nonce,
                "chainId": BASE_SEPOLIA_CHAIN_ID,
                "data": calldata,
            }
            signed_tx = Account.sign_transaction(tx, wallet.private_key)
            tx_hash = str(self._call_rpc("eth_sendRawTransaction", ["0x" + signed_tx.raw_transaction.hex()]))
        except Exception as err:
            raise RuntimeError(f"Staking on-chain broadcast failed: {err!s}") from err

        return {
            "status": "staked",
            "dry_run": False,
            "agent_address": agent_address,
            "depositor": wallet.address,
            "amount_apay": amount_apay,
            "amount_wei": str(amount_wei),
            "tx_hash": tx_hash,
            "explorer_url": f"https://sepolia.basescan.org/tx/{tx_hash}",
        }

    def is_bonded(self, agent_address: str, fallback_active_stake: float | None = None) -> bool:
        """Queries on-chain whether an agent meets the minimum collateral bond threshold."""
        if fallback_active_stake is not None:
            return fallback_active_stake >= self.min_bond_amount

        try:
            calldata = self.encode_is_bonded_calldata(agent_address)
            res_hex = self._call_rpc("eth_call", [{"to": self.vault_address, "data": calldata}, "latest"])
            if res_hex and res_hex != "0x":
                decoded = eth_abi.decode(["bool"], bytes.fromhex(res_hex.replace("0x", "")))
                return bool(decoded[0])
        except Exception:
            pass

        return False

    def slash(
        self,
        agent_address: str,
        challenger_address: str,
        slash_amount_apay: float,
        reason: str,
        category: str = "CORRUPTED_PAYLOAD",
        arbiter_private_key: str | None = None,
        dry_run: bool = False,
        sync_feed: bool = False,
        sync_feed_url: str = "https://apay-network.vercel.app/api/dispute",
    ) -> dict[str, Any]:
        """Slashes an agent's stake due to malicious or hallucinated output.

        - 50% of slashed stake is paid to challenger as refund/bounty.
        - 50% is permanently burned via APAYToken.burn().
        """
        slash_wei = int(slash_amount_apay * 10**18)
        challenger_reward_apay = slash_amount_apay / 2.0
        burn_amount_apay = slash_amount_apay - challenger_reward_apay

        calldata = self.encode_slash_calldata(agent_address, challenger_address, slash_wei, reason)

        explorer_prefix = (
            "https://basescan.org"
            if self.chain_id == BASE_MAINNET_CHAIN_ID
            else "https://sepolia.basescan.org"
        )

        if dry_run or not arbiter_private_key:
            simulated_tx = "0x" + "".join(
                f"{b:02x}"
                for b in keccak(f"{agent_address}:{challenger_address}:{slash_wei}:{reason}".encode())[:32]
            )
            res: dict[str, Any] = {
                "status": "slashed_simulated",
                "dry_run": True,
                "agent_address": agent_address,
                "challenger_address": challenger_address,
                "slashed_amount_apay": slash_amount_apay,
                "challenger_bounty_apay": challenger_reward_apay,
                "burned_apay": burn_amount_apay,
                "reason": reason,
                "category": category,
                "calldata": calldata,
                "tx_hash": simulated_tx,
                "explorer_url": f"{explorer_prefix}/tx/{simulated_tx}",
                "vault_address": self.vault_address,
                "chain_id": self.chain_id,
                "network": self.network,
                "message": f"Slashing simulation: {challenger_reward_apay} APAY to challenger, {burn_amount_apay} APAY burned.",
            }
            if sync_feed:
                self._sync_feed_event(res, sync_feed_url)
            return res

        arbiter = AgentWallet(private_key=arbiter_private_key)
        try:
            nonce_hex = self._call_rpc("eth_getTransactionCount", [arbiter.address, "pending"])
            nonce = int(nonce_hex, 16)
            gas_price_hex = self._call_rpc("eth_gasPrice", [])
            gas_price = int(gas_price_hex, 16)

            tx = {
                "to": self.vault_address,
                "value": 0,
                "gas": 200_000,
                "gasPrice": gas_price,
                "nonce": nonce,
                "chainId": self.chain_id,
                "data": calldata,
            }
            signed_tx = Account.sign_transaction(tx, arbiter.private_key)
            tx_hash = str(self._call_rpc("eth_sendRawTransaction", ["0x" + signed_tx.raw_transaction.hex()]))
        except Exception as err:
            raise RuntimeError(f"Slashing on-chain broadcast failed: {err!s}") from err

        real_res: dict[str, Any] = {
            "status": "slashed",
            "dry_run": False,
            "agent_address": agent_address,
            "challenger_address": challenger_address,
            "slashed_amount_apay": slash_amount_apay,
            "challenger_bounty_apay": challenger_reward_apay,
            "burned_apay": burn_amount_apay,
            "reason": reason,
            "category": category,
            "arbiter": arbiter.address,
            "tx_hash": tx_hash,
            "chain_id": self.chain_id,
            "network": self.network,
            "explorer_url": f"{explorer_prefix}/tx/{tx_hash}",
            "deflation_impact": f"{burn_amount_apay:,.2f} $APAY permanently destroyed.",
        }
        if sync_feed:
            self._sync_feed_event(real_res, sync_feed_url)
        return real_res

    def _sync_feed_event(self, event: dict[str, Any], url: str) -> None:
        """Broadcast slash event to web telemetry API."""
        try:
            payload = {
                "agentAddress": event["agent_address"],
                "challengerAddress": event["challenger_address"],
                "slashedAmountApay": event["slashed_amount_apay"],
                "reason": event["reason"],
                "category": event.get("category", "CORRUPTED_PAYLOAD"),
                "network": event.get("network", "base"),
                "txHash": event.get("tx_hash"),
            }
            with httpx.Client(timeout=4.0) as client:
                client.post(url, json=payload)
        except Exception:
            pass
