import { NextResponse } from 'next/server';
import { listBufferChannels } from '@/lib/buffer/client';
import type { ApiResponse } from '@/types/api';
import type { BufferChannel } from '@/lib/buffer/client';

export async function GET() {
  try {
    const channels = await listBufferChannels();
    return NextResponse.json<ApiResponse<BufferChannel[]>>({
      success: true,
      data: channels,
      error: null,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, data: null, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
