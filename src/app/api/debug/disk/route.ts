import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * GET /api/debug/disk
 *
 * Diagnostic endpoint — helps confirm the server can write PNG files to the
 * correct public/generated path. Only runs in non-production or when
 * ENABLE_DISK_DEBUG=1 is set in the environment.
 *
 * Remove or restrict this route once the deployment issue is resolved.
 */
export async function GET() {
  const allowed =
    process.env.NODE_ENV !== 'production' || process.env.ENABLE_DISK_DEBUG === '1';

  if (!allowed) {
    return NextResponse.json({ error: 'Not available in production. Set ENABLE_DISK_DEBUG=1 to enable.' }, { status: 403 });
  }

  const cwd = process.cwd();
  const generatedBase =
    process.env.GENERATED_IMAGES_BASE_DIR ?? path.join(cwd, 'public', 'generated');

  let writeOk = false;
  let writeError: string | null = null;

  try {
    const testDir = path.join(generatedBase, '_debug');
    fs.mkdirSync(testDir, { recursive: true });
    const testFilePath = path.join(testDir, 'test.txt');
    fs.writeFileSync(testFilePath, 'ok', { mode: 0o644 });
    fs.unlinkSync(testFilePath);
    writeOk = true;
  } catch (err) {
    writeError = err instanceof Error ? err.message : String(err);
  }

  const publicPath = path.join(cwd, 'public');
  let publicExists = false;
  let publicGenExists = false;
  try { publicExists = fs.statSync(publicPath).isDirectory(); } catch { /* noop */ }
  try { publicGenExists = fs.statSync(generatedBase).isDirectory(); } catch { /* noop */ }

  return NextResponse.json({
    cwd,
    generatedBase,
    publicExists,
    publicGenExists,
    writeOk,
    writeError,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      GENERATED_IMAGES_BASE_DIR: process.env.GENERATED_IMAGES_BASE_DIR ?? null,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '***set***' : 'MISSING',
    },
  });
}
