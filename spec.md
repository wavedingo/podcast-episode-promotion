# Women & Crime — Episode Promoter: Spec

Internal tool for the **Women & Crime** true crime podcast. Automates episode promotion content across three outputs: case research, social media posts, and a YouTube/social background image. Built with Next.js (App Router), TypeScript, and Tailwind CSS. Password-protected with per-user credentials.

---

## Overview

Episodes are managed in **Monday.com**. Opening an episode in this tool triggers a three-step AI pipeline:

1. **Research** — Perplexity searches the web for case facts, context, and citations
2. **Social Posts** — Claude writes 4 posts per platform (Instagram, Facebook, Twitter/X, TikTok)
3. **Background Image** — OpenAI `gpt-image-1` generates a cinematic 16:9 image

All three steps can run as a single "Generate All Content" flow, or the thumbnail can be regenerated independently. Generated content is persisted locally so navigating away and back restores all results.

Individual posts can be selected, edited, and scheduled directly to **Buffer.com**. Instagram and Facebook posts automatically include the generated thumbnail image. A "Scheduled" badge appears on the episode card after posts are sent.

---

## Data Flow

```
Monday.com board
      │
      ▼
  Episode list (name, publish date, teaser, optional .docx script)
      │
      ▼
  Perplexity Sonar  ──→  Case research summary + citations
      │
      ├──→  Claude claude-sonnet-4-6  ──→  4 posts × 4 platforms
      │
      └──→  gpt-image-1  ──→  YouTube thumbnail (1536×1024, saved to disk)
      │
      ▼
  Web UI — browse, copy, download, select posts for scheduling
      │
      ▼
  Buffer.com GraphQL API  ──→  Scheduled posts (image attached for Instagram/Facebook)
  localStorage cache — research + social posts + thumbnail URL + scheduledToBufferAt
```

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

# Optional: absolute path where generated thumbnails are saved.
# Defaults to <project>/public/generated (served by Next.js automatically).
# Only set this if you want to serve images from a custom directory via nginx.
# GENERATED_IMAGES_BASE_DIR=/var/www/generated

# Optional: fallback folder of reference images if no host images are configured in Settings
REFERENCE_IMAGES_DIR=./reference-images

# Buffer.com — run GET /api/debug/buffer-profiles to discover your channel IDs
BUFFER_ACCESS_TOKEN=
BUFFER_CHANNEL_INSTAGRAM=
BUFFER_CHANNEL_FACEBOOK=
BUFFER_CHANNEL_TWITTER=
BUFFER_CHANNEL_TIKTOK=

# Auth — generate hashes with: node scripts/generate-password-hash.mjs <username> <password>
# Format: username:salt:pbkdf2hash  (up to 3 users; unused slots can be left blank)
SESSION_SECRET=
AUTH_USER_1=
AUTH_USER_2=
AUTH_USER_3=
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

**Status label mapping** (exact match, case-insensitive):

| Monday.com label(s) | Internal status | Appears on |
|---|---|---|
| Script Complete, Recorded, Video Recorded, Post Production, REVIEW, Ready to Publish | `upcoming` | `/episodes` page |
| LIVE, Live Paid | `archived` | `/archive` page |
| `<default>` / blank, Script Draft, Script Review, Research, Stuck, Issue | `excluded` | Hidden — not shown anywhere |

The episode badge on each card displays the **raw Monday.com label** (e.g. "Post Production", "Ready to Publish"), not the internal category. The internal category controls routing and filtering only.

The episodes page shows `upcoming` items sorted ascending by **publish date** (nulls last). The archive page shows `archived` items sorted descending by publish date.

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

Generates a cinematic background image intended for YouTube thumbnails and social media. The image contains **no text** — it is a pure visual background for text overlay in post-production.

The generated PNG is saved to disk at `public/generated/{episodeId}/{timestamp}.png` and served as a static URL. This keeps the localStorage cache small (URL only) and allows the image to persist across server restarts.

#### Image Prompt Structure

The prompt is assembled from layered sections in order:

1. **Base framing** — fixed; establishes genre, audience, and episode name
2. **Style & Mood** — editable via Settings page; controls atmosphere, lighting, and color palette
3. **Case context** — dynamic; first 200 characters of the Perplexity research summary
4. **Content rules** — editable via Settings page; controls what to depict/avoid
5. **Faces clause** — conditional based on reference images (see below)
6. **Quality clause** — fixed; enforces no gore, 16:9, professional aesthetic
7. **Episode overrides** — optional Emphasize and Suppress fields from the episode page

#### Image Prompt Strategy (defaults)

- Moody and atmospheric but visually rich — mid-tones with visible texture and detail
- Accent pinks and magentas used as light sources (glows, neon reflections, spills), not fills
- Case-specific imagery only — no generic true crime clichés (no chalk outlines, crime scene tape, skulls, etc.)
- No text, no labels of any kind

