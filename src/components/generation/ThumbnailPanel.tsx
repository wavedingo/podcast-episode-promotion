'use client';

import type { ThumbnailResult } from '@/types/generation';

function downloadThumbnail(b64Json: string, episodeName: string) {
  const byteChars = atob(b64Json);
  const byteNums = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNums[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNums);
  const blob = new Blob([byteArray], { type: 'image/png' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `thumbnail-${episodeName.replace(/\s+/g, '-').toLowerCase()}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ThumbnailPanel({
  thumbnail,
  episodeName,
  onRegenerate,
  regenerating,
}: {
  thumbnail: ThumbnailResult;
  episodeName: string;
  onRegenerate?: () => void;
  regenerating?: boolean;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
        YouTube Thumbnail
      </h3>

      <div className="relative rounded-lg overflow-hidden border border-slate-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${thumbnail.b64Json}`}
          alt={`Thumbnail for ${episodeName}`}
          className="w-full"
        />
      </div>

      {thumbnail.revisedPrompt && (
        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer hover:text-slate-400 transition-colors">
            View revised prompt
          </summary>
          <p className="mt-2 text-slate-500 leading-relaxed">{thumbnail.revisedPrompt}</p>
        </details>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => downloadThumbnail(thumbnail.b64Json, episodeName)}
          className="px-4 py-2 bg-pink-900/40 border border-pink-800 text-pink-300 rounded text-sm hover:bg-pink-900/60 transition-colors"
        >
          Download PNG
        </button>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-400 rounded text-sm hover:border-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
        )}
      </div>
    </div>
  );
}
