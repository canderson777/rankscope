import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, Download, Minus } from "lucide-react";
import { useSearch } from "../context/SearchContext";
import { useAsync } from "../lib/useAsync";
import { api } from "../data/api";
import { compact, exportCsv, num, pct } from "../lib/format";
import PageHeader, { GhostButton } from "../components/PageHeader";
import ChartCard, { ChartTip } from "../components/ChartCard";
import DataTable, { type Column } from "../components/DataTable";
import ScoreBadge from "../components/ScoreBadge";
import { Badge } from "../components/Badge";
import EmptyState from "../components/EmptyState";
import type {
  CompetitorRow, DomainProfile, PageRow, SearchConsoleOverview, SearchConsoleStatus,
  TopPageRow, TopQueryRow,
} from "../data/types";

/**
 * Domain Overview.
 *
 * If Search Console is connected we show REAL first-party Google data:
 * clicks, impressions, queries, position, daily trend, top queries and pages —
 * all free, no DataForSEO credit. DataForSEO-only metrics (authority, backlinks,
 * competitors, paid traffic, SERP features) are shown only when a profile can
 * actually be fetched (mock mode or a funded DataForSEO account) and are
 * labelled as estimated/simulated when they are.
 */
interface Bundle {
  mode: "gsc" | "profile" | "gsc-error" | "error";
  status: SearchConsoleStatus | null;
  overview: SearchConsoleOverview | null;
  profile: DomainProfile | null;
  error?: string;
}

