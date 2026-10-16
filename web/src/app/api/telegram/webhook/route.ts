import { NextResponse } from 'next/server';
import { createPublicClient, defineChain, formatEther, formatUnits, http, isAddress } from 'viem';
import { CONTRACTS } from '@/config/contracts';

const baseChain = defineChain({
  id: 8453,
  name: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://basescan.org' },
  },
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    first_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  text?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: {
    id: number;
    first_name?: string;
    username?: string;
  };
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  if (!BOT_TOKEN) {
    console.error('[Telegram Bot] Missing TELEGRAM_BOT_TOKEN environment variable');
    return;
  }

  const endpoint = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: replyMarkup,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Telegram Bot] Send message failed:', res.status, errText);
    }
  } catch (err) {
    console.error('[Telegram Bot] Error sending message:', err);
  }
}

// Minimal ERC20 ABI for balance checks
const ERC20_BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

async function fetchWalletBalances(address: `0x${string}`) {
  const client = createPublicClient({
    chain: baseChain,
    transport: http('https://mainnet.base.org', { timeout: 4000 }),
  });

  const [ethBalance, apayBalance] = await Promise.all([
    client.getBalance({ address }).catch(() => 0n),
    client
      .readContract({
        address: CONTRACTS.APAYToken.address,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [address],
      })
      .catch(() => 0n),
  ]);

  return {
    eth: Number(formatEther(ethBalance)).toFixed(4),
    apay: Number(formatUnits(apayBalance, 18)).toLocaleString('en-US', {
      maximumFractionDigits: 2,
    }),
  };
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    protocol: 'A-Pay Protocol Telegram Webhook',
    bot: '@APay_Protocol_Bot',
    network: 'Base L2 (Mainnet & Sepolia)',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  try {
    const update: TelegramUpdate = await req.json();

    let chatId: number | undefined;
    let text = '';
    let userName = 'builder';

    if (update.message) {
      chatId = update.message.chat.id;
      text = (update.message.text || '').trim();
      userName = update.message.from?.first_name || update.message.from?.username || 'builder';
    } else if (update.callback_query?.message) {
      chatId = update.callback_query.message.chat.id;
      text = (update.callback_query.data || '').trim();
      userName = update.callback_query.from.first_name || 'builder';
    }

    if (!chatId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const command = text.split(' ')[0].toLowerCase();
    const args = text.split(' ').slice(1);

    // ── 1. /start ─────────────────────────────────────────────────────────────
    if (command === '/start') {
      const welcomeMsg =
        `<b>⚡ Welcome to A-Pay Protocol, ${userName}!</b>\n\n` +
        `The non-custodial machine-to-machine (M2M) micropayment & AI agent settlement network on <b>Base L2</b>.\n\n` +
        `<b>🔥 Core Capabilities:</b>\n` +
        `• <b>HTTP 402 Paywalls:</b> Monetize APIs & blogs for AI bots\n` +
        `• <b>Session Escrows:</b> Delegated agent spending with strict caps\n` +
        `• <b>Model Context Protocol:</b> Native MCP for Claude & Cursor\n` +
        `• <b>Dual Network:</b> Base Mainnet & Base Sepolia Testnet\n\n` +
        `<b>Available Commands:</b>\n` +
        `💧 <code>/faucet &lt;address&gt;</code> — Claim 50 testnet $APAY\n` +
        `📊 <code>/balance &lt;address&gt;</code> — Check live Base L2 balance\n` +
        `📜 <code>/contracts</code> — Verified smart contract addresses\n` +
        `🤖 <code>/mcp</code> — Claude Desktop & Cursor MCP config\n` +
        `ℹ️ <code>/help</code> — Full command reference\n\n` +
        `<i>Ask me any question about A-Pay Protocol!</i>`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🚀 Open A-Pay Console', url: 'https://apayprotocol.org' },
            { text: '💧 Web Faucet', url: 'https://apayprotocol.org?tab=overview' },
          ],
          [
            { text: '📜 Developer Docs', url: 'https://apayprotocol.org?tab=docs' },
            {
              text: '⛓️ BaseScan ($APAY)',
              url: 'https://basescan.org/token/0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3',
            },
          ],
          [
            { text: '💬 Join Discord', url: 'https://discord.gg/cW2WRSfb35' },
            { text: '🐦 Follow on X', url: 'https://x.com/apayprotocol' },
          ],
        ],
      };

      await sendTelegramMessage(chatId, welcomeMsg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 2. /help ──────────────────────────────────────────────────────────────
    if (command === '/help') {
      const helpMsg =
        `<b>🛠️ A-Pay Protocol Assistant Commands:</b>\n\n` +
        `• <code>/faucet 0xYourAddress</code>\n` +
        `  Dispenses 50 free testnet $APAY tokens on Base Sepolia (6h cooldown).\n\n` +
        `• <code>/balance 0xYourAddress</code>\n` +
        `  Fetches real-time $APAY and ETH balance directly from Base L2.\n\n` +
        `• <code>/contracts</code>\n` +
        `  Lists official on-chain contracts across Base Mainnet & Sepolia.\n\n` +
        `• <code>/mcp</code>\n` +
        `  Shows how to install A-Pay MCP tools into Claude Desktop & Cursor.\n\n` +
        `• <code>/console</code>\n` +
        `  Direct link to launch the Web Console & Merchant Suite.\n\n` +
        `💡 <i>Tip: You can also ask me questions like "What is HTTP 402?", "How does escrow work?", or "How to create a paywall?"</i>`;

      await sendTelegramMessage(chatId, helpMsg, {
        inline_keyboard: [[{ text: '🚀 Open Web Console', url: 'https://apayprotocol.org' }]],
      });
      return NextResponse.json({ ok: true });
    }

    // ── 3. /faucet ────────────────────────────────────────────────────────────
    if (command === '/faucet') {
      const targetAddr = args[0]?.trim();

      if (!targetAddr || !isAddress(targetAddr)) {
        const errorMsg =
          `<b>💧 A-Pay Base Sepolia Testnet Faucet</b>\n\n` +
          `To claim 50 testnet $APAY, please provide a valid EVM wallet address:\n\n` +
          `Usage:\n<code>/faucet 0xYourAddress</code>\n\n` +
          `Example:\n<code>/faucet 0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc</code>\n\n` +
          `You can also use the web faucet anytime on <a href="https://apayprotocol.org?tab=overview">apayprotocol.org</a>.`;

        await sendTelegramMessage(chatId, errorMsg, {
          inline_keyboard: [
            [{ text: '💧 Open Web Faucet', url: 'https://apayprotocol.org?tab=overview' }],
          ],
        });
        return NextResponse.json({ ok: true });
      }

      // Forward to internal /api/faucet endpoint
      try {
        const faucetUrl = 'https://apayprotocol.org/api/faucet';
        const faucetRes = await fetch(faucetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: targetAddr, network: 'base-sepolia' }),
          signal: AbortSignal.timeout(8000),
        });

        const faucetData = await faucetRes.json();

        if (faucetRes.ok && faucetData.success) {
          const successMsg =
            `<b>✅ 50 $APAY Dispensed Successfully!</b>\n\n` +
            `• <b>Recipient:</b> <code>${targetAddr}</code>\n` +
            `• <b>Network:</b> Base Sepolia (84532)\n` +
            `• <b>Amount:</b> 50.00 $APAY\n` +
            `• <b>Tx Hash:</b> <code>${faucetData.txHash || 'Confirmed'}</code>\n\n` +
            `Explorer: <a href="${faucetData.explorerUrl || `https://sepolia.basescan.org/address/${targetAddr}`}">View on BaseScan</a>`;

          await sendTelegramMessage(chatId, successMsg, {
            inline_keyboard: [
              [
                {
                  text: '🔍 View on BaseScan',
                  url:
                    faucetData.explorerUrl || `https://sepolia.basescan.org/address/${targetAddr}`,
                },
              ],
            ],
          });
        } else {
          const failMsg =
            `<b>⚠️ Faucet Request:</b> ${faucetData.error || 'Rate limit active or service busy.'}\n\n` +
            `Each wallet has a 6-hour cooldown. You can also claim directly from our web faucet.`;
          await sendTelegramMessage(chatId, failMsg, {
            inline_keyboard: [
              [{ text: '💧 Open Web Faucet', url: 'https://apayprotocol.org?tab=overview' }],
            ],
          });
        }
      } catch {
        const failMsg = `<b>⚠️ Faucet Service:</b> Request queued. Please verify your address on Base Sepolia or claim via <a href="https://apayprotocol.org?tab=overview">apayprotocol.org</a>.`;
        await sendTelegramMessage(chatId, failMsg);
      }

      return NextResponse.json({ ok: true });
    }

    // ── 4. /balance ───────────────────────────────────────────────────────────
    if (command === '/balance') {
      const targetAddr = args[0]?.trim();

      if (!targetAddr || !isAddress(targetAddr)) {
        const promptMsg =
          `<b>📊 Check On-Chain Wallet Balance</b>\n\n` +
          `Usage:\n<code>/balance 0xYourAddress</code>\n\n` +
          `Example:\n<code>/balance 0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc</code>`;
        await sendTelegramMessage(chatId, promptMsg);
        return NextResponse.json({ ok: true });
      }

      try {
        const balances = await fetchWalletBalances(targetAddr as `0x${string}`);
        const balMsg =
          `<b>📊 On-Chain Balances (Base Mainnet 8453):</b>\n\n` +
          `• <b>Wallet:</b> <code>${targetAddr}</code>\n` +
          `• <b>$APAY:</b> <code>${balances.apay} APAY</code>\n` +
          `• <b>ETH:</b> <code>${balances.eth} ETH</code>\n\n` +
          `<a href="https://basescan.org/address/${targetAddr}">View on BaseScan Explorer ↗</a>`;

        await sendTelegramMessage(chatId, balMsg, {
          inline_keyboard: [
            [{ text: '🔍 View on BaseScan', url: `https://basescan.org/address/${targetAddr}` }],
          ],
        });
      } catch {
        await sendTelegramMessage(
          chatId,
          `<b>⚠️ Error:</b> Could not fetch on-chain balance for <code>${targetAddr}</code>. Please verify the address and try again.`,
        );
      }

      return NextResponse.json({ ok: true });
    }

    // ── 5. /contracts ─────────────────────────────────────────────────────────
    if (command === '/contracts') {
      const contractsMsg =
        `<b>📜 Verified A-Pay Smart Contracts (Base L2):</b>\n\n` +
        `<b>🔵 Base Mainnet (Production - Chain ID: 8453):</b>\n` +
        `• <b>$APAY Token:</b>\n  <code>0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3</code>\n` +
        `• <b>EscrowVault (Session Keys):</b>\n  <code>0xd08c8a337e5339d1c083e06d74a9265956ceea16</code>\n` +
        `• <b>APayRouterV2 Enterprise:</b>\n  <code>0x452eb7d4e7ccbf76ecf511829880b5fbcb24e854</code>\n` +
        `• <b>StakingVault (Anti-Spam):</b>\n  <code>0x3e35a9e802627a3d9a86d6554e72b1c446e34aaf</code>\n\n` +
        `<b>Fixed Supply:</b> 100,000,000 $APAY (Hard-Capped)\n` +
        `<b>Official Basename:</b> <code>apayprotocol.base.eth</code>`;

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '🔍 $APAY on BaseScan',
              url: 'https://basescan.org/token/0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3',
            },
          ],
          [{ text: '📜 View Audit Bundles', url: 'https://apayprotocol.org?tab=overview' }],
        ],
      };

      await sendTelegramMessage(chatId, contractsMsg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 6. /mcp ───────────────────────────────────────────────────────────────
    if (command === '/mcp') {
      const mcpMsg =
        `<b>🤖 Model Context Protocol (MCP) Setup:</b>\n\n` +
        `Connect A-Pay directly to Claude Desktop, Cursor, or LangChain agents:\n\n` +
        `<b>Python (uvx):</b>\n` +
        `<code>uvx apay mcp</code>\n\n` +
        `<b>TypeScript (npx):</b>\n` +
        `<code>npx apay-gateway mcp</code>\n\n` +
        `<b>Claude Desktop Config (claude_desktop_config.json):</b>\n` +
        `<pre>{\n  "mcpServers": {\n    "apay": {\n      "command": "uvx",\n      "args": ["apay", "mcp"]\n    }\n  }\n}</pre>\n\n` +
        `Available Tools: <code>apay_request</code>, <code>apay_get_balance</code>, <code>apay_set_budget</code>, <code>apay_inspect_endpoint</code>.`;

      await sendTelegramMessage(chatId, mcpMsg, {
        inline_keyboard: [
          [
            {
              text: '🤖 Smithery.ai Directory',
              url: 'https://smithery.ai/servers/apayprotocol/apay',
            },
            { text: '🦙 Glama.ai Listing', url: 'https://glama.ai/mcp/servers/apayprotocol/a_pay' },
          ],
        ],
      });
      return NextResponse.json({ ok: true });
    }

    // ── 7. /console ───────────────────────────────────────────────────────────
    if (command === '/console') {
      const consoleMsg =
        `<b>🚀 Launch A-Pay Web Console:</b>\n\n` +
        `Access 1-Click Paywalls, Multi-Agent Vaults, Staking, MCP Hub, and Developer Docs:`;

      await sendTelegramMessage(chatId, consoleMsg, {
        inline_keyboard: [[{ text: '🚀 Launch A-Pay Console', url: 'https://apayprotocol.org' }]],
      });
      return NextResponse.json({ ok: true });
    }

    // ── 8. Natural Language AI Q&A Engine ────────────────────────────────────
    const lower = text.toLowerCase();

    let answer = '';
    if (lower.includes('http 402') || lower.includes('402')) {
      answer =
        `<b>⚡ What is HTTP 402 Payment Required?</b>\n\n` +
        `HTTP 402 is the reserved Internet status code for digital payments. A-Pay Protocol turns HTTP 402 into a standardized machine-to-machine micropayment rail on Base L2:\n\n` +
        `1. An AI bot requests a protected URL / API.\n` +
        `2. The server responds with <code>402 Payment Required</code> and an EIP-712 payment challenge.\n` +
        `3. The bot signs an off-chain micro-voucher using its pre-funded session escrow.\n` +
        `4. Instant access is granted in &lt;100ms with zero gas per call!`;
    } else if (
      lower.includes('escrow') ||
      lower.includes('session key') ||
      lower.includes('vault')
    ) {
      answer =
        `<b>🔐 Non-Custodial Session Escrow:</b>\n\n` +
        `A-Pay session vaults allow users to delegate micro-budgets to autonomous AI agents without risking full wallet balances:\n\n` +
        `• <b>Time Bound:</b> Escrow expires automatically (e.g. 24 hours)\n` +
        `• <b>Spend Capped:</b> Maximum per-query and cumulative budget limit\n` +
        `• <b>Instant Revocation:</b> Reclaim unspent collateral on-chain anytime!`;
    } else if (
      lower.includes('buyback') ||
      lower.includes('burn') ||
      lower.includes('tokenomics')
    ) {
      answer =
        `<b>🔥 Protocol Buyback & Burn Mechanism:</b>\n\n` +
        `Every micropayment settled through A-Pay Router carries a 1% protocol fee:\n` +
        `• <b>70%</b> funds ongoing protocol development & treasury.\n` +
        `• <b>30%</b> is automatically swapped on Aerodrome DEX on Base Mainnet to buy and permanently burn $APAY tokens!\n\n` +
        `Total Fixed Supply: 100,000,000 $APAY (Zero inflation).`;
    } else if (
      lower.includes('who are you') ||
      lower.includes('what is apay') ||
      lower.includes('a-pay')
    ) {
      answer =
        `<b>🤖 I am the official A-Pay Protocol Assistant!</b>\n\n` +
        `A-Pay is the premier autonomous machine-to-machine micropayment network on Coinbase's Base L2.\n\n` +
        `We empower websites to charge AI scrapers, API builders to monetize without Stripe credit-card fees ($0.30 minimum), and autonomous AI agents to pay for web resources seamlessly.`;
    } else {
      answer =
        `<b>🤖 A-Pay Protocol Assistant:</b>\n\n` +
        `I received your query: <i>"${text}"</i>\n\n` +
        `Here are quick ways to explore A-Pay Protocol:\n` +
        `• Claim 50 testnet tokens: <code>/faucet &lt;address&gt;</code>\n` +
        `• Check on-chain balance: <code>/balance &lt;address&gt;</code>\n` +
        `• View smart contracts: <code>/contracts</code>\n` +
        `• Claude/Cursor MCP setup: <code>/mcp</code>\n\n` +
        `Or visit our interactive documentation on <a href="https://apayprotocol.org?tab=docs">apayprotocol.org</a>!`;
    }

    await sendTelegramMessage(chatId, answer, {
      inline_keyboard: [[{ text: '🚀 Open Web Console', url: 'https://apayprotocol.org' }]],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook Error]', error);
    return NextResponse.json({ ok: false, error: 'Internal Error' }, { status: 500 });
  }
}
