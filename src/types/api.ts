import type { SocialPlatform } from './generation';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface ResearchRequest {
  episodeId: string;
  episodeName: string;
  teaserCopy: string | null;
  scriptText?: string | null;
}

export interface SocialGenerationRequest {
  episodeId: string;
  episodeName: string;
  teaserCopy: string | null;
  researchSummary: string;
  platforms: SocialPlatform[];
}

export interface ThumbnailRequest {
  episodeId: string;
  episodeName: string;
  researchSummary: string;
}
