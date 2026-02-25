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
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 hover:border-pink-800 hover:bg-slate-750 transition-all cursor-pointer group">
        <div className="flex items-start justify-between gap-2 mb-3">
          {statusBadge(episode.status)}
          <span className="text-xs text-slate-500">{formatDate(episode.publishDate)}</span>
        </div>

        <h2 className="text-lg font-semibold text-slate-100 mb-2 group-hover:text-pink-300 transition-colors">
          {episode.name}
        </h2>

        {episode.teaserCopy && (
          <p className="text-sm text-slate-400 line-clamp-2">{episode.teaserCopy}</p>
        )}

        {episode.scriptAsset && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <span>📄</span>
            <span>Script attached</span>
          </div>
        )}

        <div className="mt-4 text-xs text-pink-500 group-hover:text-pink-400 transition-colors">
          Generate promotion content →
        </div>
      </div>
    </Link>
  );
}
