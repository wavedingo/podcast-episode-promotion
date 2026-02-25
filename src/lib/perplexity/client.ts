import type { ResearchRequest } from '@/types/api';
import type { ResearchResult } from '@/types/generation';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

const SYSTEM_PROMPT = `You are a researcher for "Women & Crime," a true crime podcast hosted by
two female criminologists focused on crimes that matter to women. Provide factual, well-sourced
information about criminal cases. Be thorough but concise. Focus on victim impact, case significance,
and why this case is relevant to a female audience.`;

function buildUserPrompt(params: ResearchRequest): string {
  const contextLine = params.teaserCopy
    ? `\nEpisode teaser: "${params.teaserCopy}"`
    : '';

  const scriptContext = params.scriptText
    ? `\n\nEpisode script excerpt for context:\n${params.scriptText.slice(0, 3000)}\n\n---\n\n`
    : '';

  return `${scriptContext}Research the true crime case of "${params.episodeName}".${contextLine}

Provide:
1. A 2-3 paragraph factual summary of the case
2. Key facts (victim, perpetrator, crime type, verdict if known)
3. Why this case is notable or important, especially for women

Be factual and cite your sources. Do not sensationalize.`;
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  citations?: string[];
}

export async function researchCase(params: ResearchRequest): Promise<ResearchResult> {
  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(params) },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Perplexity API error ${response.status}: ${body}`);
  }

  const data: PerplexityResponse = await response.json();
  const content = data.choices[0]?.message?.content ?? '';
  const citations = data.citations ?? [];

  // Extract bullet-like key facts from numbered lists in the content
  const keyFacts: string[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.replace(/^[-•*\d.]+\s*/, '').trim();
    if (trimmed.length > 20 && trimmed.length < 200) {
      keyFacts.push(trimmed);
    }
    if (keyFacts.length >= 6) break;
  }

  return {
    summary: content,
    keyFacts,
    citations,
    searchedAt: new Date().toISOString(),
  };
}
