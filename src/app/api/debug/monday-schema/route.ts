import { NextResponse } from 'next/server';
import { mondayQuery } from '@/lib/monday/client';
import { FETCH_BOARD_SCHEMA } from '@/lib/monday/queries';

interface SchemaResponse {
  boards: Array<{
    id: string;
    name: string;
    columns: Array<{ id: string; title: string; type: string }>;
  }>;
}

export async function GET() {
  try {
    const boardId = process.env.MONDAY_BOARD_ID;
    if (!boardId) {
      return NextResponse.json({ error: 'MONDAY_BOARD_ID not set in environment' }, { status: 500 });
    }

    const data = await mondayQuery<SchemaResponse>(FETCH_BOARD_SCHEMA, { boardId });
    const board = data.boards[0];

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    return NextResponse.json({
      boardId: board.id,
      boardName: board.name,
      columns: board.columns,
      hint: 'Copy the relevant column IDs into your .env.local as MONDAY_COLUMN_PUBLISH_DATE, MONDAY_COLUMN_TEASER_COPY, MONDAY_COLUMN_STATUS',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
