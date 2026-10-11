"""Automated On-Chain Batch Settlement Relayer & High-Throughput Claims Journal.

Supports SQLite WAL indexed storage with asynchronous batch worker queues for millions
of claims per day, alongside real EVM raw transaction construction, multi-RPC failover,
and Merkle Tree / Cumulative State Channel net-settlement aggregation.
"""

from __future__ import annotations

import hashlib
import json
import os
import queue
import sqlite3
import threading
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import eth_abi
import httpx
from eth_account import Account
from eth_hash.auto import keccak

from .wallet import AgentWallet

# Deployed Base Sepolia Protocol Addresses
BASE_SEPOLIA_CHAIN_ID = 84532
BASE_SEPOLIA_RPC_LIST = [
    "https://sepolia.base.org",
    "https://base-sepolia-rpc.publicnode.com",
    "https://base-sepolia.gateway.tenderly.co",
]
DEFAULT_ROUTER_ADDRESS = "0x71434344beEF9C44fF3BC95572bEB7bFB8847ec6"
DEFAULT_ROUTER_V2_ADDRESS = "0x452eb7d4e7ccbf76ecf511829880b5fbcb24e854"
DEFAULT_APAY_TOKEN_ADDRESS = "0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3"
DEFAULT_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"


@dataclass
class ClaimRecord:
    id: str
    payer: str
    receiver: str
    amount_base_units: str
    price_usdc: float
    nonce: str
    signature: str
    timestamp: float
    network: str = "base"
    settled: bool = False
    tx_hash: str | None = None


