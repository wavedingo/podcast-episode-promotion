import type { Episode } from '@/types/episode';
import { EpisodeCard } from './EpisodeCard';

export function EpisodeList({ episodes }: { episodes: Episode[] }) {
  if (episodes.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p className="text-lg">No upcoming episodes found on your Monday.com board.</p>
        <p className="text-sm mt-2">Make sure your board ID and column mappings are configured correctly.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {episodes.map((episode) => (
        <EpisodeCard key={episode.id} episode={episode} />
      ))}
    </div>
  );
}
