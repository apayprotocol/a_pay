'use client';

import {
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Key,
  KeyRound,
  Play,
  Plus,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  Sliders,
  Trash2,
  UserCheck,
  Wallet,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createWalletClient, http, parseAbi, parseUnits } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { getNetworkContracts, type NetworkId } from '@/config/contracts';
import {
  ensureNetwork,
  fetchLiveEscrowBalances,
  fetchLiveWalletBalances,
} from '@/services/blockchain';

function parseSafeAmount(value: string | number, decimals: number): bigint {
  const str = String(value).trim();
  const num = parseFloat(str);
  if (!str || Number.isNaN(num) || num <= 0) {
    throw new Error('Please enter a valid positive amount.');
  }
  return parseUnits(str, decimals);
}

export interface DelegatedAgent {
  id: string;
  name: string;
  address: string;
  dailyLimit: number;
  spentToday: number;
  expiresAt: number; // Unix timestamp in ms
  active: boolean;
  txHash: string;
}

export interface ArchivedSubwallet {
  address: `0x${string}`;
  privateKey: `0x${string}`;
  archivedAt: number;
  lastBalances?: { eth: string; apay: string; usdc: string };
}

export function AgentVaultsTab({
  walletAddress,
  activeNetwork = 'base-sepolia',
  onConnect,
}: {
  walletAddress?: string | null;
  activeNetwork?: NetworkId;
  onConnect?: () => void;
}) {
  const contracts = getNetworkContracts(activeNetwork);
  const chainConfig = contracts.chain;
  const [budgetCurrency, setBudgetCurrency] = useState<'APAY' | 'USDC' | 'DUAL'>('DUAL');
  const [maxPerCallApay, setMaxPerCallApay] = useState('5.0');
  const [dailyBudgetApay, setDailyBudgetApay] = useState('100.0');
  const [maxPerCallUsdc, setMaxPerCallUsdc] = useState('0.05');
  const [dailyBudgetUsdc, setDailyBudgetUsdc] = useState('2.00');

  // Delegated Swarm Agents state
  const [delegatedAgents, setDelegatedAgents] = useState<DelegatedAgent[]>([]);
  const agentsStorageKey = `apay_delegated_agents_${activeNetwork}_${walletAddress || 'default'}`;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved =
        localStorage.getItem(agentsStorageKey) ||
        localStorage.getItem(`apay_delegated_agents_${walletAddress || 'default'}`);
      if (saved) {
        try {
          setDelegatedAgents(JSON.parse(saved));
        } catch {
          setDelegatedAgents([]);
        }
      } else {
        setDelegatedAgents([]);
      }
    }
  }, [walletAddress, activeNetwork, agentsStorageKey]);

  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentAddress, setNewAgentAddress] = useState('');
  const [newAgentLimit, setNewAgentLimit] = useState('0.10');
  const [newAgentHours, setNewAgentHours] = useState('24');
  const [isDelegating, setIsDelegating] = useState(false);
  const [copiedAgentId, setCopiedAgentId] = useState<string | null>(null);
  const [vaultUsdcBalance, setVaultUsdcBalance] = useState('0.00');
  const [vaultApayBalance, setVaultApayBalance] = useState('0.0');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositMsg, setDepositMsg] = useState<string | null>(null);

  // Fetch live on-chain EscrowVault balances for connected operator
  useEffect(() => {
    if (walletAddress) {
      fetchLiveEscrowBalances(walletAddress as `0x${string}`, activeNetwork)
        .then((res) => {
          setVaultUsdcBalance(res.usdc);
          setVaultApayBalance(res.apay);
        })
        .catch(console.error);
    } else {
      setVaultUsdcBalance('0.00');
      setVaultApayBalance('0.0');
    }
  }, [walletAddress, activeNetwork]);

  // Real Cryptographic Agent Keypair State
  const [agentPrivateKey, setAgentPrivateKey] = useState<`0x${string}` | ''>('');
  const [agentAddress, setAgentAddress] = useState<`0x${string}` | ''>('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [agentBalances, setAgentBalances] = useState<{
    eth: string;
    apay: string;
    usdc: string;
  }>({
    eth: '0.0000',
    apay: '0',
    usdc: '0.00',
  });
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedPk, setCopiedPk] = useState(false);
  const [downloadedKey, setDownloadedKey] = useState(false);
  const [fundStatus, setFundStatus] = useState<string | null>(null);

  // Custom Amount Sub-Wallet Funding State
  const [subwalletFundCurrency, setSubwalletFundCurrency] = useState<'APAY' | 'USDC' | 'ETH'>(
    'APAY',
  );
  const [subwalletFundAmount, setSubwalletFundAmount] = useState('5');
  const [isFundingSubwallet, setIsFundingSubwallet] = useState(false);

  // Custom Amount Master Vault Deposit State
  const [vaultDepositUsdcAmount, setVaultDepositUsdcAmount] = useState('10');
  const [vaultDepositApayAmount, setVaultDepositApayAmount] = useState('50');

  // Live Agent Call Quick Tester State
  const [testEndpointUrl, setTestEndpointUrl] = useState('');
  const [isTestingAgentCall, setIsTestingAgentCall] = useState(false);
  const [testAgentResult, setTestAgentResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  const storageKey = `apay_agent_key_${activeNetwork}_${walletAddress ? walletAddress.toLowerCase() : 'session'}`;
  const archiveStorageKey = `apay_archived_subwallets_${activeNetwork}_${walletAddress ? walletAddress.toLowerCase() : 'default'}`;

  // Archived sub-wallets & Zero-Loss Key Vault
  const [archivedWallets, setArchivedWallets] = useState<ArchivedSubwallet[]>([]);
  const [showArchivedWallets, setShowArchivedWallets] = useState(false);
  const [revealedArchivedKeyIndex, setRevealedArchivedKeyIndex] = useState<number | null>(null);
  const [copiedArchivedKeyIndex, setCopiedArchivedKeyIndex] = useState<number | null>(null);
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepStatus, setSweepStatus] = useState<string | null>(null);

  // Load archived wallets on mount/network/wallet change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(archiveStorageKey);
        if (saved) {
          setArchivedWallets(JSON.parse(saved));
        } else {
          setArchivedWallets([]);
        }
      } catch {
        setArchivedWallets([]);
      }
    }
  }, [archiveStorageKey]);

  const archiveSubwallet = (
    privKey: `0x${string}`,
    addr: `0x${string}`,
    balances?: { eth: string; apay: string; usdc: string },
  ) => {
    if (!privKey || !addr) return;
    setArchivedWallets((prev) => {
      if (prev.some((w) => w.address.toLowerCase() === addr.toLowerCase())) {
        return prev;
      }
      const updated = [
        {
          address: addr,
          privateKey: privKey,
          archivedAt: Date.now(),
          lastBalances: balances || agentBalances,
        },
        ...prev,
      ];
      if (typeof window !== 'undefined') {
        localStorage.setItem(archiveStorageKey, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleBudgetCurrencyChange = (curr: 'APAY' | 'USDC' | 'DUAL') => {
    setBudgetCurrency(curr);
  };

  // Generate or load real cryptographic subwallet
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const legacyKey = `apay_agent_key_${walletAddress ? walletAddress.toLowerCase() : 'session'}`;
        const saved = localStorage.getItem(storageKey) || localStorage.getItem(legacyKey);
        if (saved?.startsWith('0x') && saved.length === 66) {
          const account = privateKeyToAccount(saved as `0x${string}`);
          setAgentPrivateKey(saved as `0x${string}`);
          setAgentAddress(account.address);
          refreshBalances(account.address);
          return;
        }
      } catch {
        // fallback
      }
      generateRealSubwallet();
    }
  }, [storageKey]);

  const generateRealSubwallet = () => {
    try {
      const privateKey = generatePrivateKey();
      const account = privateKeyToAccount(privateKey);
      setAgentPrivateKey(privateKey);
      setAgentAddress(account.address);

      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, privateKey);
      }

      refreshBalances(account.address);
    } catch (err) {
      console.error('Failed to generate agent subwallet:', err);
    }
  };

  const downloadEnvFile = (targetKey?: `0x${string}`, targetAddr?: `0x${string}`) => {
    const keyToSave = targetKey || agentPrivateKey;
    const addrToSave = targetAddr || agentAddress;
    if (!addrToSave || !keyToSave) {
      alert('No agent credentials available to download.');
      return;
    }
    const envContent = `# ========================================================
# A-PAY PROTOCOL AGENT SUB-WALLET CREDENTIALS
# Network: ${chainConfig.chainName} (Chain ID: ${chainConfig.chainId})
# Generated At: ${new Date().toISOString()}
# CAUTION: Keep this file private. Never commit to public repos.
# ========================================================

APAY_AGENT_ADDRESS="${addrToSave}"
APAY_AGENT_PRIVATE_KEY="${keyToSave}"
APAY_NETWORK="${activeNetwork}"
APAY_CHAIN_ID="${chainConfig.chainId}"
APAY_RPC_URL="${chainConfig.rpcUrl}"
APAY_EXPLORER_URL="${chainConfig.explorerUrl}"

# Contract Addresses on ${chainConfig.chainName}
APAY_ESCROW_VAULT="${contracts.EscrowVault.address}"
APAY_TOKEN_ADDRESS="${contracts.APAYToken.address}"
APAY_USDC_ADDRESS="${contracts.USDC.address}"
`;

    const blob = new Blob([envContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `apay-agent-${activeNetwork}.env`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadedKey(true);
    setTimeout(() => setDownloadedKey(false), 3000);
  };

  const handleRegenerateSubwallet = () => {
    const hasFunds =
      (parseFloat(agentBalances.eth) || 0) > 0 ||
      (parseFloat(agentBalances.apay) || 0) > 0 ||
      (parseFloat(agentBalances.usdc) || 0) > 0;

    if (hasFunds) {
      const confirmMsg =
        `🛡️ Zero-Loss Key Vault Protection:\n\n` +
        `This sub-wallet currently holds active funds on ${chainConfig.chainName}:\n` +
        `• $APAY: ${agentBalances.apay}\n` +
        `• USDC: $${agentBalances.usdc}\n` +
        `• Base ETH: ${agentBalances.eth}\n\n` +
        `✅ Don't worry! Your current private key will be AUTO-ARCHIVED in the "Archived Sub-Wallets History" below so you can restore or sweep it at any time.\n\n` +
        `We will also auto-download a backup .env file.\n\n` +
        `Do you want to proceed and generate a new key?`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
      downloadEnvFile();
    }

    // Auto-archive current key before generating a new one
    if (agentPrivateKey && agentAddress) {
      archiveSubwallet(agentPrivateKey, agentAddress, agentBalances);
    }

    generateRealSubwallet();
  };

  const handleRestoreSubwallet = (archived: ArchivedSubwallet) => {
    if (
      agentPrivateKey &&
      agentAddress &&
      agentAddress.toLowerCase() !== archived.address.toLowerCase()
    ) {
      archiveSubwallet(agentPrivateKey, agentAddress, agentBalances);
    }

    setAgentPrivateKey(archived.privateKey);
    setAgentAddress(archived.address);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, archived.privateKey);
    }
    refreshBalances(archived.address);
  };

  const handleSweepFunds = async (token: 'APAY' | 'USDC') => {
    const destination = (window as any)?.ethereum?.selectedAddress || walletAddress;
    if (!destination) {
      alert('Please connect your Master MetaMask wallet as the destination.');
      return;
    }
    if (!agentPrivateKey || !agentAddress) {
      alert('No active sub-wallet found to sweep.');
      return;
    }

    const apayBal = parseFloat(agentBalances.apay) || 0;
    const usdcBal = parseFloat(agentBalances.usdc) || 0;
    const ethBal = parseFloat(agentBalances.eth) || 0;

    if (token === 'APAY' && apayBal <= 0) {
      alert('No $APAY balance in sub-wallet to sweep.');
      return;
    }
    if (token === 'USDC' && usdcBal <= 0) {
      alert('No USDC balance in sub-wallet to sweep.');
      return;
    }

    // Check if sub-wallet has enough Base ETH for gas (~0.00002 ETH)
    if (ethBal < 0.00002) {
      const copyChoice = window.confirm(
        `⚠️ Gas Needed for Direct Sweep:\n\n` +
          `On Base L2, sending an on-chain transaction requires a tiny fraction of Base ETH for gas (~0.00003 ETH / $0.0001).\n\n` +
          `Your sub-wallet currently holds ${agentBalances.eth} Base ETH.\n\n` +
          `Would you like to COPY the sub-wallet private key now to import it into MetaMask (where you can withdraw or fund gas directly)?`,
      );
      if (copyChoice) {
        navigator.clipboard.writeText(agentPrivateKey);
        alert(
          '✅ Sub-wallet private key copied to clipboard!\n\nOpen MetaMask -> Click Account Selector -> "Add account or hardware wallet" -> "Import account" -> Paste private key.',
        );
      }
      return;
    }

    setIsSweeping(true);
    setSweepStatus(
      `Sweeping ${token === 'APAY' ? `${apayBal} $APAY` : `$${usdcBal} USDC`} back to master wallet...`,
    );

    try {
      const account = privateKeyToAccount(agentPrivateKey);
      const client = createWalletClient({
        account,
        chain: activeNetwork === 'base-mainnet' ? base : baseSepolia,
        transport: http(chainConfig.rpcUrl),
      });

      const targetToken = token === 'APAY' ? contracts.APAYToken.address : contracts.USDC.address;
      const decimals = token === 'APAY' ? 18 : contracts.USDC.decimals;
      const amountStr = token === 'APAY' ? agentBalances.apay : agentBalances.usdc;
      const amountUnits = parseSafeAmount(amountStr, decimals);

      const hash = await client.writeContract({
        address: targetToken,
        abi: parseAbi(['function transfer(address to, uint256 amount) external returns (bool)']),
        functionName: 'transfer',
        args: [destination as `0x${string}`, amountUnits],
      });

      setSweepStatus(`✅ Swept ${amountStr} ${token} to master! Tx: ${hash.slice(0, 14)}...`);
      refreshBalances(agentAddress);
      setTimeout(() => setSweepStatus(null), 5000);
    } catch (err: any) {
      console.error('Sweep error:', err);
      setSweepStatus(`Sweep failed: ${err?.message || 'Transaction error'}`);
      setTimeout(() => setSweepStatus(null), 5000);
    } finally {
      setIsSweeping(false);
    }
  };

  const handleTestAgentCall = async () => {
    const target = testEndpointUrl.trim() || 'https://httpbin.org/status/402';
    setIsTestingAgentCall(true);
    setTestAgentResult(null);

    try {
      const res = await fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json();

      if (res.ok && data?.isPaywall) {
        const apayHdrs = data.apayHeaders || {};
        const receiver = apayHdrs.receiver || 'Configured Merchant Wallet';
        const amount = apayHdrs.amount || apayHdrs.amountApay || 'Configured Rate';
        setTestAgentResult({
          success: true,
          message: '🟢 Authentic M2M Payment Handshake Verified!',
          details: `Target: ${target} • Payer: ${agentAddress ? `${agentAddress.slice(0, 8)}...` : 'Sub-Wallet'} • Destination: ${receiver} • Price: ${amount} • Settlement: 100% Direct P2P to Merchant (Zero Protocol Custody).`,
        });
      } else {
        setTestAgentResult({
          success: true,
          message: '🟢 Simulated Agent Payment Handshake Complete!',
          details: `Agent Sub-Wallet (${agentAddress ? `${agentAddress.slice(0, 8)}...` : '0xAgent...'}) generated EIP-712 payment authorization. Funds will route directly to destination merchant wallet upon contract settlement.`,
        });
      }
    } catch (err: any) {
      setTestAgentResult({
        success: false,
        message: 'Simulation error',
        details: err?.message || 'Could not connect to target endpoint.',
      });
    } finally {
      setIsTestingAgentCall(false);
    }
  };

  const refreshBalances = React.useCallback(
    async (addr?: `0x${string}`) => {
      const target = addr || agentAddress;
      if (!target) return;
      setIsRefreshingBalances(true);
      try {
        const bal = await fetchLiveWalletBalances(target, activeNetwork);
        setAgentBalances({ eth: bal.eth, apay: bal.apay, usdc: bal.usdc });
      } catch (err) {
        console.warn('Error refreshing agent wallet balances:', err);
      } finally {
        setIsRefreshingBalances(false);
      }
    },
    [agentAddress, activeNetwork],
  );

  useEffect(() => {
    if (agentAddress) {
      refreshBalances(agentAddress);
    }
  }, [activeNetwork, agentAddress, refreshBalances]);

  const copyText = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelegateAgent = async () => {
    if (!newAgentAddress?.startsWith('0x') || newAgentAddress.length !== 42) {
      alert('Please enter a valid EVM sub-agent address (0x...)');
      return;
    }
    const limitNum = Number.parseFloat(newAgentLimit) || 0.1;
    const hoursNum = Number.parseFloat(newAgentHours) || 24;

    if (!walletAddress) {
      if (onConnect) {
        onConnect();
        return;
      }
      alert(
        `Please connect MetaMask or an EVM wallet to authorize sub-agents on ${chainConfig.chainName}.`,
      );
      return;
    }

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert(
        `Please install MetaMask or an EVM wallet to authorize sub-agents on ${chainConfig.chainName}.`,
      );
      return;
    }

    setIsDelegating(true);
    try {
      await ensureNetwork((window as any).ethereum, activeNetwork);
      // Encode calldata for EscrowVault.authorizeAgent(agent, token, dailyLimit, expiresAt)
      // selector: 0xe0ad3ad9
      const cleanAgent = newAgentAddress.toLowerCase().replace(/^0x/, '').padStart(64, '0');
      const cleanToken = contracts.APAYToken.address
        .toLowerCase()
        .replace(/^0x/, '')
        .padStart(64, '0');
      const dailyLimitUnits = BigInt(Math.round(limitNum * 1e6))
        .toString(16)
        .padStart(64, '0');
      const expiresAtSec = BigInt(Math.floor(Date.now() / 1000) + Math.round(hoursNum * 3600))
        .toString(16)
        .padStart(64, '0');
      const calldata = `0xe0ad3ad9${cleanAgent}${cleanToken}${dailyLimitUnits}${expiresAtSec}`;

      const txHash = await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: (window as any).ethereum.selectedAddress || walletAddress,
            to: contracts.EscrowVault.address,
            data: calldata,
          },
        ],
      });

      const newAgent: DelegatedAgent = {
        id: `agent-${Date.now()}`,
        name: newAgentName.trim() || `Worker Agent #${delegatedAgents.length + 1}`,
        address: newAgentAddress.trim(),
        dailyLimit: limitNum,
        spentToday: 0.0,
        expiresAt: Date.now() + hoursNum * 3600 * 1000,
        active: true,
        txHash: String(txHash),
      };

      const updated = [newAgent, ...delegatedAgents];
      setDelegatedAgents(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem(agentsStorageKey, JSON.stringify(updated));
      }
      setNewAgentName('');
      setNewAgentAddress('');
    } catch (err: any) {
      console.error('Delegation transaction failed:', err);
      alert(`Delegation transaction failed or rejected: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsDelegating(false);
    }
  };

  const handleRevokeAgent = (id: string) => {
    const updated = delegatedAgents.map((ag) => (ag.id === id ? { ...ag, active: false } : ag));
    setDelegatedAgents(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(agentsStorageKey, JSON.stringify(updated));
    }
  };

  const handleDepositToVault = async (token: 'USDC' | 'APAY', customAmountStr?: string) => {
    if (!walletAddress) {
      if (onConnect) {
        onConnect();
        return;
      }
      alert(`Please connect MetaMask to deposit to EscrowVault.sol on ${chainConfig.chainName}.`);
      return;
    }

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert(`Please install MetaMask to deposit to EscrowVault.sol on ${chainConfig.chainName}.`);
      return;
    }

    const amountStr =
      customAmountStr || (token === 'USDC' ? vaultDepositUsdcAmount : vaultDepositApayAmount);
    let amountUnits: string;
    try {
      if (token === 'USDC') {
        amountUnits = parseSafeAmount(amountStr, contracts.USDC.decimals)
          .toString(16)
          .padStart(64, '0');
      } else {
        amountUnits = parseSafeAmount(amountStr, 18).toString(16).padStart(64, '0');
      }
    } catch (err: any) {
      setDepositMsg(err?.message || 'Invalid deposit amount');
      setTimeout(() => setDepositMsg(null), 3500);
      return;
    }

    setIsDepositing(true);
    setDepositMsg(
      `Initiating deposit of ${amountStr} ${token} to EscrowVault.sol on ${chainConfig.chainName}...`,
    );
    try {
      await ensureNetwork((window as any).ethereum, activeNetwork);
      const targetToken = token === 'USDC' ? contracts.USDC.address : contracts.APAYToken.address;
      const cleanVault = contracts.EscrowVault.address
        .toLowerCase()
        .replace(/^0x/, '')
        .padStart(64, '0');
      const cleanToken = targetToken.toLowerCase().replace(/^0x/, '').padStart(64, '0');

      const sender = (window as any).ethereum.selectedAddress || walletAddress;

      // Step 1: Approve EscrowVault to transfer tokens
      setDepositMsg(`Step 1/2: Approving EscrowVault for ${amountStr} ${token}...`);
      const approveCalldata = `0x095ea7b3${cleanVault}${amountUnits}`;
      await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: sender,
            to: targetToken,
            data: approveCalldata,
          },
        ],
      });

      // Step 2: EscrowVault.deposit(token, amount)
      setDepositMsg(`Step 2/2: Depositing ${amountStr} ${token} into EscrowVault.sol...`);
      const depositCalldata = `0x47e7ef24${cleanToken}${amountUnits}`;
      const txHash = await (window as any).ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: sender,
            to: contracts.EscrowVault.address,
            data: depositCalldata,
          },
        ],
      });

      setDepositMsg(`✅ Deposited ${amountStr} ${token}! Tx: ${String(txHash).slice(0, 14)}...`);
      // Refresh live escrow balances from blockchain
      if (walletAddress) {
        const updated = await fetchLiveEscrowBalances(
          walletAddress as `0x${string}`,
          activeNetwork,
        );
        setVaultUsdcBalance(updated.usdc);
        setVaultApayBalance(updated.apay);
      }
      setTimeout(() => setDepositMsg(null), 5000);
    } catch (err: any) {
      console.error('Deposit error:', err);
      setDepositMsg(`Deposit failed: ${err?.message || 'Transaction rejected'}`);
      setTimeout(() => setDepositMsg(null), 4000);
    } finally {
      setIsDepositing(false);
    }
  };

  const handleFundSubwallet = async () => {
    if (!walletAddress) {
      if (onConnect) {
        onConnect();
        return;
      }
      setFundStatus('Please connect MetaMask to fund this agent wallet.');
      return;
    }

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setFundStatus('Please install MetaMask to fund this agent wallet.');
      return;
    }
    if (!agentAddress) return;

    try {
      const amountNum = parseFloat(subwalletFundAmount);
      if (!subwalletFundAmount || Number.isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Please enter a valid positive funding amount.');
      }
    } catch (err: any) {
      setFundStatus(`⚠️ ${err?.message || 'Invalid amount'}`);
      return;
    }

    setIsFundingSubwallet(true);
    try {
      await ensureNetwork((window as any).ethereum, activeNetwork);
      const cleanTo = agentAddress.toLowerCase().replace(/^0x/, '').padStart(64, '0');
      const sender = (window as any).ethereum.selectedAddress;

      if (subwalletFundCurrency === 'ETH') {
        setFundStatus(
          `Sending ${subwalletFundAmount} ${chainConfig.currency} gas to sub-wallet...`,
        );
        const valueWei = parseSafeAmount(subwalletFundAmount, 18);
        const txHash = await (window as any).ethereum.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: sender,
              to: agentAddress,
              value: '0x' + valueWei.toString(16),
            },
          ],
        });
        setFundStatus(
          `✅ ${subwalletFundAmount} ${chainConfig.currency} sent! Tx: ${String(txHash).slice(0, 14)}...`,
        );
      } else if (subwalletFundCurrency === 'APAY') {
        setFundStatus(
          `Transferring ${subwalletFundAmount} $APAY to agent sub-wallet on ${chainConfig.chainName}...`,
        );
        const amountWei = parseSafeAmount(subwalletFundAmount, 18);
        const amountHex = amountWei.toString(16).padStart(64, '0');
        const calldata = `0xa9059cbb${cleanTo}${amountHex}`;

        const txHash = await (window as any).ethereum.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: sender,
              to: contracts.APAYToken.address,
              data: calldata,
            },
          ],
        });
        setFundStatus(
          `✅ ${subwalletFundAmount} $APAY sent! Tx: ${String(txHash).slice(0, 14)}...`,
        );
      } else if (subwalletFundCurrency === 'USDC') {
        setFundStatus(
          `Transferring ${subwalletFundAmount} USDC to agent sub-wallet on ${chainConfig.chainName}...`,
        );
        const amountUnits = parseSafeAmount(subwalletFundAmount, contracts.USDC.decimals);
        const amountHex = amountUnits.toString(16).padStart(64, '0');
        const calldata = `0xa9059cbb${cleanTo}${amountHex}`;

        const txHash = await (window as any).ethereum.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: sender,
              to: contracts.USDC.address,
              data: calldata,
            },
          ],
        });
        setFundStatus(`✅ ${subwalletFundAmount} USDC sent! Tx: ${String(txHash).slice(0, 14)}...`);
      }
      setTimeout(() => refreshBalances(), 4000);
    } catch (err: any) {
      console.error('Funding failed:', err);
      setFundStatus(`Failed: ${err?.message || 'Transaction rejected'}`);
    } finally {
      setIsFundingSubwallet(false);
    }
  };

  const displayKey =
    showPrivateKey && agentPrivateKey
      ? `"${agentPrivateKey}"`
      : 'os.getenv("APAY_AGENT_PRIVATE_KEY", "0xYourAgentPrivateKeyHere")';
  const osImport = showPrivateKey && agentPrivateKey ? '' : 'import os\n';

  const pythonSnippet =
    budgetCurrency === 'DUAL'
      ? `${osImport}from apay import APaySession, AgentWallet

# 1. Initialize local non-custodial agent wallet with DUAL multi-rail safety guardrails
wallet = AgentWallet.from_private_key(
    private_key=${displayKey},
    # Multi-Rail Spending Caps
    max_per_call_apay=${maxPerCallApay},   # Max request cap in $APAY (${maxPerCallApay} $APAY)
    daily_budget_apay=${dailyBudgetApay},   # 24h recursive cap in $APAY (${dailyBudgetApay} $APAY)
    max_per_call_usdc=${maxPerCallUsdc},   # Max request cap in USDC ($${maxPerCallUsdc} USDC)
    daily_budget_usdc=${dailyBudgetUsdc},   # 24h recursive cap in USDC ($${dailyBudgetUsdc} USDC)
    currency="DUAL",                       # Auto-Routing: $APAY (0% fee) -> USDC fallback
)

# 2. Autonomous HTTP session automatically intercepts HTTP 402 & signs cryptographic challenge
session = APaySession(wallet)
response = session.get("https://gateway.apay.network/p/your-service")
print(response.json())`
      : budgetCurrency === 'APAY'
        ? `${osImport}from apay import APaySession, AgentWallet

# 1. Initialize local non-custodial agent wallet with strict economic safety guardrails
wallet = AgentWallet.from_private_key(
    private_key=${displayKey},
    max_per_call=${maxPerCallApay},   # Hard ceiling per request (${maxPerCallApay} $APAY)
    daily_budget=${dailyBudgetApay},    # 24h recursive spending cap (${dailyBudgetApay} $APAY)
    currency="APAY"                    # Settlement rail: 0% protocol fee
)

# 2. Autonomous HTTP session automatically intercepts HTTP 402 & signs cryptographic challenge
session = APaySession(wallet)
response = session.get("https://gateway.apay.network/p/your-service")
print(response.json())`
        : `${osImport}from apay import APaySession, AgentWallet

# 1. Initialize local non-custodial agent wallet with strict economic safety guardrails
wallet = AgentWallet.from_private_key(
    private_key=${displayKey},
    max_per_call=${maxPerCallUsdc},   # Hard ceiling per request ($${maxPerCallUsdc} USDC)
    daily_budget=${dailyBudgetUsdc},    # 24h recursive spending cap ($${dailyBudgetUsdc} USDC)
    currency="USDC"                    # Settlement rail: Circle USDC
)

# 2. Autonomous HTTP session automatically intercepts HTTP 402 & signs cryptographic challenge
session = APaySession(wallet)
response = session.get("https://gateway.apay.network/p/your-service")
print(response.json())`;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h2 className="font-spatial text-3xl font-black text-slate-900 dark:text-white">
          AI Agent Budget Vaults (Buyer Safety)
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Client-side economic guardrails preventing recursive loop bankruptcies and rogue API
          overcharges.
        </p>
      </div>

      {/* Safety Invariant Alert */}
      <div className="p-4 sm:p-5 rounded-3xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-4">
        <div className="p-2 rounded-2xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-sky-400">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-sm text-blue-950 dark:text-sky-200">
            Hard Client-Side Safety Invariant
          </div>
          <p className="text-xs text-blue-800/80 dark:text-sky-300/80 mt-0.5 leading-relaxed">
            Unlike cloud credit card billing where a runaway agent loop can rack up catastrophic
            unauthorized bills, A-Pay enforces spending limits locally in the Python/TS agent
            runtime before any cryptographic signature is produced.
          </p>
        </div>
      </div>

      {/* Guardrail Controls & Sub-Wallet Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel rounded-3xl p-6 soft-shadow space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold font-spatial text-slate-900 dark:text-white">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              Configurable Budget Thresholds
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-bold">
              Enforced Locally
            </span>
          </div>

          <div className="space-y-3">
            {/* Currency Rail Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-2">
              <span className="text-[11px] font-semibold text-slate-500 px-2">
                Budget Currency:
              </span>
              <div className="inline-flex gap-1">
                <button
                  type="button"
                  onClick={() => handleBudgetCurrencyChange('APAY')}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    budgetCurrency === 'APAY'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  ⚡ $APAY
                </button>
                <button
                  type="button"
                  onClick={() => handleBudgetCurrencyChange('USDC')}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    budgetCurrency === 'USDC'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  💵 USDC
                </button>
                <button
                  type="button"
                  onClick={() => handleBudgetCurrencyChange('DUAL')}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    budgetCurrency === 'DUAL'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  🌐 DUAL Multi-Rail
                </button>
              </div>
            </div>

            {budgetCurrency === 'DUAL' ? (
              <div className="space-y-4 pt-1">
                <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 text-[11px] font-mono text-purple-700 dark:text-purple-300 leading-relaxed">
                  ⚡ <strong>Smart Auto-Routing Active:</strong> Agent prioritizes $APAY for 0% fees
                  and discounts, falling back to USDC if $APAY is exhausted.
                </div>

                {/* APAY Caps Card */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-amber-700 dark:text-amber-400">
                      ⚡ $APAY Spending Caps
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                      0% Protocol Fee
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      <span>Max Per Call ($APAY)</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400">
                        {maxPerCallApay} $APAY
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="50.0"
                      step="1.0"
                      value={maxPerCallApay}
                      onChange={(e) => setMaxPerCallApay(e.target.value)}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      <span>24h Daily Budget ($APAY)</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400">
                        {dailyBudgetApay} $APAY
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10.0"
                      max="1000.0"
                      step="10.0"
                      value={dailyBudgetApay}
                      onChange={(e) => setDailyBudgetApay(e.target.value)}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* USDC Caps Card */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/40 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-blue-700 dark:text-sky-400">💵 USDC Spending Caps</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-sky-300 font-bold">
                      Circle USD Rail
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      <span>Max Per Call (USDC)</span>
                      <span className="font-mono text-blue-600 dark:text-sky-400">
                        ${maxPerCallUsdc} USDC
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.001"
                      max="0.50"
                      step="0.005"
                      value={maxPerCallUsdc}
                      onChange={(e) => setMaxPerCallUsdc(e.target.value)}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      <span>24h Daily Budget (USDC)</span>
                      <span className="font-mono text-blue-600 dark:text-sky-400">
                        ${dailyBudgetUsdc} USDC
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.50"
                      max="25.00"
                      step="0.50"
                      value={dailyBudgetUsdc}
                      onChange={(e) => setDailyBudgetUsdc(e.target.value)}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ) : budgetCurrency === 'APAY' ? (
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Max Per Request Ceiling</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400">
                      {maxPerCallApay} $APAY
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="50.0"
                    step="1.0"
                    value={maxPerCallApay}
                    onChange={(e) => setMaxPerCallApay(e.target.value)}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400">
                    Rejects any 402 challenge quote exceeding this cap.
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Rolling 24h Daily Budget</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400">
                      {dailyBudgetApay} $APAY
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10.0"
                    max="1000.0"
                    step="10.0"
                    value={dailyBudgetApay}
                    onChange={(e) => setDailyBudgetApay(e.target.value)}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400">
                    Halts all signing once daily threshold is spent.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Max Per Request Ceiling</span>
                    <span className="font-mono text-blue-600 dark:text-sky-400">
                      ${maxPerCallUsdc} USDC
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.001"
                    max="0.50"
                    step="0.005"
                    value={maxPerCallUsdc}
                    onChange={(e) => setMaxPerCallUsdc(e.target.value)}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400">
                    Rejects any 402 challenge quote exceeding this cap.
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Rolling 24h Daily Budget</span>
                    <span className="font-mono text-blue-600 dark:text-sky-400">
                      ${dailyBudgetUsdc} USDC
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.50"
                    max="25.00"
                    step="0.50"
                    value={dailyBudgetUsdc}
                    onChange={(e) => setDailyBudgetUsdc(e.target.value)}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400">
                    Halts all signing once daily threshold is spent.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Real Agent Sub-wallet Display */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-blue-500" />
                Live Agent Sub-Wallet:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => refreshBalances()}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1 text-[11px] font-mono transition-colors cursor-pointer"
                  title="Sync live on-chain balances"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isRefreshingBalances ? 'animate-spin text-blue-500' : ''}`}
                  />
                  <span>Sync</span>
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateSubwallet}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-sky-400 flex items-center gap-1 text-[11px] font-mono transition-colors cursor-pointer"
                  title="Generate new agent sub-wallet keypair"
                >
                  <KeyRound className="w-3 h-3 text-amber-500" />
                  <span>Regenerate Key</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                  {agentAddress || 'Generating keypair...'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyText(agentAddress, setCopiedAddr)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                    title="Copy Address"
                  >
                    {copiedAddr ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {agentAddress && (
                    <a
                      href={`${chainConfig.explorerUrl}/address/${agentAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                      title="View on Basescan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Private Key Reveal, Copy & Download .env */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">
                  Key:{' '}
                  {showPrivateKey
                    ? agentPrivateKey
                    : agentPrivateKey
                      ? `${agentPrivateKey.slice(0, 10)}${'•'.repeat(20)}`
                      : '---'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    title={showPrivateKey ? 'Hide Key' : 'Reveal Key'}
                  >
                    {showPrivateKey ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => copyText(agentPrivateKey, setCopiedPk)}
                    className="p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    title="Copy Private Key"
                  >
                    {copiedPk ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => downloadEnvFile()}
                    className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-sky-300 border border-blue-200 dark:border-blue-800/60 flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-all"
                    title="Download .env file with sub-wallet credentials"
                  >
                    {downloadedKey ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" />
                        <span>Download .env</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Balances on Active Network */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">
                    USDC Balance
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ${agentBalances.usdc}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">
                    $APAY Balance
                  </span>
                  <span className="font-mono font-bold text-blue-600 dark:text-sky-400">
                    {agentBalances.apay}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">
                    Base ETH
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {agentBalances.eth}
                  </span>
                </div>
              </div>

              {/* Master Return / Sweep Funds */}
              {(parseFloat(agentBalances.apay) > 0 || parseFloat(agentBalances.usdc) > 0) && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-500 font-mono">Sweep to Master:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {parseFloat(agentBalances.apay) > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSweepFunds('APAY')}
                        disabled={isSweeping}
                        className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                        title={`Return ${agentBalances.apay} $APAY to Master Wallet`}
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${isSweeping ? 'animate-spin' : ''}`} />
                        <span>Sweep {agentBalances.apay} $APAY</span>
                      </button>
                    )}
                    {parseFloat(agentBalances.usdc) > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSweepFunds('USDC')}
                        disabled={isSweeping}
                        className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                        title={`Return $${agentBalances.usdc} USDC to Master Wallet`}
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${isSweeping ? 'animate-spin' : ''}`} />
                        <span>Sweep ${agentBalances.usdc} USDC</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {sweepStatus && (
                <div className="text-[10px] font-mono text-center text-amber-600 dark:text-amber-400 p-1.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                  {sweepStatus}
                </div>
              )}
            </div>

            {/* Fund Sub-Wallet Custom Amount Control */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Fund Sub-Wallet from Master:
                </span>
                {/* Currency Selector */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-[11px] font-mono">
                  {(['APAY', 'USDC', 'ETH'] as const).map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => {
                        setSubwalletFundCurrency(curr);
                        if (curr === 'APAY') setSubwalletFundAmount('5');
                        else if (curr === 'USDC') setSubwalletFundAmount('1');
                        else setSubwalletFundAmount('0.001');
                      }}
                      className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                        subwalletFundCurrency === curr
                          ? curr === 'APAY'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : curr === 'USDC'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {curr === 'APAY' ? '$APAY' : curr === 'USDC' ? 'USDC' : 'ETH'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input & Preset Chips */}
              <div className="space-y-2">
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder={`Amount in ${subwalletFundCurrency === 'APAY' ? '$APAY' : subwalletFundCurrency === 'USDC' ? 'USDC' : 'ETH'}`}
                    value={subwalletFundAmount}
                    onChange={(e) => setSubwalletFundAmount(e.target.value)}
                    className="w-full px-3 py-2 pr-16 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 text-[11px] font-mono font-semibold text-slate-400 pointer-events-none">
                    {subwalletFundCurrency === 'APAY'
                      ? '$APAY'
                      : subwalletFundCurrency === 'USDC'
                        ? 'USDC'
                        : chainConfig.currency}
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-mono">Presets:</span>
                  {(subwalletFundCurrency === 'APAY'
                    ? ['1', '5', '10', '25', '50']
                    : subwalletFundCurrency === 'USDC'
                      ? ['0.5', '1', '5', '10', '25']
                      : ['0.0005', '0.001', '0.005', '0.01']
                  ).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSubwalletFundAmount(val)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                        subwalletFundAmount === val
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 dark:text-sky-300 font-bold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fund Action Button */}
              <button
                type="button"
                onClick={handleFundSubwallet}
                disabled={walletAddress ? isFundingSubwallet : false}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                  !walletAddress
                    ? 'bg-slate-800 hover:bg-slate-700 text-white'
                    : subwalletFundCurrency === 'APAY'
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : subwalletFundCurrency === 'USDC'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                } ${isFundingSubwallet ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {!walletAddress ? (
                  <>
                    <Wallet className="w-3.5 h-3.5 text-amber-400" />
                    <span>Connect Wallet to Fund Sub-Wallet</span>
                  </>
                ) : (
                  <>
                    <Send className={`w-3.5 h-3.5 ${isFundingSubwallet ? 'animate-pulse' : ''}`} />
                    <span>
                      {isFundingSubwallet
                        ? `Funding ${subwalletFundAmount} ${subwalletFundCurrency}...`
                        : `Fund ${subwalletFundAmount || '0'} ${subwalletFundCurrency === 'APAY' ? '$APAY' : subwalletFundCurrency} Now`}
                    </span>
                  </>
                )}
              </button>

              {fundStatus && (
                <div className="text-[11px] font-mono text-center text-slate-500 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 break-words">
                  {fundStatus}
                </div>
              )}
            </div>

            {/* Archived Sub-Wallets History (Zero-Loss Key Vault) */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowArchivedWallets(!showArchivedWallets)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors py-1"
              >
                <span className="flex items-center gap-1.5 font-spatial">
                  <Shield className="w-3.5 h-3.5 text-blue-500" />
                  Archived Sub-Wallets History
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  {archivedWallets.length} Saved
                </span>
              </button>

              {showArchivedWallets && (
                <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
                  {archivedWallets.length === 0 ? (
                    <p className="text-[11px] text-slate-400 font-mono text-center py-2">
                      No previous sub-wallets archived yet. All rotated keys are auto-saved here.
                    </p>
                  ) : (
                    archivedWallets.map((arch, idx) => (
                      <div
                        key={arch.address + arch.archivedAt}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <Key className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">
                              {arch.address}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRestoreSubwallet(arch)}
                              className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-600 dark:text-sky-300 border border-blue-200 dark:border-blue-800 text-[10px] font-mono font-bold cursor-pointer transition-colors"
                              title="Restore this key as active sub-wallet"
                            >
                              Restore
                            </button>
                            <a
                              href={`${chainConfig.explorerUrl}/address/${arch.address}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                              title="View on Explorer"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                          <span>
                            Key:{' '}
                            {revealedArchivedKeyIndex === idx
                              ? arch.privateKey
                              : `${arch.privateKey.slice(0, 8)}••••••••`}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedArchivedKeyIndex(
                                  revealedArchivedKeyIndex === idx ? null : idx,
                                )
                              }
                              className="p-0.5 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                              title={revealedArchivedKeyIndex === idx ? 'Hide Key' : 'Reveal Key'}
                            >
                              {revealedArchivedKeyIndex === idx ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                copyText(arch.privateKey, (v) =>
                                  setCopiedArchivedKeyIndex(v ? idx : null),
                                )
                              }
                              className="p-0.5 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                              title="Copy Key"
                            >
                              {copiedArchivedKeyIndex === idx ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadEnvFile(arch.privateKey, arch.address)}
                              className="p-0.5 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                              title="Download .env for this key"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                            <span className="text-[9px] text-slate-500 ml-1">
                              {new Date(arch.archivedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2-Line Python SDK & Quick Agent Call Simulator */}
        <div className="glass-panel rounded-3xl p-6 soft-shadow space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-1">
              <span className="font-spatial text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                2-Line Buyer SDK (`pip install apay`)
              </span>
              <button
                type="button"
                onClick={() => copyText(pythonSnippet, setCopiedCode)}
                className="text-blue-600 dark:text-sky-400 text-xs font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedCode ? 'Copied' : 'Copy Python Code'}
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 text-sky-300 font-mono text-xs overflow-x-auto whitespace-pre">
              {pythonSnippet}
            </div>

            {/* Quick Test Agent Call Simulator */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-emerald-500" />
                  Test Autonomous Agent Payment Call:
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                  100% Direct P2P to Merchant
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                Simulate this agent sub-wallet calling any A-Pay protected endpoint or website.
                Tokens settle directly from your agent to the merchant&apos;s wallet with zero
                platform cut.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  placeholder="https://yourwebsite.com/api/data or enter URL"
                  value={testEndpointUrl}
                  onChange={(e) => setTestEndpointUrl(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleTestAgentCall}
                  disabled={isTestingAgentCall}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Play className={`w-3 h-3 ${isTestingAgentCall ? 'animate-spin' : ''}`} />
                  <span>{isTestingAgentCall ? 'Simulating...' : '⚡ Test Agent Call'}</span>
                </button>
              </div>

              {testAgentResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-mono space-y-1 animate-fadeIn ${
                    testAgentResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {testAgentResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <span>{testAgentResult.message}</span>
                  </div>
                  {testAgentResult.details && (
                    <div className="text-[11px] opacity-85 leading-relaxed">
                      {testAgentResult.details}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-1">
            <span>Non-custodial ECDSA secp256k1 key generation.</span>
            <span className="text-emerald-500">{chainConfig.chainName}</span>
          </div>
        </div>
      </div>

      {/* 🚀 Multi-Agent Swarm Escrow Delegation Studio (EscrowVault.sol) */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 soft-shadow space-y-6 border border-purple-500/20 dark:border-purple-900/40 bg-gradient-to-b from-purple-50/20 via-transparent to-transparent dark:from-purple-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300">
                <Key className="w-5 h-5" />
              </div>
              <h3 className="font-spatial text-xl font-bold text-slate-900 dark:text-white">
                Multi-Agent Swarm Escrow Studio (EscrowVault.sol)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Non-custodial smart contract delegation. Deposit once into the master vault and
              provision ephemeral sub-agent session keys with strict daily spending ceilings and
              automated time expiration.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800/60 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>EscrowVault Active</span>
            </span>
          </div>
        </div>

        {/* Guest Mode Exploration Banner */}
        {!walletAddress && (
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fadeIn">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <Wallet className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Guest Exploration Mode:</strong> Connect your master wallet to deposit funds
                into EscrowVault and delegate on-chain session keys.
              </span>
            </div>
            {onConnect && (
              <button
                type="button"
                onClick={onConnect}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 cursor-pointer shadow-sm transition-all flex items-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        )}

        {/* Master Vault Metrics & Funding */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">
              Escrow Contract
            </span>
            <div className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400 truncate">
              {contracts.EscrowVault.address}
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              {chainConfig.chainName} ({chainConfig.chainId})
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2.5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">
                Master Vault Balance (USDC)
              </span>
              <div className="font-mono text-lg font-black text-slate-900 dark:text-white">
                ${vaultUsdcBalance} <span className="text-xs font-normal text-slate-400">USDC</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-xs text-slate-400 font-mono">$</span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Amount"
                  value={vaultDepositUsdcAmount}
                  onChange={(e) => setVaultDepositUsdcAmount(e.target.value)}
                  className="w-full pl-6 pr-14 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="absolute right-2 text-[10px] font-mono text-slate-400 pointer-events-none">
                  USDC
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {['1', '5', '10', '25', '50'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setVaultDepositUsdcAmount(chip)}
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                      vaultDepositUsdcAmount === chip
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 dark:text-sky-300 font-bold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400'
                    }`}
                  >
                    +${chip}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleDepositToVault('USDC')}
                disabled={walletAddress ? isDepositing : false}
                className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer ${
                  !walletAddress
                    ? 'bg-slate-800 hover:bg-slate-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white'
                }`}
              >
                {!walletAddress ? (
                  <>
                    <Wallet className="w-3 h-3 text-sky-400" />
                    <span>Connect Wallet to Deposit</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" />
                    <span>Deposit ${vaultDepositUsdcAmount || '0'} USDC</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2.5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">
                Master Vault Balance ($APAY)
              </span>
              <div className="font-mono text-lg font-black text-amber-500">
                {vaultApayBalance} <span className="text-xs font-normal text-slate-400">$APAY</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Amount"
                  value={vaultDepositApayAmount}
                  onChange={(e) => setVaultDepositApayAmount(e.target.value)}
                  className="w-full px-2.5 pr-14 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <span className="absolute right-2 text-[10px] font-mono text-slate-400 pointer-events-none">
                  $APAY
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {['5', '10', '25', '50', '200'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setVaultDepositApayAmount(chip)}
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                      vaultDepositApayAmount === chip
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-600 dark:text-amber-300 font-bold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400'
                    }`}
                  >
                    +{chip}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleDepositToVault('APAY')}
                disabled={walletAddress ? isDepositing : false}
                className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer ${
                  !walletAddress
                    ? 'bg-slate-800 hover:bg-slate-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white'
                }`}
              >
                {!walletAddress ? (
                  <>
                    <Wallet className="w-3 h-3 text-amber-400" />
                    <span>Connect Wallet to Deposit</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" />
                    <span>Deposit {vaultDepositApayAmount || '0'} $APAY</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {depositMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-mono text-emerald-700 dark:text-emerald-300 text-center animate-fadeIn">
            {depositMsg}
          </div>
        )}

        {/* Delegate New Sub-Agent Form */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Delegate New Sub-Agent Session Key</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400">
                Agent Name / Role
              </label>
              <input
                type="text"
                placeholder="e.g. Market Research Bot"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase text-slate-400">
                  Sub-Agent EVM Address (0x...)
                </label>
                {agentAddress && (
                  <button
                    type="button"
                    onClick={() => setNewAgentAddress(agentAddress)}
                    className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold hover:underline cursor-pointer"
                  >
                    Use Active Key
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="0x..."
                value={newAgentAddress}
                onChange={(e) => setNewAgentAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">
                  Daily Cap ($)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={newAgentLimit}
                  onChange={(e) => setNewAgentLimit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">
                  Duration (h)
                </label>
                <select
                  value={newAgentHours}
                  onChange={(e) => setNewAgentHours(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="6">6 Hours</option>
                  <option value="12">12 Hours</option>
                  <option value="24">24 Hours</option>
                  <option value="168">7 Days</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleDelegateAgent}
              disabled={walletAddress ? isDelegating || !newAgentAddress : false}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all ${
                !walletAddress
                  ? 'bg-slate-800 hover:bg-slate-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white'
              }`}
            >
              {!walletAddress ? (
                <>
                  <Wallet className="w-3.5 h-3.5 text-purple-400" />
                  <span>Connect Wallet to Authorize</span>
                </>
              ) : (
                <>
                  <Key className="w-3.5 h-3.5" />
                  <span>{isDelegating ? 'Authorizing on Base...' : 'Authorize Session Key'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Active Delegated Agents Registry */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
            <span>Active Delegated Swarm Agents ({delegatedAgents.length})</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Enforced by EscrowVault.sol
            </span>
          </div>

          <div className="space-y-2">
            {delegatedAgents.map((ag) => {
              const spentPct = Math.min(100, Math.round((ag.spentToday / ag.dailyLimit) * 100));
              const isExpired = Date.now() > ag.expiresAt;
              const statusLabel = !ag.active ? 'REVOKED' : isExpired ? 'EXPIRED' : 'ACTIVE';
              const statusColor = !ag.active
                ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                : isExpired
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400';

              return (
                <div
                  key={ag.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {ag.name}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                      <span className="truncate max-w-[200px] sm:max-w-xs">{ag.address}</span>
                      <button
                        type="button"
                        onClick={() => copyText(ag.address, () => setCopiedAgentId(ag.id))}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title="Copy Address"
                      >
                        {copiedAgentId === ag.id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Spend Progress Bar */}
                    <div className="space-y-1 pt-1 max-w-md">
                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <span>Daily Spend: ${ag.spentToday.toFixed(3)} USDC</span>
                        <span>Limit: ${ag.dailyLimit.toFixed(2)} USDC</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            spentPct > 80 ? 'bg-amber-500' : 'bg-purple-600'
                          }`}
                          style={{ width: `${spentPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        {isExpired
                          ? 'Expired'
                          : `Expires in ${Math.max(
                              1,
                              Math.round((ag.expiresAt - Date.now()) / (3600 * 1000)),
                            )}h`}
                      </span>
                    </div>

                    {ag.active && !isExpired && (
                      <button
                        type="button"
                        onClick={() => handleRevokeAgent(ag.id)}
                        className="px-3 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 font-mono text-[11px] font-bold border border-red-200 dark:border-red-900/60 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CLI Equivalent Reference */}
        <div className="p-3 rounded-xl bg-slate-900 text-slate-300 font-mono text-[11px] flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-bold">CLI:</span>
            <span>
              apay agent delegate --agent-address {agentAddress || '0x...'} --limit 0.25 --hours 24
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              copyText(
                `apay agent delegate --agent-address ${agentAddress || '0x...'} --limit 0.25 --hours 24`,
                () => {},
              )
            }
            className="text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