class SqliteClaimJournal:
    """High-throughput SQLite-backed claims journal with Write-Ahead Logging (WAL)

    and background batch-buffering queue to eliminate disk write-lock contention.
    """

    def __init__(self, db_path: str | Path) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._init_db()

        # Asynchronous batch ingestion worker
        self._queue: queue.Queue[ClaimRecord] = queue.Queue()
        self._stop_event = threading.Event()
        self._writer_thread = threading.Thread(target=self._batch_worker, daemon=True)
        self._writer_thread.start()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=30.0)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._lock, self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS claims (
                    id TEXT PRIMARY KEY,
                    payer TEXT NOT NULL,
                    receiver TEXT NOT NULL,
                    amount_base_units TEXT NOT NULL,
                    price_usdc REAL NOT NULL,
                    nonce TEXT NOT NULL,
                    signature TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    network TEXT NOT NULL,
                    settled INTEGER NOT NULL DEFAULT 0,
                    tx_hash TEXT
                );
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_claims_settled ON claims(settled);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_claims_payer ON claims(payer);")
            conn.commit()

    def _batch_worker(self) -> None:
        """Background thread consuming queue items and inserting in bulk batches."""
        while not self._stop_event.is_set():
            batch: list[ClaimRecord] = []
            try:
                item = self._queue.get(timeout=0.05)
                batch.append(item)
                while len(batch) < 1000:
                    try:
                        batch.append(self._queue.get_nowait())
                    except queue.Empty:
                        break
            except queue.Empty:
                continue

            if batch:
                self._insert_batch(batch)
                for _ in batch:
                    self._queue.task_done()

    def _insert_batch(self, batch: list[ClaimRecord]) -> None:
        params = [
            (
                c.id,
                c.payer.lower(),
                c.receiver.lower(),
                c.amount_base_units,
                c.price_usdc,
                c.nonce,
                c.signature,
                c.timestamp,
                c.network,
                1 if c.settled else 0,
                c.tx_hash,
            )
            for c in batch
        ]
        with self._lock, self._get_connection() as conn:
            conn.executemany(
                """
                INSERT OR REPLACE INTO claims (
                    id, payer, receiver, amount_base_units, price_usdc,
                    nonce, signature, timestamp, network, settled, tx_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                params,
            )
            conn.commit()

    def record(self, claim: ClaimRecord, immediate: bool = False) -> None:
        """Enqueue claim for asynchronous batch insertion (sub-millisecond non-blocking)."""
        if immediate:
            self._insert_batch([claim])
        else:
            self._queue.put(claim)

    def flush(self) -> None:
        """Block until all queued claims have been committed to SQLite."""
        self._queue.join()

    def load_all(self) -> list[ClaimRecord]:
        self.flush()
        with self._lock, self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM claims ORDER BY timestamp ASC;")
            rows = cursor.fetchall()
            return [
                ClaimRecord(
                    id=row["id"],
                    payer=row["payer"],
                    receiver=row["receiver"],
                    amount_base_units=row["amount_base_units"],
                    price_usdc=row["price_usdc"],
                    nonce=row["nonce"],
                    signature=row["signature"],
                    timestamp=row["timestamp"],
                    network=row["network"],
                    settled=bool(row["settled"]),
                    tx_hash=row["tx_hash"],
                )
                for row in rows
            ]

    def get_unsettled(self) -> list[ClaimRecord]:
        self.flush()
        with self._lock, self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM claims WHERE settled = 0 ORDER BY timestamp ASC;")
            rows = cursor.fetchall()
            return [
                ClaimRecord(
                    id=row["id"],
                    payer=row["payer"],
                    receiver=row["receiver"],
                    amount_base_units=row["amount_base_units"],
                    price_usdc=row["price_usdc"],
                    nonce=row["nonce"],
                    signature=row["signature"],
                    timestamp=row["timestamp"],
                    network=row["network"],
                    settled=False,
                    tx_hash=row["tx_hash"],
                )
                for row in rows
            ]

    def mark_settled(self, claim_ids: set[str], tx_hash: str) -> None:
        if not claim_ids:
            return
        self.flush()
        placeholders = ",".join("?" for _ in claim_ids)
        with self._lock, self._get_connection() as conn:
            conn.execute(
                f"UPDATE claims SET settled = 1, tx_hash = ? WHERE id IN ({placeholders});",
                [tx_hash, *list(claim_ids)],
            )
            conn.commit()

    def clear(self) -> None:
        self.flush()
        with self._lock, self._get_connection() as conn:
            conn.execute("DELETE FROM claims;")
            conn.commit()

    def close(self) -> None:
        self._stop_event.set()
        if self._writer_thread.is_alive():
            self._writer_thread.join(timeout=1.0)


class ClaimJournal:
    """Universal claims ledger supporting both JSONL and SQLite backends."""

    def __init__(self, journal_path: str | Path | None = None) -> None:
        if journal_path is None:
            home_dir = Path.home()
            base_dir = home_dir / ".apay"
            base_dir.mkdir(parents=True, exist_ok=True)
            self.file_path = base_dir / "claims.db"
            self._backend: SqliteClaimJournal | None = SqliteClaimJournal(self.file_path)
            self._is_sqlite = True
        else:
            self.file_path = Path(journal_path)
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            if self.file_path.suffix.lower() in [".db", ".sqlite"]:
                self._backend = SqliteClaimJournal(self.file_path)
                self._is_sqlite = True
            else:
                self._backend = None
                self._is_sqlite = False

    def record(self, claim: ClaimRecord) -> None:
        if self._is_sqlite and self._backend:
            self._backend.record(claim)
            return

        with open(self.file_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(asdict(claim)) + "\n")

    def load_all(self) -> list[ClaimRecord]:
        if self._is_sqlite and self._backend:
            return self._backend.load_all()

        if not self.file_path.exists():
            return []
        records: list[ClaimRecord] = []
        with open(self.file_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    records.append(ClaimRecord(**data))
                except Exception:
                    continue
        return records

    def get_unsettled(self) -> list[ClaimRecord]:
        if self._is_sqlite and self._backend:
            return self._backend.get_unsettled()

        return [c for c in self.load_all() if not c.settled]

    def mark_settled(self, claim_ids: set[str], tx_hash: str) -> None:
        if self._is_sqlite and self._backend:
            self._backend.mark_settled(claim_ids, tx_hash)
            return

        all_claims = self.load_all()
        with open(self.file_path, "w", encoding="utf-8") as f:
            for c in all_claims:
                if c.id in claim_ids:
                    c.settled = True
                    c.tx_hash = tx_hash
                f.write(json.dumps(asdict(c)) + "\n")

    def clear(self) -> None:
        if self._is_sqlite and self._backend:
            self._backend.clear()
            return

        if self.file_path.exists():
            os.remove(self.file_path)


def compute_merkle_leaf(payer: str, receiver: str, amount_base_units: int, epoch_id: str) -> bytes:
    """Compute leaf hash matching APayRouterV2.sol: keccak256(abi.encodePacked(payer, receiver, amount, epochId))."""
    try:
        clean_p = payer.lower().replace("0x", "")
        p_bytes = bytes.fromhex(clean_p.rjust(40, "0")[:40])
    except Exception:
        p_bytes = hashlib.sha256(payer.encode("utf-8")).digest()[:20]

    try:
        clean_r = receiver.lower().replace("0x", "")
        r_bytes = bytes.fromhex(clean_r.rjust(40, "0")[:40])
    except Exception:
        r_bytes = hashlib.sha256(receiver.encode("utf-8")).digest()[:20]

    amount_bytes = int(amount_base_units).to_bytes(32, byteorder="big")
    epoch_bytes = epoch_id.encode("utf-8")
    return keccak(p_bytes + r_bytes + amount_bytes + epoch_bytes)


def hash_merkle_pair(a: bytes, b: bytes) -> bytes:
    """Commutative sorted sibling hash matching APayRouterV2.sol verifyMerkleProof."""
    return keccak(a + b) if a <= b else keccak(b + a)


def build_merkle_tree_and_proofs(leaves: list[bytes]) -> tuple[bytes, list[list[str]]]:
    """Builds a binary Merkle tree and extracts sorted sibling proof arrays for each leaf."""
    if not leaves:
        return b"\x00" * 32, []
    if len(leaves) == 1:
        return leaves[0], [[]]

    proofs: list[list[str]] = [[] for _ in leaves]
    current = list(leaves)
    indices = list(range(len(leaves)))

    while len(current) > 1:
        next_level: list[bytes] = []
        for i in range(0, len(current), 2):
            left = current[i]
            right = current[i + 1] if i + 1 < len(current) else left
            next_level.append(hash_merkle_pair(left, right))
            for leaf_idx, pos in enumerate(indices):
                if pos == i:
                    proofs[leaf_idx].append("0x" + right.hex())
                elif pos == i + 1:
                    proofs[leaf_idx].append("0x" + left.hex())
        indices = [p // 2 for p in indices]
        current = next_level

    return current[0], proofs


class SettlementRelayer:
    """Batches offline-verified payment claims and dispatches on-chain settlement

    via real Base L2 JSON-RPC broadcasts with automated endpoint failover.
    """

    def __init__(
        self,
        journal: ClaimJournal | None = None,
        rpc_urls: list[str] | str | None = None,
        router_address: str = DEFAULT_ROUTER_ADDRESS,
        router_v2_address: str = DEFAULT_ROUTER_V2_ADDRESS,
        token_address: str = DEFAULT_USDC_ADDRESS,
        apay_token_address: str = DEFAULT_APAY_TOKEN_ADDRESS,
        chain_id: int = BASE_SEPOLIA_CHAIN_ID,
    ) -> None:
        self.journal = journal or ClaimJournal()
        if rpc_urls is None:
            self.rpc_urls = list(BASE_SEPOLIA_RPC_LIST)
        elif isinstance(rpc_urls, str):
            self.rpc_urls = [rpc_urls]
        else:
            self.rpc_urls = list(rpc_urls)
        self.router_address = router_address.lower()
        self.router_v2_address = router_v2_address.lower()
        self.token_address = token_address.lower()
        self.apay_token_address = apay_token_address.lower()
        self.chain_id = chain_id

    @property
    def rpc_url(self) -> str:
        return self.rpc_urls[0]

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

    def compute_net_merkle_batch(
        self,
        claims: list[ClaimRecord] | None = None,
        epoch_id: str | None = None,
    ) -> dict[str, Any]:
        """Compresses thousands of micro-claims into Net Bilateral Balances with an on-chain verifiable Merkle Root.

        Solves the blockchain TPS bottleneck by aggregating all interactions between
        unique (payer, receiver) pairs into a single net settlement transfer with
        sorted sibling Merkle proofs verified on APayRouterV2.
        """
        target_claims = claims if claims is not None else self.journal.get_unsettled()
        if not target_claims:
            return {
                "claims_count": 0,
                "net_pairs_count": 0,
                "merkle_root": "0x0000000000000000000000000000000000000000000000000000000000000000",
                "net_settlements": [],
                "compression_ratio": "0.0%",
            }

        pairs: dict[tuple[str, str], int] = {}
        for c in target_claims:
            key = (c.payer.lower(), c.receiver.lower())
            pairs[key] = pairs.get(key, 0) + int(c.amount_base_units)

        resolved_epoch = epoch_id or f"epoch_{int(target_claims[0].timestamp)}"

        leaves_bytes: list[bytes] = []
        settlements_meta: list[dict[str, Any]] = []

        for (payer, receiver), total_units in pairs.items():
            leaf = compute_merkle_leaf(payer, receiver, total_units, resolved_epoch)
            leaves_bytes.append(leaf)
            settlements_meta.append(
                {
                    "payer": payer,
                    "receiver": receiver,
                    "amount_base_units": str(total_units),
                    "net_usdc": total_units / 1_000_000.0,
                    "leaf_hash": "0x" + leaf.hex(),
                }
            )

        merkle_root_bytes, proofs = build_merkle_tree_and_proofs(leaves_bytes)
        merkle_root = "0x" + merkle_root_bytes.hex()

        net_settlements: list[dict[str, Any]] = []
        for meta, proof in zip(settlements_meta, proofs, strict=True):
            item = dict(meta)
            item["merkle_proof"] = proof
            net_settlements.append(item)

        claims_count = len(target_claims)
        pairs_count = len(pairs)
        saved = claims_count - pairs_count
        ratio = (saved / claims_count) * 100.0 if claims_count > 0 else 0.0

        return {
            "claims_count": claims_count,
            "net_pairs_count": pairs_count,
            "merkle_root": merkle_root,
            "epoch_id": resolved_epoch,
            "net_settlements": net_settlements,
            "compression_ratio": f"{ratio:.1f}%",
        }

    def simulate_batch(self, claims: list[ClaimRecord] | None = None) -> dict[str, Any]:
        """Calculate volume, 1.0% protocol fee, and net merchant proceeds without broadcasting."""
        target_claims = claims if claims is not None else self.journal.get_unsettled()

        total_base_units = sum(int(c.amount_base_units) for c in target_claims)
        gross_usdc = total_base_units / 1_000_000.0
        fee_bps = 100  # 1.0%
        protocol_fee_usdc = gross_usdc * (fee_bps / 10000.0)
        net_merchant_usdc = gross_usdc - protocol_fee_usdc

        return {
            "claims_count": len(target_claims),
            "gross_volume_usdc": gross_usdc,
            "protocol_fee_usdc": protocol_fee_usdc,
            "fee_percentage": "1.0%",
            "net_merchant_usdc": net_merchant_usdc,
            "settlement_rail": f"Base Sepolia (Chain ID {self.chain_id})",
            "router_contract": self.router_address,
            "token_contract": self.token_address,
            "claims_ids": [c.id for c in target_claims],
        }

    def execute_settle(
        self,
        private_key: str,
        claims: list[ClaimRecord] | None = None,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        """Execute settlement on Base Sepolia.

        If dry_run is True, returns simulation metrics without broadcasting.
        """
        target_claims = claims if claims is not None else self.journal.get_unsettled()
        if not target_claims:
            return {"status": "no_claims", "message": "No unsettled claims to process."}

        simulation = self.simulate_batch(target_claims)
        if dry_run:
            simulation["status"] = "simulated"
            simulation["dry_run"] = True
            return simulation

        # Live execution mode
        wallet = AgentWallet(private_key=private_key)

        def _to_sig_bytes(s: str) -> bytes:
            clean = s.replace("0x", "")
            try:
                if len(clean) % 2 == 1:
                    clean = "0" + clean
                raw = bytes.fromhex(clean)
                if len(raw) == 65:
                    return raw
                return raw.ljust(65, b"\x00")[:65]
            except Exception:
                return hashlib.sha256(s.encode("utf-8")).digest() + b"\x00" * 33

        payers = [c.payer for c in target_claims]
        receivers = [c.receiver for c in target_claims]
        amounts = [int(c.amount_base_units) for c in target_claims]
        nonces = [c.nonce for c in target_claims]
        signatures = [_to_sig_bytes(c.signature) for c in target_claims]

        try:
            tx_hash = self._broadcast_raw_batch_settle(
                wallet=wallet,
                token=self.token_address,
                payers=payers,
                receivers=receivers,
                amounts=amounts,
                nonces=nonces,
                signatures=signatures,
                dry_run=dry_run,
            )
            settled_ids = {c.id for c in target_claims}
            self.journal.mark_settled(settled_ids, tx_hash)

            return {
                "status": "settled",
                "tx_hash": tx_hash,
                "explorer_url": f"https://sepolia.basescan.org/tx/{tx_hash}",
                "settled_claims_count": len(target_claims),
                "gross_usdc": simulation["gross_volume_usdc"],
                "net_merchant_usdc": simulation["net_merchant_usdc"],
                "method": "batchSettle" if len(target_claims) > 1 else "settle",
                "v2_method": "batchSettleWithSignatures" if len(target_claims) > 1 else "settleWithSignature",
            }
        except Exception as err:
            return {
                "status": "broadcast_failed",
                "error": str(err),
                "tx_hash": None,
                "settled_claims_count": 0,
            }

    def execute_batch_settle(
        self,
        private_key: str,
        claims: list[ClaimRecord] | None = None,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        return self.execute_settle(private_key=private_key, claims=claims, dry_run=dry_run)

    def _broadcast_raw_batch_settle(
        self,
        wallet: AgentWallet,
        token: str,
        payers: list[str],
        receivers: list[str],
        amounts: list[int],
        nonces: list[str],
        signatures: list[bytes],
        dry_run: bool = False,
    ) -> str:
        """Construct, sign, and broadcast an EIP-1559/legacy transaction via raw JSON-RPC."""
        if dry_run:
            return "0x" + hashlib.sha256(f"sim:{wallet.address}:{time.time()}".encode()).hexdigest()

        try:
            # 1. Fetch current on-chain nonce and gas price
            nonce_hex = self._call_rpc("eth_getTransactionCount", [wallet.address, "pending"])
            nonce = int(nonce_hex, 16)

            gas_price_hex = self._call_rpc("eth_gasPrice", [])
            gas_price = int(gas_price_hex, 16)

            # 2. ABI encode calldata
            # batchSettleWithSignatures(address,address[],address[],uint256[],string[],bytes[])
            fn_sig = b"batchSettleWithSignatures(address,address[],address[],uint256[],string[],bytes[])"
            selector = keccak(fn_sig)[:4]

            encoded_args = eth_abi.encode(
                ["address", "address[]", "address[]", "uint256[]", "string[]", "bytes[]"],
                [token, payers, receivers, amounts, nonces, signatures],
            )
            calldata = "0x" + (selector + encoded_args).hex()

            gas_limit = 200_000 + (65_000 * len(payers))

            tx = {
                "to": self.router_address,
                "value": 0,
                "gas": gas_limit,
                "gasPrice": gas_price,
                "nonce": nonce,
                "chainId": self.chain_id,
                "data": calldata,
            }

            signed_tx = Account.sign_transaction(tx, wallet.private_key)
            raw_tx_hex = "0x" + signed_tx.raw_transaction.hex()

            tx_hash = self._call_rpc("eth_sendRawTransaction", [raw_tx_hex])
            return str(tx_hash)

        except Exception as err:
            raise RuntimeError(f"On-chain batch settlement broadcast failed: {err!s}") from err

    def close_cumulative_channel_onchain(
        self,
        operator_private_key: str,
        token: str,
        channel_id: str,
        payer: str,
        receiver: str,
        cumulative_amount: int,
        sequence: int,
        signature: str,
        dry_run: bool = False,
    ) -> str:
        """Broadcasts single closing transaction to APayRouterV2 for a state channel."""
        wallet = AgentWallet(private_key=operator_private_key)
        if dry_run:
            return "0x" + hashlib.sha256(f"chan_close:{channel_id}:{sequence}".encode()).hexdigest()

        try:
            nonce_hex = self._call_rpc("eth_getTransactionCount", [wallet.address, "pending"])
            nonce = int(nonce_hex, 16)
            gas_price_hex = self._call_rpc("eth_gasPrice", [])
            gas_price = int(gas_price_hex, 16)

            fn_sig = b"closeCumulativeChannel(address,bytes32,address,address,uint256,uint256,bytes)"
            selector = keccak(fn_sig)[:4]

            chan_bytes = bytes.fromhex(channel_id.replace("0x", ""))
            sig_bytes = bytes.fromhex(signature.replace("0x", ""))

            encoded_args = eth_abi.encode(
                ["address", "bytes32", "address", "address", "uint256", "uint256", "bytes"],
                [token, chan_bytes, payer, receiver, cumulative_amount, sequence, sig_bytes],
            )
            calldata = "0x" + (selector + encoded_args).hex()

            tx = {
                "to": self.router_v2_address,
                "value": 0,
                "gas": 250_000,
                "gasPrice": gas_price,
                "nonce": nonce,
                "chainId": self.chain_id,
                "data": calldata,
            }
            signed_tx = Account.sign_transaction(tx, wallet.private_key)
            raw_tx_hex = "0x" + signed_tx.raw_transaction.hex()

            tx_hash = self._call_rpc("eth_sendRawTransaction", [raw_tx_hex])
            return str(tx_hash)
        except Exception as err:
            raise RuntimeError(f"Close cumulative channel on-chain broadcast failed: {err!s}") from err

    def commit_epoch_merkle_root_onchain(
        self,
        operator_private_key: str,
        epoch_id: str,
        merkle_root: str,
        total_claims: int,
        dry_run: bool = False,
    ) -> str:
        """Broadcasts commitEpochMerkleRoot(string,bytes32,uint256) to APayRouterV2."""
        wallet = AgentWallet(private_key=operator_private_key)
        if dry_run:
            return "0x" + hashlib.sha256(f"epoch_commit:{epoch_id}:{merkle_root}".encode()).hexdigest()

        try:
            nonce_hex = self._call_rpc("eth_getTransactionCount", [wallet.address, "pending"])
            nonce = int(nonce_hex, 16)
            gas_price_hex = self._call_rpc("eth_gasPrice", [])
            gas_price = int(gas_price_hex, 16)

            fn_sig = b"commitEpochMerkleRoot(string,bytes32,uint256)"
            selector = keccak(fn_sig)[:4]

            clean_root = merkle_root.replace("0x", "")
            root_bytes = bytes.fromhex(clean_root.rjust(64, "0")[:64])
            encoded_args = eth_abi.encode(
                ["string", "bytes32", "uint256"],
                [epoch_id, root_bytes, total_claims],
            )
            calldata = "0x" + (selector + encoded_args).hex()

            tx = {
                "to": self.router_v2_address,
                "value": 0,
                "gas": 150_000,
                "gasPrice": gas_price,
                "nonce": nonce,
                "chainId": self.chain_id,
                "data": calldata,
            }
            signed_tx = Account.sign_transaction(tx, wallet.private_key)
            raw_tx_hex = "0x" + signed_tx.raw_transaction.hex()

            tx_hash = self._call_rpc("eth_sendRawTransaction", [raw_tx_hex])
            return str(tx_hash)
        except Exception as err:
            raise RuntimeError(f"Commit epoch Merkle root on-chain broadcast failed: {err!s}") from err

    def settle_merkle_claim_onchain(
        self,
        operator_private_key: str,
        epoch_id: str,
        token: str,
        payer: str,
        receiver: str,
        amount: int,
        merkle_proof: list[str],
        dry_run: bool = False,
    ) -> str:
        """Broadcasts settleMerkleClaim(string,address,address,address,uint256,bytes32[]) to APayRouterV2."""
        wallet = AgentWallet(private_key=operator_private_key)
        if dry_run:
            return (
                "0x"
                + hashlib.sha256(f"merkle_claim:{epoch_id}:{payer}:{receiver}:{amount}".encode()).hexdigest()
            )

        try:
            nonce_hex = self._call_rpc("eth_getTransactionCount", [wallet.address, "pending"])
            nonce = int(nonce_hex, 16)
            gas_price_hex = self._call_rpc("eth_gasPrice", [])
            gas_price = int(gas_price_hex, 16)

            fn_sig = b"settleMerkleClaim(string,address,address,address,uint256,bytes32[])"
            selector = keccak(fn_sig)[:4]

            proof_bytes = [bytes.fromhex(p.replace("0x", "").rjust(64, "0")[:64]) for p in merkle_proof]
            encoded_args = eth_abi.encode(
                ["string", "address", "address", "address", "uint256", "bytes32[]"],
                [epoch_id, token, payer, receiver, amount, proof_bytes],
            )
            calldata = "0x" + (selector + encoded_args).hex()

            tx = {
                "to": self.router_v2_address,
                "value": 0,
                "gas": 250_000,
                "gasPrice": gas_price,
                "nonce": nonce,
                "chainId": self.chain_id,
                "data": calldata,
            }
            signed_tx = Account.sign_transaction(tx, wallet.private_key)
            raw_tx_hex = "0x" + signed_tx.raw_transaction.hex()

            tx_hash = self._call_rpc("eth_sendRawTransaction", [raw_tx_hex])
            return str(tx_hash)
        except Exception as err:
            raise RuntimeError(f"Settle Merkle claim on-chain broadcast failed: {err!s}") from err

    def batch_settle_merkle_claims_onchain(
        self,
        operator_private_key: str,
        epoch_id: str,
        token: str,
        claims: list[dict[str, Any]],
        dry_run: bool = False,
    ) -> str:
        """Broadcasts batchSettleMerkleClaims(string,address,(address,address,uint256,bytes32[])[]) to APayRouterV2."""
        wallet = AgentWallet(private_key=operator_private_key)
        if dry_run:
            return "0x" + hashlib.sha256(f"batch_merkle:{epoch_id}:{len(claims)}".encode()).hexdigest()

        try:
            nonce_hex = self._call_rpc("eth_getTransactionCount", [wallet.address, "pending"])
            nonce = int(nonce_hex, 16)
            gas_price_hex = self._call_rpc("eth_gasPrice", [])
            gas_price = int(gas_price_hex, 16)

            fn_sig = b"batchSettleMerkleClaims(string,address,(address,address,uint256,bytes32[])[])"
            selector = keccak(fn_sig)[:4]

            formatted_claims = [
                (
                    c["payer"],
                    c["receiver"],
                    int(c["amount_base_units"]),
                    [bytes.fromhex(p.replace("0x", "").rjust(64, "0")[:64]) for p in c["merkle_proof"]],
                )
                for c in claims
            ]

            encoded_args = eth_abi.encode(
                ["string", "address", "(address,address,uint256,bytes32[])[]"],
                [epoch_id, token, formatted_claims],
            )
            calldata = "0x" + (selector + encoded_args).hex()

            gas_limit = 200_000 + (70_000 * len(claims))
            tx = {
                "to": self.router_v2_address,
                "value": 0,
                "gas": gas_limit,
                "gasPrice": gas_price,
                "nonce": nonce,
                "chainId": self.chain_id,
                "data": calldata,
            }
            signed_tx = Account.sign_transaction(tx, wallet.private_key)
            raw_tx_hex = "0x" + signed_tx.raw_transaction.hex()

            tx_hash = self._call_rpc("eth_sendRawTransaction", [raw_tx_hex])
            return str(tx_hash)
        except Exception as err:
            raise RuntimeError(f"Batch settle Merkle claims on-chain broadcast failed: {err!s}") from err
