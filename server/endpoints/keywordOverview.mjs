/**
 * GET /api/keyword-overview?q=<keyword>
 *
 * Returns the KeywordOverview shape defined in src/data/types.ts, built from:
 *   - dataforseo_labs/google/keyword_overview/live    (volume, KD, CPC, intent, trend)
 *   - dataforseo_labs/google/keyword_suggestions/live (related terms + questions)
 *
 * Clusters are derived locally — DataForSEO has no clustering endpoint, and
 * paying for one isn't worth it at this stage. See the note on groupClusters().
 */

import { post, locale } from "../dataforseo.mjs";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const QUESTION_STARTERS = /^(how|what|why|when|where|which|who|can|does|do|is|are|should|will)\b/i;

function titleCaseIntent(raw) {
  switch ((raw || "").toLowerCase()) {
    case "informational": return "Informational";
    case "commercial": return "Commercial";
    case "transactional": return "Transactional";
    case "navigational": return "Navigational";
    default: return "Informational";
  }
}

/** DataForSEO monthly_searches -> TrendPoint[], oldest first, last 12 months. */
function toVolumeTrend(monthly) {
  if (!Array.isArray(monthly)) return [];
  return monthly
    .slice()
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .slice(-12)
    .map((m) => ({
      month: `${MONTHS[(m.month ?? 1) - 1]} ${String(m.year ?? "").slice(-2)}`,
      volume: m.search_volume ?? 0,
    }));
}

function toRelatedKeyword(item) {
  const info = item?.keyword_info ?? {};
  return {
    keyword: item?.keyword ?? "",
    volume: info.search_volume ?? 0,
    difficulty: item?.keyword_properties?.keyword_difficulty ?? 0,
    cpc: Number((info.cpc ?? 0).toFixed?.(2) ?? info.cpc ?? 0),
    intent: titleCaseIntent(item?.search_intent_info?.main_intent),
  };
}

/**
 * Heuristic clustering: group by the longest shared leading token that isn't a
 * stopword. This is deliberately simple — it's a UI nicety, not analysis you
 * should bet a content strategy on. Swap in a real embedding/SERP-overlap
 * clusterer (see open-seo's keyword-clustering skill) when it matters.
 */
function groupClusters(related) {
  const STOP = new Set(["best", "free", "top", "the", "a", "how", "what", "why", "for", "to"]);
  const buckets = new Map();

  for (const kw of related) {
    const token = kw.keyword
      .toLowerCase()
      .split(/\s+/)
      .find((t) => t.length > 2 && !STOP.has(t));
    if (!token) continue;
    if (!buckets.has(token)) buckets.set(token, []);
    buckets.get(token).push(kw);
  }

  return [...buckets.entries()]
    .filter(([, kws]) => kws.length >= 2)
    .map(([name, kws]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      keywords: kws.length,
      totalVolume: kws.reduce((sum, k) => sum + k.volume, 0),
      avgDifficulty: Math.round(kws.reduce((s, k) => s + k.difficulty, 0) / kws.length),
      intent: kws[0].intent,
    }))
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 8);
}

export async function keywordOverview(keyword) {
  const [overviewResult, suggestionsResult] = await Promise.all([
    post("/v3/dataforseo_labs/google/keyword_overview/live", {
      keywords: [keyword],
      ...locale(),
    }),
    post("/v3/dataforseo_labs/google/keyword_suggestions/live", {
      keyword,
      limit: 150,
      include_serp_info: false,
      ...locale(),
    }).catch((err) => {
      console.warn("[keyword-overview] suggestions failed:", err.message);
      return [];
    }),
  ]);

  const head = overviewResult?.[0]?.items?.[0];
  if (!head) {
    throw Object.assign(new Error(`No DataForSEO data for keyword "${keyword}"`), {
      statusCode: 404,
    });
  }

  const info = head.keyword_info ?? {};
  const suggestions = (suggestionsResult?.[0]?.items ?? []).map(toRelatedKeyword);

  const questions = suggestions.filter((k) => QUESTION_STARTERS.test(k.keyword));
  const related = suggestions.filter((k) => !QUESTION_STARTERS.test(k.keyword));

  return {
    keyword: head.keyword ?? keyword,
    volume: info.search_volume ?? 0,
    difficulty: head.keyword_properties?.keyword_difficulty ?? 0,
    cpc: Number((info.cpc ?? 0).toFixed?.(2) ?? 0),
    intent: titleCaseIntent(head.search_intent_info?.main_intent),
    competition: info.competition ?? 0,
    volumeTrend: toVolumeTrend(info.monthly_searches),
    related: related.sort((a, b) => b.volume - a.volume).slice(0, 50),
    questions: questions.sort((a, b) => b.volume - a.volume).slice(0, 25),
    clusters: groupClusters(suggestions),
  };
}
