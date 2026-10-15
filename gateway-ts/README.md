# ⚡ apay-gateway

> **Ultra-lightweight HTTP 402 Paywall Middleware for Node.js, Express, Hono, Next.js & Edge APIs.**

Monetize any API endpoint with autonomous machine-to-machine (M2M) micropayments on Base L2 in **1 line of code**.

[![npm version](https://img.shields.io/npm/v/apay-gateway.svg)](https://www.npmjs.com/package/apay-gateway)
[![Base L2 Verified](https://img.shields.io/badge/Base%20L2-Verified%20Contracts-0052FF.svg)](https://basescan.org/address/0xd08c8a337e5339d1c083e06d74a9265956ceea16)
[![Discord Community](https://img.shields.io/badge/Discord-Join%20Community-5865F2?logo=discord&logoColor=white)](https://discord.gg/cW2WRSfb35)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 Quickstart

### 1. Installation

```bash
npm install apay-gateway viem
```

---

### 2. Express.js Integration (1 Line)

```javascript
import express from 'express';
import { apayExpress } from 'apay-gateway';

const app = express();

// Protect /v1/intel with HTTP 402 Paywall ($0.001 USDC per call)
app.use(
  '/v1/intel',
  apayExpress({
    receiverAddress: '0xYourPayoutWalletAddress',
    priceUsdc: 0.001,
    network: 'base',
  })
);

app.get('/v1/intel', (req, res) => {
  res.json({
    status: 'success',
    secret_data: 'CONFIDENTIAL: Macro alpha unlocked via A-Pay.',
    payer: req.apayClaim?.payer,
    settled: true,
  });
});

app.listen(3000, () => console.log('⚡ Paywalled API running at http://localhost:3000'));
```

---

### 3. Hono & Cloudflare Workers / Next.js Integration

```typescript
import { Hono } from 'hono';
import { apayHono } from 'apay-gateway';

const app = new Hono();

app.use(
  '/v1/intel/*',
  apayHono({
    receiverAddress: '0xYourPayoutWalletAddress',
    priceUsdc: 0.001,
    network: 'base',
  })
);

app.get('/v1/intel/stream', (c) => {
  const claim = c.get('apayClaim');
  return c.json({
    status: 'success',
    data: 'Real-time intelligence feed',
    paid_by: claim?.payer,
  });
});

export default app;
```

---

### 4. Buyer AI Agent SDK (Autonomous 402 Navigation)

Enable TypeScript / Node.js AI agents (ElizaOS, LangChain.js, Vercel AI SDK) to autonomously navigate HTTP 402 paywalls:

```typescript
import { AgentWalletTS, fetchWithAPay, discoverServices } from 'apay-gateway';

// 1. Discover paid APIs dynamically on the network
const services = await discoverServices();
console.log('Available paid AI services:', services);

// 2. Initialize agent wallet with strict spending guardrails
const wallet = AgentWalletTS.create({
  maxPerCallUsdc: 0.01,
  dailyBudgetUsdc: 2.0,
  maxPerCallApay: 10.0,
});

// 3. Fetch normally — automatically intercepts 402, signs EIP-712 challenge, and unlocks!
const response = await fetchWithAPay(wallet, 'https://protected-api.com/v1/intel');
const data = await response.json();
console.log('Unlocked secret data:', data);
```

---

### 5. Coinbase AgentKit Integration (Autonomous On-Chain Actions)

Equip Coinbase AgentKit agents on Base L2 with autonomous micropayment settlement capabilities in 1 line:

```typescript
import { createAPayActionProvider } from 'apay-gateway/agentkit';
import { AgentWalletTS } from 'apay-gateway';

// Initialize non-custodial session wallet with strict spending guardrails
const wallet = AgentWalletTS.create({
  maxPerCallUsdc: 0.05,
  dailyBudgetUsdc: 5.0,
});

// Create AgentKit action provider
const apayProvider = createAPayActionProvider({
  wallet,
  network: 'base-mainnet',
  preferredCurrency: 'USDC',
});

// Ready to bind into AgentKit agent instance
const actions = apayProvider.getActions();
// Provides: apay_probe_endpoint, apay_request, apay_get_wallet_status, apay_get_balance, apay_set_budget
```

---

### 6. Vercel AI SDK Integration (`ai` Package)

Plug paid API tools directly into Vercel AI SDK (`generateText`, `streamText`):

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { AgentWalletTS } from 'apay-gateway';
import { createAPayToolkit } from 'apay-gateway/ai-sdk';

const wallet = AgentWalletTS.create({
  maxPerCallUsdc: 0.01,
  dailyBudgetUsdc: 1.0,
});

// Expose paid external endpoints as native agent tools
const tools = createAPayToolkit(wallet, {
  getFinancialIntel: {
    url: 'https://api.intel.com/v1/data',
    description: 'Fetch proprietary macro intelligence (settled via A-Pay)',
  },
});

const result = await generateText({
  model: openai('gpt-4o-mini'),
  tools,
  prompt: 'Analyze today’s market trend using financial intel.',
});
```

---

## ⛓️ Verified Smart Contracts (Base Mainnet 8453)

All settlement contracts are verified on BaseScan and immutable:

| Contract | Address | Network | Explorer |
|---|---|---|---|
| **EscrowVault** | `0xd08c8a337e5339d1c083e06d74a9265956ceea16` | Base Mainnet | [BaseScan](https://basescan.org/address/0xd08c8a337e5339d1c083e06d74a9265956ceea16) |
| **APAY Token** | `0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc` | Base Mainnet | [BaseScan](https://basescan.org/token/0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc) |
| **RouterV2** | `0x1994fa2281896803762ae3eb89fb0ab0ee1d6248` | Base Mainnet | [BaseScan](https://basescan.org/address/0x1994fa2281896803762ae3eb89fb0ab0ee1d6248) |
| **USDC (Native)** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Base Mainnet | [BaseScan](https://basescan.org/token/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) |

---

## 🛡️ Security Invariants
* **O(1) Sliding-Window Replay Defense**: Nonces are cryptographically unique and consumed on first use to prevent replay attacks.
* **Dual-Currency Parity (USDC + $APAY)**: Native support for both 6-decimal USDC and 18-decimal $APAY token.
* **EIP-712 Typed Signatures**: Off-chain cryptographic authorization verified in `< 10ms`.
* **Zero Intermediary Escrow**: Funds settle directly into non-custodial EVM wallets.

---

## 🌐 Community & Resources
- **Canonical Website**: [https://apayprotocol.org](https://apayprotocol.org)
- **Official Docs**: [https://apayprotocol.org/docs](https://apayprotocol.org/docs)
- **Discord Community**: [https://discord.gg/cW2WRSfb35](https://discord.gg/cW2WRSfb35)
- **PyPI Package (`apay`)**: [https://pypi.org/project/apay/](https://pypi.org/project/apay/)
- **GitHub Repository**: [https://github.com/apayprotocol/a_pay](https://github.com/apayprotocol/a_pay)

---

## 📜 License
MIT © A-Pay Protocol Core Team <contact@apayprotocol.org>


