# 🏛️ A-Pay Architecture Deep-Dive

## 1. System Philosophy: "Ultra-Light & Zero Friction"
For an autonomous AI agent running inside an ephemeral docker container or serverless environment, standard Web3 dependencies (like heavy `ethers.js` bundles or 500MB node_modules) are non-starters. 

A-Pay enforces:
1. **Zero Bloat**:
   - Gateway middleware footprint < 20KB.
   - Python client runtime footprint < 5MB (using Rust-based `pydantic-core` & `httpx`).
2. **Deterministic Latency**:
   - Verification of payment authorization within **< 25ms**.
   - No waiting for block confirmations during the live HTTP request/response cycle.
3. **Decentralized Custody**:
   - Agents never hand over private keys to a third-party server. Keys remain in memory / hardware enclave with pre-signed spending limits (Session Keys).

---

## 2. The Three Architectural Pillars

```
   [PILLAR 1: SELLER]                 [PILLAR 2: BUYER]               [PILLAR 3: SETTLEMENT]
   -------------------                -----------------               ----------------------
   API / Site Owner                   Autonomous Agent                Base L2 Smart Contracts
   • HTTP 402 Paywall                 • AgentWallet                   • EscrowVault
   • FastAPI / Express / Next.js      • Spending Guardrails           • APayRouter V2 Enterprise
   • WordPress 1-Click Reverse Proxy  • MCP Tool Server               • EIP-712 Challenge Settlement
   • Pricing & Receiver Config        • Auto-Settling HTTP Client     • Dual Token: USDC & $APAY
```

### Pillar 1: HTTP 402 Paywall & Monetization Layer (For Publishers & Sellers)
Turn unmetered AI crawler traffic into instant, automated revenue:
* **Zero-Setup Middlewares**: 1-line integrations for **FastAPI, Express.js**, and **Next.js 15**.
* **WordPress 1-Click Reverse Proxy**: Instant paywall for any WordPress site or WooCommerce store with auto domain escrow.
* **Granular Price Negotiation**: Per-endpoint pricing in `USDC` (micro-cents) or `$APAY` (protocol token).

### Pillar 2: Autonomous Agent Wallet & MCP Server (For AI Agents & LLMs)
Give AI agents economic agency with programmatic safety rails:
* **Model Context Protocol (MCP)**: Native integration for **Claude Desktop, Cursor, Cline, Windsurf**, and custom LLM tool runners (Grade A verified).
* **Spending & Counterparty Guardrails**: Define hard spending limits (`daily_budget_usdc=2.00`, `max_per_call_usdc=0.01`) and opt-in verified seller verification (`verify_seller_seal=True` via SealKeeper). The agent cannot exceed its delegated allowance or settle with unproven sellers.
* **Auto-Settling HTTP Client**: `APaySession` automatically catches `402` headers, checks seller reputation/SEAL, signs the EIP-712 challenge, and retrieves data in a single round-trip (<15ms).

### Pillar 3: On-Chain Base L2 Settlement & Escrow Vault (For Enterprise Web3 Security)
Enterprise-grade cryptographic settlement built on Coinbase's Base Layer 2:
* **EIP-712 Off-Chain Signatures**: Agents sign cryptographically binding micro-payment authorizations off-chain (0 gas, <15ms).
* **EscrowVault with Session Keys**: Deposit funds once, authorize temporary session keys, and withdraw anytime. Private keys never touch third-party servers.
* **Dynamic Multi-Token Support**: Native settlement in **USDC** (Circle) and **$APAY** (Fixed 100M supply utility token).

---

## 3. Component Breakdown

### A. Client SDK (`src/apay` - PyPI: `apay`)
- **Wallet Abstraction**: Generates or imports an EVM/Solana keypair into an ephemeral session.
- **Budget Guardrails**: Enforces client-side invariants (e.g. `max_total_spend`, `max_spend_per_hour`, `allowed_domains`).
- **402 Interceptor**: Intercepts `402 Payment Required` responses, inspects price and payment terms, automatically signs the EIP-712 payment authorization, attaches the `Authorization: APay <signature>` header, and retries the request transparently.

### B. Gateway Middleware (`gateway-ts` / `gateway-py`)
- Sits in front of any standard API route (Hono, Express, FastAPI, Next.js).
- Intercepts incoming requests:
  - If valid `APay` signature is present: Verifies signature off-chain in <10ms, checks nonce to prevent replay attacks, decrements the agent's available credit, and forwards the request to the upstream API handler.
  - If missing/invalid: Emits HTTP 402 with structured payment metadata.

### C. Smart Contract Settlement Layer (`contracts/`)
- **`APayRouter.sol`**:
  - Accepts batches of signed payment claims from API Providers.
  - Executes atomical transfer of USDC:
    - 99.0% -> Service Provider Wallet.
    - 1.0% -> A-Pay Protocol Treasury Wallet.
  - Emits `SettlementEvent` for indexing.
- **`EscrowVault.sol`**:
  - Allows AI operators to deposit a master balance and delegate limited "Session Keys" to their agents without risking the master funds.

---

## 4. The HTTP 402 Protocol Flow

```http
[1. AI Agent -> Server]
GET /v1/data/extract?url=https://example.com
Host: api.dataprovider.com
User-Agent: APay-Agent/1.0.0

[2. Server -> AI Agent]
HTTP/1.1 402 Payment Required
Content-Type: application/json
X-APay-Version: 1.0
X-APay-Receiver: 0x9876...CDEF
X-APay-Amount: 1000  (0.001 USDC - 6 decimals)
X-APay-Currency: USDC
X-APay-Network: base
X-APay-Nonce: f89a421b-4158-4bc2

{
  "status": 402,
  "message": "Micropayment required to access this endpoint",
  "pricing": {
    "amount": "0.001",
    "currency": "USDC",
    "network": "base",
    "receiver": "0x9876...CDEF"
  }
}

[3. AI Agent -> Server (Re-request with signed cryptographic authorization)]
GET /v1/data/extract?url=https://example.com
Host: api.dataprovider.com
User-Agent: APay-Agent/1.0.0
Authorization: APay eip712:<signature>:<payer_address>:<nonce>:<amount>

[4. Server -> AI Agent]
HTTP/1.1 200 OK
Content-Type: application/json
X-APay-Settled: true

{
  "success": true,
  "data": { ... }
}
```

---

## 5. Why Base (EVM L2) as the Primary Rail?
- **Cost**: < $0.0005 average gas fee per transfer.
- **Finality**: 200ms block intervals (OP Stack).
- **USDC Liquidity**: Native Circle deployment (not bridged).
- **Coinbase Ecosystem Alignment**: Ready interoperability with existing developer tools and agentic wallets.
