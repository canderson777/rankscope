import type { ReactNode } from "react";

/**
 * One row of filters above charts/tables. Pills for enumerable options,
 * selects for longer lists — standard UI, kept visually recessive.
 */

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

interface PillGroupProps {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

export function PillGroup({ options, value, onChange, label }: PillGroupProps) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      {label && <span className="mr-0.5 text-xs text-muted">{label}</span>}
      <div className="flex rounded-lg border border-hairline bg-surface p-0.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              value === opt ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"
            }`}
            aria-pressed={value === opt}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SelectProps {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

export function FilterSelect({ options, value, onChange, label }: SelectProps) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-hairline bg-surface px-2 py-1.5 text-xs font-medium text-ink focus:border-accent focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
