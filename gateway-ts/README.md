# ⚡ apay-gateway

> **Ultra-lightweight HTTP 402 Paywall Middleware for Node.js, Express, Hono, Next.js & Edge APIs.**

Monetize any API endpoint with autonomous machine-to-machine (M2M) micropayments on Base L2 in **1 line of code**.

[![npm version](https://img.shields.io/npm/v/apay-gateway.svg)](https://www.npmjs.com/package/apay-gateway)
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

## 🛡️ Security Invariants
* **O(1) Sliding-Window Replay Defense**: Nonces are cryptographically unique and consumed on first use to prevent replay attacks.
* **Dual-Currency Parity (USDC + $APAY)**: Native support for both 6-decimal USDC and 18-decimal $APAY token.
* **EIP-712 Typed Signatures**: Off-chain cryptographic authorization verified in `< 10ms`.
* **Zero Intermediary Escrow**: Funds settle directly into non-custodial EVM wallets.

---

## 📜 License
MIT © A-Pay Protocol

