import Link from 'next/link';
import type { Episode } from '@/types/episode';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No date set';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadge(status: Episode['status']) {
  const classes: Record<Episode['status'], string> = {
    upcoming: 'bg-purple-900/50 text-purple-300 border-purple-700',
    draft: 'bg-slate-800 text-slate-400 border-slate-600',
    published: 'bg-green-900/50 text-green-300 border-green-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${classes[status]} uppercase tracking-wide`}>
      {status}
    </span>
  );
}

export function EpisodeCard({ episode }: { episode: Episode }) {
  return (
    <Link href={`/episodes/${episode.id}`}>
      <div className="flex items-center gap-5 bg-slate-800 border border-slate-700 rounded-lg px-5 py-4 hover:border-pink-800 transition-all cursor-pointer group">
        {/* Episode number */}
        <div className="w-12 shrink-0 text-center">
          {episode.episodeNumber !== null ? (
            <span className="text-2xl font-bold text-slate-500 group-hover:text-pink-400 transition-colors tabular-nums">
              {episode.episodeNumber}
            </span>
          ) : (
            <span className="text-lg font-bold text-slate-700">—</span>
          )}
        </div>

        {/* Divider */}
        <div className="w-px self-stretch bg-slate-700 shrink-0" />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {statusBadge(episode.status)}
            <span className="text-xs text-slate-500">{formatDate(episode.publishDate)}</span>
            {episode.scriptAsset && (
              <span className="text-xs text-slate-500">· Script attached</span>
            )}
          </div>
          <h2 className="text-base font-semibold text-slate-100 truncate group-hover:text-pink-300 transition-colors">
            {episode.name}
          </h2>
          {episode.teaserCopy && (
            <p className="text-sm text-slate-400 truncate mt-0.5">{episode.teaserCopy}</p>
          )}
        </div>

        {/* CTA arrow */}
        <div className="shrink-0 text-sm text-slate-600 group-hover:text-pink-400 transition-colors">
          →
        </div>
      </div>
    </Link>
  );
}
