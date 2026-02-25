# Women & Crime — Episode Promoter: Project Spec

## Overview

A local web application for the **Women & Crime** podcast that automates episode promotion. Given a list of upcoming episodes from a Monday.com board, the tool researches each case, generates platform-specific social media posts, and creates a YouTube thumbnail — all in one click.

**Podcast:** Women & Crime
**Hosts:** 2 female criminologists
**Audience:** Women listeners
**Focus:** Crimes and topics important to women

---

## Problem Being Solved

Manually researching each episode and writing social media content for 4 platforms is time-consuming. This tool automates the full promotion workflow, from episode data to publication-ready content.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Episode data | Monday.com GraphQL API |
| Case research | Perplexity AI (Sonar model) |
| Social copy | Anthropic Claude (claude-sonnet-4-6) |
| Thumbnail image | OpenAI gpt-image-1 |
| Script parsing | mammoth (.docx → plain text) |

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
      └──→  gpt-image-1  ──→  YouTube thumbnail (1536×1024, b64_json)
      │
      ▼
  Web UI — browse, copy, download
```

---

## Monday.com Board Integration

The tool reads items from a configured Monday.com board. Each item maps to one episode.

**Expected columns:**
| Column | Env var | Description |
|---|---|---|
| Episode name | (item name field) | Victim or perpetrator name |
| Publish date | `MONDAY_COLUMN_PUBLISH_DATE` | Scheduled release date |
| Teaser copy | `MONDAY_COLUMN_TEASER_COPY` | Short episode description |
| Status | `MONDAY_COLUMN_STATUS` | upcoming / draft / published |

**File attachments:** `.docx` script files attached to a board item are detected automatically and used as additional context for research and content generation.

**Column ID discovery:** Visit `/api/debug/monday-schema` after configuring `MONDAY_API_TOKEN` and `MONDAY_BOARD_ID` to see all column IDs for your board.

**Note:** `ColumnValue` objects from the items API do not have a `title` field — only `id`, `type`, `value`, and `text`. The `title` field only exists on `Column` objects from the board schema query.

---

## Social Media Platforms & Post Specs

| Platform | Length | Format |
|---|---|---|
| Instagram | 150–300 chars | Caption + 10–15 hashtags (always starts with #WomenAndCrime) |
| Facebook | 200–500 chars | Longer-form, ends with engagement question |
| X / Twitter | ≤275 chars | Punchy, 1–2 hashtags max |
| TikTok | 100–200 chars | Hook opener: "POV:", "Wait until you hear...", etc. |

4 post variations are generated per platform (16 posts total per episode).

**Brand voice:** Serious, empathetic, compelling. Never sensationalized. Female-focused.

---

## YouTube Thumbnail Spec

- **Model:** `gpt-image-1` (OpenAI's latest; powers ChatGPT image generation)
- **Size:** `1536x1024` (landscape 16:9)
- **Quality:** `high`
- **Format:** Always returns `b64_json` — no `response_format` param needed
- **Download:** Browser-side Blob download, filename `thumbnail-[episode-name].png`
- **Note:** `gpt-image-1` requires verified billing (payment method on file) on OpenAI account

**Brand color palette:**

| Color | RGB | Usage |
|---|---|---|
| Near-black | rgb(27, 28, 27) | Primary background |
| Dark charcoal | rgb(51, 53, 51) | Secondary background, dominant tone |
| Deep purple | rgb(130, 49, 132) | Mid-ground shadows, atmospheric haze |
| Bright magenta | rgb(240, 32, 203) | Sparingly — accent only |
| Hot pink | rgb(255, 84, 240) | Sparingly — lighting glow only |
| Light pink | rgb(255, 141, 249) | Sparingly — edge highlights only |

**Rules:** Grays are dominant. Pinks/magentas only as subtle lighting, glows, or edge accents — never as dominant colors. No human faces. No gore.

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/episodes` | All episodes from Monday.com (excludes published) |
| `GET` | `/api/episodes/[id]` | Single episode by Monday.com item ID |
| `GET` | `/api/episodes/[id]/script` | Parse .docx script attachment → plain text |
| `POST` | `/api/generate/research` | Case research via Perplexity Sonar |
| `POST` | `/api/generate/social` | Social posts via Claude |
| `POST` | `/api/generate/thumbnail` | Thumbnail via gpt-image-1 |
| `GET` | `/api/debug/monday-schema` | Inspect board column IDs (setup only) |

