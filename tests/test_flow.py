"""
End-to-End Integration Test for A-Pay Protocol
Verifies:
1. HTTP 402 Challenge on unauthenticated request
2. Guardrail rejection when price exceeds budget
3. Automatic 402 challenge detection, signing, and successful unlock!
"""

import httpx
from starlette.responses import JSONResponse
from starlette.testclient import TestClient

from apay.proxy import create_proxy_app
from apay.wallet import AgentWallet


def dummy_upstream_endpoint(request):
    return JSONResponse({"status": "ok", "secret_data": "Bitcoin is digital gold"})


def test_agent_wallet_guardrails():
    wallet = AgentWallet.create(max_per_call_usdc=0.01, daily_budget_usdc=0.05)

    # 0.005 is allowed
    can, _ = wallet.can_spend(0.005)
    assert can is True

    # 0.02 exceeds max per call limit of 0.01
    can, reason = wallet.can_spend(0.02)
    assert can is False
    assert "exceeds max per call limit" in reason


def test_proxy_402_challenge():
    receiver = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    app = create_proxy_app(target_url="http://mock-upstream", receiver_wallet=receiver, price_usdc=0.002)
    client = TestClient(app)

    resp = client.get("/api/data")
    assert resp.status_code == 402
    assert resp.headers["X-APay-Receiver"].lower() == receiver.lower()
    assert resp.headers["X-APay-Amount"] == "2000"  # 0.002 * 10^6
    assert "X-APay-Nonce" in resp.headers
    data = resp.json()
    assert data["status"] == 402
    assert data["pricing"]["amount_usdc"] == 0.002
    assert data["pricing"]["currency"] == "USDC"


def test_proxy_402_challenge_apay():
    receiver = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    app = create_proxy_app(
        target_url="http://mock-upstream", receiver_wallet=receiver, price_usdc=5.0, currency="APAY"
    )
    client = TestClient(app)

    resp = client.get("/api/data")
    assert resp.status_code == 402
    assert resp.headers["X-APay-Receiver"].lower() == receiver.lower()
    assert resp.headers["X-APay-Currency"] == "APAY"
    assert resp.headers["X-APay-Token"] == "0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3"
    assert resp.headers["X-APay-Amount"] == str(5 * 10**18)
    data = resp.json()
    assert data["status"] == 402
    assert data["pricing"]["currency"] == "APAY"
    assert data["pricing"]["price"] == 5.0


def test_proxy_402_challenge_dual():
    receiver = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    app = create_proxy_app(
        target_url="http://mock-upstream",
        receiver_wallet=receiver,
        price_usdc=0.005,
        currency="DUAL",
        price_apay=4.0,
    )
    client = TestClient(app)

    resp = client.get("/api/data")
    assert resp.status_code == 402
    assert resp.headers["X-APay-Receiver"].lower() == receiver.lower()
    assert resp.headers["X-APay-Currency"] == "DUAL"
    assert resp.headers["X-APay-Amount-USDC"] == str(5000)
    assert resp.headers["X-APay-Amount-APAY"] == str(4 * 10**18)
    assert resp.headers["X-APay-Token-APAY"] == "0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3"
    assert resp.headers["X-APay-Token-USDC"] == "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    data = resp.json()
    assert data["status"] == 402
    assert data["pricing"]["currency"] == "DUAL"
    assert data["pricing"]["price_usdc"] == 0.005
    assert data["pricing"]["price_apay"] == 4.0
    assert data["pricing"]["usdc"]["price"] == 0.005
    assert data["pricing"]["apay"]["price"] == 4.0


def test_proxy_signature_verification_and_replay_protection():
    receiver = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    wallet = AgentWallet.create(max_per_call_usdc=0.05, daily_budget_usdc=1.0)
    app = create_proxy_app(target_url="http://mock-upstream", receiver_wallet=receiver, price_usdc=0.001)
    client = TestClient(app)

    # 1. Get challenge
    resp1 = client.get("/test")
    assert resp1.status_code == 402
    nonce = resp1.headers["X-APay-Nonce"]
    amount = resp1.headers["X-APay-Amount"]

    # 2. Sign challenge
    payload = f"APAY:{receiver.lower()}:{amount}:{nonce}"
    sig = wallet.sign_challenge(payload)

    # 3. Present signature
    auth_header = f"APay sig:{sig}:{wallet.address}:{nonce}:{amount}"

    # Note: TestClient won't reach upstream 'http://mock-upstream' directly unless mocked,
    # but we can verify the proxy accepted the signature and attempted forwarding!
    try:
        client.get("/test", headers={"Authorization": auth_header})
        # If upstream connection error happens, it proves it PASSED the paywall!
    except httpx.ConnectError:
        pass  # Paywall passed, attempted upstream connect!

    # 4. Replay test: Try sending the EXACT same nonce and signature again
    resp_replay = client.get("/test", headers={"Authorization": auth_header})
    assert resp_replay.status_code == 401
    assert "replay attack detected" in resp_replay.json()["error"]


