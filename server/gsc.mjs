/**
 * Google Search Console module — free, first-party data.
 *
 * DataForSEO costs $0.01+ per call; Search Console reports impressions, clicks,
 * queries and position for a site you own, and the API is free. The highest
 * value play (see IDEA.md) is "striking distance": queries sitting at average
 * positions 5–20, where small wins move rankings into page one.
 *
 * OAuth flow (zero dependencies — node:fetch + node:crypto):
 *   1. GET  /api/gsc/auth            -> 302 to Google's consent screen
 *   2. GET  /api/gsc/callback        -> exchange code for tokens
 *   3. GET  /api/gsc/report?q=…      -> Search Analytics striking-distance table
 *   4. GET  /api/gsc/status          -> configuration / connection state
 *
 * Tokens live in .cache/gsc-token.json (gitignored). No secrets in logs.
 */

import { config } from "./env.mjs";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SITES_URL = "https://www.googleapis.com/webmasters/v3/sites";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

function tokenFile() {
  return join(config.root, ".cache", "gsc-token.json");
}
function stateFile() {
  return join(config.root, ".cache", "gsc-state.json");
}

/* ---------------------------------------------------------------- */
/* Token storage                                                     */
/* ---------------------------------------------------------------- */

function loadToken() {
  try {
    return JSON.parse(readFileSync(tokenFile(), "utf8"));
  } catch {
    return null;
  }
}

function saveToken(token) {
  try {
    mkdirSync(join(config.root, ".cache"), { recursive: true });
    writeFileSync(tokenFile(), JSON.stringify(token, null, 2), "utf8");
  } catch (err) {
    console.warn(`[gsc] could not persist token: ${err.message}`);
  }
}

function deleteToken() {
  try {
    const file = tokenFile();
    if (existsSync(file)) unlinkSync(file);
  } catch {
    /* ignore */
  }
}

/* ---------------------------------------------------------------- */
/* Fresh tokens via refresh                                          */
/* ---------------------------------------------------------------- */

