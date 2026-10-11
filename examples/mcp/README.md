# 🤖 A-Pay Model Context Protocol (MCP) Server Guide

> Enable any LLM (Claude Desktop, Cursor, Antigravity, Windsurf, Cline) to autonomously discover, inspect, and settle HTTP 402 crypto micropayments on Base L2 in under 60 seconds.

---

## ⚡ 1-Click Installation (Smithery Registry)

If you have `@smithery/cli` installed, you can install A-Pay into Claude Desktop with a single command:

```bash
npx -y @smithery/cli install apay --client claude
```

---

## 🚀 Manual Zero-Setup Configuration (`uvx`)

No cloning or manual installation required! `uvx` automatically pulls and runs the latest published A-Pay package from PyPI.

### 1. Configure Claude Desktop
Add the following to your Claude Desktop config file:
* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
* **Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "apay": {
      "command": "uvx",
      "args": ["apay", "mcp"],
      "env": {
        "APAY_NETWORK": "base-mainnet",
        "APAY_CURRENCY": "DUAL",
        "APAY_MAX_PER_CALL": "0.05",
        "APAY_DAILY_BUDGET": "2.0",
        "APAY_PRIVATE_KEY": "0xYourAgentPrivateKeyHereOrLeaveEmptyForAutoWallet"
      }
    }
  }
}
```

---

### 2. Configure Cursor IDE
Add to your Cursor settings or workspace `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "apay-agent-wallet": {
      "command": "uvx",
      "args": ["apay", "mcp"],
      "env": {
        "APAY_NETWORK": "base-mainnet",
        "APAY_CURRENCY": "DUAL",
        "APAY_MAX_PER_CALL": "0.05",
        "APAY_DAILY_BUDGET": "2.0",
        "APAY_PRIVATE_KEY": "0xYourAgentPrivateKeyHereOrLeaveEmptyForAutoWallet"
      }
    }
  }
}
```

---

## 🛠️ Exposed MCP Tools
Your LLM assistant will automatically have access to 5 native economic tools:
1. `apay_request`: Send GET/POST to any protected API endpoint. Automatically intercepts HTTP 402, verifies spending limits, signs EIP-712 challenge, and unlocks data in <25ms.
2. `apay_get_wallet_status`: View wallet address, remaining daily budget, and total spent in USDC and $APAY.
3. `apay_get_balance`: Inspect live on-chain balances (Base ETH, USDC, and $APAY tokens) via Base RPC.
4. `apay_set_budget`: Dynamically configure `max_per_call_usdc`, `daily_budget_usdc`, or $APAY boundaries.
5. `apay_inspect_endpoint`: Probe an API endpoint for price, currency, and receiver terms with zero spending.

---

## 🧪 Testing with Claude or Cursor
Simply ask your assistant:
> *"Inspect my A-Pay wallet balance and status."*

Or:
> *"Query the paid intelligence endpoint at `https://protected-api.com/market-report` using your A-Pay wallet and summarize the insights."*

The LLM will automatically call `apay_request`, pay the micro-fraction ($0.001 USDC or 0.1 $APAY) on Base L2, and deliver the decrypted data!
