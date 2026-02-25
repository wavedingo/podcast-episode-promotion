import { NextResponse } from 'next/server';
import { mondayQuery } from '@/lib/monday/client';
import { FETCH_ITEM_BY_ID } from '@/lib/monday/queries';
import { transformMondayItem } from '@/lib/monday/transformers';
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
    return NextResponse.json<ApiResponse<typeof episode>>({
      success: true,
      data: episode,
      error: null,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, data: null, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
