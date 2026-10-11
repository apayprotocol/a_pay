"""1-RTT Streaming Session Token Engine.

Eliminates the double round-trip (2 RTT) latency overhead for high-frequency AI agents.
Allows agents to authorize a session budget once and execute thousands of subsequent
API calls with single-flight (<10ms) authorization tokens.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from dataclasses import dataclass
from typing import Any


@dataclass
class SessionRecord:
    session_id: str
    payer: str
    receiver: str
    allocated_base_units: int
    remaining_base_units: int
    price_per_call_units: int
    expires_at: float
    created_at: float
    active: bool = True


class SessionManager:
    """Manages ephemeral high-throughput streaming payment sessions.

    Tokens are compact, cryptographically signed vouchers:
    `token = base64(json_payload) + '.' + hmac_sha256(json_payload, secret)`
    """

    def __init__(self, secret_key: str | None = None, default_ttl_seconds: float = 3600.0) -> None:
        self.secret_key = secret_key or secrets.token_hex(32)
        self.default_ttl = default_ttl_seconds
        # session_id -> SessionRecord
        self._sessions: dict[str, SessionRecord] = {}

    def create_session(
        self,
        payer: str,
        receiver: str,
        allocated_base_units: int,
        price_per_call_units: int,
        ttl_seconds: float | None = None,
    ) -> tuple[str, SessionRecord]:
        """Create a new streaming session and return the bearer token and record."""
        session_id = f"sess_{secrets.token_hex(16)}"
        ttl = ttl_seconds or self.default_ttl
        now = time.time()
        record = SessionRecord(
            session_id=session_id,
            payer=payer.lower(),
            receiver=receiver.lower(),
            allocated_base_units=allocated_base_units,
            remaining_base_units=allocated_base_units,
            price_per_call_units=price_per_call_units,
            expires_at=now + ttl,
            created_at=now,
            active=True,
        )
        self._sessions[session_id] = record

        # Generate signed bearer token
        token_payload = {
            "sid": session_id,
            "pyr": payer.lower(),
            "rcv": receiver.lower(),
            "exp": int(record.expires_at),
        }
        token = self._sign_token(token_payload)
        return token, record

    def _sign_token(self, payload: dict[str, Any]) -> str:
        body = (
            base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
            .decode("utf-8")
            .rstrip("=")
        )
        sig = hmac.new(self.secret_key.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()
        return f"{body}.{sig}"

    def verify_and_consume(
        self,
        token: str,
        call_cost_units: int | None = None,
    ) -> tuple[bool, str | None, SessionRecord | None]:
        """Verify session token and decrement the allocated budget in sub-millisecond time.

        Returns:
            (True, None, record) if valid and budget was successfully decremented.
            (False, "Reason", None) if invalid, expired, or out of budget.
        """
        try:
            parts = token.split(".")
            if len(parts) != 2:
                return False, "Malformed session token format", None
            body_b64, provided_sig = parts[0], parts[1]

            # Verify HMAC
            expected_sig = hmac.new(
                self.secret_key.encode("utf-8"), body_b64.encode("utf-8"), hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(expected_sig, provided_sig):
                return False, "Invalid cryptographic session signature", None

            # Add padding back if necessary
            padding = "=" * (-len(body_b64) % 4)
            payload = json.loads(base64.urlsafe_b64decode(body_b64 + padding).decode("utf-8"))

            session_id = payload.get("sid")
            record = self._sessions.get(session_id)
            if not record or not record.active:
                return False, f"Session {session_id} not found or deactivated", None

            now = time.time()
            if now > record.expires_at:
                record.active = False
                return False, f"Session {session_id} expired", None

            cost = call_cost_units if call_cost_units is not None else record.price_per_call_units
            if record.remaining_base_units < cost:
                return (
                    False,
                    f"Session budget exhausted ({record.remaining_base_units} units remaining, required {cost})",
                    None,
                )

            # Decrement balance
            record.remaining_base_units -= cost
            return True, None, record

        except Exception as e:
            return False, f"Session validation error: {e!s}", None

    def get_session(self, session_id: str) -> SessionRecord | None:
        return self._sessions.get(session_id)

    def close_session(self, session_id: str) -> bool:
        record = self._sessions.get(session_id)
        if record:
            record.active = False
            return True
        return False


class StatelessSessionManager:
    """Zero-database, cryptographically verifiable 1-RTT streaming session engine.

    Enables high-frequency distributed AI agents to make sub-millisecond API calls across
    unlimited load-balanced edge proxies. Vouchers contain tamper-proof HMAC signatures
    with embedded spending limits, client public key, and expiration.
    """

    def __init__(self, secret_key: str | None = None, default_ttl_seconds: float = 3600.0) -> None:
        self.secret_key = secret_key or secrets.token_hex(32)
        self.default_ttl = default_ttl_seconds

    def issue_token(
        self,
        payer: str,
        receiver: str,
        max_total_base_units: int,
        max_per_call_units: int,
        ttl_seconds: float | None = None,
    ) -> str:
        session_id = f"stless_{secrets.token_hex(12)}"
        now = time.time()
        ttl = ttl_seconds or self.default_ttl
        payload = {
            "sid": session_id,
            "pyr": payer.lower(),
            "rcv": receiver.lower(),
            "tot": int(max_total_base_units),
            "mpc": int(max_per_call_units),
            "exp": int(now + ttl),
            "iat": int(now),
        }
        body = (
            base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
            .decode("utf-8")
            .rstrip("=")
        )
        sig = hmac.new(self.secret_key.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()
        return f"{body}.{sig}"

    def verify_token(
        self,
        token: str,
        call_cost_units: int,
        expected_receiver: str | None = None,
    ) -> tuple[bool, str | None, dict[str, Any] | None]:
        try:
            parts = token.split(".")
            if len(parts) != 2:
                return False, "Malformed stateless token format", None
            body_b64, provided_sig = parts[0], parts[1]

            expected_sig = hmac.new(
                self.secret_key.encode("utf-8"), body_b64.encode("utf-8"), hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(expected_sig, provided_sig):
                return False, "Invalid cryptographic voucher signature", None

            padding = "=" * (-len(body_b64) % 4)
            payload = json.loads(base64.urlsafe_b64decode(body_b64 + padding).decode("utf-8"))

            now = time.time()
            if now > payload.get("exp", 0):
                return False, "Stateless token expired", None

            if expected_receiver and payload.get("rcv") != expected_receiver.lower():
                return False, f"Receiver mismatch: token issued for {payload.get('rcv')}", None

            max_per_call = payload.get("mpc", 0)
            if call_cost_units > max_per_call:
                return False, f"Call cost {call_cost_units} exceeds voucher max per call {max_per_call}", None

            return True, None, payload
        except Exception as e:
            return False, f"Stateless verification error: {e!s}", None
