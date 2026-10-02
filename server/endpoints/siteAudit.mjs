/**
 * GET /api/audit-report?q=<domain>
 *
 * Real technical SEO audit via Google PageSpeed Insights — **free**, no DataForSEO
 * credits consumed. An API key is optional and only raises the rate limit.
 *
 *   https://developers.google.com/speed/docs/insights/v5/get-started
 *
 * Honest limitation: PSI audits ONE URL, not a whole site. `crawledPages` is
 * therefore 1. This is a page audit presented in the site-audit UI — good enough
 * to find the issues that matter on a homepage, but it is not a crawl. Wiring a
 * real multi-page crawl means DataForSEO's /v3/on_page/ task flow (paid).
 */

import { config } from "../env.mjs";
import * as cache from "../cache.mjs";

const PSI = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/** Lighthouse categories we care about, and their weight in the health score. */
const CATEGORY_WEIGHTS = {
  seo: 0.4,
  performance: 0.3,
  "best-practices": 0.2,
  accessibility: 0.1,
};

const CATEGORY_LABELS = {
  seo: "SEO",
  performance: "Performance",
  "best-practices": "Best Practices",
  accessibility: "Accessibility",
};

/** Audits that are informational only — no pass/fail, so not an "issue". */
const NON_SCORING = new Set(["informative", "manual", "notApplicable"]);

function severityFor(score) {
  if (score === null || score === undefined) return null;
  if (score < 0.5) return "Error";
  if (score < 0.9) return "Warning";
  if (score < 1) return "Notice";
  return null; // passed
}

function priorityFor(severity, weight) {
  if (severity === "Error") return weight > 0 ? "High" : "Medium";
  if (severity === "Warning") return weight > 0 ? "Medium" : "Low";
  return "Low";
}

/** Strip Lighthouse's markdown links out of descriptions for clean table text. */
function cleanDescription(text = "") {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export async function siteAudit(domain) {
  const target = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const url = `https://${target}`;

  const cacheKey = { url, strategy: "mobile" };
  const cached = cache.read("pagespeed", cacheKey);
  if (cached) {
    console.log(`[pagespeed] cache hit  ${url}`);
    return cached;
  }

  const params = new URLSearchParams({ url, strategy: "mobile" });
  for (const category of Object.keys(CATEGORY_WEIGHTS)) {
    params.append("category", category.toUpperCase().replace(/-/g, "_"));
  }
  if (config.pagespeedKey) params.set("key", config.pagespeedKey);

  console.log(`[pagespeed] auditing  ${url}  (free — no DataForSEO credits)`);

  const res = await fetch(`${PSI}?${params}`);

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error?.message) detail = body.error.message;
    } catch {
      /* keep status text */
    }
    throw Object.assign(new Error(`PageSpeed Insights: ${detail}`), {
      statusCode: res.status === 429 ? 429 : 502,
    });
  }

  const json = await res.json();
  const lh = json.lighthouseResult;
  if (!lh) {
    throw Object.assign(new Error(`PageSpeed Insights returned no result for ${url}`), {
      statusCode: 502,
    });
  }

  // Map each audit id -> { category, weight } using the category auditRefs.
  const auditMeta = new Map();
  for (const [key, category] of Object.entries(lh.categories ?? {})) {
    for (const ref of category.auditRefs ?? []) {
      if (!auditMeta.has(ref.id)) {
        auditMeta.set(ref.id, {
          category: CATEGORY_LABELS[key] ?? key,
          weight: ref.weight ?? 0,
        });
      }
    }
  }

  const issues = [];
  for (const [id, audit] of Object.entries(lh.audits ?? {})) {
    if (NON_SCORING.has(audit.scoreDisplayMode)) continue;
    const severity = severityFor(audit.score);
    if (!severity) continue;

    const meta = auditMeta.get(id) ?? { category: "Other", weight: 0 };
    issues.push({
      id,
      title: audit.title ?? id,
      category: meta.category,
      severity,
      priority: priorityFor(severity, meta.weight),
      // PSI audits a single URL — see the note at the top of this file.
      pagesAffected: 1,
      description: cleanDescription(audit.description),
    });
  }

  // Sort worst-first so the table opens on what matters.
  const SEVERITY_ORDER = { Error: 0, Warning: 1, Notice: 2 };
  const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };
  issues.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      a.title.localeCompare(b.title),
  );

  // Weighted health score across the categories we requested.
  let weighted = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    const score = lh.categories?.[key]?.score;
    if (typeof score !== "number") continue;
    weighted += score * weight;
    totalWeight += weight;
  }
  const healthScore = totalWeight ? Math.round((weighted / totalWeight) * 100) : 0;

  const report = {
    domain: target,
    healthScore,
    crawledPages: 1,
    errors: issues.filter((i) => i.severity === "Error").length,
    warnings: issues.filter((i) => i.severity === "Warning").length,
    notices: issues.filter((i) => i.severity === "Notice").length,
    issues,
  };

  cache.write("pagespeed", cacheKey, report);
  return report;
}
