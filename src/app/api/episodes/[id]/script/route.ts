import { NextResponse } from 'next/server';
import { mondayQuery } from '@/lib/monday/client';
import { FETCH_ITEM_BY_ID } from '@/lib/monday/queries';
import { transformMondayItem } from '@/lib/monday/transformers';
import { extractTextFromDocx } from '@/lib/mammoth/parser';
import type { MondayItem } from '@/types/episode';
import type { ApiResponse } from '@/types/api';

interface ItemResponse {
  items: MondayItem[];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await mondayQuery<ItemResponse>(FETCH_ITEM_BY_ID, { itemId: id });
    const item = data.items[0];

    if (!item) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, data: null, error: 'Episode not found' },
        { status: 404 }
      );
    }

    const episode = transformMondayItem(item);

    if (!episode.scriptAsset) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, data: null, error: 'No script file attached to this episode' },
        { status: 404 }
      );
    }

    // Download the file from Monday.com — requires auth header
    const fileResponse = await fetch(episode.scriptAsset.url, {
      headers: {
        Authorization: process.env.MONDAY_API_TOKEN!,
      },
    });

    if (!fileResponse.ok) {
      throw new Error(`Failed to download script file: ${fileResponse.status}`);
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = await extractTextFromDocx(buffer);

    const result = {
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      characterCount: text.length,
    };

    return NextResponse.json<ApiResponse<typeof result>>({
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