#### Faces Clause

The faces clause is determined by which reference images are present:

| Situation | Behavior |
|---|---|
| Episode-specific images uploaded | Person(s) in those images are featured prominently — treated as the episode namesake/subject |
| Only host images (from Settings) | Hosts may appear naturally in the scene |
| No reference images | No faces restriction — people may appear if contextually relevant |

#### Reference Images

When any reference images are present, the pipeline switches from `images.generate` to `images.edit` so the model can incorporate the subject's likeness.

**Host images (Settings page):** Upload photos of the podcast hosts via the Settings page. Images are compressed to max 768px / JPEG 82% and stored in localStorage. Recommended: 3–6 images (max 8). These are sent on every generation unless overridden by episode-specific images.

**Per-episode uploads:** The episode detail page has an "Episode Reference Images" uploader. These take priority and fill reference image slots first; host images fill remaining slots. Hard API limit: **16 images total**.

**Filesystem fallback:** If no host images are configured in Settings, the tool falls back to images in the `REFERENCE_IMAGES_DIR` folder.

If no reference images are found anywhere, the pipeline falls back to text-only `images.generate` with `quality: 'high'`.

> **Note:** `images.edit` does not support the `quality` parameter. Only `images.generate` accepts it.

---

## Buffer Integration

### Selecting and Scheduling Posts

On the episode detail page, each social post card has a checkbox. Selecting one or more posts reveals the **BufferPublishPanel** below the posts grid. The panel shows:

- Platform badge + post label for each selected post
- Editable `<textarea>` for the post text
- Per-post `<input type="datetime-local">` — defaults to the episode's publish date at noon (or tomorrow noon if no publish date is set)
- × button to deselect a post

Clicking **Schedule to Buffer** sends all selected posts to Buffer via `POST /api/publish/buffer`. On success, the cache is updated with `scheduledToBufferAt` and a **Scheduled** badge appears on the episode card.

### Image Attachment

Instagram and Facebook posts automatically include the episode's most recently generated thumbnail as an attached image. The image URL is resolved to an absolute URL using `NEXT_PUBLIC_BASE_URL` before being sent to Buffer (Buffer must be able to fetch the image from a public URL).

Twitter and TikTok posts are sent as text-only.

### API Routes

| Route | Method | Description |
|---|---|---|
| `POST /api/publish/buffer` | POST | Sends selected posts to Buffer; returns `{ sent, skipped, errors }` |
| `GET /api/debug/buffer-profiles` | GET | Lists all Buffer channels (use to discover channel IDs for env vars) |

### Buffer API

Uses Buffer's GraphQL API (`https://api.buffer.com/graphql`). Auth via `Authorization: Bearer TOKEN` header. Posts are created with `schedulingType: automatic, mode: customScheduled` and a `dueAt` timestamp.

### Configuration

Run `GET /api/debug/buffer-profiles` while the server is running to discover your Buffer channel IDs, then set `BUFFER_CHANNEL_*` env vars accordingly.

---

## Authentication

The app is protected by username/password authentication. All routes except `/login` and `/api/auth/` require a valid session cookie.

### How it works

- Sessions use HMAC-SHA256 tokens (30-day expiry) stored in an httpOnly cookie (`wc_session`)
- Passwords are hashed with PBKDF2-SHA256 (310,000 iterations) — no external auth packages
- Up to 3 users; each configured via an env var (`AUTH_USER_1`, `AUTH_USER_2`, `AUTH_USER_3`)
- Each env var contains `username:salt:hash` — generate with the provided script

### Adding users

```bash
node scripts/generate-password-hash.mjs <username> <password>
```

Run once per user. Each invocation generates a unique random salt. Copy the output line into `.env.local`.

### Generating SESSION_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Files

| File | Purpose |
|---|---|
| `src/middleware.ts` | Protects all routes; redirects unauthenticated requests to `/login?next=<path>` |
| `src/lib/auth/session.ts` | Edge-compatible token verify (Web Crypto API) — safe to import in middleware |
| `src/lib/auth/server.ts` | Node.js-only utilities: password verify (PBKDF2) + token creation (HMAC) |
| `src/app/login/page.tsx` | Login form; redirects to `?next=` param on success |
| `src/app/api/auth/login/route.ts` | Validates credentials, sets session cookie |
| `src/app/api/auth/logout/route.ts` | Clears session cookie |
| `src/components/auth/LogoutButton.tsx` | "Sign out" button in the nav header |
| `scripts/generate-password-hash.mjs` | CLI script to generate AUTH_USER_* values |

> **Note:** The `/generated/` path is excluded from auth so Buffer can fetch thumbnail images unauthenticated.

---

## Content Persistence

All three generation outputs are saved to the browser's `localStorage` after each generation:

