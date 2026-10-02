import type { ReactNode } from "react";
import { SearchX } from "lucide-react";

interface Props {
  title: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ title, hint, icon, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-surface-2 text-muted">
        {icon ?? <SearchX size={20} strokeWidth={1.6} />}
      </span>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-xs text-xs leading-relaxed text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
