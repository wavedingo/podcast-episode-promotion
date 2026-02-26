import type { MondayItem, MondayAsset, Episode } from '@/types/episode';

function getColumnMapping() {
  return {
    episodeNumber: process.env.MONDAY_COLUMN_EPISODE_NUMBER ?? '',
    publishDate: process.env.MONDAY_COLUMN_PUBLISH_DATE ?? '',
    teaserCopy: process.env.MONDAY_COLUMN_TEASER_COPY ?? '',
    status: process.env.MONDAY_COLUMN_STATUS ?? '',
  };
}

const EXCLUDED_STATUSES = new Set(['', 'default', 'script draft', 'script review', 'research']);

function mapStatusLabel(label: string | null | undefined): Episode['status'] {
  if (!label) return 'excluded';
  const lower = label.toLowerCase().trim();
  if (EXCLUDED_STATUSES.has(lower)) return 'excluded';
  // archived: 'live', 'live paid', 'live free', etc.
  if (lower === 'live' || lower.startsWith('live ')) return 'archived';
  if (lower === 'ready to publish' || lower.includes('upcoming') || lower.includes('scheduled')) return 'upcoming';
  if (lower.includes('published') || lower.includes('done')) return 'published';
  return 'draft';
}

export function transformMondayItem(item: MondayItem): Episode {
  const colMap = getColumnMapping();

  const episodeNumberCol = item.column_values.find((c) => c.id === colMap.episodeNumber);
  const publishDateCol = item.column_values.find((c) => c.id === colMap.publishDate);
  const teaserCol = item.column_values.find((c) => c.id === colMap.teaserCopy);
  const statusCol = item.column_values.find((c) => c.id === colMap.status);

  let publishDate: string | null = null;
  if (publishDateCol?.value) {
    try {
      const parsed = JSON.parse(publishDateCol.value);
      publishDate = parsed.date ?? null;
    } catch {
      publishDate = publishDateCol.text ?? null;
    }
  }

  const scriptAsset: MondayAsset | null =
    item.assets.find((a) =>
      ['doc', 'docx'].includes(a.file_extension.toLowerCase())
    ) ?? null;

  const episodeNumber = episodeNumberCol?.text
    ? parseInt(episodeNumberCol.text, 10) || null
    : null;

  return {
    id: item.id,
    name: item.name,
    episodeNumber,
    publishDate,
    teaserCopy: teaserCol?.text ?? null,
    scriptAsset,
    status: mapStatusLabel(statusCol?.text),
  };
}
