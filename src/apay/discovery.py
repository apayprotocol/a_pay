"""
Service Discovery Client for Autonomous AI Agents.
Enables agents to query active paid APIs on the A-Pay network.
"""

from __future__ import annotations

from typing import Any

import httpx

DEFAULT_REGISTRY_URL = "https://apay-network.vercel.app/api/registry"


def discover_services(
    registry_url: str = DEFAULT_REGISTRY_URL,
    timeout: float = 5.0,
) -> list[dict[str, Any]]:
    """Discover active public paid APIs on the A-Pay Protocol network."""
    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.get(f"{registry_url}?public=true")
            if resp.status_code == 200:
                data = resp.json()
                return list(data.get("services", []))
    except Exception:
        pass
    return []
