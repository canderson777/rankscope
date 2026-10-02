import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { exportCsv } from "../lib/format";
import EmptyState from "./EmptyState";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  width?: string;
  render: (row: T) => ReactNode;
  /** Plain value for CSV export; defaults to render output if string */
  csv?: (row: T) => string | number;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  loading?: boolean;
  skeletonRows?: number;
  emptyTitle?: string;
  emptyHint?: string;
  /** When set, shows an Export CSV button in the top-right of the table */
  exportName?: string;
  dense?: boolean;
}

export default function DataTable<T>({
  columns, rows, rowKey, loading = false, skeletonRows = 6,
  emptyTitle = "No results", emptyHint, exportName, dense = false,
}: Props<T>) {
  const alignCls = (a?: string) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";
  const pad = dense ? "px-3 py-2" : "px-3 py-2.5";

  const doExport = () => {
    if (!exportName) return;
    exportCsv(
      exportName,
      columns.map((c) => c.header),
      rows.map((r) => columns.map((c) => c.csv?.(r) ?? "")),
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-hairline">
              {columns.map((c, i) => (
                <th
                  key={c.key}
                  className={`${pad} text-[11px] font-semibold uppercase tracking-wider text-muted ${alignCls(c.align)}`}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {i === columns.length - 1 && exportName && !loading && rows.length > 0 ? (
                    <span className="flex items-center justify-end gap-2">
                      {c.header}
                      <button
                        onClick={doExport}
                        title="Export CSV"
                        className="rounded-md border border-hairline p-1 text-muted hover:bg-surface-2 hover:text-ink"
                      >
                        <Download size={12} />
                      </button>
                    </span>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, r) => (
                  <tr key={r} className="border-b border-hairline last:border-0">
                    {columns.map((c) => (
                      <td key={c.key} className={pad}>
                        <div className="skeleton h-3.5" style={{ width: `${45 + ((r * 13 + c.key.length * 7) % 45)}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row, i) => (
                  <tr
                    key={rowKey(row, i)}
                    className="border-b border-hairline transition-colors last:border-0 hover:bg-surface-2/50"
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={`${pad} ${alignCls(c.align)}`}>
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 && (
        <EmptyState title={emptyTitle} hint={emptyHint} />
      )}
    </div>
  );
}
