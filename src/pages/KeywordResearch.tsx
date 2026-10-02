import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HelpCircle, Layers } from "lucide-react";
import { useSearch } from "../context/SearchContext";
import { useAsync } from "../lib/useAsync";
import { api } from "../data/api";
import { compact, usd } from "../lib/format";
import SearchInput from "../components/SearchInput";
import StatCard from "../components/StatCard";
import ChartCard, { ChartTip } from "../components/ChartCard";
import DataTable, { type Column } from "../components/DataTable";
import ScoreBadge from "../components/ScoreBadge";
import { IntentBadge } from "../components/Badge";
import { FilterBar, FilterSelect } from "../components/FilterBar";
import Meter from "../components/Meter";
import type { KeywordCluster, RelatedKeyword } from "../data/types";

export default function KeywordResearch() {
  const { keyword, setKeyword } = useSearch();
  const { data, loading } = useAsync(() => api.keywordOverview(keyword), [keyword]);
  const [intentFilter, setIntentFilter] = useState("All intents");

  const kdLabel = (kd: number) =>
    kd >= 70 ? "Hard" : kd >= 45 ? "Moderate" : "Easy";

  const filterRows = (rows: RelatedKeyword[]) =>
    intentFilter === "All intents" ? rows : rows.filter((r) => r.intent === intentFilter);

  const relColumns: Column<RelatedKeyword>[] = [
    { key: "keyword", header: "Keyword", render: (r) => <span className="font-medium">{r.keyword}</span>, csv: (r) => r.keyword },
    { key: "volume", header: "Volume", align: "right", render: (r) => <span className="tnum">{compact(r.volume)}</span>, csv: (r) => r.volume },
    { key: "kd", header: "KD", align: "center", render: (r) => <ScoreBadge score={r.difficulty} invert />, csv: (r) => r.difficulty },
    { key: "cpc", header: "CPC", align: "right", render: (r) => <span className="tnum">{usd(r.cpc)}</span>, csv: (r) => r.cpc },
    { key: "intent", header: "Intent", render: (r) => <IntentBadge intent={r.intent} />, csv: (r) => r.intent },
  ];

  const clusterColumns: Column<KeywordCluster>[] = [
    {
      key: "name", header: "Cluster",
      render: (r) => (
        <span className="flex items-center gap-2 font-medium">
          <Layers size={13} className="shrink-0 text-muted" /> {r.name}
        </span>
      ),
      csv: (r) => r.name,
    },
    { key: "keywords", header: "Keywords", align: "right", render: (r) => <span className="tnum">{r.keywords}</span>, csv: (r) => r.keywords },
    { key: "volume", header: "Total volume", align: "right", render: (r) => <span className="tnum">{compact(r.totalVolume)}</span>, csv: (r) => r.totalVolume },
    {
      key: "kd", header: "Avg. KD", align: "right",
      render: (r) => (
        <span className="flex items-center justify-end gap-2">
          <span className="w-16"><Meter value={100 - r.avgDifficulty} severity /></span>
          <span className="tnum w-6 text-right">{r.avgDifficulty}</span>
        </span>
      ),
      csv: (r) => r.avgDifficulty,
    },
    { key: "intent", header: "Dominant intent", render: (r) => <IntentBadge intent={r.intent} />, csv: (r) => r.intent },
  ];

  return (
    <>
      <section className="rounded-2xl border border-hairline bg-surface p-6">
        <h1 className="text-xl font-semibold tracking-tight">Keyword Research</h1>
        <p className="mt-1 text-sm text-ink-2">Volume, difficulty, intent, and clusters for any seed keyword.</p>
        <div className="mt-4 max-w-xl">
          <SearchInput
            onSubmit={(q) => setKeyword(q.toLowerCase())}
            placeholder="Enter a seed keyword, e.g. email marketing…"
            buttonLabel="Research"
            defaultValue={keyword}
          />
        </div>
      </section>

      {/* Keyword overview */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard loading={loading} label="Search volume / mo" value={data ? compact(data.volume) : ""} spark={data?.volumeTrend.map((p) => Number(p.volume))} />
        <div className="rounded-xl border border-hairline bg-surface p-4">
          {loading ? (
            <><div className="skeleton h-3 w-24" /><div className="skeleton mt-3 h-7 w-20" /></>
          ) : data && (
            <>
              <p className="text-xs font-medium text-ink-2">Keyword difficulty</p>
              <div className="mt-1.5 flex items-center gap-3">
                <p className="text-[26px] font-semibold leading-none tracking-tight">{data.difficulty}</p>
                <ScoreBadge score={data.difficulty} invert />
              </div>
              <p className="mt-2 text-xs text-muted">{kdLabel(data.difficulty)} to rank in top 10</p>
            </>
          )}
        </div>
        <StatCard loading={loading} label="Avg. CPC" value={data ? usd(data.cpc) : ""} />
        <div className="rounded-xl border border-hairline bg-surface p-4">
          {loading ? (
            <><div className="skeleton h-3 w-24" /><div className="skeleton mt-3 h-7 w-20" /></>
          ) : data && (
            <>
              <p className="text-xs font-medium text-ink-2">Search intent</p>
              <div className="mt-2"><IntentBadge intent={data.intent} /></div>
              <p className="mt-2 text-xs text-muted">Paid competition {Math.round(data.competition * 100)}%</p>
            </>
          )}
        </div>
      </section>

      <ChartCard
        title="Search volume trend"
        subtitle={`"${keyword}" · monthly searches, last 12 months`}
        loading={loading}
        height={220}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data?.volumeTrend ?? []} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} strokeWidth={1} />
            <XAxis dataKey="month" axisLine={{ stroke: "var(--baseline)" }} tickLine={false} dy={6} />
            <YAxis tickFormatter={(v) => compact(v)} axisLine={false} tickLine={false} width={44} />
            <Tooltip content={<ChartTip formatter={compact} />} cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }} />
            <Area type="monotone" name="Searches" dataKey="volume" stroke="var(--s1)" strokeWidth={2} fill="var(--s1)" fillOpacity={0.1} dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <FilterBar>
        <FilterSelect
          label="Intent"
          options={["All intents", "Informational", "Commercial", "Transactional", "Navigational"]}
          value={intentFilter}
          onChange={setIntentFilter}
        />
      </FilterBar>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Related keywords</h2>
          <DataTable
            columns={relColumns}
            rows={data ? filterRows(data.related) : []}
            rowKey={(r) => r.keyword}
            loading={loading}
            exportName={`${keyword}-related-keywords`}
            emptyTitle="No keywords match this intent"
            emptyHint="Try a different intent filter or a broader seed keyword."
            dense
          />
        </div>
        <div className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <HelpCircle size={14} className="text-muted" /> Questions people ask
          </h2>
          <DataTable
            columns={relColumns}
            rows={data ? filterRows(data.questions) : []}
            rowKey={(r) => r.keyword}
            loading={loading}
            exportName={`${keyword}-questions`}
            emptyTitle="No questions match this intent"
            emptyHint="Questions are mostly informational — reset the filter to see them."
            dense
          />
        </div>
      </section>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Keyword clusters</h2>
        <p className="text-xs text-muted">Group related terms into one page target instead of cannibalizing across posts.</p>
        <DataTable
          columns={clusterColumns}
          rows={data?.clusters ?? []}
          rowKey={(r) => r.name}
          loading={loading}
          exportName={`${keyword}-clusters`}
        />
      </div>
    </>
  );
}
