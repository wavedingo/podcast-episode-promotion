import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { generateThumbnail } from '@/lib/openai/client';
import type { ThumbnailRequest, ApiResponse } from '@/types/api';
import type { ThumbnailResult } from '@/types/generation';

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

    // Save PNG to disk so the URL can be cached without hitting localStorage quota
    const timestamp = Date.now();
    const dir = path.join(process.cwd(), 'public', 'generated', body.episodeId);
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${timestamp}.png`;
    fs.writeFileSync(path.join(dir, filename), Buffer.from(b64Json, 'base64'));

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
    return NextResponse.json<ApiResponse<never>>(
      { success: false, data: null, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
