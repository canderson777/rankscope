import { Link, NavLink } from "react-router-dom";
import {
  LayoutDashboard, Globe, KeyRound, Link2, Stethoscope, Swords, Sparkles, Telescope, X, SearchCheck,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/domain", label: "Domain Overview", icon: Globe },
  { to: "/keywords", label: "Keyword Research", icon: KeyRound },
  { to: "/backlinks", label: "Backlink Analytics", icon: Link2 },
  { to: "/audit", label: "Site Audit", icon: Stethoscope },
  { to: "/gap", label: "Competitor Gap", icon: Swords },
];

const FIRST_PARTY = [
  { to: "/search-console", label: "Search Console", icon: SearchCheck, badge: "Free" },
];

const AI_NAV = [{ to: "/ai-visibility", label: "AI Visibility", icon: Sparkles, badge: "New" }];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? "bg-surface-2 text-ink"
        : "text-ink-2 hover:bg-surface-2/70 hover:text-ink"
    }`;

  return (
    <>
      {/* Mobile scrim */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} aria-hidden />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-hairline bg-surface transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-hairline px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-accent text-white">
              <Telescope size={16} strokeWidth={2.2} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Rankscope</span>
          </Link>
          <button
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Search intelligence
          </p>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={link} onClick={onClose}>
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}

          <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted">
            First-party data
          </p>
          {FIRST_PARTY.map(({ to, label, icon: Icon, badge }) => (
            <NavLink key={to} to={to} className={link} onClick={onClose}>
              <Icon size={16} strokeWidth={1.8} />
              {label}
              {badge && (
                <span className="ml-auto rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent dark:text-white">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}

          <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Answer engines
          </p>
          {AI_NAV.map(({ to, label, icon: Icon, badge }) => (
            <NavLink key={to} to={to} className={link} onClick={onClose}>
              <Icon size={16} strokeWidth={1.8} />
              {label}
              {badge && (
                <span className="ml-auto rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent dark:text-white">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-hairline p-3">
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="text-xs font-medium">Live vs mock</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">
              Site Audit (PageSpeed) and Search Console are real, free data. Other metrics fall back to
              simulated data unless live providers are on.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
