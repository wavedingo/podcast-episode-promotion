export interface ResearchResult {
  summary: string;
  keyFacts: string[];
  citations: string[];
  searchedAt: string;
}

export type SocialPlatform = 'instagram' | 'facebook' | 'twitter' | 'tiktok';

export interface SocialPost {
  platform: SocialPlatform;
  content: string;
  charCount: number;
}

export interface SocialPostSet {
  episodeId: string;
  posts: Record<SocialPlatform, SocialPost[]>;
  generatedAt: string;
}

export interface ThumbnailResult {
  episodeId: string;
  b64Json: string;
  prompt: string;
  revisedPrompt?: string;
  generatedAt: string;
}

export type GenerationStatus =
  | 'idle'
  | 'researching'
  | 'generating-social'
  | 'generating-thumbnail'
  | 'complete'
  | 'error';

export interface EpisodeGenerationState {
  episodeId: string;
  research: ResearchResult | null;
  socialPosts: SocialPostSet | null;
  thumbnail: ThumbnailResult | null;
  status: GenerationStatus;
  error: string | null;
}
