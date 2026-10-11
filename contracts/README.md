# ⚡ A-Pay Protocol — On-Chain Smart Contracts & BaseScan Verification

This directory contains the production smart contract suite for the **A-Pay Universal Micropayment & Economic Protocol for Autonomous AI Agents**, deployed on **Base Mainnet (8453)** and **Base Sepolia (84532)**.

All 5 contracts are **100% bytecode verified** against live Base L2 RPC nodes with zero discrepancies.

---

## 🏛️ Deployed Contract Directory

### 🔵 Base Mainnet (Production — Chain ID: 8453)

| Contract | Address | Compiler | Optimizer | Constructor Arguments | Explorer & Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **$APAY Token** | `0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3` | `v0.8.28+commit.7893614a` | 200 runs, viaIR: true | *None* | [BaseScan #code](https://basescan.org/address/0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3#code) • [Verify](https://basescan.org/verifyContract?a=0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3) |
| **APayRouter (V1)** | `0x71434344beef9c44ff3bc95572beb7bfb8847ec6` | `v0.8.28+commit.7893614a` | 200 runs, viaIR: true | `0000000000000000000000005ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc0000000000000000000000000000000000000000000000000000000000000064` | [BaseScan #code](https://basescan.org/address/0x71434344beef9c44ff3bc95572beb7bfb8847ec6#code) • [Verify](https://basescan.org/verifyContract?a=0x71434344beef9c44ff3bc95572beb7bfb8847ec6) |
| **APayRouterV2 (Enterprise)** | `0x452eb7d4e7ccbf76ecf511829880b5fbcb24e854` | `v0.8.28+commit.7893614a` | 200 runs, viaIR: true | `0000000000000000000000005ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc00000000000000000000000000000000000000000000000000000000000000640000000000000000000000008dd4ff9035c7d4e0bef30aa64fc30d128a4066c3` | [BaseScan #code](https://basescan.org/address/0x452eb7d4e7ccbf76ecf511829880b5fbcb24e854#code) • [Verify](https://basescan.org/verifyContract?a=0x452eb7d4e7ccbf76ecf511829880b5fbcb24e854) |
| **EscrowVault** | `0xd08c8a337e5339d1c083e06d74a9265956ceea16` | `v0.8.28+commit.7893614a` | 200 runs, viaIR: true | *None* | [BaseScan #code](https://basescan.org/address/0xd08c8a337e5339d1c083e06d74a9265956ceea16#code) • [Verify](https://basescan.org/verifyContract?a=0xd08c8a337e5339d1c083e06d74a9265956ceea16) |
| **StakingVault** | `0x3e35a9e802627a3d9a86d6554e72b1c446e34aaf` | `v0.8.28+commit.7893614a` | 200 runs, viaIR: true | `0000000000000000000000008dd4ff9035c7d4e0bef30aa64fc30d128a4066c30000000000000000000000005ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc` | [BaseScan #code](https://basescan.org/address/0x3e35a9e802627a3d9a86d6554e72b1c446e34aaf#code) • [Verify](https://basescan.org/verifyContract?a=0x3e35a9e802627a3d9a86d6554e72b1c446e34aaf) |

---

### 🟣 Base Sepolia (Testnet — Chain ID: 84532)

| Contract | Address | Compiler | Optimizer | Constructor Arguments | Explorer & Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **$APAY Token** | `0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3` | `v0.8.28+commit.7893614a` | 200 runs, viaIR: false | *None* | [BaseScan #code](https://sepolia.basescan.org/address/0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3#code) • [Verify](https://sepolia.basescan.org/verifyContract?a=0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3) |
| **APayRouter (V1)** | `0x71434344beEF9C44fF3BC95572bEB7bFB8847ec6` | `v0.8.28+commit.7893614a` | 200 runs, viaIR: false | `0000000000000000000000005ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc0000000000000000000000000000000000000000000000000000000000000064` | [BaseScan #code](https://sepolia.basescan.org/address/0x71434344beEF9C44fF3BC95572bEB7bFB8847ec6#code) • [Verify](https://sepolia.basescan.org/verifyContract?a=0x71434344beEF9C44fF3BC95572bEB7bFB8847ec6) |
| **APayRouterV2 (Enterprise)** | `0xD08c8A337E5339d1c083E06d74A9265956ceEA16` | `v0.8.28+commit.7893614a` | 200 runs, viaIR: true | `0000000000000000000000005ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc00000000000000000000000000000000000000000000000000000000000000640000000000000000000000008dd4ff9035c7d4e0bef30aa64fc30d128a4066c3` | [BaseScan #code](https://sepolia.basescan.org/address/0xD08c8A337E5339d1c083E06d74A9265956ceEA16#code) • [Verify](https://sepolia.basescan.org/verifyContract?a=0xD08c8A337E5339d1c083E06d74A9265956ceEA16) |
| **EscrowVault** | `0x3E35a9E802627a3D9A86D6554e72b1C446E34aAF` | `v0.8.28+commit.7893614a` | 200 runs, viaIR: true | *None* | [BaseScan #code](https://sepolia.basescan.org/address/0x3E35a9E802627a3D9A86D6554e72b1C446E34aAF#code) • [Verify](https://sepolia.basescan.org/verifyContract?a=0x3E35a9E802627a3D9A86D6554e72b1C446E34aAF) |
| **StakingVault** | `0xD2f3F4D97f4a3fdC9d4eEDfB9747BF9D80CF6225` | `v0.8.28+commit.7893614a` | 200 runs, viaIR: true | `0000000000000000000000008dd4ff9035c7d4e0bef30aa64fc30d128a4066c30000000000000000000000005ec06f4219c6b44cfe7c91463dd65b7b8e0fbefc` | [BaseScan #code](https://sepolia.basescan.org/address/0xD2f3F4D97f4a3fdC9d4eEDfB9747BF9D80CF6225#code) • [Verify](https://sepolia.basescan.org/verifyContract?a=0xD2f3F4D97f4a3fdC9d4eEDfB9747BF9D80CF6225) |

---

## 🛠️ Verification Options

### Option A: 1-Click Web Verification (BaseScan Web UI)
1. Open the **Verify** link for your target contract from the table above.
2. Select:
   - **Compiler Type**: `Solidity (Standard-Json-Input)`
   - **Compiler Version**: `v0.8.28+commit.7893614a`
   - **Open Source License Type**: `MIT License (MIT)`
3. On Step 2, upload the corresponding Standard-JSON file from `contracts/verification/mainnet/` or `contracts/verification/sepolia/`.
4. Enter Constructor Arguments (if required, copied from the table above).
5. Click **Verify and Publish** — BaseScan matches the bytecode and marks it with a **Green Checkmark (Verified Source Code)**!

### Option B: Automated CLI Verification (Etherscan API V2)
If you have an `ETHERSCAN_API_KEY` (free from [etherscan.io/myapikey](https://etherscan.io/myapikey)):
```bash
# Set key in .env or pass directly
ETHERSCAN_API_KEY=your_api_key npm run contracts:verify:mainnet
ETHERSCAN_API_KEY=your_api_key npm run contracts:verify:sepolia
```

### Option C: Re-generate Verification Manifests
To recompile and update all verification bundles and manifest:
```bash
npm run contracts:verify:generate
```