---

## Environment Variables

```bash
# Monday.com
MONDAY_API_TOKEN=          # From Monday.com → Profile → API
MONDAY_BOARD_ID=           # From your board URL
MONDAY_COLUMN_PUBLISH_DATE= # Discovered via /api/debug/monday-schema
MONDAY_COLUMN_TEASER_COPY=
MONDAY_COLUMN_STATUS=

# AI Services
PERPLEXITY_API_KEY=        # From perplexity.ai — paid subscription
ANTHROPIC_API_KEY=         # From console.anthropic.com — free tier (separate from Claude.ai subscription)
OPENAI_API_KEY=            # From platform.openai.com — paid; requires verified billing for gpt-image-1

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Copy `.env.example` to `.env.local` and fill in values.

---

## Key Files

```
src/
├── types/
│   ├── episode.ts          # Episode, MondayItem, MondayAsset (no title on MondayColumnValue)
│   ├── generation.ts       # ResearchResult, SocialPostSet, ThumbnailResult, GenerationStatus
│   └── api.ts              # Request/response shapes for all API routes
│
├── lib/
│   ├── monday/
│   │   ├── client.ts       # GraphQL fetch wrapper (Authorization + API-Version headers)
│   │   ├── queries.ts      # FETCH_BOARD_ITEMS, FETCH_ITEM_BY_ID, FETCH_BOARD_SCHEMA
│   │   └── transformers.ts # MondayItem → Episode (reads column IDs from env)
│   ├── perplexity/client.ts
│   ├── claude/client.ts    # Brand-voiced prompt + JSON extraction (strips markdown fences)
│   ├── openai/client.ts    # gpt-image-1 with brand color palette in prompt
│   └── mammoth/parser.ts   # .docx buffer → plain text
│
├── hooks/
│   └── useEpisodeGeneration.ts  # 4-step pipeline state machine
│
├── components/
│   ├── episodes/           # EpisodeList, EpisodeCard
│   ├── generation/         # GenerationPanel, ResearchSection, SocialPostsPanel,
│   │                       # PostCard, ThumbnailPanel
│   └── ui/                 # CopyButton, LoadingSpinner, ProgressSteps
│
└── app/
    ├── episodes/page.tsx        # Episode list (calls Monday.com directly, not via HTTP)
    ├── episodes/[id]/page.tsx   # Episode detail + generation (calls Monday.com directly)
    └── api/                     # All API routes (used by client-side generation hook)
```

---

## Setup Checklist

- [x] Bootstrap Next.js project
- [x] Monday.com integration working
- [x] API keys configured in `.env.local`
- [x] Column IDs discovered and configured
- [x] Research (Perplexity) working
- [x] Social posts (Claude) working
- [x] Thumbnail (gpt-image-1) working
- [x] End-to-end generation tested

---

## Known Gotchas

- **Server components must not self-HTTP-fetch** — episode pages call Monday.com lib directly; only the client-side generation hook uses API routes via fetch
- **Monday.com `ColumnValue` has no `title` field** — only `id`, `type`, `value`, `text`; `title` is only on `Column` objects from the schema query
- **Monday.com file downloads require the `Authorization` header** — asset URLs are not public
- **gpt-image-1 always returns b64_json** — no `response_format` param; requires verified billing
- **Claude may wrap JSON output in markdown fences** — the client strips these before `JSON.parse()`
- **Perplexity citations** are in `response.citations[]` at the top level, not inside `choices[0].message`
- **Next.js 15+ `params` is a Promise** — always `await params` in dynamic route handlers
- **mammoth works best with `.docx`** — advise the team to avoid old binary `.doc` format
- **Anthropic API ≠ Claude.ai subscription** — separate billing at console.anthropic.com
