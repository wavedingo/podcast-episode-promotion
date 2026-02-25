import { NextResponse } from 'next/server';
import { researchCase } from '@/lib/perplexity/client';
import type { ResearchRequest, ApiResponse } from '@/types/api';
import type { ResearchResult } from '@/types/generation';

export async function POST(request: Request) {
  try {
    const body: ResearchRequest = await request.json();

    if (!body.episodeName) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, data: null, error: 'episodeName is required' },
        { status: 400 }
      );
    }

    const result = await researchCase(body);

    return NextResponse.json<ApiResponse<ResearchResult>>({
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