export default function DomainOverview() {
  const { domain } = useSearch();
  const { data: bundle, loading } = useAsync<Bundle>(
    async () => {
      let status: SearchConsoleStatus | null = null;
      try {
        status = await api.gscStatus();
      } catch {
        status = { configured: false, connected: false, siteUrl: null, hint: "Search Console unavailable." };
      }

      if (status?.connected) {
        try {
          const overview = await api.gscOverview(domain, 90);
          return { mode: "gsc", status, overview, profile: null };
        } catch (err) {
          return {
            mode: "gsc-error", status, overview: null, profile: null,
            error: err instanceof Error ? err.message : "Search Console report failed.",
          };
        }
      }

      try {
        const profile = await api.domainProfile(domain);
        return { mode: "profile", status, overview: null, profile };
      } catch (err) {
        return {
          mode: "error", status, overview: null, profile: null,
          error: err instanceof Error ? err.message : "Domain profile unavailable.",
        };
      }
    },
    [domain],
  );

  const isGsc = bundle?.mode === "gsc" && bundle.overview;
  const isProfile = bundle?.mode === "profile" && bundle.profile;

  const exportReport = () => {
    if (isGsc && bundle.overview) {
      const o = bundle.overview;
      exportCsv(`${domain}-overview`, ["Metric", "Value"], [
        ["Domain", o.domain],
        ["Site", o.siteUrl],
        ["Window", `${o.startDate} → ${o.endDate}`],
        ["Clicks", o.clicks],
        ["Impressions", o.impressions],
        ["Avg CTR", pct(o.ctr * 100, 1)],
        ["Avg position", o.avgPosition],
        ["Queries", o.queries],
      ]);
      return;
    }
    if (isProfile && bundle.profile) {
      const d = bundle.profile;
      exportCsv(`${domain}-overview`, ["Metric", "Value"], [
        ["Domain", d.domain],
        ["Category", d.niche],
        ["Authority score", d.authorityScore],
        ["Organic traffic", d.organicTraffic],
        ["Paid traffic", d.paidTraffic],
        ["Organic keywords", d.organicKeywords],
        ["Backlinks", d.backlinks],
        ["Referring domains", d.referringDomains],
      ]);
    }
  };

  const queryColumns: Column<TopQueryRow>[] = [
    { key: "query", header: "Query", width: "40%", render: (r) => <span className="font-medium">{r.query}</span>, csv: (r) => r.query },
    { key: "position", header: "Avg pos.", align: "right", render: (r) => <span className="tnum">{r.avgPosition}</span>, csv: (r) => r.avgPosition },
    { key: "clicks", header: "Clicks", align: "right", render: (r) => <span className="tnum">{compact(r.clicks)}</span>, csv: (r) => r.clicks },
    { key: "impressions", header: "Impressions", align: "right", render: (r) => <span className="tnum">{compact(r.impressions)}</span>, csv: (r) => r.impressions },
    { key: "ctr", header: "CTR", align: "right", render: (r) => <span className="tnum">{pct(r.ctr * 100, 1)}</span>, csv: (r) => r.ctr },
  ];

  const pageColumns: Column<TopPageRow>[] = [
    { key: "url", header: "Page", width: "44%", render: (r) => <span className="font-medium text-accent">{r.url}</span>, csv: (r) => r.url },
    { key: "position", header: "Avg pos.", align: "right", render: (r) => <span className="tnum">{r.avgPosition}</span>, csv: (r) => r.avgPosition },
    { key: "clicks", header: "Clicks", align: "right", render: (r) => <span className="tnum">{compact(r.clicks)}</span>, csv: (r) => r.clicks },
    { key: "impressions", header: "Impressions", align: "right", render: (r) => <span className="tnum">{compact(r.impressions)}</span>, csv: (r) => r.impressions },
  ];

  const profilePageColumns: Column<PageRow>[] = [
    { key: "url", header: "Page", render: (r) => <span className="font-medium text-accent">{r.url}</span>, csv: (r) => r.url },
    { key: "traffic", header: "Traffic", align: "right", render: (r) => <span className="tnum">{compact(r.traffic)}</span>, csv: (r) => r.traffic },
    { key: "keywords", header: "Keywords", align: "right", render: (r) => <span className="tnum">{compact(r.keywords)}</span>, csv: (r) => r.keywords },
    { key: "backlinks", header: "Backlinks", align: "right", render: (r) => <span className="tnum">{compact(r.backlinks)}</span>, csv: (r) => r.backlinks },
  ];

  const compColumns: Column<CompetitorRow>[] = [
    { key: "domain", header: "Domain", render: (r) => <span className="font-medium">{r.domain}</span>, csv: (r) => r.domain },
    { key: "authority", header: "Authority", align: "center", render: (r) => <ScoreBadge score={r.authority} />, csv: (r) => r.authority },
    { key: "traffic", header: "Est. traffic", align: "right", render: (r) => <span className="tnum">{compact(r.traffic)}</span>, csv: (r) => r.traffic },
    { key: "common", header: "Common keywords", align: "right", render: (r) => <span className="tnum">{num(r.commonKeywords)}</span>, csv: (r) => r.commonKeywords },
    { key: "overlap", header: "Overlap", align: "right", render: (r) => <span className="tnum">{r.overlap}%</span>, csv: (r) => `${r.overlap}%` },
  ];

  return (
    <>
      <PageHeader
        title="Domain Overview"
        subtitle={<>Organic profile for <span className="font-medium text-ink">{domain}</span></>}
        actions={
          <GhostButton onClick={exportReport} disabled={loading || (!isGsc && !isProfile)}>
            <Download size={14} /> Export report
          </GhostButton>
        }
      />

      {isGsc && bundle.overview && (
        <>
          {/* Summary strip — real Search Console numbers */}
          <section className="rounded-xl border border-hairline bg-surface p-5">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-base font-semibold">{bundle.overview.domain}</p>
                  <p className="text-xs text-muted">Google Search Console · <Badge tone="good">Free, first-party</Badge></p>
                </div>
              </div>
              <Summary label="Clicks" value={compact(bundle.overview.clicks)} />
              <Summary label="Impressions" value={compact(bundle.overview.impressions)} />
              <Summary label="Queries" value={compact(bundle.overview.queries)} />
              <Summary label="Avg position" value={String(bundle.overview.avgPosition)} />
              <Summary label="Avg CTR" value={pct(bundle.overview.ctr * 100, 1)} />
            </div>
            <p className="mt-3 text-xs text-muted">
              {bundle.overview.startDate} → {bundle.overview.endDate} · {bundle.overview.note}
            </p>
          </section>

          <ChartCard
            title="Search impressions & clicks"
            subtitle={`Daily, last ${bundle.overview.days} days · ${bundle.overview.siteUrl || domain}`}
            loading={false}
            legend={[
              { label: "Impressions", color: "var(--s1)" },
              { label: "Clicks", color: "var(--s3)" },
            ]}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bundle.overview.trend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} strokeWidth={1} />
                <XAxis dataKey="date" axisLine={{ stroke: "var(--baseline)" }} tickLine={false} dy={6} minTickGap={24} />
                <YAxis tickFormatter={(v) => compact(v)} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<ChartTip formatter={compact} />} cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }} />
                <Area type="monotone" name="Impressions" dataKey="impressions" stroke="var(--s1)" strokeWidth={2} fill="var(--s1)" fillOpacity={0.1} dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} />
                <Area type="monotone" name="Clicks" dataKey="clicks" stroke="var(--s3)" strokeWidth={2} fill="var(--s3)" fillOpacity={0.08} dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Top queries</h2>
              <DataTable columns={queryColumns} rows={bundle.overview.topQueries} rowKey={(r) => r.query} exportName={`${domain}-top-queries`} dense emptyTitle="No queries" />
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Top pages</h2>
              <DataTable columns={pageColumns} rows={bundle.overview.topPages} rowKey={(r) => r.url} exportName={`${domain}-top-pages`} dense emptyTitle="No pages" />
            </div>
          </section>

          <section className="rounded-2xl border border-hairline bg-surface-2/60 p-4">
            <p className="text-xs text-muted">
              <strong className="text-ink-2">DataForSEO-only metrics</strong> (authority score, backlinks, competitors,
              paid traffic, SERP features) are hidden until the account is topped up — the numbers above are real
              Google data at $0.
            </p>
          </section>
        </>
      )}

      {isProfile && bundle.profile && (
        <>
          <section className="rounded-xl border border-hairline bg-surface p-5">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <div className="flex items-center gap-3">
                <ScoreBadge score={bundle.profile.authorityScore} size="md" />
                <div>
                  <p className="text-base font-semibold">{bundle.profile.domain}</p>
                  <p className="text-xs text-muted">Authority score · <Badge tone="neutral">{bundle.profile.niche}</Badge></p>
                </div>
              </div>
              <Summary label="Organic traffic" value={compact(bundle.profile.organicTraffic)} />
              <Summary label="Paid traffic" value={compact(bundle.profile.paidTraffic)} />
              <Summary label="Keywords" value={compact(bundle.profile.organicKeywords)} />
              <Summary label="Backlinks" value={compact(bundle.profile.backlinks)} />
              <Summary label="Ref. domains" value={compact(bundle.profile.referringDomains)} />
            </div>
          </section>

          <ChartCard
            title="Organic traffic trend"
            subtitle="Estimated monthly organic visits, last 12 months"
            loading={false}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bundle.profile.trafficTrend ?? []} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} strokeWidth={1} />
                <XAxis dataKey="month" axisLine={{ stroke: "var(--baseline)" }} tickLine={false} dy={6} />
                <YAxis tickFormatter={(v) => compact(v)} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<ChartTip formatter={compact} />} cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }} />
                <Area type="monotone" name="Organic visits" dataKey="organic" stroke="var(--s1)" strokeWidth={2} fill="var(--s1)" fillOpacity={0.1} dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Top ranking pages</h2>
              <DataTable columns={profilePageColumns} rows={bundle.profile.topPages} rowKey={(r) => r.url} exportName={`${domain}-top-pages`} dense />
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Competitor comparison</h2>
              <DataTable columns={compColumns} rows={bundle.profile.competitors.slice(0, 6)} rowKey={(r) => r.domain} exportName={`${domain}-competitor-comparison`} dense />
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">SERP feature presence</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {bundle.profile.serpFeatures.map((f) => (
                <div key={f.name} className="rounded-xl border border-hairline bg-surface p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium">{f.name}</p>
                    {f.present ? (
                      <span className="grid size-5 place-items-center rounded-full bg-good/12 text-delta-up dark:text-good"><Check size={12} strokeWidth={2.5} /></span>
                    ) : (
                      <span className="grid size-5 place-items-center rounded-full bg-surface-2 text-muted"><Minus size={12} /></span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">{f.present ? `${num(f.keywords)} keywords` : "Not present"}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {loading && (
        <section className="rounded-xl border border-hairline bg-surface p-5">
          <div className="skeleton h-4 w-48" />
          <div className="mt-4 grid grid-cols-3 gap-4"><div className="skeleton h-6 w-full" /><div className="skeleton h-6 w-full" /><div className="skeleton h-6 w-full" /></div>
        </section>
      )}

      {(bundle?.mode === "error" || bundle?.mode === "gsc-error") && (
        <section className="rounded-2xl border border-hairline bg-surface p-6">
          <EmptyState
            title={bundle.mode === "gsc-error" ? "Search Console report failed" : "No data source for this domain"}
            hint={
              bundle.error || (
                bundle.status?.configured && !bundle.status.connected
                  ? "Google Search Console is configured but not connected — open the Search Console page to connect."
                  : "Add a Search Console connection (free) or a funded DataForSEO account."
              )
            }
          />
          {bundle.status?.hint && <p className="mt-2 text-xs text-muted">{bundle.status.hint}</p>}
        </section>
      )}

      {!loading && !isGsc && !isProfile && !(bundle?.mode === "error" || bundle?.mode === "gsc-error") && (
        <EmptyState title="Nothing to show" hint="No data source available for this domain." />
      )}

      <p className="mt-4 text-xs text-muted">
        Data source:{" "}
        <span className="font-medium">{isGsc ? "Google Search Console (free, first-party)" : isProfile ? (bundle?.status?.connected ? "DataForSEO profile" : "Estimated mock profile") : "none — see above"}</span>
      </p>
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}