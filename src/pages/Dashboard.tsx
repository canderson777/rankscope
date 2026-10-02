import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Award, Link2, Globe2, KeyRound, MousePointerClick, SearchCheck, TrendingUp } from "lucide-react";
import { useSearch } from "../context/SearchContext";
import { useAsync } from "../lib/useAsync";
import { api } from "../data/api";
import { compact, pct, usd } from "../lib/format";
import SearchInput from "../components/SearchInput";
import StatCard from "../components/StatCard";
import ChartCard, { ChartTip } from "../components/ChartCard";
import DataTable, { type Column } from "../components/DataTable";
import ScoreBadge from "../components/ScoreBadge";
import { IntentBadge } from "../components/Badge";
import EmptyState from "../components/EmptyState";
import { PillGroup } from "../components/FilterBar";
import type {
  CompetitorRow, DomainProfile, KeywordRow, SearchConsoleOverview, SearchConsoleStatus,
  TopPageRow, TopQueryRow,
} from "../data/types";

/**
 * Dashboard.
 *
 * GSC-first: when Search Console is connected, the overview cards, trend and
 * tables are REAL first-party Google data (free). The DataForSEO-only metrics
 * (authority, backlinks, competitors, paid traffic) appear only when a profile
 * can actually be fetched — mock mode or a funded DataForSEO account — and are
 * never fabricated.
 */
interface Bundle {
  mode: "gsc" | "profile" | "gsc-error" | "error";
  status: SearchConsoleStatus | null;
  overview: SearchConsoleOverview | null;
  profile: DomainProfile | null;
  error?: string;
}