async function refreshToken(token) {
  if (!token?.refresh_token) throw new Error("GSC refresh token missing.");
  const body = new URLSearchParams({
    client_id: config.gscClientId,
    client_secret: config.gscClientSecret,
    grant_type: "refresh_token",
    refresh_token: token.refresh_token,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Google token refresh failed: ${res.status} ${detail}`);
  }
  const json = await res.json();
  const next = {
    access_token: json.access_token ?? token.access_token,
    refresh_token: json.refresh_token ?? token.refresh_token,
    expires_at: Date.now() + Number(json.expires_in ?? 3600) * 1000,
  };
  saveToken(next);
  return next;
}

async function validToken() {
  const token = loadToken();
  if (!token) return null;
  if (Date.now() < (token.expires_at ?? 0) - 30_000) return token;
  try {
    return await refreshToken(token);
  } catch (err) {
    console.warn(`[gsc] ${err.message} — re-auth required`);
    deleteToken();
    return null;
  }
}

async function authHeader() {
  const token = await validToken();
  if (!token) throw Object.assign(new Error("gsc-not-connected"), { gscNotConnected: true });
  return { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" };
}

/* ---------------------------------------------------------------- */
/* Sites + Search Analytics                                          */
/* ---------------------------------------------------------------- */

async function listSites() {
  const headers = await authHeader();
  const res = await fetch(SITES_URL, { headers });
  if (!res.ok) throw new Error(`GSC sites.list returned ${res.status}`);
  const json = await res.json();
  return (json?.siteEntry ?? []).map((e) => e.siteUrl).filter(Boolean);
}

function normalizeForMatch(domain) {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^sc-domain:/, "")
    .replace(/^www\./, "");
}

function pickSite(sites, domain) {
  if (config.gscSiteUrl) return config.gscSiteUrl;
  const target = normalizeForMatch(domain);
  const exact = sites.find(
    (s) => normalizeForMatch(s) === target || normalizeForMatch(s) === `www.${target}`,
  );
  const contains = sites.find((s) => normalizeForMatch(s).endsWith(target));
  return exact ?? contains ?? null;
}

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Striking-distance report for a domain the user owns.
 *
 * Full-query Search Analytics for the window, filtered client-side to rows with
 * an average position between 5 and 20 (the IDE.md "striking distance" zone) and
 * sorted by impressions. Position 20 is inclusive so pages pushing into top 20
 * appear; positions 1–4 are already "ranked" and excluded as uninteresting here.
 */
export async function gscReport(domain, days = 28) {
  const headers = await authHeader();
  const sites = await listSites();
  const siteUrl = pickSite(sites, domain);
  if (!siteUrl) {
    throw Object.assign(
      new Error(`No Search Console property matches "${domain}". Verified properties: ${sites.join(", ") || "none"}`),
      { statusCode: 404 },
    );
  }

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = daysAgoIso(days);
  const body = {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit: 25000,
  };
  const res = await fetch(`${SITES_URL}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw Object.assign(new Error(`GSC searchAnalytics returned ${res.status}: ${detail.slice(0, 300)}`), {
      statusCode: res.status === 403 ? 403 : 502,
    });
  }
  const json = await res.json();
  const rows = (json?.rows ?? []).filter((r) => Number.isFinite(r?.position));

  const striking = rows
    .filter((r) => r.position >= 5 && r.position <= 20)
    .map((r) => ({
      query: r.keys?.[0] ?? "",
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: Math.round(r.ctr * 10000) / 10000,
      avgPosition: Math.round(r.position * 10) / 10,
    }))
    .filter((r) => r.query)
    .sort((a, b) => b.impressions - a.impressions);

  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const shownRows = rows.filter((r) => r.keys?.[0]).slice(0, 50);

  return {
    domain: normalizeForMatch(domain),
    siteUrl,
    days,
    startDate,
    endDate,
    totals: {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: totalImpressions ? Math.round((totalClicks / totalImpressions) * 10000) / 10000 : 0,
      avgPosition: rows.length ? Math.round((rows.reduce((s, r) => s + r.position, 0) / rows.length) * 10) / 10 : 0,
      queries: shownRows.length,
    },
    strikingDistance: striking.slice(0, 100),
    note: "First-party Google Search Console data for the selected project domain.",
  };
}

/**
 * Domain-overview data from Search Console: totals, top queries, top pages and
 * a daily trend for the window. Everything is first-party Google data so the
 * Domain Overview page can show real numbers without a DataForSEO top-up.
 *
 * Uses three Search Analytics calls (query / page / date dimensions) — all free.
 */
export async function gscOverview(domain, days = 90) {
  const headers = await authHeader();
  const sites = await listSites();
  const siteUrl = pickSite(sites, domain);
  if (!siteUrl) {
    throw Object.assign(
      new Error(`No Search Console property matches "${domain}". Verified properties: ${sites.join(", ") || "none"}`),
      { statusCode: 404 },
    );
  }

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = daysAgoIso(days);

  async function sa(dimensions) {
    const res = await fetch(`${SITES_URL}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({ startDate, endDate, dimensions, rowLimit: 25000 }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw Object.assign(new Error(`GSC searchAnalytics returned ${res.status}: ${detail.slice(0, 300)}`), {
        statusCode: res.status === 403 ? 403 : 502,
      });
    }
    const json = await res.json();
    return (json?.rows ?? []).filter((r) => Array.isArray(r?.keys));
  }

  const [queryRows, pageRows, dateRows] = await Promise.all([
    sa(["query"]),
    sa(["page"]),
    sa(["date"]),
  ]);

  const sumClicks = (rs) => rs.reduce((s, r) => s + (r.clicks ?? 0), 0);
  const sumImpressions = (rs) => rs.reduce((s, r) => s + (r.impressions ?? 0), 0);

  const clicks = sumClicks(queryRows);
  const impressions = sumImpressions(queryRows);

  const topQueries = queryRows
    .map((r) => ({
      query: r.keys?.[0] ?? "",
      impressions: r.impressions ?? 0,
      clicks: r.clicks ?? 0,
      ctr: Math.round((r.ctr ?? 0) * 10000) / 10000,
      avgPosition: Math.round((r.position ?? 0) * 10) / 10,
    }))
    .filter((r) => r.query)
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, 50);

  const topPages = pageRows
    .map((r) => ({
      url: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: Math.round((r.ctr ?? 0) * 10000) / 10000,
      avgPosition: Math.round((r.position ?? 0) * 10) / 10,
    }))
    .filter((r) => r.url)
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, 25);

  const trend = dateRows
    .map((r) => ({
      date: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
    }))
    .filter((r) => r.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  const withPosition = queryRows.filter((r) => Number.isFinite(r?.position));

  return {
    domain: normalizeForMatch(domain),
    siteUrl,
    days,
    startDate,
    endDate,
    clicks,
    impressions,
    ctr: impressions ? Math.round((clicks / impressions) * 10000) / 10000 : 0,
    avgPosition: withPosition.length
      ? Math.round((withPosition.reduce((s, r) => s + r.position, 0) / withPosition.length) * 10) / 10
      : 0,
    queries: topQueries.length,
    topQueries,
    topPages,
    trend,
    strikingDistance: queryRows
      .filter((r) => r.position >= 5 && r.position <= 20)
      .map((r) => ({
        query: r.keys?.[0] ?? "",
        impressions: r.impressions ?? 0,
        clicks: r.clicks ?? 0,
        ctr: Math.round((r.ctr ?? 0) * 10000) / 10000,
        avgPosition: Math.round((r.position ?? 0) * 10) / 10,
      }))
      .filter((r) => r.query)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 100),
    note: "First-party Google Search Console data for the selected project domain.",
  };
}

/* ---------------------------------------------------------------- */
/* OAuth flow                                                        */
/* ---------------------------------------------------------------- */

export function isConfigured() {
  return Boolean(config.gscClientId && config.gscClientSecret);
}

export function status() {
  const token = loadToken();
  return {
    configured: isConfigured(),
    connected: Boolean(token?.access_token),
    siteUrl: config.gscSiteUrl || null,
    hint: isConfigured()
      ? "Click Connect to authorize with your Google account."
      : "Add GSC_CLIENT_ID/GSC_CLIENT_SECRET to .env.local — see SETUP.md",
  };
}

export function authUrl() {
  if (!isConfigured()) throw new Error("GSC is not configured (GSC_CLIENT_ID/GSC_CLIENT_SECRET).");
  const state = randomBytes(16).toString("hex");
  try {
    mkdirSync(join(config.root, ".cache"), { recursive: true });
    writeFileSync(stateFile(), JSON.stringify({ state, created: Date.now() }), "utf8");
  } catch (err) {
    console.warn(`[gsc] could not persist state: ${err.message}`);
  }
  const params = new URLSearchParams({
    client_id: config.gscClientId,
    redirect_uri: config.gscRedirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

export async function handleCallback(code, state) {
  if (!code) throw Object.assign(new Error("Missing OAuth code."), { statusCode: 400 });

  // State check — CSRF guard for the local redirect.
  try {
    const expected = JSON.parse(readFileSync(stateFile(), "utf8"));
    if (!expected?.state || expected.state !== state) {
      throw Object.assign(new Error("OAuth state mismatch."), { statusCode: 400 });
    }
  } catch (err) {
    if (err instanceof Error && err.statusCode) throw err;
    throw Object.assign(new Error("OAuth state missing — re-run /api/gsc/auth."), { statusCode: 400 });
  }

  const body = new URLSearchParams({
    code,
    client_id: config.gscClientId,
    client_secret: config.gscClientSecret,
    redirect_uri: config.gscRedirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${detail.slice(0, 300)}`);
  }
  const json = await res.json();
  saveToken({
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + Number(json.expires_in ?? 3600) * 1000,
  });
  return { ok: true, connected: true };
}