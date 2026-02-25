'use client';

import { useState } from 'react';
import type { SocialPostSet, SocialPlatform } from '@/types/generation';
import { PostCard } from './PostCard';

const PLATFORMS: Array<{ key: SocialPlatform; label: string; icon: string }> = [
  { key: 'instagram', label: 'Instagram', icon: '📸' },
  { key: 'facebook', label: 'Facebook', icon: '👥' },
  { key: 'twitter', label: 'X / Twitter', icon: '✕' },
  { key: 'tiktok', label: 'TikTok', icon: '🎵' },
];

export function SocialPostsPanel({ socialPosts }: { socialPosts: SocialPostSet }) {
  const [active, setActive] = useState<SocialPlatform>('instagram');
  const posts = socialPosts.posts[active] ?? [];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
        Social Media Posts
      </h3>

      {/* Platform tabs */}
      <div className="flex gap-1 flex-wrap">
        {PLATFORMS.map((p) => (
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
          </button>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {posts.map((post, i) => (
          <PostCard key={i} post={post} index={i} />
        ))}
      </div>
    </div>
  );
}
