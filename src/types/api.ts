import type { SocialPlatform } from './generation';
import type { PromptLayers } from '@/lib/promptDefaults';

export interface BufferPublishRequest {
  episodeId: string;
  /** Relative or absolute URL of the generated thumbnail; attached to Instagram & Facebook posts. */
  imageUrl?: string;
  posts: Array<{
    platform: SocialPlatform;
    text: string;
    scheduledAt: string; // ISO 8601 datetime
  }>;
}

export interface BufferPublishResult {
  sent: number;
  skipped: number; // platforms without a configured profile ID
  errors: string[];
}

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
  positivePrompt?: string;
  negativePrompt?: string;
}

export interface ThumbnailRequest {
  episodeId: string;
  episodeName: string;
  researchSummary: string;
  positivePrompt?: string;
  negativePrompt?: string;
  /** Base64 data URLs of per-episode reference images (e.g. guest photos) */
  episodeReferenceImages?: string[];
  /** Base64 data URLs of global host reference images (from settings page) */
  hostReferenceImages?: string[];
  /** Overrides for the base prompt layers (from settings page) */
  promptLayers?: PromptLayers;
}
