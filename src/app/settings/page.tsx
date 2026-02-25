'use client';

import { useState, useEffect } from 'react';
import { usePromptSettings } from '@/hooks/usePromptSettings';
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

export default function SettingsPage() {
  const { layers, save, reset, isDirty } = usePromptSettings();
  const [draft, setDraft] = useState<PromptLayers>(layers);
  const [saved, setSaved] = useState(false);

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

  const hasChanges =
    draft.styleMood !== layers.styleMood || draft.contentRules !== layers.contentRules;

  return (
    <div className="max-w-3xl space-y-10">
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
