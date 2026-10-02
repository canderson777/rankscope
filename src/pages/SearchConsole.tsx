import { useNavigate } from "react-router-dom";
import { CheckCircle2, ExternalLink, KeyRound, MousePointerClick, SearchCheck, TrendingUp } from "lucide-react";
import PageHeader, { GhostButton } from "../components/PageHeader";
import StatCard from "../components/StatCard";
import DataTable, { type Column } from "../components/DataTable";
import EmptyState from "../components/EmptyState";
import { useSearch } from "../context/SearchContext";
import { useAsync } from "../lib/useAsync";
import { api } from "../data/api";
import { compact, pct } from "../lib/format";
import { normalizeDomainInput } from "../data/projects";
import type { SearchConsoleReport, SearchConsoleStatus, SearchConsoleRow } from "../data/types";

interface GscBundle {
  status: SearchConsoleStatus;
  report: SearchConsoleReport | null;
}

export default function SearchConsolePage() {
  const { domain } = useSearch();
  const navigate = useNavigate();
  const { data, loading } = useAsync<GscBundle>(
    () =>
      api.gscStatus().then(async (status) => {
        if (!status.connected) return { status, report: null };
        try {
          const report = await api.gscReport(domain);
          return { status, report };
        } catch {
          // Connected but no property matched / report unavailable — show stub.
          return { status, report: null };
        }
      }),
    [domain],
  );

  const status = data?.status;
  const report = data?.report;

  const cols: Column<SearchConsoleRow>[] = [
    {
      key: "query", header: "Query", width: "44%",
      render: (r) => <span className="font-medium">{r.query}</span>,
      csv: (r) => r.query,
    },
    {
      key: "position", header: "Avg pos.", align: "right",
      render: (r) => <span className="tnum">{r.avgPosition}</span>,
      csv: (r) => r.avgPosition,
    },
    {
      key: "clicks", header: "Clicks", align: "right",
      render: (r) => <span className="tnum">{compact(r.clicks)}</span>,
      csv: (r) => r.clicks,
    },
    {
      key: "impressions", header: "Impressions", align: "right",
      render: (r) => <span className="tnum">{compact(r.impressions)}</span>,
      csv: (r) => r.impressions,
    },
    {
      key: "ctr", header: "CTR", align: "right",
      render: (r) => <span className="tnum">{pct(r.ctr * 100, 1)}</span>,
      csv: (r) => r.ctr,
    },
  ];

  const connectHref = "/api/gsc/auth";

  return (
    <>
      <PageHeader
        title="Search Console"
        subtitle={
          <>
            Google's own impressions, clicks &amp; position data for{" "}
            <span className="font-medium text-ink">{normalizeDomainInput(domain)}</span> — free, first-party.
          </>
        }
        actions={
          status?.connected ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-xs font-semibold text-good">
              <CheckCircle2 size={13} /> Connected
            </span>
          ) : (
            <GhostButton
              onClick={() => {
                window.location.href = connectHref;
              }}
            >
              <ExternalLink size={14} /> Connect Google Search Console
            </GhostButton>
          )
        }
      />

      {!status?.configured && (
        <section className="rounded-2xl border border-hairline bg-surface p-6">
          <h2 className="text-base font-semibold">Setup required</h2>
          <p className="mt-1 text-sm text-ink-2 leading-relaxed">
            Add <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[12px]">GSC_CLIENT_ID</code> and{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[12px]">GSC_CLIENT_SECRET</code> to{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[12px]">.env.local</code> (Google Cloud OAuth
            client with the Search Console API enabled) and restart. Full steps in{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[12px]">SETUP.md</code>.
          </p>
          {status?.hint && <p className="mt-2 text-xs text-muted">{status.hint}</p>}
        </section>
      )}

      {status?.configured && !status?.connected && (
        <section className="rounded-2xl border border-hairline bg-surface p-6">
          <h2 className="text-base font-semibold">One-time connection</h2>
          <p className="mt-1 text-sm text-ink-2 leading-relaxed">
            Clicking connect opens Google's consent screen. Authorize with the Google account that owns the{" "}
            Search Console property for this domain, then this page loads real impressions and clicks — no
            DataForSEO credit spent.
          </p>
          <div className="mt-3">
            <GhostButton onClick={() => (window.location.href = connectHref)}>
              <ExternalLink size={14} /> Connect Google Search Console
            </GhostButton>
          </div>
          {status?.hint && <p className="mt-2 text-xs text-muted">{status.hint}</p>}
        </section>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} loading label="" value="" />)}
        </div>
      )}

      {status?.connected && report && (
        <>
          {/* Striking distance totals */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Queries (pos 5–20)" value={compact(report.totals.queries)} icon={<SearchCheck size={15} />} />
            <StatCard label="Clicks" value={compact(report.totals.clicks)} icon={<MousePointerClick size={15} />} />
            <StatCard label="Impressions" value={compact(report.totals.impressions)} icon={<TrendingUp size={15} />} />
            <StatCard label="Avg CTR" value={pct(report.totals.ctr * 100, 1)} icon={<KeyRound size={15} />} />
          </section>

          <section className="mt-2 rounded-2xl border border-hairline bg-surface p-4">
            <h2 className="text-sm font-semibold">Striking distance</h2>
            <p className="mt-0.5 text-xs text-muted">
              Queries your site ranks for at average positions 5–20 ·{" "}
              {report.startDate} → {report.endDate} · {report.note}
            </p>
          </section>

          <DataTable
            columns={cols}
            rows={report.strikingDistance}
            rowKey={(r) => r.query}
            exportName={`striking-distance-${normalizeDomainInput(domain)}`}
            emptyTitle="No striking-distance queries yet"
            emptyHint="If this property has data, try a wider window on the domain overview."
          />
        </>
      )}

      {status?.connected && !report && (
        <section className="rounded-2xl border border-hairline bg-surface p-6">
          <EmptyState
            title="No report for this domain"
            hint="No Search Console property matched this domain in the current window. Check the property list in Search Console or set GSC_SITE_URL in .env.local."
          />
        </section>
      )}

      <p className="mt-4 text-xs text-muted">
        <button className="text-accent hover:underline" onClick={() => navigate("/")}>
          ← Back to dashboard
        </button>
      </p>
    </>
  );
}