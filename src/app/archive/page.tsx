import { EpisodeList } from '@/components/episodes/EpisodeList';
import { getAllBoardItems } from '@/lib/monday/client';
import { transformMondayItem } from '@/lib/monday/transformers';

async function getArchivedEpisodes() {
  const boardId = process.env.MONDAY_BOARD_ID;
  if (!boardId) return [];

  const items = await getAllBoardItems(boardId);
  return items
    .map(transformMondayItem)
    .filter((e) => e.status === 'archived')
    .sort((a, b) => {
      if (!a.publishDate && !b.publishDate) return 0;
      if (!a.publishDate) return 1;
      if (!b.publishDate) return -1;
      return b.publishDate.localeCompare(a.publishDate); // newest first for archive
    });
}

export default async function ArchivePage() {
  const episodes = await getArchivedEpisodes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Archive</h1>
        <p className="text-slate-500 text-sm mt-1">
          Published and live episodes — {episodes.length} episode{episodes.length !== 1 ? 's' : ''}
        </p>
      </div>

      <EpisodeList episodes={episodes} />
    </div>
  );
}
