import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  height?: number;
  /** Legend items rendered under the title, e.g. [{ label, color }] */
  legend?: { label: string; color: string }[];
}

export default function ChartCard({ title, subtitle, actions, children, loading = false, height = 260, legend }: Props) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {legend && legend.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-xs text-ink-2">
              <span className="h-0.5 w-4 rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3" style={{ height }}>
        {loading ? <div className="skeleton h-full w-full" /> : children}
      </div>
    </div>
  );
}

/** Shared tooltip for all recharts charts — surface, hairline, text tokens */
export function ChartTip({ active, payload, label, formatter }: {
  active?: boolean;
  payload?: { name: string; value: number; color?: string; stroke?: string; fill?: string }[];
  label?: string;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-hairline bg-surface px-3 py-2 shadow-lg">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="mt-0.5 flex items-center gap-1.5 text-xs">
          <span className="size-2 rounded-full" style={{ background: p.color ?? p.stroke ?? p.fill }} />
          <span className="text-ink-2">{p.name}:</span>
          <span className="font-semibold tnum">{formatter ? formatter(p.value) : p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}
