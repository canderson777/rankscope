/**
 * Rankscope local API server.
 *
 * Zero dependencies — plain node:http. Run it alongside Vite:
 *   npm run dev        (starts both)
 *   npm run dev:api    (this server only, port 8787)
 *
 * Vite proxies /api -> here, so the browser never sees your DataForSEO key.
 * That's the whole point of this process existing: the key must stay server-side.
 */

import { createServer } from "node:http";
import { config } from "./env.mjs";
import { spendSoFar } from "./dataforseo.mjs";
import { keywordOverview } from "./endpoints/keywordOverview.mjs";
import { domainProfile } from "./endpoints/domainProfile.mjs";
import { siteAudit } from "./endpoints/siteAudit.mjs";
import { backlinkProfile } from "./endpoints/backlinkProfile.mjs";
import { gapAnalysis } from "./endpoints/gapAnalysis.mjs";
import { aiVisibility } from "./endpoints/aiVisibility.mjs";
import * as gsc from "./gsc.mjs";

/**
 * Route table. Each handler takes the `q` query param and returns JSON matching
 * the corresponding type in src/data/types.ts.
 *
 * To add the remaining endpoints (backlinks, audit, gap, AI visibility), write
 * a module in ./endpoints and add it here — the frontend adapter in
 * src/data/live.ts will pick it up as soon as you flip its entry to live.
 */
const ROUTES = {
  "/api/keyword-overview": keywordOverview,
  "/api/domain-profile": domainProfile,
  // Free — PageSpeed Insights, no DataForSEO credits consumed.
  "/api/audit-report": siteAudit,
  "/api/backlink-profile": backlinkProfile,
  "/api/gap-analysis": gapAnalysis,
  "/api/ai-visibility": aiVisibility,
};

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${config.port}`);

  if (url.pathname === "/api/health") {
    return send(res, 200, {
      ok: true,
      hasApiKey: Boolean(config.apiKey),
      location: config.locationName,
      language: config.languageName,
      cacheTtlHours: config.cacheTtlHours,
      spentThisSession: Number(spendSoFar().toFixed(4)),
    });
  }

  // Google Search Console — free, first-party data.
  if (url.pathname.startsWith("/api/gsc/")) {
    return handleGsc(req, res, url);
  }

  const handler = ROUTES[url.pathname];
  if (!handler) return send(res, 404, { error: `No route for ${url.pathname}` });

  const q = url.searchParams.get("q");
  if (!q) return send(res, 400, { error: "Missing required query param: q" });

  try {
    const data = await handler(q, url.searchParams);
    return send(res, 200, data);
  } catch (err) {
    console.error(`[api] ${url.pathname} failed:`, err.message);
    return send(res, err.statusCode ?? 500, { error: err.message });
  }
});

/**
 * Google Search Console routes.
 *
 *   GET /api/gsc/status   — { configured, connected, … }
 *   GET /api/gsc/auth     — 302 redirect to Google's OAuth consent screen
 *   GET /api/gsc/callback — OAuth code exchange (comes back from Google)
 *   GET /api/gsc/report?q=<domain>&days=N — striking-distance Search Analytics
 */
async function handleGsc(req, res, url) {
  const path = url.pathname;

  if (path === "/api/gsc/status") {
    return send(res, 200, gsc.status());
  }

  if (path === "/api/gsc/auth") {
    try {
      const location = gsc.authUrl();
      res.writeHead(302, { Location: location });
      return res.end();
    } catch (err) {
      return send(res, 400, { error: err.message });
    }
  }

  if (path === "/api/gsc/callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state") ?? "";
    const error = url.searchParams.get("error");
    if (error) {
      return send(res, 400, { ok: false, error: `Google OAuth error: ${error}` });
    }
    try {
      await gsc.handleCallback(code, state);
      const body = `<!doctype html><html><body style="font-family:system-ui;padding:3rem">
<h2>Rankscope · Search Console connected ✅</h2>
<p>You can close this tab and return to the app.</p></body></html>`;
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
      return res.end(body);
    } catch (err) {
      return send(res, err.statusCode ?? 500, { ok: false, error: err.message });
    }
  }

  if (path === "/api/gsc/report") {
    const q = url.searchParams.get("q");
    if (!q) return send(res, 400, { error: "Missing required query param: q" });
    const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days") ?? 28)));
    try {
      return send(res, 200, await gsc.gscReport(q, days));
    } catch (err) {
      if (err.gscNotConnected) {
        return send(res, 401, { error: "Search Console is not connected — open /api/gsc/auth first.", connected: false });
      }
      return send(res, err.statusCode ?? 502, { error: err.message });
    }
  }

  if (path === "/api/gsc/overview") {
    const q = url.searchParams.get("q");
    if (!q) return send(res, 400, { error: "Missing required query param: q" });
    const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days") ?? 90)));
    try {
      return send(res, 200, await gsc.gscOverview(q, days));
    } catch (err) {
      if (err.gscNotConnected) {
        return send(res, 401, { error: "Search Console is not connected — open /api/gsc/auth first.", connected: false });
      }
      return send(res, err.statusCode ?? 502, { error: err.message });
    }
  }

  return send(res, 404, { error: `No route for ${path}` });
}

server.listen(config.port, () => {
  console.log(`\n  Rankscope API   http://localhost:${config.port}`);
  console.log(`  DataForSEO key  ${config.apiKey ? "loaded" : "MISSING — see SETUP.md"}`);
  console.log(`  Market          ${config.locationName} / ${config.languageName}`);
  console.log(`  Cache TTL       ${config.cacheTtlHours}h   Spend cap $${config.spendCapUsd}\n`);
});
