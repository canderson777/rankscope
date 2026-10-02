/**
 * Data API for Rankscope.
 *
 * Two modes, selected by VITE_DATA_SOURCE (see .env.example):
 *
 *   mock (default) — every generator below is deterministic: the same query
 *     always returns the same data (seeded PRNG), so the app behaves like it's
 *     backed by a real index. Costs nothing, needs no API key.
 *
 *   live — domainProfile and keywordOverview hit real DataForSEO data via the
 *     local server in /server; everything else still falls back to mock.
 *
 * Either way the exported `api` object has identical return types, so no
 * component needs to know which mode it's in.
 */

import { Rng, monthLabels } from "../lib/seed";
import { live, LIVE_ENDPOINTS } from "./live";
import { CURATED, NICHES, PATH_STEMS, REF_DOMAIN_STEMS, TLDS, type Niche } from "./niches";
import type {
  AiVisibilityReport, AnswerPreview, AuditIssue, AuditReport, BacklinkProfile,
  BacklinkRow, CompetitorRow, DomainProfile, GapAnalysis, GapKeywordRow, Intent,
  KeywordOverview, KeywordRow, MentionStatus, PageRow, RelatedKeyword,
  Sentiment, SerpFeature, TrendPoint,
} from "./types";
import { AI_PLATFORMS } from "./types";

/* ------------------------------------------------------------------ */
/* Query helpers                                                       */
/* ------------------------------------------------------------------ */

