"""AgentWallet: Secure In-Memory Wallet & Spending Guardrails for Autonomous AI Agents."""

import secrets
from dataclasses import dataclass, field
from typing import Any

from eth_account import Account
from eth_account.messages import encode_defunct, encode_typed_data

DEFAULT_EIP712_NAME = "APay Protocol"
DEFAULT_EIP712_VERSION = "1"
DEFAULT_ROUTER_ADDRESS = "0x71434344beEF9C44fF3BC95572bEB7bFB8847ec6"
DEFAULT_CHAIN_ID = 84532  # Base Sepolia

EIP712_PAYMENT_TYPES: dict[str, list[dict[str, str]]] = {
    "PaymentAuthorization": [
        {"name": "payer", "type": "address"},
        {"name": "receiver", "type": "address"},
        {"name": "amount", "type": "uint256"},
        {"name": "nonce", "type": "string"},
    ]
}


def get_eip712_domain(
    name: str = DEFAULT_EIP712_NAME,
    version: str = DEFAULT_EIP712_VERSION,
    chain_id: int = DEFAULT_CHAIN_ID,
    verifying_contract: str = DEFAULT_ROUTER_ADDRESS,
) -> dict[str, Any]:
    return {
        "name": name,
        "version": version,
        "chainId": chain_id,
        "verifyingContract": verifying_contract,
    }


@dataclass
class AgentWallet:
    private_key: str
    max_per_call_usdc: float = 0.05
    daily_budget_usdc: float = 5.00
    total_spent_usdc: float = 0.00
    max_per_call_apay: float = 5.0
    daily_budget_apay: float = 50.0
    total_spent_apay: float = 0.0
    currency: str = "DUAL"
    _account: Any = field(init=False, repr=False)
    address: str = field(init=False)

    def __post_init__(self) -> None:
        if self.private_key.startswith("0x"):
            key = self.private_key
        else:
            key = "0x" + self.private_key
        self._account = Account.from_key(key)
        self.address = self._account.address

    @classmethod
    def create(
        cls,
        max_per_call_usdc: float = 0.05,
        daily_budget_usdc: float = 5.00,
        max_per_call_apay: float = 5.0,
        daily_budget_apay: float = 50.0,
        currency: str = "DUAL",
    ) -> "AgentWallet":
        """Generate a brand new random agent wallet."""
        priv = "0x" + secrets.token_hex(32)
        return cls(
            private_key=priv,
            max_per_call_usdc=max_per_call_usdc,
            daily_budget_usdc=daily_budget_usdc,
            max_per_call_apay=max_per_call_apay,
            daily_budget_apay=daily_budget_apay,
            currency=currency,
        )

    @classmethod
    def from_private_key(
        cls,
        private_key: str,
        max_per_call: float | None = None,
        daily_budget: float | None = None,
        max_per_call_usdc: float = 0.05,
        daily_budget_usdc: float = 5.00,
        max_per_call_apay: float = 5.0,
        daily_budget_apay: float = 50.0,
        currency: str = "DUAL",
    ) -> "AgentWallet":
        """Load an AgentWallet from an existing private key with configurable dual spending limits."""
        if max_per_call is not None:
            if currency.upper() == "APAY":
                max_per_call_apay = max_per_call
            else:
                max_per_call_usdc = max_per_call
        if daily_budget is not None:
            if currency.upper() == "APAY":
                daily_budget_apay = daily_budget
            else:
                daily_budget_usdc = daily_budget

        return cls(
            private_key=private_key,
            max_per_call_usdc=max_per_call_usdc,
            daily_budget_usdc=daily_budget_usdc,
            max_per_call_apay=max_per_call_apay,
            daily_budget_apay=daily_budget_apay,
            currency=currency.upper(),
        )

    def can_spend(self, amount: float, currency: str = "USDC") -> tuple[bool, str | None]:
        curr = currency.upper()
        if curr == "APAY":
            if amount > self.max_per_call_apay:
                return (
                    False,
                    f"Amount {amount} $APAY exceeds max per call limit ({self.max_per_call_apay} $APAY)",
                )
            if (self.total_spent_apay + amount) > self.daily_budget_apay:
                return (
                    False,
                    f"Spend would exceed daily budget ({self.daily_budget_apay} $APAY, already spent {self.total_spent_apay} $APAY)",
                )
            return True, None

        if amount > self.max_per_call_usdc:
            return False, f"Amount ${amount} USDC exceeds max per call limit (${self.max_per_call_usdc})"
        if (self.total_spent_usdc + amount) > self.daily_budget_usdc:
            return (
                False,
                f"Spend would exceed daily budget (${self.daily_budget_usdc}, already spent ${self.total_spent_usdc})",
            )
        return True, None

    def record_spend(self, amount: float, currency: str = "USDC") -> None:
        if currency.upper() == "APAY":
            self.total_spent_apay += amount
        else:
            self.total_spent_usdc += amount

    def sign_challenge(self, message: str) -> str:
        """Sign an arbitrary string message (legacy/defunct)."""
        signable = encode_defunct(text=message)
        signed = self._account.sign_message(signable)
        return signed.signature.hex()

    def sign_typed_payment(
        self,
        receiver: str,
        amount_base_units: int | str,
        nonce: str,
        chain_id: int = DEFAULT_CHAIN_ID,
        router_address: str = DEFAULT_ROUTER_ADDRESS,
    ) -> str:
        """Sign a typed EIP-712 PaymentAuthorization challenge."""
        domain = get_eip712_domain(chain_id=chain_id, verifying_contract=router_address)
        message = {
            "payer": self.address,
            "receiver": receiver,
            "amount": int(amount_base_units),
            "nonce": nonce,
        }
        signable = encode_typed_data(
            domain_data=domain,
            message_types=EIP712_PAYMENT_TYPES,
            message_data=message,
        )
        signed = self._account.sign_message(signable)
        return signed.signature.hex()

    @staticmethod
    def verify_signature(message: str, signature: str) -> str:
        """Recover and return the signer address from string challenge."""
        signable = encode_defunct(text=message)
        recovered = Account.recover_message(signable, signature=signature)
        return str(recovered)

    @staticmethod
    def verify_typed_payment(
        payer: str,
        receiver: str,
        amount_base_units: int | str,
        nonce: str,
        signature: str,
        chain_id: int = DEFAULT_CHAIN_ID,
        router_address: str = DEFAULT_ROUTER_ADDRESS,
    ) -> str:
        """Recover and return the signer address from an EIP-712 PaymentAuthorization."""
        domain = get_eip712_domain(chain_id=chain_id, verifying_contract=router_address)
        message = {
            "payer": payer,
            "receiver": receiver,
            "amount": int(amount_base_units),
            "nonce": nonce,
        }
        signable = encode_typed_data(
            domain_data=domain,
            message_types=EIP712_PAYMENT_TYPES,
            message_data=message,
        )
        recovered = Account.recover_message(signable, signature=signature)
        return str(recovered)
