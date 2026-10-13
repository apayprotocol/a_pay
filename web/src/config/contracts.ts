export type NetworkId = 'base-sepolia' | 'base-mainnet';

interface ChainConfig {
  id: NetworkId;
  chainId: number;
  chainName: string;
  shortName: string;
  isTestnet: boolean;
  rpcUrl: string;
  explorerUrl: string;
  currency: string;
}

export interface NetworkContracts {
  chain: ChainConfig;
  APAYToken: {
    address: `0x${string}`;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
  };
  USDC: {
    address: `0x${string}`;
    name: string;
    symbol: string;
    decimals: number;
  };
  APayRouter: {
    address: `0x${string}`;
    feeBps: number;
    feePercent: string;
    treasury: `0x${string}`;
  };
  APayRouterV2: {
    address: `0x${string}`;
    name: string;
    feeBps: number;
    feePercent: string;
    treasury: `0x${string}`;
    apayToken: `0x${string}`;
  };
  EscrowVault: {
    address: `0x${string}`;
    name: string;
  };
  StakingVault: {
    address: `0x${string}`;
    name: string;
    minBond: string;
  };
  dex: {
    aerodromePool: `0x${string}`;
    aerodromeRouter: `0x${string}`;
    weth: `0x${string}`;
    dexScreenerUrl: string;
    aerodromeSwapUrl: string;
  };
  founder: `0x${string}`;
  basename: {
    name: string;
    url: string;
    explorerUrl: string;
  };
}

export const NETWORKS: Record<NetworkId, NetworkContracts> = {
  'base-sepolia': {
    chain: {
      id: 'base-sepolia',
      chainId: 84532,
      chainName: 'Base Sepolia Testnet',
      shortName: 'Sepolia',
      isTestnet: true,
      rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
      explorerUrl: 'https://sepolia.basescan.org',
      currency: 'ETH',
    },
    APAYToken: {
      address: '0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3' as `0x${string}`,
      name: 'A-Pay Protocol Token',
      symbol: 'APAY',
      decimals: 18,
      totalSupply: '100,000,000',
    },
    USDC: {
      address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
      name: 'USD Coin (Testnet Faucet)',
      symbol: 'USDC',
      decimals: 6,
    },
    APayRouter: {
      address: '0x71434344beEF9C44fF3BC95572bEB7bFB8847ec6' as `0x${string}`,
      feeBps: 100,
      feePercent: '1.0%',
      treasury: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc' as `0x${string}`,
    },
    APayRouterV2: {
      address: '0xD08c8A337E5339d1c083E06d74A9265956ceEA16' as `0x${string}`,
      name: 'APay Enterprise Router V2',
      feeBps: 100,
      feePercent: '1.0%',
      treasury: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc' as `0x${string}`,
      apayToken: '0x8dd4ff9035c7d4e0Bef30aa64FC30d128A4066C3' as `0x${string}`,
    },
    EscrowVault: {
      address: '0x3E35a9E802627a3D9A86D6554e72b1C446E34aAF' as `0x${string}`,
      name: 'Multi-Agent Session Escrow Vault',
    },
    StakingVault: {
      address: '0xD2f3F4D97f4a3fdC9d4eEDfB9747BF9D80CF6225' as `0x${string}`,
      name: 'AI Agent Collateral & Slashing Staking Vault',
      minBond: '500 APAY',
    },
    dex: {
      aerodromePool: '0x6933dd2B7D72d8561005E475AFa147E47A3c7777' as `0x${string}`,
      aerodromeRouter: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43' as `0x${string}`,
      weth: '0x4200000000000000000000000000000000000006' as `0x${string}`,
      dexScreenerUrl: 'https://dexscreener.com/base/0x6933dd2B7D72d8561005E475AFa147E47A3c7777',
      aerodromeSwapUrl:
        'https://aerodrome.finance/swap?from=eth&to=0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3',
    },
    founder: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc' as `0x${string}`,
    basename: {
      name: 'apayprotocol.basetest.eth',
      url: 'https://sepolia.basescan.org/name-lookup-search?id=apayprotocol.basetest.eth',
      explorerUrl: 'https://sepolia.basescan.org/name-lookup-search?id=apayprotocol.basetest.eth',
    },
  },
  'base-mainnet': {
    chain: {
      id: 'base-mainnet',
      chainId: 8453,
      chainName: 'Base Mainnet',
      shortName: 'Mainnet',
      isTestnet: false,
      rpcUrl: 'https://mainnet.base.org',
      explorerUrl: 'https://basescan.org',
      currency: 'ETH',
    },
    APAYToken: {
      address: '0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3' as `0x${string}`,
      name: 'A-Pay Protocol Token',
      symbol: 'APAY',
      decimals: 18,
      totalSupply: '100,000,000',
    },
    USDC: {
      // OFFICIAL CIRCLE NATIVE USDC ON BASE MAINNET (Coinbase L2)
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
      name: 'USD Coin (Native Circle)',
      symbol: 'USDC',
      decimals: 6,
    },
    APayRouter: {
      address: '0x71434344beef9c44ff3bc95572beb7bfb8847ec6' as `0x${string}`,
      feeBps: 100,
      feePercent: '1.0%',
      treasury: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc' as `0x${string}`,
    },
    APayRouterV2: {
      address: '0x452eb7d4e7ccbf76ecf511829880b5fbcb24e854' as `0x${string}`,
      name: 'APay Enterprise Router V2',
      feeBps: 100,
      feePercent: '1.0%',
      treasury: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc' as `0x${string}`,
      apayToken: '0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3' as `0x${string}`,
    },
    EscrowVault: {
      address: '0xd08c8a337e5339d1c083e06d74a9265956ceea16' as `0x${string}`,
      name: 'Multi-Agent Session Escrow Vault',
    },
    StakingVault: {
      address: '0x3e35a9e802627a3d9a86d6554e72b1c446e34aaf' as `0x${string}`,
      name: 'AI Agent Collateral & Slashing Staking Vault',
      minBond: '500 APAY',
    },
    dex: {
      aerodromePool: '0x6933dd2B7D72d8561005E475AFa147E47A3c7777' as `0x${string}`,
      aerodromeRouter: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43' as `0x${string}`,
      weth: '0x4200000000000000000000000000000000000006' as `0x${string}`,
      dexScreenerUrl: 'https://dexscreener.com/base/0x6933dd2B7D72d8561005E475AFa147E47A3c7777',
      aerodromeSwapUrl:
        'https://aerodrome.finance/swap?from=eth&to=0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3',
    },
    founder: '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc' as `0x${string}`,
    basename: {
      name: 'apayprotocol.base.eth',
      url: 'https://base.org/name/apayprotocol',
      explorerUrl: 'https://basescan.org/name-lookup-search?id=apayprotocol.base.eth',
    },
  },
};

const DEFAULT_NETWORK: NetworkId = 'base-mainnet';

export function getNetworkContracts(networkId: NetworkId = DEFAULT_NETWORK): NetworkContracts {
  return NETWORKS[networkId] || NETWORKS[DEFAULT_NETWORK];
}

// Canonical default contracts for single-import backwards compatibility
export const CONTRACTS = NETWORKS[DEFAULT_NETWORK];
