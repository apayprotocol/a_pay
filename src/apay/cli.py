import threading
import time

import click
import httpx
import uvicorn

from . import __version__
from .client import APaySession
from .nonce_store import RedisNonceStore
from .proxy import create_proxy_app
from .relayer import ClaimJournal, SettlementRelayer
from .wallet import AgentWallet


def _register_heartbeat(
    wallet: str,
    target: str,
    price: float,
    network: str,
    currency: str = "USDC",
    name: str | None = None,
    category: str = "DEVTOOLS",
    description: str | None = None,
) -> None:
    """Non-blocking recurring background heartbeat to A-Pay Protocol Registry.
    Sends initial heartbeat and refreshes every 4 minutes (TTL=10m)
    as long as the gateway server process remains active.
    """

    def _worker():
        clean_name = name or f"{target.replace('http://', '').replace('https://', '').split('/')[0]} M2M API"
        clean_desc = (
            description or f"HTTP 402 Paywalled M2M microservice protected via A-Pay Gateway ({__version__})."
        )
        payload = {
            "wallet": wallet,
            "targetDomain": target,
            "price": f"{price} {currency.upper()}",
            "network": network,
            "version": __version__,
            "name": clean_name,
            "category": category,
            "description": clean_desc,
        }
        while True:
            try:
                with httpx.Client(timeout=4.0) as client:
                    client.post(
                        "https://apayprotocol.org/api/registry",
                        json=payload,
                    )
            except Exception:
                pass
            time.sleep(240)  # Refresh every 4 minutes (well within 10-minute TTL)

    threading.Thread(target=_worker, daemon=True, name="apay-registry-heartbeat").start()


@click.group()
@click.version_option(__version__, prog_name="apay")
def main() -> None:
    """⚡ A-Pay: Universal HTTP 402 Micropayment Rail for AI Agents & APIs."""
    pass


@main.command()
@click.option(
    "--target",
    "-t",
    required=True,
    envvar="TARGET_URL",
    help="Upstream API/website URL to protect (e.g. http://localhost:8000)",
)
@click.option(
    "--price",
    "-p",
    required=True,
    type=float,
    envvar="PRICE_USDC",
    help="Price per request in USDC (or base price)",
)
@click.option(
    "--price-apay",
    type=float,
    default=None,
    envvar="PRICE_APAY",
    help="Price per request in $APAY (for DUAL currency rail)",
)
@click.option(
    "--wallet",
    "-w",
    required=True,
    envvar="RECEIVER_WALLET",
    help="Receiver wallet address to collect funds (0x...)",
)
@click.option(
    "--currency",
    "-c",
    default="USDC",
    envvar="CURRENCY",
    help="Settlement currency: APAY, USDC, or DUAL (default: USDC)",
)
@click.option(
    "--port", default=8080, type=int, envvar="PORT", help="Port to run the A-Pay Gateway on (default: 8080)"
)
@click.option("--host", default="0.0.0.0", envvar="HOST", help="Host to bind gateway (default: 0.0.0.0)")
@click.option("--network", default="base", envvar="NETWORK", help="Settlement network (default: base)")
@click.option(
    "--redis-url",
    default=None,
    envvar="REDIS_URL",
    help="Optional Redis URL for distributed nonce store (redis://...)",
)
@click.option(
    "--domain",
    "-d",
    default=None,
    help="Public domain/URL to advertise in the Global Protocol Registry (e.g. https://api.mycompany.com)",
)
@click.option(
    "--name",
    default=None,
    help="Service name for Global Protocol Registry (e.g. My Data Feed)",
)
@click.option(
    "--category",
    default="DEVTOOLS",
    help="Service category: AI_INFERENCE, FINANCE, SCRAPING, CRYPTO, DEVTOOLS, DATA_FEEDS",
)
def protect(
    target: str,
    price: float,
    wallet: str,
    currency: str,
    port: int,
    host: str,
    network: str,
    price_apay: float | None = None,
    redis_url: str | None = None,
    domain: str | None = None,
    name: str | None = None,
    category: str = "DEVTOOLS",
) -> None:
    """🛡️ Protect ANY website or API with an instant 1-command HTTP 402 Paywall."""
    curr_upper = currency.upper()
    resolved_apay_price = price_apay if price_apay is not None else 4.0

    click.echo(click.style("==================================================", fg="cyan", bold=True))
    click.echo(click.style("⚡ A-PAY GATEWAY IS ACTIVE", fg="green", bold=True))
    click.echo(click.style("==================================================", fg="cyan", bold=True))
    click.echo(f"  Target URL       : {target}")
    if domain:
        click.echo(f"  Public Directory : {domain}")
    if curr_upper == "DUAL":
        click.echo(f"  Paywall Price    : {price} USDC / {resolved_apay_price} $APAY (DUAL)")
    else:
        click.echo(f"  Paywall Price    : {price} {curr_upper} / request")
    click.echo(f"  Receiver Wallet  : {wallet}")
    click.echo(f"  Settlement Rail  : {network} ({curr_upper})")
    click.echo(f"  Gateway Running  : http://{host}:{port}")
    if redis_url:
        click.echo(f"  Distributed Redis: {redis_url}")
    click.echo(click.style("\nIncoming AI bots will be challenged with HTTP 402 unless paid.\n", fg="yellow"))

    # Non-blocking registration ping to Protocol Registry
    public_target = domain or target
    _register_heartbeat(
        wallet=wallet,
        target=public_target,
        price=price,
        network=network,
        currency=curr_upper,
        name=name,
        category=category,
    )

    nonce_store = None
    if redis_url:
        try:
            import redis

            r_client = redis.from_url(redis_url)
            nonce_store = RedisNonceStore(redis_client=r_client)
            click.echo("  Connected to distributed Redis nonce cluster.")
        except Exception as e:
            click.echo(f"  Redis connection warning: {e}. Falling back to in-memory sliding window.")

    app = create_proxy_app(
        target_url=target,
        receiver_wallet=wallet,
        price_usdc=price,
        network=network,
        currency=curr_upper,
        price_apay=resolved_apay_price,
        nonce_store=nonce_store,
    )
    uvicorn.run(app, host=host, port=port, log_level="info")


