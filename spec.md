# Women & Crime — Episode Promoter: Spec

Internal tool for the **Women & Crime** true crime podcast. Automates episode promotion content across three outputs: case research, social media posts, and a YouTube/social background image. Built with Next.js (App Router), TypeScript, and Tailwind CSS.

---

## Overview

Episodes are managed in **Monday.com**. Opening an episode in this tool triggers a three-step AI pipeline:

1. **Research** — Perplexity searches the web for case facts, context, and citations
2. **Social Posts** — Claude writes 4 posts per platform (Instagram, Facebook, Twitter/X, TikTok)
3. **Background Image** — OpenAI `gpt-image-1` generates a cinematic 16:9 image

All three steps can run as a single "Generate All Content" flow, or the thumbnail can be regenerated independently.

---

## Setup

### Environment Variables

Copy `.env.example` to `.env.local` and fill in all values.

```env
# Monday.com
MONDAY_API_TOKEN=
MONDAY_BOARD_ID=

# Column ID mapping — run GET /api/debug/monday-schema to discover these
MONDAY_COLUMN_EPISODE_NUMBER=
MONDAY_COLUMN_PUBLISH_DATE=
MONDAY_COLUMN_TEASER_COPY=
MONDAY_COLUMN_STATUS=

# AI Services
PERPLEXITY_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# App config
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Optional: folder of reference images for thumbnail generation (PNG/JPG/WebP, max 50MB each)
REFERENCE_IMAGES_DIR=./reference-images
```

### Discovering Monday.com Column IDs

Hit `GET /api/debug/monday-schema` in a browser while the dev server is running. It returns all column IDs and types for your board.

### Running Locally

```bash
npm run dev
```

---

## Monday.com Board Requirements

The board must have the following columns configured (IDs mapped via env vars above):

| Column | Type | Env var |
|---|---|---|
| Episode Number | Numbers | `MONDAY_COLUMN_EPISODE_NUMBER` |
| Publish Date | Date | `MONDAY_COLUMN_PUBLISH_DATE` |
| Teaser Copy | Long Text | `MONDAY_COLUMN_TEASER_COPY` |
| Status | Status | `MONDAY_COLUMN_STATUS` |

**Status label mapping:**
- Labels containing `upcoming` or `scheduled` → `upcoming`
- Labels containing `published`, `done`, or `live` → `published`
- Anything else → `draft`

The episodes page shows all items that are **not** `published`, sorted ascending by episode number.

### Script Attachments

If a `.doc` or `.docx` file is attached to a Monday.com item, it is parsed and fed into the research step as additional context. Parsing is optional — the pipeline continues without it if parsing fails.

---

## Generation Pipeline

### Step 1 — Case Research (Perplexity)

**API route:** `POST /api/generate/research`

Uses Perplexity's sonar model to research the case. If a script is attached to the episode in Monday.com, its text is also included. Returns:

```ts
interface ResearchResult {
  summary: string;
  keyFacts: string[];
  citations: string[];
  searchedAt: string;
}
```

### Step 2 — Social Posts (Claude)

**API route:** `POST /api/generate/social`
**Model:** `claude-sonnet-4-6`

Generates 4 posts per platform using the research summary as context.

**Platform rules:**
- **Instagram** — 150–300 character caption + blank line + 10–15 hashtags starting with `#WomenAndCrime`
- **Facebook** — 200–500 characters, ends with an engagement question
- **Twitter/X** — max 275 characters, 1–2 hashtags
- **TikTok** — hook-style opener ("POV:", "Wait until you hear...", "The case that..."), 100–200 characters

Tone: serious, empathetic, compelling — never sensationalized or exploitative.

#### Per-Episode Overrides

Two optional fields influence both social posts and thumbnail generation:

- **Emphasize** — highlight a specific angle, topic, or element (e.g. "the medical malpractice angle")
- **Suppress / Avoid** — exclude sensitive content from both copy and imagery (e.g. "any racial or religious imagery")

These are entered in the "Image Generation Guidance" panel on the episode detail page.

### Step 3 — Background Image (OpenAI)

**API route:** `POST /api/generate/thumbnail`
**Model:** `gpt-image-1`
**Size:** `1536x1024` (16:9)
**Quality:** `high`

Generates a cinematic background image intended for YouTube thumbnails and social media. The image contains **no text** — it is a pure visual background for text overlay in post-production.

#### Image Prompt Strategy

- Moody and atmospheric but visually rich — mid-tones with visible texture and detail
- Accent pinks and magentas used as light sources (glows, neon reflections, spills), not fills
- Deep purple for shadow and depth
- Case-specific imagery only — no generic true crime clichés (no chalk outlines, crime scene tape, skulls, etc.)
- No human faces (unless reference images are provided — see below)
- No gore, no text, no labels

