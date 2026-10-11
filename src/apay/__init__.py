"""
A-Pay (AgentPay) Protocol
Universal Micropayment & Economic Layer for Autonomous AI Agents.
"""

from __future__ import annotations

__version__ = "0.1.8"

from .burn_engine import AerodromeRoute, BurnEngine, DexSwapParams
from .channel import ChannelPayerSession, ChannelReceiverValidator, ChannelVoucher
from .client import APayClient, APaySession
from .discovery import discover_services
from .escrow import (
    AgentSessionAuth,
    DailyLimitExceededError,
    EscrowVaultClient,
    InsufficientBalanceError,
    SessionExpiredError,
    UnauthorizedError,
)
from .fastapi import APayPaywall, VerifiedClaim
from .integrations import (
    APayAutoGenToolkit,
    APayCrewTool,
    APayLlamaIndexTool,
    APayRequestsWrapper,
    APayTool,
    create_apay_tool,
    create_autogen_payment_tool,
    create_crew_economy_toolkit,
    create_crew_tool,
    create_llamaindex_tool,
)
from .mcp import APayMCPServer
from .nonce_store import BaseNonceStore, RedisNonceStore, SlidingWindowNonceStore
from .proxy import ProxyGate, TtlNonceStore, create_proxy_app
from .relayer import ClaimJournal, ClaimRecord, SettlementRelayer, SqliteClaimJournal
from .session import SessionManager, SessionRecord, StatelessSessionManager
from .solvency import (
    AllowAllSolvencyValidator,
    BaseSolvencyValidator,
    CachedRpcSolvencyValidator,
    EscrowSolvencyValidator,
    MockSolvencyValidator,
    ResilientRpcSolvencyValidator,
)
from .staking import StakeInfo, StakingClient
from .wallet import (
    DEFAULT_CHAIN_ID,
    DEFAULT_EIP712_NAME,
    DEFAULT_EIP712_VERSION,
    DEFAULT_ROUTER_ADDRESS,
    AgentWallet,
    get_eip712_domain,
)

__all__ = [
    "APayAutoGenToolkit",
    "APayClient",
    "APayCrewTool",
    "APayLlamaIndexTool",
    "APayMCPServer",
    "APayPaywall",
    "APayRequestsWrapper",
    "APaySession",
    "APayTool",
    "AerodromeRoute",
    "AgentSessionAuth",
    "AgentWallet",
    "AllowAllSolvencyValidator",
    "BaseNonceStore",
    "BaseSolvencyValidator",
    "BurnEngine",
    "CachedRpcSolvencyValidator",
    "ChannelPayerSession",
    "ChannelReceiverValidator",
    "ChannelVoucher",
    "ClaimJournal",
    "ClaimRecord",
    "DEFAULT_CHAIN_ID",
    "DEFAULT_EIP712_NAME",
    "DEFAULT_EIP712_VERSION",
    "DEFAULT_ROUTER_ADDRESS",
    "DailyLimitExceededError",
    "DexSwapParams",
    "discover_services",
    "EscrowSolvencyValidator",
    "EscrowVaultClient",
    "InsufficientBalanceError",
    "MockSolvencyValidator",
    "ProxyGate",
    "RedisNonceStore",
    "ResilientRpcSolvencyValidator",
    "SessionExpiredError",
    "SessionManager",
    "SessionRecord",
    "SettlementRelayer",
    "SlidingWindowNonceStore",
    "SqliteClaimJournal",
    "StakeInfo",
    "StakingClient",
    "StatelessSessionManager",
    "TtlNonceStore",
    "UnauthorizedError",
    "VerifiedClaim",
    "create_apay_tool",
    "create_autogen_payment_tool",
    "create_crew_economy_toolkit",
    "create_crew_tool",
    "create_llamaindex_tool",
    "create_proxy_app",
    "get_eip712_domain",
]
