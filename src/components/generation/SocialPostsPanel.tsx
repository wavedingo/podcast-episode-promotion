'use client';

import { useState, useCallback } from 'react';
import type { SocialPostSet, SocialPlatform } from '@/types/generation';
import type { Episode } from '@/types/episode';
import { getCache, saveCache } from '@/hooks/useGenerationCache';
import { PostCard } from './PostCard';
import { BufferPublishPanel, type SelectedPost } from './BufferPublishPanel';

const PLATFORMS: Array<{ key: SocialPlatform; label: string; icon: string }> = [
  { key: 'instagram', label: 'Instagram', icon: '📸' },
  { key: 'facebook', label: 'Facebook', icon: '👥' },
  { key: 'twitter', label: 'X / Twitter', icon: '✕' },
  { key: 'tiktok', label: 'TikTok', icon: '🎵' },
];

/** Returns a datetime-local string (YYYY-MM-DDTHH:mm) for the default schedule.
 *  Uses the episode's publish date at noon if available, otherwise tomorrow at noon.
 */
function defaultScheduledAt(publishDate: string | null): string {
  const base = publishDate
    ? new Date(`${publishDate}T12:00:00`)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(12, 0, 0, 0);
        return d;
      })();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
}

export function SocialPostsPanel({
  socialPosts,
  episode,
}: {
  socialPosts: SocialPostSet;
  episode: Episode;
}) {
  const [active, setActive] = useState<SocialPlatform>('instagram');
  const [selectedPosts, setSelectedPosts] = useState<Map<string, SelectedPost>>(new Map());

  const posts = socialPosts.posts[active] ?? [];

  const handleSelect = useCallback(
    (platform: SocialPlatform, postIndex: number, content: string) => {
      const key = `${platform}-${postIndex}`;
      setSelectedPosts((prev) => {
        const next = new Map(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.set(key, {
            key,
            platform,
            postIndex,
            text: content,
            scheduledAt: defaultScheduledAt(episode.publishDate),
          });
        }
        return next;
      });
    },
    [episode.publishDate]
  );

  const handleUpdatePost = useCallback((key: string, text: string, scheduledAt: string) => {
    setSelectedPosts((prev) => {
      const next = new Map(prev);
      const existing = next.get(key);
      if (existing) next.set(key, { ...existing, text, scheduledAt });
      return next;
    });
  }, []);

  const handleRemovePost = useCallback((key: string) => {
    setSelectedPosts((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const handleBufferSent = useCallback(() => {
    const cache = getCache(episode.id);
    if (cache) {
      saveCache({ ...cache, scheduledToBufferAt: new Date().toISOString() });
    }
  }, [episode.id]);

  const selectedArray = Array.from(selectedPosts.values());

  const countByPlatform = (platform: SocialPlatform) =>
    selectedArray.filter((p) => p.platform === platform).length;

  // Latest generated thumbnail URL — passed to Buffer for Instagram & Facebook posts
  const thumbnailUrl = getCache(episode.id)?.thumbnails.at(-1)?.imageUrl;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
        Social Media Posts
      </h3>

      {/* Platform tabs */}
      <div className="flex gap-1 flex-wrap">
        {PLATFORMS.map((p) => {
          const selCount = countByPlatform(p.key);
          return (
            <button
              key={p.key}
              onClick={() => setActive(p.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                active === p.key
                  ? 'bg-pink-900/50 text-pink-300 border border-pink-700'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'
              }`}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
              {selCount > 0 && (
                <span className="ml-0.5 bg-pink-700 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {selCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Posts for active platform */}
      <div className="space-y-3">
        {posts.map((post, i) => {
          const key = `${active}-${i}`;
          return (
            <PostCard
              key={i}
              post={post}
              index={i}
              selected={selectedPosts.has(key)}
              onSelect={() => handleSelect(active, i, post.content)}
            />
          );
        })}
      </div>

      {/* Buffer publish panel — shown when any posts are selected */}
      {selectedArray.length > 0 && (
        <BufferPublishPanel
          selectedPosts={selectedArray}
          episodeId={episode.id}
          thumbnailUrl={thumbnailUrl}
          onUpdatePost={handleUpdatePost}
          onRemovePost={handleRemovePost}
          onSent={handleBufferSent}
        />
      )}
    </div>
  );
}
