"""
Unit tests for AI Agent Service Discovery
Validates Pillar 1.1 of RULEBOOK.md
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from apay.discovery import discover_services


def test_discover_services_success():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "success": True,
        "count": 2,
        "services": [
            {
                "targetDomain": "https://api.marketintel.ai",
                "price": "0.002 USDC",
                "network": "base",
                "status": "online",
            },
            {
                "targetDomain": "https://data.weatheragent.io",
                "price": "0.001 USDC",
                "network": "base",
                "status": "online",
            },
        ],
    }

    with patch("httpx.Client.get", return_value=mock_resp):
        services = discover_services("https://fake-registry.apay.network/api/registry")
        assert len(services) == 2
        assert services[0]["targetDomain"] == "https://api.marketintel.ai"
        assert services[1]["price"] == "0.001 USDC"


def test_discover_services_graceful_failure():
    with patch("httpx.Client.get", side_effect=Exception("Connection refused")):
        services = discover_services("https://fake-offline-registry.apay.network/api/registry")
        assert services == []
