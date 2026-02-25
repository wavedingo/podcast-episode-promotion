import OpenAI from 'openai';
import type { ThumbnailRequest } from '@/types/api';
import type { ThumbnailResult } from '@/types/generation';

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function buildThumbnailPrompt(episodeName: string, researchSummary: string): string {
  // Extract a brief subject description from research (first 200 chars)
  const subject = researchSummary.slice(0, 200).replace(/\n/g, ' ');

  return `YouTube thumbnail for a true crime podcast episode called "${episodeName}".
Dark, cinematic atmosphere. Brand color palette: dominant deep charcoal gray (rgb(51,53,51))
and near-black (rgb(27,28,27)). Pink and magenta tones (rgb(255,141,249), rgb(255,84,240),
rgb(240,32,203)) used sparingly — only as subtle lighting glows, edge highlights, or distant
accents. Deep purple (rgb(130,49,132)) for mid-ground shadows or atmospheric haze.
Case context: ${subject}
Leave clear space at the bottom third for text overlay. Style: true crime documentary.
No human faces. No gore. High contrast, dramatic atmospheric lighting. 16:9 cinematic quality.
Professional podcast thumbnail aesthetic.`;
}

export async function generateThumbnail(params: ThumbnailRequest): Promise<ThumbnailResult> {
  const prompt = buildThumbnailPrompt(params.episodeName, params.researchSummary);

  const response = await getClient().images.generate({
    model: 'gpt-image-1',
    prompt,
    n: 1,
    size: '1536x1024',
    quality: 'high',
  });

  const image = response.data?.[0];
  if (!image) throw new Error('No image returned from gpt-image-1');

  return {
    episodeId: params.episodeId,
    b64Json: image.b64_json ?? '',
    prompt,
    revisedPrompt: image.revised_prompt,
    generatedAt: new Date().toISOString(),
  };
}