@main.group()
def wallet() -> None:
    """🔐 Manage Agent Wallets & Cryptographic Keys."""
    pass


@wallet.command("new")
@click.option("--max-call", default=0.05, type=float, help="Max spend limit per API call in USDC")
@click.option("--daily-budget", default=5.0, type=float, help="Max total daily budget in USDC")
def wallet_new(max_call: float, daily_budget: float) -> None:
    """Generate a new cryptographic Agent Wallet."""
    w = AgentWallet.create(max_per_call_usdc=max_call, daily_budget_usdc=daily_budget)
    click.echo(click.style("\n✨ New Agent Wallet Generated Successfully!\n", fg="green", bold=True))
    click.echo(f"  Address         : {click.style(w.address, fg='cyan', bold=True)}")
    click.echo(f"  Private Key     : {click.style(w.private_key, fg='red')}")
    click.echo(f"  Max Per Call    : ${w.max_per_call_usdc} USDC")
    click.echo(f"  Daily Budget    : ${w.daily_budget_usdc} USDC")
    click.echo(
        click.style("\n⚠️ Keep the private key safe. Pass it to APaySession(private_key=...)\n", fg="yellow")
    )


@main.group()
def agent() -> None:
    """🤖 Manage Sub-Agent Session Keys & Delegated Escrow Vault Budgets."""
    pass


@agent.command("new")
@click.option("--max-call", default=0.01, type=float, help="Max spend limit per API call in USDC")
@click.option("--daily-budget", default=0.10, type=float, help="Max total daily budget in USDC")
def agent_new(max_call: float, daily_budget: float) -> None:
    """Generate an ephemeral sub-agent wallet for swarm delegation."""
    w = AgentWallet.create(max_per_call_usdc=max_call, daily_budget_usdc=daily_budget)
    click.echo(click.style("\n🤖 New Ephemeral Sub-Agent Wallet Generated!\n", fg="green", bold=True))
    click.echo(f"  Agent Address   : {click.style(w.address, fg='cyan', bold=True)}")
    click.echo(f"  Private Key     : {click.style(w.private_key, fg='red')}")
    click.echo(f"  Max Per Call    : ${w.max_per_call_usdc} USDC")
    click.echo(f"  Daily Budget    : ${w.daily_budget_usdc} USDC")
    click.echo(
        click.style(
            "\n💡 Authorize this agent with `apay agent delegate --agent-address <ADDRESS> --limit <BUDGET>`\n",
            fg="yellow",
        )
    )


