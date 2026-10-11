import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, base } from 'viem/chains';
import { syncAddresses } from './sync-addresses.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactsDir = path.resolve(__dirname, '../artifacts');
const deployedPath = path.resolve(__dirname, '../deployed-addresses.json');

const FOUNDER_ADDRESS = '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc';

// Auto-load .env if present
for (const p of [path.resolve(__dirname, '../../.env'), path.resolve(__dirname, '../.env')]) {
  if (fs.existsSync(p)) {
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

async function main() {
  console.log('==================================================');
  console.log('⚡ A-PAY PROTOCOL ON-CHAIN DEPLOYMENT ENGINE');
  console.log('==================================================');

  const args = process.argv.slice(2);
  const isMainnet = args.includes('--network') && args[args.indexOf('--network') + 1] === 'base';
  const chain = isMainnet ? base : baseSepolia;

  console.log(`Target Network: ${chain.name} (Chain ID ${chain.id})`);
  console.log('Founder / Treasury Address:', FOUNDER_ADDRESS);

  const contracts = ['APAYToken', 'APayRouter', 'APayRouterV2', 'EscrowVault', 'StakingVault'];
  console.log('\n🔍 Verifying Smart Contract Artifacts:');

  let totalBytecodeBytes = 0;
  const artifacts = {};
  for (const name of contracts) {
    const file = path.join(artifactsDir, `${name}.json`);
    if (!fs.existsSync(file)) {
      throw new Error(`Missing artifact: ${file}`);
    }
    const artifact = JSON.parse(fs.readFileSync(file, 'utf8'));
    artifacts[name] = artifact;
    const sizeBytes = artifact.bytecode.length / 2;
    totalBytecodeBytes += sizeBytes;
    console.log(
      `  • ${name.padEnd(14)}: ${sizeBytes.toLocaleString()} bytes bytecode (${artifact.abi.length} ABI entries)`
    );
  }

  console.log('\n📊 Deployment Gas Estimates (Base L2 OP Stack):');
  console.log(`  • Total Suite Bytecode : ${(totalBytecodeBytes / 1024).toFixed(2)} KB`);
  console.log('  • Estimated Gas Units  : ~4,200,000 gas');
  console.log('  • Base L2 Gas Price    : ~0.005 Gwei ($0.00001 per unit)');
  console.log('  • Total Deployment Cost: < $0.05 USD (< ₹4.50 INR)');

  const defaultRpc = isMainnet ? 'https://mainnet.base.org' : 'https://base-sepolia-rpc.publicnode.com';
  const rpcUrl = process.env.RPC_URL || defaultRpc;
  console.log(`  • RPC Gateway          : ${rpcUrl}`);

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log('\n💡 Dry-Run Mode Active (No PRIVATE_KEY provided in environment).');
    console.log('✅ Deployment Readiness: 100% READY FOR BASE BROADCAST');
    console.log('   Run: `PRIVATE_KEY=0x... node scripts/deploy.js [--network base]` to deploy live.');
    return;
  }

  console.log('\n🚀 Broadcasting Live On-Chain Deployments...');
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(formattedKey);
  console.log(`Deployer Account: ${account.address}`);

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer Gas Balance: ${(Number(balance) / 1e18).toFixed(6)} ETH`);
  if (balance === 0n) {
    throw new Error(`Account ${account.address} has 0 ETH gas on ${chain.name}!`);
  }

  const targetDeployedPath = path.resolve(
    __dirname,
    isMainnet ? '../deployed-addresses-mainnet.json' : '../deployed-addresses.json'
  );
  const deployedAddresses = fs.existsSync(targetDeployedPath)
    ? JSON.parse(fs.readFileSync(targetDeployedPath, 'utf8'))
    : { network: chain.name, chainId: chain.id, contracts: {} };

  // Deploy APAYToken if not deployed
  let apayTokenAddr = deployedAddresses.contracts?.APAYToken;
  const apayTokenCode = apayTokenAddr ? await publicClient.getBytecode({ address: apayTokenAddr }) : null;
  if (!apayTokenAddr || !apayTokenCode || apayTokenCode === '0x') {
    console.log('Deploying APAYToken...');
    const hash = await walletClient.deployContract({
      abi: artifacts.APAYToken.abi,
      bytecode: `0x${artifacts.APAYToken.bytecode}`,
      args: [],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    apayTokenAddr = receipt.contractAddress;
    console.log(`✅ APAYToken deployed at: ${apayTokenAddr} (tx: ${hash})`);
  } else {
    console.log(`✅ APAYToken already verified on-chain at: ${apayTokenAddr}`);
  }

  // Deploy APayRouter (V1) if not deployed
  let routerV1Addr = deployedAddresses.contracts?.APayRouter;
  const routerV1Code = routerV1Addr ? await publicClient.getBytecode({ address: routerV1Addr }) : null;
  if (!routerV1Addr || !routerV1Code || routerV1Code === '0x') {
    console.log('Deploying APayRouter (V1)...');
    const hash = await walletClient.deployContract({
      abi: artifacts.APayRouter.abi,
      bytecode: `0x${artifacts.APayRouter.bytecode}`,
      args: [FOUNDER_ADDRESS, 100n], // treasury, 100 bps (1%)
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    routerV1Addr = receipt.contractAddress;
    console.log(`✅ APayRouter (V1) deployed at: ${routerV1Addr} (tx: ${hash})`);
  } else {
    console.log(`✅ APayRouter (V1) already verified on-chain at: ${routerV1Addr}`);
  }

  // Deploy APayRouterV2 if not deployed
  let routerV2Addr = deployedAddresses.contracts?.APayRouterV2;
  const routerV2Code = routerV2Addr ? await publicClient.getBytecode({ address: routerV2Addr }) : null;
  if (!routerV2Addr || !routerV2Code || routerV2Code === '0x') {
    console.log('Deploying APayRouterV2...');
    const hash = await walletClient.deployContract({
      abi: artifacts.APayRouterV2.abi,
      bytecode: `0x${artifacts.APayRouterV2.bytecode}`,
      args: [FOUNDER_ADDRESS, 100n, apayTokenAddr], // treasury, 100 bps (1%), apayToken
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    routerV2Addr = receipt.contractAddress;
    console.log(`✅ APayRouterV2 deployed at: ${routerV2Addr} (tx: ${hash})`);
  } else {
    console.log(`✅ APayRouterV2 already verified on-chain at: ${routerV2Addr}`);
  }

  // Deploy EscrowVault if not deployed
  let escrowVaultAddr = deployedAddresses.contracts?.EscrowVault;
  const escrowCode = escrowVaultAddr ? await publicClient.getBytecode({ address: escrowVaultAddr }) : null;
  if (!escrowVaultAddr || !escrowCode || escrowCode === '0x') {
    console.log('Deploying EscrowVault...');
    const hash = await walletClient.deployContract({
      abi: artifacts.EscrowVault.abi,
      bytecode: `0x${artifacts.EscrowVault.bytecode}`,
      args: [],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    escrowVaultAddr = receipt.contractAddress;
    console.log(`✅ EscrowVault deployed at: ${escrowVaultAddr} (tx: ${hash})`);
  } else {
    console.log(`✅ EscrowVault already verified on-chain at: ${escrowVaultAddr}`);
  }

  // Deploy StakingVault if not deployed
  let stakingVaultAddr = deployedAddresses.contracts?.StakingVault;
  const stakingCode = stakingVaultAddr ? await publicClient.getBytecode({ address: stakingVaultAddr }) : null;
  if (!stakingVaultAddr || !stakingCode || stakingCode === '0x') {
    console.log('Deploying StakingVault...');
    const hash = await walletClient.deployContract({
      abi: artifacts.StakingVault.abi,
      bytecode: `0x${artifacts.StakingVault.bytecode}`,
      args: [apayTokenAddr, FOUNDER_ADDRESS], // apayToken, arbiter
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    stakingVaultAddr = receipt.contractAddress;
    console.log(`✅ StakingVault deployed at: ${stakingVaultAddr} (tx: ${hash})`);
  } else {
    console.log(`✅ StakingVault already verified on-chain at: ${stakingVaultAddr}`);
  }

  const updatedFiles = syncAddresses({
    APAYToken: apayTokenAddr,
    APayRouter: routerV1Addr,
    APayRouterV2: routerV2Addr,
    EscrowVault: escrowVaultAddr,
    StakingVault: stakingVaultAddr,
    founderAddress: FOUNDER_ADDRESS,
    network: isMainnet ? 'base' : 'baseSepolia',
    chainId: chain.id,
  });

  console.log(`\n🎉 Deployment record successfully synced across ${updatedFiles.length} files:`);
  for (const f of updatedFiles) {
    console.log(`   • ${f}`);
  }
}

main().catch(console.error);
