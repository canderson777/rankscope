import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

interface Props {
  onSubmit: (query: string) => void;
  placeholder?: string;
  /** Slim header variant vs. hero variant */
  compact?: boolean;
  defaultValue?: string;
  buttonLabel?: string;
}

export default function SearchInput({
  onSubmit,
  placeholder = "Enter a domain or keyword…",
  compact = false,
  defaultValue = "",
  buttonLabel,
}: Props) {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
      <div className="relative flex-1">
        <Search
          size={compact ? 14 : 16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-hairline bg-surface text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 ${
            compact ? "py-1.5 pl-8 pr-3 text-sm" : "py-2.5 pl-10 pr-3 text-[15px]"
          }`}
        />
      </div>
      {buttonLabel && (
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          {buttonLabel}
        </button>
      )}
    </form>
  );
}