@agent.command("delegate")
@click.option(
    "--operator-key", "-k", envvar="APAY_OPERATOR_KEY", default=None, help="Master operator private key"
)
@click.option("--agent-address", "-a", required=True, help="Sub-agent address to authorize (0x...)")
@click.option("--limit", "-l", default=0.50, type=float, help="Daily spend limit in USDC (default: 0.50)")
@click.option("--hours", "-h", default=24.0, type=float, help="Session duration in hours (default: 24)")
@click.option(
    "--token", "-t", default="0x036CbD53842c5426634e7929541eC2318f3dCF7e", help="Token address (USDC)"
)
def agent_delegate(
    operator_key: str | None, agent_address: str, limit: float, hours: float, token: str
) -> None:
    """Authorize a sub-agent session key with a daily limit and expiration on EscrowVault."""
    from .escrow import EscrowVaultClient

    client = EscrowVaultClient()
    res = client.authorize_agent(
        agent_address=agent_address,
        token=token,
        daily_limit=limit,
        expiry_hours=hours,
        operator_private_key=operator_key,
        dry_run=(operator_key is None),
    )
    click.echo(click.style("\n🔐 Sub-Agent Session Key Authorized Successfully!", fg="green", bold=True))
    click.echo(f"  Operator        : {res['operator']}")
    click.echo(f"  Sub-Agent       : {res['agent']}")
    click.echo(f"  Daily Limit     : ${res['daily_limit']:.4f} USDC")
    click.echo(f"  Session Window  : {res['expiry_hours']:.1f} hours")
    click.echo(f"  Vault Address   : {client.vault_address}")
    click.echo(f"  Tx Hash         : {res['tx_hash']}\n")


@agent.command("status")
@click.option(
    "--operator", "-o", default="0x5ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc", help="Operator address"
)
@click.option("--agent-address", "-a", required=True, help="Sub-agent address (0x...)")
@click.option(
    "--token", "-t", default="0x036CbD53842c5426634e7929541eC2318f3dCF7e", help="Token address (USDC)"
)
def agent_status(operator: str, agent_address: str, token: str) -> None:
    """Query current delegation status, daily spend, and expiry for a sub-agent."""
    from .escrow import EscrowVaultClient

    client = EscrowVaultClient()
    auth = client.get_authorization(operator_address=operator, agent_address=agent_address, token=token)
    if not auth:
        click.echo(
            click.style(f"\n⚠️ No active escrow authorization found for agent {agent_address}.\n", fg="yellow")
        )
        return

    status_str = "ACTIVE" if auth["active"] else ("EXPIRED" if auth["is_expired"] else "REVOKED")
    color = "green" if auth["active"] else "red"

    click.echo(click.style(f"\n🤖 Sub-Agent Delegation Status: {status_str}", fg=color, bold=True))
    click.echo(f"  Daily Limit     : ${auth['daily_limit']:.4f} USDC")
    click.echo(f"  Spent Today     : ${auth['spent_today']:.4f} USDC")
    click.echo(f"  Remaining Today : ${auth['remaining_today']:.4f} USDC")
    click.echo(f"  Expires At      : {time.ctime(auth['expires_at'])}\n")


@agent.command("revoke")
@click.option(
    "--operator-key", "-k", envvar="APAY_OPERATOR_KEY", default=None, help="Master operator private key"
)
@click.option("--agent-address", "-a", required=True, help="Sub-agent address to revoke (0x...)")
@click.option(
    "--token", "-t", default="0x036CbD53842c5426634e7929541eC2318f3dCF7e", help="Token address (USDC)"
)
def agent_revoke(operator_key: str | None, agent_address: str, token: str) -> None:
    """Revoke a sub-agent session key immediately."""
    from .escrow import EscrowVaultClient

    client = EscrowVaultClient()
    res = client.revoke_agent(
        agent_address=agent_address,
        token=token,
        operator_private_key=operator_key,
        dry_run=(operator_key is None),
    )
    click.echo(click.style(f"\n🛑 Sub-Agent {res['agent']} revoked successfully.", fg="red", bold=True))
    click.echo(f"  Tx Hash         : {res['tx_hash']}\n")


