import { NextResponse } from 'next/server';
import { mondayQuery } from '@/lib/monday/client';
import { FETCH_BOARD_ITEMS } from '@/lib/monday/queries';
import { transformMondayItem } from '@/lib/monday/transformers';
import type { MondayItem } from '@/types/episode';
import type { ApiResponse } from '@/types/api';

interface BoardItemsResponse {
  boards: Array<{
    items_page: {
      items: MondayItem[];
    };
  }>;
}

export async function GET() {
  try {
    const boardId = process.env.MONDAY_BOARD_ID;
    if (!boardId) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, data: null, error: 'MONDAY_BOARD_ID not configured' },
        { status: 500 }
      );
    }

    const data = await mondayQuery<BoardItemsResponse>(FETCH_BOARD_ITEMS, { boardId });
    const rawItems = data.boards[0]?.items_page?.items ?? [];

    const episodes = rawItems
      .map(transformMondayItem)
      .filter((e) => e.status !== 'published')
      .sort((a, b) => {
        if (!a.publishDate) return 1;
        if (!b.publishDate) return -1;
        return a.publishDate.localeCompare(b.publishDate);
      });

    return NextResponse.json<ApiResponse<typeof episodes>>({
      success: true,
      data: episodes,
      error: null,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, data: null, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
