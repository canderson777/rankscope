# Rankscope — SEO & AI Visibility Intelligence

A modern, self-contained SEO dashboard with dedicated AI-visibility (AEO/GEO)
analytics. Built with React, TypeScript, Tailwind CSS, and Recharts, with a small
local Node API that keeps your API keys off the browser.

**It runs on mock data out of the box — no keys, no signup, no cost.** Flip on live
data whenever you want it, and start with the two free sources (Google PageSpeed
Insights and Search Console) before paying for anything.

## Features

- **Dashboard** — At-a-glance metrics: authority score, organic/paid traffic, backlinks, referring domains
- **Domain Overview** — Full organic profile, SERP feature tracking, competitor comparison
- **Keyword Research** — Volume, difficulty, intent, CPC, related terms, questions people ask, keyword clusters
- **Backlink Analytics** — Link profile, new/lost backlinks, authority distribution, backlink table
- **Site Audit** — Technical SEO health score, crawl issues (errors, warnings, notices), priority sorting
- **Competitor Gap** — Shared keywords, missing opportunities, backlink gaps, content ideas
- **AI Visibility** — How your brand appears in ChatGPT, Perplexity, Google AI Overviews, Gemini, Claude, and Bing Copilot
  - Brand mention tracking by platform & sentiment
  - AI query research with difficulty/opportunity scoring
  - Answer engine competitor analysis
  - AEO content opportunities with schema recommendations
  - GEO optimization checklist
  - Simulated AI answer previews
- **Search Console** — Free, first-party "striking distance" queries (positions 5–20)

## Data sources: what works with and without DataForSEO

There are two modes, set by `VITE_DATA_SOURCE`:

| Mode | What you get | Cost | Setup |
| --- | --- | --- | --- |
| **`mock`** *(default)* | Every page, backed by a deterministic sample dataset | **$0** | None |
| **`live`** | Real data from the local API | Free or paid, per source | `.env.local` |

In **live** mode, the sources split cleanly:

### Free — no DataForSEO key needed

| Feature | Source | Notes |
| --- | --- | --- |
| **Site Audit** | Google PageSpeed Insights | Free. An optional `PAGESPEED_API_KEY` only raises the rate limit (25k/day). |
| **Search Console** | Google Search Console (your own property) | Free OAuth. Your real impressions, clicks, and average position. |

### Requires a DataForSEO key

| Feature | Source |
| --- | --- |
| Domain Overview | DataForSEO Labs + Backlinks |
| Keyword Research | DataForSEO Labs |
| Backlink Analytics | DataForSEO Backlinks |
| Competitor Gap | DataForSEO Labs (domain intersection) |
| AI Visibility | DataForSEO LLM Mentions |

Without a key, these routes show a clear **"API key not set"** message instead of
data — they have no free fallback.

### Don't want to top up DataForSEO?

You don't have to, to get value out of Rankscope:

1. **Stay in mock mode** (`VITE_DATA_SOURCE=mock`) to explore the whole UI with
   sample data, free, forever.
2. **Use free live mode** — set `VITE_DATA_SOURCE=live` and lean on **Site Audit**
   (PageSpeed) and **Search Console**. Both are real and both are free.
3. **Add DataForSEO later**, only when you want Domain Overview, Keyword Research,
   Backlink Analytics, Competitor Gap, and AI Visibility live. New accounts start
   with a small free trial credit, and the built-in 24h cache makes repeat lookups
   cost nothing. Cost controls (spend cap, per-call logging, caching) are built in.

Full walkthrough, costs, and cost controls: **[SETUP.md](./SETUP.md)**.

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Routing:** React Router v6
- **Styling:** Tailwind CSS 4 + custom CSS variables for theme
- **Charts:** Recharts
- **Icons:** Lucide React
- **Build:** Vite
- **Backend:** Small Node API server (`/server`) — proxied at `/api`; holds all API keys
- **Data:** Deterministic seeded mock by default; real data when `VITE_DATA_SOURCE=live`

## Quick Start

### Prerequisites
- **Node.js** 18+ and npm 10+

### Run it

