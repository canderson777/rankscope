/**
 * Dumb but effective disk cache.
 *
 * Every DataForSEO call costs real money, so identical requests inside the
 * TTL window are served from .cache/ instead of hitting the API again. Delete
 * the .cache folder to force fresh data.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "./env.mjs";

const DIR = join(config.root, ".cache");

function keyFor(namespace, payload) {
  const hash = createHash("sha256")
    .update(JSON.stringify({ namespace, payload }))
    .digest("hex")
    .slice(0, 24);
  return join(DIR, `${namespace}-${hash}.json`);
}

export function read(namespace, payload) {
  const file = keyFor(namespace, payload);
  if (!existsSync(file)) return null;
  try {
    const entry = JSON.parse(readFileSync(file, "utf8"));
    const ageHours = (Date.now() - entry.savedAt) / 36e5;
    if (ageHours > config.cacheTtlHours) return null;
    return entry.value;
  } catch {
    return null;
  }
}

export function write(namespace, payload, value) {
  try {
    const file = keyFor(namespace, payload);
    const parentDir = join(file, "..");
    mkdirSync(parentDir, { recursive: true });
    writeFileSync(
      file,
      JSON.stringify({ savedAt: Date.now(), value }),
      "utf8",
    );
  } catch (err) {
    console.warn(`[cache] could not persist ${namespace}:`, err.message);
  }
}
