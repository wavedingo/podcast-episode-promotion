import { NextResponse } from 'next/server';
import { generateSocialPosts } from '@/lib/claude/client';
import type { SocialGenerationRequest, ApiResponse } from '@/types/api';
import type { SocialPostSet } from '@/types/generation';

export async function POST(request: Request) {
  try {
    const body: SocialGenerationRequest = await request.json();

    if (!body.episodeName || !body.researchSummary) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, data: null, error: 'episodeName and researchSummary are required' },
        { status: 400 }
      );
    }

    const result = await generateSocialPosts(body);

    return NextResponse.json<ApiResponse<SocialPostSet>>({
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
