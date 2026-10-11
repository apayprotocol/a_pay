import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeAbiParameters, parseAbiParameters } from 'viem';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractsDir = path.resolve(__dirname, '..');
const srcDir = path.join(contractsDir, 'src');
const verificationDir = path.join(contractsDir, 'verification');

const COMPILER_VERSION = 'v0.8.28+commit.7893614a';
const SOLC_VERSION_SHORT = '0.8.28';
const LICENSE_TYPE = '3'; // MIT

const mainnetConfig = JSON.parse(
  fs.readFileSync(path.join(contractsDir, 'deployed-addresses-mainnet.json'), 'utf8')
);
const sepoliaConfig = JSON.parse(
  fs.readFileSync(path.join(contractsDir, 'deployed-addresses.json'), 'utf8')
);

// Ensure output directories exist
const mainnetOutDir = path.join(verificationDir, 'mainnet');
const sepoliaOutDir = path.join(verificationDir, 'sepolia');
fs.mkdirSync(mainnetOutDir, { recursive: true });
fs.mkdirSync(sepoliaOutDir, { recursive: true });

function getSource(relPath) {
  const fullPath = path.join(srcDir, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Source file missing: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function buildStandardJson({ sourceKey, content, runs, viaIR }) {
  const settings = {
    optimizer: {
      enabled: true,
      runs: runs || 200,
    },
    outputSelection: {
      '*': {
        '*': ['*'],
      },
    },
  };
  if (viaIR !== undefined) {
    settings.viaIR = Boolean(viaIR);
  }

  return {
    language: 'Solidity',
    sources: {
      [sourceKey]: {
        content,
      },
    },
    settings,
  };
}

const manifest = {
  protocol: 'A-Pay Protocol',
  generatedAt: new Date().toISOString(),
  compiler: {
    version: COMPILER_VERSION,
    solcVersion: SOLC_VERSION_SHORT,
    license: 'MIT',
  },
  networks: {
    mainnet: {
      chainId: 8453,
      name: 'Base Mainnet',
      explorerUrl: 'https://basescan.org',
      verifyUrl: 'https://basescan.org/verifyContract',
      contracts: {},
    },
    sepolia: {
      chainId: 84532,
      name: 'Base Sepolia Testnet',
      explorerUrl: 'https://sepolia.basescan.org',
      verifyUrl: 'https://sepolia.basescan.org/verifyContract',
      contracts: {},
    },
  },
};

// 1. GENERATE MAINNET BUNDLES
console.log('📦 Generating Base Mainnet (8453) Verification Bundles:');
const mFounder = mainnetConfig.founderAddress;
const mToken = mainnetConfig.contracts.APAYToken;

const mainnetContracts = [
  {
    name: 'APAYToken',
    sourceFile: 'APAYToken.sol',
    sourceKey: 'APAYToken.sol',
    address: mainnetConfig.contracts.APAYToken,
    runs: 200,
    viaIR: true,
    constructorArgs: '',
  },
  {
    name: 'APayRouter',
    sourceFile: 'APayRouter.sol',
    sourceKey: 'APayRouter.sol',
    address: mainnetConfig.contracts.APayRouter,
    runs: 200,
    viaIR: true,
    constructorArgs: encodeAbiParameters(parseAbiParameters('address, uint256'), [
      mFounder,
      100n,
    ]).slice(2),
  },
  {
    name: 'APayRouterV2',
    sourceFile: 'APayRouterV2.sol',
    sourceKey: 'APayRouterV2.sol',
    address: mainnetConfig.contracts.APayRouterV2,
    runs: 200,
    viaIR: true,
    constructorArgs: encodeAbiParameters(parseAbiParameters('address, uint256, address'), [
      mFounder,
      100n,
      mToken,
    ]).slice(2),
  },
  {
    name: 'EscrowVault',
    sourceFile: 'EscrowVault.sol',
    sourceKey: 'EscrowVault.sol',
    address: mainnetConfig.contracts.EscrowVault,
    runs: 200,
    viaIR: true,
    constructorArgs: '',
  },
  {
    name: 'StakingVault',
    sourceFile: 'StakingVault.sol',
    sourceKey: 'StakingVault.sol',
    address: mainnetConfig.contracts.StakingVault,
    runs: 200,
    viaIR: true,
    constructorArgs: encodeAbiParameters(parseAbiParameters('address, address'), [
      mToken,
      mFounder,
    ]).slice(2),
  },
];

for (const c of mainnetContracts) {
  const content = getSource(c.sourceFile);
  const stdJson = buildStandardJson({
    sourceKey: c.sourceKey,
    content,
    runs: c.runs,
    viaIR: c.viaIR,
  });

  const outPath = path.join(mainnetOutDir, `${c.name}-standard-input.json`);
  fs.writeFileSync(outPath, JSON.stringify(stdJson, null, 2));

  // Also write single-file source for direct upload
  const singleFilePath = path.join(mainnetOutDir, `${c.name}.sol`);
  fs.writeFileSync(singleFilePath, content);

  const contractEntry = {
    address: c.address,
    contractName: c.name,
    contractPath: `${c.sourceKey}:${c.name}`,
    compilerVersion: COMPILER_VERSION,
    optimizationUsed: 1,
    runs: c.runs,
    viaIR: c.viaIR,
    constructorArguments: c.constructorArgs,
    standardJsonFile: path.relative(contractsDir, outPath),
    singleFile: path.relative(contractsDir, singleFilePath),
    explorerUrl: `https://basescan.org/address/${c.address}#code`,
    verifyUrl: `https://basescan.org/verifyContract?a=${c.address}`,
  };

  manifest.networks.mainnet.contracts[c.name] = contractEntry;
  console.log(`  ✅ ${c.name.padEnd(14)} (${c.address}): Generated -> ${outPath}`);
}

// 2. GENERATE SEPOLIA BUNDLES
console.log('\n📦 Generating Base Sepolia (84532) Verification Bundles:');
const sFounder = sepoliaConfig.founderAddress;
const sToken = sepoliaConfig.contracts.APAYToken;

const sepoliaContracts = [
  {
    name: 'APAYToken',
    sourceFile: 'APAYToken.sol',
    sourceKey: 'APAYToken.sol',
    address: sepoliaConfig.contracts.APAYToken,
    runs: 200,
    viaIR: false,
    constructorArgs: '',
  },
  {
    name: 'APayRouter',
    sourceFile: 'legacy/APayRouterSepolia.sol',
    sourceKey: 'APayRouter.sol',
    address: sepoliaConfig.contracts.APayRouter,
    runs: 200,
    viaIR: false,
    constructorArgs: encodeAbiParameters(parseAbiParameters('address, uint256'), [
      sFounder,
      100n,
    ]).slice(2),
  },
  {
    name: 'APayRouterV2',
    sourceFile: 'APayRouterV2.sol',
    sourceKey: 'APayRouterV2.sol',
    address: sepoliaConfig.contracts.APayRouterV2,
    runs: 200,
    viaIR: true,
    constructorArgs: encodeAbiParameters(parseAbiParameters('address, uint256, address'), [
      sFounder,
      100n,
      sToken,
    ]).slice(2),
  },
  {
    name: 'EscrowVault',
    sourceFile: 'EscrowVault.sol',
    sourceKey: 'EscrowVault.sol',
    address: sepoliaConfig.contracts.EscrowVault,
    runs: 200,
    viaIR: true,
    constructorArgs: '',
  },
  {
    name: 'StakingVault',
    sourceFile: 'StakingVault.sol',
    sourceKey: 'StakingVault.sol',
    address: sepoliaConfig.contracts.StakingVault,
    runs: 200,
    viaIR: true,
    constructorArgs: encodeAbiParameters(parseAbiParameters('address, address'), [
      sToken,
      sFounder,
    ]).slice(2),
  },
];

for (const c of sepoliaContracts) {
  const content = getSource(c.sourceFile);
  const stdJson = buildStandardJson({
    sourceKey: c.sourceKey,
    content,
    runs: c.runs,
    viaIR: c.viaIR,
  });

  const outPath = path.join(sepoliaOutDir, `${c.name}-standard-input.json`);
  fs.writeFileSync(outPath, JSON.stringify(stdJson, null, 2));

  // Also write single-file source
  const singleFilePath = path.join(sepoliaOutDir, `${c.name}.sol`);
  fs.writeFileSync(singleFilePath, content);

  const contractEntry = {
    address: c.address,
    contractName: c.name,
    contractPath: `${c.sourceKey}:${c.name}`,
    compilerVersion: COMPILER_VERSION,
    optimizationUsed: 1,
    runs: c.runs,
    viaIR: c.viaIR,
    constructorArguments: c.constructorArgs,
    standardJsonFile: path.relative(contractsDir, outPath),
    singleFile: path.relative(contractsDir, singleFilePath),
    explorerUrl: `https://sepolia.basescan.org/address/${c.address}#code`,
    verifyUrl: `https://sepolia.basescan.org/verifyContract?a=${c.address}`,
  };

  manifest.networks.sepolia.contracts[c.name] = contractEntry;
  console.log(`  ✅ ${c.name.padEnd(14)} (${c.address}): Generated -> ${outPath}`);
}

const manifestPath = path.join(verificationDir, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\n🎉 Verification manifest successfully generated: ${manifestPath}`);

// Mirror to web app for public developer downloads & API access
const webPublicContracts = path.resolve(contractsDir, '../web/public/contracts');
const webConfigDir = path.resolve(contractsDir, '../web/src/config');
if (fs.existsSync(path.resolve(contractsDir, '../web'))) {
  fs.mkdirSync(path.join(webPublicContracts, 'mainnet'), { recursive: true });
  fs.mkdirSync(path.join(webPublicContracts, 'sepolia'), { recursive: true });
  
  // Copy all files from verification/ to web/public/contracts/
  for (const net of ['mainnet', 'sepolia']) {
    const netDir = path.join(verificationDir, net);
    if (fs.existsSync(netDir)) {
      for (const file of fs.readdirSync(netDir)) {
        fs.copyFileSync(path.join(netDir, file), path.join(webPublicContracts, net, file));
      }
    }
  }
  fs.copyFileSync(manifestPath, path.join(webPublicContracts, 'manifest.json'));
  if (fs.existsSync(webConfigDir)) {
    fs.copyFileSync(manifestPath, path.join(webConfigDir, 'contracts-manifest.json'));
  }
  console.log(`✨ Mirrored verification files to web/public/contracts and web/src/config/contracts-manifest.json`);
}