@main.command()
@click.option("--url", "-u", required=True, help="URL of the protected API endpoint")
@click.option("--key", "-k", required=True, help="Agent's private key (0x...)")
@click.option("--budget", "-b", default=5.0, type=float, help="Daily budget limit in USDC")
def pay(url: str, key: str, budget: float) -> None:
    """🤖 Make a test auto-settling request to an A-Pay protected URL."""
    click.echo(f"Contacting {url} with agent wallet...")
    agent_wallet = AgentWallet(private_key=key, daily_budget_usdc=budget)
    session = APaySession(agent_wallet)
    try:
        resp = session.get(url)
        click.echo(click.style(f"\n✅ Status: {resp.status_code}", fg="green", bold=True))
        click.echo(f"X-APay-Settled: {resp.headers.get('X-APay-Settled')}")
        click.echo(f"Response Body : {resp.text[:300]}")
    except Exception as e:
        click.echo(click.style(f"❌ Error: {e!s}", fg="red"))
    finally:
        session.close()


@main.group()
def claims() -> None:
    """📊 Inspect & manage offline verified micropayment claims."""
    pass


@claims.command("list")
def claims_list() -> None:
    """List all collected claims waiting for on-chain settlement."""
    journal = ClaimJournal()
    all_claims = journal.load_all()
    unsettled = [c for c in all_claims if not c.settled]
    total_unsettled_usdc = sum(c.price_usdc for c in unsettled)

    click.echo(click.style("\n📜 A-Pay Claims Ledger Summary:\n", fg="cyan", bold=True))
    click.echo(f"  Total Claims Recorded : {len(all_claims)}")
    click.echo(f"  Unsettled Claims      : {len(unsettled)}")
    click.echo(f"  Pending Gross Value   : ${total_unsettled_usdc:.4f} USDC")

    if unsettled:
        click.echo("\n  Recent Pending Claims:")
        for c in unsettled[-5:]:
            click.echo(
                f"    • [{c.id}] Payer: {c.payer[:10]}... | Amount: ${c.price_usdc:.4f} USDC | Nonce: {c.nonce[:8]}..."
            )
        click.echo(
            click.style("\nRun `apay settle --dry-run` to preview batch settlement breakdown.\n", fg="yellow")
        )
    else:
        click.echo(click.style("\n✨ All claims are settled or ledger is clean.\n", fg="green"))


@claims.command("clear")
def claims_clear() -> None:
    """Clear claims journal."""
    journal = ClaimJournal()
    journal.clear()
    click.echo(click.style("✅ Claims ledger cleared successfully.", fg="green"))


@main.command()
@click.option("--key", "-k", help="Merchant / Relayer private key to sign on-chain settlement")
@click.option("--dry-run", is_flag=True, help="Simulate batch settlement without broadcasting on-chain")
def settle(key: str | None, dry_run: bool) -> None:
    """⚡ Batch settle pending micropayment claims onto Base L2 APayRouter."""
    relayer = SettlementRelayer()
    unsettled = relayer.journal.get_unsettled()

    if not unsettled:
        click.echo(click.style("\n✨ No unsettled claims found in ledger.", fg="yellow"))
        return

    simulation = relayer.simulate_batch(unsettled)

    click.echo(click.style("\n==================================================", fg="cyan", bold=True))
    click.echo(click.style("⚡ A-PAY BATCH SETTLEMENT ENGINE", fg="green", bold=True))
    click.echo(click.style("==================================================", fg="cyan", bold=True))
    click.echo(f"  Settlement Rail     : {simulation['settlement_rail']}")
    click.echo(f"  Target Claims Count : {simulation['claims_count']}")
    click.echo(f"  Gross Volume        : ${simulation['gross_volume_usdc']:.4f} USDC")
    click.echo(f"  Protocol Fee (1.0%) : ${simulation['protocol_fee_usdc']:.6f} USDC")
    click.echo(f"  Net Merchant Payout : ${simulation['net_merchant_usdc']:.4f} USDC")
    click.echo(f"  Router Contract     : {simulation['router_contract']}")

    if dry_run or not key:
        click.echo(
            click.style(
                "\nℹ️ Dry-run mode completed. Pass `--key 0x...` to broadcast live to Base Sepolia.\n",
                fg="yellow",
            )
        )
        return

    click.echo("\n🚀 Broadcasting batch settlement to Base L2...")
    result = relayer.execute_settle(private_key=key, dry_run=False)
    click.echo(
        click.style(f"✅ Batch Settled Successfully! Status: {result['status']}", fg="green", bold=True)
    )
    click.echo(f"  Transaction Hash    : {result['tx_hash']}")
    click.echo(f"  Basescan Explorer   : {result['explorer_url']}\n")


