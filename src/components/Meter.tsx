/**
 * Horizontal meter — fill carries magnitude on the sequential blue ramp
 * (or severity when `severity` is set); track is a lighter step of the
 * same ramp so state reads across the whole bar.
 */
interface Props {
  value: number; // 0-100
  severity?: boolean; // color by good/warn/critical bands instead of blue
  className?: string;
}

export default function Meter({ value, severity = false, className = "" }: Props) {
  const v = Math.max(0, Math.min(100, value));
  const fill = severity
    ? v >= 70 ? "var(--good)" : v >= 45 ? "var(--warn)" : v >= 25 ? "var(--serious)" : "var(--critical)"
    : "var(--seq-400)";
  const track = severity ? "var(--surface-2)" : "var(--seq-100)";

  return (
    <span className={`inline-block h-1.5 w-full min-w-14 overflow-hidden rounded-full ${className}`} style={{ background: track }}>
      <span className="block h-full rounded-full" style={{ width: `${v}%`, background: fill }} />
    </span>
  );
}
