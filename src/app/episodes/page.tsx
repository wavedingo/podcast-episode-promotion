import { EpisodeList } from '@/components/episodes/EpisodeList';
import { getAllBoardItems } from '@/lib/monday/client';
import { transformMondayItem } from '@/lib/monday/transformers';

export const revalidate = 60;

async function getEpisodes() {
  const boardId = process.env.MONDAY_BOARD_ID;
  if (!boardId) return [];

  const items = await getAllBoardItems(boardId);
  return items
    .map(transformMondayItem)
    .filter((e) => e.status === 'upcoming')
    .sort((a, b) => {
      if (!a.publishDate && !b.publishDate) return 0;
      if (!a.publishDate) return 1;
      if (!b.publishDate) return -1;
      return a.publishDate.localeCompare(b.publishDate);
    });
}

export default async function EpisodesPage() {
  const episodes = await getEpisodes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Upcoming Episodes</h1>
        <p className="text-slate-500 text-sm mt-1">
          {episodes.length} episode{episodes.length !== 1 ? 's' : ''} ready to promote
        </p>
      </div>

      <EpisodeList episodes={episodes} />
    </div>
  );
}
