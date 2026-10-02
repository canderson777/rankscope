import { useEffect, useState } from "react";
import { PlayCircle, RefreshCw, Stethoscope } from "lucide-react";
import { useSearch } from "../context/SearchContext";
import { api } from "../data/api";
import { num } from "../lib/format";
import PageHeader, { PrimaryButton } from "../components/PageHeader";
import StatCard from "../components/StatCard";
import DataTable, { type Column } from "../components/DataTable";
import { PriorityBadge, SeverityBadge } from "../components/Badge";
import { FilterBar, PillGroup } from "../components/FilterBar";
import EmptyState from "../components/EmptyState";
import type { AuditIssue, AuditReport } from "../data/types";

export default function SiteAudit() {
  const { domain } = useSearch();
  const [report, setReport] = useState<AuditReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState("All");

  // A new domain invalidates the previous crawl
  useEffect(() => {
    setReport(null);
    setError(null);
  }, [domain]);

  const runAudit = async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await api.auditReport(domain);
      setReport(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
    } finally {
      setRunning(false);
    }
  };

  const issues = (report?.issues ?? []).filter((i) =>
    severity === "All" ? true : i.severity === severity,
  );

  const columns: Column<AuditIssue>[] = [
    {
      key: "title", header: "Issue", width: "34%",
      render: (r) => (
        <div>
          <p className="font-medium">{r.title}</p>
          <p className="mt-0.5 max-w-md text-xs leading-relaxed text-muted">{r.description}</p>
        </div>
      ),
      csv: (r) => r.title,
    },
    { key: "category", header: "Category", render: (r) => <span className="text-ink-2">{r.category}</span>, csv: (r) => r.category },
    { key: "severity", header: "Severity", render: (r) => <SeverityBadge severity={r.severity} />, csv: (r) => r.severity },
    { key: "priority", header: "Priority", render: (r) => <PriorityBadge priority={r.priority} />, csv: (r) => r.priority },
    { key: "pages", header: "Pages affected", align: "right", render: (r) => <span className="tnum font-medium">{num(r.pagesAffected)}</span>, csv: (r) => r.pagesAffected },
  ];

  const health = report?.healthScore ?? 0;
  const healthColor =
    health >= 80 ? "var(--good)" : health >= 60 ? "var(--warn)" : health >= 40 ? "var(--serious)" : "var(--critical)";

  return (
    <>
      <PageHeader
        title="Site Audit"
        subtitle={<>Technical SEO health for <span className="font-medium text-ink">{domain}</span></>}
        actions={
          report && (
            <PrimaryButton onClick={runAudit} disabled={running}>
              <RefreshCw size={14} className={running ? "animate-spin" : ""} /> Re-run audit
            </PrimaryButton>
          )
        }
      />

      {error && !running && (
        <div className="rounded-xl border border-hairline bg-surface p-4">
          <p className="text-sm font-medium text-critical">Audit failed</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{error}</p>
          <button
            onClick={runAudit}
            className="mt-3 rounded-md border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-2"
          >
            Try again
          </button>
        </div>
      )}

      {!report && !running && !error && (
        <div className="rounded-xl border border-hairline bg-surface">
          <EmptyState
            icon={<Stethoscope size={20} strokeWidth={1.6} />}
            title={`No audit yet for ${domain}`}
            hint="Crawl the site to check meta tags, broken links, performance, structured data, and content quality."
            action={
              <PrimaryButton onClick={runAudit}>
                <PlayCircle size={15} /> Run Audit
              </PrimaryButton>
            }
          />
        </div>
      )}

      {running && !report && (
        <div className="rounded-xl border border-hairline bg-surface p-6">
          <div className="flex items-center gap-3">
            <RefreshCw size={16} className="animate-spin text-accent" />
            <div>
              <p className="text-sm font-medium">Auditing {domain}…</p>
              <p className="text-xs text-muted">
                Checking on-page tags, performance, accessibility, and best practices. Real audits take 10–30s.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-hairline bg-surface p-4">
                <div className="skeleton h-3 w-20" />
                <div className="skeleton mt-3 h-7 w-14" />
              </div>
            ))}
          </div>
        </div>
      )}

      {report && (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="rounded-xl border border-hairline bg-surface p-4">
              <p className="text-xs font-medium text-ink-2">Health score</p>
              <div className="mt-1.5 flex items-center gap-3">
                <p className="text-[26px] font-semibold leading-none tracking-tight">{report.healthScore}</p>
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2">
                  <span className="block h-full rounded-full" style={{ width: `${report.healthScore}%`, background: healthColor }} />
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">
                {health >= 80 ? "Healthy" : health >= 60 ? "Needs attention" : "At risk"} · out of 100
              </p>
            </div>
            <StatCard label={report.crawledPages === 1 ? "Pages audited" : "Crawled pages"} value={num(report.crawledPages)} />
            <StatCard label="Errors" value={num(report.errors)} />
            <StatCard label="Warnings" value={num(report.warnings)} />
            <StatCard label="Notices" value={num(report.notices)} />
          </section>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Issues to fix</h2>
              <FilterBar>
                <PillGroup options={["All", "Error", "Warning", "Notice"]} value={severity} onChange={setSeverity} />
              </FilterBar>
            </div>
            <DataTable
              columns={columns}
              rows={issues}
              rowKey={(r) => r.id}
              loading={running}
              skeletonRows={6}
              exportName={`${domain}-audit-issues`}
              emptyTitle="Nothing at this severity"
              emptyHint="Good news — switch the filter to review remaining issue levels."
            />
          </div>
        </>
      )}
    </>
  );
}
