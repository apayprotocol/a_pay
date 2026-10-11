"""Unit & Integration Tests for A-Pay AI Agent Framework Integrations.

Tests LangChain, CrewAI, AutoGen, and LlamaIndex tool wrappers and guardrails.
"""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

from apay.integrations.autogen import APayAutoGenToolkit, create_autogen_payment_tool
from apay.integrations.crewai import (
    APayCrewTool,
    create_apay_crew_tool,
    create_crew_economy_toolkit,
    create_crew_tool,
)
from apay.integrations.langchain import APayRequestsWrapper, APayTool, create_apay_tool
from apay.integrations.llamaindex import APayLlamaIndexTool, create_llamaindex_tool
from apay.integrations.openai import (
    APayOpenAITool,
    create_openai_tool,
    create_swarm_tool,
    handle_openai_tool_call,
)
from apay.wallet import AgentWallet


def test_langchain_tool_creation_and_status() -> None:
    wallet = AgentWallet.create(max_per_call_usdc=0.05, daily_budget_usdc=1.0)
    tool = create_apay_tool(
        name="test_tool",
        description="A test tool",
        target_url="https://api.test/intel",
        wallet=wallet,
        currency="USDC",
    )

    assert isinstance(tool, APayTool)
    assert tool.name == "test_tool"
    assert tool.target_url == "https://api.test/intel"
    assert tool.currency == "USDC"

    status = tool.get_wallet_status()
    assert status["address"] == wallet.address
    assert status["spent_usdc"] == 0.0
    assert status["remaining_usdc"] == 1.0


def test_langchain_tool_run_mocked() -> None:
    wallet = AgentWallet.create(max_per_call_usdc=0.05, daily_budget_usdc=1.0)
    tool = create_apay_tool(
        name="test_tool",
        description="A test tool",
        target_url="https://api.test/data",
        wallet=wallet,
    )

    mock_resp = MagicMock()
    mock_resp.text = '{"success": true, "data": "alpha"}'
    mock_resp.status_code = 200

    with patch("apay.integrations.langchain.APaySession") as mock_session_cls:
        instance = mock_session_cls.return_value
        instance.get.return_value = mock_resp

        result = tool.run({"query": "crypto"})
        assert "alpha" in result
        assert instance.get.called


def test_langchain_requests_wrapper() -> None:
    wallet = AgentWallet.create(max_per_call_usdc=0.05, daily_budget_usdc=1.0)
    wrapper = APayRequestsWrapper(wallet=wallet)

    mock_resp = MagicMock()
    mock_resp.text = "OK"

    with patch.object(wrapper.session, "get", return_value=mock_resp):
        out = wrapper.get("https://api.test/info")
        assert out == "OK"

    with patch.object(wrapper.session, "post", return_value=mock_resp):
        out = wrapper.post("https://api.test/info", json={"key": "val"})
        assert out == "OK"

    wrapper.close()


def test_crewai_tool_creation_and_toolkit() -> None:
    wallet = AgentWallet.create(max_per_call_usdc=0.02, daily_budget_usdc=0.50)
    tool = create_crew_tool(
        name="crew_tool",
        description="Crew tool desc",
        target_url="https://crew.test/api",
        wallet=wallet,
        currency="APAY",
    )

    assert isinstance(tool, APayCrewTool)
    assert tool.currency == "APAY"

    status = tool.get_wallet_status()
    assert status["address"] == wallet.address
    assert status["remaining_usdc"] == 0.50

    toolkit = create_crew_economy_toolkit(
        wallet=wallet,
        endpoints={
            "tool_a": {"url": "https://a.test", "description": "Desc A"},
            "tool_b": {"url": "https://b.test", "method": "POST"},
        },
        currency="USDC",
    )
    assert len(toolkit) == 2
    assert toolkit[0].name == "tool_a"
    assert toolkit[1].name == "tool_b"
    assert toolkit[1].method == "POST"


