"""⚡ A-Pay Protocol — Coinbase AgentKit Action Provider Demo.

Demonstrates how autonomous AI agents built on Base L2 using Coinbase AgentKit
can discover, probe, and autonomously settle HTTP 402 pay-per-call API requests.
"""

from __future__ import annotations

import json
from apay.integrations.agentkit import APayActionProvider, create_apay_action_provider
from apay.wallet import AgentWallet


def main() -> None:
    print("=" * 65)
    print("🤖 A-PAY PROTOCOL: COINBASE AGENTKIT ACTION PROVIDER (BASE L2)")
    print("=" * 65)

    # 1. Initialize Action Provider with safe guardrails
    wallet = AgentWallet.create(
        max_per_call_usdc=0.05,
        daily_budget_usdc=2.00,
        max_per_call_apay=10.0,
        daily_budget_apay=100.0,
        currency="DUAL",
    )

    provider = create_apay_action_provider(
        wallet=wallet,
        network="base-mainnet",
    )

    print(f"\n✅ Provider Name   : {provider.name}")
    print(f"✅ Active Network  : {provider.network}")
    print(f"✅ Session Wallet  : {provider.wallet.address}")

    # 2. Inspect Wallet Telemetry & Spending Guardrails
    print("\n[Step 1] Inspecting Agent Safety Guardrails...")
    status_raw = provider.get_wallet_status(None, {})
    status = json.loads(status_raw)
    print(f"  • Max per Call   : ${status['spending_guardrails']['max_per_call_usdc']:.2f} USDC")
    print(f"  • Daily Budget   : ${status['spending_guardrails']['daily_budget_usdc']:.2f} USDC")
    print(f"  • Remaining      : ${status['spending_guardrails']['remaining_usdc']:.2f} USDC")

    # 3. Probe an API for HTTP 402 requirements (0 gas cost)
    print("\n[Step 2] Probing Endpoint for HTTP 402 Paywall Terms...")
    target_url = "https://apayprotocol.org/api/genesis-call"
    probe_raw = provider.probe_endpoint(None, {"url": target_url})
    probe = json.loads(probe_raw)
    print(f"  • Target URL     : {probe.get('url')}")
    print(f"  • HTTP Status    : {probe.get('http_status')}")
    print(f"  • Requires Pay   : {probe.get('requires_payment')}")
    print(f"  • Price Quote    : {probe.get('price')} {probe.get('currency')}")

    # 4. Dynamically adjust runtime budget
    print("\n[Step 3] Updating Spending Budget Dynamically...")
    update_raw = provider.set_budget(
        None,
        {
            "max_per_call_usdc": 0.10,
            "daily_budget_usdc": 5.00,
        },
    )
    update = json.loads(update_raw)
    print(f"  • Status         : {update.get('status')}")
    print(f"  • New Max/Call   : ${update['active_limits']['max_per_call_usdc']:.2f} USDC")
    print(f"  • New Daily Cap  : ${update['active_limits']['daily_budget_usdc']:.2f} USDC")

    print("\n🎉 Coinbase AgentKit Action Provider is ready for production deployment on Base L2!")
    print("=" * 65)


if __name__ == "__main__":
    main()
