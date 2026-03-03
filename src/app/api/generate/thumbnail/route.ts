import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { generateThumbnail } from '@/lib/openai/client';
import type { ThumbnailRequest, ApiResponse } from '@/types/api';
import type { ThumbnailResult } from '@/types/generation';

// Allow up to 5 minutes — gpt-image-1 high-quality generation can take 60–120 s,
// and Nginx proxy_read_timeout must be set to match on the server side.
export const maxDuration = 300;

/** Resolve the public directory robustly regardless of process.cwd(). */
function publicDir(): string {
  // GENERATED_IMAGES_BASE_DIR lets the production server pin an absolute path,
  // e.g. /home/ubuntu/episode-promoter/public/generated
  if (process.env.GENERATED_IMAGES_BASE_DIR) {
    return process.env.GENERATED_IMAGES_BASE_DIR;
  }
  return path.join(process.cwd(), 'public', 'generated');
}

export async function POST(request: Request) {
  try {
    const body: ThumbnailRequest = await request.json();

    if (!body.episodeName || !body.researchSummary) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, data: null, error: 'episodeName and researchSummary are required' },
        { status: 400 }
      );
    }

    const { b64Json, prompt, revisedPrompt } = await generateThumbnail(body);

    if (!b64Json) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, data: null, error: 'OpenAI returned no image data (b64_json was empty)' },
        { status: 500 }
      );
    }

    // Save PNG to disk so the URL can be cached without hitting localStorage quota.
    // mode 0o644 ensures the file is world-readable even when the process umask is restrictive.
    const timestamp = Date.now();
    const dir = path.join(publicDir(), body.episodeId);
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${timestamp}.png`;
    fs.writeFileSync(path.join(dir, filename), Buffer.from(b64Json, 'base64'), { mode: 0o644 });

    const result: ThumbnailResult = {
      episodeId: body.episodeId,
      imageUrl: `/generated/${body.episodeId}/${filename}`,
      prompt,
      revisedPrompt,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json<ApiResponse<ThumbnailResult>>({
      success: true,
      data: result,
      error: null,
    });
  } catch (error) {
    console.error('[thumbnail] generation failed:', error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, data: null, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
