/**
 * ⚡ A-PAY PROTOCOL: TypeScript Agent Buyer Client SDK
 * Enables autonomous AI agents in Node.js, ElizaOS, LangChain.js, and Vercel AI SDK
 * to navigate and pay for HTTP 402 protected APIs on the fly using non-custodial wallets.
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import type { Address } from 'viem';

export interface AgentWalletConfig {
  privateKey?: `0x${string}`;
  maxPerCallUsdc?: number;
  dailyBudgetUsdc?: number;
  maxPerCallApay?: number;
  dailyBudgetApay?: number;
}

export interface SpendCheckResult {
  allowed: boolean;
  reason?: string;
}

export class AgentWalletTS {
  public readonly address: Address;
  public readonly privateKey: `0x${string}`;
  public readonly account: ReturnType<typeof privateKeyToAccount>;

  public maxPerCallUsdc: number;
  public dailyBudgetUsdc: number;
  public maxPerCallApay: number;
  public dailyBudgetApay: number;

  public totalSpentUsdc: number = 0;
  public totalSpentApay: number = 0;

  constructor(config: AgentWalletConfig = {}) {
    this.privateKey = config.privateKey || generatePrivateKey();
    this.account = privateKeyToAccount(this.privateKey);
    this.address = this.account.address;

    this.maxPerCallUsdc = config.maxPerCallUsdc ?? 0.05;
    this.dailyBudgetUsdc = config.dailyBudgetUsdc ?? 2.0;
    this.maxPerCallApay = config.maxPerCallApay ?? 10.0;
    this.dailyBudgetApay = config.dailyBudgetApay ?? 100.0;
  }

  public static create(config?: AgentWalletConfig): AgentWalletTS {
    return new AgentWalletTS(config);
  }

  public canSpend(amount: number, currency: 'USDC' | 'APAY'): SpendCheckResult {
    if (currency === 'APAY') {
      if (amount > this.maxPerCallApay) {
        return {
          allowed: false,
          reason: `Amount ${amount} $APAY exceeds max per call limit (${this.maxPerCallApay} $APAY)`,
        };
      }
      if (this.totalSpentApay + amount > this.dailyBudgetApay) {
        return {
          allowed: false,
          reason: `Spend would exceed daily $APAY budget (${this.dailyBudgetApay} $APAY)`,
        };
      }
    } else {
      if (amount > this.maxPerCallUsdc) {
        return {
          allowed: false,
          reason: `Amount $${amount} USDC exceeds max per call limit ($${this.maxPerCallUsdc})`,
        };
      }
      if (this.totalSpentUsdc + amount > this.dailyBudgetUsdc) {
        return {
          allowed: false,
          reason: `Spend would exceed daily USDC budget ($${this.dailyBudgetUsdc})`,
        };
      }
    }

    return { allowed: true };
  }

  public recordSpend(amount: number, currency: 'USDC' | 'APAY'): void {
    if (currency === 'APAY') {
      this.totalSpentApay += amount;
    } else {
      this.totalSpentUsdc += amount;
    }
  }

  public async signPaymentAuthorization(params: {
    receiver: Address;
    amountBaseUnits: bigint;
    nonce: string;
    chainId: number;
    verifyingContract: Address;
  }): Promise<string> {
    return this.account.signTypedData({
      domain: {
        name: 'APay Protocol',
        version: '1',
        chainId: params.chainId,
        verifyingContract: params.verifyingContract,
      },
      types: {
        PaymentAuthorization: [
          { name: 'payer', type: 'address' },
          { name: 'receiver', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'string' },
        ],
      },
      primaryType: 'PaymentAuthorization',
      message: {
        payer: this.address,
        receiver: params.receiver,
        amount: params.amountBaseUnits,
        nonce: params.nonce,
      },
    });
  }
}

export interface APayClientOptions {
  preferredCurrency?: 'USDC' | 'APAY';
}

export class APayClientTS {
  public wallet: AgentWalletTS;
  public preferredCurrency: 'USDC' | 'APAY';

  constructor(wallet: AgentWalletTS, options: APayClientOptions = {}) {
    this.wallet = wallet;
    this.preferredCurrency = options.preferredCurrency ?? 'USDC';
  }

  /**
   * Executes an HTTP fetch request, auto-negotiating HTTP 402 Payment Required challenges.
   */
  public async fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const originalResponse = await fetch(input, init);

    if (originalResponse.status !== 402) {
      return originalResponse;
    }

    // Intercepted HTTP 402 Payment Required
    const headers = originalResponse.headers;
    const receiver = (headers.get('x-apay-receiver') ||
      headers.get('X-APay-Receiver')) as Address | null;
    const nonce = headers.get('x-apay-nonce') || headers.get('X-APay-Nonce');
    const currencyHeader = (headers.get('x-apay-currency') ||
      headers.get('X-APay-Currency') ||
      'USDC').toUpperCase();
    const router = (headers.get('x-apay-router') ||
      headers.get('X-APay-Router') ||
      '0x71434344beEF9C44fF3BC95572bEB7bFB8847ec6') as Address;
    const chainIdStr = headers.get('x-apay-chain-id') || headers.get('X-APay-Chain-Id') || '84532';
    const chainId = parseInt(chainIdStr, 10);

    if (!receiver || !nonce) {
      // Incomplete challenge headers, return 402 as is
      return originalResponse;
    }

    let selectedCurrency: 'USDC' | 'APAY' = 'USDC';
    let amountBaseUnits: bigint = 0n;
    let costDecimal: number = 0;

    const usdcHeader = headers.get('x-apay-amount-usdc') || headers.get('X-APay-Amount-USDC');
    const apayHeader = headers.get('x-apay-amount-apay') || headers.get('X-APay-Amount-APAY');
    const genericAmountHeader = headers.get('x-apay-amount') || headers.get('X-APay-Amount');

    if (currencyHeader === 'DUAL' && usdcHeader && apayHeader) {
      // Dual currency support: choose preferred or available within budget
      const usdcCost = Number(BigInt(usdcHeader)) / 1_000_000;
      const apayCost = Number(BigInt(apayHeader)) / 1e18;

      if (this.preferredCurrency === 'APAY' && this.wallet.canSpend(apayCost, 'APAY').allowed) {
        selectedCurrency = 'APAY';
        amountBaseUnits = BigInt(apayHeader);
        costDecimal = apayCost;
      } else if (this.wallet.canSpend(usdcCost, 'USDC').allowed) {
        selectedCurrency = 'USDC';
        amountBaseUnits = BigInt(usdcHeader);
        costDecimal = usdcCost;
      } else {
        selectedCurrency = 'USDC';
        amountBaseUnits = BigInt(usdcHeader);
        costDecimal = usdcCost;
      }
    } else if (currencyHeader === 'APAY') {
      selectedCurrency = 'APAY';
      const rawUnits = apayHeader || genericAmountHeader || '0';
      amountBaseUnits = BigInt(rawUnits);
      costDecimal = Number(amountBaseUnits) / 1e18;
    } else {
      selectedCurrency = 'USDC';
      const rawUnits = usdcHeader || genericAmountHeader || '0';
      amountBaseUnits = BigInt(rawUnits);
      costDecimal = Number(amountBaseUnits) / 1_000_000;
    }

    // Enforce safety invariant guardrail
    const check = this.wallet.canSpend(costDecimal, selectedCurrency);
    if (!check.allowed) {
      throw new Error(`[A-Pay Guardrail Triggered] ${check.reason}`);
    }

    // Cryptographically sign EIP-712 authorization
    const signature = await this.wallet.signPaymentAuthorization({
      receiver,
      amountBaseUnits,
      nonce,
      chainId,
      verifyingContract: router,
    });

    const authHeaderValue = `APay eip712:${signature}:${this.wallet.address}:${nonce}:${amountBaseUnits.toString()}`;

    // Replay request with payment authorization
    const retryHeaders = new Headers(init?.headers);
    retryHeaders.set('Authorization', authHeaderValue);

    const retryInit: RequestInit = {
      ...init,
      headers: retryHeaders,
    };

    const paymentResponse = await fetch(input, retryInit);

    if (paymentResponse.ok) {
      this.wallet.recordSpend(costDecimal, selectedCurrency);
    }

    return paymentResponse;
  }
}

/**
 * Convenient 1-line helper for TypeScript AI agents:
 * const response = await fetchWithAPay(wallet, "https://api.domain.com/data");
 */
export async function fetchWithAPay(
  wallet: AgentWalletTS,
  input: string | URL | Request,
  init?: RequestInit,
  options?: APayClientOptions
): Promise<Response> {
  const client = new APayClientTS(wallet, options);
  return client.fetch(input, init);
}

export interface DiscoveredService {
  targetDomain: string;
  price: string;
  network: string;
  version: string;
  status: string;
  lastHeartbeat: number;
}

/**
 * Discovers active public paid APIs on the A-Pay Protocol network.
 */
export async function discoverServices(
  registryUrl: string = 'https://apayprotocol.org/api/registry',
  options?: { timeoutMs?: number }
): Promise<DiscoveredService[]> {
  const timeoutMs = options?.timeoutMs ?? 5000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${registryUrl}?public=true`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'APay-AgentTS-Discovery/1.0',
      },
      signal: controller.signal,
    });
    if (res.ok) {
      const data = (await res.json()) as { services?: DiscoveredService[] };
      return data.services || [];
    }
  } catch {
    // Graceful fallback on network timeout or offline
  } finally {
    clearTimeout(id);
  }
  return [];
}

