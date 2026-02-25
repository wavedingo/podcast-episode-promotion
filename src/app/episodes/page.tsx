import { EpisodeList } from '@/components/episodes/EpisodeList';
import { mondayQuery } from '@/lib/monday/client';
import { FETCH_BOARD_ITEMS } from '@/lib/monday/queries';
import { transformMondayItem } from '@/lib/monday/transformers';
import type { MondayItem } from '@/types/episode';

interface BoardItemsResponse {
  boards: Array<{
    items_page: {
      items: MondayItem[];
    };
  }>;
}

async function getEpisodes() {
  const boardId = process.env.MONDAY_BOARD_ID;
  if (!boardId) return [];

  const data = await mondayQuery<BoardItemsResponse>(FETCH_BOARD_ITEMS, { boardId });
  return (data.boards[0]?.items_page?.items ?? [])
    .map(transformMondayItem)
    .filter((e) => e.status !== 'published')
    .sort((a, b) => {
      if (a.episodeNumber === null) return 1;
      if (b.episodeNumber === null) return -1;
      return a.episodeNumber - b.episodeNumber;
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
