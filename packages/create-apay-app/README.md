# ⚡ `create-apay-app`

> Initialize a monetized AI Agent API or Paywall app with **A-Pay** on Base Layer 2 in 60 seconds.

[![npm version](https://img.shields.io/npm/v/create-apay-app.svg)](https://www.npmjs.com/package/create-apay-app)
[![Base L2 Verified](https://img.shields.io/badge/Base%20L2-Verified%20Contracts-0052FF.svg)](https://basescan.org/address/0xd08c8a337e5339d1c083e06d74a9265956ceea16)
[![Discord Community](https://img.shields.io/badge/Discord-Join%20Community-5865F2?logo=discord&logoColor=white)](https://discord.gg/cW2WRSfb35)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Quickstart

Run with `npx` (no pre-installation required):

```bash
npx create-apay-app my-agent-api
```

### Or with direct flags:

```bash
# Next.js 15 Fullstack (App Router + Embedded Checkout Widget)
npx create-apay-app my-agent --template nextjs --receiver 0xYourWalletAddress --yes

# Python FastAPI (1-Line Paywall Decorator)
npx create-apay-app my-agent --template fastapi --receiver 0xYourWalletAddress --yes

# Express (Node.js)
npx create-apay-app my-agent --template express --receiver 0xYourWalletAddress --yes
```

---

## 🌟 Supported Templates

| Template | Framework | Features |
|---|---|---|
| **`nextjs`** | Next.js 15 (React 19) | Modern UI + A-Pay Standalone Checkout Widget + `/api/agent` HTTP 402 Route |
| **`fastapi`** | Python FastAPI | High-speed async API + `APayPaywall` decorator + EIP-712 settlement |
| **`express`** | Node.js Express | `apay-gateway` middleware + HTML frontend preview + dual currency |

---

## 🛡️ Built-in Features
- **Base Layer 2 Native**: Sub-cent transaction fees & instantaneous finality.
- **Dual Currency Rail**: Accepts Circle **USDC** and native **$APAY** token (with 20% protocol discount).
- **Autonomous Agent Ready**: Compatible with Claude Desktop, Cursor, LangChain, and CrewAI session wallets.

---

## 📄 License
MIT © [A-Pay Protocol](https://apayprotocol.org)
