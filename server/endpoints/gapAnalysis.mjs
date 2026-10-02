/**
 * GET /api/gap-analysis?q=<domain>&competitors=a.com,b.com,c.com
 *
 * Real keyword gap via DataForSEO:
 *   - For each competitor: dataforseo_labs/google/ranked_keywords/live (limit 100)
 *   - For our domain: ranked_keywords (cached — same call domainProfile makes)
 *
 *   "missing"  = keywords a competitor ranks for that we don't (top by volume)
 *   "shared"   = keywords we rank for (from our own ranked set)
 *
 * Cost: 1 call per competitor + 1 cached call for us. With the 24h cache,
 * repeat views are free.
 *
 * Backlink gap: backlinks/domain_intersection (ref domains linking to a
 * competitor but not to us).
 */

import { post, locale } from "../dataforseo.mjs";

function titleCaseIntent(raw) {
  switch ((raw || "").toLowerCase()) {
    case "informational": return "Informational";
    case "commercial": return "Commercial";
    case "transactional": return "Transactional";
    case "navigational": return "Navigational";
    default: return "Informational";
  }
}

async function topCompetitors(target, limit = 3) {
  try {
    const res = await post("/v3/dataforseo_labs/google/competitors_domain/live", {
      target,
      limit,
      ...locale(),
    });
    const found = (res?.[0]?.items ?? []).map((i) => i.domain).filter(Boolean).slice(0, limit);
    if (found.length) return found;
  } catch {
    /* fall through */
  }
  // Domains with little/no ranking footprint get no organic competitors from
  // DataForSEO. Fall back to known peers in the AI-newsletter niche so the gap
  // section still shows real SERP data.
  return ["therundown.ai", "bensbites.com", "thebatch.ai"].slice(0, limit);
}

/** Flatten a ranked_keywords result into { keyword, volume, difficulty, intent, position } rows. */
function flattenRanked(res) {
  const items = res?.[0]?.items ?? [];
  return items.map((item) => {
    const kd = item.keyword_data ?? {};
    const info = kd.keyword_info ?? {};
    return {
      keyword: kd.keyword ?? "",
      volume: info.search_volume ?? 0,
      difficulty: kd.keyword_properties?.keyword_difficulty ?? 0,
      intent: titleCaseIntent(kd.search_intent_info?.main_intent),
      position: item.ranked_serp_element?.serp_item?.rank_absolute ?? null,
    };
  }).filter((r) => r.keyword);
}

export async function gapAnalysis(domain, competitorParam) {
  const target = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");

  const compList = typeof competitorParam === "string" ? competitorParam : (competitorParam?.get?.("competitors") ?? "");
  let competitors = compList
    .split(",")
    .map((c) => c.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, ""))
    .filter(Boolean)
    .slice(0, 3);
  if (competitors.length === 0) competitors = await topCompetitors(target);

  // Our ranked set (cached from domainProfile's identical call).
  const oursRes = await post("/v3/dataforseo_labs/google/ranked_keywords/live", {
    target,
    limit: 200,
    order_by: ["ranked_serp_element.serp_item.etv,desc"],
    ...locale(),
  }).catch(() => []);
  const ours = flattenRanked(oursRes);
  const ourKeywords = new Set(ours.map((r) => r.keyword.toLowerCase()));

  // Each competitor's ranked set (limit keeps the bill small).
  const competitorSets = await Promise.all(
    competitors.map(async (comp) => {
      try {
        const res = await post("/v3/dataforseo_labs/google/ranked_keywords/live", {
          target: comp,
          limit: 100,
          order_by: ["ranked_serp_element.serp_item.etv,desc"],
          ...locale(),
        });
        return { comp, rows: flattenRanked(res) };
      } catch {
        return { comp, rows: [] };
      }
    }),
  );

  // Missing = competitor keyword not in our set. Best-of across competitors.
  const missingMap = new Map();
  for (const { comp, rows } of competitorSets) {
    for (const row of rows) {
      const key = row.keyword.toLowerCase();
      if (ourKeywords.has(key)) continue;
      const existing = missingMap.get(key);
      if (existing) existing.positions.push(row.position);
      else missingMap.set(key, { ...row, positions: [row.position], coveringBy: [comp] });
    }
  }
  const missing = [...missingMap.values()]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 15)
    .map((r) => ({
      keyword: r.keyword,
      volume: r.volume,
      difficulty: r.difficulty,
      intent: r.intent,
      myPosition: null,
      positions: r.positions.slice(0, 3),
    }));

  const shared = ours.slice(0, 10).map((r) => ({
    keyword: r.keyword,
    volume: r.volume,
    difficulty: r.difficulty,
    intent: r.intent,
    myPosition: r.position,
    positions: competitors.map(() => null),
  }));

  // Backlink gap: ref domains linking to competitors but not to us.
  const blRes = await post("/v3/backlinks/domain_intersection/live", {
    target: competitors[0],
    exclude_target: target,
    limit: 15,
  }).catch(() => []);

  const backlinkGap = (blRes?.[0]?.items ?? []).map((item) => ({
    referringDomain: item.domain_from ?? "",
    authority: Math.round(item.rank ?? item.domain_rank ?? 0),
    linksToMe: false,
    linksTo: competitors.map((c) => String(item.domain_from ?? "").includes(c.split(".")[0])),
  })).filter((r) => r.referringDomain);

  const opportunities = missing.slice(0, 10).map((row) => ({
    topic: row.keyword,
    volume: row.volume,
    difficulty: row.difficulty,
    competitorsCovering: row.positions.filter((p) => p !== null).length,
    angle: "Competitors rank for this; create a page (or expand an existing one) targeting it",
  }));

  return { domain: target, competitors, shared, missing, backlinkGap, opportunities };
}
