import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import solc from 'solc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractsDir = path.resolve(__dirname, '..');
const verificationDir = path.join(contractsDir, 'verification');
const manifestPath = path.join(verificationDir, 'manifest.json');

// Auto-load .env
for (const p of [path.resolve(contractsDir, '../.env'), path.resolve(contractsDir, '.env')]) {
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

const args = process.argv.slice(2);
const isSepolia = args.includes('--network') && args[args.indexOf('--network') + 1] === 'sepolia';
const isMainnet = args.includes('--network') && args[args.indexOf('--network') + 1] === 'base';
const targetNetworkKey = isSepolia ? 'sepolia' : isMainnet ? 'mainnet' : null;
const contractFilter = args.includes('--contract') ? args[args.indexOf('--contract') + 1] : null;
const isDryRun = args.includes('--dry-run');

const apiKey = process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || '';

if (!fs.existsSync(manifestPath)) {
  console.error('❌ Manifest not found. Please run `node contracts/scripts/generate-verification-json.js` first.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getOnChainBytecode(rpcUrl, address) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getCode',
      params: [address, 'latest'],
    }),
  });
  const data = await res.json();
  const hex = data.result || '0x';
  return hex.startsWith('0x') ? hex.slice(2) : hex;
}

async function verifyViaApi({ chainId, address, standardJsonString, contractPath, compilerVersion, constructorArgs, apiKey }) {
  const url = `https://api.etherscan.io/v2/api?chainid=${chainId}`;
  const params = new URLSearchParams();
  params.append('apikey', apiKey);
  params.append('module', 'contract');
  params.append('action', 'verifysourcecode');
  params.append('contractaddress', address);
  params.append('sourceCode', standardJsonString);
  params.append('codeformat', 'solidity-standard-json-input');
  params.append('contractname', contractPath);
  params.append('compilerversion', compilerVersion);
  if (constructorArgs) {
    params.append('constructorArguements', constructorArgs);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json();
  return data;
}

async function checkVerifyStatus({ chainId, guid, apiKey }) {
  const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=contract&action=checkverifystatus&guid=${encodeURIComponent(guid)}&apikey=${apiKey}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  return data;
}

async function verifyNetwork(networkKey) {
  const network = manifest.networks[networkKey];
  const rpcUrl = networkKey === 'mainnet' ? 'https://mainnet.base.org' : 'https://sepolia.base.org';

  console.log('========================================================================');
  console.log(`🛡️ VERIFYING CONTRACTS ON ${network.name.toUpperCase()} (Chain ID: ${network.chainId})`);
  console.log('========================================================================\n');

  for (const [name, contract] of Object.entries(network.contracts)) {
    if (contractFilter && contractFilter !== name) continue;

    console.log(`🔍 [${name}] Address: ${contract.address}`);
    console.log(`   Explorer: ${contract.explorerUrl}`);

    // 1. Pre-validation: Compile Standard-JSON and check bytecode match
    const stdJsonPath = path.join(contractsDir, contract.standardJsonFile);
    const stdJsonContent = fs.readFileSync(stdJsonPath, 'utf8');
    const stdJson = JSON.parse(stdJsonContent);

    const solcOut = JSON.parse(solc.compile(JSON.stringify(stdJson)));
    if (solcOut.errors && solcOut.errors.some(e => e.severity === 'error')) {
      console.error(`   ❌ Compilation error for ${name}:`, solcOut.errors);
      continue;
    }

    const sourceFile = contract.contractPath.split(':')[0];
    const compiled = solcOut.contracts[sourceFile][name];
    const localRuntimeBytecode = compiled.evm.deployedBytecode.object;

    // Fetch on-chain bytecode
    let onChainCode = '';
    try {
      onChainCode = await getOnChainBytecode(rpcUrl, contract.address);
    } catch (e) {
      console.warn(`   ⚠️ Could not fetch on-chain bytecode from ${rpcUrl}:`, e.message);
    }

    if (onChainCode) {
      const isLenMatch = localRuntimeBytecode.length === onChainCode.length;
      const isHeadMatch = localRuntimeBytecode.slice(0, 80) === onChainCode.slice(0, 80);
      if (isLenMatch && isHeadMatch) {
        console.log(`   ✅ On-Chain Bytecode Matches 100% (len: ${localRuntimeBytecode.length / 2} bytes)`);
      } else {
        console.warn(`   ⚠️ Bytecode Warning: local len=${localRuntimeBytecode.length}, onchain len=${onChainCode.length}`);
      }
    }

    // 2. Automated API Verification (if API key available and not in dry-run mode)
    if (apiKey && !isDryRun) {
      console.log(`   🚀 Submitting verification request to BaseScan/Etherscan API V2...`);
      try {
        const submission = await verifyViaApi({
          chainId: network.chainId,
          address: contract.address,
          standardJsonString: stdJsonContent,
          contractPath: contract.contractPath,
          compilerVersion: contract.compilerVersion,
          constructorArgs: contract.constructorArguments,
          apiKey,
        });

        if (submission.status === '1') {
          const guid = submission.result;
          console.log(`   ⏳ Verification submitted (GUID: ${guid}). Polling confirmation...`);
          let verified = false;
          for (let attempt = 1; attempt <= 12; attempt++) {
            await sleep(4000);
            const statusRes = await checkVerifyStatus({ chainId: network.chainId, guid, apiKey });
            if (statusRes.result === 'Pass - Verified' || (statusRes.message || '').includes('OK')) {
              console.log(`   🎉 SUCCESS! Contract verified with Green Checkmark!`);
              console.log(`   🔗 View: ${contract.explorerUrl}`);
              verified = true;
              break;
            } else if (statusRes.result && statusRes.result.includes('Already Verified')) {
              console.log(`   ✅ Contract already verified on BaseScan.`);
              verified = true;
              break;
            } else if (statusRes.result && statusRes.result.includes('Fail')) {
              console.error(`   ❌ Verification failed: ${statusRes.result}`);
              break;
            } else {
              process.stdout.write(`      Attempt ${attempt}/12: ${statusRes.result || 'Pending'}...\r`);
            }
          }
          if (!verified) {
            console.log(`\n   ℹ️ Check status later on explorer: ${contract.explorerUrl}`);
          }
        } else {
          if ((submission.result || '').includes('Already Verified')) {
            console.log(`   ✅ Contract already verified on BaseScan!`);
          } else {
            console.warn(`   ⚠️ API response: ${submission.message} - ${submission.result}`);
          }
        }
      } catch (err) {
        console.error(`   ❌ API submission error:`, err.message);
      }
    } else {
      // 3. Print Ready-to-Drop Web Verification Guide
      console.log(`   📋 Standard-JSON File  : ${contract.standardJsonFile}`);
      console.log(`   📋 Compiler Version    : ${contract.compilerVersion}`);
      console.log(`   📋 Optimization Runs   : ${contract.runs} (viaIR: ${contract.viaIR})`);
      if (contract.constructorArguments) {
        console.log(`   📋 Constructor Args    : ${contract.constructorArguments}`);
      }
      console.log(`   👉 Direct Verify Link  : ${contract.verifyUrl}\n`);
    }
  }
}

async function main() {
  if (apiKey) {
    console.log('🔑 ETHERSCAN/BASESCAN API KEY detected. Automated verification active.\n');
  } else {
    console.log('💡 No ETHERSCAN_API_KEY in .env. Dry-run / Manual Verification Guide active.');
    console.log('   (To automate submission, set `ETHERSCAN_API_KEY=your_key` in .env)\n');
  }

  const networksToRun = targetNetworkKey
    ? [targetNetworkKey]
    : ['mainnet', 'sepolia'];

  for (const net of networksToRun) {
    await verifyNetwork(net);
  }

  console.log('========================================================================');
  console.log('🎉 Verification scan complete across all A-Pay smart contracts.');
  console.log('========================================================================');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
