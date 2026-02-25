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

    const result = await generateThumbnail(body);

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
