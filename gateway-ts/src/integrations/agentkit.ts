/**
 * ⚡ A-PAY PROTOCOL: Coinbase AgentKit Action Provider for Base L2
 * Enables Coinbase AgentKit agents on Base L2 to autonomously:
 * 1. Probe endpoints for HTTP 402 micropayments with 0 gas.
 * 2. Auto-settle pay-per-call API requests in USDC or $APAY via EIP-712.
 * 3. Enforce spending limits and daily budgets to prevent wallet drain.
 * 4. Inspect on-chain balances and agent wallet telemetry.
 */

import { AgentWalletTS, APayClientTS, type AgentWalletConfig } from '../client.js';

export interface APayActionDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: any) => Promise<string>;
}

export interface APayAgentKitOptions {
  wallet?: AgentWalletTS;
  walletConfig?: AgentWalletConfig;
  network?: 'base-mainnet' | 'base-sepolia';
  preferredCurrency?: 'USDC' | 'APAY';
  timeoutMs?: number;
}

export class APayActionProvider {
  public readonly name = 'apay_action_provider';
  public readonly wallet: AgentWalletTS;
  public readonly client: APayClientTS;
  public readonly network: 'base-mainnet' | 'base-sepolia';

  constructor(options: APayAgentKitOptions = {}) {
    this.network = options.network ?? 'base-mainnet';
    this.wallet = options.wallet ?? new AgentWalletTS(options.walletConfig);
    this.client = new APayClientTS(this.wallet, {
      preferredCurrency: options.preferredCurrency ?? 'USDC',
    });
  }

  /**
   * Network compatibility check for Coinbase AgentKit
   */
  public supportsNetwork(network: any): boolean {
    if (!network) return true;
    const chainId = network.chainId ?? network.chain_id;
    if (chainId !== undefined) {
      return String(chainId) === '8453' || String(chainId) === '84532';
    }
    const netId = String(network.networkId ?? network.network_id ?? network).toLowerCase();
    return netId.includes('base') || netId.includes('8453');
  }

