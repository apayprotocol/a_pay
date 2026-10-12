import fs from 'node:fs';
import path from 'node:path';

export type CommunityCategory =
  | 'Integration'
  | 'Smart Contracts'
  | 'AI Agents & MCP'
  | 'Bug & Issues'
  | 'General';

export interface CommunityReply {
  id: string;
  threadId: string;
  authorWallet: string;
  authorName?: string;
  isFounder?: boolean;
  content: string;
  createdAt: number;
  likes: number;
  likedBy: string[];
  isSolution?: boolean;
  images?: string[];
}

export interface CommunityThread {
  id: string;
  title: string;
  content: string;
  authorWallet: string;
  authorName?: string;
  isFounder?: boolean;
  category: CommunityCategory;
  createdAt: number;
  updatedAt: number;
  likes: number;
  likedBy: string[];
  repliesCount: number;
  replies: CommunityReply[];
  solved?: boolean;
  network?: string;
  images?: string[];
}

const COMMUNITY_CACHE_FILE = path.join('/tmp', 'apay_community.json');
const FOUNDER_WALLET = '0x5eC06f4219C6b44CfE7c91463dD65B7B8E0fbEfc'.toLowerCase();

// Initial seeded questions and verified solutions so developers immediately find valuable help
const INITIAL_SEEDED_THREADS: CommunityThread[] = [
  {
    id: 'thread_mcp_claude',
    title: 'How do I connect Claude Desktop / Cursor to the A-Pay MCP Server?',
    content:
      'I want my Claude Desktop agent to automatically pay for HTTP 402 endpoints using my A-Pay session key. What is the exact configuration for `claude_desktop_config.json`?',
    authorWallet: '0x3a91f42289cb15d2a9381e9d80f845d319b9b1d2',
    authorName: 'Alex_Dev',
    isFounder: false,
    category: 'AI Agents & MCP',
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 2,
    likes: 8,
    likedBy: ['0x1', '0x2', '0x3'],
    repliesCount: 1,
    solved: true,
    network: 'all',
    replies: [
      {
        id: 'reply_mcp_claude_1',
        threadId: 'thread_mcp_claude',
        authorWallet: FOUNDER_WALLET,
        authorName: 'A-Pay Core Team',
        isFounder: true,
        content: `Hey Alex! You can connect Claude Desktop in 10 seconds:

\`\`\`json
{
  "mcpServers": {
    "apay": {
      "command": "npx",
      "args": ["-y", "@apay/gateway", "mcp"],
      "env": {
        "APAY_SESSION_KEY": "0xYourAgentSessionKeyHere",
        "APAY_NETWORK": "base-mainnet"
      }
    }
  }
}
\`\`\`

Claude will automatically detect the \`apay_fetch\` tool and transparently settle HTTP 402 challenges via EIP-712 without interrupting your prompts!`,
        createdAt: Date.now() - 3600000 * 2,
        likes: 12,
        likedBy: ['0x1', '0x2', '0x3', '0x4'],
        isSolution: true,
      },
    ],
  },
  {
    id: 'thread_nextjs_middleware',
    title: 'Adding 1-line AI Paywall to Next.js 15 App Router without breaking human SEO',
    content:
      'We run an API and blog on Next.js 15. We want normal visitors to read for free, but charge OpenAI GPTBot and ClaudeBot $0.001 USDC. How should we configure the middleware matcher?',
    authorWallet: '0x88f2491a5ec40375a329e4720917f03eb9419c84',
    authorName: 'SaaS_Engineer',
    isFounder: false,
    category: 'Integration',
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now() - 3600000 * 8,
    likes: 15,
    likedBy: ['0x1', '0x2'],
    repliesCount: 1,
    solved: true,
    network: 'all',
    replies: [
      {
        id: 'reply_nextjs_1',
        threadId: 'thread_nextjs_middleware',
        authorWallet: FOUNDER_WALLET,
        authorName: 'A-Pay Core Team',
        isFounder: true,
        content: `Use the Next.js snippet from our **1-Click Paywalls** tab! In your root \`middleware.ts\`:

\`\`\`typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AI_BOTS = ['gptbot', 'chatgpt-user', 'claudebot', 'perplexitybot'];

export function middleware(request: NextRequest) {
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  const isBot = AI_BOTS.some(bot => ua.includes(bot));

  // 1. Human visitors on normal browsers browse 100% free!
  if (!isBot) return NextResponse.next();

  // 2. Intercept AI scrapers with HTTP 402 challenge
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('APay eip712:')) {
    return NextResponse.json({
      status: 402,
      error: 'Payment Required',
      price: '0.001 USDC'
    }, { status: 402 });
  }
  return NextResponse.next();
}
\`\`\`

Human visitors and Googlebot pass through 100% free with zero impact on SEO!`,
        createdAt: Date.now() - 3600000 * 8,
        likes: 9,
        likedBy: ['0x1', '0x2'],
        isSolution: true,
      },
    ],
  },
  {
    id: 'thread_fee_reduction',
    title: 'How do merchants qualify for 0% protocol fee using $APAY token?',
    content:
      'The default protocol fee is 100 bps (1.0%) for USDC settlements. I heard we can get 0% protocol fee and higher merchant yield if customers settle in $APAY token or if we stake in StakingVault.sol. Is this live on Base Mainnet?',
    authorWallet: '0x9924c13dae81254bf5618f0a0d922a91280fcb1e',
    authorName: 'Merchant_0x99',
    isFounder: false,
    category: 'Smart Contracts',
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 18,
    likes: 6,
    likedBy: ['0x1'],
    repliesCount: 1,
    solved: true,
    network: 'all',
    replies: [
      {
        id: 'reply_fee_1',
        authorWallet: FOUNDER_WALLET,
        authorName: 'A-Pay Core Team',
        isFounder: true,
        threadId: 'thread_fee_reduction',
        content: `Yes! On Base Mainnet:

1. **Dual Currency Pricing**: In your gateway set \`currency: "DUAL"\`. When an autonomous agent chooses to pay in **$APAY Token**, protocol fee is **0%** and the entire payment goes directly to your merchant wallet.
2. **Bonded Staking**: If you stake >= 500 $APAY in \`StakingVault.sol\` (\`0x3e35a9e802627a3d9a86d6554e72b1c446e34aaf\`), your node is marked as Verified Bonded, unlocking priority machine discovery.`,
        createdAt: Date.now() - 3600000 * 18,
        likes: 7,
        likedBy: ['0x1', '0x2'],
        isSolution: true,
      },
    ],
  },
  {
    id: 'thread_v1_2_release',
    title:
      '🚀 Protocol v1.2 Live: Canonical Domain apayprotocol.org, Concept 3 Logo & Mobile Parity',
    content:
      'A-Pay Protocol v1.2 is officially live! We have unified our infrastructure under the canonical domain https://apayprotocol.org with Cloudflare Anycast edge routing, Basename apayprotocol.base.eth, Concept 3 vector emblem, and responsive dual-platform design. All smart contracts (APayRouter, EscrowVault, StakingVault) are verified on Base Mainnet and Sepolia with zero credential exposure.',
    authorWallet: FOUNDER_WALLET,
    authorName: 'A-Pay Core Team',
    isFounder: true,
    category: 'General',
    createdAt: Date.now() - 3600000 * 3,
    updatedAt: Date.now() - 3600000 * 1,
    likes: 24,
    likedBy: ['0x1', '0x2', '0x3', '0x4', '0x5'],
    repliesCount: 1,
    solved: true,
    network: 'all',
    replies: [
      {
        id: 'reply_v1_2_release_1',
        threadId: 'thread_v1_2_release',
        authorWallet: FOUNDER_WALLET,
        authorName: 'A-Pay Core Team',
        isFounder: true,
        content: `### 📋 What's New in v1.2:
- **Canonical Web Domain**: https://apayprotocol.org with Universal Edge SSL & anti-DDoS.
- **Official Basename**: \`apayprotocol.base.eth\` on Base L2.
- **Concept 3 Brand Emblem**: Precision-engineered geometric gold shield mark.
- **Mobile Touch Parity**: Full viewport & touch compatibility for both desktop web and mobile apps.
- **Interactive Community Issue Reporter**: Developers can now attach up to 3 screenshots directly when reporting issues!`,
        createdAt: Date.now() - 3600000 * 1,
        likes: 18,
        likedBy: ['0x1', '0x2', '0x3'],
        isSolution: true,
      },
    ],
  },
  {
    id: 'thread_screenshot_upload',
    title:
      '📸 How to attach screenshots (Max 3) when reporting HTTP 402 or Gateway integration issues',
    content:
      'Developers can now attach up to 3 screenshots directly when reporting issues in the Community Support Hub. Attach terminal stack traces, Network tab headers (showing the 402 challenge), or UI paywall states for instant debugging by core engineers.',
    authorWallet: FOUNDER_WALLET,
    authorName: 'A-Pay Core Team',
    isFounder: true,
    category: 'Bug & Issues',
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 3600000 * 1,
    likes: 11,
    likedBy: ['0x1', '0x2'],
    repliesCount: 1,
    solved: true,
    network: 'all',
    replies: [
      {
        id: 'reply_screenshot_upload_1',
        threadId: 'thread_screenshot_upload',
        authorWallet: FOUNDER_WALLET,
        authorName: 'A-Pay Core Team',
        isFounder: true,
        content: `When reporting an issue:
1. Click **Ask Question / Post Issue**.
2. Click the screenshot dropzone or press **Ctrl+V / Cmd+V** to paste directly from your clipboard!
3. Up to 3 screenshots are compressed client-side and saved with your post.
4. Click any attached screenshot in the thread to view it in full-resolution lightbox!`,
        createdAt: Date.now() - 3600000 * 1,
        likes: 8,
        likedBy: ['0x1', '0x2'],
        isSolution: true,
      },
    ],
  },
];

