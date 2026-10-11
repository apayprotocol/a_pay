# 🤖 A-Pay AI Agent Framework Integrations

> Equip **LangChain**, **CrewAI**, **AutoGen**, and **LlamaIndex** agents with autonomous crypto spending wallets on Base L2.

---

## 🌟 Overview

Autonomous AI agents frequently need to query paid APIs, access premium datasets, or commission work from other specialized agents. Traditional fiat credit cards or manual API tokens cannot scale to autonomous machine-to-machine interactions.

**A-Pay** provides drop-in tool wrappers for the top AI agent frameworks, enabling:
- **Instant HTTP 402 Negotiation**: Intercept payment challenges and fulfill them in milliseconds.
- **EIP-712 Cryptographic Signatures**: Non-custodial session key authorizations on Base L2.
- **Dual Currency Support**: Settle in **USDC** or **$APAY** token (with automatic 20% protocol discount).
- **Runaway Loop Protection**: Hard spending invariants (`max_per_call` and `daily_budget`).

---

## ⚡ Quickstart

### 1. LangChain / LangGraph

```python
from apay.integrations.langchain import create_apay_tool
from apay.wallet import AgentWallet

# 1. Provision an ephemeral non-custodial wallet with strict safety budgets
wallet = AgentWallet.create(max_per_call_usdc=0.01, daily_budget_usdc=1.00)

# 2. Build a LangChain-compatible tool
market_tool = create_apay_tool(
    name="crypto_market_intel",
    description="Query proprietary institutional crypto intelligence feed.",
    target_url="https://api.example.com/market-intel",
    wallet=wallet,
    currency="USDC", # or "APAY"
)

# 3. Equip your agent
# agent = create_react_agent(llm, tools=[market_tool])
```

---

### 2. CrewAI Multi-Agent Economy

```python
from apay.integrations.crewai import create_crew_economy_toolkit
from apay.wallet import AgentWallet

wallet = AgentWallet.create(max_per_call_usdc=0.05, daily_budget_usdc=2.00)

# Generate a suite of paid tools for your research crew
toolkit = create_crew_economy_toolkit(
    wallet=wallet,
    endpoints={
        "fetch_sentiment": {
            "url": "https://api.example.com/sentiment",
            "description": "Premium real-time sentiment analysis.",
        },
        "query_orderbook": {
            "url": "https://api.example.com/orderbook",
            "description": "Deep Level-3 orderbook liquidity feed.",
        }
    },
    currency="APAY", # Automatically use $APAY token discount
)

# research_agent = Agent(role="Market Researcher", tools=toolkit, ...)
```

---

### 3. Microsoft AutoGen

```python
from apay.integrations.autogen import APayAutoGenToolkit
from apay.wallet import AgentWallet

wallet = AgentWallet.create(max_per_call_usdc=0.02, daily_budget_usdc=0.50)
toolkit = APayAutoGenToolkit(wallet=wallet, currency="USDC")

# Register with AutoGen assistant & user proxy
toolkit.register(
    assistant=assistant_agent,
    user_proxy=user_proxy_agent,
    target_url="https://api.example.com/compute-task",
    name="run_compute_task",
)
```

---

### 4. LlamaIndex RAG Pipelines

```python
from apay.integrations.llamaindex import create_llamaindex_tool
from apay.wallet import AgentWallet

wallet = AgentWallet.create(max_per_call_usdc=0.01, daily_budget_usdc=0.50)

tool = create_llamaindex_tool(
    target_url="https://api.example.com/vector-search",
    wallet=wallet,
    name="paid_vector_search",
    description="Vector search over gated proprietary research papers.",
)
```

---

### 5. OpenAI Function Calling & OpenAI Swarm

```python
from apay.integrations.openai import create_openai_tool, handle_openai_tool_call, create_swarm_tool
from apay.wallet import AgentWallet

wallet = AgentWallet.create(max_per_call_usdc=0.01, daily_budget_usdc=1.00)

# Generate OpenAI function calling tool
tool = create_openai_tool(
    name="get_crypto_alpha",
    description="Fetches real-time on-chain alpha and momentum signals.",
    target_url="https://api.example.com/alpha",
    wallet=wallet,
)

# 1. Pass to client.chat.completions.create(tools=[tool.to_openai_tool()])
# 2. When tool_call is returned:
# tool_msg = handle_openai_tool_call(tool_call, [tool])
# messages.append(tool_msg)

# Or for OpenAI Swarm:
swarm_tool = create_swarm_tool("https://api.example.com/alpha", wallet=wallet)
# swarm_agent = Agent(functions=[swarm_tool])
```

---

### 6. TypeScript / Vercel AI SDK

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { AgentWalletTS, createAPayToolkit } from 'apay-gateway';

const wallet = AgentWalletTS.create({ maxPerCallUsdc: 0.05, dailyBudgetUsdc: 2.0 });

const tools = createAPayToolkit(wallet, {
  cryptoAlpha: {
    url: 'https://api.example.com/alpha',
    description: 'Fetch proprietary crypto market intelligence',
  },
});

const result = await generateText({
  model: openai('gpt-4o'),
  tools,
  prompt: 'Analyze current market alpha signals',
});
```

---

## 📂 Runnable Recipes

Try the pre-built standalone recipes:

- **OpenAI Function Calling & Swarm**: [`examples/frameworks/openai_function_agent.py`](./openai_function_agent.py)
- **LlamaIndex RAG**: [`examples/frameworks/llamaindex_rag_agent.py`](./llamaindex_rag_agent.py)
- **LangChain**: [`examples/frameworks/langchain_paid_agent.py`](./langchain_paid_agent.py)
- **CrewAI**: [`examples/frameworks/crewai_agent_economy.py`](./crewai_agent_economy.py)
- **AutoGen**: [`examples/frameworks/autogen_multi_agent.py`](./autogen_multi_agent.py)

Run any recipe directly with `uv`:
```bash
uv run python examples/frameworks/openai_function_agent.py
uv run python examples/frameworks/llamaindex_rag_agent.py
uv run python examples/frameworks/langchain_paid_agent.py
uv run python examples/frameworks/crewai_agent_economy.py
uv run python examples/frameworks/autogen_multi_agent.py
```

