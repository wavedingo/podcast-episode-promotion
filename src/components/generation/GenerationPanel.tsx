'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Episode } from '@/types/episode';
import type { ThumbnailResult, GenerationStatus } from '@/types/generation';
import { useEpisodeGeneration } from '@/hooks/useEpisodeGeneration';
import { usePromptSettings } from '@/hooks/usePromptSettings';
import { useHostImages } from '@/hooks/useHostImages';
import { getCache, saveCache } from '@/hooks/useGenerationCache';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { ResearchSection } from './ResearchSection';
import { SocialPostsPanel } from './SocialPostsPanel';
import { ThumbnailPanel } from './ThumbnailPanel';

const STATUS_MESSAGES: Record<string, string> = {
  researching: 'Researching the case via Perplexity...',
  'generating-social': 'Writing social media posts with Claude...',
  'generating-thumbnail': 'Generating YouTube thumbnail with gpt-image-1...',
};

interface RefImage {
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  size: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readImageFile(file: File): Promise<RefImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () =>
        resolve({ name: file.name, dataUrl, width: img.naturalWidth, height: img.naturalHeight, size: file.size });
      img.onerror = reject;
      img.src = dataUrl;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function GenerationPanel({ episode }: { episode: Episode }) {
  const { state, generate, reset } = useEpisodeGeneration(episode);
  const { layers: promptLayers } = usePromptSettings();
  const { dataUrls: hostImageDataUrls } = useHostImages();

  const [thumbnails, setThumbnails] = useState<ThumbnailResult[]>([]);

  // Seed thumbnails from cache after mount. Lazy useState initializers don't work here
  // because getCache returns null during SSR, and React reuses that empty state on hydration.
  useEffect(() => {
    const cached = getCache(episode.id);
    if (cached?.thumbnails.length) setThumbnails(cached.thumbnails);
  }, [episode.id]);

  const [regenerating, setRegenerating] = useState(false);
  const [positivePrompt, setPositivePrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [refImages, setRefImages] = useState<RefImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track status transitions to distinguish a real new generation from a cache restore.
  // Cache restore goes idle → complete without passing through generating-thumbnail,
  // so neither branch fires and the cache-seeded thumbnails stay intact.
  const prevStatusRef = useRef<GenerationStatus>(state.status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = state.status;

    if (prev === 'generating-thumbnail' && state.status === 'complete' && state.thumbnail) {
      // Fresh initial generation just finished — seed with the first version.
      setThumbnails([state.thumbnail]);
    } else if (state.status === 'idle' && prev !== 'idle') {
      // Reset was called — clear the list.
      setThumbnails([]);
    }
  }, [state.status, state.thumbnail]);

  // Persist to cache whenever meaningful data changes (after completion or regeneration).
  useEffect(() => {
    if (!state.research) return;
    if (['researching', 'generating-social', 'generating-thumbnail'].includes(state.status)) return;

    saveCache({
      episodeId: episode.id,
      research: state.research,
      socialPosts: state.socialPosts,
      thumbnails,
    });
  }, [episode.id, state.research, state.socialPosts, state.status, thumbnails]);

  const handleImageFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const incoming = await Promise.all(Array.from(files).map(readImageFile));
    setRefImages((prev) => [...prev, ...incoming]);
  }, []);

  const removeRefImage = useCallback((index: number) => {
    setRefImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const refImageDataUrls = refImages.map((r) => r.dataUrl);

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
          positivePrompt: positivePrompt || undefined,
          negativePrompt: negativePrompt || undefined,
          episodeReferenceImages: refImageDataUrls.length ? refImageDataUrls : undefined,
          hostReferenceImages: hostImageDataUrls.length ? hostImageDataUrls : undefined,
          promptLayers,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setThumbnails((prev) => [...prev, data.data as ThumbnailResult]);
      setRegenerating(false);
    } catch {
      setRegenerating(false);
    }
  }, [episode, state.research, positivePrompt, negativePrompt, refImageDataUrls, hostImageDataUrls, promptLayers]);

  const isLoading = ['researching', 'generating-social', 'generating-thumbnail'].includes(
    state.status
  );

  return (
    <div className="space-y-8">
      {/* Image generation guidance */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Image Generation Guidance
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-slate-400" htmlFor="positive-prompt">
              Emphasize
            </label>
            <textarea
              id="positive-prompt"
              rows={2}
              value={positivePrompt}
              onChange={(e) => setPositivePrompt(e.target.value)}
              placeholder="e.g. an ominous syringe, a hospital corridor"
              className="w-full resize-none rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-pink-700 focus:outline-none transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400" htmlFor="negative-prompt">
              Suppress / Avoid
            </label>
            <textarea
              id="negative-prompt"
              rows={2}
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="e.g. any racial or religious imagery"
              className="w-full resize-none rounded bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-pink-700 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Per-episode reference images */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400">
              Episode Reference Images
              <span className="ml-1.5 text-slate-600">(overrides global folder for this episode)</span>
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs px-2.5 py-1 rounded border border-slate-700 text-slate-400 hover:border-pink-700 hover:text-pink-400 transition-colors"
            >
              + Add images
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleImageFiles(e.target.files)}
            />
          </div>

          {refImages.length > 0 && (
            <div className="space-y-1.5">
              {refImages.map((img, i) => (
                <div key={i} className="flex items-center gap-3 rounded bg-slate-800/60 border border-slate-700 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    className="w-16 h-16 object-cover rounded shrink-0 border border-slate-700"
                  />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm text-slate-200 truncate" title={img.name}>{img.name}</p>
                    <p className="text-xs text-slate-500">{img.width} × {img.height} px</p>
                    <p className="text-xs text-slate-600">{formatBytes(img.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRefImage(i)}
                    className="shrink-0 text-slate-500 hover:text-pink-400 transition-colors text-lg leading-none px-1"
                    title={`Remove ${img.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {refImages.length === 0 && (
            <p className="text-xs text-slate-600">
              No episode-specific images.{' '}
              {hostImageDataUrls.length > 0
                ? `Host reference images from Settings (${hostImageDataUrls.length}) will be used.`
                : 'Add host photos in Settings to include likenesses in thumbnails.'}
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {state.status === 'idle' && (
          <button
            onClick={() => generate(
              positivePrompt || undefined,
              negativePrompt || undefined,
              refImageDataUrls.length ? refImageDataUrls : undefined,
              promptLayers,
              hostImageDataUrls.length ? hostImageDataUrls : undefined,
            )}
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
              : '❌ Failed during: Thumbnail Generation (OpenAI gpt-image-1)'}
          </div>
          <div className="text-red-400 font-mono text-xs break-all">{state.error}</div>
        </div>
      )}

      {/* Results */}
      {state.research && <ResearchSection research={state.research} />}
      {state.socialPosts && <SocialPostsPanel socialPosts={state.socialPosts} episode={episode} />}
      {thumbnails.map((thumb, i) => (
        <div key={thumb.generatedAt} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            {i === 0 ? 'Thumbnail — Version 1 (original)' : `Thumbnail — Version ${i + 1}`}
          </p>
          <ThumbnailPanel
            thumbnail={thumb}
            episodeName={episode.name}
            onRegenerate={i === thumbnails.length - 1 ? handleRegenerate : undefined}
            regenerating={i === thumbnails.length - 1 ? regenerating : false}
          />
        </div>
      ))}
    </div>
  );
}