def test_claim_journal(tmp_path):
    from apay.relayer import ClaimJournal, ClaimRecord

    journal_file = tmp_path / "claims.jsonl"
    journal = ClaimJournal(journal_path=journal_file)

    assert journal.load_all() == []
    assert journal.get_unsettled() == []

    c1 = ClaimRecord(
        id="claim_001",
        payer="0x1111111111111111111111111111111111111111",
        receiver="0x2222222222222222222222222222222222222222",
        amount_base_units="10000",
        price_usdc=0.01,
        nonce="nonce_123",
        signature="0xmock_sig_1",
        timestamp=1000000.0,
    )
    c2 = ClaimRecord(
        id="claim_002",
        payer="0x3333333333333333333333333333333333333333",
        receiver="0x2222222222222222222222222222222222222222",
        amount_base_units="20000",
        price_usdc=0.02,
        nonce="nonce_456",
        signature="0xmock_sig_2",
        timestamp=1000001.0,
    )

    journal.record(c1)
    journal.record(c2)

    all_records = journal.load_all()
    assert len(all_records) == 2
    unsettled = journal.get_unsettled()
    assert len(unsettled) == 2

    # Mark c1 as settled
    journal.mark_settled({"claim_001"}, tx_hash="0xtx123")
    unsettled_after = journal.get_unsettled()
    assert len(unsettled_after) == 1
    assert unsettled_after[0].id == "claim_002"

    all_after = journal.load_all()
    c1_loaded = next(c for c in all_after if c.id == "claim_001")
    assert c1_loaded.settled is True
    assert c1_loaded.tx_hash == "0xtx123"

    # Clear journal
    journal.clear()
    assert journal.load_all() == []


def test_settlement_relayer_simulation(tmp_path):
    from apay.relayer import ClaimJournal, ClaimRecord, SettlementRelayer

    journal_file = tmp_path / "claims.jsonl"
    journal = ClaimJournal(journal_path=journal_file)
    relayer = SettlementRelayer(journal=journal)

    # Empty journal simulation
    sim_empty = relayer.simulate_batch()
    assert sim_empty["claims_count"] == 0
    assert sim_empty["gross_volume_usdc"] == 0.0

    # Add 2 claims totalling $0.05 USDC (50,000 base units)
    c1 = ClaimRecord(
        id="c1",
        payer="0x1111111111111111111111111111111111111111",
        receiver="0x2222222222222222222222222222222222222222",
        amount_base_units="20000",
        price_usdc=0.02,
        nonce="n1",
        signature="0xs1",
        timestamp=1000.0,
    )
    c2 = ClaimRecord(
        id="c2",
        payer="0x3333333333333333333333333333333333333333",
        receiver="0x2222222222222222222222222222222222222222",
        amount_base_units="30000",
        price_usdc=0.03,
        nonce="n2",
        signature="0xs2",
        timestamp=1001.0,
    )
    journal.record(c1)
    journal.record(c2)

    sim = relayer.simulate_batch()
    assert sim["claims_count"] == 2
    assert sim["gross_volume_usdc"] == 0.05
    assert sim["fee_percentage"] == "1.0%"
    assert sim["protocol_fee_usdc"] == 0.05 * 0.01  # 0.0005
    assert sim["net_merchant_usdc"] == 0.05 * 0.99  # 0.0495

    # Dry-run execution
    dry_res = relayer.execute_settle(private_key="0x" + "a" * 64, dry_run=True)
    assert dry_res["status"] == "simulated"
    assert dry_res["dry_run"] is True
    assert len(journal.get_unsettled()) == 2  # Not marked settled in dry-run!


