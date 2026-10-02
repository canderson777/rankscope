/**
 * GET /api/domain-profile?q=<domain>
 *
 * Returns the DomainProfile shape from src/data/types.ts, assembled from:
 *   - dataforseo_labs/google/domain_rank_overview/live       (traffic + keyword counts)
 *   - dataforseo_labs/google/historical_rank_overview/live   (monthly trend)
 *   - dataforseo_labs/google/ranked_keywords/live            (top keywords + SERP features)
 *   - dataforseo_labs/google/competitors_domain/live         (competitors)
 *   - dataforseo_labs/google/relevant_pages/live             (top pages)
 *   - backlinks/summary/live                                 (backlinks + authority)
 *
 * This is the most expensive route in the app — six calls. Everything except
 * the rank overview degrades to empty on failure so one bad call can't take
 * the page down.
 */

import { post, locale } from "../dataforseo.mjs";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function titleCaseIntent(raw) {
  switch ((raw || "").toLowerCase()) {
    case "informational": return "Informational";
    case "commercial": return "Commercial";
    case "transactional": return "Transactional";
    case "navigational": return "Navigational";
    default: return "Informational";
  }
}

/** Run a call, log and swallow failures, return a fallback. */
async function soft(label, promise, fallback) {
  try {
    return await promise;
  } catch (err) {
    console.warn(`[domain-profile] ${label} failed:`, err.message);
    return fallback;
  }
}

function mapTopKeywords(rankedResult) {
  const items = rankedResult?.[0]?.items ?? [];
  return items.slice(0, 50).map((item) => {
    const kd = item.keyword_data ?? {};
    const info = kd.keyword_info ?? {};
    const serp = item.ranked_serp_element?.serp_item ?? {};
    return {
      keyword: kd.keyword ?? "",
      position: serp.rank_absolute ?? 0,
      volume: info.search_volume ?? 0,
      difficulty: kd.keyword_properties?.keyword_difficulty ?? 0,
      cpc: Number((info.cpc ?? 0).toFixed?.(2) ?? 0),
      intent: titleCaseIntent(kd.search_intent_info?.main_intent),
      traffic: Math.round(serp.etv ?? 0),
      // DataForSEO's live endpoint doesn't return prior-period rank, so we
      // report 0 rather than inventing movement.
      change: 0,
    };
  });
}

/** Which SERP features this domain actually appears in, from its ranked results. */
function mapSerpFeatures(rankedResult) {
  const items = rankedResult?.[0]?.items ?? [];
  const counts = new Map();
  for (const item of items) {
    const type = item.ranked_serp_element?.serp_item?.type;
    if (!type) continue;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  const LABELS = {
    organic: "Organic",
    featured_snippet: "Featured Snippet",
    people_also_ask: "People Also Ask",
    local_pack: "Local Pack",
    images: "Image Pack",
    video: "Video",
    knowledge_graph: "Knowledge Panel",
    top_stories: "Top Stories",
    shopping: "Shopping",
  };
  return Object.entries(LABELS).map(([key, name]) => ({
    name,
    present: (counts.get(key) ?? 0) > 0,
    keywords: counts.get(key) ?? 0,
  }));
}

function mapCompetitors(competitorsResult, ownKeywordCount) {
  const items = competitorsResult?.[0]?.items ?? [];
  return items.slice(0, 10).map((item) => {
    const organic = item.metrics?.organic ?? {};
    const common = item.intersections ?? 0;
    return {
      domain: item.domain ?? "",
      authority: Math.round(item.avg_position ? 100 - item.avg_position : 0),
      commonKeywords: common,
      traffic: Math.round(organic.etv ?? 0),
      overlap: ownKeywordCount ? Math.round((common / ownKeywordCount) * 100) : 0,
    };
  });
}

function mapTopPages(pagesResult) {
  const items = pagesResult?.[0]?.items ?? [];
  return items.slice(0, 25).map((item) => {
    const organic = item.metrics?.organic ?? {};
    return {
      url: item.page_address ?? "",
      traffic: Math.round(organic.etv ?? 0),
      keywords: organic.count ?? 0,
      backlinks: item.backlinks_info?.backlinks ?? 0,
    };
  });
}

function mapTrafficTrend(historyResult) {
  const items = historyResult?.[0]?.items ?? [];
  return items
    .slice()
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .slice(-12)
    .map((row) => ({
      month: `${MONTHS[(row.month ?? 1) - 1]} ${String(row.year ?? "").slice(-2)}`,
      organic: Math.round(row.metrics?.organic?.etv ?? 0),
      paid: Math.round(row.metrics?.paid?.etv ?? 0),
    }));
}

export async function domainProfile(domain) {
  const target = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");

  const [overview, history, ranked, competitors, pages, backlinks] = await Promise.all([
    post("/v3/dataforseo_labs/google/domain_rank_overview/live", {
      target,
      ...locale(),
    }),
    soft(
      "historical rank overview",
      post("/v3/dataforseo_labs/google/historical_rank_overview/live", {
        target,
        ...locale(),
      }),
      [],
    ),
    soft(
      "ranked keywords",
      post("/v3/dataforseo_labs/google/ranked_keywords/live", {
        target,
        limit: 200,
        order_by: ["ranked_serp_element.serp_item.etv,desc"],
        ...locale(),
      }),
      [],
    ),
    soft(
      "competitors",
      post("/v3/dataforseo_labs/google/competitors_domain/live", {
        target,
        limit: 10,
        ...locale(),
      }),
      [],
    ),
    soft(
      "relevant pages",
      post("/v3/dataforseo_labs/google/relevant_pages/live", {
        target,
        limit: 25,
        ...locale(),
      }),
      [],
    ),
    soft(
      "backlinks summary",
      post("/v3/backlinks/summary/live", {
        target,
        internal_list_limit: 1,
        include_subdomains: true,
      }),
      [],
    ),
  ]);

  const metrics = overview?.[0]?.items?.[0]?.metrics ?? {};
  const organic = metrics.organic ?? {};
  const paid = metrics.paid ?? {};
  const backlinkSummary = backlinks?.[0] ?? {};

  const trafficTrend = mapTrafficTrend(history);
  const last = trafficTrend.at(-1)?.organic ?? 0;
  const prev = trafficTrend.at(-2)?.organic ?? 0;
  const trafficDelta = prev ? Number((((last - prev) / prev) * 100).toFixed(1)) : 0;

  return {
    domain: target,
    // DataForSEO doesn't classify a site's niche. Left blank rather than guessed.
    niche: "",
    authorityScore: Math.round(backlinkSummary.rank ?? 0),
    organicTraffic: Math.round(organic.etv ?? 0),
    paidTraffic: Math.round(paid.etv ?? 0),
    organicKeywords: organic.count ?? 0,
    backlinks: backlinkSummary.backlinks ?? 0,
    referringDomains: backlinkSummary.referring_domains ?? 0,
    trafficDelta,
    trafficTrend,
    topKeywords: mapTopKeywords(ranked),
    competitors: mapCompetitors(competitors, organic.count ?? 0),
    topPages: mapTopPages(pages),
    serpFeatures: mapSerpFeatures(ranked),
  };
}
