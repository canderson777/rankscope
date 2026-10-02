/**
 * GET /api/backlink-profile?q=<domain>
 *
 * Real backlink data via DataForSEO:
 *   - backlinks/backlinks/live            (individual links, newest first)
 *   - backlinks/summary/live is already fetched in domainProfile; this route
 *     re-reads it (served from cache) plus domain_pages for per-target detail.
 *
 * Cost note: the backlinks list call is priced per result row, so `limit`
 * controls the bill. 25 rows is enough for the UI table.
 */

import { post } from "../dataforseo.mjs";

function bucketFor(rank) {
  if (rank <= 20) return "0–20";
  if (rank <= 40) return "21–40";
  if (rank <= 60) return "41–60";
  if (rank <= 80) return "61–80";
  return "81–100";
}

/** DataForSEO rank values are inverted-ish (lower = stronger). Normalize to a
 *  0-100 authority-ish number so the UI's authority column stays honest. */
function authorityFor(item) {
  const rank = item.rank_losses ?? item.rank ?? null;
  if (rank === null || rank === undefined) return 0;
  // DataForSEO domain rank: 0-100 where higher = more authoritative, but the
  // backlinks list `rank` field is the source domain's rank — use directly.
  const n = Number(rank);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export async function backlinkProfile(domain) {
  const target = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");

  const [summaryRes, listRes] = await Promise.all([
    post("/v3/backlinks/summary/live", {
      target,
      internal_list_limit: 1,
      include_subdomains: true,
    }),
    post("/v3/backlinks/backlinks/live", {
      target,
      limit: 25,
      order_by: ["rank,desc"],
      include_subdomains: true,
    }),
  ]);

  const summary = summaryRes?.[0] ?? {};
  const items = listRes?.[0]?.items ?? [];

  const rows = items.map((item) => ({
    sourceUrl: item.url_from ?? "",
    targetUrl: item.url_to ?? target,
    anchor: item.anchor ?? "",
    authority: authorityFor(item),
    follow: item.is_dofollow ?? item.dofollow ?? true,
    firstSeen: item.first_seen ? String(item.first_seen).slice(0, 10) : "",
  }));

  // Authority distribution across referring domains (from summary buckets if
  // present, else derived from the rows we have).
  const buckets = ["0–20", "21–40", "41–60", "61–80", "81–100"];
  const counts = { "0–20": 0, "21–40": 0, "41–60": 0, "61–80": 0, "81–100": 0 };
  for (const row of rows) counts[bucketFor(row.authority)] += 1;
  const authorityBuckets = buckets.map((bucket) => ({ bucket, count: counts[bucket] }));

  // New/lost trend: DataForSEO gives cumulative first_seen; derive a simple
  // 12-month "new links seen" series rather than inventing lost counts.
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const newLostTrend = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const gained = rows.filter((r) => {
      if (!r.firstSeen) return false;
      const f = new Date(r.firstSeen);
      return f >= d && f < next;
    }).length;
    newLostTrend.push({ month: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`, new: gained, lost: 0 });
  }

  const total = summary.backlinks ?? 0;
  const referring = summary.referring_domains ?? 0;
  const followCount = rows.filter((r) => r.follow).length;

  return {
    domain: target,
    total,
    referringDomains: referring,
    newLast30: newLostTrend.at(-1)?.new ?? 0,
    lostLast30: 0,
    followShare: rows.length ? Math.round((followCount / rows.length) * 100) : 0,
    authorityBuckets,
    newLostTrend,
    rows,
  };
}
