import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, FolderPlus, Plus, Trash2 } from "lucide-react";
import { useSearch } from "../context/SearchContext";
import { nameFromDomain, normalizeDomainInput } from "../data/projects";

/**
 * Project selector for the header.
 *
 * A flat list you switch between, with the active one stamped on saved work.
 * Ad-hoc domain searches don't create projects — they surface a "Save as project"
 * action instead.
 */
export default function ProjectSwitcher() {
  const {
    projects,
    activeProject,
    domain,
    isAdHocDomain,
    selectProject,
    addProject,
    removeProject,
    saveCurrentDomainAsProject,
  } = useSearch();

  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draftDomain, setDraftDomain] = useState("");
  const [draftName, setDraftName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const submitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizeDomainInput(draftDomain);
    if (!clean) return;
    addProject(draftName || nameFromDomain(clean), clean);
    setDraftDomain("");
    setDraftName("");
    setAdding(false);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-2.5 py-1 text-xs text-ink-2 hover:bg-surface-2"
        title="Switch project"
      >
        <span className={`size-1.5 rounded-full ${isAdHocDomain ? "bg-warn" : "bg-good"}`} />
        <span className="max-w-[140px] truncate font-medium text-ink">
          {isAdHocDomain ? domain : (activeProject?.name ?? "No project")}
        </span>
        {isAdHocDomain && <span className="hidden text-muted sm:inline">· lookup</span>}
        <ChevronDown size={13} className="text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-hairline bg-surface shadow-lg">
          {isAdHocDomain && (
            <button
              onClick={() => {
                saveCurrentDomainAsProject();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 border-b border-hairline bg-surface-2 px-3 py-2.5 text-left text-xs font-medium text-accent hover:bg-surface"
            >
              <FolderPlus size={14} />
              Save <span className="font-semibold">{domain}</span> as a project
            </button>
          )}

          <div className="max-h-64 overflow-y-auto py-1">
            <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Projects
            </p>
            {projects.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted">No projects yet.</p>
            )}
            {projects.map((p) => (
              <div key={p.id} className="group flex items-center hover:bg-surface-2">
                <button
                  onClick={() => {
                    selectProject(p.id);
                    setOpen(false);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                >
                  <span className="w-4 shrink-0">
                    {p.id === activeProject?.id && !isAdHocDomain && (
                      <Check size={14} className="text-accent" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-ink">{p.name}</span>
                    <span className="block truncate text-[11px] text-muted">
                      {p.domain}
                      {p.savedKeywords.length > 0 && ` · ${p.savedKeywords.length} saved`}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => removeProject(p.id)}
                  className="mr-2 rounded p-1 text-muted opacity-0 transition-opacity hover:text-critical group-hover:opacity-100"
                  aria-label={`Remove ${p.name}`}
                  title="Remove project"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-hairline">
            {adding ? (
              <form onSubmit={submitNew} className="space-y-2 p-3">
                <input
                  autoFocus
                  value={draftDomain}
                  onChange={(e) => setDraftDomain(e.target.value)}
                  placeholder="domain.com"
                  className="w-full rounded-md border border-hairline bg-bg px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                />
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder={draftDomain ? nameFromDomain(draftDomain) : "Project name (optional)"}
                  className="w-full rounded-md border border-hairline bg-bg px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-md bg-accent px-2 py-1.5 text-xs font-medium text-white hover:opacity-90"
                  >
                    Add project
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdding(false)}
                    className="rounded-md border border-hairline px-2 py-1.5 text-xs text-ink-2 hover:bg-surface-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-medium text-ink-2 hover:bg-surface-2"
              >
                <Plus size={14} /> New project
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
