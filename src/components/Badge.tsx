import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Circle, Info, MinusCircle, XCircle } from "lucide-react";

/**
 * Semantic badges. Status colors always ship with an icon or explicit
 * label — color never carries the meaning alone.
 */

type Tone = "neutral" | "accent" | "good" | "warn" | "serious" | "critical" | "violet" | "aqua";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  accent: "bg-accent-soft text-accent dark:text-white",
  good: "bg-good/12 text-delta-up dark:text-good",
  warn: "bg-warn/15 text-[#8a6100] dark:text-warn",
  serious: "bg-serious/15 text-[#a04a26] dark:text-serious",
  critical: "bg-critical/12 text-critical",
  violet: "bg-s5/12 text-s5",
  aqua: "bg-s2/12 text-[#0c7a54] dark:text-s2",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function IntentBadge({ intent }: { intent: string }) {
  const tone: Tone =
    intent === "Informational" ? "accent" :
    intent === "Commercial" ? "violet" :
    intent === "Transactional" ? "aqua" : "neutral";
  return <Badge tone={tone}>{intent}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const tone: Tone = priority === "High" ? "critical" : priority === "Medium" ? "warn" : "neutral";
  return <Badge tone={tone}>{priority} priority</Badge>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  if (severity === "Error") return <Badge tone="critical"><XCircle size={11} /> Error</Badge>;
  if (severity === "Warning") return <Badge tone="serious"><AlertTriangle size={11} /> Warning</Badge>;
  return <Badge tone="accent"><Info size={11} /> Notice</Badge>;
}

export function SentimentBadge({ sentiment }: { sentiment: string }) {
  const tone: Tone = sentiment === "Positive" ? "good" : sentiment === "Negative" ? "critical" : "neutral";
  return <Badge tone={tone}>{sentiment}</Badge>;
}

export function MentionBadge({ status }: { status: string }) {
  if (status === "Recommended") return <Badge tone="good"><CheckCircle2 size={11} /> Recommended</Badge>;
  if (status === "Mentioned") return <Badge tone="accent"><Circle size={11} /> Mentioned</Badge>;
  if (status === "Compared") return <Badge tone="violet"><Info size={11} /> Compared</Badge>;
  return <Badge tone="neutral"><MinusCircle size={11} /> Ignored</Badge>;
}

export function ChecklistBadge({ status }: { status: string }) {
  if (status === "Done") return <Badge tone="good"><CheckCircle2 size={11} /> Done</Badge>;
  if (status === "Partial") return <Badge tone="warn"><AlertTriangle size={11} /> Partial</Badge>;
  return <Badge tone="critical"><XCircle size={11} /> Missing</Badge>;
}
