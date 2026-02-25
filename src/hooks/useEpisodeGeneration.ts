'use client';

import { useState, useCallback } from 'react';
import type { EpisodeGenerationState } from '@/types/generation';
import type { Episode } from '@/types/episode';
import type { PromptLayers } from '@/lib/promptDefaults';

const INITIAL_STATE = (episodeId: string): EpisodeGenerationState => ({
  episodeId,
  research: null,
  socialPosts: null,
  thumbnail: null,
  status: 'idle',
  error: null,
});

export function useEpisodeGeneration(episode: Episode) {
  const [state, setState] = useState<EpisodeGenerationState>(
    INITIAL_STATE(episode.id)
  );

  const reset = useCallback(() => {
    setState(INITIAL_STATE(episode.id));
  }, [episode.id]);

  const generate = useCallback(async (positivePrompt?: string, negativePrompt?: string, episodeReferenceImages?: string[], promptLayers?: PromptLayers) => {
    setState((prev) => ({ ...prev, status: 'researching', error: null }));

    try {
      // Step 1: Optionally fetch script text
      let scriptText: string | null = null;
      if (episode.scriptAsset) {
        try {
          const scriptRes = await fetch(`/api/episodes/${episode.id}/script`);
          const scriptData = await scriptRes.json();
          if (scriptData.success) {
            scriptText = scriptData.data.text;
          }
        } catch {
          // Script parsing is optional — proceed without it
        }
      }

      // Step 2: Research the case
      const researchRes = await fetch('/api/generate/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId: episode.id,
          episodeName: episode.name,
          teaserCopy: episode.teaserCopy,
          scriptText,
        }),
      });

      const researchData = await researchRes.json();
      if (!researchData.success) throw new Error(researchData.error);

      const research = researchData.data;
      setState((prev) => ({ ...prev, research, status: 'generating-social' }));

      // Step 3: Generate social posts
      const socialRes = await fetch('/api/generate/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId: episode.id,
          episodeName: episode.name,
          teaserCopy: episode.teaserCopy,
          researchSummary: research.summary,
          platforms: ['instagram', 'facebook', 'twitter', 'tiktok'],
          positivePrompt,
          negativePrompt,
        }),
      });

      const socialData = await socialRes.json();
      if (!socialData.success) throw new Error(socialData.error);

      const socialPosts = socialData.data;
      setState((prev) => ({ ...prev, socialPosts, status: 'generating-thumbnail' }));

      // Step 4: Generate thumbnail
      const thumbRes = await fetch('/api/generate/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId: episode.id,
          episodeName: episode.name,
          researchSummary: research.summary,
          positivePrompt,
          negativePrompt,
          episodeReferenceImages,
          promptLayers,
        }),
      });

      const thumbData = await thumbRes.json();
      if (!thumbData.success) throw new Error(thumbData.error);

      setState((prev) => ({
        ...prev,
        thumbnail: thumbData.data,
        status: 'complete',
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      }));
    }
  }, [episode]);

  return { state, generate, reset };
}
