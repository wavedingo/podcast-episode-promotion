'use client';

import { useState, useEffect } from 'react';
import { getCachePresence } from '@/hooks/useGenerationCache';

export function EpisodeGeneratedBadge({ episodeId }: { episodeId: string }) {
  const [hasContent, setHasContent] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);

  useEffect(() => {
    const p = getCachePresence(episodeId);
    setHasContent(p.research || p.socialPosts || p.thumbnails);
    setIsScheduled(p.scheduled);
  }, [episodeId]);

  if (!hasContent && !isScheduled) return null;

  return (
    <>
      {hasContent && (
        <span className="text-xs px-2 py-0.5 rounded border bg-pink-900/50 text-pink-300 border-pink-700 uppercase tracking-wide">
          Generated
        </span>
      )}
      {isScheduled && (
        <span className="text-xs px-2 py-0.5 rounded border bg-purple-900/50 text-purple-300 border-purple-700 uppercase tracking-wide">
          Scheduled
        </span>
      )}
    </>
  );
}
