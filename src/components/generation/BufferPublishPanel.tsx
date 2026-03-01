'use client';

import { useState } from 'react';
import type { SocialPlatform } from '@/types/generation';
import type { BufferPublishResult } from '@/types/api';

export interface SelectedPost {
  key: string;          // "${platform}-${postIndex}"
  platform: SocialPlatform;
  postIndex: number;
  text: string;         // editable
  scheduledAt: string;  // ISO datetime string (datetime-local value)
}

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'X / Twitter',
  tiktok: 'TikTok',
};

const PLATFORM_COLORS: Record<SocialPlatform, string> = {
  instagram: 'bg-pink-900/40 text-pink-300 border-pink-800',
  facebook: 'bg-blue-900/40 text-blue-300 border-blue-800',
  twitter: 'bg-slate-800 text-slate-300 border-slate-700',
  tiktok: 'bg-purple-900/40 text-purple-300 border-purple-800',
};

export function BufferPublishPanel({
  selectedPosts,
  episodeId,
  thumbnailUrl,
  onUpdatePost,
  onRemovePost,
  onSent,
}: {
  selectedPosts: SelectedPost[];
  episodeId: string;
  /** Relative URL of the generated thumbnail; attached automatically to Instagram & Facebook posts. */
  thumbnailUrl?: string;
  onUpdatePost: (key: string, text: string, scheduledAt: string) => void;
  onRemovePost: (key: string) => void;
  onSent: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BufferPublishResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/publish/buffer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId,
          imageUrl: thumbnailUrl,
          posts: selectedPosts.map((p) => ({
            platform: p.platform,
            text: p.text,
            scheduledAt: new Date(p.scheduledAt).toISOString(),
          })),
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setResult(data.data as BufferPublishResult);
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule posts');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-lg border border-pink-800/60 bg-pink-950/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-pink-400">
          Schedule to Buffer
        </p>
        <span className="text-xs text-slate-500">{selectedPosts.length} post{selectedPosts.length !== 1 ? 's' : ''} selected</span>
      </div>

      <div className="space-y-3">
        {selectedPosts.map((post) => (
          <div key={post.key} className="rounded-lg border border-slate-700 bg-slate-900 p-3 space-y-2">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded border uppercase tracking-wide ${PLATFORM_COLORS[post.platform]}`}>
                  {PLATFORM_LABELS[post.platform]}
                </span>
                <span className="text-xs text-slate-500">Post {post.postIndex + 1}</span>
              </div>
              <button
                type="button"
                onClick={() => onRemovePost(post.key)}
                className="text-slate-500 hover:text-pink-400 transition-colors text-lg leading-none px-1"
                title="Remove from selection"
              >
                ×
              </button>
            </div>

            {/* Editable text */}
            <textarea
              rows={4}
              value={post.text}
              onChange={(e) => onUpdatePost(post.key, e.target.value, post.scheduledAt)}
              className="w-full resize-none rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 focus:border-pink-700 focus:outline-none transition-colors"
            />

            {/* Per-post date picker */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 shrink-0">Schedule:</label>
              <input
                type="datetime-local"
                value={post.scheduledAt}
                onChange={(e) => onUpdatePost(post.key, post.text, e.target.value)}
                className="flex-1 rounded bg-slate-800 border border-slate-700 px-2 py-1 text-xs text-slate-300 focus:border-pink-700 focus:outline-none transition-colors"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSend}
          disabled={sending || selectedPosts.length === 0}
          className="px-4 py-2 bg-pink-800 hover:bg-pink-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? 'Scheduling...' : 'Schedule to Buffer'}
        </button>

        {result && (
          <p className="text-sm text-emerald-400">
            {result.sent} post{result.sent !== 1 ? 's' : ''} scheduled
            {result.skipped > 0 && ` · ${result.skipped} skipped (no profile configured)`}
            {result.errors.length > 0 && ` · ${result.errors.length} error(s)`}
          </p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {result?.errors.length ? (
        <ul className="space-y-1">
          {result.errors.map((e, i) => (
            <li key={i} className="text-xs text-red-400 font-mono">{e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
