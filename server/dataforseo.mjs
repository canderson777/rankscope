/**
 * DataForSEO client.
 *
 * One POST helper, cached, with running cost accounting. Endpoint reference:
 *   https://docs.dataforseo.com/v3/dataforseo_labs/overview/
 *   https://docs.dataforseo.com/v3/backlinks/overview/
 */

import { config, assertApiKey } from "./env.mjs";
import * as cache from "./cache.mjs";

const BASE = "https://api.dataforseo.com";

let spentThisProcess = 0;

export function spendSoFar() {
  return spentThisProcess;
}

function authHeader() {
  assertApiKey();
  // Accept either raw "login:password" or the pre-encoded Base64 credentials
  // that DataForSEO emails you (which is what open-seo asks for).
  const key = config.apiKey.includes(":")
    ? Buffer.from(config.apiKey).toString("base64")
    : config.apiKey;
  return `Basic ${key}`;
}

/**
 * POST to a DataForSEO "live" endpoint.
 *
 * @param {string} path  e.g. "/v3/dataforseo_labs/google/keyword_overview/live"
 * @param {object} task  the single task object (we always send an array of one)
 * @returns {Promise<object>} the first task's `result` payload
 */
export async function post(path, task) {
  const cached = cache.read(path, task);
  if (cached) {
    console.log(`[dataforseo] cache hit  ${path}`);
    return cached;
  }

  if (spentThisProcess >= config.spendCapUsd) {
    throw new Error(
      `Spend cap of $${config.spendCapUsd} reached this session ($${spentThisProcess.toFixed(4)} spent). ` +
        `Raise SPEND_CAP_USD in .env.local if this is expected.`,
    );
  }

  const body = JSON.stringify([{ ...task }]);
  console.log(`[dataforseo] POST      ${path}`);

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`DataForSEO ${path} responded ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  if (json.status_code !== 20000) {
    throw new Error(`DataForSEO error ${json.status_code}: ${json.status_message}`);
  }

  const taskResult = json.tasks?.[0];
  if (!taskResult) throw new Error(`DataForSEO ${path} returned no tasks`);
  if (taskResult.status_code !== 20000) {
    throw new Error(
      `DataForSEO task error ${taskResult.status_code}: ${taskResult.status_message}`,
    );
  }

  const cost = Number(json.cost || 0);
  spentThisProcess += cost;
  console.log(
    `[dataforseo] cost $${cost.toFixed(4)} — session total $${spentThisProcess.toFixed(4)}`,
  );

  const result = taskResult.result ?? [];
  cache.write(path, task, result);
  return result;
}

/** Shared location/language params every Labs + SERP endpoint expects. */
export function locale() {
  return {
    location_name: config.locationName,
    language_name: config.languageName,
  };
}
