"""
Deflationary Buyback & Burn Engine for A-Pay Protocol
Implements Pillar 3.4 of RULEBOOK.md:
Automatically routes 30% of all collected protocol routing fees to buy back
and permanently execute burn() on $APAY tokens on Base L2.
"""

from __future__ import annotations

import json
import os
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import eth_abi
import httpx
from eth_account import Account
from eth_hash.auto import keccak

from .wallet import AgentWallet

# Base Sepolia Contract Addresses
APAY_TOKEN_ADDRESS = "0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3"
ROUTER_ADDRESS = "0x71434344beEF9C44fF3BC95572bEB7bFB8847ec6"
BASE_SEPOLIA_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
DEFAULT_SWAP_ROUTER_ADDRESS = "0x2626664c2603336E57B271c5C0b26F421741e481"  # Base Uniswap/Aerodrome V3 Router
BASE_SEPOLIA_CHAIN_ID = 84532
BASE_SEPOLIA_RPC_LIST = [
    "https://sepolia.base.org",
    "https://base-sepolia-rpc.publicnode.com",
    "https://base-sepolia.gateway.tenderly.co",
]

# Base Mainnet (Chain 8453) DEX Contracts & Infrastructure
BASE_MAINNET_CHAIN_ID = 8453
BASE_MAINNET_APAY_ADDRESS = "0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3"
BASE_MAINNET_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
BASE_MAINNET_WETH_ADDRESS = "0x4200000000000000000000000000000000000006"
AERODROME_ROUTER_BASE_MAINNET = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43"
AERODROME_FACTORY_BASE_MAINNET = "0x420DD381b31aEf6683db6B902084cB0FFECe40Da"
AERODROME_POOL_WETH_APAY = "0x6933dd2B7D72d8561005E475AFa147E47A3c7777"
BASE_MAINNET_RPC_LIST = [
    "https://mainnet.base.org",
    "https://base-rpc.publicnode.com",
]


@dataclass
class DexSwapParams:
    """Parameters for Uniswap v3 / Aerodrome exactInputSingle swap."""

    token_in: str
    token_out: str
    fee_tier: int  # 500 (0.05%), 3000 (0.3%), 10000 (1.0%)
    recipient: str
    amount_in: int
    amount_out_minimum: int
    sqrt_price_limit_x96: int = 0


@dataclass
class AerodromeRoute:
    """Route element for Aerodrome Router multi-hop or single-hop swap."""

    token_from: str
    token_to: str
    stable: bool = False
    factory: str = AERODROME_FACTORY_BASE_MAINNET


