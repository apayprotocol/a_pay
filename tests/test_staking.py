"""
Unit tests for AI Agent Staking & Slashing Vault Client
Validates Pillar 3.4 of RULEBOOK.md
"""

from __future__ import annotations

import eth_abi

from apay.staking import StakeInfo, StakingClient


def test_stake_info_dataclass():
    info = StakeInfo(
        agent_address="0x1111111111111111111111111111111111111111",
        active_stake_apay=600.0,
        active_stake_wei=600 * 10**18,
        unbonding_amount_apay=0.0,
        unbonding_amount_wei=0,
        unbonding_unlock_time=0,
        is_bonded=True,
    )
    assert info.is_bonded is True
    assert info.active_stake_apay == 600.0


def test_staking_calldata_encoders():
    client = StakingClient()
    agent = "0x2222222222222222222222222222222222222222"
    challenger = "0x3333333333333333333333333333333333333333"

    # 1. stake(address,uint256)
    stake_cd = client.encode_stake_calldata(agent, 500 * 10**18)
    assert len(stake_cd) > 10
    raw = bytes.fromhex(stake_cd[10:])
    dec = eth_abi.decode(["address", "uint256"], raw)
    assert dec[0].lower() == agent.lower()
    assert dec[1] == 500 * 10**18

    # 2. initiateUnstake(uint256)
    unstake_cd = client.encode_initiate_unstake_calldata(100 * 10**18)
    dec_unstake = eth_abi.decode(["uint256"], bytes.fromhex(unstake_cd[10:]))
    assert dec_unstake[0] == 100 * 10**18

    # 3. finalizeUnstake()
    finalize_cd = client.encode_finalize_unstake_calldata()
    assert finalize_cd.startswith("0x")
    assert len(finalize_cd) == 10  # 4-byte selector only

    # 4. isBonded(address)
    bonded_cd = client.encode_is_bonded_calldata(agent)
    dec_bonded = eth_abi.decode(["address"], bytes.fromhex(bonded_cd[10:]))
    assert dec_bonded[0].lower() == agent.lower()

    # 5. slash(address,address,uint256,string)
    slash_cd = client.encode_slash_calldata(agent, challenger, 100 * 10**18, "Hallucinated data payload")
    dec_slash = eth_abi.decode(["address", "address", "uint256", "string"], bytes.fromhex(slash_cd[10:]))
    assert dec_slash[0].lower() == agent.lower()
    assert dec_slash[1].lower() == challenger.lower()
    assert dec_slash[2] == 100 * 10**18
    assert dec_slash[3] == "Hallucinated data payload"


def test_staking_dry_run():
    client = StakingClient(min_bond_amount=500.0)
    agent = "0x4444444444444444444444444444444444444444"

    # Below 500 APAY is not bonded
    res_under = client.stake(agent_address=agent, amount_apay=400.0, dry_run=True)
    assert res_under["status"] == "simulated"
    assert res_under["dry_run"] is True
    assert res_under["is_bonded"] is False

    # At or above 500 APAY is bonded
    res_bonded = client.stake(agent_address=agent, amount_apay=500.0, dry_run=True)
    assert res_bonded["status"] == "simulated"
    assert res_bonded["is_bonded"] is True


def test_slashing_dry_run_math():
    client = StakingClient()
    agent = "0x5555555555555555555555555555555555555555"
    challenger = "0x6666666666666666666666666666666666666666"

    # Slash 200 $APAY -> 100 to challenger, 100 burned
    res = client.slash(
        agent_address=agent,
        challenger_address=challenger,
        slash_amount_apay=200.0,
        reason="Corrupted payload SHA mismatch",
        dry_run=True,
    )
    assert res["status"] == "slashed_simulated"
    assert res["dry_run"] is True
    assert res["slashed_amount_apay"] == 200.0
    assert res["challenger_bounty_apay"] == 100.0
    assert res["burned_apay"] == 100.0
    assert res["reason"] == "Corrupted payload SHA mismatch"


def test_is_bonded_fallback():
    client = StakingClient(min_bond_amount=500.0)
    agent = "0x7777777777777777777777777777777777777777"

    assert client.is_bonded(agent, fallback_active_stake=600.0) is True
    assert client.is_bonded(agent, fallback_active_stake=499.99) is False
    assert client.is_bonded(agent) is False
