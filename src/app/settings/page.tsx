'use client';

import { useState, useEffect, useRef, useCallback, useDeferredValue } from 'react';
import { usePromptSettings } from '@/hooks/usePromptSettings';
import { useHostImages, MAX_HOST_IMAGES, IDEAL_HOST_IMAGES_MIN, IDEAL_HOST_IMAGES_MAX } from '@/hooks/useHostImages';
import { DEFAULT_PROMPT_LAYERS, type PromptLayers } from '@/lib/promptDefaults';

function assemblePreview(layers: PromptLayers): string {
  return [
    `A compelling, cinematic background image for a true crime podcast aimed at women. Episode: "[Episode Name]".`,
    layers.styleMood,
    `Case context: [from Perplexity research — first 200 chars of summary]`,
    layers.contentRules,
    `[Faces clause — depends on whether reference images are provided]`,
    `No gore. 16:9 cinematic quality. Professional podcast background aesthetic.`,
    `[Episode-specific emphasis and exclusions from the episode page, if set]`,
  ].join('\n');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CountBadge({ count }: { count: number }) {
  const isNone = count === 0;
  const isLow = count > 0 && count < IDEAL_HOST_IMAGES_MIN;
  const isGood = count >= IDEAL_HOST_IMAGES_MIN && count <= IDEAL_HOST_IMAGES_MAX;

  const colorClass = isNone
    ? 'bg-slate-800 text-slate-500 border-slate-700'
    : isLow
    ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50'
    : isGood
    ? 'bg-green-900/30 text-green-400 border-green-800/50'
    : 'bg-blue-900/30 text-blue-400 border-blue-800/50';

  const label = isNone
    ? 'No images saved'
    : isLow
    ? 'Add more for better fidelity'
    : isGood
    ? 'Good range'
    : 'Near maximum';

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs px-2 py-0.5 rounded border font-mono ${colorClass}`}>
        {count} / {MAX_HOST_IMAGES}
      </span>
      <span className="text-xs text-slate-600">{label}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { layers, save, reset, isDirty } = usePromptSettings();
  const [draft, setDraft] = useState<PromptLayers>(layers);
  const [saved, setSaved] = useState(false);

  const { images, loaded, addImages, removeImage, clearAll } = useHostImages();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  // Sync draft when hook loads from localStorage
  useEffect(() => {
    setDraft(layers);
  }, [layers]);

  function handleSave() {
    save(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    reset();
    setDraft(DEFAULT_PROMPT_LAYERS);
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addImages(e.dataTransfer.files);
    },
    [addImages]
  );

  const hasChanges =
    draft.styleMood !== layers.styleMood || draft.contentRules !== layers.contentRules;

  return (
    <div className="max-w-3xl space-y-10">

      {/* ── Host Reference Images ─────────────────────────────────────── */}
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Host Reference Images</h1>
          <p className="mt-1 text-sm text-slate-500">
            Photos of the podcast hosts used as reference when generating thumbnails — the model
            uses these to incorporate the hosts&apos; likenesses into each scene. Upload{' '}
            <span className="text-slate-400 font-medium">
              {IDEAL_HOST_IMAGES_MIN}–{IDEAL_HOST_IMAGES_MAX} clear, front-facing portraits
            </span>{' '}
            per host. Variety in lighting and angle improves fidelity. Images are saved in your
            browser.
          </p>
        </div>

        {/* Upload controls */}
        <div className="flex items-center justify-between gap-3">
          <CountBadge count={images.length} />
          <div className="flex items-center gap-2">
            {images.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs px-2.5 py-1 rounded border border-slate-800 text-slate-600 hover:border-slate-600 hover:text-slate-400 transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= MAX_HOST_IMAGES}
              className="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-300 hover:border-pink-700 hover:text-pink-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              + Add photos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                addImages(e.target.files ?? []);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {/* Drop zone (shown when no images) */}
        {loaded && images.length === 0 && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors select-none ${
              dragging
                ? 'border-pink-600 bg-pink-950/20'
                : 'border-slate-700 hover:border-slate-600 bg-slate-900/30'
            }`}
          >
            <p className="text-sm text-slate-500">
              Drop photos here or{' '}
              <span className="text-slate-400 underline underline-offset-2">click to browse</span>
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {IDEAL_HOST_IMAGES_MIN}–{IDEAL_HOST_IMAGES_MAX} portraits recommended · PNG, JPEG, or
              WebP · max {MAX_HOST_IMAGES} images
            </p>
          </div>
        )}

        {/* Image grid */}
        {images.length > 0 && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`rounded-lg border p-3 transition-colors ${
              dragging ? 'border-pink-700 bg-pink-950/10' : 'border-slate-800 bg-slate-900/30'
            }`}
          >
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="group relative rounded overflow-hidden border border-slate-700 bg-slate-900 aspect-square"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    title={`${img.name}\n${img.width}×${img.height} · ${formatBytes(img.sizeBytes)}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Hover overlay with remove button */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="text-white hover:text-pink-400 transition-colors text-xl leading-none font-light"
                      title={`Remove ${img.name}`}
                    >
                      ×
                    </button>
                  </div>
                  {/* Name tooltip strip */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-xs text-slate-300 truncate leading-tight">{img.name}</p>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {formatBytes(img.sizeBytes)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Add more tile (shown when under max) */}
              {images.length < MAX_HOST_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded border-2 border-dashed border-slate-700 hover:border-pink-700 text-slate-700 hover:text-pink-600 transition-colors flex items-center justify-center text-2xl font-light"
                  title="Add more photos"
                >
                  +
                </button>
              )}
            </div>

            {dragging && (
              <p className="mt-2 text-center text-xs text-pink-400">Drop to add</p>
            )}
          </div>
        )}
      </div>

      <hr className="border-slate-800" />

      {/* ── Prompt Settings ───────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Prompt Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          These are the base layers sent to the image model for every episode thumbnail. Edit them
          to experiment with style — changes are saved in your browser and applied to all future
          generations.
        </p>
        {isDirty && (
          <p className="mt-1.5 text-xs text-pink-400">
            Custom settings active — defaults have been overridden.
          </p>
        )}
      </div>

      <div className="space-y-6">
        {/* Layer 1 — always shown as read-only, not editable */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Base Framing
            </span>
            <span className="text-xs text-slate-700">— fixed, not editable</span>
          </div>
          <div className="rounded bg-slate-900 border border-slate-800 px-3 py-2.5 text-sm text-slate-600 font-mono leading-relaxed">
            A compelling, cinematic background image for a true crime podcast aimed at women.
            Episode: &quot;[Episode Name]&quot;.
          </div>
        </div>

        {/* Layer 2 — Style & Mood */}
        <div className="space-y-1.5">
          <label
            htmlFor="style-mood"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Style &amp; Mood
          </label>
          <textarea
            id="style-mood"
            rows={6}
            value={draft.styleMood}
            onChange={(e) => setDraft((d) => ({ ...d, styleMood: e.target.value }))}
            className="w-full resize-y rounded bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm text-slate-200 font-mono leading-relaxed placeholder:text-slate-600 focus:border-pink-700 focus:outline-none transition-colors"
          />
        </div>

        {/* Case context — dynamic, shown as read-only placeholder */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Case Context
            </span>
            <span className="text-xs text-slate-700">— dynamic, from Perplexity research</span>
          </div>
          <div className="rounded bg-slate-900 border border-slate-800 px-3 py-2.5 text-sm text-slate-600 font-mono leading-relaxed">
            Case context: [first 200 chars of research summary]
          </div>
        </div>

        {/* Layer 3 — Content Rules */}
        <div className="space-y-1.5">
          <label
            htmlFor="content-rules"
            className="text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Content Rules
          </label>
          <textarea
            id="content-rules"
            rows={6}
            value={draft.contentRules}
            onChange={(e) => setDraft((d) => ({ ...d, contentRules: e.target.value }))}
            className="w-full resize-y rounded bg-slate-900 border border-slate-700 px-3 py-2.5 text-sm text-slate-200 font-mono leading-relaxed placeholder:text-slate-600 focus:border-pink-700 focus:outline-none transition-colors"
          />
        </div>

        {/* Remaining fixed clauses */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Faces &amp; Quality Clause
            </span>
            <span className="text-xs text-slate-700">— conditional, not editable</span>
          </div>
          <div className="rounded bg-slate-900 border border-slate-800 px-3 py-2.5 text-sm text-slate-600 font-mono leading-relaxed space-y-1">
            <div>
              <span className="text-slate-700">If episode images:</span> The person(s) shown in the
              episode reference images are central to this episode — feature them prominently…
            </div>
            <div>
              <span className="text-slate-700">If host images only:</span> The podcast hosts shown
              in the reference images may appear naturally within the scene…
            </div>
            <div>
              <span className="text-slate-700">If no images:</span> (no faces restriction)
            </div>
            <div className="pt-1 border-t border-slate-800">
              No gore. 16:9 cinematic quality. Professional podcast background aesthetic.
            </div>
          </div>
        </div>

        {/* Episode overrides — shown as read-only placeholder */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Episode Overrides
            </span>
            <span className="text-xs text-slate-700">— set per-episode on the episode page</span>
          </div>
          <div className="rounded bg-slate-900 border border-slate-800 px-3 py-2.5 text-sm text-slate-600 font-mono leading-relaxed">
            Episode-specific emphasis: [Emphasize field]
            <br />
            Explicitly exclude and do not depict: [Suppress field]
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="px-4 py-2 bg-pink-800 hover:bg-pink-700 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded font-medium transition-colors text-sm"
        >
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300 rounded transition-colors text-sm"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Full assembled preview */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Full Prompt Preview
        </p>
        <pre className="whitespace-pre-wrap rounded bg-slate-900 border border-slate-800 px-4 py-3 text-xs text-slate-500 font-mono leading-relaxed">
          {assemblePreview(draft)}
        </pre>
      </div>
    </div>
  );
}
