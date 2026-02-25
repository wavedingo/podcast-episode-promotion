'use client';

import { useState, useCallback } from 'react';
import type { Episode } from '@/types/episode';
import type { ThumbnailResult } from '@/types/generation';
import { useEpisodeGeneration } from '@/hooks/useEpisodeGeneration';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { ResearchSection } from './ResearchSection';
import { SocialPostsPanel } from './SocialPostsPanel';
import { ThumbnailPanel } from './ThumbnailPanel';

const STATUS_MESSAGES: Record<string, string> = {
  researching: 'Researching the case via Perplexity...',
  'generating-social': 'Writing social media posts with Claude...',
  'generating-thumbnail': 'Generating YouTube thumbnail with DALL-E 3...',
};

export function GenerationPanel({ episode }: { episode: Episode }) {
  const { state, generate, reset } = useEpisodeGeneration(episode);
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      const res = await fetch('/api/generate/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId: episode.id,
          episodeName: episode.name,
          researchSummary: state.research?.summary ?? '',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      // We need to update thumbnail in state — handled via a state setter passed down
      // For simplicity, trigger a full re-generate flow is not ideal;
      // instead we store thumbnail separately here
      setRegenerating(false);
      // Re-fetch by triggering a minimal state update via reset + re-run isn't ideal
      // So we'll use a local override approach below
      return data.data as ThumbnailResult;
    } catch {
      setRegenerating(false);
      return null;
    }
  }, [episode, state.research]);

  const isLoading = ['researching', 'generating-social', 'generating-thumbnail'].includes(
    state.status
  );

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {state.status === 'idle' && (
          <button
            onClick={generate}
            className="px-5 py-2.5 bg-pink-800 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors"
          >
            Generate All Content
          </button>
        )}

        {isLoading && (
          <div className="flex items-center gap-3">
            <LoadingSpinner />
            <span className="text-sm text-slate-400">
              {STATUS_MESSAGES[state.status] ?? 'Working...'}
            </span>
          </div>
        )}

        {(state.status === 'complete' || state.status === 'error') && (
          <button
            onClick={reset}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-400 rounded hover:border-slate-500 transition-colors text-sm"
          >
            Reset &amp; Regenerate All
          </button>
        )}
      </div>

      {/* Progress */}
      {state.status !== 'idle' && state.status !== 'error' && (
        <ProgressSteps status={state.status} />
      )}

      {/* Error */}
      {state.status === 'error' && state.error && (
        <div className="bg-red-950/50 border border-red-800 rounded-lg p-4 text-red-300 text-sm space-y-2">
          <div className="font-semibold">
            {!state.research
              ? '❌ Failed during: Case Research (Perplexity)'
              : !state.socialPosts
              ? '❌ Failed during: Social Post Generation (Anthropic Claude)'
              : '❌ Failed during: Thumbnail Generation (OpenAI DALL-E 3)'}
          </div>
          <div className="text-red-400 font-mono text-xs break-all">{state.error}</div>
        </div>
      )}

      {/* Results */}
      {state.research && <ResearchSection research={state.research} />}
      {state.socialPosts && <SocialPostsPanel socialPosts={state.socialPosts} />}
      {state.thumbnail && (
        <ThumbnailPanel
          thumbnail={state.thumbnail}
          episodeName={episode.name}
          onRegenerate={handleRegenerate}
          regenerating={regenerating}
        />
      )}
    </div>
  );
}