export function isDomain(query: string): boolean {
  const q = query.trim().toLowerCase();
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(q.replace(/^https?:\/\//, "").replace(/\/.*$/, ""));
}

export function normalizeDomain(query: string): string {
  return query.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

export function brandFromDomain(domain: string): string {
  const curated = CURATED[domain];
  if (curated) return curated.brand;
  const stem = domain.split(".")[0].replace(/-/g, " ");
  return stem.replace(/\b\w/g, (c) => c.toUpperCase());
}

function nicheFor(domain: string): Niche {
  const curated = CURATED[domain];
  if (curated) return NICHES.find((n) => n.name === curated.niche)!;
  const rng = new Rng(`niche:${domain}`);
  return rng.pick(NICHES);
}

const INTENTS: Intent[] = ["Informational", "Commercial", "Transactional", "Navigational"];

function intentFor(keyword: string, rng: Rng): Intent {
  if (/^(how|what|why|when|which|guide|tutorial)/.test(keyword)) return "Informational";
  if (/(price|pricing|buy|discount|deal|coupon)/.test(keyword)) return "Transactional";
  if (/(best|top|vs|alternative|review|compare)/.test(keyword)) return "Commercial";
  return rng.pick(INTENTS);
}

function cpcFor(intent: Intent, rng: Rng): number {
  const base = { Informational: 1.2, Commercial: 6.5, Transactional: 9.8, Navigational: 0.8 }[intent];
  return Math.round(base * rng.range(0.4, 1.8) * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Keyword synthesis                                                   */
/* ------------------------------------------------------------------ */

function keywordBank(domain: string, niche: Niche): string[] {
  const rng = new Rng(`kwbank:${domain}`);
  const brand = brandFromDomain(domain).toLowerCase();
  const out = new Set<string>();
  for (const term of niche.terms) {
    out.add(term);
    out.add(`best ${term}`);
    out.add(`${term} ${rng.pick(niche.modifiers)}`);
    out.add(`free ${term}`);
    out.add(`${term} software`);
  }
  out.add(`${brand} pricing`);
  out.add(`${brand} review`);
  out.add(`${brand} alternatives`);
  out.add(`${brand} vs ${rng.pick(niche.brands)}`);
  out.add(`how to choose ${niche.terms[0]}`);
  out.add(`what is ${niche.terms[0]}`);
  return rng.shuffle([...out]);
}

function makeKeywordRows(domain: string, count: number): KeywordRow[] {
  const niche = nicheFor(domain);
  const bank = keywordBank(domain, niche);
  const rng = new Rng(`kwrows:${domain}`);
  return bank.slice(0, count).map((keyword) => {
    const volume = Math.round(Math.pow(10, rng.range(2.3, 5.1)) / 10) * 10;
    const position = rng.chance(0.35) ? rng.int(1, 3) : rng.int(4, 42);
    const intent = intentFor(keyword, rng);
    const ctr = position <= 3 ? rng.range(0.12, 0.32) : position <= 10 ? rng.range(0.02, 0.09) : rng.range(0.001, 0.01);
    return {
      keyword,
      position,
      volume,
      difficulty: rng.int(18, 92),
      cpc: cpcFor(intent, rng),
      intent,
      traffic: Math.round(volume * ctr),
      change: rng.int(-6, 8),
    };
  }).sort((a, b) => b.traffic - a.traffic);
}

/* ------------------------------------------------------------------ */
/* Domain profile                                                      */
/* ------------------------------------------------------------------ */

function competitorDomains(domain: string, n = 6): string[] {
  const niche = nicheFor(domain);
  const rng = new Rng(`compdoms:${domain}`);
  const curatedPeers = Object.entries(CURATED)
    .filter(([d, v]) => v.niche === niche.name && d !== domain)
    .map(([d]) => d);
  const synthetic = niche.brands.map((b) => `${b}${rng.pick(TLDS)}`);
  return rng.shuffle([...curatedPeers, ...synthetic]).slice(0, n);
}

export function getDomainProfile(query: string): DomainProfile {
  const domain = normalizeDomain(query);
  const niche = nicheFor(domain);
  const rng = new Rng(`domain:${domain}`);

  const authorityScore = CURATED[domain] ? rng.int(68, 91) : rng.int(24, 78);
  const scale = Math.pow(authorityScore / 40, 3); // authority drives traffic scale
  const organicTraffic = Math.round(rng.range(40_000, 220_000) * scale);
  const paidTraffic = Math.round(organicTraffic * rng.range(0.04, 0.22));

  const months = monthLabels();
  const organicSeries = rng.series(organicTraffic, 0.08, 0.02);
  const paidSeries = rng.series(paidTraffic, 0.15, 0.01);
  const trafficTrend: TrendPoint[] = months.map((month, i) => ({
    month, organic: organicSeries[i], paid: paidSeries[i],
  }));
  const last = organicSeries[organicSeries.length - 1];
  const prev = organicSeries[organicSeries.length - 2];
  const trafficDelta = Math.round(((last - prev) / prev) * 1000) / 10;

  const competitors: CompetitorRow[] = competitorDomains(domain).map((d) => {
    const crng = new Rng(`comp:${domain}:${d}`);
    return {
      domain: d,
      authority: crng.int(Math.max(10, authorityScore - 25), Math.min(96, authorityScore + 18)),
      commonKeywords: crng.int(180, 4200),
      traffic: Math.round(organicTraffic * crng.range(0.3, 2.4)),
      overlap: crng.int(8, 62),
    };
  }).sort((a, b) => b.overlap - a.overlap);

  const topPages: PageRow[] = rng.sample(PATH_STEMS, 8).map((stem) => {
    const slug = rng.chance(0.5) ? `${stem}/${niche.terms[rng.int(0, niche.terms.length - 1)].replace(/ /g, "-")}` : stem;
    return {
      url: `/${slug}`,
      traffic: Math.round(organicTraffic * rng.range(0.02, 0.18)),
      keywords: rng.int(40, 1800),
      backlinks: rng.int(12, 2400),
    };
  }).sort((a, b) => b.traffic - a.traffic);

  const serpFeatures: SerpFeature[] = [
    "Featured snippet", "People also ask", "Sitelinks", "Image pack",
    "Video carousel", "Knowledge panel", "Local pack", "AI Overview",
  ].map((name) => {
    const present = rng.chance(0.55);
    return { name, present, keywords: present ? rng.int(4, 380) : 0 };
  });

  return {
    domain,
    niche: niche.name,
    authorityScore,
    organicTraffic,
    paidTraffic,
    organicKeywords: rng.int(900, 48_000),
    backlinks: Math.round(rng.range(4_000, 90_000) * scale),
    referringDomains: Math.round(rng.range(300, 6_000) * scale),
    trafficDelta,
    trafficTrend,
    topKeywords: makeKeywordRows(domain, 12),
    competitors,
    topPages,
    serpFeatures,
  };
}

/* ------------------------------------------------------------------ */
/* Keyword research                                                    */
/* ------------------------------------------------------------------ */

const RELATED_TEMPLATES = [
  "best {k}", "{k} software", "{k} tools", "free {k}", "{k} for small business",
  "{k} for beginners", "{k} pricing", "{k} examples", "{k} template",
  "{k} services", "top {k} 2026", "{k} online", "{k} app", "affordable {k}",
];

const QUESTION_TEMPLATES = [
  "what is {k}", "how does {k} work", "how to get started with {k}",
  "is {k} worth it", "how much does {k} cost", "why is {k} important",
  "which {k} is best for small business", "how to improve {k}",
  "what are the benefits of {k}", "can i do {k} myself",
];

export function getKeywordOverview(query: string): KeywordOverview {
  const keyword = query.trim().toLowerCase();
  const rng = new Rng(`kw:${keyword}`);
  const volume = Math.round(Math.pow(10, rng.range(2.6, 5.3)) / 10) * 10;
  const intent = intentFor(keyword, rng);
  const months = monthLabels();
  const volSeries = rng.series(volume, 0.1, 0.01);

  const mk = (tpl: string): RelatedKeyword => {
    const k = tpl.replace("{k}", keyword);
    const r = new Rng(`rel:${k}`);
    const i = intentFor(k, r);
    return {
      keyword: k,
      volume: Math.round(volume * r.range(0.05, 0.7) / 10) * 10 + 10,
      difficulty: r.int(12, 88),
      cpc: cpcFor(i, r),
      intent: i,
    };
  };

  const related = rng.shuffle(RELATED_TEMPLATES).map(mk).sort((a, b) => b.volume - a.volume);
  const questions = rng.shuffle(QUESTION_TEMPLATES).map(mk).sort((a, b) => b.volume - a.volume);

  const clusterNames = [
    `${keyword} basics`, `${keyword} comparisons`, `${keyword} pricing & cost`,
    `${keyword} how-to`, `${keyword} alternatives`, `${keyword} for business`,
  ];
  const clusters = clusterNames.map((name) => {
    const r = new Rng(`cluster:${name}`);
    return {
      name,
      keywords: r.int(6, 64),
      totalVolume: Math.round(volume * r.range(0.4, 3.2) / 10) * 10,
      avgDifficulty: r.int(18, 78),
      intent: r.pick(INTENTS),
    };
  }).sort((a, b) => b.totalVolume - a.totalVolume);

  return {
    keyword,
    volume,
    difficulty: rng.int(15, 92),
    cpc: cpcFor(intent, rng),
    intent,
    competition: Math.round(rng.range(0.05, 0.98) * 100) / 100,
    volumeTrend: months.map((month, i) => ({ month, volume: volSeries[i] })),
    related,
    questions,
    clusters,
  };
}

/* ------------------------------------------------------------------ */
/* Backlinks                                                           */
/* ------------------------------------------------------------------ */

const ANCHOR_TEMPLATES = [
  "{brand}", "{brand} review", "this tool", "read more", "{niche} platform",
  "{brand} — {niche}", "check out {brand}", "www.{domain}", "{niche} software",
  "best {niche} tools", "click here", "{brand} pricing",
];

export function getBacklinkProfile(query: string): BacklinkProfile {
  const domain = normalizeDomain(query);
  const profile = getDomainProfile(domain);
  const rng = new Rng(`backlinks:${domain}`);
  const brand = brandFromDomain(domain);
  const nicheName = profile.niche.toLowerCase();

  const months = monthLabels();
  const newBase = Math.max(40, Math.round(profile.backlinks * 0.012));
  const newSeries = rng.series(newBase, 0.25, 0.02);
  const lostSeries = rng.series(Math.round(newBase * 0.6), 0.3, 0);

  const buckets = ["0–20", "21–40", "41–60", "61–80", "81–100"];
  const weights = [0.34, 0.31, 0.2, 0.11, 0.04];
  const authorityBuckets = buckets.map((bucket, i) => ({
    bucket,
    count: Math.round(profile.referringDomains * weights[i] * rng.range(0.85, 1.15)),
  }));

  const rows: BacklinkRow[] = Array.from({ length: 25 }, (_, i) => {
    const r = new Rng(`bl:${domain}:${i}`);
    const refStem = r.pick(REF_DOMAIN_STEMS);
    const refTld = refStem === "dev-to" ? "" : r.pick([".com", ".com", ".org", ".io"]);
    const source = refStem === "dev-to" ? "dev.to" : `${refStem}${refTld}`;
    const anchor = r.pick(ANCHOR_TEMPLATES)
      .replace("{brand}", brand).replace("{niche}", nicheName).replace("{domain}", domain);
    const slug = r.pick(["best-tools", "review", "roundup", "comparison", "resources", "top-picks", "guide"]);
    const daysAgo = r.int(1, 320);
    const d = new Date(2026, 6, 8);
    d.setDate(d.getDate() - daysAgo);
    return {
      sourceUrl: `${source}/${slug}-${r.int(2024, 2026)}`,
      targetUrl: `${domain}${r.chance(0.4) ? "/" + r.pick(PATH_STEMS) : ""}`,
      anchor,
      authority: r.int(12, 94),
      follow: r.chance(0.72),
      firstSeen: d.toISOString().slice(0, 10),
    };
  }).sort((a, b) => b.authority - a.authority);

  return {
    domain,
    total: profile.backlinks,
    referringDomains: profile.referringDomains,
    newLast30: newSeries[newSeries.length - 1],
    lostLast30: lostSeries[lostSeries.length - 1],
    followShare: rng.int(62, 88),
    authorityBuckets,
    newLostTrend: months.map((month, i) => ({ month, gained: newSeries[i], lost: lostSeries[i] })),
    rows,
  };
}

/* ------------------------------------------------------------------ */
/* Site audit                                                          */
/* ------------------------------------------------------------------ */

const ISSUE_CATALOG: Omit<AuditIssue, "pagesAffected">[] = [
  { id: "meta-title", title: "Missing meta titles", category: "On-page", severity: "Error", priority: "High", description: "Pages without a <title> tag can't communicate relevance to search or answer engines." },
  { id: "dup-desc", title: "Duplicate meta descriptions", category: "On-page", severity: "Warning", priority: "Medium", description: "Identical descriptions across pages reduce click-through and confuse snippet selection." },
  { id: "broken-links", title: "Broken internal links", category: "Crawlability", severity: "Error", priority: "High", description: "Links resolving to 4xx waste crawl budget and strand link equity." },
  { id: "slow-pages", title: "Slow pages (LCP > 4s)", category: "Performance", severity: "Error", priority: "High", description: "Pages failing Core Web Vitals thresholds are demoted in ranking systems." },
  { id: "alt-text", title: "Images missing alt text", category: "Accessibility", severity: "Warning", priority: "Medium", description: "Missing alt attributes hurt accessibility and image search visibility." },
  { id: "thin-content", title: "Thin content (< 300 words)", category: "Content", severity: "Warning", priority: "Medium", description: "Low word-count pages rarely earn rankings or AI citations on competitive topics." },
  { id: "h1-missing", title: "Missing H1 headings", category: "On-page", severity: "Warning", priority: "Low", description: "Pages without a top-level heading lose an easy relevance signal." },
  { id: "redirect-chains", title: "Redirect chains", category: "Crawlability", severity: "Notice", priority: "Low", description: "Multi-hop redirects slow crawling and dilute signals along the chain." },
  { id: "no-schema", title: "Pages without structured data", category: "Structured data", severity: "Notice", priority: "Medium", description: "Missing schema limits eligibility for rich results and AI answer citation." },
  { id: "mixed-content", title: "Mixed content (HTTP assets)", category: "Security", severity: "Error", priority: "Medium", description: "Insecure assets on HTTPS pages trigger browser warnings and trust issues." },
  { id: "canonical", title: "Conflicting canonical tags", category: "Indexability", severity: "Warning", priority: "High", description: "Contradictory canonicals let search engines pick the wrong URL to index." },
  { id: "orphan-pages", title: "Orphan pages", category: "Site architecture", severity: "Notice", priority: "Low", description: "Pages with no internal links are hard for crawlers and users to discover." },
];

export function getAuditReport(query: string): AuditReport {
  const domain = normalizeDomain(query);
  const rng = new Rng(`audit:${domain}`);
  const crawledPages = rng.int(180, 6200);

  const issues: AuditIssue[] = ISSUE_CATALOG
    .filter(() => rng.chance(0.85))
    .map((issue) => ({
      ...issue,
      pagesAffected: Math.max(1, Math.round(crawledPages * rng.range(0.002, issue.severity === "Notice" ? 0.15 : 0.06))),
    }))
    .sort((a, b) => {
      const sev = { Error: 0, Warning: 1, Notice: 2 };
      return sev[a.severity] - sev[b.severity] || b.pagesAffected - a.pagesAffected;
    });

  const errors = issues.filter((i) => i.severity === "Error").reduce((s, i) => s + i.pagesAffected, 0);
  const warnings = issues.filter((i) => i.severity === "Warning").reduce((s, i) => s + i.pagesAffected, 0);
  const notices = issues.filter((i) => i.severity === "Notice").reduce((s, i) => s + i.pagesAffected, 0);
  const healthScore = Math.max(38, Math.min(96, Math.round(100 - (errors * 3 + warnings) / crawledPages * 100)));

  return { domain, healthScore, crawledPages, errors, warnings, notices, issues };
}

/* ------------------------------------------------------------------ */
/* Competitor gap                                                      */
/* ------------------------------------------------------------------ */

export function getGapAnalysis(query: string, chosen?: string[]): GapAnalysis {
  const domain = normalizeDomain(query);
  const niche = nicheFor(domain);
  const competitors = (chosen && chosen.length === 3 ? chosen : competitorDomains(domain, 3)).slice(0, 3);
  const rng = new Rng(`gap:${domain}:${competitors.join(",")}`);
  const bank = keywordBank(domain, niche);

  const mkRow = (keyword: string, ranked: boolean): GapKeywordRow => {
    const r = new Rng(`gaprow:${domain}:${keyword}`);
    return {
      keyword,
      volume: Math.round(Math.pow(10, r.range(2.4, 4.9)) / 10) * 10,
      difficulty: r.int(14, 90),
      intent: intentFor(keyword, r),
      myPosition: ranked ? r.int(2, 30) : null,
      positions: competitors.map(() => (r.chance(0.78) ? r.int(1, 25) : null)),
    };
  };

  const shared = bank.slice(0, 10).map((k) => mkRow(k, true)).sort((a, b) => b.volume - a.volume);
  const missing = bank.slice(10, 20)
    .concat(niche.topics.map((t) => `${t} guide`))
    .slice(0, 10)
    .map((k) => mkRow(k, false))
    .sort((a, b) => b.volume - a.volume);

  const backlinkGap = rng.sample(REF_DOMAIN_STEMS, 10).map((stem) => {
    const r = new Rng(`blgap:${domain}:${stem}`);
    const linksToMe = r.chance(0.25);
    return {
      referringDomain: stem === "dev-to" ? "dev.to" : `${stem}.com`,
      authority: r.int(35, 95),
      linksToMe,
      linksTo: competitors.map(() => r.chance(0.7)),
    };
  }).sort((a, b) => b.authority - a.authority);

  const opportunities = rng.sample(niche.topics, 6).map((topic) => {
    const r = new Rng(`opp:${domain}:${topic}`);
    return {
      topic,
      volume: Math.round(Math.pow(10, r.range(2.5, 4.5)) / 10) * 10,
      difficulty: r.int(15, 70),
      competitorsCovering: r.int(1, 3),
      angle: r.pick([
        "In-depth guide with original data",
        "Comparison page targeting decision-stage searches",
        "Free template + tutorial combo",
        "Expert roundup with quotable statistics",
        "Interactive tool or calculator",
        "FAQ hub answering long-tail questions",
      ]),
    };
  }).sort((a, b) => b.volume - a.volume);

  return { domain, competitors, shared, missing, backlinkGap, opportunities };
}

/* ------------------------------------------------------------------ */
/* AI Visibility (AEO / GEO)                                           */
/* ------------------------------------------------------------------ */

const SENTIMENTS: Sentiment[] = ["Positive", "Neutral", "Negative"];
const MENTION_STATUSES: MentionStatus[] = ["Recommended", "Mentioned", "Compared", "Ignored"];

export function getAiVisibilityReport(query: string): AiVisibilityReport {
  const domain = normalizeDomain(query);
  const profile = getDomainProfile(domain);
  const niche = nicheFor(domain);
  const brand = brandFromDomain(domain);
  const rng = new Rng(`ai:${domain}`);

  const overallScore = Math.max(8, Math.min(94, profile.authorityScore + rng.int(-18, 10)));
  const months = monthLabels();
  const scoreSeries = rng.series(overallScore, 0.09, 0.03).map((v) => Math.min(96, Math.max(4, Math.round(v))));
  const scoreDelta = scoreSeries[scoreSeries.length - 1] - scoreSeries[scoreSeries.length - 2];

  const platforms = AI_PLATFORMS.map((platform) => {
    const r = new Rng(`aiplat:${domain}:${platform}`);
    return {
      platform,
      score: Math.max(4, Math.min(97, overallScore + r.int(-22, 22))),
      mentions: r.int(6, 240),
      citations: r.int(2, 120),
      delta: r.int(-8, 14),
    };
  });

  const promptBank = [
    `best ${niche.terms[0]} for small businesses`,
    `what are alternatives to ${rng.pick(niche.brands)}.com`,
    `${niche.terms[1]} recommendations`,
    `how do I choose ${niche.terms[0]}`,
    `is ${brand} good for ${niche.modifiers[0].replace("for ", "")}`,
    `${brand} vs ${rng.pick(niche.brands)}`,
    `top rated ${niche.terms[2] ?? niche.terms[0]}`,
    `cheapest ${niche.terms[0]} in 2026`,
  ];

  const mentions = promptBank.slice(0, 8).map((prompt, i) => {
    const r = new Rng(`mention:${domain}:${i}`);
    const status = r.pick(MENTION_STATUSES);
    const sentiment: Sentiment = status === "Ignored" ? "Neutral" : r.pick(SENTIMENTS);
    const d = new Date(2026, 6, 8);
    d.setDate(d.getDate() - r.int(0, 28));
    const snippets: Record<MentionStatus, string> = {
      Recommended: `"…for this use case, ${brand} is one of the strongest options thanks to its ${r.pick(niche.terms)} features…"`,
      Mentioned: `"…tools in this space include ${r.pick(niche.brands)}, ${brand}, and ${r.pick(niche.brands)}…"`,
      Compared: `"…${brand} offers simpler ${r.pick(niche.terms)}, while ${r.pick(niche.brands)} is better for larger teams…"`,
      Ignored: `"…popular choices are ${r.pick(niche.brands)}, ${r.pick(niche.brands)} and ${r.pick(niche.brands)}…" (${brand} not mentioned)`,
    };
    return {
      prompt,
      platform: r.pick(AI_PLATFORMS),
      status,
      sentiment,
      snippet: snippets[status],
      date: d.toISOString().slice(0, 10),
    };
  });

  const queries = promptBank.map((prompt, i) => {
    const r = new Rng(`aiq:${domain}:${i}`);
    return {
      prompt,
      intent: intentFor(prompt, r),
      difficulty: r.int(18, 88),
      opportunity: r.int(30, 96),
      visibility: r.pick(MENTION_STATUSES),
      angle: r.pick([
        "Publish a comparison page with a clear verdict",
        "Add an FAQ section answering this verbatim",
        "Create a data-backed 'best of' listicle",
        "Ship a how-to guide with step screenshots",
        "Earn a mention in a high-authority roundup",
        "Add pricing transparency page with schema",
      ]),
    };
  }).sort((a, b) => b.opportunity - a.opportunity);

  const aiCompetitors = competitorDomains(domain, 4).map((d) => {
    const r = new Rng(`aicomp:${domain}:${d}`);
    return {
      domain: d,
      shareOfMentions: r.int(4, 34),
      recommendationRate: r.int(8, 62),
      citationRate: r.int(5, 48),
      sentiment: r.pick(SENTIMENTS),
    };
  }).sort((a, b) => b.shareOfMentions - a.shareOfMentions);

  const missingTopics = rng.sample(niche.topics, 4);

  const sourceTypes = ["Blog post", "Review site", "Reddit thread", "YouTube video", "News article", "Comparison page", "Documentation"] as const;
  const citationSources = sourceTypes.map((type) => {
    const r = new Rng(`cite:${domain}:${type}`);
    const stem = r.pick(REF_DOMAIN_STEMS);
    const host = type === "Reddit thread" ? "reddit.com" : type === "YouTube video" ? "youtube.com" : type === "Documentation" ? `docs.${domain}` : `${stem}.com`;
    const titles: Record<typeof type, string> = {
      "Blog post": `The state of ${niche.terms[0]} in 2026`,
      "Review site": `${brand} review: pros, cons & pricing`,
      "Reddit thread": `What ${niche.terms[0]} does everyone actually use?`,
      "YouTube video": `${brand} full walkthrough & honest review`,
      "News article": `${niche.name} market heats up as AI reshapes workflows`,
      "Comparison page": `${brand} vs ${r.pick(niche.brands)}: which fits your team?`,
      "Documentation": `${brand} developer & API documentation`,
    };
    return {
      title: titles[type],
      url: `${host}/${r.int(1000, 9999)}`,
      type,
      authority: r.int(30, 95),
      freshness: r.pick(["3 days ago", "1 week ago", "2 weeks ago", "1 month ago", "3 months ago", "6 months ago"]),
      citations: r.int(2, 64),
    };
  }).sort((a, b) => b.citations - a.citations);

  const aeoOpportunities = [
    {
      title: `${brand} vs ${rng.pick(niche.brands)}: honest comparison`,
      targetQuestion: `what are alternatives to ${rng.pick(niche.brands)}`,
      intent: "Commercial" as Intent,
      pageType: "Comparison page" as const,
      schema: "Product + FAQPage",
      outline: ["Side-by-side feature table", "Pricing breakdown", "Best-fit recommendations by team size", "Migration guide", "FAQ block"],
    },
    {
      title: `What is ${niche.terms[0]}? A plain-English guide`,
      targetQuestion: `what is ${niche.terms[0]}`,
      intent: "Informational" as Intent,
      pageType: "Definition / explainer" as const,
      schema: "Article + FAQPage",
      outline: ["One-sentence definition up top", "How it works", "Who needs it", "Common mistakes", "Glossary of terms"],
    },
    {
      title: `Best ${niche.terms[0]} ${niche.modifiers[0]} (2026)`,
      targetQuestion: `best ${niche.terms[0]} ${niche.modifiers[0]}`,
      intent: "Commercial" as Intent,
      pageType: "Best-of listicle" as const,
      schema: "ItemList + Review",
      outline: ["Selection criteria", "Top 7 picks with verdicts", "Pricing comparison table", "How we tested", "FAQ block"],
    },
    {
      title: `${brand} frequently asked questions`,
      targetQuestion: `is ${brand} worth it`,
      intent: "Commercial" as Intent,
      pageType: "FAQ page" as const,
      schema: "FAQPage",
      outline: ["Pricing questions", "Feature questions", "Security & compliance", "Migration & onboarding", "Support & SLAs"],
    },
    {
      title: `How to set up ${niche.terms[1]} step by step`,
      targetQuestion: `how to get started with ${niche.terms[1]}`,
      intent: "Informational" as Intent,
      pageType: "How-to guide" as const,
      schema: "HowTo",
      outline: ["Prerequisites", "Step-by-step with screenshots", "Common pitfalls", "Checklist", "Next steps"],
    },
  ].map((o, i) => {
    const r = new Rng(`aeo:${domain}:${i}`);
    return { ...o, priority: r.int(55, 97) };
  }).sort((a, b) => b.priority - a.priority);

  const checklistCatalog: { item: string; impact: "High" | "Medium" | "Low"; description: string }[] = [
    { item: "Clear brand positioning statement", impact: "High", description: "A one-line 'what we do, for whom' on the homepage that engines can quote verbatim." },
    { item: "Authoritative comparison pages", impact: "High", description: "Own the 'you vs competitor' narrative instead of leaving it to third parties." },
    { item: "FAQ schema on key pages", impact: "High", description: "Structured Q&A is the easiest content for answer engines to lift." },
    { item: "Organization schema", impact: "Medium", description: "Declares the entity: name, logo, founders, sameAs profiles." },
    { item: "Product / service schema", impact: "Medium", description: "Machine-readable descriptions of what you sell, with pricing." },
    { item: "Fresh content dates", impact: "Medium", description: "Visible updated-on dates; engines discount stale sources." },
    { item: "Third-party mentions & reviews", impact: "High", description: "AI answers lean on G2, Reddit, and review sites — seed presence there." },
    { item: "Consistent entity information", impact: "Medium", description: "Identical name, category, and description across site, LinkedIn, Crunchbase." },
    { item: "Strong About page", impact: "Low", description: "Team, history, and credentials — raw material for entity understanding." },
    { item: "Review / profile pages claimed", impact: "Medium", description: "Claimed and completed G2, Capterra, Trustpilot profiles." },
    { item: "Expert quotes and citations", impact: "Low", description: "Named experts with credentials make content citable." },
  ];
  const geoChecklist = checklistCatalog.map((c, i) => {
    const r = new Rng(`geo:${domain}:${i}`);
    return { ...c, status: r.pick(["Done", "Partial", "Missing"] as const) };
  });

  const entityDims = [
    { dimension: "Brand name consistency", note: "Same spelling and casing across web properties" },
    { dimension: "Category clarity", note: `How clearly the site says it's a ${niche.name.toLowerCase()} product` },
    { dimension: "Target audience clarity", note: "Who it's for is stated, not implied" },
    { dimension: "Service / product clarity", note: "Plain-language description of what you sell" },
    { dimension: "External mentions", note: "Volume and quality of third-party references" },
    { dimension: "Knowledge graph readiness", note: "Structured data + Wikipedia/Wikidata presence" },
  ];
  const entity = entityDims.map((e, i) => {
    const r = new Rng(`entity:${domain}:${i}`);
    return { ...e, score: Math.max(10, Math.min(98, overallScore + r.int(-25, 20))) };
  });

  return {
    domain,
    brand,
    overallScore,
    scoreDelta,
    scoreTrend: months.map((month, i) => ({ month, score: scoreSeries[i] })),
    platforms,
    mentions,
    queries,
    aiCompetitors,
    missingTopics,
    citationSources,
    aeoOpportunities,
    geoChecklist,
    entity,
  };
}

export function getAnswerPreview(query: string, prompt: string): AnswerPreview {
  const domain = normalizeDomain(query);
  const niche = nicheFor(domain);
  const brand = brandFromDomain(domain);
  const rng = new Rng(`answer:${domain}:${prompt.toLowerCase().trim()}`);

  const brandAppears = rng.chance(0.55);
  const brandStatus: MentionStatus = brandAppears ? rng.pick(["Recommended", "Mentioned", "Compared"]) : "Ignored";
  const comps = rng.sample(niche.brands, 3).map((b) => b.charAt(0).toUpperCase() + b.slice(1));

  const opener = `There are several strong options depending on your team size and budget. For most people evaluating ${niche.terms[0]}, the decision comes down to ease of setup, integrations, and pricing.`;
  const withBrand = brandStatus === "Recommended"
    ? `${comps[0]} and ${comps[1]} are popular picks, but ${brand} stands out for its ${rng.pick(niche.terms)} capabilities and is frequently praised for a fast onboarding experience.`
    : brandStatus === "Compared"
      ? `${comps[0]} is a common default, while ${brand} offers a simpler take on ${rng.pick(niche.terms)} — the trade-off is fewer enterprise controls than ${comps[1]}.`
      : `Popular options include ${comps[0]}, ${brand}, and ${comps[1]}, each with different pricing models and depth of ${rng.pick(niche.terms)} features.`;
  const withoutBrand = `${comps[0]} is the most frequently recommended choice, followed by ${comps[1]} for smaller teams and ${comps[2]} for enterprises with more complex ${rng.pick(niche.terms)} needs.`;
  const closer = `Before committing, run a two-week trial with your real workflow, and check recent reviews on G2 and Reddit for up-to-date pricing changes.`;

  const suggestions = brandAppears
    ? [
        `Strengthen the citation trail: pitch inclusion in 2–3 high-authority "${prompt}" roundups.`,
        `Add an FAQPage block answering "${prompt}" verbatim on a dedicated landing page.`,
        `Publish fresh comparison content vs ${comps[0]} — engines favor recent, specific sources.`,
      ]
    : [
        `Create a dedicated page targeting "${prompt}" with a direct, quotable answer in the first 60 words.`,
        `${brand} is absent from the sources engines cite here — earn mentions on review sites and Reddit threads covering this question.`,
        `Add ItemList + FAQ schema so answer engines can parse your recommendation structure.`,
        `Publish a comparison vs ${comps[0]} to enter the consideration set.`,
      ];

  return {
    prompt,
    paragraphs: [opener, brandAppears ? withBrand : withoutBrand, closer],
    brandAppears,
    brandStatus,
    competitorsMentioned: comps,
    citedSources: rng.sample(REF_DOMAIN_STEMS, 3).map((s) => (s === "dev-to" ? "dev.to" : `${s}.com`)),
    suggestions,
  };
}

/* ------------------------------------------------------------------ */
/* Async layer                                                         */
/* ------------------------------------------------------------------ */

const LATENCY = () => 450 + Math.random() * 500;
function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY()));
}

/** The original seeded-mock API. Always available, always free. */
export const mockApi = {
  domainProfile: (q: string) => delay(getDomainProfile(q)),
  keywordOverview: (q: string) => delay(getKeywordOverview(q)),
  backlinkProfile: (q: string) => delay(getBacklinkProfile(q)),
  auditReport: (q: string) => delay(getAuditReport(q)),
  gapAnalysis: (q: string, competitors?: string[]) => delay(getGapAnalysis(q, competitors)),
  aiVisibility: (q: string) => delay(getAiVisibilityReport(q)),
  answerPreview: (q: string, prompt: string) => delay(getAnswerPreview(q, prompt)),
  /**
   * Search Console is first-party Google data — we never fake it. In mock mode
   * the page shows the connection state instead of invented impressions.
   */
  gscStatus: () => delay({ configured: false, connected: false, siteUrl: null, hint: "Mock mode — run with VITE_DATA_SOURCE=live to connect Google Search Console." }),
  gscReport: () =>
    delay({
      domain: "",
      siteUrl: null,
      days: 28,
      startDate: "",
      endDate: "",
      totals: { clicks: 0, impressions: 0, ctr: 0, avgPosition: 0, queries: 0 },
      strikingDistance: [],
      note: "Connect Google Search Console to see real first-party impressions.",
    }),
  gscOverview: () =>
    delay({
      domain: "",
      siteUrl: "",
      days: 90,
      startDate: "",
      endDate: "",
      clicks: 0,
      impressions: 0,
      ctr: 0,
      avgPosition: 0,
      queries: 0,
      topQueries: [],
      topPages: [],
      trend: [],
      strikingDistance: [],
      note: "Connect Google Search Console to see real first-party impressions.",
    }),
};

/**
 * Live mode is opt-in via VITE_DATA_SOURCE=live (see .env.example) and requires
 * the local API server to be running: `npm run dev` starts both.
 *
 * Only the endpoints listed in LIVE_ENDPOINTS are wired to DataForSEO so far —
 * the rest transparently fall back to mock data so the app stays usable while
 * you migrate one route at a time.
 */
export const IS_LIVE = import.meta.env.VITE_DATA_SOURCE === "live";

export const api = IS_LIVE
  ? {
      ...mockApi,
      domainProfile: live.domainProfile,
      keywordOverview: live.keywordOverview,
      auditReport: live.auditReport,
      backlinkProfile: live.backlinkProfile,
      gapAnalysis: live.gapAnalysis,
      aiVisibility: live.aiVisibility,
      gscStatus: live.gscStatus,
      gscReport: live.gscReport,
      gscOverview: live.gscOverview,
    }
  : mockApi;

if (IS_LIVE && typeof console !== "undefined") {
  const mocked = Object.keys(mockApi).filter(
    (k) => !(LIVE_ENDPOINTS as readonly string[]).includes(k),
  );
  console.info(
    `[rankscope] live data for: ${LIVE_ENDPOINTS.join(", ")} — still mocked: ${mocked.join(", ")}`,
  );
}
