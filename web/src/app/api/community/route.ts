import { NextResponse } from 'next/server';
import { type CommunityCategory, communityStore } from '@/lib/community-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitize(str: string): string {
  if (!str) return '';
  return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE_CHARS = 2.5 * 1024 * 1024; // ~2.5MB chars limit per image
const ALLOWED_IMAGE_DATA_REGEX =
  /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/;
const ALLOWED_HTTPS_URL_REGEX = /^https:\/\/[^\s$.?#].[^\s]*$/i;

function validateAndSanitizeImages(imagesRaw: unknown): {
  valid: boolean;
  error?: string;
  images?: string[];
} {
  if (!imagesRaw || (Array.isArray(imagesRaw) && imagesRaw.length === 0)) {
    return { valid: true, images: undefined };
  }
  if (!Array.isArray(imagesRaw)) {
    return { valid: false, error: 'Images must be provided as an array.' };
  }
  if (imagesRaw.length > MAX_IMAGES) {
    return { valid: false, error: `Maximum ${MAX_IMAGES} screenshots allowed per post.` };
  }

  const cleanImages: string[] = [];
  for (let i = 0; i < imagesRaw.length; i++) {
    const item = imagesRaw[i];
    if (typeof item !== 'string') {
      return { valid: false, error: `Screenshot #${i + 1} must be a valid image string.` };
    }
    const trimmed = item.trim();
    if (trimmed.length > MAX_IMAGE_SIZE_CHARS) {
      return {
        valid: false,
        error: `Screenshot #${i + 1} exceeds maximum allowable size (2MB limit).`,
      };
    }
    if (!ALLOWED_IMAGE_DATA_REGEX.test(trimmed) && !ALLOWED_HTTPS_URL_REGEX.test(trimmed)) {
      return {
        valid: false,
        error: `Screenshot #${i + 1} is not a valid format. Only PNG, JPEG, WebP, GIF data URLs or secure HTTPS image links are allowed.`,
      };
    }
    cleanImages.push(trimmed);
  }

  return { valid: true, images: cleanImages };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const network = searchParams.get('network') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

    const threads = await communityStore.getThreads({
      category,
      search,
      network,
      limit,
    });

    return NextResponse.json(
      {
        success: true,
        count: threads.length,
        storageEngine: communityStore.storageEngine,
        threads,
        timestamp: Date.now(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to fetch community discussions: ${message}` },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action || 'create_thread';

    // 1. Action: Like / Upvote
    if (action === 'toggle_like') {
      const threadId = body.threadId;
      const replyId = body.replyId;
      const wallet = body.wallet || body.userAddress;
      if (!threadId || !wallet) {
        return NextResponse.json(
          { error: 'Missing required threadId or wallet for like action.' },
          { status: 400 },
        );
      }
      const result = await communityStore.toggleLike({ threadId, replyId, wallet });
      return NextResponse.json({
        success: true,
        liked: result.liked,
        likes: result.newCount,
        newCount: result.newCount,
      });
    }

    // 2. Action: Reply to thread
    if (action === 'add_reply') {
      const threadId = body.threadId;
      const content = body.content;
      const authorWallet = body.authorWallet || body.author;
      const authorName = body.authorName;
      const isSolution = body.isSolution;

      if (!threadId || !content || !authorWallet) {
        return NextResponse.json(
          { error: 'Missing required threadId, content, or authorWallet for reply.' },
          { status: 400 },
        );
      }
      const cleanContent = sanitize(content);
      if (cleanContent.length < 2) {
        return NextResponse.json(
          { error: 'Reply content is too short (minimum 2 characters).' },
          { status: 400 },
        );
      }
      if (cleanContent.length > 5000) {
        return NextResponse.json(
          { error: 'Reply content exceeds 5,000 character limit.' },
          { status: 400 },
        );
      }

      const replyImagesValidation = validateAndSanitizeImages(body.images);
      if (!replyImagesValidation.valid) {
        return NextResponse.json({ error: replyImagesValidation.error }, { status: 400 });
      }

      const reply = await communityStore.addReply({
        threadId,
        content: cleanContent,
        authorWallet,
        authorName: authorName ? sanitize(authorName) : undefined,
        isSolution,
        images: replyImagesValidation.images,
      });

      if (!reply) {
        return NextResponse.json({ error: 'Thread not found.' }, { status: 404 });
      }

      return NextResponse.json(
        {
          success: true,
          reply,
          message: 'Reply posted successfully.',
        },
        { status: 201 },
      );
    }

    // 3. Action: Create New Thread
    const title = body.title;
    const content = body.content;
    const authorWallet = body.authorWallet || body.author;
    const authorName = body.authorName;
    const category = body.category;
    const network = body.network;

    if (!title || !content || !authorWallet) {
      return NextResponse.json(
        { error: 'Missing required title, content, or authorWallet for new thread.' },
        { status: 400 },
      );
    }

    const cleanTitle = sanitize(title);
    const cleanContent = sanitize(content);

    if (cleanTitle.length < 5 || cleanTitle.length > 200) {
      return NextResponse.json(
        { error: 'Title must be between 5 and 200 characters.' },
        { status: 400 },
      );
    }

    if (cleanContent.length < 10 || cleanContent.length > 10000) {
      return NextResponse.json(
        { error: 'Content must be between 10 and 10,000 characters.' },
        { status: 400 },
      );
    }

    const validCategories: CommunityCategory[] = [
      'Integration',
      'Smart Contracts',
      'AI Agents & MCP',
      'Bug & Issues',
      'General',
    ];
    const resolvedCategory: CommunityCategory = validCategories.includes(category)
      ? category
      : 'General';

    const imagesValidation = validateAndSanitizeImages(body.images);
    if (!imagesValidation.valid) {
      return NextResponse.json({ error: imagesValidation.error }, { status: 400 });
    }

    const thread = await communityStore.createThread({
      title: cleanTitle,
      content: cleanContent,
      authorWallet,
      authorName: authorName ? sanitize(authorName) : undefined,
      category: resolvedCategory,
      network: network || 'all',
      images: imagesValidation.images,
    });

    return NextResponse.json(
      {
        success: true,
        thread,
        message: 'Discussion thread created successfully.',
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Community API error: ${message}` }, { status: 500 });
  }
}
