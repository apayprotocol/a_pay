# 🌐 Awesome MCP Servers Directory Submissions

This document contains formatted, verified submission materials for the top community Model Context Protocol (MCP) server directories.

---

## 1. `punkpeye/awesome-mcp-servers` (15,000+ GitHub Stars)
* **Target Repository**: [https://github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)
* **Target File**: `README.md`
* **Target Section**: `### 💰 Finance & Fintech` (or `### 🛠️ Developer Tools`)

### 📋 Markdown Entry Snippet (Alphabetical Placement):
```markdown
- [apayprotocol/a_pay](https://github.com/apayprotocol/a_pay) [![a_pay MCP server](https://glama.ai/mcp/servers/apayprotocol/apay/badges/score.svg)](https://glama.ai/mcp/servers/apayprotocol/apay) 🐍 📇 ☁️ 🏠 🍎 🪟 🐧 - Universal HTTP 402 Micropayment Protocol & Autonomous Economic Settlement Engine on Base L2.
```

### 📝 Pull Request Template:
* **PR Title**: `Add A-Pay (AgentPay) HTTP 402 Micropayments to Finance & Fintech`
* **PR Body**:
```markdown
### Server Details
- **Name**: A-Pay Protocol (AgentPay)
- **Repository**: https://github.com/apayprotocol/a_pay
- **Category**: Finance & Fintech / Developer Tools
- **Language**: Python (🐍) / TypeScript (📇)
- **Scope**: Cloud (☁️) & Local (🏠)
- **Platforms**: macOS (🍎), Windows (🪟), Linux (🐧)
- **Smithery Registry**: https://smithery.ai/servers/apayprotocol/apay
- **PyPI Release**: https://pypi.org/project/apay/0.1.8/

### Description
A-Pay enables any autonomous AI agent (Claude Desktop, Cursor, Cline, AutoGen, CrewAI, LangChain) to discover, inspect, and settle HTTP 402 crypto micropayments on Base L2 in under 15ms without credit cards or human seed phrase friction.

### Exposed Tools
1. `apay_request`: Send GET/POST to protected endpoints with auto-settled HTTP 402 challenge negotiation.
2. `apay_get_balance`: Inspect live on-chain balances (ETH, USDC, and $APAY tokens) via Base RPC.
3. `apay_get_wallet_status`: View ephemeral session wallet limits, daily budget, and total spend.
4. `apay_inspect_endpoint`: Probe an API paywall for price, currency, and receiver terms with 0 gas cost.
5. `apay_set_budget`: Dynamically update per-call and daily budget guardrails.

### Quick Start Verification
```bash
# Zero-setup execution via uvx
uvx apay mcp

# Or 1-click Smithery CLI install
npx -y smithery mcp add apayprotocol/apay
```
```

---

## 2. `appcypher/awesome-mcp-servers`
* **Target Repository**: [https://github.com/appcypher/awesome-mcp-servers](https://github.com/appcypher/awesome-mcp-servers)
* **Target Section**: `Finance & Crypto`

### 📋 Markdown Entry Snippet:
```markdown
- [a_pay](https://github.com/apayprotocol/a_pay) - Universal HTTP 402 Micropayment Protocol & Autonomous Economic Settlement Engine on Base L2.
```

---

## 3. Official Anthropic MCP Registry
* **Registry URL**: [https://registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io)
* **Manifest**: [`server.json`](file:///home/sagar/a_pay/server.json)
* **Validation Status**: `✅ server.json is valid`
* **Namespace**: `io.github.apayprotocol/apay`
