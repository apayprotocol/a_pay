"""Unit tests for SealKeeper verified seller integration & guardrails."""

import httpx
import pytest

from apay import AgentWallet, APayClient, APaySession, acheck_seller_seal, check_seller_seal


def test_check_seller_seal_sync_proven(monkeypatch):
    def mock_get(self, url, *args, **kwargs):
        assert "api.sealkeeper.run" in str(url)
        return httpx.Response(
            200,
            json={
                "services": [
                    {
                        "handle": "verified-mcp-service",
                        "seal": "test-seal-compact",
                    }
                ]
            },
            request=httpx.Request("GET", str(url)),
        )

    def mock_post(self, url, *args, **kwargs):
        assert "seal/verify" in str(url)
        return httpx.Response(
            200,
            json={
                "valid": True,
                "payload": {
                    "subject": {"kind": "service", "interfaces": ["x402"]},
                    "evidence": [
                        {
                            "type": "x402_check",
                            "wallet": {"proven": True, "changes_30d": 0},
                        }
                    ],
                },
            },
            request=httpx.Request("POST", str(url)),
        )

    monkeypatch.setattr(httpx.Client, "get", mock_get)
    monkeypatch.setattr(httpx.Client, "post", mock_post)

    res = check_seller_seal("0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc")
    assert res["verified"] is True
    assert res["proven"] is True
    assert res["handle"] == "verified-mcp-service"
    assert res["reason"] is None


def test_check_seller_seal_sync_unproven(monkeypatch):
    def mock_get(self, url, *args, **kwargs):
        return httpx.Response(
            200,
            json={
                "services": [
                    {
                        "handle": "unproven-service",
                        "seal": "unproven-seal",
                    }
                ]
            },
            request=httpx.Request("GET", str(url)),
        )

    def mock_post(self, url, *args, **kwargs):
        return httpx.Response(
            200,
            json={
                "valid": True,
                "payload": {
                    "subject": {"kind": "service", "interfaces": ["x402"]},
                    "evidence": [
                        {
                            "type": "x402_check",
                            "wallet": {"proven": False},
                        }
                    ],
                },
            },
            request=httpx.Request("POST", str(url)),
        )

    monkeypatch.setattr(httpx.Client, "get", mock_get)
    monkeypatch.setattr(httpx.Client, "post", mock_post)

    res = check_seller_seal("0x0000000000000000000000000000000000000000")
    assert res["verified"] is True
    assert res["proven"] is False
    assert "wallet.proven is false" in res["reason"]


def test_check_seller_seal_sync_multi_service(monkeypatch):
    """Test that check_seller_seal checks every service entry until a proven one is found."""

    def mock_get(self, url, *args, **kwargs):
        return httpx.Response(
            200,
            json={
                "services": [
                    {
                        "handle": "unproven-service-1",
                        "seal": "unproven-seal-token",
                    },
                    {
                        "handle": "proven-service-2",
                        "seal": "proven-seal-token",
                    },
                ]
            },
            request=httpx.Request("GET", str(url)),
        )

    def mock_post(self, url, *args, **kwargs):
        body = kwargs.get("json", {})
        if body.get("seal") == "unproven-seal-token":
            return httpx.Response(
                200,
                json={
                    "valid": True,
                    "payload": {
                        "subject": {"kind": "service", "interfaces": ["x402"]},
                        "evidence": [
                            {
                                "type": "x402_check",
                                "wallet": {"proven": False},
                            }
                        ],
                    },
                },
                request=httpx.Request("POST", str(url)),
            )
        return httpx.Response(
            200,
            json={
                "valid": True,
                "payload": {
                    "subject": {"kind": "service", "interfaces": ["x402"]},
                    "evidence": [
                        {
                            "type": "x402_check",
                            "wallet": {"proven": True},
                        }
                    ],
                },
            },
            request=httpx.Request("POST", str(url)),
        )

    monkeypatch.setattr(httpx.Client, "get", mock_get)
    monkeypatch.setattr(httpx.Client, "post", mock_post)

    res = check_seller_seal("0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc")
    assert res["verified"] is True
    assert res["proven"] is True
    assert res["handle"] == "proven-service-2"
    assert res["reason"] is None


def test_check_seller_seal_sync_not_found(monkeypatch):
    def mock_get(self, url, *args, **kwargs):
        return httpx.Response(
            404,
            json={"error": {"code": "not_found"}},
            request=httpx.Request("GET", str(url)),
        )

    monkeypatch.setattr(httpx.Client, "get", mock_get)

    res = check_seller_seal("0x9999999999999999999999999999999999999999")
    assert res["verified"] is False
    assert res["proven"] is False
    assert "not listed" in res["reason"].lower()