def test_proxy_auto_journaling(tmp_path):
    from apay.relayer import ClaimJournal

    journal_file = tmp_path / "proxy_claims.jsonl"
    journal = ClaimJournal(journal_path=journal_file)

    receiver = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    wallet = AgentWallet.create(max_per_call_usdc=0.05, daily_budget_usdc=1.0)
    app = create_proxy_app(
        target_url="http://mock-upstream",
        receiver_wallet=receiver,
        price_usdc=0.005,
        journal=journal,
    )
    client = TestClient(app)

    # 1. Challenge
    r1 = client.get("/agent/query")
    nonce = r1.headers["X-APay-Nonce"]
    amount = r1.headers["X-APay-Amount"]

    # 2. Sign and present
    payload = f"APAY:{receiver.lower()}:{amount}:{nonce}"
    sig = wallet.sign_challenge(payload)
    auth_header = f"APay sig:{sig}:{wallet.address}:{nonce}:{amount}"

    try:
        client.get("/agent/query", headers={"Authorization": auth_header})
    except httpx.ConnectError:
        pass

    # 3. Assert claim was recorded in journal!
    unsettled = journal.get_unsettled()
    assert len(unsettled) == 1
    recorded = unsettled[0]
    assert recorded.payer.lower() == wallet.address.lower()
    assert recorded.receiver.lower() == receiver.lower()
    assert recorded.amount_base_units == "5000"
    assert recorded.price_usdc == 0.005
    assert recorded.nonce == nonce
    assert recorded.signature == sig
    assert recorded.settled is False


def test_eip712_signing_and_proxy_verification(tmp_path):
    from apay.proxy import create_proxy_app
    from apay.relayer import ClaimJournal
    from apay.wallet import AgentWallet

    journal_file = tmp_path / "eip712_claims.jsonl"
    journal = ClaimJournal(journal_path=journal_file)

    receiver = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    wallet = AgentWallet.create(max_per_call_usdc=0.05, daily_budget_usdc=1.0)
    app = create_proxy_app(
        target_url="http://mock-upstream",
        receiver_wallet=receiver,
        price_usdc=0.002,
        journal=journal,
    )
    client = TestClient(app)

    # 1. 402 Challenge inspection: ensure EIP-712 payload is presented
    resp = client.get("/v1/data")
    assert resp.status_code == 402
    assert resp.headers["X-APay-Scheme"] == "eip712"
    nonce = resp.headers["X-APay-Nonce"]
    amount = resp.headers["X-APay-Amount"]
    data = resp.json()
    assert "eip712" in data
    assert data["eip712"]["primaryType"] == "PaymentAuthorization"

    # 2. Sign using EIP-712
    typed_sig = wallet.sign_typed_payment(receiver=receiver, amount_base_units=amount, nonce=nonce)

    # 3. Direct cryptographic verification check
    recovered = AgentWallet.verify_typed_payment(
        payer=wallet.address,
        receiver=receiver,
        amount_base_units=amount,
        nonce=nonce,
        signature=typed_sig,
    )
    assert recovered.lower() == wallet.address.lower()

    # 4. Present EIP-712 signature in header
    auth_header = f"APay eip712:{typed_sig}:{wallet.address}:{nonce}:{amount}"
    try:
        client.get("/v1/data", headers={"Authorization": auth_header})
    except httpx.ConnectError:
        pass  # ConnectError means paywall accepted auth and attempted forward!

    # 5. Replay attempt
    replay_resp = client.get("/v1/data", headers={"Authorization": auth_header})
    assert replay_resp.status_code == 401
    assert "replay attack detected" in replay_resp.json()["error"]


