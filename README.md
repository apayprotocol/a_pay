# ⚡ A-Pay Protocol (AgentPay)
> **The World's First Fully Autonomous HTTP 402 Micropayment & Economic Settlement Layer on Base L2**

<!-- mcp-name: io.github.apayprotocol/apay -->

[![Base L2 Verified](https://img.shields.io/badge/Network-Base_Mainnet_8453-0052FF.svg?logo=coinbase)](https://basescan.org/token/0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://pypi.org/project/apay/)
[![TypeScript / Node](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white)](https://www.npmjs.com/package/create-apay-app)
[![MCP Protocol 2025](https://img.shields.io/badge/MCP-Standard_2025--12--11-6B46C1.svg)](https://modelcontextprotocol.io)
[![Cloudflare Edge](https://img.shields.io/badge/Domain-apayprotocol.org-F38020.svg?logo=cloudflare)](https://apayprotocol.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## 🌐 Canonical Protocol Identity & Verified Network

* **Official Protocol Domain**: [https://apayprotocol.org](https://apayprotocol.org) *(Cloudflare Global Edge Anycast, DDoS Protected)*
* **Official Basename (Base L2 ENS)**: [`apayprotocol.base.eth`](https://basescan.org/name-lookup-search?id=apayprotocol.base.eth)
* **Official Inboxes**: `founder@apayprotocol.org` | `contact@apayprotocol.org` | `security@apayprotocol.org`
* **Official GitHub Organization**: [https://github.com/apayprotocol](https://github.com/apayprotocol) *(Verified Domain Organization)*
* **Live Web App & Developer Console**: [https://apayprotocol.org](https://apayprotocol.org) / [https://apay-network.vercel.app](https://apay-network.vercel.app)

### ⛓️ Verified Smart Contracts (Base Mainnet — Chain ID `8453`)
| Contract / Resource | Contract Address | Explorer / Pool |
|---|---|---|
| **$APAY Token (ERC-20)** | `0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3` | [BaseScan](https://basescan.org/token/0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3) (100M Fixed Cap) |
| **EscrowVault (Session Keys)** | `0xd08c8a337e5339d1c083e06d74a9265956ceea16` | [BaseScan](https://basescan.org/address/0xd08c8a337e5339d1c083e06d74a9265956ceea16) (Non-Custodial Delegated Spend) |
| **APayRouterV2 (Enterprise)** | `0x452eb7d4e7ccbf76ecf511829880b5fbcb24e854` | [BaseScan](https://basescan.org/address/0x452eb7d4e7ccbf76ecf511829880b5fbcb24e854) (Cumulative Channels & Merkle Claims) |
| **APayRouter (V1 Gateway)** | `0x71434344beef9c44ff3bc95572beb7bfb8847ec6` | [BaseScan](https://basescan.org/address/0x71434344beef9c44ff3bc95572beb7bfb8847ec6) (1.0% Protocol Fee) |
| **StakingVault (Anti-Spam)** | `0x3e35a9e802627a3d9a86d6554e72b1c446e34aaf` | [BaseScan](https://basescan.org/address/0x3e35a9e802627a3d9a86d6554e72b1c446e34aaf) (Collateral & Slashing) |
| **Aerodrome Liquidity Pool** | `vAMM-WETH/APAY` (`0x6933...7777`) | [Aerodrome Swap](https://aerodrome.finance/swap?from=eth&to=0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3) |
| **Market Analytics** | DexScreener Live Pool | [DexScreener Chart](https://dexscreener.com/base/0x6933dd2B7D72d8561005E475AFa147E47A3c7777) |

### 🧪 Base Sepolia Testnet (Chain ID `84532`)
* **Testnet Faucet APAY**: [`0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3`](https://sepolia.basescan.org/address/0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3)
* **EscrowVault**: [`0x3E35a9E802627a3D9A86D6554e72b1C446E34aAF`](https://sepolia.basescan.org/address/0x3E35a9E802627a3D9A86D6554e72b1C446E34aAF)
* **APayRouterV2**: [`0xD08c8A337E5339d1c083E06d74A9265956ceEA16`](https://sepolia.basescan.org/address/0xD08c8A337E5339d1c083E06d74A9265956ceEA16)
* **APayRouter V1**: [`0x71434344beEF9C44fF3BC95572bEB7bFB8847ec6`](https://sepolia.basescan.org/address/0x71434344beEF9C44fF3BC95572bEB7bFB8847ec6)

---

## 💡 The Genesis: Unlocking HTTP 402 After 30 Years

In 1996, Sir Tim Berners-Lee and the IETF authored RFC 2068, reserving the HTTP status code **`402 Payment Required`** for digital cash protocols. 

For thirty years, status code 402 sat dormant. Web 2.0 forced digital payments into human-centric credit card rails (Visa, Mastercard, Stripe), requiring KYC identity checks, CAPTCHAs, and minimum fixed transaction fees of **$0.30 + 2.9%**.

### ⚠️ The Problem Today (2026 AI Agent Economy)
1. **AI Agents Have No Credit Cards**: Autonomous software agents (Claude Desktop, Cursor, LangChain, AutoGen, CrewAI) execute multi-step workflows across the web. They cannot hold credit cards, submit passports for KYC, or solve visual captchas.
2. **Publishers & Website Owners are Bleeding Compute**: Autonomous AI scrapers (GPTBot, ClaudeBot, PerplexityBot) crawl millions of pages daily. Publishers face massive server bandwidth bills while their proprietary intelligence is consumed for free.
3. **Stripe Kills Micropayments**: If an AI agent wants to purchase a single database row, an API call, or an article for **$0.001 (0.1¢)**, Stripe's $0.30 fixed fee makes it impossible.

### 🌟 The A-Pay Solution
**A-Pay is the world's first autonomous economic settlement layer that implements the native HTTP 402 standard on Base Layer 2.**
* **Sub-Cent Micropayments**: Settle transactions as small as **$0.0001 (0.01¢)** in native USDC or $APAY.
* **Zero Gas Friction for Agents**: Agents sign off-chain cryptographic authorizations (EIP-712). Relayers handle batch settlement on Base L2.
* **Sub-15ms Latency**: Cryptographic verification completes in under 15 milliseconds, seamlessly unblocking HTTP responses.
* **100% Non-Custodial & Audited**: Guarded by smart contract session keys with daily spending limits and per-call caps.

---

## 🏛️ The Three Architectural Pillars

```
                                      A-PAY PROTOCOL
                                            │
         ┌──────────────────────────────────┼──────────────────────────────────┐
         ▼                                  ▼                                  ▼
   [PILLAR 1: SELLER]                 [PILLAR 2: BUYER]               [PILLAR 3: SETTLEMENT]
  HTTP 402 Paywall Layer            Autonomous Agent Wallets            Base L2 Escrow Vault
  ──────────────────────            ────────────────────────            ────────────────────
  • WordPress AI Paywall Plugin     • Model Context Protocol (MCP)      • EIP-712 Batch Settlement
  • Reverse Proxy (`apay protect`)  • Ephemeral Session Keys            • Non-Custodial Escrow
  • FastAPI / Express Decorators    • Daily Budgets & Per-Call Caps     • Cumulative Payment Channels
  • Next.js 15 Middleware           • LangChain / CrewAI Wrappers       • Native USDC & $APAY Support
```

### Pillar 1: HTTP 402 Paywall & Monetization Layer (For Publishers & Sellers)
Turn unmetered AI crawler traffic into instant, automated revenue:
* **Selective Bot Paywall**: Genuine human visitors read your website freely without popups or captchas. Autonomous AI crawler bots automatically receive an **HTTP 402 Payment Required** challenge.
* **Instant Reverse Proxy**: Protect ANY existing REST API, FastAPI backend, or web server with a single terminal command:
  ```bash
  apay protect --target http://localhost:8000 --price 0.001 --wallet 0xYourPayoutAddress
  ```
* **Native Framework SDKs**: Drop-in middleware for Next.js 15, FastAPI, Express.js, and WordPress.

### Pillar 2: Autonomous Agent Wallet & MCP Server (For AI Agents & LLMs)
Give AI agents economic agency with programmatic safety rails:
* **Model Context Protocol (MCP)**: Native integration for **Claude Desktop, Cursor, Cline, Windsurf**, and custom LLM tool runners.
* **Spending Guardrails**: Define hard spending limits (`daily_budget_usdc=2.00`, `max_per_call_usdc=0.01`). The agent cannot exceed its delegated allowance even if prompted maliciously.
* **Auto-Settling HTTP Client**: `APaySession` automatically catches `402` headers, signs the EIP-712 challenge, and retrieves data in a single round-trip without human intervention.

### Pillar 3: On-Chain Base L2 Settlement & Escrow Vault (For Enterprise Web3 Security)
Enterprise-grade cryptographic settlement built on Coinbase's Base Layer 2:
* **EscrowVault**: Agents deposit or lock funds into dedicated smart contracts. Session keys authorize payments without holding root private keys.
* **APayRouterV2**: Batch settlements aggregate thousands of off-chain micro-signatures into a single Merkle-verified on-chain transaction, reducing effective gas costs to fractions of a cent.
* **Dual-Currency Support**: Settle in dollar-pegged **USDC** or the protocol utility token **$APAY** with fee discounts.

---

## 👥 Who Is A-Pay For? (Target Personas & Benefits)

| User Persona | The Pain Point Today | How A-Pay Solves It |
|---|---|---|
| **Website Owners & Publishers** | AI bots scrape content for free; hosting bills surge; paywalls block human readers. | Human visitors read for free; AI scrapers pay $0.001/page via HTTP 402 paywall. |
| **API Providers & SaaS Founders** | Monthly SaaS billing requires Stripe KYC, invoices, high churn, and $0.30 transaction minimums. | Pure pay-per-call micro-billing ($0.005/request); zero chargebacks; instant settlement. |
| **AI Engineers (Claude/Cursor)** | Agents cannot purchase web search results, private datasets, or pay for third-party tools. | Agents hold delegated session wallets with daily budgets to pay for tools autonomously. |
| **Web3 & Base L2 Builders** | Tokens lack real-world utility; micro-transaction dApps suffer from gas friction. | Millions of automated M2M agent micro-settlements flowing through Base L2 contracts. |

---

## 🚀 Quickstart & Universal Developer Setup

### 1. Python Developers (FastAPI & AI Agents)
```bash
pip install apay
```

#### Protect a FastAPI Endpoint with HTTP 402:
```python
from fastapi import FastAPI, Depends
from apay import require_payment

app = FastAPI()

@app.get("/api/alpha-feed")
@require_payment(price_usdc=0.005, receiver="0xYourPayoutWalletAddress")
async def get_alpha_feed():
    return {"status": "unlocked", "data": "Exclusive proprietary real-time signals"}
```

#### Call Protected APIs with an Autonomous Agent:
```python
from apay import APaySession, AgentWallet

# Create an agent wallet with strict safety caps
wallet = AgentWallet(
    private_key="0x...",
    max_per_call_usdc=0.01,
    daily_budget_usdc=5.00
)
session = APaySession(wallet)

# Automatically handles HTTP 402 challenges & settles on the fly (<15ms)
response = session.get("https://api.example.com/api/alpha-feed")
print(response.json())
```

---

### 2. TypeScript & Node.js Developers (Next.js & Express)
Scaffold a complete fullstack project in 30 seconds:
```bash
npx create-apay-app my-autonomous-agent
```

Or install the client library:
```bash
npm install apay-client
```

```typescript
import { APayClient } from "apay-client";

const client = new APayClient({
  privateKey: process.env.AGENT_PRIVATE_KEY!,
  network: "base-mainnet",
  maxPerCallUsdc: 0.05
});

// Auto-settling request
const data = await client.fetchWithPaywall("https://data-provider.com/market-depth");
console.log(data);
```

---

### 3. Claude Desktop & Cursor (Model Context Protocol / MCP)

#### One-Click Install via Smithery:
```bash
npx -y @smithery/cli install apay --client claude
```

#### Or Add to `claude_desktop_config.json` / Cursor (`.cursor/mcp.json`):
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
        "APAY_DAILY_BUDGET": "2.00"
      }
    }
  }
}
```

Now Claude or Cursor can execute tools:
* `apay_request`: Send requests to HTTP 402 protected APIs and settle on-the-fly.
* `apay_get_balance`: Inspect live on-chain balances (ETH, USDC, $APAY).
* `apay_inspect_endpoint`: Probe an API paywall for price and terms without spending gas.
* `apay_set_budget`: Adjust per-call limits and daily spending guardrails.

---

### 4. Website Owners & WordPress (Zero Code Reverse Proxy)
Protect ANY live web server or WordPress site without changing a single line of backend code:
```bash
apay protect --target http://localhost:8000 --price 0.001 --wallet 0xYourPayoutAddress
```
* Human browsers view the site freely.
* AI web crawlers (GPTBot, ClaudeBot, Bytespider) receive an HTTP 402 challenge and pay per scrape.

---

## 📂 Project Architecture

```text
a_pay/
├── src/apay/                # Core Python SDK & Runtime
│   ├── cli.py               # ⚡ 1-Command CLI (`apay protect`, `apay wallet new`, `apay mcp`)
│   ├── client.py            # 🤖 Autonomous HTTP client with auto-402 negotiation
│   ├── wallet.py            # 🔐 In-memory delegated wallet & spending limits
│   ├── proxy.py             # 🛡️ Ultra-light reverse proxy HTTP 402 paywall
│   ├── relayer.py           # 📊 EIP-712 batch settlement relayer
│   └── integrations/        # 🔗 LangChain, CrewAI & AutoGen agent wrappers
├── gateway-ts/              # Enterprise TypeScript Gateway & EIP-712 Verifier
├── packages/create-apay-app # Official NPX starter scaffolding CLI
├── contracts/               # Audited Solidity Smart Contracts (Base Mainnet & Sepolia)
│   ├── APAYToken.sol        # ERC-20 100M Cap Protocol Utility Token
│   ├── EscrowVault.sol      # Session Key Delegated Spending Vault
│   ├── APayRouterV2.sol     # Cumulative Channel & Merkle Root Router
│   └── StakingVault.sol     # Anti-Spam Collateral Engine
├── web/                     # Official Portal (Next.js 15, Tailwind, RainbowKit, Wagmi)
├── docs/                    # Complete Protocol Specifications & RFCs
├── spec/                    # RFC wire format & EIP-712 domain specifications
└── pyproject.toml           # Official Hatchling packaging configuration
```

---

## 🔒 Security & Verification Guarantees

1. **Non-Custodial Session Delegation**: Agents operate with strictly sandboxed session keys. The agent NEVER has access to the owner's primary root wallet or vault withdrawal functions.
2. **Deterministic Cryptographic Limits**: Spending caps are signed off-chain and enforced both in-memory and on-chain by the `EscrowVault` smart contract.
3. **Formal Verification & Secrets Hygiene**: 
   * Zero hardcoded secrets, seed phrases, or private keys across the entire codebase.
   * Automated security scans verified via `python3 scripts/scan_secrets.py`.
   * On-chain bytecode verified on [BaseScan](https://basescan.org).

---

## 🤝 Community & Ecosystem

* **Official Website**: [https://apayprotocol.org](https://apayprotocol.org)
* **GitHub Organization**: [https://github.com/apayprotocol](https://github.com/apayprotocol)
* **Official Basename**: `apayprotocol.base.eth`
* **Contact & Security**: `founder@apayprotocol.org` | `security@apayprotocol.org`

*A-Pay is an open-source decentralized economic protocol for the machine-to-machine economy. Built on Base Layer 2.*
