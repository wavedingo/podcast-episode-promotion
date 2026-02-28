import fs from 'fs';
import path from 'path';
import OpenAI, { toFile, type Uploadable } from 'openai';
import type { ThumbnailRequest } from '@/types/api';
import { DEFAULT_PROMPT_LAYERS, type PromptLayers } from '@/lib/promptDefaults';

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

/** Load all images from the configured global reference folder. Returns [] if folder is absent. */
async function loadGlobalReferenceImages(): Promise<Uploadable[]> {
  const dir = process.env.REFERENCE_IMAGES_DIR;
  if (!dir) return [];

  const resolved = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(resolved)) return [];

  const files = fs.readdirSync(resolved).filter((f) =>
    IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase())
  );

  return Promise.all(
    files.map((f) => {
      const filePath = path.join(resolved, f);
      const ext = path.extname(f).toLowerCase();
      return toFile(fs.createReadStream(filePath), f, { type: MIME[ext] ?? 'image/png' });
    })
  );
}

/** Convert a base64 data URL to an Uploadable file for the OpenAI SDK. */
async function dataUrlToUploadable(
  dataUrl: string,
  index: number,
  prefix = 'episode-ref'
): Promise<Uploadable> {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+);base64/);
  const mime = mimeMatch?.[1] ?? 'image/png';
  const ext = mime.split('/')[1] ?? 'png';
  const buffer = Buffer.from(base64, 'base64');
  return toFile(buffer, `${prefix}-${index}.${ext}`, { type: mime });
}

function buildThumbnailPrompt(
  episodeName: string,
  researchSummary: string,
  hasEpisodeImages: boolean,
  hasHostImages: boolean,
  positivePrompt?: string,
  negativePrompt?: string,
  promptLayers?: PromptLayers
): string {
  const layers = { ...DEFAULT_PROMPT_LAYERS, ...promptLayers };

  // Extract a brief subject description from research (first 200 chars)
  const subject = researchSummary.slice(0, 200).replace(/\n/g, ' ');

  const lines = [
    `A compelling, cinematic background image for a true crime podcast aimed at women. Episode: "${episodeName}".`,
    layers.styleMood,
    `Case context: ${subject}`,
    layers.contentRules,
  ];

  if (hasEpisodeImages) {
    lines.push(
      `The person(s) shown in the episode reference images are central to this episode — feature them`,
      `prominently in the scene, rendered with cinematic lighting that fits the episode's tone.`,
      `No gore. 16:9 cinematic quality. Professional podcast background aesthetic.`
    );
  } else if (hasHostImages) {
    lines.push(
      `The podcast hosts shown in the reference images may appear naturally within the scene —`,
      `incorporate their likeness in a cinematic, atmospheric way that fits the episode's tone.`,
      `No gore. 16:9 cinematic quality. Professional podcast background aesthetic.`
    );
  } else {
    lines.push(`No gore. 16:9 cinematic quality. Professional podcast background aesthetic.`);
  }

  if (positivePrompt?.trim()) {
    lines.push(`Episode-specific emphasis: ${positivePrompt.trim()}`);
  }

  if (negativePrompt?.trim()) {
    lines.push(`Explicitly exclude and do not depict: ${negativePrompt.trim()}`);
  }

  return lines.join('\n');
}

export async function generateThumbnail(params: ThumbnailRequest): Promise<{ b64Json: string; prompt: string; revisedPrompt?: string }> {
  const client = getClient();

  // Gather reference images: episode-specific, then host (browser-saved) or filesystem fallback
  const MAX_REFERENCE_IMAGES = 16;
  const [hostImages, episodeImages] = await Promise.all([
    // Prefer host images uploaded via Settings; fall back to filesystem folder
    params.hostReferenceImages?.length
      ? Promise.all(
          params.hostReferenceImages.map((url, i) => dataUrlToUploadable(url, i, 'host-ref'))
        )
      : loadGlobalReferenceImages(),
    Promise.all(
      (params.episodeReferenceImages ?? []).map((url, i) => dataUrlToUploadable(url, i))
    ),
  ]);
  // Episode-specific images take priority; host images fill remaining slots up to the API limit of 16
  const combined = [
    ...episodeImages,
    ...hostImages.slice(0, Math.max(0, MAX_REFERENCE_IMAGES - episodeImages.length)),
  ];
  const allReferenceImages = combined.slice(0, MAX_REFERENCE_IMAGES);
  const hasReferenceImages = allReferenceImages.length > 0;

  const prompt = buildThumbnailPrompt(
    params.episodeName,
    params.researchSummary,
    episodeImages.length > 0,
    hostImages.length > 0,
    params.positivePrompt,
    params.negativePrompt,
    params.promptLayers
  );

  let b64Json: string;
  let revisedPrompt: string | undefined;

  if (hasReferenceImages) {
    // Use images.edit to incorporate reference images with high facial fidelity
    const response = await (client.images.edit as Function)({
      model: 'gpt-image-1',
      image: allReferenceImages,
      prompt,
      n: 1,
      size: '1536x1024',
    });
    const image = response.data?.[0];
    if (!image) throw new Error('No image returned from gpt-image-1 edit');
    b64Json = image.b64_json ?? '';
    revisedPrompt = image.revised_prompt;
  } else {
    // No reference images — standard generation
    const response = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1536x1024',
      quality: 'high',
    });
    const image = response.data?.[0];
    if (!image) throw new Error('No image returned from gpt-image-1');
    b64Json = image.b64_json ?? '';
    revisedPrompt = image.revised_prompt;
  }

  return { b64Json, prompt, revisedPrompt };
}