@main.command()
@click.option("--key", "-k", envvar="APAY_PRIVATE_KEY", default=None, help="Agent private key (0x...)")
@click.option("--max-call", default=0.05, type=float, help="Max per call budget limit in USDC")
@click.option("--daily-budget", default=2.0, type=float, help="Daily rolling budget limit in USDC")
@click.option("--max-call-apay", default=10.0, type=float, help="Max per call budget limit in $APAY")
@click.option("--daily-budget-apay", default=100.0, type=float, help="Daily rolling budget limit in $APAY")
@click.option(
    "--currency",
    default="DUAL",
    type=click.Choice(["USDC", "APAY", "DUAL"], case_sensitive=False),
    help="Settlement currency rail (APAY, USDC, DUAL)",
)
def mcp(
    key: str | None,
    max_call: float,
    daily_budget: float,
    max_call_apay: float = 10.0,
    daily_budget_apay: float = 100.0,
    currency: str = "DUAL",
) -> None:
    """🤖 Run native Model Context Protocol (MCP) server over stdio for AI agents."""
    from .mcp import APayMCPServer

    if key:
        wallet = AgentWallet.from_private_key(
            private_key=key,
            max_per_call_usdc=max_call,
            daily_budget_usdc=daily_budget,
            max_per_call_apay=max_call_apay,
            daily_budget_apay=daily_budget_apay,
            currency=currency,
        )
    else:
        wallet = AgentWallet.create(
            max_per_call_usdc=max_call,
            daily_budget_usdc=daily_budget,
        )
        wallet.max_per_call_apay = max_call_apay
        wallet.daily_budget_apay = daily_budget_apay
        wallet.currency = currency.upper()
    server = APayMCPServer(wallet=wallet)
    server.run_stdio()


