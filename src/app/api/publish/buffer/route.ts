import { NextResponse } from 'next/server';
import { createBufferPost, getChannelId } from '@/lib/buffer/client';
import type { BufferPublishRequest, BufferPublishResult, ApiResponse } from '@/types/api';
import type { SocialPlatform } from '@/types/generation';

/** Platforms that expect an image asset attached to the post. */
const IMAGE_PLATFORMS = new Set<SocialPlatform>(['instagram', 'facebook']);

/** Resolve a relative path to an absolute URL using NEXT_PUBLIC_BASE_URL. */
function toAbsoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}${url}`;
}

export async function POST(request: Request) {
  try {
    const body: BufferPublishRequest = await request.json();

    if (!body.posts?.length) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, data: null, error: 'No posts provided' },
        { status: 400 }
      );
    }

    const absoluteImageUrl = body.imageUrl ? toAbsoluteUrl(body.imageUrl) : undefined;

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const post of body.posts) {
      const channelId = getChannelId(post.platform);
      if (!channelId) {
        skipped++;
        continue;
      }
      const imageUrl =
        absoluteImageUrl && IMAGE_PLATFORMS.has(post.platform) ? absoluteImageUrl : undefined;
      try {
        await createBufferPost({ channelId, platform: post.platform, text: post.text, scheduledAt: post.scheduledAt, imageUrl });
        sent++;
      } catch (err) {
        errors.push(`${post.platform}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    const result: BufferPublishResult = { sent, skipped, errors };
    return NextResponse.json<ApiResponse<BufferPublishResult>>({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, data: null, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
