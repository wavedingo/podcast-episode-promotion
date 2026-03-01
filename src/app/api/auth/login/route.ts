import { NextResponse } from 'next/server';
import { verifyPassword, createToken, COOKIE_NAME } from '@/lib/auth/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username ?? '');
    const password = String(body.password ?? '');

    if (!verifyPassword(username, password)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = createToken(username);
    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