| Data | Storage | Key format |
|---|---|---|
| Research result | localStorage | `wc:gen:{episodeId}` |
| Social posts | localStorage | `wc:gen:{episodeId}` |
| Thumbnail URL(s) | localStorage | `wc:gen:{episodeId}` |
| `scheduledToBufferAt` timestamp | localStorage | `wc:gen:{episodeId}` |
| Thumbnail image file | Disk (`public/generated/`) | `{episodeId}/{timestamp}.png` |

Navigating away from an episode and returning restores all previously generated content automatically. The localStorage entry stores only the URL (not the image bytes), so there is no quota risk.

The episode list card shows two badges:
- **Generated** — any cached content exists for that episode in the current browser
- **Scheduled** — posts have been sent to Buffer (`scheduledToBufferAt` is set in cache)

Clicking **Reset & Regenerate All** clears the localStorage entry for the episode (but does not delete the image files from disk).

---

## Settings Page (`/settings`)

### Host Reference Images

Upload photos of the podcast hosts to use as reference images for thumbnail generation. Images are compressed before storage (max 768px on the longest side, JPEG 82% quality).

- **Ideal count:** 3–6 images
- **Maximum:** 8 images
- **Storage:** browser localStorage (`wc:host-images`)
- **Priority:** overrides the filesystem `REFERENCE_IMAGES_DIR` fallback

### Prompt Layers

The Settings page exposes two editable prompt layers for troubleshooting and experimentation:

| Layer | Default behavior |
|---|---|
| **Style & Mood** | Atmospheric/cinematic description, pink/magenta accent lighting guidance |
| **Content Rules** | Anti-cliché rules, preferred environment types, no-text constraint |

Changes are saved to `localStorage` and applied to all future generations in the browser. A full prompt preview (assembled with placeholders for dynamic sections) is shown at the bottom of the page. "Reset to Defaults" restores the hardcoded values and clears localStorage.

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
| **Reset & Regenerate All** | Clears cached results and re-runs from step 1 |

Multiple thumbnail versions accumulate on the page (Version 1, Version 2, etc.). Only the latest version shows the Regenerate button.

---

## Project Structure