```bash
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`). That's it — you're on mock
data with two example projects already seeded.

**Optional:** copy the example env file to enable live data later:

```bash
cp .env.example .env.local
```

### Example queries

- `notion.so` — Large SaaS domain with a curated profile
- `ahrefs.com` — SEO tool with rich backlink data
- `figma.com` — Design tool (try it in keyword research too)
- `email marketing` — Keyword research demo
- `how to improve local seo` — Question-based keyword research

## Usage

- **Hero search (Dashboard)** — Look up a domain (`figma.com`) or a keyword (`email marketing`)
- **Sidebar nav** — Jump between sections (Domain Overview, Keyword Research, etc.)
- **Domain chip (Header)** — Shows your active domain; switch projects from the dropdown
- **Dark mode toggle** — Top-right button; persists to localStorage

### Data modes

Set `VITE_DATA_SOURCE` in `.env.local`:

- **`mock` (default)** — deterministic and seeded. Same domain → same data every time. No key, no cost.
- **`live`** — real data through the local API server. Free for Site Audit + Search Console; a DataForSEO key unlocks the rest.

> Vite only reads env vars at startup — restart `npm run dev` after changing them.

## Project Structure

```
src/
├── main.tsx              # React entry point
├── App.tsx               # Router & layout
├── index.css             # Global styles + CSS variables (light/dark theme)
├── context/SearchContext.tsx
├── components/           # Sidebar, Header, SearchInput, StatCard, ChartCard,
│                         # DataTable, Badge, ScoreBadge, Meter, EmptyState,
│                         # FilterBar, PageHeader
├── pages/                # Dashboard, DomainOverview, KeywordResearch,
│                         # BacklinkAnalytics, SiteAudit, CompetitorGap,
│                         # AiVisibility, SearchConsole
├── data/
│   ├── types.ts          # TypeScript contracts (domain, keyword, backlink, etc.)
│   ├── niches.ts         # Term banks for mock data (Project Management, Email, etc.)
│   ├── api.ts            # Mock generators + mode switch
│   ├── live.ts           # Adapter to the local API server
│   └── projects.ts       # localStorage project store
└── lib/                  # seed.ts (PRNG), format.ts, useAsync.ts

server/
├── index.mjs             # Route table (proxied at /api)
├── dataforseo.mjs        # DataForSEO helper: caching + cost accounting
├── gsc.mjs               # Google Search Console (OAuth + Search Analytics)
└── endpoints/            # keywordOverview, domainProfile, siteAudit,
                          # backlinkProfile, gapAnalysis, aiVisibility
```

## Building for Production

```bash
npm run build
```

Output goes to `dist/` — ready to deploy to Vercel, Netlify, or any static host.
(Deploy the frontend as static; run the `/server` API somewhere Node runs if you
want live data.)

## Customization

### Theme (Light/Dark)

Edit `src/index.css` `:root` and `.dark` blocks:
- `--accent`: Primary brand color (default: blue #2a78d6)
- `--s1` through `--s8`: Categorical hues (chart colors)
- `--good`, `--warn`, `--serious`, `--critical`: Status colors

### Mock Data

1. Edit `src/data/niches.ts` — add or modify term banks
2. Edit `src/data/api.ts` — adjust volume ranges, difficulty curves, etc.

### Adding more live endpoints

1. Write `server/endpoints/<name>.mjs` returning the matching type from `src/data/types.ts`
2. Register it in the `ROUTES` table in `server/index.mjs`
3. Add it to `live` / `LIVE_ENDPOINTS` in `src/data/live.ts` and the live spread in `src/data/api.ts`

UI stays unchanged. See [SETUP.md](./SETUP.md) for which DataForSEO endpoints map
to which feature.

## Roadmap

- Export to PDF / reports
- Scheduled audits
- Rank tracking over time (needs persistence)
- Multi-user accounts
- Email alerts

Site Audit runs on Google PageSpeed Insights (free). Search Console is free. The
DataForSEO-powered routes are live when a key is set.

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive (375px and up)
- No IE11 support (ES2020+)

## License

MIT — feel free to use this as a template.
