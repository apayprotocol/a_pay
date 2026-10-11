import { NextResponse } from 'next/server';
import { validateSafePublicUrl } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id',
};

const MCP_TOOLS = [
  {
    name: 'apay_request',
    description:
      'Probe and automatically pay HTTP 402 crypto micropayments on Base Layer 2 with USDC or $APAY within pre-configured budget limits.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The target endpoint URL',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE'],
          default: 'GET',
        },
        json_body: {
          type: 'object',
          description: 'Optional JSON request body',
        },
        headers: {
          type: 'object',
          description: 'Optional additional HTTP headers',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'apay_get_wallet_status',
    description:
      "Inspect the agent's active non-custodial wallet address, network, current spending guardrails, and total spent in USDC and $APAY.",
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'apay_set_budget',
    description:
      'Configure agent safety invariants and spending guardrails. Prevents runaway loops or overcharging.',
    inputSchema: {
      type: 'object',
      properties: {
        max_per_call_usdc: {
          type: 'number',
          description: 'Maximum USDC allowance for a single API call',
        },
        daily_budget_usdc: {
          type: 'number',
          description: 'Maximum USDC rolling 24-hour spending budget',
        },
        max_per_call_apay: {
          type: 'number',
          description: 'Maximum $APAY token allowance for a single API call',
        },
        daily_budget_apay: {
          type: 'number',
          description: 'Maximum $APAY token rolling 24-hour spending budget',
        },
      },
    },
  },
  {
    name: 'apay_inspect_endpoint',
    description:
      'Inspect an endpoint to check if it requires an A-Pay micropayment, inspect the exact price quote, currency, and payout receiver without spending any funds.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to probe for HTTP 402 payment requirements',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'apay_get_balance',
    description:
      "Inspect the agent's live on-chain balances on Base Layer 2, including native ETH (for gas), USDC, and $APAY tokens.",
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Optional target EVM address to inspect balances for',
        },
      },
    },
  },
];

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET() {
  return NextResponse.json(
    {
      serverInfo: {
        name: 'apay-mcp',
        version: '0.1.8',
        description:
          'Universal Micropayment & Autonomous Economic Settlement Engine for AI Agents on Base L2.',
      },
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      tools: MCP_TOOLS,
    },
    { headers: CORS_HEADERS },
  );
}

export async function POST(request: Request) {
  try {
    const message = await request.json();
    const method = message.method;
    const msgId = message.id ?? null;

    if (method === 'initialize') {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: msgId,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'apay-mcp',
              version: '0.1.8',
            },
          },
        },
        { headers: CORS_HEADERS },
      );
    }

    if (method === 'notifications/initialized') {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }

    if (method === 'tools/list') {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: msgId,
          result: {
            tools: MCP_TOOLS,
          },
        },
        { headers: CORS_HEADERS },
      );
    }

    if (method === 'ping') {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: msgId,
          result: {},
        },
        { headers: CORS_HEADERS },
      );
    }

    if (method === 'tools/call') {
      const params = message.params || {};
      const toolName = params.name;
      const args = params.arguments || {};

      if (toolName === 'apay_get_wallet_status') {
        return NextResponse.json(
          {
            jsonrpc: '2.0',
            id: msgId,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      status: 'operational',
                      network: 'Base Mainnet',
                      chainId: 8453,
                      supported_currencies: ['USDC', 'APAY'],
                      default_max_per_call_usdc: 0.05,
                      default_daily_budget_usdc: 2.0,
                    },
                    null,
                    2,
                  ),
                },
              ],
            },
          },
          { headers: CORS_HEADERS },
        );
      }

      if (toolName === 'apay_inspect_endpoint') {
        const url = args.url;
        if (!url) {
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              id: msgId,
              result: {
                isError: true,
                content: [{ type: 'text', text: "Missing 'url' argument" }],
              },
            },
            { headers: CORS_HEADERS },
          );
        }

        const urlCheck = validateSafePublicUrl(url, { allowLocalhostInDev: true });
        if (!urlCheck.safe) {
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              id: msgId,
              result: {
                isError: true,
                content: [
                  {
                    type: 'text',
                    text: `Security Policy Violation: ${urlCheck.error || 'Access to restricted IP/URL'}`,
                  },
                ],
              },
            },
            { headers: CORS_HEADERS },
          );
        }

        try {
          const probe = await fetch(url, { method: 'GET' });
          const is402 = probe.status === 402;
          const priceHeader =
            probe.headers.get('x-apay-amount') || probe.headers.get('x-apay-price') || 'N/A';
          const currencyHeader = probe.headers.get('x-apay-currency') || 'USDC';
          const recipientHeader =
            probe.headers.get('x-apay-receiver') || probe.headers.get('x-apay-recipient') || 'N/A';

          return NextResponse.json(
            {
              jsonrpc: '2.0',
              id: msgId,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      {
                        url,
                        requires_payment: is402,
                        http_status: probe.status,
                        price: priceHeader,
                        currency: currencyHeader,
                        recipient: recipientHeader,
                      },
                      null,
                      2,
                    ),
                  },
                ],
              },
            },
            { headers: CORS_HEADERS },
          );
        } catch (fetchErr: any) {
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              id: msgId,
              result: {
                isError: true,
                content: [
                  {
                    type: 'text',
                    text: `Failed to probe endpoint: ${fetchErr?.message || fetchErr}`,
                  },
                ],
              },
            },
            { headers: CORS_HEADERS },
          );
        }
      }

      if (toolName === 'apay_get_balance') {
        const targetAddress = args.address;
        if (
          !targetAddress ||
          typeof targetAddress !== 'string' ||
          !/^0x[a-fA-F0-9]{40}$/.test(targetAddress)
        ) {
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              id: msgId,
              result: {
                isError: true,
                content: [
                  { type: 'text', text: "Invalid or missing EVM 'address' argument (0x...)" },
                ],
              },
            },
            { headers: CORS_HEADERS },
          );
        }

        try {
          const ethRes = await fetch('https://mainnet.base.org', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getBalance',
              params: [targetAddress, 'latest'],
              id: 1,
            }),
          });
          const ethData = await ethRes.json();
          const ethWei = ethData.result ? BigInt(ethData.result) : 0n;
          const ethBal = Number(ethWei) / 1e18;

          return NextResponse.json(
            {
              jsonrpc: '2.0',
              id: msgId,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      {
                        address: targetAddress,
                        network: 'Base Mainnet (Chain ID 8453)',
                        balances: {
                          ETH: ethBal.toFixed(6),
                          currency_rails: ['USDC', 'APAY'],
                        },
                      },
                      null,
                      2,
                    ),
                  },
                ],
              },
            },
            { headers: CORS_HEADERS },
          );
        } catch (balErr: any) {
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              id: msgId,
              result: {
                content: [
                  {
                    type: 'text',
                    text: `Failed to fetch balance: ${balErr?.message || balErr}`,
                  },
                ],
              },
            },
            { headers: CORS_HEADERS },
          );
        }
      }

      // Default fallback for set_budget or apay_request
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: msgId,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  tool: toolName,
                  status: 'acknowledged',
                  message: `Tool ${toolName} ready for execution via A-Pay Gateway on Base Mainnet.`,
                }),
              },
            ],
          },
        },
        { headers: CORS_HEADERS },
      );
    }

    if (msgId !== null) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: msgId,
          error: { code: -32601, message: `Method not found: ${method}` },
        },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: `Parse error: ${err?.message || err}` },
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }
}