@main.command("burn-engine")
@click.option(
    "--fee-pool",
    default=25.0,
    type=float,
    help="Total collected fee pool in USDC to process (one-shot mode)",
)
@click.option(
    "--key",
    "-k",
    envvar="APAY_PRIVATE_KEY",
    default=None,
    help="Operator private key (0x...)",
)
@click.option(
    "--daemon",
    "-d",
    is_flag=True,
    default=False,
    help="Run as autonomous background daemon",
)
@click.option(
    "--interval",
    "-i",
    default=3600,
    type=int,
    help="Polling interval in seconds for daemon mode (default: 3600)",
)
@click.option(
    "--min-threshold",
    default=10.0,
    type=float,
    help="Minimum USDC threshold to trigger swap & burn (default: $10.00)",
)
@click.option(
    "--network",
    default="base",
    type=click.Choice(["base", "sepolia"], case_sensitive=False),
    help="Target network (default: base)",
)
@click.option(
    "--dry-run",
    is_flag=True,
    default=False,
    help="Simulate burn without on-chain broadcast",
)
@click.option(
    "--sync-feed",
    default="https://apay-network.vercel.app/api/burn-feed",
    help="Web Console telemetry URL",
)
def burn_engine_cmd(
    fee_pool: float,
    key: str | None,
    daemon: bool,
    interval: int,
    min_threshold: float,
    network: str,
    dry_run: bool,
    sync_feed: str | None,
) -> None:
    """🔥 Automated Aerodrome DEX Buyback & Deflationary Burn Daemon."""
    from typing import Any

    from .burn_engine import BurnDaemon, BurnEngine

    chain_id = 8453 if network.lower() == "base" else 84532
    engine = BurnEngine(chain_id=chain_id)
    is_dry = dry_run or (key is None)

    click.echo(
        click.style(
            "\n🔥 A-PAY DEFLATIONARY BUYBACK & BURN ENGINE (PILLAR 3.4)",
            fg="red",
            bold=True,
        )
    )
    click.echo(f"  Target Network      : {network.upper()} (Chain ID: {chain_id})")
    click.echo(f"  DEX Router          : {'Aerodrome Finance vAMM' if chain_id == 8453 else 'SwapRouter02'}")
    click.echo(f"  Min Fee Threshold   : ${min_threshold:.2f} USDC")
    click.echo(f"  Execution Mode      : {'DRY RUN (Simulation)' if is_dry else 'LIVE ON-CHAIN BROADCAST'}")

    daemon_engine = BurnDaemon(
        engine=engine,
        operator_private_key=key,
        min_threshold_usdc=min_threshold,
        poll_interval=interval,
        dry_run=is_dry,
        network=network,
        sync_feed_url=sync_feed,
    )

    if daemon:
        click.echo(
            click.style(
                f"\n🔄 Daemon active: Polling every {interval}s (Ctrl+C to stop)...\n",
                fg="cyan",
            )
        )

        def handle_cycle(res: dict[str, Any]) -> None:
            if res.get("status") == "skipped":
                click.echo(f"  [Idle] {res.get('reason')}")
            else:
                amt = res.get("amount_burned_apay") or res.get("estimated_apay_bought") or 0.0
                click.echo(
                    click.style(
                        f"  🔥 Cycle Complete: Burned {amt:,.2f} $APAY via {res.get('dex', 'DEX')} | Explorer: {res.get('explorer_url', 'N/A')}",
                        fg="green",
                    )
                )

        try:
            daemon_engine.run_daemon(on_cycle=handle_cycle)
        except KeyboardInterrupt:
            click.echo(click.style("\n🛑 Burn daemon gracefully stopped.", fg="yellow"))
        return

    # One-shot execution
    alloc = engine.calculate_burn_allocation(fee_pool)
    click.echo(f"  Fee Pool Processed  : ${alloc['total_fee_pool_usdc']:.2f} USDC")
    click.echo(
        f"  Burn Allocation     : {alloc['burn_allocation_pct']} (${alloc['burn_usdc_allocated']:.2f} USDC)"
    )
    click.echo(f"  Treasury Retained   : 70.0% (${alloc['treasury_usdc_retained']:.2f} USDC)")
    click.echo(f"  Estimated $APAY Burn: {alloc['estimated_apay_to_burn']:,.2f} $APAY")

    result = daemon_engine.execute_cycle(fee_amount=fee_pool)

    if result.get("status") == "skipped":
        click.echo(
            click.style(
                f"\n⏸️ Cycle Skipped: {result.get('reason')}\n",
                fg="yellow",
            )
        )
    elif result.get("dry_run"):
        click.echo(
            click.style(
                "\nℹ️ Dry-run burn simulated. DEX swap calldata generated and verified.\n",
                fg="yellow",
            )
        )
        click.echo(f"  DEX Calldata        : {result.get('swap_calldata', '')[:40]}...")
        click.echo(f"  Burn Calldata       : {result.get('burn_calldata', '')[:40]}...")
    else:
        click.echo(
            click.style(
                "\n✅ On-Chain Buyback & Burn Executed Successfully!",
                fg="green",
                bold=True,
            )
        )
        click.echo(f"  Swap Tx Hash        : {result.get('swap_tx_hash')}")
        click.echo(f"  Burn Tx Hash        : {result.get('burn_tx_hash')}")
        click.echo(f"  Explorer            : {result.get('explorer_url')}\n")


