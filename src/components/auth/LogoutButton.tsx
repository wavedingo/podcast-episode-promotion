'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-slate-500 hover:text-pink-400 transition-colors"
    >
      Sign out
    </button>
  );
}
