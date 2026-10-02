/**
 * Minimal .env loader — no dependencies.
 *
 * Reads .env.local (preferred) then .env from the project root and merges
 * anything not already present in process.env. Keeps parity with how
 * open-seo expects DATAFORSEO_API_KEY to be provided.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function parse(contents) {
  const out = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

for (const file of [".env.local", ".env"]) {
  const path = join(ROOT, file);
  if (!existsSync(path)) continue;
  const values = parse(readFileSync(path, "utf8"));
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export const config = {
  port: Number(process.env.API_PORT || 8787),
  apiKey: process.env.DATAFORSEO_API_KEY || "",
  /** Optional. PageSpeed Insights works without one; a key just raises the rate limit. */
  pagespeedKey: process.env.PAGESPEED_API_KEY || "",
  /** Google Search Console (free, first-party). Needs a Google Cloud OAuth client
   * with the Search Console API enabled — see SETUP.md. */
  gscClientId: process.env.GSC_CLIENT_ID || "",
  gscClientSecret: process.env.GSC_CLIENT_SECRET || "",
  gscRedirectUri:
    process.env.GSC_REDIRECT_URI ||
    `http://localhost:${Number(process.env.API_PORT || 8787)}/api/gsc/callback`,
  /** Optional: skip site auto-matching and always use this property. */
  gscSiteUrl: process.env.GSC_SITE_URL || "",
  locationName: process.env.DATAFORSEO_LOCATION || "United States",
  languageName: process.env.DATAFORSEO_LANGUAGE || "English",
  /** Disk cache TTL in hours. SEO data moves slowly; long TTL saves real money. */
  cacheTtlHours: Number(process.env.CACHE_TTL_HOURS || 24),
  /** Safety valve: refuse to run if a single process spends more than this (USD). */
  spendCapUsd: Number(process.env.SPEND_CAP_USD || 5),
  root: ROOT,
};

export function assertApiKey() {
  if (!config.apiKey) {
    throw Object.assign(
      new Error(
        "DATAFORSEO_API_KEY is not set. Copy .env.example to .env.local and add your key — see SETUP.md.",
      ),
      { statusCode: 503 },
    );
  }
}