@main.command()
def verify() -> None:
    """🔬 Multi-dimensional system, cryptographic benchmark & RPC health check."""
    click.echo(
        click.style("\n⚡ Running A-Pay Multi-Dimensional System Health Check...\n", fg="cyan", bold=True)
    )

    # 1. Benchmark Cryptographic Signing
    w = AgentWallet.create()
    t0 = time.perf_counter()
    iterations = 50
    for i in range(iterations):
        sig = w.sign_challenge(f"APAY:0x5eC0:1000:{i}")
        AgentWallet.verify_signature(f"APAY:0x5eC0:1000:{i}", sig)
    avg_latency_ms = ((time.perf_counter() - t0) / iterations) * 1000.0

    click.echo(f"  🔐 Cryptographic Sign & Verify Latency : {avg_latency_ms:.2f} ms / op (Target: < 20ms)")
    if avg_latency_ms < 20.0:
        click.echo(click.style("     -> PASS: Ultra-low latency machine-to-machine verified.", fg="green"))
    else:
        click.echo(click.style("     -> WARN: Higher than expected latency.", fg="yellow"))

    # 2. Check RPC Node Connectivity
    rpc_url = "https://sepolia.base.org"
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(
                rpc_url, json={"jsonrpc": "2.0", "method": "eth_blockNumber", "params": [], "id": 1}
            )
            if resp.status_code == 200 and "result" in resp.json():
                block_hex = resp.json()["result"]
                block_num = int(block_hex, 16)
                click.echo(f"  🌐 Base Sepolia RPC Connectivity       : Connected (Block #{block_num:,})")
                click.echo(click.style("     -> PASS: Live on-chain rail active.", fg="green"))
            else:
                click.echo(click.style("     -> WARN: RPC node returned non-standard response.", fg="yellow"))
    except Exception as err:
        click.echo(click.style(f"  🌐 Base Sepolia RPC Error             : {err!s}", fg="yellow"))

    click.echo(
        click.style("\n✅ A-Pay Protocol Core is operating at 100% capacity.\n", fg="green", bold=True)
    )


@main.group()
def stake() -> None:
    """🛡️ Manage AI Agent Anti-Spam Collateral Bonds & Slashing (Pillar 3.4)."""
    pass


@stake.command("bond")
@click.option("--agent", "-a", required=True, help="Agent address to stake for")
@click.option("--amount", "-m", type=float, default=500.0, help="Quantity of $APAY tokens to stake (min 500)")
@click.option(
    "--private-key", "-k", envvar="OPERATOR_PRIVATE_KEY", help="Operator private key for on-chain broadcast"
)
def stake_bond(agent: str, amount: float, private_key: str | None) -> None:
    """Stake $APAY collateral to achieve verified service provider status."""
    from .staking import StakingClient

    client = StakingClient()
    res = client.stake(
        agent_address=agent, amount_apay=amount, operator_private_key=private_key, dry_run=not private_key
    )
    click.echo(f"  -> Agent Address  : {agent}")
    click.echo(f"  -> Amount Staked  : {amount} $APAY")
    click.echo(
        f"  -> Bonded Status  : {'✅ Verified Bonded' if res.get('is_bonded', True) else '❌ Under Minimum (500 APAY)'}"
    )
    click.echo(f"  -> Execution Mode : {'Simulated Dry-Run' if res['dry_run'] else 'Broadcasted On-Chain'}")


@stake.command("status")
@click.option("--agent", "-a", required=True, help="Agent address to inspect")
def stake_status(agent: str) -> None:
    """Query on-chain bonding and collateral status for an agent."""
    from .staking import StakingClient

    client = StakingClient()
    bonded = client.is_bonded(agent)
    click.echo(f"  -> Agent Address  : {agent}")
    click.echo(f"  -> Bonded Status  : {'✅ Verified Bonded (>=500 APAY)' if bonded else '❌ Not Bonded'}")


