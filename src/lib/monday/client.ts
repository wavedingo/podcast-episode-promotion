import type { MondayItem } from '@/types/episode';
import { FETCH_BOARD_ITEMS, FETCH_NEXT_BOARD_ITEMS } from './queries';

const MONDAY_API_URL = 'https://api.monday.com/v2';
const PAGE_LIMIT = 100;

export async function mondayQuery<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: process.env.MONDAY_API_TOKEN!,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Monday.com API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  return json.data as T;
}

interface ItemsPage {
  cursor: string | null;
  items: MondayItem[];
}

export async function getAllBoardItems(boardId: string): Promise<MondayItem[]> {
  const allItems: MondayItem[] = [];

  const firstData = await mondayQuery<{ boards: Array<{ items_page: ItemsPage }> }>(
    FETCH_BOARD_ITEMS,
    { boardId }
  );
  const firstPage = firstData.boards[0]?.items_page;
  allItems.push(...(firstPage?.items ?? []));
  let cursor = firstPage?.cursor ?? null;

  while (cursor) {
    const nextData = await mondayQuery<{ next_items_page: ItemsPage }>(
      FETCH_NEXT_BOARD_ITEMS,
      { limit: PAGE_LIMIT, cursor }
    );
    const nextPage = nextData.next_items_page;
    allItems.push(...(nextPage?.items ?? []));
    cursor = nextPage?.cursor ?? null;
  }

  return allItems;
}
