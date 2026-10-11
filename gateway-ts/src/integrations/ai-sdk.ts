/**
 * ⚡ A-PAY PROTOCOL: Vercel AI SDK Integration
 * Provides plug-and-play tools and toolkits for Vercel AI SDK (`ai` package) agents,
 * enabling autonomous HTTP 402 payment negotiation on Base L2.
 */

import { AgentWalletTS, APayClientTS, type APayClientOptions } from '../client.js';

export interface APayAIToolOptions {
  description: string;
  targetUrl: string;
  wallet: AgentWalletTS;
  method?: 'GET' | 'POST';
  preferredCurrency?: 'USDC' | 'APAY';
  parameters?: any;
}

export interface APayAIToolDefinition {
  description: string;
  parameters?: any;
  execute: (args?: any) => Promise<any>;
  wallet: AgentWalletTS;
  targetUrl: string;
  method: 'GET' | 'POST';
  getWalletStatus: () => {
    address: string;
    spentUsdc: number;
    remainingUsdc: number;
    spentApay: number;
    remainingApay: number;
  };
}

/**
 * Creates a single Vercel AI SDK compatible tool.
 */
export function createAPayAITool(options: APayAIToolOptions): APayAIToolDefinition {
  const method = options.method ?? 'GET';
  const preferredCurrency = options.preferredCurrency ?? 'USDC';
  const wallet = options.wallet;
  const targetUrl = options.targetUrl;

  const defaultParameters = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Input query or parameter for the paid service',
      },
    },
  };

  return {
    description: options.description,
    parameters: options.parameters || defaultParameters,
    wallet,
    targetUrl,
    method,
    getWalletStatus: () => ({
      address: wallet.address,
      spentUsdc: wallet.totalSpentUsdc,
      remainingUsdc: Math.max(0, wallet.dailyBudgetUsdc - wallet.totalSpentUsdc),
      spentApay: wallet.totalSpentApay,
      remainingApay: Math.max(0, wallet.dailyBudgetApay - wallet.totalSpentApay),
    }),
    execute: async (args?: any) => {
      let query = '';
      if (typeof args === 'string') {
        query = args;
      } else if (args && typeof args === 'object') {
        query = args.query ?? '';
      }

      let url = targetUrl;
      const headers = new Headers();
      headers.set('X-APay-Preferred-Currency', preferredCurrency);

      const clientOptions: APayClientOptions = { preferredCurrency };
      const client = new APayClientTS(wallet, clientOptions);

      let init: RequestInit;

      if (method.toUpperCase() === 'GET') {
        if (query) {
          const parsed = new URL(targetUrl);
          parsed.searchParams.set('q', query);
          url = parsed.toString();
        }
        init = { method: 'GET', headers };
      } else {
        headers.set('Content-Type', 'application/json');
        const bodyPayload = typeof args === 'object' && args !== null ? args : { query };
        init = {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload),
        };
      }

      const response = await client.fetch(url, init);
      const text = await response.text();

      if (!response.ok) {
        throw new Error(`[A-Pay] Request to ${targetUrl} failed with status ${response.status}: ${text}`);
      }

      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    },
  };
}

export interface APayEndpointConfig {
  url: string;
  description: string;
  method?: 'GET' | 'POST';
  parameters?: any;
}

/**
 * Creates a dictionary of Vercel AI SDK tools from an endpoint configuration map.
 * Pass directly into `generateText({ tools })` or `streamText({ tools })`.
 */
export function createAPayToolkit(
  wallet: AgentWalletTS,
  endpoints: Record<string, APayEndpointConfig>,
  options?: { preferredCurrency?: 'USDC' | 'APAY' }
): Record<string, APayAIToolDefinition> {
  const tools: Record<string, APayAIToolDefinition> = {};

  for (const [name, config] of Object.entries(endpoints)) {
    tools[name] = createAPayAITool({
      description: config.description,
      targetUrl: config.url,
      wallet,
      method: config.method,
      parameters: config.parameters,
      preferredCurrency: options?.preferredCurrency,
    });
  }

  return tools;
}
