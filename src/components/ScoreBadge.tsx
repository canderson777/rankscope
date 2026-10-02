/**
 * Compact 0–100 score chip. `invert` flips the semantics for metrics
 * where high is bad (keyword difficulty).
 */
interface Props {
  score: number;
  invert?: boolean;
  size?: "sm" | "md";
}

export default function ScoreBadge({ score, invert = false, size = "sm" }: Props) {
  const effective = invert ? 100 - score : score;
  const color =
    effective >= 70 ? "var(--good)" :
    effective >= 45 ? "var(--warn)" :
    effective >= 25 ? "var(--serious)" : "var(--critical)";

  const dim = size === "sm" ? "size-7 text-[11px]" : "size-10 text-sm";
  // Ring shows magnitude; the number carries the value (never color alone)
  const angle = Math.round((score / 100) * 360);

  return (
    <span
      className={`relative inline-grid ${dim} shrink-0 place-items-center rounded-full font-semibold tnum`}
      style={{ background: `conic-gradient(${color} ${angle}deg, var(--surface-2) ${angle}deg)` }}
      title={`${score} / 100`}
    >
      <span className="absolute inset-[3px] grid place-items-center rounded-full bg-surface">
        {score}
      </span>
    </span>
  );
}
