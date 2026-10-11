"""
Unit tests for DEX Auto-Swap Route & Deflationary Buyback/Burn Engine
Validates Pillar 3.4 of RULEBOOK.md
"""

from __future__ import annotations

import eth_abi

from apay.burn_engine import AerodromeRoute, BurnDaemon, BurnEngine, DexSwapParams


def test_dex_swap_params_dataclass():
    params = DexSwapParams(
        token_in="0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        token_out="0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3",
        fee_tier=3000,
        recipient="0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc",
        amount_in=3_000_000,
        amount_out_minimum=59_400_000_000_000_000_000,
        sqrt_price_limit_x96=0,
    )
    assert params.fee_tier == 3000
    assert params.amount_in == 3_000_000
    assert params.sqrt_price_limit_x96 == 0


def test_encode_uniswap_v3_swap_calldata():
    engine = BurnEngine()
    params = DexSwapParams(
        token_in="0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        token_out="0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3",
        fee_tier=3000,
        recipient="0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc",
        amount_in=3_000_000,
        amount_out_minimum=59_400_000_000_000_000_000,
        sqrt_price_limit_x96=0,
    )
    calldata = engine.encode_uniswap_v3_swap_calldata(params)
    assert calldata.startswith(
        "0x04e45aaf"
    )  # exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))

    # Decode and verify exact parameters
    raw_data = bytes.fromhex(calldata[10:])
    decoded = eth_abi.decode(
        ["(address,address,uint24,address,uint256,uint256,uint160)"],
        raw_data,
    )[0]
    assert decoded[0].lower() == params.token_in.lower()
    assert decoded[1].lower() == params.token_out.lower()
    assert decoded[2] == 3000
    assert decoded[3].lower() == params.recipient.lower()
    assert decoded[4] == 3_000_000
    assert decoded[5] == 59_400_000_000_000_000_000
    assert decoded[6] == 0


def test_calculate_buyback_quote():
    engine = BurnEngine(burn_allocation_pct=30.0)
    quote = engine.calculate_buyback_quote(
        usdc_amount=10.0,
        simulated_apay_price=0.05,
        slippage_tolerance_pct=1.0,
    )
    # 30% of $10.00 USDC is $3.00 USDC
    assert quote["total_usdc"] == 10.0
    assert quote["burn_usdc"] == 3.0
    assert quote["treasury_usdc"] == 7.0
    assert quote["usdc_base_units"] == 3_000_000

    # $3.00 / $0.05 = 60.0 $APAY
    assert quote["expected_apay"] == 60.0
    assert quote["expected_apay_wei"] == 60 * 10**18

    # 1.0% slippage on 60.0 is 59.4 $APAY
    assert quote["min_apay"] == 59.4
    assert quote["min_apay_wei"] == int(59.4 * 10**18)


def test_execute_buyback_and_burn_dry_run():
    engine = BurnEngine()
    result = engine.execute_buyback_and_burn(
        total_collected_fee_usdc=25.0,
        dry_run=True,
        simulated_apay_price=0.05,
        slippage_tolerance_pct=1.0,
    )
    assert result["status"] == "simulated"
    assert result["dry_run"] is True
    assert result["total_fee_usdc"] == 25.0
    assert result["burn_usdc_allocated"] == 7.5  # 30% of 25
    assert result["treasury_usdc_retained"] == 17.5  # 70% of 25
    assert result["estimated_apay_bought"] == 150.0  # 7.5 / 0.05
    assert result["min_apay_guaranteed"] == 148.5  # 150 * 0.99
    assert result["swap_calldata"].startswith("0x04e45aaf")
    assert result["burn_calldata"].startswith("0x42966c68")  # burn(uint256)


def test_aerodrome_route_dataclass():
    route = AerodromeRoute(
        token_from="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        token_to="0x4200000000000000000000000000000000000006",
        stable=False,
    )
    assert route.token_from == "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    assert route.token_to == "0x4200000000000000000000000000000000000006"
    assert route.stable is False
    assert route.factory == "0x420DD381b31aEf6683db6B902084cB0FFECe40Da"