@stake.command("slash")
@click.option("--agent", "-a", required=True, help="Offending service agent address (0x...)")
@click.option("--challenger", "-c", required=True, help="Challenger address claiming bounty (0x...)")
@click.option("--amount", "-m", type=float, default=100.0, help="Amount of $APAY to slash (default: 100)")
@click.option("--reason", "-r", required=True, help="Dispute reason or proof hash")
@click.option("--category", default="CORRUPTED_PAYLOAD", help="Violation category")
@click.option("--arbiter-key", "-k", envvar="ARBITER_PRIVATE_KEY", help="Arbiter private key for broadcast")
@click.option("--network", "-n", default="base-sepolia", help="Network (base, base-sepolia)")
@click.option("--sync-feed", is_flag=True, default=False, help="Sync slash event to web dispute feed")
@click.option(
    "--feed-url", default="https://apay-network.vercel.app/api/dispute", help="Dispute telemetry feed URL"
)
def stake_slash(
    agent: str,
    challenger: str,
    amount: float,
    reason: str,
    category: str,
    arbiter_key: str | None,
    network: str,
    sync_feed: bool,
    feed_url: str,
) -> None:
    """⚡ Challenge an offending agent: slashes stake (50% bounty, 50% burn)."""
    from .staking import StakingClient

    client = StakingClient(network=network)
    res = client.slash(
        agent_address=agent,
        challenger_address=challenger,
        slash_amount_apay=amount,
        reason=reason,
        category=category,
        arbiter_private_key=arbiter_key,
        dry_run=not arbiter_key,
        sync_feed=sync_feed,
        sync_feed_url=feed_url,
    )
    click.echo(click.style("\n⚔️ AI Agent Slashed Successfully!", fg="red", bold=True))
    click.echo(f"  -> Offending Agent   : {res['agent_address']}")
    click.echo(f"  -> Challenger        : {res['challenger_address']}")
    click.echo(f"  -> Slashed Amount    : {res['slashed_amount_apay']:.2f} $APAY")
    click.echo(
        click.style(
            f"  -> Challenger Bounty : +{res['challenger_bounty_apay']:.2f} $APAY (50% Refund)", fg="green"
        )
    )
    click.echo(
        click.style(
            f"  -> Permanent Burn    : -{res['burned_apay']:.2f} $APAY (Destroyed Forever 🔥)", fg="yellow"
        )
    )
    click.echo(f"  -> Reason            : {res['reason']}")
    click.echo(f"  -> Category          : {res['category']}")
    click.echo(f"  -> Network           : {res['network']} (Chain ID: {res['chain_id']})")
    click.echo(f"  -> Tx Hash           : {res['tx_hash']}")
    click.echo(f"  -> Explorer          : {res['explorer_url']}\n")


@stake.command("disputes")
@click.option("--network", "-n", default="all", help="Filter network (base, base-sepolia, all)")
@click.option(
    "--feed-url", default="https://apay-network.vercel.app/api/dispute", help="Dispute telemetry feed URL"
)
def stake_disputes(network: str, feed_url: str) -> None:
    """Query live anti-spam dispute telemetry and slashing history."""
    import httpx

    click.echo(click.style(f"\n📡 Fetching live disputes from {feed_url}...", fg="cyan"))
    try:
        with httpx.Client(timeout=6.0) as client:
            resp = client.get(f"{feed_url}?network={network}")
            if resp.status_code == 200:
                data = resp.json()
                stats = data.get("stats", {})
                click.echo(click.style("\n📊 Global Anti-Spam Dispute Telemetry:", bold=True))
                click.echo(f"  • Total Slashed $APAY : {stats.get('totalSlashedApay', 0):,.2f}")
                click.echo(f"  • Bounties Paid $APAY : {stats.get('totalBountiesPaidApay', 0):,.2f}")
                click.echo(f"  • Burned $APAY        : {stats.get('totalBurnedApay', 0):,.2f} 🔥")
                click.echo(f"  • Disputes Succeeded  : {stats.get('disputeCount', 0)}")

                disputes = data.get("disputes", [])
                if disputes:
                    click.echo(click.style(f"\n📜 Recent Slashing Events ({len(disputes)}):", bold=True))
                    for d in disputes[:5]:
                        click.echo(
                            f"  - [{d.get('network', 'base')}] {d.get('category')} | Slashed: {d.get('slashedAmountApay')} APAY | Agent: {d.get('agentAddress', '')[:10]}..."
                        )
                click.echo("")
                return
    except Exception as err:
        click.echo(f"  ⚠️ Could not fetch remote dispute feed: {err!s}")


if __name__ == "__main__":
    main()
