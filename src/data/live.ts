/**
 * Live data adapter — talks to the local API server in /server.
 *
 * Deliberately thin: the server already returns the exact shapes declared in
 * types.ts, so there's no mapping here. All the DataForSEO-specific work lives
 * server-side, which is also where the API key stays.
 *
 * This module must not import from ./api — api.ts imports from here to decide
 * mock vs live, and a cycle would break the build.
 */

import type { AuditReport, DomainProfile, KeywordOverview, BacklinkProfile, GapAnalysis, AiVisibilityReport, SearchConsoleReport, SearchConsoleStatus, SearchConsoleOverview } from "./types";

const BASE = "/api";

async function get<T>(path: string, q: string): Promise<T> {
  const res = await fetch(`${BASE}${path}?q=${encodeURIComponent(q)}`);

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* response wasn't JSON — keep the status text */
    }
    throw new Error(`Rankscope API: ${message}`);
  }

  return (await res.json()) as T;
}

export const live = {
  domainProfile: (q: string) => get<DomainProfile>("/domain-profile", q),
  keywordOverview: (q: string) => get<KeywordOverview>("/keyword-overview", q),
  /** Free — PageSpeed Insights, costs no DataForSEO credits. */
  auditReport: (q: string) => get<AuditReport>("/audit-report", q),
  backlinkProfile: (q: string) => get<BacklinkProfile>("/backlink-profile", q),
  gapAnalysis: (q: string) => get<GapAnalysis>("/gap-analysis", q),
  aiVisibility: (q: string) => get<AiVisibilityReport>("/ai-visibility", q),
  /** Free — Google Search Console, first-party impressions/clicks/position. */
  gscStatus: () => get<SearchConsoleStatus>("/gsc/status", "_"),
  gscReport: (q: string, days = 28) =>
    fetch(`${BASE}/gsc/report?q=${encodeURIComponent(q)}&days=${days}`).then(async (res) => {
      if (!res.ok) {
        let message = `${res.status} ${res.statusText}`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          /* keep status text */
        }
        throw new Error(message);
      }
      return (await res.json()) as SearchConsoleReport;
    }),
  gscOverview: (q: string, days = 90) =>
    fetch(`${BASE}/gsc/overview?q=${encodeURIComponent(q)}&days=${days}`).then(async (res) => {
      if (!res.ok) {
        let message = `${res.status} ${res.statusText}`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          /* keep status text */
        }
        throw new Error(message);
      }
      return (await res.json()) as SearchConsoleOverview;
    }),
};

/** Endpoints wired to real data so far. Everything else still uses mock. */
export const LIVE_ENDPOINTS = [
  "domainProfile", "keywordOverview", "auditReport",
  "backlinkProfile", "gapAnalysis", "aiVisibility", "gscReport",
] as const;