```
src/
├── app/
│   ├── episodes/
│   │   ├── page.tsx                  — Episode list (upcoming, sorted by publish date)
│   │   └── [id]/page.tsx             — Episode detail page (server component)
│   ├── archive/
│   │   └── page.tsx                  — Archive page (live episodes, sorted newest first)
│   ├── login/
│   │   └── page.tsx                  — Login form (redirects to ?next= on success)
│   ├── settings/
│   │   └── page.tsx                  — Host images + prompt layer settings
│   └── api/
│       ├── auth/
│       │   ├── login/                — Sets session cookie after credential verification
│       │   └── logout/               — Clears session cookie
│       ├── debug/
│       │   ├── monday-schema/        — Column ID discovery endpoint
│       │   └── buffer-profiles/      — Lists Buffer channels (use to find channel IDs)
│       ├── episodes/[id]/script/     — Script text extraction
│       ├── publish/
│       │   └── buffer/               — Sends selected posts to Buffer; attaches image for IG/FB
│       └── generate/
│           ├── research/             — Perplexity research
│           ├── social/               — Claude social posts
│           └── thumbnail/            — OpenAI image generation + disk save
├── components/
│   ├── auth/
│   │   └── LogoutButton.tsx          — "Sign out" button in the nav header
│   ├── episodes/
│   │   ├── EpisodeList.tsx           — Vertical list layout
│   │   ├── EpisodeCard.tsx           — List row with episode number, title, metadata
│   │   └── EpisodeStatusDots.tsx     — "Generated" + "Scheduled" badges (localStorage-driven)
│   ├── generation/
│   │   ├── GenerationPanel.tsx       — Orchestrates UI: guidance inputs, controls, results
│   │   ├── ResearchSection.tsx       — Displays research summary and key facts
│   │   ├── SocialPostsPanel.tsx      — Tabbed platform view; manages post selection for Buffer
│   │   ├── BufferPublishPanel.tsx    — Selected posts editor + datetime pickers + schedule button
│   │   ├── ThumbnailPanel.tsx        — Image display and download
│   │   └── PostCard.tsx              — Individual post with copy + select checkbox
│   └── ui/
│       ├── LoadingSpinner.tsx
│       ├── ProgressSteps.tsx
│       └── CopyButton.tsx
├── hooks/
│   ├── useEpisodeGeneration.ts       — Client-side state machine for the 3-step pipeline
│   ├── useGenerationCache.ts         — localStorage read/write/clear for generated content
│   ├── useHostImages.ts              — localStorage-backed host reference image store
│   └── usePromptSettings.ts          — localStorage-backed prompt layer overrides
├── lib/
│   ├── auth/
│   │   ├── session.ts                — Edge-compatible token verify (Web Crypto API)
│   │   └── server.ts                 — Node.js password verify (PBKDF2) + token creation (HMAC)
│   ├── buffer/
│   │   └── client.ts                 — Buffer GraphQL client: listChannels + createPost
│   ├── monday/
│   │   ├── client.ts                 — GraphQL query runner + getAllBoardItems (paginated, 60s cache)
│   │   ├── queries.ts                — Board/item/schema GQL queries (incl. next_items_page)
│   │   └── transformers.ts           — MondayItem → Episode mapping + status classification
│   ├── claude/client.ts              — Social post generation (Anthropic SDK)
│   ├── openai/client.ts              — Image generation (OpenAI SDK, gpt-image-1)
│   ├── perplexity/client.ts          — Case research (Perplexity sonar)
│   ├── mammoth/parser.ts             — .docx script text extraction
│   └── promptDefaults.ts             — PromptLayers type + DEFAULT_PROMPT_LAYERS constants
├── middleware.ts                     — Auth guard: protects all routes except /login + /api/auth/
├── types/
│   ├── episode.ts                    — Episode (status + rawStatus), MondayItem, MondayAsset
│   ├── generation.ts                 — ResearchResult, SocialPostSet, ThumbnailResult, cache + state types
│   └── api.ts                        — Request/response interfaces for all API routes
public/
└── generated/                        — Saved thumbnail PNGs (gitignored, organised by episodeId)
reference-images/                     — Filesystem fallback for host reference images (gitignored recommended)
scripts/
└── generate-password-hash.mjs        — CLI: generates AUTH_USER_* env var values
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
| Anthropic Claude (`claude-sonnet-4-6`) | Social post generation | Paid plan |
| OpenAI (`gpt-image-1`) | Background image generation | Paid (existing plan) |
| Buffer.com | Social post scheduling | Paid plan |

---

## Known Gotchas

- **Server components must not self-HTTP-fetch** — episode pages call Monday.com lib directly; only the client-side generation hook uses API routes via fetch
- **Monday.com `ColumnValue` has no `title` field** — only `id`, `type`, `value`, `text`; `title` is only on `Column` objects from the schema query
- **Monday.com file downloads require the `Authorization` header** — asset URLs are not public
- **Monday.com API is cached for 60s** — status changes in Monday.com take up to 60 seconds to appear in the tool
- **gpt-image-1 always returns `b64_json`** — no `response_format` param needed; requires verified billing on OpenAI account
- **`images.edit` does not support the `quality` parameter** — only `images.generate` accepts it
- **Thumbnails are saved to `public/generated/` at runtime** — this folder is gitignored; deleting it removes all previously generated images
- **localStorage `useState` lazy initializers don't work with SSR** — always use `useEffect` to read from localStorage after mount to avoid hydration mismatches
- **Claude may wrap JSON output in markdown fences** — the client strips these before `JSON.parse()`
- **Perplexity citations** are in `response.citations[]` at the top level, not inside `choices[0].message`
- **Next.js 15+ `params` is a Promise** — always `await params` in dynamic route handlers
- **mammoth works best with `.docx`** — advise the team to avoid old binary `.doc` format
- **Anthropic API ≠ Claude.ai subscription** — separate billing at console.anthropic.com
- **Monday.com `items_page` defaults to 30 items** regardless of the `limit` parameter on some plans — always use `getAllBoardItems()` (cursor-based pagination) rather than a single `mondayQuery` call for board-wide fetches
- **Monday.com `next_items_page` cursors expire** — do not cache cursors; always paginate in a single request cycle
- **Buffer GraphQL uses inlined values** — custom scalar types (IDs, enums, ISO strings) must be inlined with `JSON.stringify()` rather than passed as GraphQL variables, due to Buffer's custom scalar handling
- **Buffer `mode` enum is `customScheduled`** (not `customSchedule`) — typo in some older docs
- **Buffer image attachment requires a public URL** — `NEXT_PUBLIC_BASE_URL` must be set to a publicly accessible URL in production; localhost won't work for Instagram/Facebook image posts
- **`/generated/` is excluded from auth middleware** — Buffer must fetch thumbnail images unauthenticated; the middleware matcher explicitly excludes this path
- **Auth uses two separate crypto modules** — `session.ts` uses Web Crypto API (`crypto.subtle`) for Edge runtime compatibility in middleware; `server.ts` uses Node.js `crypto` for API routes. Both produce/verify the same token format
- **TypeScript 5.5+ tightened `Uint8Array` generics** — `Uint8Array` is now `Uint8Array<ArrayBufferLike>` by default; Web Crypto functions require `Uint8Array<ArrayBuffer>`. Use `new Uint8Array(source)` rather than `Uint8Array.from()` when passing to crypto functions
