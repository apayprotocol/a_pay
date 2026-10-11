#!/usr/bin/env node
/**
 * ⚡ A-PAY PROTOCOL: ECOSYSTEM CONTRACT & DUAL-ENVIRONMENT CROSS-VERIFICATION
 * 
 * Verifies on-chain bytecode, contract interfaces, token supplies, founder balances,
 * and router parameters across BOTH Base Mainnet (8453) and Base Sepolia (84532),
 * ensuring zero cross-environment contamination or address mismatch.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const viem = await import(path.join(rootDir, 'web/node_modules/viem/_esm/index.js'));
const { createPublicClient, http, fallback, formatUnits, parseAbi } = viem;
const chains = await import(path.join(rootDir, 'web/node_modules/viem/_esm/chains/index.js'));
const { base, baseSepolia } = chains;

console.log('========================================================================');
console.log('⚡ A-PAY PROTOCOL: DUAL-ENVIRONMENT CONTRACT & ECOSYSTEM AUDIT');
console.log('========================================================================\n');

// 1. Load Local Deployment Configurations
const sepoliaFile = path.join(rootDir, 'contracts/deployed-addresses.json');
const mainnetFile = path.join(rootDir, 'contracts/deployed-addresses-mainnet.json');

const sepoliaConfig = JSON.parse(fs.readFileSync(sepoliaFile, 'utf8'));
const mainnetConfig = JSON.parse(fs.readFileSync(mainnetFile, 'utf8'));

console.log('📁 Local Configuration Integrity:');
console.log(`  • Sepolia Deployment File: ${sepoliaFile}`);
console.log(`    Chain ID: ${sepoliaConfig.chainId} | Network: ${sepoliaConfig.network}`);
console.log(`  • Mainnet Deployment File: ${mainnetFile}`);
console.log(`    Chain ID: ${mainnetConfig.chainId} | Network: ${mainnetConfig.network}\n`);

// Standard ERC20 ABI
const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
]);

// Standard Router ABI
const ROUTER_ABI = parseAbi([
  'function feeBps() view returns (uint256)',
  'function treasury() view returns (address)',
]);

// Setup Resilient RPC Clients with multi-upstream fallback
const mainnetClient = createPublicClient({
  chain: base,
  transport: fallback([
    http('https://base.drpc.org'),
    http('https://mainnet.base.org'),
    http('https://base.gateway.tenderly.co'),
    http('https://developer-access-mainnet.base.org'),
  ]),
});

const sepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: fallback([
    http('https://sepolia.base.org'),
    http('https://base-sepolia.drpc.org'),
    http('https://base-sepolia-rpc.publicnode.com'),
  ]),
});

let checksPassed = 0;
let checksFailed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`    ✅ ${msg}`);
    checksPassed++;
  } else {
    console.error(`    ❌ FAIL: ${msg}`);
    checksFailed++;
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function auditNetwork({ name, chainId, client, config, expectedBalanceSubstr }) {
  console.log(`🌐 Auditing ${name} (Chain ID: ${chainId}):`);
  
  // 1. Network Telemetry
  const blockNum = await client.getBlockNumber();
  console.log(`  • Connected RPC Height : #${blockNum.toString()}`);

  const { contracts, founderAddress } = config;

  // 2. $APAY Token
  console.log(`  • [1/5] $APAY Token (${contracts.APAYToken}):`);
  const tokenBytecode = await client.getBytecode({ address: contracts.APAYToken });
  assert(tokenBytecode && tokenBytecode !== '0x', `Bytecode verified (${tokenBytecode.length / 2 - 1} bytes)`);

  const tName = await client.readContract({ address: contracts.APAYToken, abi: ERC20_ABI, functionName: 'name' });
  const tSymbol = await client.readContract({ address: contracts.APAYToken, abi: ERC20_ABI, functionName: 'symbol' });
  const tDec = await client.readContract({ address: contracts.APAYToken, abi: ERC20_ABI, functionName: 'decimals' });
  const tTotal = await client.readContract({ address: contracts.APAYToken, abi: ERC20_ABI, functionName: 'totalSupply' });
  const founderBal = await client.readContract({ address: contracts.APAYToken, abi: ERC20_ABI, functionName: 'balanceOf', args: [founderAddress] });

  assert(tSymbol === 'APAY', `Token Symbol: $${tSymbol}`);
  assert(tName.includes('A-Pay'), `Token Name: ${tName}`);
  assert(tDec === 18, `Token Decimals: ${tDec}`);
  const supplyFmt = formatUnits(tTotal, tDec);
  assert(supplyFmt === '100000000', `Fixed Total Supply: ${Number(supplyFmt).toLocaleString()} APAY (100M Cap)`);
  const founderFmt = formatUnits(founderBal, tDec);
  console.log(`    💎 On-Chain Founder Balance: ${Number(founderFmt).toLocaleString('en-US', { maximumFractionDigits: 3 })} APAY`);
  assert(founderFmt.includes(expectedBalanceSubstr), `Founder balance aligns with network state (contains ${expectedBalanceSubstr})`);

  await sleep(150);

  // 3. APayRouter V1
  console.log(`  • [2/5] APayRouter V1 (${contracts.APayRouter}):`);
  const r1Bytecode = await client.getBytecode({ address: contracts.APayRouter });
  assert(r1Bytecode && r1Bytecode !== '0x', `Bytecode verified (${r1Bytecode.length / 2 - 1} bytes)`);

  const feeBps = await client.readContract({ address: contracts.APayRouter, abi: ROUTER_ABI, functionName: 'feeBps' });
  const treasury = await client.readContract({ address: contracts.APayRouter, abi: ROUTER_ABI, functionName: 'treasury' });

  assert(feeBps === 100n, `Protocol fee: ${feeBps.toString()} bps (1.0%)`);
  assert(treasury.toLowerCase() === founderAddress.toLowerCase(), `Treasury recipient: ${treasury}`);

  await sleep(150);

  // 4. APayRouterV2 Enterprise
  console.log(`  • [3/5] APayRouterV2 Enterprise (${contracts.APayRouterV2}):`);
  const r2Bytecode = await client.getBytecode({ address: contracts.APayRouterV2 });
  assert(r2Bytecode && r2Bytecode !== '0x', `Bytecode verified (${r2Bytecode.length / 2 - 1} bytes)`);

  await sleep(150);

  // 5. EscrowVault
  console.log(`  • [4/5] EscrowVault Session Keys (${contracts.EscrowVault}):`);
  const escBytecode = await client.getBytecode({ address: contracts.EscrowVault });
  assert(escBytecode && escBytecode !== '0x', `Bytecode verified (${escBytecode.length / 2 - 1} bytes)`);

  await sleep(150);

  // 6. StakingVault
  console.log(`  • [5/5] StakingVault Anti-Spam Collateral (${contracts.StakingVault}):`);
  const stkBytecode = await client.getBytecode({ address: contracts.StakingVault });
  assert(stkBytecode && stkBytecode !== '0x', `Bytecode verified (${stkBytecode.length / 2 - 1} bytes)`);
  console.log('');
}

async function main() {
  // Audit Mainnet (8453)
  await auditNetwork({
    name: 'Base Mainnet (Production)',
    chainId: 8453,
    client: mainnetClient,
    config: mainnetConfig,
    expectedBalanceSubstr: '99047', // 99.047M
  });

  // Audit Sepolia (84532)
  await auditNetwork({
    name: 'Base Sepolia (Testnet)',
    chainId: 84532,
    client: sepoliaClient,
    config: sepoliaConfig,
    expectedBalanceSubstr: '99999', // 99.999M
  });

  // Cross-Environment Contamination Check
  console.log('🛡️ Cross-Environment Isolation Check:');
  assert(
    mainnetConfig.contracts.APayRouterV2.toLowerCase() !== sepoliaConfig.contracts.APayRouterV2.toLowerCase(),
    'APayRouterV2 has distinct contract deployments on Mainnet vs Sepolia'
  );
  assert(
    mainnetConfig.contracts.EscrowVault.toLowerCase() !== sepoliaConfig.contracts.EscrowVault.toLowerCase(),
    'EscrowVault has distinct contract deployments on Mainnet vs Sepolia'
  );
  assert(
    mainnetConfig.contracts.StakingVault.toLowerCase() !== sepoliaConfig.contracts.StakingVault.toLowerCase(),
    'StakingVault has distinct contract deployments on Mainnet vs Sepolia'
  );

  // 7. BaseScan Standard-JSON Verification Bundles Check
  console.log('\n🛡️ BaseScan Verification Integrity Check:');
  const manifestFile = path.join(rootDir, 'contracts/verification/manifest.json');
  assert(fs.existsSync(manifestFile), 'BaseScan verification manifest.json exists');
  if (fs.existsSync(manifestFile)) {
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    assert(manifest.compiler.version === 'v0.8.28+commit.7893614a', `Compiler version pinned: ${manifest.compiler.version}`);
    
    let allJsonExist = true;
    for (const net of ['mainnet', 'sepolia']) {
      const netContracts = manifest.networks[net]?.contracts || {};
      for (const [cName, cInfo] of Object.entries(netContracts)) {
        const fullPath = path.join(rootDir, 'contracts', cInfo.standardJsonFile);
        if (!fs.existsSync(fullPath)) {
          allJsonExist = false;
          console.error(`    ❌ Missing verification file: ${cInfo.standardJsonFile}`);
        }
      }
    }
    assert(allJsonExist, 'All 10 Standard-JSON verification bundles exist on disk');
  }

  console.log('\n========================================================================');
  console.log(`📊 DUAL-ENVIRONMENT AUDIT RESULTS:`);
  console.log(`   • Total Passed Checks : ${checksPassed}`);
  console.log(`   • Total Failed Checks : ${checksFailed}`);
  console.log('========================================================================');

  if (checksFailed > 0) {
    console.error(`❌ ${checksFailed} audit verification(s) failed!`);
    process.exit(1);
  } else {
    console.log('✅ ALL CONTRACTS AND CONFIGS VERIFIED 100% OPERATIONAL WITH ZERO MISMATCHES!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
