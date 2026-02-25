import type { MondayItem, MondayAsset, Episode } from '@/types/episode';

function getColumnMapping() {
  return {
    publishDate: process.env.MONDAY_COLUMN_PUBLISH_DATE ?? '',
    teaserCopy: process.env.MONDAY_COLUMN_TEASER_COPY ?? '',
    status: process.env.MONDAY_COLUMN_STATUS ?? '',
  };
}

function mapStatusLabel(label: string | null | undefined): Episode['status'] {
  if (!label) return 'draft';
  const lower = label.toLowerCase();
  if (lower.includes('upcoming') || lower.includes('scheduled')) return 'upcoming';
  if (lower.includes('published') || lower.includes('done') || lower.includes('live')) return 'published';
  return 'draft';
}

export function transformMondayItem(item: MondayItem): Episode {
  const colMap = getColumnMapping();

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

  return {
    id: item.id,
    name: item.name,
    publishDate,
    teaserCopy: teaserCol?.text ?? null,
    scriptAsset,
    status: mapStatusLabel(statusCol?.text),
  };
}
