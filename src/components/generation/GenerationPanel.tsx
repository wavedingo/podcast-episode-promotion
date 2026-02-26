'use client';

import { useState, useCallback, useRef } from 'react';
import type { Episode } from '@/types/episode';
import type { ThumbnailResult } from '@/types/generation';
import { useEpisodeGeneration } from '@/hooks/useEpisodeGeneration';
import { usePromptSettings } from '@/hooks/usePromptSettings';
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
  const [regenerating, setRegenerating] = useState(false);
  const [positivePrompt, setPositivePrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [refImages, setRefImages] = useState<RefImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          promptLayers,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setRegenerating(false);
      return data.data as ThumbnailResult;
    } catch {
      setRegenerating(false);
      return null;
    }
  }, [episode, state.research, positivePrompt, negativePrompt, refImageDataUrls]);

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
              No episode-specific images. Global reference folder will be used if configured.
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
              promptLayers
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
