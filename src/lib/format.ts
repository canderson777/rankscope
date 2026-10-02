/** Compact number: 1284 → "1.3K", 4200000 → "4.2M" */
export function compact(n: number): string {
  if (n >= 1_000_000_000) return `${trim(n / 1_000_000_000)}B`;
  if (n >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (n >= 10_000) return `${trim(n / 1_000)}K`;
  if (n >= 1_000) return n.toLocaleString("en-US");
  return String(n);
}

function trim(n: number): string {
  const s = n.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

export function num(n: number): string {
  return n.toLocaleString("en-US");
}

export function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function pct(n: number, digits = 0): string {
  return `${n.toFixed(digits)}%`;
}

export function signed(n: number, formatter: (n: number) => string = compact): string {
  return `${n >= 0 ? "+" : "−"}${formatter(Math.abs(n))}`;
}

/** Download rows as a CSV file — powers the Export buttons */
export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
