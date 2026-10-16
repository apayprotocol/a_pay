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
    is_bot?: boolean;
    first_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
    title?: string;
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

async function answerTelegramCallback(
  callbackQueryId: string,
  alertText?: string,
  showAlert = false,
) {
  if (!BOT_TOKEN) return;
  const endpoint = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: alertText || undefined,
        show_alert: showAlert,
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.error('[Telegram Bot] Error answering callback:', err);
  }
}

async function deleteTelegramMessage(chatId: number, messageId: number) {
  if (!BOT_TOKEN) return;
  const endpoint = `https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`;
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.error('[Telegram Bot] Error deleting message:', err);
  }
}

async function getChatMemberStatus(
  chatId: string | number,
  userId: number,
): Promise<string | null> {
  if (!BOT_TOKEN) return null;
  const endpoint = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(
    chatId,
  )}&user_id=${userId}`;
  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.ok && data.result?.status) {
      return data.result.status as string;
    }
  } catch (err) {
    console.error('[Telegram Bot] Error getting chat member status:', err);
  }
  return null;
}

// Configurable announcement channel for Community group verification
let configuredAnnouncementChannel = process.env.TELEGRAM_ANNOUNCEMENT_CHANNEL || '@apayprotocol';

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

// SSRF Safety Guard
function isPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().trim();
  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.includes('127.0.0.1') ||
    lower.includes('0.0.0.0') ||
    lower.startsWith('10.') ||
    lower.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(lower)
  ) {
    return true;
  }
  return false;
}

// Main Menu Generator
function getMainMenu(userName: string) {
  const welcomeMsg =
    `<b>⚡ Welcome to A-Pay Protocol, ${userName}!</b>\n\n` +
    `The universal machine-to-machine (M2M) micropayment & autonomous agent economy rail on <b>Base L2</b>.\n\n` +
    `<i>Select your primary role or use-case below to receive tailored tools, code snippets, and research papers:</i>`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🌐 Website / Blog Owner', callback_data: 'role_website' },
        { text: '🤖 AI Agent Builder', callback_data: 'role_agent' },
      ],
      [
        { text: '💳 SaaS / Store Founder', callback_data: 'role_saas' },
        { text: '🔌 API Developer', callback_data: 'role_api' },
      ],
      [
        { text: '🔍 Scan Website for AI Bots', callback_data: 'role_scan' },
        { text: '💧 Claim 50 Testnet $APAY', callback_data: 'role_faucet' },
      ],
      [
        { text: '📚 3 Pillar Research Papers', callback_data: 'role_blogs' },
        { text: '💬 Community & Support', callback_data: 'role_support' },
      ],
      [
        { text: '🚀 Launch Web Console', url: 'https://apayprotocol.org' },
        { text: '🛍️ Checkout Demo Store', url: 'https://apayprotocol.org/checkout-demo' },
      ],
    ],
  };

  return { welcomeMsg, keyboard };
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
    let callbackQueryId: string | undefined;

    if (update.message) {
      chatId = update.message.chat.id;
      text = (update.message.text || '').trim();
      userName = update.message.from?.first_name || update.message.from?.username || 'builder';
    } else if (update.callback_query?.message) {
      chatId = update.callback_query.message.chat.id;
      text = (update.callback_query.data || '').trim();
      userName = update.callback_query.from.first_name || 'builder';
      callbackQueryId = update.callback_query.id;
    }

    if (!chatId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (callbackQueryId) {
      await answerTelegramCallback(callbackQueryId);
    }

    const command = text.split(' ')[0].toLowerCase();
    const args = text.split(' ').slice(1);

    const isGroup =
      update.message?.chat.type === 'group' || update.message?.chat.type === 'supergroup';
    const sender = update.message?.from;

    // ── GROUP CHANNEL SUBSCRIPTION GATE ──────────────────────────────────────
    if (isGroup && sender && !sender.is_bot && configuredAnnouncementChannel) {
      // 1. Check if sender is admin in this group (admins are exempt)
      const groupStatus = await getChatMemberStatus(chatId, sender.id);
      const isGroupAdmin = groupStatus === 'creator' || groupStatus === 'administrator';

      if (!isGroupAdmin) {
        // 2. Check if sender is subscribed to the announcements channel
        const channelStatus = await getChatMemberStatus(configuredAnnouncementChannel, sender.id);

        // If explicitly not subscribed (or left/kicked)
        if (channelStatus === 'left' || channelStatus === 'kicked') {
          // Delete their message from community group
          if (update.message?.message_id) {
            await deleteTelegramMessage(chatId, update.message.message_id);
          }

          const cleanChannel = configuredAnnouncementChannel.replace('@', '');
          const channelUrl = `https://t.me/${cleanChannel}`;

          const gateMsg =
            `<b>⚠️ Namaste ${userName}!</b>\n\n` +
            `A-Pay Developer Community me participate karne ke liye, please pehle hamare official <b>Announcements Channel</b> ko join karein:\n\n` +
            `👉 <b>${configuredAnnouncementChannel}</b>\n\n` +
            `Channel join karne ke baad neeche <b>Verify Membership</b> dabayein!`;

          const keyboard = {
            inline_keyboard: [
              [{ text: '📢 Join Announcements Channel', url: channelUrl }],
              [{ text: '🔄 Verify Membership', callback_data: `verify_sub:${sender.id}` }],
            ],
          };

          await sendTelegramMessage(chatId, gateMsg, keyboard);
          return NextResponse.json({ ok: true, gated: true });
        }
      }
    }

    // ── VERIFY CHANNEL MEMBERSHIP CALLBACK ────────────────────────────────────
    if (text.startsWith('verify_sub:')) {
      const targetUserId = Number(text.replace('verify_sub:', ''));
      const clickerId = update.callback_query?.from.id;

      if (clickerId !== targetUserId) {
        if (callbackQueryId) {
          await answerTelegramCallback(
            callbackQueryId,
            '⚠️ Yeh verification button sirf usi member ke liye hai jinhone message kiya tha.',
            true,
          );
        }
        return NextResponse.json({ ok: true });
      }

      if (configuredAnnouncementChannel) {
        const status = await getChatMemberStatus(configuredAnnouncementChannel, targetUserId);
        const isSubscribed =
          status === 'creator' ||
          status === 'administrator' ||
          status === 'member' ||
          status === 'restricted';

        if (isSubscribed) {
          if (callbackQueryId) {
            await answerTelegramCallback(
              callbackQueryId,
              '✅ Verification Successful! Aapka welcome hai A-Pay Developer Community me!',
              true,
            );
          }
          if (update.callback_query?.message?.message_id) {
            await deleteTelegramMessage(chatId, update.callback_query.message.message_id);
          }
        } else {
          if (callbackQueryId) {
            await answerTelegramCallback(
              callbackQueryId,
              '⚠️ Aapne abhi tak Announcements channel join nahi kiya hai. Pehle channel join karein fir verify dabayein!',
              true,
            );
          }
        }
      } else {
        if (callbackQueryId) {
          await answerTelegramCallback(callbackQueryId, '✅ Verified!', false);
        }
      }
      return NextResponse.json({ ok: true });
    }

    // ── ADMIN COMMAND: /setchannel ────────────────────────────────────────────
    if (command === '/setchannel') {
      const newChannel = args[0]?.trim();
      if (!newChannel) {
        await sendTelegramMessage(
          chatId,
          `<b>Usage:</b> <code>/setchannel @YourChannelUsername</code>\n\n` +
            `Current Channel Gate: <b>${configuredAnnouncementChannel || 'None (Disabled)'}</b>\n\n` +
            `<i>Set an official channel so community group members must join it before messaging.</i>`,
        );
        return NextResponse.json({ ok: true });
      }

      configuredAnnouncementChannel = newChannel;
      await sendTelegramMessage(
        chatId,
        `<b>✅ Channel Gate Activated!</b>\n\n` +
          `Official Announcements Channel set to: <b>${newChannel}</b>.\n` +
          `All non-admin community group members will be prompted to join this channel before sending messages.`,
      );
      return NextResponse.json({ ok: true });
    }

    // ── 0. AUTO-EVM ADDRESS DETECTOR ──────────────────────────────────────────
    if (isAddress(text)) {
      const targetAddr = text as `0x${string}`;
      const msg =
        `<b>🔍 Base L2 Address Detected!</b>\n\n` +
        `<code>${targetAddr}</code>\n\n` +
        `What would you like to perform for this wallet?`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '💧 Dispense 50 Testnet $APAY', callback_data: `faucet_${targetAddr}` },
            { text: '📊 Check Live Balance', callback_data: `bal_${targetAddr}` },
          ],
          [
            { text: '🔍 View on BaseScan', url: `https://basescan.org/address/${targetAddr}` },
            { text: '🏠 Main Menu', callback_data: 'menu_main' },
          ],
        ],
      };

      await sendTelegramMessage(chatId, msg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 1. /start OR MAIN MENU ────────────────────────────────────────────────
    if (command === '/start' || text === 'menu_main') {
      const { welcomeMsg, keyboard } = getMainMenu(userName);
      await sendTelegramMessage(chatId, welcomeMsg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 2. ROLE: WEBSITE / BLOG OWNER (PILLAR ISSUE #01) ─────────────────────
    if (text === 'role_website') {
      const msg =
        `<b>🌐 Website & Blog Owners: Stop Free AI Scraping</b>\n\n` +
        `AI crawlers (OpenAI GPTBot, ClaudeBot, Perplexity) scrape your valuable content for free, draining server compute while human traffic declines.\n\n` +
        `<b>⚡ The A-Pay Solution:</b>\n` +
        `• <b>RFC-2068 HTTP 402 Paywalls:</b> Real humans browse 100% free.\n` +
        `• <b>Automated AI Monetization:</b> AI scrapers pay micro-cents ($0.001 - $0.05) per read on Base L2.\n` +
        `• <b>No Stripe Minimums:</b> Zero $0.30 fixed transaction fees.\n\n` +
        `📖 <b>Featured Research Paper:</b>\n` +
        `<b>Issue #01: 1-Click Paywalls (HTTP 402)</b>\n` +
        `<i>How Web3 micropayments eliminate server bills while keeping search engines & humans open.</i>\n\n` +
        `👇 <i>Select your platform to get instant connection instructions:</i>`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔌 WordPress Plugin', callback_data: 'guide_wp' },
            { text: '⚡ Next.js 15 Middleware', callback_data: 'guide_next' },
          ],
          [
            { text: '☁️ Cloudflare Worker', callback_data: 'guide_cf' },
            { text: '📄 Static HTML / PHP', callback_data: 'guide_html' },
          ],
          [
            {
              text: '📖 Read Full Issue #01 Paper',
              url: 'https://apayprotocol.org/blog?issue=paywalls',
            },
          ],
          [{ text: '🔙 Back to Main Menu', callback_data: 'menu_main' }],
        ],
      };

      await sendTelegramMessage(chatId, msg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 2A. GUIDE: WORDPRESS ──────────────────────────────────────────────────
    if (text === 'guide_wp') {
      const msg =
        `<b>🔌 WordPress Setup: 1-Click AI Paywall</b>\n\n` +
        `Monetize your WordPress blog in under 60 seconds with our official WordPress.org plugin:\n\n` +
        `<b>Step-by-step:</b>\n` +
        `1. In WP Admin, go to <b>Plugins ➔ Add New</b>.\n` +
        `2. Search for <b><code>apay-web3-ai-paywall</code></b>.\n` +
        `3. Click <b>Install & Activate</b>.\n` +
        `4. Enter your Base L2 payout wallet (e.g. <code>0xYourAddress</code>) and your per-post price (e.g. <code>$0.02</code>).\n\n` +
        `✅ <b>Result:</b> Human readers browse unrestricted. AI crawlers receive instant HTTP 402 challenges settled via Base L2!`;

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '📥 View on WordPress.org',
              url: 'https://wordpress.org/plugins/apay-web3-ai-paywall/',
            },
          ],
          [
            { text: '🔙 Back to Website Platforms', callback_data: 'role_website' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' },
          ],
        ],
      };

      await sendTelegramMessage(chatId, msg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 2B. GUIDE: NEXT.JS ────────────────────────────────────────────────────
    if (text === 'guide_next') {
      const msg =
        `<b>⚡ Next.js 15 / React Paywall Setup:</b>\n\n` +
        `1. Install our official edge gateway package:\n` +
        `<code>npm i apay-gateway</code>\n\n` +
        `2. Add this to your root <b><code>middleware.ts</code></b>:\n` +
        `<pre>import { apayMiddleware } from 'apay-gateway';\n\n` +
        `export default apayMiddleware({\n` +
        `  receiverAddress: '0xYourWalletAddress',\n` +
        `  pricePerCall: '0.01',\n` +
        `  network: 'base-mainnet'\n` +
        `});\n\n` +
        `export const config = {\n` +
        `  matcher: ['/api/premium/:path*', '/blog/:path*']\n` +
        `};</pre>\n\n` +
        `<i>Sub-millisecond verification with zero server latency!</i>`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '📦 View on NPM Registry', url: 'https://www.npmjs.com/package/apay-gateway' }],
          [
            { text: '🔙 Back to Platforms', callback_data: 'role_website' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' },
          ],
        ],
      };

      await sendTelegramMessage(chatId, msg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 2C. GUIDE: CLOUDFLARE WORKER ──────────────────────────────────────────
    if (text === 'guide_cf') {
      const msg =
        `<b>☁️ Cloudflare Worker Edge Paywall:</b>\n\n` +
        `Intercept AI bots directly at Cloudflare Edge before they touch your origin server:\n\n` +
        `<pre>export default {\n` +
        `  async fetch(req, env) {\n` +
        `    const ua = req.headers.get('user-agent') || '';\n` +
        `    const isBot = /GPTBot|ClaudeBot|Perplexity/i.test(ua);\n` +
        `    if (isBot && !req.headers.has('x-apay-voucher')) {\n` +
        `      return new Response('402 Payment Required', {\n` +
        `        status: 402,\n` +
        `        headers: {\n` +
        `          'X-APay-Receiver': '0xYourAddress',\n` +
        `          'X-APay-Price': '0.01',\n` +
        `          'X-APay-Network': 'base-mainnet'\n` +
        `        }\n` +
        `      });\n` +
        `    }\n` +
        `    return fetch(req);\n` +
        `  }\n` +
        `};</pre>`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔙 Back to Platforms', callback_data: 'role_website' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' },
          ],
        ],
      };

      await sendTelegramMessage(chatId, msg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 2D. GUIDE: STATIC HTML / PHP ──────────────────────────────────────────
    if (text === 'guide_html') {
      const msg =
        `<b>📄 Static HTML & PHP Script:</b>\n\n` +
        `Simply include our lightweight client drop-in before <code>&lt;/body&gt;</code>:\n\n` +
        `<pre>&lt;script \n` +
        `  src="https://apayprotocol.org/apay-paywall.js"\n` +
        `  data-receiver="0xYourAddress"\n` +
        `  data-price="0.02"\n` +
        `  data-network="base-mainnet"&gt;\n` +
        `&lt;/script&gt;</pre>\n\n` +
        `Instant protection without changing your existing server code!`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔙 Back to Platforms', callback_data: 'role_website' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' },
          ],
        ],
      };

      await sendTelegramMessage(chatId, msg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 3. ROLE: AI AGENT BUILDER (PILLAR ISSUE #02) ──────────────────────────
    if (text === 'role_agent') {
      const msg =
        `<b>🤖 AI Agent Builders: Autonomous Session Escrows & MCP</b>\n\n` +
        `Autonomous AI agents (Claude Desktop, Cursor, LangChain, CrewAI, AutoGen) have no credit cards and no KYC to purchase paid APIs and datasets.\n\n` +
        `<b>⚡ The A-Pay Solution:</b>\n` +
        `• <b>Non-Custodial Session Keys:</b> Delegate limited micro-budgets (e.g. $5.00) without exposing master keys.\n` +
        `• <b>Time-Bound Escrow:</b> Auto-expires in 24h; revoke unspent collateral anytime.\n` +
        `• <b>EIP-712 Micro-Vouchers:</b> High-frequency machine settlement with zero gas per transaction.\n\n` +
        `📖 <b>Featured Research Paper:</b>\n` +
        `<b>Issue #02: Multi-Agent Vaults & Session Escrows</b>\n` +
        `<i>Mathematical formulation of delegated session permits and gas-free EIP-712 vouchers.</i>\n\n` +
        `👇 <i>Choose your agent environment below:</i>`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📋 Claude Desktop MCP', callback_data: 'mcp_claude' },
            { text: '💻 Cursor IDE Setup', callback_data: 'mcp_cursor' },
          ],
          [
            { text: '🐍 Python (uvx apay)', callback_data: 'agent_python' },
            { text: '📦 TypeScript (npx)', callback_data: 'agent_ts' },
          ],
          [
            {
              text: '📖 Read Full Issue #02 Paper',
              url: 'https://apayprotocol.org/blog?issue=vaults',
            },
          ],
          [{ text: '🔙 Back to Main Menu', callback_data: 'menu_main' }],
        ],
      };

      await sendTelegramMessage(chatId, msg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 3A. MCP CLAUDE ────────────────────────────────────────────────────────
    if (text === 'mcp_claude') {
      const msg =
        `<b>📋 Claude Desktop 1-Click MCP Setup:</b>\n\n` +
        `Add A-Pay to your <code>claude_desktop_config.json</code>:\n\n` +
        `<pre>{\n` +
        `  "mcpServers": {\n` +
        `    "apay": {\n` +
        `      "command": "uvx",\n` +
        `      "args": ["apay", "mcp"]\n` +
        `    }\n` +
        `  }\n` +
        `}</pre>\n\n` +
        `<b>Or 1-click install via Smithery CLI:</b>\n` +
        `<code>npx -y smithery mcp add apayprotocol/apay</code>\n\n` +
        `<b>Equipped Autonomous Tools:</b>\n` +
        `• <code>apay_request</code> — Auto-sign EIP-712 vouchers for paid APIs\n` +
        `• <code>apay_get_balance</code> — Check on-chain agent allowance\n` +
        `• <code>apay_set_budget</code> — Configure maximum per-query spending caps\n` +
        `• <code>apay_inspect_endpoint</code> — Probe endpoint price before buying`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🤖 Smithery.ai Page', url: 'https://smithery.ai/servers/apayprotocol/apay' },
            { text: '🦙 Glama.ai Listing', url: 'https://glama.ai/mcp/servers/apayprotocol/a_pay' },
          ],
          [
            { text: '🔙 Back to Agent Setup', callback_data: 'role_agent' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' },
          ],
        ],
      };

      await sendTelegramMessage(chatId, msg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 3B. MCP CURSOR ────────────────────────────────────────────────────────
    if (text === 'mcp_cursor') {
      const msg =
        `<b>💻 Cursor IDE MCP Integration:</b>\n\n` +
        `In Cursor ➔ <b>Settings ➔ Features ➔ MCP Servers ➔ Add New MCP Server</b>:\n\n` +
        `• <b>Name:</b> <code>apay</code>\n` +
        `• <b>Type:</b> <code>command</code>\n` +
        `• <b>Command:</b> <code>npx apay-gateway mcp</code>\n\n` +
        `Your Cursor Agent can now autonomously purchase paid documentation, code snippets, and remote APIs!`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔙 Back to Agent Setup', callback_data: 'role_agent' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' },
          ],
        ],
      };

      await sendTelegramMessage(chatId, msg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 3C. PYTHON AGENTKIT ───────────────────────────────────────────────────
    if (text === 'agent_python') {
      const msg =
        `<b>🐍 Python SDK & Coinbase AgentKit:</b>\n\n` +
        `Install via PyPI:\n` +
        `<code>pip install apay</code>\n\n` +
        `Integrate with LangChain / AgentKit:\n` +
        `<pre>from apay.agentkit import APayActionProvider\n` +
        `from apay.client import APayClient\n\n` +
        `client = APayClient(private_key=SESSION_KEY)\n` +
        `action_provider = APayActionProvider(client)\n\n` +
        `# Agent now signs vouchers autonomously!\n` +
        `res = client.get("https://api.example.com/paid-data")</pre>`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '📦 View on PyPI', url: 'https://pypi.org/project/apay/' }],
          [
            { text: '🔙 Back to Agent Setup', callback_data: 'role_agent' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' },
          ],
        ],
      };

      await sendTelegramMessage(chatId, msg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 3D. TYPESCRIPT GATEWAY ────────────────────────────────────────────────
    if (text === 'agent_ts') {
      const msg =
        `<b>📦 TypeScript / Node.js Agent Gateway:</b>\n\n` +
        `Install package:\n` +
        `<code>npm i apay-gateway</code>\n\n` +
        `Create a delegated agent session:\n` +
        `<pre>import { APayAgentSession } from 'apay-gateway';\n\n` +
        `const session = new APayAgentSession({\n` +
        `  masterAddress: '0xMasterWallet',\n` +
        `  maxSpendUsd: 10.00,\n` +
        `  ttlSeconds: 86400,\n` +
        `  network: 'base-mainnet'\n` +
        `});\n\n` +
        `const response = await session.fetch('https://api.service.com/data');</pre>`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '📦 View on NPM', url: 'https://www.npmjs.com/package/apay-gateway' }],
          [
            { text: '🔙 Back to Agent Setup', callback_data: 'role_agent' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' },
          ],
        ],
      };

      await sendTelegramMessage(chatId, msg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 4. ROLE: SAAS / STORE FOUNDER (PILLAR ISSUE #03) ──────────────────────
    if (text === 'role_saas') {
      const msg =
        `<b>💳 SaaS Founders & E-Commerce: Drop-In Web3 Checkout</b>\n\n` +
        `Tired of Stripe's <b>2.9% + $0.30 fixed fee</b> destroying your profit margins on micro-billing? Frustrated by chargebacks, rolling reserves, and account freezes?\n\n` +
        `<b>⚡ The A-Pay Solution:</b>\n` +
        `• <b>10x Lower Costs:</b> Flat 1% protocol fee + $0.0001 Base L2 gas.\n` +
        `• <b>Zero Chargebacks:</b> On-chain cryptographic finality.\n` +
        `• <b>Sub-Second Settlement:</b> Direct non-custodial payouts to your EVM wallet.\n` +
        `• <b>Global Reach:</b> Accept payments worldwide with zero cross-border friction.\n\n` +
        `📖 <b>Featured Research Paper:</b>\n` +
        `<b>Issue #03: Web3 Checkout & Merchant Gateway</b>\n` +
        `<i>Building resilient digital storefronts with instant receipts & multi-currency escrow.</i>\n\n` +
        `👇 <i>Explore integration options below:</i>`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🛍️ Launch Live Demo Store', url: 'https://apayprotocol.org/checkout-demo' }],
          [
            { text: '📦 React Drop-in Component', callback_data: 'guide_checkout_react' },
            { text: '⚖️ Stripe vs A-Pay Math', callback_data: 'stripe_comparison' },
          ],
          [
            {
              text: '📖 Read Full Issue #03 Paper',
              url: 'https://apayprotocol.org/blog?issue=checkout',
            },
          ],
          [{ text: '🔙 Back to Main Menu', callback_data: 'menu_main' }],
        ],
      };

      await sendTelegramMessage(chatId, msg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 4A. REACT CHECKOUT WIDGET ─────────────────────────────────────────────
    if (text === 'guide_checkout_react') {
      const msg =
        `<b>📦 React / Next.js Checkout Component:</b>\n\n` +
        `Drop our production-ready checkout into any React or Next.js app:\n\n` +
        `<pre>import { ApayCheckout } from 'apay-gateway/react';\n\n` +
        `export function PurchaseButton() {\n` +
        `  return (\n` +
        `    &lt;ApayCheckout\n` +
        `      merchantAddress="0xYourPayoutWallet"\n` +
        `      priceUsd={4.99}\n` +
        `      itemName="AI Credits Pack"\n` +
        `      network="base-mainnet"\n` +
        `      onSuccess={(receipt) =&gt; {\n` +
        `        console.log('Payment verified on Base:', receipt.txHash);\n` +
        `      }}\n` +
        `    /&gt;\n` +
        `  );\n` +
        `}</pre>\n\n` +
        `Includes automatic wallet connection, Base chain switching, and customer receipt generation!`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🛍️ Try Live Interactive Store', url: 'https://apayprotocol.org/checkout-demo' }],
          [
            { text: '🔙 Back to SaaS Menu', callback_data: 'role_saas' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' },
          ],
        ],
      };

      await sendTelegramMessage(chatId, msg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 4B. STRIPE VS APAY COMPARISON ─────────────────────────────────────────
    if (text === 'stripe_comparison') {
      const msg =
        `<b>⚖️ Stripe vs A-Pay Protocol Economics:</b>\n\n` +
        `<b>Scenario: Customer purchases a $0.50 AI query / digital item:</b>\n\n` +
        `🔴 <b>Traditional Stripe:</b>\n` +
        `• 2.9% fee = $0.015\n` +
        `• Fixed charge = $0.30\n` +
        `• <b>Total Fee = $0.315 (63% OF REVENUE LOST!)</b>\n` +
        `• Payout: 2 to 7 days rolling hold.\n` +
        `• Dispute Risk: $15 penalty per chargeback.\n\n` +
        `🟢 <b>A-Pay on Base L2:</b>\n` +
        `• 1% Protocol fee = $0.005\n` +
        `• Base L2 gas = ~$0.0001\n` +
        `• <b>You Keep = $0.494 (99% OF REVENUE RETAINED!)</b>\n` +
        `• Payout: Sub-second directly to your wallet.\n` +
        `• Dispute Risk: ZERO (Mathematical finality).`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🛍️ Launch Demo Store', url: 'https://apayprotocol.org/checkout-demo' }],
          [
            { text: '🔙 Back to SaaS Menu', callback_data: 'role_saas' },
            { text: '🏠 Main Menu', callback_data: 'menu_main' },
          ],
        ],
      };

      await sendTelegramMessage(chatId, msg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 5. ROLE: API DEVELOPER ────────────────────────────────────────────────
    if (text === 'role_api') {
      const msg =
        `<b>🔌 API Developers: Pay-Per-Call Micro-Billing</b>\n\n` +
        `Monetize your AI model endpoints, web scrapers, or proprietary datasets per single request.\n\n` +
        `<b>Python FastAPI Decorator:</b>\n` +
        `<pre>from fastapi import FastAPI\n` +
        `from apay.fastapi import require_payment\n\n` +
        `app = FastAPI()\n\n` +
        `@app.get("/generate-image")\n` +
        `@require_payment(price_usd="0.05", receiver="0xYourWallet")\n` +
        `def generate():\n` +
        `    return {"status": "success", "image_url": "..."}</pre>\n\n` +
        `Every caller must present a verified Base L2 EIP-712 voucher, or gets instant <code>402 Payment Required</code>.`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '📜 View API Docs', url: 'https://apayprotocol.org?tab=docs' }],
          [{ text: '🔙 Back to Main Menu', callback_data: 'menu_main' }],
        ],
      };

      await sendTelegramMessage(chatId, msg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 6. 3 PILLAR BLOGS DIRECTORY ───────────────────────────────────────────
    if (text === 'role_blogs') {
      const msg =
        `<b>📚 A-Pay Protocol Engineering Journals:</b>\n\n` +
        `Deep architectural papers explaining how autonomous machine-to-machine commerce works:\n\n` +
        `<b>Issue #01: 1-Click Paywalls (HTTP 402)</b>\n` +
        `• Monetize AI scrapers & eliminate server wakeup costs while humans browse free.\n\n` +
        `<b>Issue #02: Multi-Agent Vaults & Session Escrows</b>\n` +
        `• Delegated sub-wallets, budget caps, and EIP-712 micro-vouchers for AI agents.\n\n` +
        `<b>Issue #03: Web3 Checkout & Merchant Gateway</b>\n` +
        `• 0-chargeback digital checkout, 10x lower fees than Stripe, sub-second Base L2 settlement.`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '⚡ Issue #01: Paywalls', url: 'https://apayprotocol.org/blog?issue=paywalls' }],
          [
            {
              text: '🔐 Issue #02: Agent Vaults',
              url: 'https://apayprotocol.org/blog?issue=vaults',
            },
          ],
          [{ text: '💳 Issue #03: Checkout', url: 'https://apayprotocol.org/blog?issue=checkout' }],
          [{ text: '🔙 Back to Main Menu', callback_data: 'menu_main' }],
        ],
      };

      await sendTelegramMessage(chatId, msg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 7. WEBSITE SCANNER (/scan OR role_scan) ───────────────────────────────
    if (command === '/scan' || text === 'role_scan') {
      const targetInput = args[0]?.trim();

      if (!targetInput) {
        const promptMsg =
          `<b>🔍 A-Pay AI Crawler & Paywall Auditor</b>\n\n` +
          `Check if your website is being scraped for free by AI crawlers (GPTBot, ClaudeBot, PerplexityBot) without compensating you!\n\n` +
          `<b>Usage:</b>\n` +
          `<code>/scan https://yourwebsite.com</code>\n\n` +
          `<b>Example:</b>\n` +
          `<code>/scan techcrunch.com</code>\n\n` +
          `<i>Type /scan followed by your domain to generate an instant security & monetization audit!</i>`;

        await sendTelegramMessage(chatId, promptMsg, {
          inline_keyboard: [[{ text: '🔙 Back to Main Menu', callback_data: 'menu_main' }]],
        });
        return NextResponse.json({ ok: true });
      }

      let normalized = targetInput;
      if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = `https://${normalized}`;
      }

      let parsed: URL;
      try {
        parsed = new URL(normalized);
      } catch {
        await sendTelegramMessage(
          chatId,
          `<b>⚠️ Invalid URL:</b> Please provide a valid web address.\nExample: <code>/scan https://myblog.com</code>`,
        );
        return NextResponse.json({ ok: true });
      }

      if (isPrivateHost(parsed.hostname)) {
        await sendTelegramMessage(
          chatId,
          `<b>⚠️ Security Notice:</b> Scanning private or internal loopback hosts is restricted.`,
        );
        return NextResponse.json({ ok: true });
      }

      // Live probe: robots.txt and headers
      let robotsTxt = '';
      let has402Header = false;
      try {
        const [probeRes, headRes] = await Promise.all([
          fetch(`https://${parsed.host}/robots.txt`, {
            signal: AbortSignal.timeout(4000),
            headers: { 'User-Agent': 'APayAuditBot/1.0 (+https://apayprotocol.org)' },
          }).catch(() => null),
          fetch(`https://${parsed.host}/`, {
            method: 'HEAD',
            signal: AbortSignal.timeout(4000),
            headers: { 'User-Agent': 'GPTBot/1.2 (+https://openai.com/gptbot)' },
          }).catch(() => null),
        ]);

        if (probeRes?.ok) {
          robotsTxt = (await probeRes.text()).slice(0, 8000);
        }
        if (headRes) {
          const status = headRes.status;
          const hasReceiver = headRes.headers.has('x-apay-receiver');
          has402Header = status === 402 || hasReceiver;
        }
      } catch {
        // Fallback gracefully
      }

      // Check if crawlers are explicitly blocked with Disallow: /
      const isCrawlerBlocked = (botName: string) => {
        const blockPattern = new RegExp(
          `User-agent:\\s*${botName}[\\s\\S]*?Disallow:\\s*\\/(\\s*|\\r?\\n)`,
          'i',
        );
        const universalBlock = /User-agent:\s*\*[\s\S]*?Disallow:\s*\/(\s*|\r?\n)/i;
        return blockPattern.test(robotsTxt) || universalBlock.test(robotsTxt);
      };

      const gptBotBlocked = isCrawlerBlocked('GPTBot');
      const claudeBotBlocked = isCrawlerBlocked('ClaudeBot') || isCrawlerBlocked('Anthropic-ai');
      const perplexityBlocked = isCrawlerBlocked('PerplexityBot');

      const isApayProtected =
        has402Header || (robotsTxt.includes('llms.txt') && robotsTxt.includes('apay'));

      let statusHeading = '';
      let botList = '';
      let economics = '';
      let recommendation = '';

      if (isApayProtected) {
        statusHeading = `🛡️ <b>Status: Protected by A-Pay Protocol!</b>\nYour domain issues RFC-2068 HTTP 402 payment challenges to AI bots.`;
        botList =
          `• <b>OpenAI (GPTBot):</b> ⚡ Monetized via HTTP 402\n` +
          `• <b>Anthropic (ClaudeBot):</b> ⚡ Monetized via HTTP 402\n` +
          `• <b>Perplexity AI:</b> ⚡ Monetized via HTTP 402`;
        economics = `💰 <b>Active Monetization:</b> Receiving automated M2M micro-revenue on Base L2!`;
        recommendation = `<b>Recommended Action:</b> Your domain is 100% optimized. Track settlement receipts directly in the A-Pay Console.`;
      } else if (gptBotBlocked && claudeBotBlocked && perplexityBlocked) {
        statusHeading = `⚠️ <b>Status: AI Bots Completely Blocked (0 Revenue)</b>\nYour robots.txt blocks AI crawlers, preventing you from earning from your content.`;
        botList =
          `• <b>OpenAI (GPTBot):</b> ⛔ Blocked ($0.00 earned)\n` +
          `• <b>Anthropic (ClaudeBot):</b> ⛔ Blocked ($0.00 earned)\n` +
          `• <b>Perplexity AI:</b> ⛔ Blocked ($0.00 earned)`;
        economics = `💸 <b>Lost Revenue Opportunity:</b> ~$40 - $200 / month in uncollected crawler payments.`;
        recommendation = `<b>Recommended Fix:</b> Instead of blocking AI scrapers with zero compensation, enable A-Pay HTTP 402 to charge them per page read!`;
      } else {
        statusHeading = `🚨 <b>Status: VULNERABLE to Free AI Scraping!</b>\nMajor AI models crawl your site without compensating you or citing full paywalls.`;
        botList =
          `• <b>OpenAI (GPTBot):</b> ${gptBotBlocked ? '⛔ Blocked (No revenue)' : '🔓 Scraping for FREE ($0)'}\n` +
          `• <b>Anthropic (ClaudeBot):</b> ${claudeBotBlocked ? '⛔ Blocked (No revenue)' : '🔓 Scraping for FREE ($0)'}\n` +
          `• <b>Perplexity AI:</b> ${perplexityBlocked ? '⛔ Blocked (No revenue)' : '🔓 Scraping for FREE ($0)'}`;
        economics = `💸 <b>Estimated Bandwidth Drain:</b> $30 - $150 / month in unpaid crawler traffic.`;
        recommendation = `<b>Recommended Fix:</b> Add A-Pay 1-Click Paywall to keep human visitors 100% free while charging AI crawlers per query!`;
      }

      const reportMsg =
        `<b>🔍 A-Pay Crawler Audit Report for ${parsed.host}:</b>\n\n` +
        `${statusHeading}\n\n` +
        `<b>Crawler Analysis:</b>\n` +
        `${botList}\n\n` +
        `${economics}\n\n` +
        `${recommendation}`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔌 Add WordPress Plugin', callback_data: 'guide_wp' },
            { text: '⚡ Add Next.js Middleware', callback_data: 'guide_next' },
          ],
          [
            {
              text: '📖 Read Issue #01 (Paywalls)',
              url: 'https://apayprotocol.org/blog?issue=paywalls',
            },
          ],
          [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
        ],
      };

      await sendTelegramMessage(chatId, reportMsg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 8. FAUCET HANDLER (/faucet OR callback) ───────────────────────────────
    if (command === '/faucet' || text === 'role_faucet' || text.startsWith('faucet_')) {
      let targetAddr = args[0]?.trim();
      if (text.startsWith('faucet_')) {
        targetAddr = text.replace('faucet_', '').trim();
      }

      if (!targetAddr || !isAddress(targetAddr)) {
        const errorMsg =
          `<b>💧 A-Pay Base Sepolia Testnet Faucet</b>\n\n` +
          `Claim 50 free testnet $APAY tokens on Base Sepolia (6h cooldown).\n\n` +
          `<b>Usage:</b>\n<code>/faucet 0xYourAddress</code>\n\n` +
          `<i>Or paste your 0x address directly into this chat!</i>`;

        await sendTelegramMessage(chatId, errorMsg, {
          inline_keyboard: [
            [{ text: '💧 Open Web Faucet', url: 'https://apayprotocol.org?tab=overview' }],
            [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
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
              [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
            ],
          });
        } else {
          const failMsg =
            `<b>⚠️ Faucet Notice:</b> ${faucetData.error || 'Rate limit active or service busy.'}\n\n` +
            `Each wallet has a 6-hour cooldown. You can also claim directly via our web console.`;
          await sendTelegramMessage(chatId, failMsg, {
            inline_keyboard: [
              [{ text: '💧 Open Web Faucet', url: 'https://apayprotocol.org?tab=overview' }],
              [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
            ],
          });
        }
      } catch {
        const failMsg = `<b>⚠️ Faucet Service:</b> Request queued. You can also claim anytime via <a href="https://apayprotocol.org?tab=overview">apayprotocol.org</a>.`;
        await sendTelegramMessage(chatId, failMsg);
      }

      return NextResponse.json({ ok: true });
    }

    // ── 9. BALANCE HANDLER (/balance OR callback) ─────────────────────────────
    if (command === '/balance' || text.startsWith('bal_')) {
      let targetAddr = args[0]?.trim();
      if (text.startsWith('bal_')) {
        targetAddr = text.replace('bal_', '').trim();
      }

      if (!targetAddr || !isAddress(targetAddr)) {
        const promptMsg =
          `<b>📊 Check On-Chain Wallet Balance</b>\n\n` +
          `Usage:\n<code>/balance 0xYourAddress</code>\n\n` +
          `<i>Or paste your 0x address directly into this chat!</i>`;
        await sendTelegramMessage(chatId, promptMsg, {
          inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'menu_main' }]],
        });
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
            [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
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

    // ── 10. CONTRACTS HANDLER ─────────────────────────────────────────────────
    if (command === '/contracts') {
      const contractsMsg =
        `<b>📜 Verified A-Pay Smart Contracts (Base L2):</b>\n\n` +
        `<b>🔵 Base Mainnet (Production - Chain ID: 8453):</b>\n` +
        `• <b>$APAY Token:</b>\n  <code>0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3</code>\n` +
        `• <b>EscrowVault (Session Keys):</b>\n  <code>0xd08c8a337e5339d1c083e06d74a9265956ceea16</code>\n` +
        `• <b>APayRouterV2 Enterprise:</b>\n  <code>0x452eb7d4e7ccbf76ecf511829880b5fbcb24e854</code>\n` +
        `• <b>StakingVault (Anti-Spam):</b>\n  <code>0x3e35a9e802627a3d9a86d6554e72b1c446e34aaf</code>\n\n` +
        `<b>Fixed Supply:</b> 100,000,000 $APAY (Zero Inflation)\n` +
        `<b>Official Basename:</b> <code>apayprotocol.base.eth</code>`;

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '🔍 $APAY on BaseScan',
              url: 'https://basescan.org/token/0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3',
            },
          ],
          [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
        ],
      };

      await sendTelegramMessage(chatId, contractsMsg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 11. COMMUNITY & SUPPORT ───────────────────────────────────────────────
    if (text === 'role_support') {
      const supportMsg =
        `<b>💬 Official A-Pay Protocol Channels:</b>\n\n` +
        `• <b>Discord Community:</b> Join 1,000+ agent builders & developers\n` +
        `• <b>X (Twitter):</b> Daily updates & architecture notes\n` +
        `• <b>Founder Inbox:</b> <code>founder@apayprotocol.org</code>\n` +
        `• <b>Official Basename:</b> <code>apayprotocol.base.eth</code>\n` +
        `• <b>BaseScan Verified:</b> Token <code>0x8dd4...66c3</code>`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '💬 Join Discord', url: 'https://discord.gg/cW2WRSfb35' },
            { text: '🐦 Follow on X', url: 'https://x.com/apayprotocol' },
          ],
          [
            {
              text: '🔍 BaseScan Explorer',
              url: 'https://basescan.org/token/0x8dd4ff9035c7d4e0bef30aa64fc30d128a4066c3',
            },
          ],
          [{ text: '🏠 Main Menu', callback_data: 'menu_main' }],
        ],
      };

      await sendTelegramMessage(chatId, supportMsg, keyboard);
      return NextResponse.json({ ok: true });
    }

    // ── 12. NATURAL LANGUAGE AI Q&A ENGINE ────────────────────────────────────
    const lower = text.toLowerCase();
    let answer = '';

    if (lower.includes('stripe') || lower.includes('fee') || lower.includes('cost')) {
      answer =
        `<b>💳 Why A-Pay Beats Stripe for Micropayments:</b>\n\n` +
        `Stripe charges <b>$0.30 fixed + 2.9%</b>. If you sell an AI query for $0.20, Stripe takes 100% of your revenue and you lose money!\n\n` +
        `With A-Pay on Base L2:\n` +
        `• Flat 1% protocol fee ($0.002 on a $0.20 call)\n` +
        `• Gas cost is under $0.0001\n` +
        `• You keep 99% of your revenue with zero chargeback risk!`;
    } else if (lower.includes('wordpress') || lower.includes('plugin') || lower.includes('blog')) {
      answer =
        `<b>🔌 WordPress AI Paywall:</b>\n\n` +
        `Our official plugin <b><code>apay-web3-ai-paywall</code></b> is approved on WordPress.org.\n` +
        `It blocks AI scrapers with HTTP 402 while allowing human readers to browse 100% free!`;
    } else if (lower.includes('mcp') || lower.includes('claude') || lower.includes('cursor')) {
      answer =
        `<b>🤖 Model Context Protocol (MCP):</b>\n\n` +
        `Run <code>uvx apay mcp</code> (Python) or <code>npx apay-gateway mcp</code> (TypeScript) to connect A-Pay directly to Claude Desktop or Cursor!`;
    } else if (
      lower.includes('buyback') ||
      lower.includes('burn') ||
      lower.includes('tokenomics')
    ) {
      answer =
        `<b>🔥 Deflationary Buyback & Burn:</b>\n\n` +
        `30% of every protocol fee collected from micropayments is automatically swapped on Aerodrome DEX to buy and permanently burn $APAY tokens on Base Mainnet!\n\n` +
        `Fixed Supply: 100,000,000 $APAY (Zero inflation).`;
    } else {
      answer =
        `<b>🤖 A-Pay Protocol Assistant:</b>\n\n` +
        `I received your query: <i>"${text}"</i>\n\n` +
        `Here are quick ways to explore A-Pay Protocol:\n` +
        `• <code>/scan &lt;url&gt;</code> — Audit your site for AI crawler vulnerabilities\n` +
        `• <code>/faucet &lt;address&gt;</code> — Claim 50 testnet tokens\n` +
        `• <code>/balance &lt;address&gt;</code> — Check live Base balance\n` +
        `• <code>/contracts</code> — View smart contracts\n\n` +
        `Tap below to return to the interactive role selector:`;
    }

    await sendTelegramMessage(chatId, answer, {
      inline_keyboard: [
        [{ text: '🏠 Open Main Menu', callback_data: 'menu_main' }],
        [{ text: '🚀 Launch Web Console', url: 'https://apayprotocol.org' }],
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook Error]', error);
    return NextResponse.json({ ok: false, error: 'Internal Error' }, { status: 500 });
  }
}
