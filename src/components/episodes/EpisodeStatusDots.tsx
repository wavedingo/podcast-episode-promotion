'use client';

import { useState, useEffect } from 'react';
import { getCachePresence } from '@/hooks/useGenerationCache';

export function EpisodeGeneratedBadge({ episodeId }: { episodeId: string }) {
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const p = getCachePresence(episodeId);
    setHasContent(p.research || p.socialPosts || p.thumbnails);
  }, [episodeId]);

  if (!hasContent) return null;

  return (
    <span className="text-xs px-2 py-0.5 rounded border bg-pink-900/50 text-pink-300 border-pink-700 uppercase tracking-wide">
      Generated
    </span>
  );
}
