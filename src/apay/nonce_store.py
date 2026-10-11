"""High-throughput Replay Defense Nonce Stores.

Provides O(1) amortized sliding-window in-memory nonce cache and
production-grade Redis cluster backend for distributed multi-instance scaling.
"""

from __future__ import annotations

import collections
import threading
import time
from abc import ABC, abstractmethod
from typing import Any


class BaseNonceStore(ABC):
    """Abstract interface for replay prevention nonce stores."""

    @abstractmethod
    def contains(self, nonce: str) -> bool:
        """Check if nonce has already been consumed."""
        pass

    @abstractmethod
    def add(self, nonce: str) -> None:
        """Mark a nonce as consumed with default TTL."""
        pass

    @abstractmethod
    def consume(self, nonce: str) -> bool:
        """Atomically check and consume a nonce.

        Returns:
            True if nonce was fresh and successfully consumed.
            False if nonce was already consumed (replay attack detected).
        """
        pass


class SlidingWindowNonceStore(BaseNonceStore):
    """Thread-safe, O(1) amortized sliding-window in-memory nonce store.

    Uses a chronologically ordered double-ended queue (deque) alongside a dictionary
    to achieve O(1) amortized eviction without iterating over all keys.
    Enforces a strict max_entries cap to prevent OOM under extreme traffic surges.
    """

    def __init__(self, ttl_seconds: float = 60.0, max_entries: int = 500_000) -> None:
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        self._cache: dict[str, float] = {}
        self._queue: collections.deque[tuple[float, str]] = collections.deque()
        self._lock = threading.Lock()

    def _purge_expired(self, now: float) -> None:
        """Purge expired nonces from the head of the deque in O(1) amortized time."""
        while self._queue:
            exp_time, old_nonce = self._queue[0]
            if exp_time < now:
                self._queue.popleft()
                # Remove from dict only if the timestamp matches
                if self._cache.get(old_nonce) == exp_time:
                    del self._cache[old_nonce]
            else:
                break

    def contains(self, nonce: str) -> bool:
        with self._lock:
            now = time.time()
            self._purge_expired(now)
            exp = self._cache.get(nonce)
            if exp is None:
                return False
            if exp < now:
                del self._cache[nonce]
                return False
            return True

    def add(self, nonce: str) -> None:
        with self._lock:
            now = time.time()
            self._purge_expired(now)
            exp_time = now + self.ttl_seconds
            # Evict oldest if max_entries reached
            if len(self._cache) >= self.max_entries and self._queue:
                _, old_nonce = self._queue.popleft()
                self._cache.pop(old_nonce, None)

            self._cache[nonce] = exp_time
            self._queue.append((exp_time, nonce))

    def consume(self, nonce: str) -> bool:
        """Atomically checks and consumes a nonce in a single locked operation."""
        with self._lock:
            now = time.time()
            self._purge_expired(now)

            exp = self._cache.get(nonce)
            if exp is not None and exp >= now:
                return False  # Replay attack detected!

            # Enforce max limit to protect process RAM
            if len(self._cache) >= self.max_entries and self._queue:
                _, old_nonce = self._queue.popleft()
                self._cache.pop(old_nonce, None)

            exp_time = now + self.ttl_seconds
            self._cache[nonce] = exp_time
            self._queue.append((exp_time, nonce))
            return True

    def __len__(self) -> int:
        with self._lock:
            return len(self._cache)

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()
            self._queue.clear()


class RedisNonceStore(BaseNonceStore):
    """Distributed Redis cluster nonce store for horizontal multi-instance scaling.

    Uses atomic Redis `SET key 1 EX ttl NX` command for sub-millisecond (<1ms)
    check-and-set across distributed load-balanced proxy fleets.
    Includes automated fallback to in-memory SlidingWindowNonceStore to guarantee
    zero downtime during network partitions or Redis maintenance.
    """

    def __init__(
        self,
        redis_client: Any = None,
        ttl_seconds: int = 60,
        prefix: str = "apay:nonce:",
        fallback_on_error: bool = True,
    ) -> None:
        self.redis = redis_client
        self.ttl_seconds = int(ttl_seconds)
        self.prefix = prefix
        self.fallback_on_error = fallback_on_error
        self.fallback_store = SlidingWindowNonceStore(ttl_seconds=float(ttl_seconds))

    def _key(self, nonce: str) -> str:
        return f"{self.prefix}{nonce}"

    def contains(self, nonce: str) -> bool:
        if self.redis is None:
            return self.fallback_store.contains(nonce)
        try:
            return bool(self.redis.exists(self._key(nonce)))
        except Exception:
            if self.fallback_on_error:
                return self.fallback_store.contains(nonce)
            return False

    def add(self, nonce: str) -> None:
        if self.redis is None:
            self.fallback_store.add(nonce)
            return
        try:
            self.redis.set(self._key(nonce), "1", ex=self.ttl_seconds)
        except Exception:
            if self.fallback_on_error:
                self.fallback_store.add(nonce)

    def consume(self, nonce: str) -> bool:
        """Atomic SET with EXPIRE and NOT-EXISTS flag.

        Returns True if key was set (fresh nonce), False if key already existed.
        Falls back seamlessly to local sliding-window cache if Redis is unavailable.
        """
        if self.redis is None:
            return self.fallback_store.consume(nonce)
        try:
            res = self.redis.set(self._key(nonce), "1", ex=self.ttl_seconds, nx=True)
            # redis.set with nx=True returns True if set, None/False if existed
            return bool(res)
        except Exception:
            if self.fallback_on_error:
                return self.fallback_store.consume(nonce)
            return False