@pytest.mark.asyncio
async def test_acheck_seller_seal_async(monkeypatch):
    async def mock_async_get(self, url, *args, **kwargs):
        return httpx.Response(
            200,
            json={
                "services": [
                    {
                        "handle": "async-proven-service",
                        "seal": "async-seal",
                    }
                ]
            },
            request=httpx.Request("GET", str(url)),
        )

    async def mock_async_post(self, url, *args, **kwargs):
        return httpx.Response(
            200,
            json={
                "valid": True,
                "payload": {
                    "subject": {"kind": "service", "interfaces": ["x402"]},
                    "evidence": [
                        {
                            "type": "x402_check",
                            "wallet": {"proven": True},
                        }
                    ],
                },
            },
            request=httpx.Request("POST", str(url)),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_async_get)
    monkeypatch.setattr(httpx.AsyncClient, "post", mock_async_post)

    res = await acheck_seller_seal("0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc")
    assert res["verified"] is True
    assert res["proven"] is True


@pytest.mark.asyncio
async def test_acheck_seller_seal_async_multi_service(monkeypatch):
    """Test that acheck_seller_seal checks every service entry asynchronously until proven."""

    async def mock_async_get(self, url, *args, **kwargs):
        return httpx.Response(
            200,
            json={
                "services": [
                    {
                        "handle": "unproven-service-async",
                        "seal": "unproven-seal-async",
                    },
                    {
                        "handle": "proven-service-async",
                        "seal": "proven-seal-async",
                    },
                ]
            },
            request=httpx.Request("GET", str(url)),
        )

    async def mock_async_post(self, url, *args, **kwargs):
        body = kwargs.get("json", {})
        if body.get("seal") == "unproven-seal-async":
            return httpx.Response(
                200,
                json={
                    "valid": True,
                    "payload": {
                        "subject": {"kind": "service", "interfaces": ["x402"]},
                        "evidence": [
                            {
                                "type": "x402_check",
                                "wallet": {"proven": False},
                            }
                        ],
                    },
                },
                request=httpx.Request("POST", str(url)),
            )
        return httpx.Response(
            200,
            json={
                "valid": True,
                "payload": {
                    "subject": {"kind": "service", "interfaces": ["x402"]},
                    "evidence": [
                        {
                            "type": "x402_check",
                            "wallet": {"proven": True},
                        }
                    ],
                },
            },
            request=httpx.Request("POST", str(url)),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_async_get)
    monkeypatch.setattr(httpx.AsyncClient, "post", mock_async_post)

    res = await acheck_seller_seal("0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc")
    assert res["verified"] is True
    assert res["proven"] is True
    assert res["handle"] == "proven-service-async"
    assert res["reason"] is None


def test_apaysession_verify_seller_seal_blocks_unproven(monkeypatch):
    wallet = AgentWallet.create()

    def mock_seal_lookup(wallet_addr, network="eip155:8453", timeout=3.0):
        return {"verified": True, "proven": False, "reason": "wallet.proven is false"}

    monkeypatch.setattr("apay.client.check_seller_seal", mock_seal_lookup)

    def mock_request(self, method, url, **kwargs):
        return httpx.Response(
            402,
            headers={
                "X-APay-Receiver": "0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc",
                "X-APay-Nonce": "test-nonce-123",
                "X-APay-Amount": "1000",
                "X-APay-Currency": "USDC",
            },
            request=httpx.Request(method, url),
        )

    session = APaySession(wallet, verify_seller_seal=True)
    monkeypatch.setattr(httpx.Client, "request", mock_request)

    with pytest.raises(PermissionError) as exc_info:
        session.get("https://fake-unproven.org/api")

    assert "[A-Pay SealKeeper Guardrail]" in str(exc_info.value)
    assert "not proven on SealKeeper" in str(exc_info.value)


@pytest.mark.asyncio
async def test_apayclient_verify_seller_seal_blocks_unproven(monkeypatch):
    wallet = AgentWallet.create()

    async def mock_aseal_lookup(wallet_addr, network="eip155:8453", timeout=3.0):
        return {"verified": True, "proven": False, "reason": "unproven wallet"}

    monkeypatch.setattr("apay.client.acheck_seller_seal", mock_aseal_lookup)

    async def mock_async_request(self, method, url, **kwargs):
        return httpx.Response(
            402,
            headers={
                "X-APay-Receiver": "0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc",
                "X-APay-Nonce": "test-nonce-123",
                "X-APay-Amount": "1000",
                "X-APay-Currency": "USDC",
            },
            request=httpx.Request(method, url),
        )

    client = APayClient(wallet, verify_seller_seal=True)
    monkeypatch.setattr(httpx.AsyncClient, "request", mock_async_request)

    with pytest.raises(PermissionError) as exc_info:
        await client.get("https://fake-unproven.org/api")

    assert "[A-Pay SealKeeper Guardrail]" in str(exc_info.value)