def test_agent_framework_integrations():
    from apay.integrations import (
        APayCrewTool,
        APayRequestsWrapper,
        APayTool,
        create_apay_tool,
        create_crew_tool,
    )
    from apay.wallet import AgentWallet

    wallet = AgentWallet.create(max_per_call_usdc=0.01, daily_budget_usdc=0.1)

    # 1. Test LangChain APayRequestsWrapper instantiation and interface
    wrapper = APayRequestsWrapper(wallet=wallet, use_eip712=True)
    assert wrapper.wallet.address == wallet.address
    wrapper.close()

    # 2. Test LangChain Tool creation
    lc_tool = create_apay_tool(
        name="test_paid_tool",
        description="A test paid tool",
        target_url="http://mock-target/api",
        wallet=wallet,
        method="GET",
        use_eip712=True,
    )
    assert isinstance(lc_tool, APayTool)
    assert lc_tool.name == "test_paid_tool"

    # 3. Test CrewAI Tool creation
    crew_tool = create_crew_tool(
        name="crew_paid_tool",
        description="CrewAI paid tool",
        target_url="http://mock-target/api",
        wallet=wallet,
        method="POST",
        use_eip712=True,
    )
    assert isinstance(crew_tool, APayCrewTool)
    assert crew_tool.name == "crew_paid_tool"


def test_proxy_malformed_and_edge_case_defense():
    receiver = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    app = create_proxy_app(target_url="http://mock-upstream", receiver_wallet=receiver, price_usdc=0.001)
    client = TestClient(app)

    # 1. Malformed non-integer amount
    bad_amt_header = "APay eip712:0xabcdef:0x1111111111111111111111111111111111111111:nonce-1:invalid_amount"
    resp = client.get("/test", headers={"Authorization": bad_amt_header})
    assert resp.status_code == 400
    assert "Invalid amount format" in resp.json()["error"]

    # 2. Negative amount
    neg_amt_header = "APay eip712:0xabcdef:0x1111111111111111111111111111111111111111:nonce-2:-500"
    resp = client.get("/test", headers={"Authorization": neg_amt_header})
    assert resp.status_code == 402
    assert "Underpayment" in resp.json()["error"]

    # 3. Cross-site receiver spoofing (Signature signed for 0xOTHER instead of receiver)
    wallet = AgentWallet.create()
    other_receiver = "0x9999999999999999999999999999999999999999"
    spoofed_sig = wallet.sign_typed_payment(
        receiver=other_receiver,
        amount_base_units="1000",
        nonce="nonce-3",
    )
    spoofed_header = f"APay eip712:{spoofed_sig}:{wallet.address}:nonce-3:1000"
    resp = client.get("/test", headers={"Authorization": spoofed_header})
    assert resp.status_code == 401
    assert "Invalid cryptographic signature" in resp.json()["error"]


