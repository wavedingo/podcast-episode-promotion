export interface MondayColumnValue {
  id: string;
  type: string;
  value: string | null;
  text: string | null;
}

export interface MondayAsset {
  id: string;
  name: string;
  url: string;
  file_extension: string;
  file_size: number;
  created_at: string;
}

export interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
  assets: MondayAsset[];
}

export interface Episode {
  id: string;
  name: string;
  episodeNumber: number | null;
  publishDate: string | null;
  teaserCopy: string | null;
  scriptAsset: MondayAsset | null;
  status: 'upcoming' | 'archived' | 'excluded';
  rawStatus: string;
}