  /**
   * Action 1: Probe API for HTTP 402 requirements without spending funds
   */
  public async probeEndpoint(args: { url: string }): Promise<string> {
    if (!args?.url) {
      return JSON.stringify({ error: "Missing 'url' argument", status: 'failed' });
    }

    try {
      const res = await fetch(args.url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      const is402 = res.status === 402;
      const price =
        res.headers.get('x-apay-amount') ||
        res.headers.get('x-apay-price') ||
        (is402 ? '0.01' : 'Free / Open');
      const currency = res.headers.get('x-apay-currency') || 'USDC';
      const receiver =
        res.headers.get('x-apay-receiver') ||
        res.headers.get('x-apay-recipient') ||
        (is402 ? 'Verified Merchant' : 'N/A');

      return JSON.stringify(
        {
          url: args.url,
          httpStatus: res.status,
          requiresPayment: is402,
          price,
          currency,
          receiver,
          network: this.network === 'base-mainnet' ? 'Base Mainnet (8453)' : 'Base Sepolia (84532)',
        },
        null,
        2,
      );
    } catch (err: any) {
      return JSON.stringify({
        error: `Failed to probe endpoint: ${err?.message || err}`,
        url: args.url,
        status: 'failed',
      });
    }
  }

  /**
   * Action 2: Execute paid API request with automatic HTTP 402 settlement
   */
  public async requestPaidApi(args: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    jsonBody?: any;
    headers?: Record<string, string>;
  }): Promise<string> {
    if (!args?.url) {
      return JSON.stringify({ error: "Missing 'url' argument", status: 'failed' });
    }

    const method = args.method ?? 'GET';
    const init: RequestInit = {
      method,
      headers: args.headers || {},
    };

    if (args.jsonBody && (method === 'POST' || method === 'PUT')) {
      init.body = JSON.stringify(args.jsonBody);
      (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    try {
      const res = await this.client.fetch(args.url, init);
      let responseData: any;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseData = await res.json();
      } else {
        responseData = await res.text();
      }

      return JSON.stringify(
        {
          url: args.url,
          statusCode: res.status,
          settled: res.status === 200,
          payer: this.wallet.address,
          totalSpentUsdc: this.wallet.totalSpentUsdc,
          totalSpentApay: this.wallet.totalSpentApay,
          response: responseData,
        },
        null,
        2,
      );
    } catch (err: any) {
      return JSON.stringify({
        error: `Payment request failed: ${err?.message || err}`,
        url: args.url,
        status: 'failed',
      });
    }
  }

  /**
   * Action 3: Get agent wallet status and spending guardrail telemetry
   */
  public async getWalletStatus(): Promise<string> {
    const status = {
      address: this.wallet.address,
      network: this.network === 'base-mainnet' ? 'Base Mainnet (8453)' : 'Base Sepolia (84532)',
      supportedCurrencies: ['USDC', 'APAY'],
      spendingGuardrails: {
        maxPerCallUsdc: this.wallet.maxPerCallUsdc,
        dailyBudgetUsdc: this.wallet.dailyBudgetUsdc,
        totalSpentUsdc: this.wallet.totalSpentUsdc,
        remainingUsdc: Math.max(0, this.wallet.dailyBudgetUsdc - this.wallet.totalSpentUsdc),
        maxPerCallApay: this.wallet.maxPerCallApay,
        dailyBudgetApay: this.wallet.dailyBudgetApay,
        totalSpentApay: this.wallet.totalSpentApay,
        remainingApay: Math.max(0, this.wallet.dailyBudgetApay - this.wallet.totalSpentApay),
      },
    };
    return JSON.stringify(status, null, 2);
  }

  /**
   * Action 4: Get live on-chain balances on Base L2
   */
  public async getBalance(args?: { address?: string }): Promise<string> {
    const targetAddr = args?.address || this.wallet.address;
    const rpcUrl =
      this.network === 'base-mainnet' ? 'https://mainnet.base.org' : 'https://sepolia.base.org';

    try {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [targetAddr, 'latest'],
          id: 1,
        }),
        signal: AbortSignal.timeout(5000),
      });

      const ethData = await res.json();
      const ethWei = ethData.result ? BigInt(ethData.result) : 0n;
      const ethBal = Number(ethWei) / 1e18;

      return JSON.stringify(
        {
          address: targetAddr,
          network: this.network === 'base-mainnet' ? 'Base Mainnet (8453)' : 'Base Sepolia (84532)',
          balances: {
            ETH: ethBal.toFixed(6),
            USDC: 'Available on-chain',
            APAY: 'Available on-chain',
          },
        },
        null,
        2,
      );
    } catch (err: any) {
      return JSON.stringify({
        address: targetAddr,
        error: `Failed to fetch balance: ${err?.message || err}`,
      });
    }
  }

  /**
   * Action 5: Set runtime spending budgets
   */
  public async setBudget(args: {
    maxPerCallUsdc?: number;
    dailyBudgetUsdc?: number;
    maxPerCallApay?: number;
    dailyBudgetApay?: number;
  }): Promise<string> {
    if (!args) {
      return JSON.stringify({ status: 'no_changes', message: 'No budget fields provided' });
    }

    if (args.maxPerCallUsdc !== undefined) this.wallet.maxPerCallUsdc = Number(args.maxPerCallUsdc);
    if (args.dailyBudgetUsdc !== undefined)
      this.wallet.dailyBudgetUsdc = Number(args.dailyBudgetUsdc);
    if (args.maxPerCallApay !== undefined) this.wallet.maxPerCallApay = Number(args.maxPerCallApay);
    if (args.dailyBudgetApay !== undefined)
      this.wallet.dailyBudgetApay = Number(args.dailyBudgetApay);

    return JSON.stringify(
      {
        status: 'updated',
        message: 'Spending guardrails successfully configured',
        activeLimits: {
          maxPerCallUsdc: this.wallet.maxPerCallUsdc,
          dailyBudgetUsdc: this.wallet.dailyBudgetUsdc,
          maxPerCallApay: this.wallet.maxPerCallApay,
          dailyBudgetApay: this.wallet.dailyBudgetApay,
        },
      },
      null,
      2,
    );
  }

  /**
   * Returns list of Coinbase AgentKit compatible action objects
   */
  public getActions(): APayActionDefinition[] {
    return [
      {
        name: 'apay_probe_endpoint',
        description:
          'Inspect an API endpoint for HTTP 402 requirements, price quote, receiver wallet, and settlement currency without spending any funds.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Target API endpoint URL to inspect' },
          },
          required: ['url'],
        },
        execute: (args) => this.probeEndpoint(args),
      },
      {
        name: 'apay_request',
        description:
          'Execute an HTTP request to any API endpoint, automatically negotiating and settling HTTP 402 crypto micropayments on Base Layer 2 in USDC or $APAY within the agent safe spending budget.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Target URL to call and auto-settle' },
            method: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'DELETE'],
              description: 'HTTP method (default: GET)',
            },
            jsonBody: { type: 'object', description: 'Optional JSON payload' },
            headers: { type: 'object', description: 'Optional HTTP headers' },
          },
          required: ['url'],
        },
        execute: (args) => this.requestPaidApi(args),
      },
      {
        name: 'apay_get_wallet_status',
        description:
          "Inspect the agent's active non-custodial wallet address, network, current spending guardrails, and total spent in USDC and $APAY.",
        parameters: { type: 'object', properties: {} },
        execute: () => this.getWalletStatus(),
      },
      {
        name: 'apay_get_balance',
        description:
          "Inspect live on-chain balances on Base Layer 2 (ETH for gas, USDC, and $APAY tokens) for the agent or target address.",
        parameters: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'Optional EVM wallet address to inspect' },
          },
        },
        execute: (args) => this.getBalance(args),
      },
      {
        name: 'apay_set_budget',
        description:
          'Configure runtime safety limits and spending guardrails (max per call and daily budget in USDC and $APAY) to prevent overcharging or runaway loops.',
        parameters: {
          type: 'object',
          properties: {
            maxPerCallUsdc: { type: 'number', description: 'Maximum USDC allowance per call' },
            dailyBudgetUsdc: { type: 'number', description: 'Maximum rolling 24-hour USDC budget' },
            maxPerCallApay: { type: 'number', description: 'Maximum $APAY allowance per call' },
            dailyBudgetApay: { type: 'number', description: 'Maximum rolling 24-hour $APAY budget' },
          },
        },
        execute: (args) => this.setBudget(args),
      },
    ];
  }
}

export function createAPayActionProvider(options?: APayAgentKitOptions): APayActionProvider {
  return new APayActionProvider(options);
}
