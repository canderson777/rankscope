# Running Rankscope with real data

---

## Start testing today, for $0

You do **not** need a DataForSEO key to start. Site Audit runs on Google PageSpeed
Insights, which is free.

```bash
cp .env.example .env.local     # VITE_DATA_SOURCE defaults to "mock"
npm run dev
```

Open http://localhost:5173, pick a project from the header dropdown, go to
**Site Audit**, hit **Run Audit**. That's real data about your real site — no key,
no credits, no card.

Domain Overview and Keyword Research will show a clear "API key not set" message
until you add a DataForSEO key. Backlink Analytics, Competitor Gap, and AI
Visibility need the same key. That's expected — start with Site Audit and Search
Console (both free), and add the key when you want the rest. See
**Data sources at a glance** below.

**If you hit a quota error:** the keyless PSI tier is a shared pool and can be
exhausted. Fix is free — create a key at
[console.cloud.google.com](https://console.cloud.google.com) (enable "PageSpeed
Insights API"), put it in `.env.local` as `PAGESPEED_API_KEY`, and you get
25,000 audits/day to yourself.

---

## Projects

The header has a project switcher. Projects are stored in your browser's
localStorage and carry a domain plus any keywords you save.

- **Switching** a project changes the active domain across every page.
- **Searching** an unrelated domain does *not* create a project — the chip turns
  amber and reads "lookup". That's a competitor check.
- To promote a lookup into a tracked site, open the dropdown and hit
  **Save &lt;domain&gt; as a project**.

Two example projects are seeded on first run. Delete or rename them freely.

---

## Getting off mock data entirely

## What you actually need

| Thing | Required? | Cost | Why |
| --- | --- | --- | --- |
| **Node.js 18+** | Yes | Free | You already have it. The API server uses built-in `fetch` and `node:http` — no new dependencies were added. |
| **DataForSEO account** | Yes, for live data | **$50 minimum top-up** (with $1 free trial credit) | The actual source of volume, difficulty, backlinks, and SERP data. |
| **Google Search Console** | Optional | Free | Your own site's real query/impression data. Worth adding later. |
| **A database** | No | — | Not needed yet. Responses are cached to disk in `.cache/`. |
| **Hosting** | No | — | Runs entirely on localhost. |

**Short answer: a DataForSEO API key and about five minutes.** That's it. No Docker,
no Postgres, no Cloudflare account.

### On the $50

Signing up costs **nothing** — no card required. Every new account gets **$1 in free
credit** for real API calls, and credits never expire. The $50 is a minimum *top-up*
you only hit once the free credit runs out. There's no monthly minimum and no
subscription.

### What each search actually costs

DataForSEO Labs bills **$0.01 per request + $0.0001 per result row**. Against this
implementation:

| Route | Calls | Cost |
| --- | --- | --- |
| **Keyword Research** (`/api/keyword-overview`) | 2 | **~$0.035** |
| ↳ `keyword_overview` (1 keyword) | | $0.0101 |
| ↳ `keyword_suggestions` (150 rows) | | $0.025 |
| **Domain Overview** (`/api/domain-profile`) | 6 | **~$0.10** |
| ↳ `domain_rank_overview` | | $0.0101 |
| ↳ `historical_rank_overview` (~12 rows) | | $0.0112 |
| ↳ `ranked_keywords` (200 rows) | | $0.030 |
| ↳ `competitors_domain` (10 rows) | | $0.011 |
| ↳ `relevant_pages` (25 rows) | | $0.0125 |
| ↳ `backlinks/summary` | | ~$0.02 (Backlinks API, separate rate) |

So the free $1 covers roughly **28 keyword searches**, or **10 domain searches**, or a
realistic mix of about 5 domains + 15 keywords.

**The cache changes this materially.** Repeat searches within `CACHE_TTL_HOURS` cost
$0, so iterating on the UI against 3–4 test domains burns credit only on the first
hit of each. In practice $1 goes a lot further than the raw numbers suggest.

### Stretching the free credit

Domain Overview is 3x the cost of Keyword Research, driven mostly by
`ranked_keywords` pulling 200 rows. To roughly halve it, edit
`server/endpoints/domainProfile.mjs` and drop `limit: 200` to `50`, and
`server/endpoints/keywordOverview.mjs` `limit: 150` to `50`. You lose table depth,
not accuracy — the headline metrics are identical.

Verify current pricing at
[dataforseo.com/pricing](https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api)
before topping up. The `backlinks/summary` figure above is an estimate; the server
logs the real cost of every call, so you'll see exact numbers on your first run.

---

## Setup

### 1. Get a DataForSEO key

1. Go to [app.dataforseo.com/api-access](https://app.dataforseo.com/api-access)
2. Sign up, then click **"Send by email"** to receive your credentials
3. Copy the longer **Base64** credentials string

### 2. Configure

```bash
cp .env.example .env.local
```

Open `.env.local` and set:

```
DATAFORSEO_API_KEY=<paste the Base64 string>
VITE_DATA_SOURCE=live
```

`.env.local` is gitignored. The key is only ever read by the Node server — it is
never bundled into the frontend.

### 3. Run

```bash
npm run dev
```

That starts two processes:

- **API server** on `http://localhost:8787`
- **Vite** on `http://localhost:5173` (proxies `/api` to the server)

Check the backend is healthy:

```
http://localhost:8787/api/health
```

You should see `"hasApiKey": true`.

### 4. Try it

Open the app and search `figma.com` (Domain Overview) or `email marketing`
(Keyword Research). Watch the server terminal — it logs every call and its cost:

```
[dataforseo] POST      /v3/dataforseo_labs/google/keyword_overview/live
[dataforseo] cost $0.0350 — session total $0.0350
```

Search the same thing again and you'll see `cache hit` instead.

---

## Data sources at a glance

| Source | Needs a key? | Cost | Powers |
| --- | --- | --- | --- |
| **Mock dataset** (default) | No | **Free** | Every page, with deterministic sample data |
| **Google PageSpeed Insights** | No (optional key) | **Free** | Site Audit |
| **Google Search Console** | Google OAuth (free) | **Free** | Search Console (your own queries) |
| **DataForSEO** | Yes | Pay-as-you-go | Domain Overview, Keyword Research, Backlink Analytics, Competitor Gap, AI Visibility |

**No DataForSEO budget?** You can still run the app two ways for $0:

1. **Mock mode** — leave `VITE_DATA_SOURCE=mock`. Everything is explorable with
   seeded sample data.
2. **Free live mode** — set `VITE_DATA_SOURCE=live` and use **Site Audit** +
   **Search Console**. These are real and free. The DataForSEO-powered pages will
   show an "API key not set" message until you add a key.

Add the key later when you want the paid routes — new accounts start with a small
free trial credit, and the 24h cache makes repeat lookups cost nothing.

---

## What's live vs still mocked

| Feature | Status | Cost |
| --- | --- | --- |
| **Site Audit** | **Live** — PageSpeed Insights | **Free** |
| **Domain Overview** | **Live** — 6 DataForSEO calls | ~$0.10 |
| **Keyword Research** | **Live** — 2 DataForSEO calls | ~$0.035 |
| **Search Console** | **Live** — Google first-party (striking distance) | **Free** |
| **Backlink Analytics** | **Live** — DataForSEO backlinks API | ~$0.02 + per-row |
| **Competitor Gap** | **Live** — DataForSEO domain intersection | ~1 call per competitor |
| **AI Visibility** | **Live** — DataForSEO LLM Mentions | ~$0.055 / call |

Without a DataForSEO key, the paid routes above return a clear "API key not set"
message instead of data. Site Audit and Search Console stay free either way.

To flip back to all-mock at any time, set `VITE_DATA_SOURCE=mock` and restart.

---

## Cost controls

Three guards are built in:

1. **Disk cache** (`CACHE_TTL_HOURS`, default 24h) — identical requests are free
   within the window. Delete `.cache/` to force fresh data.
2. **Spend cap** (`SPEND_CAP_USD`, default $5) — the server refuses new calls once
   a session crosses it. Restart resets the counter.
3. **Cost logging** — every call prints its price and the running total.

Domain Overview is the expensive route (six calls, ~$0.04–0.10 per domain).
Keyword Research is cheaper (~$0.035–0.05).

---

## Adding the remaining endpoints

The pattern is three steps:

1. Write `server/endpoints/<name>.mjs` exporting an async function that takes the
   query string and returns the matching type from `src/data/types.ts`.
2. Register it in the `ROUTES` table in `server/index.mjs`.
3. Add it to `live` and `LIVE_ENDPOINTS` in `src/data/live.ts`, and to the live
   spread in `src/data/api.ts`.

The relevant DataForSEO endpoints for what's left:

- **Backlinks** — `/v3/backlinks/summary/live` (already used for authority score),
  `/v3/backlinks/backlinks/live` for individual rows, `/v3/backlinks/history/live`
  for the new/lost trend
- **Site Audit (multi-page)** — already live via PageSpeed Insights, but PSI audits
  **one URL**, so `crawledPages` is 1. A true site-wide crawl needs DataForSEO's
  `/v3/on_page/` task flow (paid)
- **Competitor Gap** — `/v3/dataforseo_labs/google/domain_intersection/live`
- **AI Visibility** — no DataForSEO equivalent. This is your differentiator and
  would need its own approach (querying the answer engines directly).

---

## Optional: Google Search Console

Free, and it's your *own* first-party data — impressions and average position for
queries you already rank for. The highest-value use is finding "striking distance"
queries sitting at positions 5–20. The new **Search Console** page in the sidebar
shows them as a sortable, exportable table.

### One-time Google Cloud setup (~10 min, free)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → pick or
   create a project.
2. **APIs & Services → Library** → enable the **Search Console API**.
3. **APIs & Services → OAuth consent screen** → configure as *External*, add your
   Google address as a **test user** (or publish the app).
4. **APIs & Services → Credentials** → **Create OAuth client ID** → Application
   type *Web application* → add an authorized redirect URI that exactly matches
   `GSC_REDIRECT_URI` in `.env.local` (default `http://localhost:8788/api/gsc/callback`).
5. Copy the client ID and client secret into `.env.local`:
   ```bash
   GSC_CLIENT_ID=...apps.googleusercontent.com
   GSC_CLIENT_SECRET=...
   ```
6. Restart `npm run dev`, open the **Search Console** page, click **Connect Google
   Search Console**, and authorize. Close the "connected" tab and it loads data.

The account that authorizes must be verified for the property in Search Console.
If auto-matching your project domain to a property fails (e.g. the property is a
`sc-domain:` or URL-prefix variant), set `GSC_SITE_URL` to the exact property
string from Search Console → Settings.

If a token expires, the server refreshes it automatically via the stored refresh
token in `.cache/gsc-token.json`. Delete that file to force a fresh consent.

---

## Troubleshooting

**`hasApiKey: false`** — `.env.local` isn't being read. Confirm it's in the project
root (next to `package.json`) and restart the server.

**`DataForSEO error 40200`** — out of credit, or the key is wrong. Check your
balance at app.dataforseo.com.

**`No DataForSEO data for keyword "x"`** — genuinely no data for that term in the
configured market. Try a broader keyword or change `DATAFORSEO_LOCATION`.

**Frontend shows mock data despite `VITE_DATA_SOURCE=live`** — Vite only reads env
vars at startup. Restart `npm run dev`.

**Port 8787 in use** — set `API_PORT` in `.env.local`; the Vite proxy reads the
same variable.