def test_autogen_toolkit_and_function_generation() -> None:
    wallet = AgentWallet.create(max_per_call_usdc=0.01, daily_budget_usdc=0.10)
    toolkit = APayAutoGenToolkit(wallet=wallet, currency="USDC")

    mock_resp = MagicMock()
    mock_resp.text = json.dumps({"computed": 42})

    with patch("apay.integrations.autogen.APaySession") as mock_session_cls:
        instance = mock_session_cls.return_value
        instance.get.return_value = mock_resp

        fn = toolkit.create_paid_query_function(target_url="https://compute.test/job")
        res = fn("run computation")
        assert "42" in res

    # Test registration mock
    mock_assistant = MagicMock()
    mock_user_proxy = MagicMock()
    toolkit.register(
        assistant=mock_assistant,
        user_proxy=mock_user_proxy,
        target_url="https://compute.test/job",
        name="compute_job",
    )
    assert mock_assistant.register_for_llm.called
    assert mock_user_proxy.register_for_execution.called

    # Test standalone helper
    fn2 = create_autogen_payment_tool("https://test.com", wallet=wallet)
    assert callable(fn2)


def test_llamaindex_tool_creation() -> None:
    wallet = AgentWallet.create(max_per_call_usdc=0.05, daily_budget_usdc=1.0)
    tool = APayLlamaIndexTool(
        target_url="https://vector.test/search",
        wallet=wallet,
        name="rag_search",
        description="RAG Search over paid index",
    )

    mock_resp = MagicMock()
    mock_resp.text = "Node 1 result"

    with patch("apay.integrations.llamaindex.APaySession") as mock_session_cls:
        instance = mock_session_cls.return_value
        instance.get.return_value = mock_resp

        res = tool.query("vector search query")
        assert res == "Node 1 result"

    # Helper function test
    t2 = create_llamaindex_tool("https://vector.test/search", wallet=wallet)
    assert t2 is not None


def test_openai_tool_creation_and_execution() -> None:
    wallet = AgentWallet.create(max_per_call_usdc=0.05, daily_budget_usdc=1.0)
    tool = create_openai_tool(
        name="crypto_intel",
        description="Fetch verified crypto intelligence feed",
        target_url="https://intel.test/alpha",
        wallet=wallet,
    )

    assert isinstance(tool, APayOpenAITool)
    schema = tool.to_openai_tool()
    assert schema["type"] == "function"
    assert schema["function"]["name"] == "crypto_intel"
    assert "crypto intelligence" in schema["function"]["description"]
    assert "parameters" in schema["function"]

    # Mock execution
    mock_resp = MagicMock()
    mock_resp.text = json.dumps({"feed": "BTC breakout"})
    mock_resp.status_code = 200

    with patch("apay.integrations.openai.APaySession") as mock_session_cls:
        instance = mock_session_cls.return_value
        instance.get.return_value = mock_resp

        # Test execute with JSON string
        out = tool.execute(json.dumps({"query": "BTC"}))
        assert "BTC breakout" in out

        # Test handle_openai_tool_call
        tool_call_obj = MagicMock()
        tool_call_obj.id = "call_abc123"
        tool_call_obj.function.name = "crypto_intel"
        tool_call_obj.function.arguments = json.dumps({"query": "BTC"})

        tool_msg = handle_openai_tool_call(tool_call_obj, [tool])
        assert tool_msg["role"] == "tool"
        assert tool_msg["tool_call_id"] == "call_abc123"
        assert "BTC breakout" in tool_msg["content"]

    # Test Swarm function generator
    swarm_fn = create_swarm_tool(
        target_url="https://intel.test/alpha",
        wallet=wallet,
        name="swarm_intel",
        description="Swarm tool description",
    )
    assert callable(swarm_fn)
    assert swarm_fn.__name__ == "swarm_intel"
    assert swarm_fn.__doc__ == "Swarm tool description"


def test_crewai_flexible_signatures() -> None:
    wallet = AgentWallet.create(max_per_call_usdc=0.02, daily_budget_usdc=0.50)

    # 3-arg positional: (name, url, wallet)
    t1 = create_crew_tool("short_tool", "https://api.test/feed", wallet)
    assert t1.name == "short_tool"
    assert t1.target_url == "https://api.test/feed"
    assert t1.wallet == wallet

    # 3-arg via alias create_apay_crew_tool
    t2 = create_apay_crew_tool("alias_tool", "https://api.test/feed", wallet)
    assert t2.name == "alias_tool"
    assert t2.target_url == "https://api.test/feed"

    # 4-arg: (name, desc, url, wallet)
    t3 = create_crew_tool("full_tool", "Full desc", "https://api.test/feed", wallet)
    assert t3.description == "Full desc"
    assert t3.target_url == "https://api.test/feed"
