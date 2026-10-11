# 🛡️ A-Pay Security & Economic Model

## 1. Threat Vectors & Mitigations

### A. Rogue Agent Drain (Infinite Loops)
- **Threat**: An AI agent gets trapped in a reasoning or execution loop, triggering 50,000 API calls per minute and draining the operator's entire crypto balance.
- **Mitigation**:
  1. **Strict Client-Side Budgets**: The `AgentWallet` class enforces local hard rate-limits (`max_per_call`, `max_per_minute`, `daily_cap`).
  2. **Smart Contract Session Keys**: The on-chain `EscrowVault` can only release funds up to a programmatic allowance per epoch. Even if the local private key is compromised, funds beyond the allowance are mathematically inaccessible.

### B. Man-in-the-Middle (MITM) & Replay Attacks
- **Threat**: An attacker snoops on the HTTP traffic and re-submits the agent's signature to drain funds or steal data.
- **Mitigation**:
  1. Mandatory TLS (`https://` required).
  2. Server-generated cryptographic nonces with short 60s expirations.
  3. EIP-712 domain binding (`chainId`, `verifyingContract`, `receiver`).

### C. Merchant Non-Delivery (Sybil / Scam APIs)
- **Threat**: A malicious API returns an HTTP 402, takes the payment signature, but fails to deliver the promised data.
- **Mitigation**:
  - **Reputation Registry**: Verified providers on A-Pay receive trust badges.
  - **Optimistic State Channels**: For high-volume streaming data (e.g. LLM tokens), payments are streamed continuously per 100 tokens, bounding any non-delivery loss to < $0.0001.

---

## 2. Protocol Fee Invariance
- The protocol fee (0.5% - 1.0%) is enforced inside the smart contract `APayRouter.sol`:
```solidity
uint256 protocolFee = (amount * feeBps) / 10000;
uint256 merchantAmount = amount - protocolFee;

usdc.transferFrom(payer, treasury, protocolFee);
usdc.transferFrom(payer, receiver, merchantAmount);
```
- No party can bypass this fee when settling through the official decentralized router.
