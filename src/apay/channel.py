"""Cumulative State Channels & Micro-Voucher Engine for High-Throughput M2M Scaling.

Solves the Layer-2 blockchain TPS limit:
Instead of submitting millions of individual micropayments to the blockchain,
an AI agent and service provider exchange monotonically increasing off-chain
cryptographic balance vouchers.

When the session completes or epoch flushes, only the SINGLE highest voucher
is broadcast to APayRouterV2.closeCumulativeChannel, settling 100,000+ API calls in 1 tx.
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass
from typing import Any

from eth_account import Account
from eth_account.messages import encode_typed_data

from .wallet import DEFAULT_CHAIN_ID, DEFAULT_ROUTER_ADDRESS, AgentWallet

CHANNEL_EIP712_TYPES: dict[str, list[dict[str, str]]] = {
    "ChannelVoucher": [
        {"name": "channelId", "type": "bytes32"},
        {"name": "payer", "type": "address"},
        {"name": "receiver", "type": "address"},
        {"name": "cumulativeAmount", "type": "uint256"},
        {"name": "sequence", "type": "uint256"},
    ]
}


@dataclass
class ChannelVoucher:
    channel_id: str  # bytes32 hex (0x...)
    payer: str
    receiver: str
    cumulative_amount_base_units: int
    sequence: int
    signature: str

    def to_header(self) -> str:
        """Format as compact HTTP Authorization header."""
        return (
            f"APay channel:{self.channel_id}:{self.payer}:{self.receiver}:"
            f"{self.cumulative_amount_base_units}:{self.sequence}:{self.signature}"
        )

    @classmethod
    def from_header(cls, header: str) -> ChannelVoucher:
        clean = header.replace("APay channel:", "").strip()
        parts = clean.split(":")
        if len(parts) < 6:
            raise ValueError("Malformed APay channel header")
        return cls(
            channel_id=parts[0],
            payer=parts[1],
            receiver=parts[2],
            cumulative_amount_base_units=int(parts[3]),
            sequence=int(parts[4]),
            signature=parts[5],
        )


class ChannelPayerSession:
    """Client-side state channel voucher generator for AI Agents."""

    def __init__(
        self,
        wallet: AgentWallet,
        receiver: str,
        channel_id: str | None = None,
        max_cumulative_usdc: float = 100.0,
        currency: str = "USDC",
        max_cumulative_amount: float | None = None,
        chain_id: int = DEFAULT_CHAIN_ID,
        router_address: str = DEFAULT_ROUTER_ADDRESS,
    ) -> None:
        self.wallet = wallet
        self.receiver = receiver.lower()
        self.channel_id = channel_id or ("0x" + secrets.token_hex(32))
        self.currency = currency.upper()
        effective_cap = max_cumulative_amount if max_cumulative_amount is not None else max_cumulative_usdc
        if self.currency == "APAY":
            self.max_cumulative_units = int(round(effective_cap * 10**18))
        else:
            self.max_cumulative_units = int(round(effective_cap * 1_000_000))
        self.chain_id = chain_id
        self.router_address = router_address.lower()

        self.cumulative_amount: int = 0
        self.sequence: int = 0

    def next_voucher(self, cost_base_units: int) -> ChannelVoucher:
        """Increment cumulative cost and sign the next channel voucher."""
        new_total = self.cumulative_amount + cost_base_units
        if new_total > self.max_cumulative_units:
            raise PermissionError(
                f"[Channel Limit Exceeded] Spend would reach {new_total} units (Cap: {self.max_cumulative_units})"
            )

        self.sequence += 1
        self.cumulative_amount = new_total

        # Build EIP-712 structured data
        domain = {
            "name": "APay Protocol",
            "version": "1",
            "chainId": self.chain_id,
            "verifyingContract": self.router_address,
        }
        message = {
            "channelId": bytes.fromhex(self.channel_id.replace("0x", "")),
            "payer": self.wallet.address,
            "receiver": self.receiver,
            "cumulativeAmount": self.cumulative_amount,
            "sequence": self.sequence,
        }
        signable = encode_typed_data(
            domain_data=domain,
            message_types=CHANNEL_EIP712_TYPES,
            message_data=message,
        )
        signed = self.wallet._account.sign_message(signable)
        sig = signed.signature.hex()

        return ChannelVoucher(
            channel_id=self.channel_id,
            payer=self.wallet.address,
            receiver=self.receiver,
            cumulative_amount_base_units=self.cumulative_amount,
            sequence=self.sequence,
            signature=sig,
        )


class ChannelReceiverValidator:
    """Server-side state channel receiver & validator for API Providers."""

    def __init__(
        self,
        receiver_wallet: str,
        chain_id: int = DEFAULT_CHAIN_ID,
        router_address: str = DEFAULT_ROUTER_ADDRESS,
    ) -> None:
        self.receiver_wallet = receiver_wallet.lower()
        self.chain_id = chain_id
        self.router_address = router_address.lower()

        # channel_id -> {"last_sequence": int, "last_amount": int, "latest_voucher": ChannelVoucher}
        self._channels: dict[str, dict[str, Any]] = {}

    def verify_voucher(
        self,
        voucher: ChannelVoucher,
        expected_delta_units: int,
    ) -> tuple[bool, str | None]:
        """Verify voucher cryptographically, check sequence monotonicity and correct increment."""
        if voucher.receiver.lower() != self.receiver_wallet:
            return False, f"Receiver mismatch: voucher destined for {voucher.receiver}"

        channel_id = voucher.channel_id.lower()
        chan = self._channels.get(channel_id)

        last_seq = chan["last_sequence"] if chan else 0
        last_amt = chan["last_amount"] if chan else 0

        # Monotonic sequence check
        if voucher.sequence <= last_seq:
            return False, f"Stale sequence: got {voucher.sequence}, expected > {last_seq}"

        # Exact delta check
        expected_new_amt = last_amt + expected_delta_units
        if voucher.cumulative_amount_base_units < expected_new_amt:
            return (
                False,
                f"Underpayment: got cumulative {voucher.cumulative_amount_base_units}, expected at least {expected_new_amt}",
            )

        # Cryptographic EIP-712 recovery
        domain = {
            "name": "APay Protocol",
            "version": "1",
            "chainId": self.chain_id,
            "verifyingContract": self.router_address,
        }
        message = {
            "channelId": bytes.fromhex(voucher.channel_id.replace("0x", "")),
            "payer": voucher.payer,
            "receiver": voucher.receiver,
            "cumulativeAmount": voucher.cumulative_amount_base_units,
            "sequence": voucher.sequence,
        }
        try:
            signable = encode_typed_data(
                domain_data=domain,
                message_types=CHANNEL_EIP712_TYPES,
                message_data=message,
            )
            recovered = Account.recover_message(signable, signature=voucher.signature)
            if recovered.lower() != voucher.payer.lower():
                return False, f"Invalid signature: recovered {recovered}, expected {voucher.payer}"
        except Exception as err:
            return False, f"Signature recovery failed: {err!s}"

        # Update channel state
        self._channels[channel_id] = {
            "last_sequence": voucher.sequence,
            "last_amount": voucher.cumulative_amount_base_units,
            "latest_voucher": voucher,
        }
        return True, None

    def get_latest_voucher(self, channel_id: str) -> ChannelVoucher | None:
        chan = self._channels.get(channel_id.lower())
        if chan:
            return chan["latest_voucher"]
        return None

    def export_closing_calldata(self, channel_id: str, token_address: str) -> dict[str, Any] | None:
        """Export parameters formatted for APayRouterV2.closeCumulativeChannel."""
        voucher = self.get_latest_voucher(channel_id)
        if not voucher:
            return None
        return {
            "token": token_address,
            "channelId": voucher.channel_id,
            "payer": voucher.payer,
            "receiver": voucher.receiver,
            "cumulativeAmount": voucher.cumulative_amount_base_units,
            "sequence": voucher.sequence,
            "signature": voucher.signature,
        }