#### Reference Images

When host photos or other reference images are present, the pipeline switches from `images.generate` to `images.edit` with `reference_fidelity: 1.0` so the model can incorporate host likeness into the scene.

**Global reference folder** (`./reference-images/`): images placed here are loaded on every generation. Intended for host photos. Recommended: 4–5 photos per host with varied angles and lighting.

**Per-episode uploads**: the episode detail page has an "Episode Reference Images" uploader. These take priority and fill slots first; global images fill remaining slots. Hard API limit: **16 images total** (global + episode combined).

If no reference images are found (folder empty or absent, no uploads), the pipeline falls back to text-only `images.generate` and the "no human faces" constraint is restored.

---

## Episode Detail Page — UI Controls

The "Image Generation Guidance" panel (always visible) contains:

| Field | Purpose |
|---|---|
| **Emphasize** | Per-episode positive prompt appended to both social and image prompts |
| **Suppress / Avoid** | Per-episode negative prompt — excluded from social copy and image |
| **Episode Reference Images** | Upload PNG/JPG/WebP files to use as image references for this episode only |

The main action buttons:

| Button | Behavior |
|---|---|
| **Generate All Content** | Runs all 3 steps in sequence with current guidance values |
| **Regenerate** (thumbnail only) | Re-runs only step 3 using the existing research and current guidance/images |
| **Reset & Regenerate All** | Clears all results and re-runs from step 1 |

---

## Project Structure

```
src/
├── app/
│   ├── episodes/
│   │   ├── page.tsx                  — Episode list page
│   │   └── [id]/page.tsx             — Episode detail page (server component)
│   └── api/
│       ├── debug/monday-schema/      — Column ID discovery endpoint
│       ├── episodes/[id]/script/     — Script text extraction
│       └── generate/
│           ├── research/             — Perplexity research
│           ├── social/               — Claude social posts
│           └── thumbnail/            — OpenAI image generation
├── components/
│   ├── episodes/
│   │   ├── EpisodeList.tsx           — Vertical list layout
│   │   └── EpisodeCard.tsx           — List row with episode number, title, metadata
│   ├── generation/
│   │   ├── GenerationPanel.tsx       — Orchestrates UI: guidance inputs, controls, results
│   │   ├── ResearchSection.tsx       — Displays research summary and key facts
│   │   ├── SocialPostsPanel.tsx      — Tabbed platform view with copy buttons
│   │   ├── ThumbnailPanel.tsx        — Image display and download
│   │   └── PostCard.tsx              — Individual post with copy button
│   └── ui/
│       ├── LoadingSpinner.tsx
│       ├── ProgressSteps.tsx
│       └── CopyButton.tsx
├── hooks/
│   └── useEpisodeGeneration.ts       — Client-side state machine for the 3-step pipeline
├── lib/
│   ├── monday/
│   │   ├── client.ts                 — GraphQL query runner
│   │   ├── queries.ts                — Board/item/schema GQL queries
│   │   └── transformers.ts           — MondayItem → Episode mapping
│   ├── claude/client.ts              — Social post generation (Anthropic SDK)
│   ├── openai/client.ts              — Image generation (OpenAI SDK, gpt-image-1)
│   ├── perplexity/client.ts          — Case research (Perplexity sonar)
│   └── mammoth/parser.ts             — .docx script text extraction
├── types/
│   ├── episode.ts                    — Episode, MondayItem, MondayAsset
│   ├── generation.ts                 — ResearchResult, SocialPostSet, ThumbnailResult, state types
│   └── api.ts                        — Request/response interfaces for all API routes
reference-images/                     — Global host reference images (gitignored recommended)
```

---

## Brand Guidelines

**Colors:**
- `rgb(255, 141, 249)` — light pink
- `rgb(255, 84, 240)` — bright pink/magenta
- `rgb(130, 49, 132)` — deep purple
- `rgb(240, 32, 203)` — bright magenta
- `rgb(51, 53, 51)` — dark gray
- `rgb(27, 28, 27)` — near black

Grays are dominant in the UI. Pinks and magenta are used sparingly — only for lighting glows, highlights, hover states, and accents.

**Podcast:** Women & Crime — hosted by two female criminologists. Focus: crimes and topics important to women. Target audience: women 25–50 interested in true crime.

---

## API Services

| Service | Used for | Plan |
|---|---|---|
| Monday.com | Episode data source | Existing workspace |
| Perplexity (sonar) | Case research | Paid API |
| Anthropic Claude (`claude-sonnet-4-6`) | Social post generation | Free tier |
| OpenAI (`gpt-image-1`) | Background image generation | Paid (existing plan) |
