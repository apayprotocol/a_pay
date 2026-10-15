"""Unit tests for Coinbase AgentKit APayActionProvider integration."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

from apay.integrations.agentkit import (
    APayActionProvider,
    create_apay_action_provider,
)
from apay.wallet import AgentWallet


def test_agentkit_provider_init_defaults() -> None:
    provider = create_apay_action_provider()
    assert isinstance(provider, APayActionProvider)
    assert provider.name == "apay_action_provider"
    assert provider.network == "base-mainnet"
    assert provider.wallet is not None
    assert provider.wallet.address.startswith("0x")
    assert provider.wallet.max_per_call_usdc == 0.05
    assert provider.wallet.daily_budget_usdc == 2.00


def test_agentkit_provider_init_custom_wallet() -> None:
    wallet = AgentWallet.create(max_per_call_usdc=0.10, daily_budget_usdc=5.00)
    provider = APayActionProvider(wallet=wallet, network="base-sepolia")
    assert provider.wallet.address == wallet.address
    assert provider.network == "base-sepolia"
    assert provider.wallet.max_per_call_usdc == 0.10


def test_agentkit_supports_network() -> None:
    provider = create_apay_action_provider()

    # Network object with chain_id
    mock_net_mainnet = MagicMock()
    mock_net_mainnet.chain_id = 8453
    assert provider.supports_network(mock_net_mainnet) is True

    mock_net_sepolia = MagicMock()
    mock_net_sepolia.chain_id = 84532
    assert provider.supports_network(mock_net_sepolia) is True

    # Network object with network_id string
    mock_net_str = MagicMock()
    del mock_net_str.chain_id
    mock_net_str.network_id = "base-mainnet"
    assert provider.supports_network(mock_net_str) is True

    # Raw string
    assert provider.supports_network("base-sepolia") is True


def test_agentkit_probe_endpoint() -> None:
    provider = create_apay_action_provider()

    mock_response = MagicMock()
    mock_response.status_code = 402
    mock_response.headers = {
        "x-apay-amount": "0.005",
        "x-apay-currency": "USDC",
        "x-apay-receiver": "0xd08c8a337e5339d1c083e06d74a9265956ceea16",
    }

    with patch("httpx.Client.get", return_value=mock_response):
        out = provider.probe_endpoint(None, {"url": "https://api.test/intel"})
        data = json.loads(out)
        assert data["url"] == "https://api.test/intel"
        assert data["requires_payment"] is True
        assert data["price"] == "0.005"
        assert data["currency"] == "USDC"
        assert data["receiver"] == "0xd08c8a337e5339d1c083e06d74a9265956ceea16"


def test_agentkit_probe_endpoint_missing_url() -> None:
    provider = create_apay_action_provider()
    out = provider.probe_endpoint(None, {})
    data = json.loads(out)
    assert data["status"] == "failed"
    assert "Missing 'url'" in data["error"]


def test_agentkit_request_paid_api_success() -> None:
    wallet = AgentWallet.create(max_per_call_usdc=0.50, daily_budget_usdc=10.00)
    provider = APayActionProvider(wallet=wallet)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"intel": "alpha_dataset_ready"}

    with patch.object(provider.session, "request", return_value=mock_resp):
        out = provider.request_paid_api(None, {"url": "https://api.test/paid", "method": "GET"})
        data = json.loads(out)
        assert data["status_code"] == 200
        assert data["settled"] is True
        assert data["response"]["intel"] == "alpha_dataset_ready"


def test_agentkit_wallet_status() -> None:
    wallet = AgentWallet.create(max_per_call_usdc=0.08, daily_budget_usdc=3.50)
    provider = APayActionProvider(wallet=wallet)

    out = provider.get_wallet_status(None, {})
    data = json.loads(out)
    assert data["address"] == wallet.address
    assert data["spending_guardrails"]["max_per_call_usdc"] == 0.08
    assert data["spending_guardrails"]["daily_budget_usdc"] == 3.50
    assert data["spending_guardrails"]["total_spent_usdc"] == 0.0


def test_agentkit_set_budget() -> None:
    provider = create_apay_action_provider()

    out = provider.set_budget(
        None,
        {
            "max_per_call_usdc": 0.15,
            "daily_budget_usdc": 8.0,
            "max_per_call_apay": 25.0,
            "daily_budget_apay": 250.0,
        },
    )
    data = json.loads(out)
    assert data["status"] == "updated"
    assert provider.wallet.max_per_call_usdc == 0.15
    assert provider.wallet.daily_budget_usdc == 8.0
    assert provider.wallet.max_per_call_apay == 25.0
    assert provider.wallet.daily_budget_apay == 250.0


def test_agentkit_get_balance_mocked() -> None:
    provider = create_apay_action_provider()

    mock_rpc_resp = MagicMock()
    mock_rpc_resp.json.return_value = {
        "jsonrpc": "2.0",
        "id": 1,
        "result": hex(1_500_000_000_000_000_000),  # 1.5 ETH in wei
    }

    with patch("httpx.Client.post", return_value=mock_rpc_resp):
        out = provider.get_balance(None, {"address": "0xd08c8a337e5339d1c083e06d74a9265956ceea16"})
        data = json.loads(out)
        assert data["address"] == "0xd08c8a337e5339d1c083e06d74a9265956ceea16"
        assert float(data["balances"]["ETH"]) == 1.5
