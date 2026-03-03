import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import type { GenerationCache } from '@/types/generation';

function cacheFilePath(episodeId: string): string {
  // Reject anything that could escape the cache directory
  if (!/^[\w-]+$/.test(episodeId)) throw new Error('Invalid episodeId');
  const dir = path.join(process.cwd(), 'data', 'cache');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${episodeId}.json`);
}

export async function GET(_req: Request, { params }: { params: Promise<{ episodeId: string }> }) {
  try {
    const { episodeId } = await params;
    const filePath = cacheFilePath(episodeId);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(null);
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json(JSON.parse(raw) as GenerationCache);
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ episodeId: string }> }) {
  try {
    const { episodeId } = await params;
    const filePath = cacheFilePath(episodeId);
    const body = await req.json();
    fs.writeFileSync(filePath, JSON.stringify(body), 'utf8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ episodeId: string }> }) {
  try {
    const { episodeId } = await params;
    const filePath = cacheFilePath(episodeId);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true }); // idempotent
  }
}
