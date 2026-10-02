import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isDomain, normalizeDomain } from "../data/api";
import {
  createProject,
  defaultProjects,
  ensureDefaultProjects,
  loadActiveId,
  loadProjects,
  pruneNonDefaultProjects,
  saveActiveId,
  saveProjects,
  type Project,
} from "../data/projects";

interface SearchState {
  /** Active domain every domain-scoped page reads from. May be an ad-hoc lookup. */
  domain: string;
  /** Active keyword for keyword research */
  keyword: string;
  setDomain: (d: string) => void;
  setKeyword: (k: string) => void;
  /** Route a raw query: returns which page should show it */
  submitQuery: (raw: string) => "domain" | "keyword" | null;

  /* ---- projects ---- */
  projects: Project[];
  activeProject: Project | null;
  /** True when `domain` is something you searched, not the active project's domain. */
  isAdHocDomain: boolean;
  selectProject: (id: string) => void;
  addProject: (name: string, domain: string) => void;
  removeProject: (id: string) => void;
  /** Save the current domain as a project — the "promote a lookup" path. */
  saveCurrentDomainAsProject: (name?: string) => void;
  saveKeyword: (keyword: string) => void;
  unsaveKeyword: (keyword: string) => void;
}

const SearchContext = createContext<SearchState | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => {
    const stored = loadProjects();
    if (stored.length) {
      // Drop projects from other businesses, then make sure ACC + Local Glow Up
      // are present for anyone upgrading from the older ACC-only seed.
      const pruned = pruneNonDefaultProjects(stored);
      const ensured = ensureDefaultProjects(pruned);
      if (ensured.length !== stored.length) {
        saveProjects(ensured);
        return ensured;
      }
      return stored;
    }
    const seeded = defaultProjects();
    saveProjects(seeded);
    return seeded;
  });

  const [activeId, setActiveId] = useState<string | null>(() => {
    const stored = loadActiveId();
    const available = loadProjects();
    if (stored && available.some((p) => p.id === stored)) return stored;
    return available[0]?.id ?? null;
  });

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeId) ?? projects[0] ?? null,
    [projects, activeId],
  );

  const [domain, setDomain] = useState(() => activeProject?.domain ?? "example.com");
  const [keyword, setKeyword] = useState("email marketing");

  useEffect(() => saveProjects(projects), [projects]);
  useEffect(() => saveActiveId(activeId), [activeId]);

  const selectProject = useCallback(
    (id: string) => {
      const next = projects.find((p) => p.id === id);
      if (!next) return;
      setActiveId(id);
      setDomain(next.domain);
    },
    [projects],
  );

  const addProject = useCallback((name: string, newDomain: string) => {
    const project = createProject(name, newDomain);
    setProjects((prev) => [...prev, project]);
    setActiveId(project.id);
    setDomain(project.domain);
  }, []);

  const removeProject = useCallback(
    (id: string) => {
      setProjects((prev) => {
        const next = prev.filter((p) => p.id !== id);
        if (id === activeId) {
          const fallback = next[0] ?? null;
          setActiveId(fallback?.id ?? null);
          if (fallback) setDomain(fallback.domain);
        }
        return next;
      });
    },
    [activeId],
  );

  const saveCurrentDomainAsProject = useCallback(
    (name?: string) => {
      if (projects.some((p) => p.domain === domain)) return;
      addProject(name ?? "", domain);
    },
    [projects, domain, addProject],
  );

  const saveKeyword = useCallback(
    (kw: string) => {
      if (!activeProject) return;
      const clean = kw.trim().toLowerCase();
      if (!clean) return;
      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProject.id && !p.savedKeywords.includes(clean)
            ? { ...p, savedKeywords: [...p.savedKeywords, clean] }
            : p,
        ),
      );
    },
    [activeProject],
  );

  const unsaveKeyword = useCallback(
    (kw: string) => {
      if (!activeProject) return;
      const clean = kw.trim().toLowerCase();
      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProject.id
            ? { ...p, savedKeywords: p.savedKeywords.filter((k) => k !== clean) }
            : p,
        ),
      );
    },
    [activeProject],
  );

  const submitQuery = useCallback((raw: string): "domain" | "keyword" | null => {
    const q = raw.trim();
    if (!q) return null;
    if (isDomain(q)) {
      setDomain(normalizeDomain(q));
      return "domain";
    }
    setKeyword(q.toLowerCase());
    return "keyword";
  }, []);

  const value: SearchState = {
    domain,
    keyword,
    setDomain,
    setKeyword,
    submitQuery,
    projects,
    activeProject,
    isAdHocDomain: Boolean(activeProject) && domain !== activeProject?.domain,
    selectProject,
    addProject,
    removeProject,
    saveCurrentDomainAsProject,
    saveKeyword,
    unsaveKeyword,
  };

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchState {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}
