import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export function syncAddresses({
  APAYToken,
  APayRouter,
  APayRouterV2,
  EscrowVault,
  StakingVault,
  founderAddress = '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc',
  network = 'baseSepolia',
  chainId = 84532,
}) {
  const updatedFiles = [];

  const isMainnet = chainId === 8453 || network === 'base';

  // 1. contracts/deployed-addresses.json (or deployed-addresses-mainnet.json)
  const deployedFileName = isMainnet ? 'deployed-addresses-mainnet.json' : 'deployed-addresses.json';
  const deployedPath = path.join(rootDir, `contracts/${deployedFileName}`);
  const deployedData = {
    network,
    chainId,
    founderAddress,
    contracts: {
      APAYToken: APAYToken || '0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3',
      APayRouter: APayRouter || '0x71434344beEF9C44fF3BC95572bEB7bFB8847ec6',
      APayRouterV2: APayRouterV2,
      EscrowVault: EscrowVault,
      StakingVault: StakingVault || '0xD2f3F4D97f4a3fdC9d4eEDfB9747BF9D80CF6225',
    },
    parameters: {
      feeBps: 100,
      feePercentage: '1.0%',
      tokenSupply: '100,000,000 APAY',
      minStakeBond: '500 APAY',
    },
  };
  fs.writeFileSync(deployedPath, JSON.stringify(deployedData, null, 2) + '\n');
  updatedFiles.push(`contracts/${deployedFileName}`);

  // 2. web/src/config/contracts.ts (Target isolated network block)
  const webContractsPath = path.join(rootDir, 'web/src/config/contracts.ts');
  if (fs.existsSync(webContractsPath)) {
    let content = fs.readFileSync(webContractsPath, 'utf8');
    const targetKey = isMainnet ? "'base-mainnet'" : "'base-sepolia'";
    const blockStartIdx = content.indexOf(targetKey);

    if (blockStartIdx !== -1) {
      const nextBlockIdx = isMainnet
        ? content.indexOf('};', blockStartIdx)
        : content.indexOf("'base-mainnet':", blockStartIdx);
      const endIndex = nextBlockIdx !== -1 ? nextBlockIdx : content.length;
      let block = content.slice(blockStartIdx, endIndex);

      if (APAYToken) {
        block = block.replace(
          /(APAYToken:[\s\S]*?address: ')(0x[a-fA-F0-9]{40})(')/,
          `$1${APAYToken}$3`,
        );
      }
      if (APayRouter) {
        block = block.replace(
          /(APayRouter:[\s\S]*?address: ')(0x[a-fA-F0-9]{40})(')/,
          `$1${APayRouter}$3`,
        );
      }
      if (APayRouterV2) {
        block = block.replace(
          /(APayRouterV2:[\s\S]*?address: ')(0x[a-fA-F0-9]{40})(')/,
          `$1${APayRouterV2}$3`,
        );
        if (APAYToken) {
          block = block.replace(
            /(APayRouterV2:[\s\S]*?apayToken: ')(0x[a-fA-F0-9]{40})(')/,
            `$1${APAYToken}$3`,
          );
        }
      }
      if (EscrowVault) {
        block = block.replace(
          /(EscrowVault:[\s\S]*?address: ')(0x[a-fA-F0-9]{40})(')/,
          `$1${EscrowVault}$3`,
        );
      }
      if (StakingVault) {
        block = block.replace(
          /(StakingVault:[\s\S]*?address: ')(0x[a-fA-F0-9]{40})(')/,
          `$1${StakingVault}$3`,
        );
      }

      content = content.slice(0, blockStartIdx) + block + content.slice(endIndex);
      fs.writeFileSync(webContractsPath, content);
      updatedFiles.push('web/src/config/contracts.ts');
    }
  }

  // 3. src/apay/escrow.py
  const escrowPyPath = path.join(rootDir, 'src/apay/escrow.py');
  if (fs.existsSync(escrowPyPath) && EscrowVault) {
    let content = fs.readFileSync(escrowPyPath, 'utf8');
    content = content.replace(
      /ESCROW_VAULT_ADDRESS = "0x[a-fA-F0-9]{40}"/,
      `ESCROW_VAULT_ADDRESS = "${EscrowVault}"`
    );
    fs.writeFileSync(escrowPyPath, content);
    updatedFiles.push('src/apay/escrow.py');
  }

  // 4. src/apay/relayer.py
  const relayerPyPath = path.join(rootDir, 'src/apay/relayer.py');
  if (fs.existsSync(relayerPyPath) && APayRouterV2) {
    let content = fs.readFileSync(relayerPyPath, 'utf8');
    content = content.replace(
      /DEFAULT_ROUTER_V2_ADDRESS = "0x[a-fA-F0-9]{40}"/,
      `DEFAULT_ROUTER_V2_ADDRESS = "${APayRouterV2}"`
    );
    fs.writeFileSync(relayerPyPath, content);
    updatedFiles.push('src/apay/relayer.py');
  }

  // 5. src/apay/staking.py
  const stakingPyPath = path.join(rootDir, 'src/apay/staking.py');
  if (fs.existsSync(stakingPyPath) && StakingVault) {
    let content = fs.readFileSync(stakingPyPath, 'utf8');
    content = content.replace(
      /DEFAULT_STAKING_VAULT_ADDRESS = "0x[a-fA-F0-9]{40}"/,
      `DEFAULT_STAKING_VAULT_ADDRESS = "${StakingVault}"`
    );
    fs.writeFileSync(stakingPyPath, content);
    updatedFiles.push('src/apay/staking.py');
  }

  // 6. tests/test_scalability_v2.py
  const testV2Path = path.join(rootDir, 'tests/test_scalability_v2.py');
  if (fs.existsSync(testV2Path) && APayRouterV2) {
    let content = fs.readFileSync(testV2Path, 'utf8');
    content = content.replace(
      /router_v2_address="0x[a-fA-F0-9]{40}"/g,
      `router_v2_address="${APayRouterV2}"`
    );
    fs.writeFileSync(testV2Path, content);
    updatedFiles.push('tests/test_scalability_v2.py');
  }

  return updatedFiles;
}
