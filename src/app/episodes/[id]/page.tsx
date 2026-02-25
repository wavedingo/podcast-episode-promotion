import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GenerationPanel } from '@/components/generation/GenerationPanel';
import { mondayQuery } from '@/lib/monday/client';
import { FETCH_ITEM_BY_ID } from '@/lib/monday/queries';
import { transformMondayItem } from '@/lib/monday/transformers';
import type { MondayItem } from '@/types/episode';

interface ItemResponse {
  items: MondayItem[];
}

async function getEpisode(id: string) {
  const data = await mondayQuery<ItemResponse>(FETCH_ITEM_BY_ID, { itemId: id });
  const item = data.items[0];
  return item ? transformMondayItem(item) : null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No date set';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const episode = await getEpisode(id);

  if (!episode) notFound();

  return (
    <div className="space-y-8">
      <Link
        href="/episodes"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        ← Back to Episodes
      </Link>

      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded border border-purple-700 bg-purple-900/40 text-purple-300 uppercase tracking-wide">
            {episode.status}
          </span>
          <span className="text-sm text-slate-500">{formatDate(episode.publishDate)}</span>
          {episode.scriptAsset && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              📄 Script attached
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold text-slate-100">{episode.name}</h1>

        {episode.teaserCopy && (
          <p className="text-slate-400 max-w-2xl leading-relaxed">{episode.teaserCopy}</p>
        )}
      </div>

      <hr className="border-slate-800" />

      <GenerationPanel episode={episode} />
    </div>
  );
}