def test_mcp_server_protocol():
    from apay.mcp import APayMCPServer
    from apay.wallet import AgentWallet

    wallet = AgentWallet.create(max_per_call_usdc=0.01, daily_budget_usdc=1.0)
    server = APayMCPServer(wallet=wallet)

    # 1. initialize
    init_res = server.process_rpc_message({"jsonrpc": "2.0", "id": 1, "method": "initialize"})
    assert init_res is not None
    assert init_res["result"]["serverInfo"]["name"] == "apay-mcp"
    assert "protocolVersion" in init_res["result"]

    # 2. tools/list
    tools_res = server.process_rpc_message({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    assert tools_res is not None
    tool_names = [t["name"] for t in tools_res["result"]["tools"]]
    assert "apay_request" in tool_names
    assert "apay_get_wallet_status" in tool_names
    assert "apay_get_balance" in tool_names
    assert "apay_set_budget" in tool_names
    assert "apay_inspect_endpoint" in tool_names

    # 3. tools/call: apay_get_wallet_status
    status_res = server.process_rpc_message(
        {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {"name": "apay_get_wallet_status", "arguments": {}},
        }
    )
    assert status_res is not None
    assert wallet.address.lower() in status_res["result"]["content"][0]["text"].lower()

    # 4. tools/call: apay_set_budget
    budget_res = server.process_rpc_message(
        {
            "jsonrpc": "2.0",
            "id": 4,
            "method": "tools/call",
            "params": {
                "name": "apay_set_budget",
                "arguments": {"max_per_call_usdc": 0.03, "daily_budget_usdc": 5.0},
            },
        }
    )
    assert budget_res is not None
    assert wallet.max_per_call_usdc == 0.03
    assert wallet.daily_budget_usdc == 5.0

    # 5. tools/call: apay_get_balance
    server._call_rpc = (  # type: ignore[method-assign]
        lambda method, params: "0x100000000000000" if method == "eth_getBalance" else "0x0"
    )
    bal_res = server.process_rpc_message(
        {
            "jsonrpc": "2.0",
            "id": 5,
            "method": "tools/call",
            "params": {"name": "apay_get_balance", "arguments": {}},
        }
    )
    assert bal_res is not None
    assert "native_eth" in bal_res["result"]["content"][0]["text"]


def test_batch_settle_relayer(tmp_path):
    from apay.relayer import ClaimJournal, ClaimRecord, SettlementRelayer

    journal_file = tmp_path / "batch_claims.jsonl"
    journal = ClaimJournal(journal_path=journal_file)
    relayer = SettlementRelayer(journal=journal)

    for i in range(3):
        journal.record(
            ClaimRecord(
                id=f"batch_claim_{i}",
                payer="0x1111111111111111111111111111111111111111",
                receiver="0x2222222222222222222222222222222222222222",
                amount_base_units="1000",
                price_usdc=0.001,
                nonce=f"nonce_{i}",
                signature=f"0xsig_{i}",
                timestamp=1000.0 + i,
            )
        )

    assert len(journal.get_unsettled()) == 3

    # 1. Test simulated dry-run settlement (for zero-gas offline testing)
    sim_result = relayer.execute_batch_settle(private_key="0x" + "c" * 64, dry_run=True)
    assert sim_result["status"] == "simulated"
    assert sim_result["dry_run"] is True
    assert sim_result["claims_count"] == 3

    # 2. Test live broadcast failure with unfunded key properly fails closed without marking settled
    fail_result = relayer.execute_batch_settle(private_key="0x" + "c" * 64, dry_run=False)
    assert fail_result["status"] == "broadcast_failed"
    assert fail_result["tx_hash"] is None
    assert fail_result["error"] is not None
    # Claims must NOT be marked settled if broadcast failed
    assert len(journal.get_unsettled()) == 3


def test_fastapi_paywall_dependency():
    from starlette.applications import Starlette
    from starlette.responses import JSONResponse
    from starlette.routing import Route

    from apay.fastapi import APayPaywall
    from apay.wallet import AgentWallet

    receiver = "0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc"
    paywall = APayPaywall(price_usdc=0.002, receiver_wallet=receiver)

    async def premium_route(request):
        claim = await paywall(request)
        return JSONResponse({"status": "success", "secret": "AlphaUnlocked", "payer": claim.payer})

    app = Starlette(routes=[Route("/api/premium", premium_route, methods=["GET"])])
    client = TestClient(app)

    # 1. Unauthenticated request -> 402 challenge
    r1 = client.get("/api/premium")
    assert r1.status_code == 402
    assert r1.headers["X-APay-Receiver"].lower() == receiver.lower()
    nonce = r1.headers["X-APay-Nonce"]
    amount = r1.headers["X-APay-Amount"]

    # 2. Cryptographic EIP-712 payment authorization
    wallet = AgentWallet.create()
    sig = wallet.sign_typed_payment(receiver=receiver, amount_base_units=amount, nonce=nonce)
    auth = f"APay eip712:{sig}:{wallet.address}:{nonce}:{amount}"

    # 3. Request with valid auth -> 200 OK
    r2 = client.get("/api/premium", headers={"Authorization": auth})
    assert r2.status_code == 200
    assert r2.json()["secret"] == "AlphaUnlocked"
    assert r2.json()["payer"].lower() == wallet.address.lower()

    # 4. Replay attack -> 401
    r_replay = client.get("/api/premium", headers={"Authorization": auth})
    assert r_replay.status_code == 401
    assert "Replay attack" in r_replay.text


def test_escrow_vault_client_delegation():
    import pytest

    from apay.escrow import (
        DailyLimitExceededError,
        EscrowVaultClient,
        InsufficientBalanceError,
        SessionExpiredError,
        UnauthorizedError,
    )
    from apay.wallet import AgentWallet

    client = EscrowVaultClient()
    operator_wallet = AgentWallet.create()
    agent_wallet = AgentWallet.create()
    recipient_wallet = AgentWallet.create()
    usdc = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

    # 1. Deposit into vault
    dep_res = client.deposit(
        token=usdc,
        amount=5.0,
        operator_private_key=operator_wallet.private_key,
        dry_run=True,
    )
    assert dep_res["status"] == "deposited"
    assert dep_res["vault_balance"] == 5.0
    assert client.get_balance(operator_wallet.address, usdc) == 5.0

    # 2. Authorize sub-agent with daily limit = 0.50 USDC, expiry = 24h
    auth_res = client.authorize_agent(
        agent_address=agent_wallet.address,
        token=usdc,
        daily_limit=0.50,
        expiry_hours=24.0,
        operator_private_key=operator_wallet.private_key,
        dry_run=True,
    )
    assert auth_res["status"] == "authorized"
    assert auth_res["daily_limit"] == 0.50

    status = client.get_authorization(operator_wallet.address, agent_wallet.address, usdc)
    assert status is not None
    assert status["active"] is True
    assert status["remaining_today"] == 0.50

    # 3. Sub-agent spends within limit (0.15 USDC)
    spend_res = client.spend(
        operator_address=operator_wallet.address,
        token=usdc,
        recipient=recipient_wallet.address,
        amount=0.15,
        agent_private_key=agent_wallet.private_key,
        dry_run=True,
    )
    assert spend_res["status"] == "spent"
    assert spend_res["spent_today"] == 0.15
    assert spend_res["remaining_today"] == 0.35
    assert client.get_balance(operator_wallet.address, usdc) == 4.85

    # 4. Daily limit exceeded guardrail
    with pytest.raises(DailyLimitExceededError):
        client.spend(
            operator_address=operator_wallet.address,
            token=usdc,
            recipient=recipient_wallet.address,
            amount=0.40,  # 0.15 + 0.40 = 0.55 > 0.50
            agent_private_key=agent_wallet.private_key,
            dry_run=True,
        )

    # 5. Session expiration guardrail
    # Force expire auth timestamp
    raw_auth = client._auths[operator_wallet.address.lower()][agent_wallet.address.lower()][usdc.lower()]
    raw_auth.expires_at = 1000.0  # long past
    with pytest.raises(SessionExpiredError):
        client.spend(
            operator_address=operator_wallet.address,
            token=usdc,
            recipient=recipient_wallet.address,
            amount=0.05,
            agent_private_key=agent_wallet.private_key,
            dry_run=True,
        )

    # Restore session expiry for revocation test
    raw_auth.expires_at = 9999999999.0

    # 6. Revocation guardrail
    client.revoke_agent(
        agent_address=agent_wallet.address,
        token=usdc,
        operator_private_key=operator_wallet.private_key,
        dry_run=True,
    )
    with pytest.raises(UnauthorizedError):
        client.spend(
            operator_address=operator_wallet.address,
            token=usdc,
            recipient=recipient_wallet.address,
            amount=0.05,
            agent_private_key=agent_wallet.private_key,
            dry_run=True,
        )

    # 7. Insufficient balance guardrail
    with pytest.raises(InsufficientBalanceError):
        client.withdraw(
            token=usdc,
            amount=999.0,
            operator_private_key=operator_wallet.private_key,
            dry_run=True,
        )


def test_escrow_vault_abi_encoding_and_broadcasting():
    import pytest

    from apay.escrow import EscrowVaultClient
    from apay.wallet import AgentWallet

    client = EscrowVaultClient(persist=False)
    op = AgentWallet.create()
    agent = AgentWallet.create()
    usdc = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

    # 1. Verify calldata encoding methods
    dep_calldata = client.encode_deposit_calldata(usdc, 5_000_000)
    assert dep_calldata.startswith("0x47e7ef24")  # deposit(address,uint256) selector

    wdr_calldata = client.encode_withdraw_calldata(usdc, 2_000_000)
    assert wdr_calldata.startswith("0xf3fef3a3")  # withdraw(address,uint256) selector

    auth_calldata = client.encode_authorize_agent_calldata(agent.address, usdc, 500_000, 1800000000)
    assert auth_calldata.startswith("0xe0ad3ad9")  # authorizeAgent(address,address,uint256,uint256) selector

    rvk_calldata = client.encode_revoke_agent_calldata(agent.address, usdc)
    assert rvk_calldata.startswith("0x3b4bf379")  # revokeAgent(address,address) selector

    spn_calldata = client.encode_spend_calldata(op.address, usdc, agent.address, 100_000)
    assert spn_calldata.startswith("0xc9fcb301")  # spend(address,address,address,uint256) selector

    # 2. Test dry-run simulation
    dep_res = client.deposit(token=usdc, amount=10.0, operator_private_key=op.private_key, dry_run=True)
    assert dep_res["status"] == "deposited"
    assert dep_res["tx_hash"].startswith("0x")
    assert len(dep_res["tx_hash"]) == 66
    assert "calldata" in dep_res

    # 3. Test live broadcast failure with unfunded key properly raises RuntimeError
    with pytest.raises(RuntimeError):
        client.deposit(token=usdc, amount=10.0, operator_private_key=op.private_key, dry_run=False)


def test_burn_engine_abi_encoding_and_broadcasting():
    import pytest

    from apay.burn_engine import BurnEngine
    from apay.wallet import AgentWallet

    engine = BurnEngine()
    op = AgentWallet.create()

    # 1. Calldata encoding
    calldata = engine.encode_burn_calldata(100 * 10**18)
    assert calldata.startswith("0x42966c68")  # burn(uint256) selector

    # 2. Execute dry-run burn simulation
    burn_res = engine.execute_burn(amount_apay=50.0, operator_private_key=op.private_key, dry_run=True)
    assert burn_res["status"] == "simulated"
    assert burn_res["dry_run"] is True
    assert burn_res["calldata"].startswith("0x42966c68")

    # 3. Execute live burn with unfunded key properly raises RuntimeError
    with pytest.raises(RuntimeError):
        engine.execute_burn(amount_apay=50.0, operator_private_key=op.private_key, dry_run=False)


def test_solvency_fail_closed_security_policy():
    from apay.solvency import CachedRpcSolvencyValidator

    # Validator explicitly restricted to an unreachable endpoint list
    validator = CachedRpcSolvencyValidator(rpc_url=["http://127.0.0.1:9"], cache_ttl_seconds=10.0)
    payer = "0x" + "99" * 20

    # Uncached query MUST fail closed
    solvent, reason = validator.check_solvency(payer=payer, amount_base_units=1000)
    assert solvent is False
    assert reason is not None
    assert "fail-closed" in reason.lower()


def test_client_currency_handling_dual_and_apay():
    from apay.client import APaySession
    from apay.wallet import AgentWallet

    wallet = AgentWallet.create(max_per_call_usdc=10.0, daily_budget_usdc=50.0)
    session = APaySession(wallet)

    # 1. Test DUAL challenge parsing
    dummy_headers_dual = httpx.Headers(
        {
            "X-APay-Version": "1.0.0",
            "X-APay-Receiver": "0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc",
            "X-APay-Amount": "1000",
            "X-APay-Amount-USDC": "2000",
            "X-APay-Amount-APAY": str(4 * 10**18),
            "X-APay-Currency": "DUAL",
            "X-APay-Nonce": "test-nonce-dual",
        }
    )
    # The client can spend 0.002 USDC ($2000 base units)
    can_spend, _ = wallet.can_spend(float(dummy_headers_dual["X-APay-Amount-USDC"]) / 1_000_000.0)
    assert can_spend is True

    # 2. Test APAY 18 decimal challenge parsing
    dummy_headers_apay = httpx.Headers(
        {
            "X-APay-Version": "1.0.0",
            "X-APay-Receiver": "0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc",
            "X-APay-Amount": str(5 * 10**18),
            "X-APay-Currency": "APAY",
            "X-APay-Nonce": "test-nonce-apay",
        }
    )
    price_apay = float(dummy_headers_apay["X-APay-Amount"]) / 1e18
    assert price_apay == 5.0
    can_spend_apay, _ = wallet.can_spend(price_apay, currency="APAY")
    assert can_spend_apay is True
    session.close()


def test_agent_pays_pure_apay_with_guardrails():
    """Verify that an agent with max_per_call_usdc=0.05 and max_per_call_apay=5.0
    can pay 2.0 $APAY without false rejection by the USDC guardrail.
    """
    from starlette.applications import Starlette
    from starlette.requests import Request
    from starlette.responses import JSONResponse
    from starlette.routing import Route

    from apay.client import APaySession
    from apay.wallet import AgentWallet

    # Paywall requiring 2.0 $APAY
    price_apay_tokens = 2.0
    amount_base_units = str(int(price_apay_tokens * 10**18))
    receiver_address = "0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc"

    async def apay_endpoint(request: Request):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("APay eip712:"):
            return JSONResponse(
                {"error": "Payment Required"},
                status_code=402,
                headers={
                    "X-APay-Version": "1.0.0",
                    "X-APay-Receiver": receiver_address,
                    "X-APay-Amount": amount_base_units,
                    "X-APay-Currency": "APAY",
                    "X-APay-Nonce": "test-nonce-apay-guardrail",
                    "X-APay-Scheme": "eip712",
                },
            )
        return JSONResponse({"status": "success", "secret": "apay_unlocked"})

    app = Starlette(routes=[Route("/data", apay_endpoint, methods=["GET"])])
    mock_client = TestClient(app)

    # Wallet with low USDC limit ($0.05) and sufficient APAY limit (5.0 APAY)
    wallet = AgentWallet.create(max_per_call_usdc=0.05, daily_budget_usdc=1.0)
    assert wallet.max_per_call_apay >= 2.0

    session = APaySession(wallet)
    # Monkey-patch session client to use starlette TestClient
    session.client = mock_client  # type: ignore[assignment]

    resp = session.get("http://testserver/data")
    assert resp.status_code == 200
    assert resp.json()["secret"] == "apay_unlocked"
    # Verify spend recorded in APAY ledger, not USDC ledger
    assert wallet.total_spent_apay == 2.0
    assert wallet.total_spent_usdc == 0.0


def test_fastapi_dual_currency_and_channel():
    """Verify APayPaywall in FastAPI/Starlette handles DUAL currency and APay channel: vouchers."""
    from starlette.applications import Starlette
    from starlette.routing import Route

    from apay.channel import ChannelPayerSession, ChannelReceiverValidator
    from apay.fastapi import APayPaywall

    receiver = "0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc"
    validator = ChannelReceiverValidator(receiver_wallet=receiver)
    paywall = APayPaywall(
        price_usdc=0.002,
        currency="DUAL",
        price_apay=3.0,
        receiver_wallet=receiver,
        channel_validator=validator,
    )

    async def endpoint(request):
        claim = await paywall(request)
        return JSONResponse({"status": "ok", "payer": claim.payer})

    app = Starlette(routes=[Route("/api/test", endpoint, methods=["GET"])])
    client = TestClient(app)

    # 1. Missing auth -> 402 with DUAL headers
    resp = client.get("/api/test")
    assert resp.status_code == 402
    assert resp.headers["X-APay-Currency"] == "DUAL"
    assert resp.headers["X-APay-Amount-USDC"] == "2000"
    assert resp.headers["X-APay-Amount-APAY"] == str(int(3.0 * 10**18))

    # 2. Test Underpayment -> Rejection
    underpay_headers = {
        "Authorization": "APay eip712:fake_sig:0x1111111111111111111111111111111111111111:nonce-1:100"
    }
    resp = client.get("/api/test", headers=underpay_headers)
    assert resp.status_code == 402
    assert "Underpayment" in resp.text

    # 3. Test Cumulative State Channel Voucher
    payer_wallet = AgentWallet.create()
    session = ChannelPayerSession(
        wallet=payer_wallet,
        receiver=receiver,
        max_cumulative_usdc=10.0,
    )
    voucher = session.next_voucher(cost_base_units=2000)
    chan_headers = {"Authorization": voucher.to_header()}
    resp = client.get("/api/test", headers=chan_headers)
    assert resp.status_code == 200
    assert resp.json()["payer"].lower() == payer_wallet.address.lower()


def test_channel_payer_session_apay():
    """Verify ChannelPayerSession supports APAY token with 18 decimals."""
    from apay.channel import ChannelPayerSession, ChannelReceiverValidator

    receiver = "0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc"
    payer_wallet = AgentWallet.create()

    # 50.0 APAY max channel cap
    session = ChannelPayerSession(
        wallet=payer_wallet,
        receiver=receiver,
        currency="APAY",
        max_cumulative_amount=50.0,
    )
    assert session.max_cumulative_units == int(50.0 * 10**18)

    # Send 1.5 APAY voucher
    cost = int(1.5 * 10**18)
    voucher = session.next_voucher(cost_base_units=cost)
    assert voucher.cumulative_amount_base_units == cost
    assert voucher.sequence == 1

    # Validate on receiver
    validator = ChannelReceiverValidator(receiver_wallet=receiver)
    valid, err = validator.verify_voucher(voucher, expected_delta_units=cost)
    assert valid is True
    assert err is None
