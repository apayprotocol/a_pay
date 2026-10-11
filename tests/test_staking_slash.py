"""
Comprehensive tests for AI Agent Staking, Slashing, Dual-Network Resolution & CLI
Validates Pillar 3 Anti-Spam Game Theory (50% Challenger Bounty / 50% Permanent Burn)
"""

from __future__ import annotations

from click.testing import CliRunner

from apay.cli import main
from apay.staking import (
    BASE_MAINNET_CHAIN_ID,
    BASE_SEPOLIA_CHAIN_ID,
    STAKING_VAULT_MAINNET,
    STAKING_VAULT_SEPOLIA,
    StakingClient,
)


def test_staking_client_network_resolution():
    """Verify dual-network contract binding and chain configuration."""
    # Mainnet client
    client_mainnet = StakingClient(network="base")
    assert client_mainnet.chain_id == BASE_MAINNET_CHAIN_ID
    assert client_mainnet.vault_address.lower() == STAKING_VAULT_MAINNET.lower()
    assert "mainnet" in client_mainnet.rpc_urls[0] or "base.org" in client_mainnet.rpc_urls[0]

    # Sepolia client
    client_sepolia = StakingClient(network="base-sepolia")
    assert client_sepolia.chain_id == BASE_SEPOLIA_CHAIN_ID
    assert client_sepolia.vault_address.lower() == STAKING_VAULT_SEPOLIA.lower()
    assert "sepolia" in client_sepolia.rpc_urls[0]


def test_slashing_50_50_economic_split():
    """Verify exact 50% bounty and 50% deflationary burn math."""
    client = StakingClient(network="base")
    agent = "0x79A85DCDd967E0bb03Aba1069B12c4851C570a0C"
    challenger = "0x8742017B7b3EA4F8AC08BC71f89A099b47B4334E"

    res = client.slash(
        agent_address=agent,
        challenger_address=challenger,
        slash_amount_apay=350.0,
        reason="Corrupted payload SHA-256 hash mismatch",
        category="CORRUPTED_PAYLOAD",
        dry_run=True,
    )

    assert res["status"] == "slashed_simulated"
    assert res["slashed_amount_apay"] == 350.0
    assert res["challenger_bounty_apay"] == 175.0
    assert res["burned_apay"] == 175.0
    assert res["category"] == "CORRUPTED_PAYLOAD"
    assert res["chain_id"] == 8453
    assert "basescan.org/tx/" in res["explorer_url"]
    assert "sepolia" not in res["explorer_url"]


def test_slashing_sepolia_explorer_url():
    """Verify Sepolia network generates sepolia.basescan.org link."""
    client = StakingClient(network="base-sepolia")
    agent = "0x79A85DCDd967E0bb03Aba1069B12c4851C570a0C"
    challenger = "0x8742017B7b3EA4F8AC08BC71f89A099b47B4334E"

    res = client.slash(
        agent_address=agent,
        challenger_address=challenger,
        slash_amount_apay=100.0,
        reason="SLA timeout breach",
        dry_run=True,
    )

    assert res["chain_id"] == 84532
    assert "sepolia.basescan.org/tx/" in res["explorer_url"]


def test_cli_stake_slash_command():
    """Verify apay stake slash CLI command execution."""
    runner = CliRunner()
    result = runner.invoke(
        main,
        [
            "stake",
            "slash",
            "--agent",
            "0x79A85DCDd967E0bb03Aba1069B12c4851C570a0C",
            "--challenger",
            "0x8742017B7b3EA4F8AC08BC71f89A099b47B4334E",
            "--amount",
            "120",
            "--reason",
            "Payload verification failed",
            "--category",
            "CORRUPTED_PAYLOAD",
            "--network",
            "base",
        ],
    )

    assert result.exit_code == 0
    assert "AI Agent Slashed Successfully!" in result.output
    assert "120.00 $APAY" in result.output
    assert "+60.00 $APAY" in result.output
    assert "-60.00 $APAY" in result.output
    assert "basescan.org/tx/" in result.output


def test_cli_stake_disputes_command_offline():
    """Verify apay stake disputes CLI handles unreachable feed gracefully."""
    runner = CliRunner()
    result = runner.invoke(
        main,
        ["stake", "disputes", "--feed-url", "http://127.0.0.1:9999/api/dispute"],
    )

    assert result.exit_code == 0
    assert "Could not fetch remote dispute feed" in result.output or "Fetching live disputes" in result.output
