import { NextResponse } from 'next/server';
import { validateSafePublicUrl } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'A-Pay Website & AI Bot Crawler Auditor',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let url = (body?.url || '').trim();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Missing "url" parameter in request body' },
        { status: 400 },
      );
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    const validation = validateSafePublicUrl(url, { allowLocalhostInDev: true });
    if (!validation.safe || !validation.url) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid or restricted target URL' },
        { status: 400 },
      );
    }

    const targetUrl = validation.url;
    const host = targetUrl.host;

    let robotsTxt = '';
    let has402Header = false;

    try {
      const [robotsRes, headRes] = await Promise.all([
        fetch(`https://${host}/robots.txt`, {
          signal: AbortSignal.timeout(4500),
          headers: { 'User-Agent': 'APayAuditBot/1.0 (+https://apayprotocol.org)' },
        }).catch(() => null),
        fetch(`https://${host}/`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(4500),
          headers: { 'User-Agent': 'GPTBot/1.2 (+https://openai.com/gptbot)' },
        }).catch(() => null),
      ]);

      if (robotsRes?.ok) {
        robotsTxt = (await robotsRes.text()).slice(0, 8000);
      }

      if (headRes) {
        const is402 = headRes.status === 402;
        const hasReceiver = headRes.headers.has('x-apay-receiver');
        has402Header = is402 || hasReceiver;
      }
    } catch {
      // Graceful fallback
    }

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

    const isProtected =
      has402Header || (robotsTxt.includes('llms.txt') && robotsTxt.includes('apay'));

    let overallStatus: 'protected' | 'blocked' | 'vulnerable' = 'vulnerable';
    let estimatedLossMonthly = '$30 - $180 / month';
    let recommendation =
      'Install the official A-Pay WordPress plugin or Next.js middleware to charge AI bots per query while keeping human readers 100% free!';

    if (isProtected) {
      overallStatus = 'protected';
      estimatedLossMonthly = '$0 (Monetized)';
      recommendation =
        'Your site is protected and actively receiving RFC-2068 HTTP 402 micropayments on Base L2!';
    } else if (gptBotBlocked && claudeBotBlocked && perplexityBlocked) {
      overallStatus = 'blocked';
      estimatedLossMonthly = '$40 - $200 / month (Lost Revenue)';
      recommendation =
        'AI bots are completely blocked. Instead of earning $0, enable A-Pay HTTP 402 to monetize their scraping traffic.';
    }

    return NextResponse.json({
      success: true,
      host,
      status: overallStatus,
      has402: isProtected,
      bots: {
        gptBot: {
          name: 'OpenAI (GPTBot)',
          blocked: gptBotBlocked,
          status: isProtected
            ? 'Monetized (HTTP 402)'
            : gptBotBlocked
              ? 'Blocked ($0)'
              : 'Scraping Free ($0)',
        },
        claudeBot: {
          name: 'Anthropic (ClaudeBot)',
          blocked: claudeBotBlocked,
          status: isProtected
            ? 'Monetized (HTTP 402)'
            : claudeBotBlocked
              ? 'Blocked ($0)'
              : 'Scraping Free ($0)',
        },
        perplexity: {
          name: 'Perplexity AI',
          blocked: perplexityBlocked,
          status: isProtected
            ? 'Monetized (HTTP 402)'
            : perplexityBlocked
              ? 'Blocked ($0)'
              : 'Scraping Free ($0)',
        },
      },
      estimatedLossMonthly,
      recommendation,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to scan target domain' },
      { status: 500 },
    );
  }
}