// In-memory registry for fast reads
const localMemoryThreads = new Map<string, CommunityThread>();

function hydrateLocalDisk(): void {
  try {
    if (localMemoryThreads.size === 0) {
      if (fs.existsSync(COMMUNITY_CACHE_FILE)) {
        const raw = fs.readFileSync(COMMUNITY_CACHE_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) {
          for (const thread of data) {
            localMemoryThreads.set(thread.id, thread);
          }
        }
      }
    }
    // Always merge canonical seeded threads if not already present
    for (const thread of INITIAL_SEEDED_THREADS) {
      if (!localMemoryThreads.has(thread.id)) {
        localMemoryThreads.set(thread.id, thread);
      }
    }
  } catch {
    // Non-blocking fallback
    for (const thread of INITIAL_SEEDED_THREADS) {
      if (!localMemoryThreads.has(thread.id)) {
        localMemoryThreads.set(thread.id, thread);
      }
    }
  }
}

function persistLocalDisk(): void {
  try {
    const list = Array.from(localMemoryThreads.values());
    fs.writeFileSync(COMMUNITY_CACHE_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch {
    // Non-blocking disk write
  }
}

// Initial hydration
hydrateLocalDisk();

class DistributedCommunityStore {
  private redisUrl: string | null;
  private redisToken: string | null;

  constructor() {
    this.redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || null;
    this.redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || null;
  }

  public get storageEngine(): 'upstash_redis' | 'local_fallback' {
    return this.redisUrl && this.redisToken ? 'upstash_redis' : 'local_fallback';
  }

  private async loadFromRedis(): Promise<void> {
    if (this.redisUrl && this.redisToken) {
      try {
        const res = await fetch(`${this.redisUrl}/get/apay_community_threads_v1`, {
          headers: { Authorization: `Bearer ${this.redisToken}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const body = await res.json();
          if (body?.result) {
            const parsed = typeof body.result === 'string' ? JSON.parse(body.result) : body.result;
            if (Array.isArray(parsed) && parsed.length > 0) {
              for (const t of parsed) {
                localMemoryThreads.set(t.id, t);
              }
            }
          }
        }
      } catch {
        // Fall back to local memory
      }
    }
  }

  public async getThreads(options?: {
    category?: string;
    search?: string;
    network?: string;
    limit?: number;
  }): Promise<CommunityThread[]> {
    hydrateLocalDisk();
    await this.loadFromRedis();
    let threads: CommunityThread[] = [];

    threads = Array.from(localMemoryThreads.values());

    // Category filter
    if (options?.category && options.category !== 'All') {
      threads = threads.filter((t) => t.category === options.category);
    }

    // Search query filter (matches title, content, author, or replies)
    if (options?.search) {
      const q = options.search.toLowerCase();
      threads = threads.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q) ||
          t.authorWallet.toLowerCase().includes(q) ||
          t.authorName?.toLowerCase().includes(q) ||
          t.replies.some((r) => r.content.toLowerCase().includes(q)),
      );
    }

    // MANDATORY: Most recent on top (sorted by updatedAt / createdAt descending)
    threads.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

    if (options?.limit && options.limit > 0) {
      threads = threads.slice(0, options.limit);
    }

    return threads;
  }

  public async getThread(id: string): Promise<CommunityThread | null> {
    hydrateLocalDisk();
    await this.loadFromRedis();
    return localMemoryThreads.get(id) || null;
  }

  public async createThread(params: {
    title: string;
    content: string;
    authorWallet: string;
    authorName?: string;
    category: CommunityCategory;
    network?: string;
    images?: string[];
  }): Promise<CommunityThread> {
    hydrateLocalDisk();
    await this.loadFromRedis();
    const now = Date.now();
    const isFounder = params.authorWallet.toLowerCase() === FOUNDER_WALLET;

    const newThread: CommunityThread = {
      id: `thread_${now}_${Math.random().toString(36).slice(2, 7)}`,
      title: params.title.trim(),
      content: params.content.trim(),
      authorWallet: params.authorWallet.toLowerCase(),
      authorName: params.authorName || (isFounder ? 'A-Pay Founder' : undefined),
      isFounder,
      category: params.category,
      createdAt: now,
      updatedAt: now,
      likes: 0,
      likedBy: [],
      repliesCount: 0,
      replies: [],
      solved: false,
      network: params.network || 'all',
      images: params.images && params.images.length > 0 ? params.images.slice(0, 3) : undefined,
    };

    localMemoryThreads.set(newThread.id, newThread);
    persistLocalDisk();
    await this.syncToRedis();

    return newThread;
  }

  public async addReply(params: {
    threadId: string;
    content: string;
    authorWallet: string;
    authorName?: string;
    isSolution?: boolean;
    images?: string[];
  }): Promise<CommunityReply | null> {
    hydrateLocalDisk();
    await this.loadFromRedis();
    const thread = localMemoryThreads.get(params.threadId);
    if (!thread) return null;

    const now = Date.now();
    const isFounder = params.authorWallet.toLowerCase() === FOUNDER_WALLET;

    const reply: CommunityReply = {
      id: `reply_${now}_${Math.random().toString(36).slice(2, 7)}`,
      threadId: params.threadId,
      authorWallet: params.authorWallet.toLowerCase(),
      authorName: params.authorName || (isFounder ? 'A-Pay Core Team' : undefined),
      isFounder,
      content: params.content.trim(),
      createdAt: now,
      likes: 0,
      likedBy: [],
      isSolution: params.isSolution || isFounder,
      images: params.images && params.images.length > 0 ? params.images.slice(0, 3) : undefined,
    };

    thread.replies.push(reply);
    thread.repliesCount = thread.replies.length;
    thread.updatedAt = now; // Bumps thread to the top!
    if (reply.isSolution) {
      thread.solved = true;
    }

    persistLocalDisk();
    await this.syncToRedis();

    return reply;
  }

  public async toggleLike(params: {
    threadId: string;
    replyId?: string;
    wallet: string;
  }): Promise<{ liked: boolean; newCount: number }> {
    hydrateLocalDisk();
    await this.loadFromRedis();
    const thread = localMemoryThreads.get(params.threadId);
    if (!thread) return { liked: false, newCount: 0 };

    const walletKey = params.wallet.toLowerCase();

    // Liking a reply
    if (params.replyId) {
      const reply = thread.replies.find((r) => r.id === params.replyId);
      if (!reply) return { liked: false, newCount: 0 };

      const existingIndex = reply.likedBy.indexOf(walletKey);
      let liked = false;
      if (existingIndex >= 0) {
        reply.likedBy.splice(existingIndex, 1);
        reply.likes = Math.max(0, reply.likes - 1);
      } else {
        reply.likedBy.push(walletKey);
        reply.likes += 1;
        liked = true;
      }
      persistLocalDisk();
      await this.syncToRedis();
      return { liked, newCount: reply.likes };
    }

    // Liking the thread itself
    const existingIndex = thread.likedBy.indexOf(walletKey);
    let liked = false;
    if (existingIndex >= 0) {
      thread.likedBy.splice(existingIndex, 1);
      thread.likes = Math.max(0, thread.likes - 1);
    } else {
      thread.likedBy.push(walletKey);
      thread.likes += 1;
      liked = true;
    }

    persistLocalDisk();
    await this.syncToRedis();
    return { liked, newCount: thread.likes };
  }

  private async syncToRedis(): Promise<void> {
    if (this.redisUrl && this.redisToken) {
      try {
        const payload = JSON.stringify(Array.from(localMemoryThreads.values()));
        await fetch(this.redisUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.redisToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(['SET', 'apay_community_threads_v1', payload]),
          cache: 'no-store',
        });
      } catch {
        // Non-blocking sync failure
      }
    }
  }
}

export const communityStore = new DistributedCommunityStore();
