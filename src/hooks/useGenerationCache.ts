import type { GenerationCache } from '@/types/generation';

const KEY_PREFIX = 'wc:gen:';

function cacheKey(episodeId: string): string {
  return `${KEY_PREFIX}${episodeId}`;
}

export function getCache(episodeId: string): GenerationCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKey(episodeId));
    return raw ? (JSON.parse(raw) as GenerationCache) : null;
  } catch {
    return null;
  }
}

export function saveCache(data: Omit<GenerationCache, 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  const key = cacheKey(data.episodeId);
  const payload: GenerationCache = { ...data, savedAt: new Date().toISOString() };

  // Attempt 1: save everything
  try {
    localStorage.setItem(key, JSON.stringify(payload));
    return;
  } catch {
    // QuotaExceededError — retry with reduced thumbnails
  }

  // Attempt 2: keep only the most recent thumbnail
  try {
    localStorage.setItem(key, JSON.stringify({ ...payload, thumbnails: payload.thumbnails.slice(-1) }));
    return;
  } catch {
    // Still over quota
  }

  // Attempt 3: drop all thumbnails, keep text data
  try {
    localStorage.setItem(key, JSON.stringify({ ...payload, thumbnails: [] }));
  } catch {
    // Give up silently
  }
}

export function clearCache(episodeId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(cacheKey(episodeId));
  } catch {
    // ignore
  }
}

export function getCachePresence(episodeId: string): {
  research: boolean;
  socialPosts: boolean;
  thumbnails: boolean;
  scheduled: boolean;
} {
  const cached = getCache(episodeId);
  if (!cached) return { research: false, socialPosts: false, thumbnails: false, scheduled: false };
  return {
    research: cached.research !== null,
    socialPosts: cached.socialPosts !== null,
    thumbnails: cached.thumbnails.length > 0,
    scheduled: !!cached.scheduledToBufferAt,
  };
}