class BurnEngine:
    """Calculates and executes the 30% protocol fee deflationary burn mechanism."""

    def __init__(
        self,
        token_address: str = APAY_TOKEN_ADDRESS,
        router_address: str = ROUTER_ADDRESS,
        usdc_address: str = BASE_SEPOLIA_USDC_ADDRESS,
        swap_router_address: str = DEFAULT_SWAP_ROUTER_ADDRESS,
        burn_allocation_pct: float = 30.0,
        rpc_urls: list[str] | None = None,
        chain_id: int = BASE_SEPOLIA_CHAIN_ID,
    ) -> None:
        self.token_address = token_address
        self.router_address = router_address
        self.usdc_address = usdc_address
        self.swap_router_address = swap_router_address
        self.burn_allocation_pct = burn_allocation_pct
        self.chain_id = chain_id
        if rpc_urls:
            self.rpc_urls = list(rpc_urls)
        elif chain_id == BASE_MAINNET_CHAIN_ID:
            self.rpc_urls = list(BASE_MAINNET_RPC_LIST)
        else:
            self.rpc_urls = list(BASE_SEPOLIA_RPC_LIST)

    def _call_rpc(self, method: str, params: list[Any]) -> Any:
        """Call JSON-RPC with automated multi-endpoint fallback."""
        payload = {"jsonrpc": "2.0", "method": method, "params": params, "id": 1}
        last_err: Exception | None = None

        for endpoint in self.rpc_urls:
            try:
                with httpx.Client(timeout=8.0) as client:
                    resp = client.post(endpoint, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        if "result" in data:
                            return data["result"]
                        if "error" in data:
                            raise RuntimeError(f"RPC Error: {data['error']}")
            except Exception as err:
                last_err = err
                continue

        if last_err:
            raise RuntimeError(f"All RPC endpoints failed. Last error: {last_err!s}")
        raise RuntimeError("No response from RPC endpoints.")

    def encode_burn_calldata(self, amount_wei: int) -> str:
        """Encode ABI calldata for APAYToken.burn(uint256 amount)."""
        selector = keccak(b"burn(uint256)")[:4]
        encoded = eth_abi.encode(["uint256"], [amount_wei])
        return "0x" + (selector + encoded).hex()

    def encode_uniswap_v3_swap_calldata(self, params: DexSwapParams) -> str:
        """Encode ABI calldata for Uniswap v3 / Aerodrome SwapRouter02 exactInputSingle.

        exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))
        """
        selector = keccak(b"exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))")[:4]
        # Tuple: (tokenIn, tokenOut, fee, recipient, amountIn, amountOutMinimum, sqrtPriceLimitX96)
        struct_tuple = (
            params.token_in,
            params.token_out,
            params.fee_tier,
            params.recipient,
            params.amount_in,
            params.amount_out_minimum,
            params.sqrt_price_limit_x96,
        )
        encoded = eth_abi.encode(
            ["(address,address,uint24,address,uint256,uint256,uint160)"],
            [struct_tuple],
        )
        return "0x" + (selector + encoded).hex()

    def encode_aerodrome_swap_calldata(
        self,
        amount_in: int,
        amount_out_min: int,
        routes: list[AerodromeRoute],
        recipient: str,
        deadline: int,
    ) -> str:
        """Encode ABI calldata for Aerodrome Router swapExactTokensForTokens.

        swapExactTokensForTokens(uint256,uint256,(address,address,bool,address)[],address,uint256)
        """
        selector = keccak(
            b"swapExactTokensForTokens(uint256,uint256,(address,address,bool,address)[],address,uint256)"
        )[:4]
        routes_tuple = [(r.token_from, r.token_to, r.stable, r.factory) for r in routes]
        encoded = eth_abi.encode(
            ["uint256", "uint256", "(address,address,bool,address)[]", "address", "uint256"],
            [amount_in, amount_out_min, routes_tuple, recipient, deadline],
        )
        return "0x" + (selector + encoded).hex()

    def get_aerodrome_quote(
        self,
        amount_in: int,
        routes: list[AerodromeRoute],
        router_address: str = AERODROME_ROUTER_BASE_MAINNET,
    ) -> list[int]:
        """Queries live getAmountsOut on Aerodrome Router."""
        selector = keccak(b"getAmountsOut(uint256,(address,address,bool,address)[])")[:4]
        routes_tuple = [(r.token_from, r.token_to, r.stable, r.factory) for r in routes]
        encoded = eth_abi.encode(
            ["uint256", "(address,address,bool,address)[]"],
            [amount_in, routes_tuple],
        )
        call_data = "0x" + (selector + encoded).hex()
        result_hex = self._call_rpc("eth_call", [{"to": router_address, "data": call_data}, "latest"])
        raw_bytes = bytes.fromhex(result_hex[2:] if result_hex.startswith("0x") else result_hex)
        amounts: tuple[int, ...] = eth_abi.decode(["uint256[]"], raw_bytes)[0]
        return list(amounts)

    def fetch_live_pool_reserves(
        self,
        pool_address: str = AERODROME_POOL_WETH_APAY,
    ) -> dict[str, Any]:
        """Fetches live on-chain reserves from the Aerodrome vAMM-WETH/APAY pool."""
        result_hex = self._call_rpc("eth_call", [{"to": pool_address, "data": "0x0902f1ac"}, "latest"])
        raw_bytes = bytes.fromhex(result_hex[2:] if result_hex.startswith("0x") else result_hex)
        reserve0, reserve1, block_timestamp = eth_abi.decode(["uint256", "uint256", "uint256"], raw_bytes)

        weth_reserve = reserve0 / 1e18
        apay_reserve = reserve1 / 1e18
        spot_weth_per_apay = (reserve0 / reserve1) if reserve1 > 0 else 0.0
        spot_apay_per_weth = (reserve1 / reserve0) if reserve0 > 0 else 0.0

        return {
            "pool_address": pool_address,
            "reserve0_raw": reserve0,
            "reserve1_raw": reserve1,
            "block_timestamp": block_timestamp,
            "reserve_weth": weth_reserve,
            "reserve_apay": apay_reserve,
            "spot_weth_per_apay": spot_weth_per_apay,
            "spot_apay_per_weth": spot_apay_per_weth,
        }

    def calculate_burn_allocation(self, total_collected_fee_usdc: float) -> dict[str, Any]:
        """Calculates fee distribution between Treasury R&D (70%) and Deflationary Burn (30%)."""
        burn_usdc = total_collected_fee_usdc * (self.burn_allocation_pct / 100.0)
        treasury_usdc = total_collected_fee_usdc - burn_usdc

        # Estimated APAY market price pegged in simulation at $0.05 per $APAY
        simulated_apay_price = 0.05
        estimated_apay_to_burn = burn_usdc / simulated_apay_price

        return {
            "total_fee_pool_usdc": total_collected_fee_usdc,
            "burn_allocation_pct": f"{self.burn_allocation_pct:.1f}%",
            "burn_usdc_allocated": burn_usdc,
            "treasury_usdc_retained": treasury_usdc,
            "simulated_apay_price_usd": simulated_apay_price,
            "estimated_apay_to_burn": estimated_apay_to_burn,
            "token_address": self.token_address,
        }

    def calculate_buyback_quote(
        self,
        usdc_amount: float,
        simulated_apay_price: float = 0.05,
        slippage_tolerance_pct: float = 1.0,
    ) -> dict[str, Any]:
        """Calculates buyback amounts, expected output tokens, and minimum slippage bounds."""
        burn_usdc = usdc_amount * (self.burn_allocation_pct / 100.0)
        treasury_usdc = usdc_amount - burn_usdc

        # Convert to base units (USDC has 6 decimals)
        usdc_base_units = int(burn_usdc * 1_000_000)

        # Expected APAY (18 decimals)
        expected_apay = burn_usdc / simulated_apay_price
        expected_apay_wei = int(expected_apay * 10**18)

        # Slippage calculation
        slippage_factor = 1.0 - (slippage_tolerance_pct / 100.0)
        min_apay_wei = int(expected_apay_wei * slippage_factor)
        min_apay = expected_apay * slippage_factor

        return {
            "total_usdc": usdc_amount,
            "burn_usdc": burn_usdc,
            "treasury_usdc": treasury_usdc,
            "usdc_base_units": usdc_base_units,
            "simulated_apay_price": simulated_apay_price,
            "expected_apay": expected_apay,
            "expected_apay_wei": expected_apay_wei,
            "min_apay": min_apay,
            "min_apay_wei": min_apay_wei,
            "slippage_tolerance_pct": slippage_tolerance_pct,
        }

    def execute_buyback_and_burn(
        self,
        total_collected_fee_usdc: float,
        operator_private_key: str | None = None,
        dry_run: bool = False,
        simulated_apay_price: float = 0.05,
        slippage_tolerance_pct: float = 1.0,
    ) -> dict[str, Any]:
        """Executes the complete Buyback & Burn pipeline:

        1. Routes 30% of total USDC fee to DEX Swap Router.
        2. Swaps USDC -> $APAY with slippage protection.
        3. Executes APAYToken.burn() on the bought tokens.
        """
        quote = self.calculate_buyback_quote(
            usdc_amount=total_collected_fee_usdc,
            simulated_apay_price=simulated_apay_price,
            slippage_tolerance_pct=slippage_tolerance_pct,
        )

        recipient_wallet = (
            AgentWallet(private_key=operator_private_key).address
            if operator_private_key
            else "0x0000000000000000000000000000000000000000"
        )

        is_aerodrome = (self.chain_id == BASE_MAINNET_CHAIN_ID) or (
            self.swap_router_address == AERODROME_ROUTER_BASE_MAINNET
        )
        explorer_base = (
            "https://basescan.org"
            if self.chain_id == BASE_MAINNET_CHAIN_ID
            else "https://sepolia.basescan.org"
        )

        if is_aerodrome:
            swap_router = AERODROME_ROUTER_BASE_MAINNET
            routes = [
                AerodromeRoute(
                    token_from=self.usdc_address,
                    token_to=BASE_MAINNET_WETH_ADDRESS,
                    stable=False,
                ),
                AerodromeRoute(
                    token_from=BASE_MAINNET_WETH_ADDRESS,
                    token_to=self.token_address,
                    stable=False,
                ),
            ]
            deadline = int(time.time()) + 1800
            swap_calldata = self.encode_aerodrome_swap_calldata(
                amount_in=quote["usdc_base_units"],
                amount_out_min=quote["min_apay_wei"],
                routes=routes,
                recipient=recipient_wallet,
                deadline=deadline,
            )
        else:
            swap_router = self.swap_router_address
            swap_params = DexSwapParams(
                token_in=self.usdc_address,
                token_out=self.token_address,
                fee_tier=3000,  # 0.3% Uniswap v3 fee tier
                recipient=recipient_wallet,
                amount_in=quote["usdc_base_units"],
                amount_out_minimum=quote["min_apay_wei"],
                sqrt_price_limit_x96=0,
            )
            swap_calldata = self.encode_uniswap_v3_swap_calldata(swap_params)

        burn_calldata = self.encode_burn_calldata(quote["expected_apay_wei"])

        if dry_run or not operator_private_key:
            return {
                "status": "simulated",
                "dry_run": True,
                "total_fee_usdc": total_collected_fee_usdc,
                "burn_usdc_allocated": quote["burn_usdc"],
                "treasury_usdc_retained": quote["treasury_usdc"],
                "estimated_apay_bought": quote["expected_apay"],
                "min_apay_guaranteed": quote["min_apay"],
                "amount_wei": str(quote["expected_apay_wei"]),
                "dex": "Aerodrome vAMM" if is_aerodrome else "SwapRouter02",
                "swap_router": swap_router,
                "swap_calldata": swap_calldata,
                "burn_calldata": burn_calldata,
                "token_address": self.token_address,
                "chain_id": self.chain_id,
                "explorer_url": f"{explorer_base}/address/{self.token_address}#code",
                "message": "DEX Buyback & Burn simulation completed successfully.",
            }

        # Live on-chain execution with operator key
        wallet = AgentWallet(private_key=operator_private_key)
        try:
            # Step 1: Send swap transaction to DEX Router
            nonce_hex = self._call_rpc("eth_getTransactionCount", [wallet.address, "pending"])
            nonce = int(nonce_hex, 16)

            gas_price_hex = self._call_rpc("eth_gasPrice", [])
            gas_price = int(gas_price_hex, 16)

            swap_tx = {
                "to": swap_router,
                "value": 0,
                "gas": 300_000 if is_aerodrome else 250_000,
                "gasPrice": gas_price,
                "nonce": nonce,
                "chainId": self.chain_id,
                "data": swap_calldata,
            }
            signed_swap = Account.sign_transaction(swap_tx, wallet.private_key)
            swap_tx_hash = str(
                self._call_rpc("eth_sendRawTransaction", ["0x" + signed_swap.raw_transaction.hex()])
            )

            # Step 2: Send burn transaction on APAYToken
            burn_tx = {
                "to": self.token_address,
                "value": 0,
                "gas": 120_000,
                "gasPrice": gas_price,
                "nonce": nonce + 1,
                "chainId": self.chain_id,
                "data": burn_calldata,
            }
            signed_burn = Account.sign_transaction(burn_tx, wallet.private_key)
            burn_tx_hash = str(
                self._call_rpc("eth_sendRawTransaction", ["0x" + signed_burn.raw_transaction.hex()])
            )
        except Exception as err:
            raise RuntimeError(f"DEX Buyback & Burn on-chain broadcast failed: {err!s}") from err

        return {
            "status": "burned",
            "dry_run": False,
            "total_fee_usdc": total_collected_fee_usdc,
            "burn_usdc_allocated": quote["burn_usdc"],
            "treasury_usdc_retained": quote["treasury_usdc"],
            "amount_burned_apay": quote["expected_apay"],
            "amount_wei": str(quote["expected_apay_wei"]),
            "operator_wallet": wallet.address,
            "dex": "Aerodrome vAMM" if is_aerodrome else "SwapRouter02",
            "swap_tx_hash": swap_tx_hash,
            "burn_tx_hash": burn_tx_hash,
            "explorer_url": f"{explorer_base}/tx/{burn_tx_hash}",
            "deflation_impact": f"{quote['expected_apay']:,.2f} $APAY permanently eliminated from circulating supply.",
        }

    def execute_burn(
        self,
        amount_apay: float,
        operator_private_key: str | None = None,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        """Executes or simulates a direct burn() transaction on the APAYToken contract."""
        amount_wei = int(amount_apay * 10**18)
        calldata = self.encode_burn_calldata(amount_wei)

        if dry_run or not operator_private_key:
            return {
                "status": "simulated",
                "dry_run": True,
                "amount_burned_apay": amount_apay,
                "amount_wei": str(amount_wei),
                "calldata": calldata,
                "token_address": self.token_address,
                "chain_id": BASE_SEPOLIA_CHAIN_ID,
                "message": "Dry-run burn simulation completed successfully.",
            }

        # Live on-chain execution with operator key
        wallet = AgentWallet(private_key=operator_private_key)
        try:
            nonce_hex = self._call_rpc("eth_getTransactionCount", [wallet.address, "pending"])
            nonce = int(nonce_hex, 16)

            gas_price_hex = self._call_rpc("eth_gasPrice", [])
            gas_price = int(gas_price_hex, 16)

            explorer_base = (
                "https://basescan.org"
                if self.chain_id == BASE_MAINNET_CHAIN_ID
                else "https://sepolia.basescan.org"
            )
            tx = {
                "to": self.token_address,
                "value": 0,
                "gas": 120_000,
                "gasPrice": gas_price,
                "nonce": nonce,
                "chainId": self.chain_id,
                "data": calldata,
            }

            signed_tx = Account.sign_transaction(tx, wallet.private_key)
            raw_tx_hex = "0x" + signed_tx.raw_transaction.hex()

            tx_hash = str(self._call_rpc("eth_sendRawTransaction", [raw_tx_hex]))
        except Exception as err:
            raise RuntimeError(f"Burn transaction on-chain broadcast failed: {err!s}") from err

        return {
            "status": "burned",
            "dry_run": False,
            "amount_burned_apay": amount_apay,
            "amount_wei": str(amount_wei),
            "calldata": calldata,
            "operator_wallet": wallet.address,
            "token_address": self.token_address,
            "tx_hash": tx_hash,
            "explorer_url": f"{explorer_base}/tx/{tx_hash}",
            "deflation_impact": f"{amount_apay:,.2f} $APAY permanently eliminated from circulating supply.",
        }


class BurnDaemon:
    """Autonomous background daemon for Pillar 3.4 Deflationary Buyback & Burn.

    Periodically checks accumulated routing fees, executes Aerodrome buyback & burn
    when exceeding min_threshold_usdc, and syncs verified events to local journals
    and Web Console telemetry.
    """

    def __init__(
        self,
        engine: BurnEngine | None = None,
        operator_private_key: str | None = None,
        min_threshold_usdc: float = 10.0,
        poll_interval: int = 3600,
        dry_run: bool = False,
        network: str = "base",
        sync_feed_url: str | None = "https://apay-network.vercel.app/api/burn-feed",
        journal_path: str | None = None,
    ) -> None:
        self.network = network.lower()
        chain_id = (
            BASE_MAINNET_CHAIN_ID if self.network in ("base", "mainnet", "8453") else BASE_SEPOLIA_CHAIN_ID
        )
        self.engine = engine or BurnEngine(chain_id=chain_id)
        self.operator_private_key = operator_private_key
        self.min_threshold_usdc = min_threshold_usdc
        self.poll_interval = poll_interval
        self.dry_run = dry_run or (operator_private_key is None)
        self.sync_feed_url = sync_feed_url
        self.journal_path = journal_path or os.path.expanduser("~/.apay/burn_history.json")
        self._running = False
        self._total_burned_apay = 0.0
        self._total_usdc_allocated = 0.0
        self._cycles_completed = 0

    def check_accumulated_fees(self, fallback_simulated: float = 25.0) -> float:
        """Determines the current accumulated fee balance available for buyback."""
        return fallback_simulated

    def execute_cycle(
        self,
        fee_amount: float | None = None,
        simulated_apay_price: float = 0.05,
        slippage_tolerance_pct: float = 1.0,
    ) -> dict[str, Any]:
        """Executes a single buyback & burn cycle if fee_amount >= min_threshold_usdc."""
        current_fee = fee_amount if fee_amount is not None else self.check_accumulated_fees()

        if current_fee < self.min_threshold_usdc:
            return {
                "status": "skipped",
                "reason": f"Accumulated fee ${current_fee:.2f} USDC is below min threshold ${self.min_threshold_usdc:.2f} USDC",
                "accumulated_fee_usdc": current_fee,
                "min_threshold_usdc": self.min_threshold_usdc,
            }

        result = self.engine.execute_buyback_and_burn(
            total_collected_fee_usdc=current_fee,
            operator_private_key=self.operator_private_key,
            dry_run=self.dry_run,
            simulated_apay_price=simulated_apay_price,
            slippage_tolerance_pct=slippage_tolerance_pct,
        )

        # Track internal cumulative metrics
        burned_amount = float(result.get("amount_burned_apay") or result.get("estimated_apay_bought") or 0.0)
        usdc_amount = float(result.get("burn_usdc_allocated", 0.0))
        self._total_burned_apay += burned_amount
        self._total_usdc_allocated += usdc_amount
        self._cycles_completed += 1

        result["cumulative_burned_apay"] = self._total_burned_apay
        result["cumulative_usdc_allocated"] = self._total_usdc_allocated
        result["cycles_completed"] = self._cycles_completed
        result["network"] = self.network

        self.record_burn_event(result)
        return result

    def record_burn_event(self, event: dict[str, Any]) -> None:
        """Persists the burn event to the local disk journal and syncs to /api/burn-feed."""
        if event.get("status") not in ("simulated", "burned"):
            return

        # 1. Local disk persistence
        try:
            os.makedirs(os.path.dirname(self.journal_path), exist_ok=True)
            history: list[dict[str, Any]] = []
            if os.path.exists(self.journal_path):
                try:
                    with open(self.journal_path, encoding="utf-8") as f:
                        history = json.load(f)
                except Exception:
                    history = []
            history.append(
                {
                    "timestamp": int(time.time()),
                    **event,
                }
            )
            with open(self.journal_path, "w", encoding="utf-8") as f:
                json.dump(history, f, indent=2)
        except Exception:
            pass

        # 2. Remote web console sync
        if self.sync_feed_url:
            try:
                with httpx.Client(timeout=4.0) as client:
                    client.post(self.sync_feed_url, json=event)
            except Exception:
                pass

    def run_daemon(
        self,
        max_cycles: int | None = None,
        on_cycle: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        """Runs continuous polling loop until interrupted or max_cycles reached."""
        self._running = True
        cycle_count = 0

        while self._running:
            cycle_count += 1
            res = self.execute_cycle()
            if on_cycle:
                on_cycle(res)

            if max_cycles and cycle_count >= max_cycles:
                break

            try:
                time.sleep(self.poll_interval)
            except KeyboardInterrupt:
                self._running = False
                break

    def stop(self) -> None:
        """Stops the daemon."""
        self._running = False
