import Anthropic from '@anthropic-ai/sdk';
import type { SocialGenerationRequest } from '@/types/api';
import type { SocialPostSet, SocialPlatform, SocialPost } from '@/types/generation';

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const SYSTEM_PROMPT = `You are a social media strategist for "Women & Crime," a true crime podcast
hosted by two female criminologists. The show focuses on crimes and topics important to women.
Tone: serious, empathetic, compelling — never sensationalized or exploitative.
Target audience: women aged 25–50 who are true crime enthusiasts.
Always respond with valid JSON only — no markdown, no explanation, just the JSON object.`;

function buildSocialPrompt(params: SocialGenerationRequest): string {
  return `Generate 4 social media posts for each platform to promote a "Women & Crime" podcast episode.

Episode: "${params.episodeName}"
${params.teaserCopy ? `Teaser: "${params.teaserCopy}"` : ''}

Research context:
${params.researchSummary}

Return a JSON object with exactly this structure:
{
  "instagram": ["post1", "post2", "post3", "post4"],
  "facebook": ["post1", "post2", "post3", "post4"],
  "twitter": ["post1", "post2", "post3", "post4"],
  "tiktok": ["post1", "post2", "post3", "post4"]
}

Platform rules:
- instagram: 150-300 characters of caption text, then a blank line, then 10-15 relevant hashtags starting with #WomenAndCrime
- facebook: 200-500 characters, end with an engagement question to drive comments
- twitter: max 275 characters total, punchy and intriguing, 1-2 hashtags max
- tiktok: hook-style opener ("POV:", "Wait until you hear...", "The case that..."), 100-200 characters

Each post must be unique with a different angle or hook. Never use clickbait or sensationalism.${
    params.positivePrompt?.trim()
      ? `\n\nEpisode-specific emphasis: ${params.positivePrompt.trim()}`
      : ''
  }${
    params.negativePrompt?.trim()
      ? `\n\nExplicitly avoid referencing or highlighting: ${params.negativePrompt.trim()}`
      : ''
  }`;
}

type RawPlatformMap = Record<string, string[]>;

function parsePosts(episodeId: string, raw: RawPlatformMap): SocialPostSet {
  const platforms: SocialPlatform[] = ['instagram', 'facebook', 'twitter', 'tiktok'];
  const posts = {} as Record<SocialPlatform, SocialPost[]>;

  for (const platform of platforms) {
    const rawPosts = raw[platform] ?? [];
    posts[platform] = rawPosts.map((content: string) => ({
      platform,
      content,
      charCount: content.length,
    }));
  }

  return {
    episodeId,
    posts,
    generatedAt: new Date().toISOString(),
  };
}

function extractJson(text: string): string {
  // Strip markdown code fences if present
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match ? match[1] : text.trim();
}

export async function generateSocialPosts(
  params: SocialGenerationRequest
): Promise<SocialPostSet> {
  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildSocialPrompt(params) }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '{}';
  const jsonString = extractJson(rawText);
  const parsed: RawPlatformMap = JSON.parse(jsonString);

  return parsePosts(params.episodeId, parsed);
}
