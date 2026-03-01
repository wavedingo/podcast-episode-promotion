import { NextResponse } from 'next/server';

function mask(val: string | undefined): string {
  if (!val) return '(not set)';
  if (val.length <= 8) return '***';
  return `${val.slice(0, 4)}…${val.slice(-4)}`;
}

export async function GET() {
  return NextResponse.json({
    BUFFER_ACCESS_TOKEN: mask(process.env.BUFFER_ACCESS_TOKEN),
    BUFFER_CHANNEL_INSTAGRAM: mask(process.env.BUFFER_CHANNEL_INSTAGRAM),
    BUFFER_CHANNEL_FACEBOOK: mask(process.env.BUFFER_CHANNEL_FACEBOOK),
    BUFFER_CHANNEL_TWITTER: mask(process.env.BUFFER_CHANNEL_TWITTER),
    BUFFER_CHANNEL_TIKTOK: mask(process.env.BUFFER_CHANNEL_TIKTOK),
  });
}