def test_encode_aerodrome_swap_calldata():
    engine = BurnEngine()
    routes = [
        AerodromeRoute(
            token_from="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            token_to="0x4200000000000000000000000000000000000006",
            stable=False,
        ),
        AerodromeRoute(
            token_from="0x4200000000000000000000000000000000000006",
            token_to="0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3",
            stable=False,
        ),
    ]
    recipient = "0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc"
    amount_in = 1_000_000  # 1 USDC
    amount_out_min = 200_000 * 10**18  # 200k APAY min
    deadline = 1790000000

    calldata = engine.encode_aerodrome_swap_calldata(
        amount_in=amount_in,
        amount_out_min=amount_out_min,
        routes=routes,
        recipient=recipient,
        deadline=deadline,
    )
    assert calldata.startswith("0xcac88ea9")  # swapExactTokensForTokens

    # Decode and verify exact parameters
    raw_data = bytes.fromhex(calldata[10:])
    decoded = eth_abi.decode(
        ["uint256", "uint256", "(address,address,bool,address)[]", "address", "uint256"],
        raw_data,
    )
    assert decoded[0] == amount_in
    assert decoded[1] == amount_out_min
    assert len(decoded[2]) == 2
    assert decoded[2][0][0].lower() == routes[0].token_from.lower()
    assert decoded[2][0][1].lower() == routes[0].token_to.lower()
    assert decoded[2][0][2] is False
    assert decoded[2][0][3].lower() == routes[0].factory.lower()
    assert decoded[3].lower() == recipient.lower()
    assert decoded[4] == deadline


def test_aerodrome_buyback_and_burn_mainnet_route():
    engine = BurnEngine(chain_id=8453)  # Base Mainnet
    res = engine.execute_buyback_and_burn(
        total_collected_fee_usdc=50.0,
        dry_run=True,
    )
    assert res["status"] == "simulated"
    assert res["dex"] == "Aerodrome vAMM"
    assert res["chain_id"] == 8453
    assert res["swap_calldata"].startswith("0xcac88ea9")  # swapExactTokensForTokens
    assert "basescan.org" in res["explorer_url"]
    assert res["burn_usdc_allocated"] == 15.0  # 30% of 50.0
    assert res["treasury_usdc_retained"] == 35.0  # 70% of 50.0


def test_burn_daemon_threshold_and_cycle(tmp_path):
    journal = str(tmp_path / "test_burns.json")
    daemon = BurnDaemon(
        min_threshold_usdc=10.0,
        dry_run=True,
        network="base",
        sync_feed_url=None,
        journal_path=journal,
    )

    # 1. Skipped cycle when fee < threshold
    skip_res = daemon.execute_cycle(fee_amount=4.50)
    assert skip_res["status"] == "skipped"
    assert "below min threshold" in skip_res["reason"]

    # 2. Executed cycle when fee >= threshold
    exec_res = daemon.execute_cycle(fee_amount=30.0)
    assert exec_res["status"] == "simulated"
    assert exec_res["cumulative_burned_apay"] > 0
    assert exec_res["cycles_completed"] == 1
    assert daemon._cycles_completed == 1


def test_burn_daemon_run_daemon_bounded(tmp_path):
    journal = str(tmp_path / "test_burns.json")
    daemon = BurnDaemon(
        min_threshold_usdc=5.0,
        poll_interval=0,
        dry_run=True,
        network="base",
        sync_feed_url=None,
        journal_path=journal,
    )

    cycles_run = []

    def on_cycle(r):
        cycles_run.append(r)

    daemon.run_daemon(max_cycles=3, on_cycle=on_cycle)
    assert len(cycles_run) == 3
    assert daemon._cycles_completed == 3
