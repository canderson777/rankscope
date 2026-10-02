/**
 * Project store — localStorage persistence.
 *
 * An array of projects, each with a stable id, and every saved record stamped
 * with a `projectId`.
 *
 * A project is a domain you're accountable for. Ad-hoc competitor lookups do NOT
 * create projects.
 */

export interface Project {
  id: string;
  name: string;
  domain: string;
  /** Keywords saved from research, so you don't pay to look them up twice. */
  savedKeywords: string[];
  createdAt: string;
}

const LS_KEY = "rankscope_projects_v1";
const LS_ACTIVE = "rankscope_active_project_v1";

function makeId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeDomainInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

/** Derive a readable default name from a domain: "example.com" -> "Example" */
export function nameFromDomain(domain: string): string {
  const stem = normalizeDomainInput(domain).split(".")[0].replace(/[-_]/g, " ");
  return stem.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Tolerate records written by older versions.
    return parsed
      .filter((p) => p && typeof p.id === "string" && typeof p.domain === "string")
      .map((p) => ({
        id: p.id,
        name: p.name || nameFromDomain(p.domain),
        domain: normalizeDomainInput(p.domain),
        savedKeywords: Array.isArray(p.savedKeywords) ? p.savedKeywords : [],
        createdAt: p.createdAt || new Date().toISOString(),
      }));
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(projects));
  } catch (err) {
    console.warn("[projects] could not persist:", err);
  }
}

export function loadActiveId(): string | null {
  try {
    return localStorage.getItem(LS_ACTIVE);
  } catch {
    return null;
  }
}

export function saveActiveId(id: string | null): void {
  try {
    if (id) localStorage.setItem(LS_ACTIVE, id);
    else localStorage.removeItem(LS_ACTIVE);
  } catch {
    /* ignore */
  }
}

export function createProject(name: string, domain: string): Project {
  const cleanDomain = normalizeDomainInput(domain);
  return {
    id: makeId(),
    name: name.trim() || nameFromDomain(cleanDomain),
    domain: cleanDomain,
    savedKeywords: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Seeded on first run so the app isn't empty. These are example projects only —
 * rename or delete them freely. If the browser already has saved projects in
 * localStorage, the stale ones must be removed there (delete them in the project
 * dropdown), or clear site data to reseed.
 */
export function defaultProjects(): Project[] {
  return [
    createProject("Example SaaS", "example.com"),
    createProject("Example Local", "example.net"),
  ];
}

/** Remove seeded projects that are no longer in defaultProjects. */
export function pruneNonDefaultProjects(projects: Project[]): Project[] {
  const keep = new Set(defaultProjects().map((p) => p.domain));
  return projects.filter((p) => keep.has(p.domain));
}

/** Add default example projects that aren't saved yet, keeping
 * anything a user deliberately added that isn't in the defaults (competitors
 * promoted to projects, ad-hoc lookups saved deliberately). Order matches
 * defaultProjects so the dropdown stays predictable. */
export function ensureDefaultProjects(projects: Project[]): Project[] {
  const out = [...projects];
  for (const def of defaultProjects()) {
    if (!out.some((p) => p.domain === def.domain)) out.push(def);
  }
  return out;
}