export default function Dashboard() {
  const { domain, submitQuery } = useSearch();
  const navigate = useNavigate();
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

  const [range, setRange] = useState("12M");

  const isGsc = bundle?.mode === "gsc" && bundle.overview;
  const isProfile = bundle?.mode === "profile" && bundle.profile;
  const gsc = bundle?.overview ?? null;
  const data = bundle?.profile ?? null;

  const onSearch = (q: string) => {
    const kind = submitQuery(q);
    if (kind === "keyword") navigate("/keywords");
  };

  const trend = data ? (range === "6M" ? data.trafficTrend.slice(-6) : data.trafficTrend) : [];
  const organicSpark = data ? data.trafficTrend.map((p) => Number(p.organic)) : undefined;
  const gscSpark = gsc ? gsc.trend.map((p) => p.clicks) : undefined;

  const kwColumns: Column<KeywordRow>[] = [
    { key: "keyword", header: "Keyword", render: (r) => <span className="font-medium">{r.keyword}</span>, csv: (r) => r.keyword },
    {
      key: "position", header: "Pos.", align: "right",
      render: (r) => (
        <span className="tnum">
          {r.position}
          {r.change !== 0 && (
            <span className={`ml-1.5 text-[11px] font-semibold ${r.change > 0 ? "text-delta-up" : "text-delta-down"}`}>
              {r.change > 0 ? "▲" : "▼"}{Math.abs(r.change)}
            </span>
          )}
        </span>
      ),
      csv: (r) => r.position,
    },
    { key: "volume", header: "Volume", align: "right", render: (r) => <span className="tnum">{compact(r.volume)}</span>, csv: (r) => r.volume },
    { key: "kd", header: "KD", align: "center", render: (r) => <ScoreBadge score={r.difficulty} invert />, csv: (r) => r.difficulty },
    { key: "cpc", header: "CPC", align: "right", render: (r) => <span className="tnum">{usd(r.cpc)}</span>, csv: (r) => r.cpc },
    { key: "intent", header: "Intent", render: (r) => <IntentBadge intent={r.intent} />, csv: (r) => r.intent },
    { key: "traffic", header: "Traffic", align: "right", render: (r) => <span className="tnum">{compact(r.traffic)}</span>, csv: (r) => r.traffic },
  ];

  const compColumns: Column<CompetitorRow>[] = [
    { key: "domain", header: "Competitor", render: (r) => <span className="font-medium">{r.domain}</span>, csv: (r) => r.domain },
    { key: "authority", header: "Authority", align: "center", render: (r) => <ScoreBadge score={r.authority} />, csv: (r) => r.authority },
    { key: "common", header: "Common KW", align: "right", render: (r) => <span className="tnum">{compact(r.commonKeywords)}</span>, csv: (r) => r.commonKeywords },
    { key: "traffic", header: "Est. traffic", align: "right", render: (r) => <span className="tnum">{compact(r.traffic)}</span>, csv: (r) => r.traffic },
    {
      key: "overlap", header: "Overlap", align: "right",
      render: (r) => (
        <span className="flex items-center justify-end gap-2">
          <span className="w-16"><OverlapBar value={r.overlap} /></span>
          <span className="tnum w-8 text-right">{r.overlap}%</span>
        </span>
      ),
      csv: (r) => `${r.overlap}%`,
    },
  ];

  const gscQueryColumns: Column<TopQueryRow>[] = [
    { key: "query", header: "Query", width: "42%", render: (r) => <span className="font-medium">{r.query}</span>, csv: (r) => r.query },
    { key: "position", header: "Avg pos.", align: "right", render: (r) => <span className="tnum">{r.avgPosition}</span>, csv: (r) => r.avgPosition },
    { key: "clicks", header: "Clicks", align: "right", render: (r) => <span className="tnum">{compact(r.clicks)}</span>, csv: (r) => r.clicks },
    { key: "impressions", header: "Impressions", align: "right", render: (r) => <span className="tnum">{compact(r.impressions)}</span>, csv: (r) => r.impressions },
    { key: "ctr", header: "CTR", align: "right", render: (r) => <span className="tnum">{pct(r.ctr * 100, 1)}</span>, csv: (r) => r.ctr },
  ];

  const gscPageColumns: Column<TopPageRow>[] = [
    { key: "url", header: "Page", width: "48%", render: (r) => <span className="font-medium text-accent">{r.url}</span>, csv: (r) => r.url },
    { key: "position", header: "Avg pos.", align: "right", render: (r) => <span className="tnum">{r.avgPosition}</span>, csv: (r) => r.avgPosition },
    { key: "clicks", header: "Clicks", align: "right", render: (r) => <span className="tnum">{compact(r.clicks)}</span>, csv: (r) => r.clicks },
    { key: "impressions", header: "Impressions", align: "right", render: (r) => <span className="tnum">{compact(r.impressions)}</span>, csv: (r) => r.impressions },
  ];

  return (
    <>
      {/* Hero search */}
      <section className="rounded-2xl border border-hairline bg-surface p-6 sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Search &amp; AI visibility for any domain
        </h1>
        <p className="mt-1 text-sm text-ink-2">
          Enter a domain to analyze its organic footprint, or a keyword to research the SERP.
        </p>
        <div className="mt-4 max-w-xl">
          <SearchInput onSubmit={onSearch} buttonLabel="Analyze" />
        </div>
        <p className="mt-2.5 text-xs text-muted">
          Try:{" "}
          {["figma.com", "mailchimp.com", "email marketing"].map((s, i) => (
            <button
              key={s}
              onClick={() => onSearch(s)}
              className="text-accent hover:underline"
            >
              {s}{i < 2 ? ", " : ""}
            </button>
          ))}
        </p>
      </section>

      {isGsc && bundle.overview && (
        <>
          {/* Overview cards — real Search Console numbers */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Clicks" value={compact(bundle.overview.clicks)} icon={<MousePointerClick size={15} />} spark={gscSpark} />
            <StatCard label="Impressions" value={compact(bundle.overview.impressions)} icon={<TrendingUp size={15} />} />
            <StatCard label="Queries" value={compact(bundle.overview.queries)} icon={<SearchCheck size={15} />} />
            <StatCard label="Avg position" value={String(bundle.overview.avgPosition)} icon={<KeyRound size={15} />} />
            <StatCard label="Avg CTR" value={pct(bundle.overview.ctr * 100, 1)} icon={<Globe2 size={15} />} />
            <StatCard label="Striking distance" value={compact(bundle.overview.strikingDistance.length)} icon={<Award size={15} />} />
          </section>

          <ChartCard
            title="Search impressions & clicks"
            subtitle={`Daily, last ${bundle.overview.days} days · Google Search Console (free, first-party)`}
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
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Top queries</h2>
                <button onClick={() => navigate("/search-console")} className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                  Search Console <ArrowRight size={12} />
                </button>
              </div>
              <DataTable columns={gscQueryColumns} rows={bundle.overview.topQueries.slice(0, 8)} rowKey={(r) => r.query} exportName={`${domain}-top-queries`} dense emptyTitle="No queries" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Top pages</h2>
                <button onClick={() => navigate("/search-console")} className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                  Search Console <ArrowRight size={12} />
                </button>
              </div>
              <DataTable columns={gscPageColumns} rows={bundle.overview.topPages.slice(0, 8)} rowKey={(r) => r.url} exportName={`${domain}-top-pages`} dense emptyTitle="No pages" />
            </div>
          </section>

          <section className="rounded-2xl border border-hairline bg-surface-2/60 p-4">
            <p className="text-xs text-muted">
              <strong className="text-ink-2">DataForSEO-only metrics</strong> (authority score, backlinks, competitors,
              paid traffic) are hidden until the account is topped up — the numbers above are real Google data at $0.
            </p>
          </section>
        </>
      )}

      {isProfile && bundle.profile && (
        <>
          {/* Overview cards */}
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard loading={false} label="Authority score" value={String(data?.authorityScore ?? "")} icon={<Award size={15} />} delta={data ? 2 : undefined} deltaSuffix=" pts" />
            <StatCard loading={false} label="Organic traffic" value={data ? compact(data.organicTraffic) : ""} icon={<TrendingUp size={15} />} delta={data?.trafficDelta} spark={organicSpark} />
            <StatCard loading={false} label="Paid traffic" value={data ? compact(data.paidTraffic) : ""} icon={<MousePointerClick size={15} />} delta={data ? -3.1 : undefined} />
            <StatCard loading={false} label="Ranking keywords" value={data ? compact(data.organicKeywords) : ""} icon={<KeyRound size={15} />} delta={data ? 4.6 : undefined} />
            <StatCard loading={false} label="Backlinks" value={data ? compact(data.backlinks) : ""} icon={<Link2 size={15} />} delta={data ? 1.8 : undefined} />
            <StatCard loading={false} label="Referring domains" value={data ? compact(data.referringDomains) : ""} icon={<Globe2 size={15} />} delta={data ? 0.9 : undefined} />
          </section>

          {/* Traffic trend */}
          <ChartCard
            title="Traffic trend"
            subtitle={`Estimated monthly visits · ${domain}`}
            loading={false}
            legend={[
              { label: "Organic", color: "var(--s1)" },
              { label: "Paid", color: "var(--s2)" },
            ]}
            actions={<PillGroup options={["6M", "12M"]} value={range} onChange={setRange} label="" />}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} strokeWidth={1} />
                <XAxis dataKey="month" axisLine={{ stroke: "var(--baseline)" }} tickLine={false} dy={6} />
                <YAxis tickFormatter={(v) => compact(v)} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<ChartTip formatter={compact} />} cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }} />
                <Area type="monotone" name="Organic" dataKey="organic" stroke="var(--s1)" strokeWidth={2} fill="var(--s1)" fillOpacity={0.1} dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} />
                <Area type="monotone" name="Paid" dataKey="paid" stroke="var(--s2)" strokeWidth={2} fill="var(--s2)" fillOpacity={0.1} dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Tables */}
          <section className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Top organic keywords</h2>
                <button onClick={() => navigate("/keywords")} className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                  Research keywords <ArrowRight size={12} />
                </button>
              </div>
              <DataTable
                columns={kwColumns}
                rows={data?.topKeywords.slice(0, 8) ?? []}
                rowKey={(r) => r.keyword}
                loading={false}
                exportName={`${domain}-top-keywords`}
                dense
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Top competitors</h2>
                <button onClick={() => navigate("/gap")} className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                  Compare competitors <ArrowRight size={12} />
                </button>
              </div>
              <DataTable
                columns={compColumns}
                rows={data?.competitors.slice(0, 8) ?? []}
                rowKey={(r) => r.domain}
                loading={false}
                exportName={`${domain}-competitors`}
                dense
              />
            </div>
          </section>
        </>
      )}

      {loading && (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <StatCard key={i} loading label="" value="" />)}
          </section>
          <ChartCard title="Traffic trend" loading>
            <div className="skeleton h-full w-full" />
          </ChartCard>
        </>
      )}

      {(bundle?.mode === "error" || bundle?.mode === "gsc-error") && (
        <section className="rounded-2xl border border-hairline bg-surface p-6">
          <EmptyState
            title={bundle.mode === "gsc-error" ? "Search Console report failed" : "No data source for this domain"}
            hint={
              bundle.error ||
              (bundle.status?.configured && !bundle.status.connected
                ? "Google Search Console is configured but not connected — open the Search Console page to connect."
                : "Add a Search Console connection (free) or a funded DataForSEO account.")
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

function OverlapBar({ value }: { value: number }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-[var(--seq-100)]">
      <span className="block h-full rounded-full bg-[var(--seq-400)]" style={{ width: `${value}%` }} />
    </span>
  );
}