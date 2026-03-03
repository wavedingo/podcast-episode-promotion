import type { GenerationCache } from '@/types/generation';

export async function getCache(episodeId: string): Promise<GenerationCache | null> {
  try {
    const res = await fetch(`/api/cache/${encodeURIComponent(episodeId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveCache(data: Omit<GenerationCache, 'savedAt'>): Promise<void> {
  const payload: GenerationCache = { ...data, savedAt: new Date().toISOString() };
  try {
    await fetch(`/api/cache/${encodeURIComponent(data.episodeId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-fatal — UI stays intact even if persistence fails
  }
}

export async function clearCache(episodeId: string): Promise<void> {
  try {
    await fetch(`/api/cache/${encodeURIComponent(episodeId)}`, { method: 'DELETE' });
  } catch {
    // ignore
  }
}

export async function getCachePresence(episodeId: string): Promise<{
  research: boolean;
  socialPosts: boolean;
  thumbnails: boolean;
  scheduled: boolean;
}> {
  const cached = await getCache(episodeId);
  if (!cached) return { research: false, socialPosts: false, thumbnails: false, scheduled: false };
  return {
    research: cached.research !== null,
    socialPosts: cached.socialPosts !== null,
    thumbnails: cached.thumbnails.length > 0,
    scheduled: !!cached.scheduledToBufferAt,
  };
}
