import type { ReactNode } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface Props {
  label: string;
  value: string;
  delta?: number; // percentage or absolute; formatted by deltaSuffix
  deltaSuffix?: string;
  deltaLabel?: string;
  /** invert = a rise is bad (e.g. errors) */
  invertDelta?: boolean;
  spark?: number[];
  icon?: ReactNode;
  loading?: boolean;
}

export default function StatCard({
  label, value, delta, deltaSuffix = "%", deltaLabel = "vs last month",
  invertDelta = false, spark, icon, loading = false,
}: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-hairline bg-surface p-4">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton mt-3 h-7 w-20" />
        <div className="skeleton mt-3 h-3 w-28" />
      </div>
    );
  }

  const up = delta !== undefined && delta >= 0;
  const good = invertDelta ? !up : up;

  return (
    <div className="rounded-xl border border-hairline bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink-2">{label}</p>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <p className="text-[26px] font-semibold leading-none tracking-tight">{value}</p>
        {spark && spark.length > 1 && (
          <div className="h-8 w-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark.map((v, i) => ({ i, v }))} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
                <Area type="monotone" dataKey="v" stroke="var(--s1)" strokeWidth={1.5} fill="var(--s1)" fillOpacity={0.1} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {delta !== undefined && (
        <p className="mt-2 text-xs text-muted">
          <span className={`font-semibold ${good ? "text-delta-up" : "text-delta-down"}`}>
            {up ? "▲" : "▼"} {Math.abs(delta)}{deltaSuffix}
          </span>{" "}
          {deltaLabel}
        </p>
      )}
    </div>
  );
}
