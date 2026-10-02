import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSearch } from "../context/SearchContext";
import { useAsync } from "../lib/useAsync";
import { api } from "../data/api";
import { compact, num } from "../lib/format";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ChartCard, { ChartTip } from "../components/ChartCard";
import DataTable, { type Column } from "../components/DataTable";
import ScoreBadge from "../components/ScoreBadge";
import { Badge } from "../components/Badge";
import { FilterBar, PillGroup } from "../components/FilterBar";
import type { BacklinkRow } from "../data/types";

export default function BacklinkAnalytics() {
  const { domain } = useSearch();
  const { data, loading } = useAsync(() => api.backlinkProfile(domain), [domain]);
  const [linkType, setLinkType] = useState("All");

  const rows = (data?.rows ?? []).filter((r) =>
    linkType === "All" ? true : linkType === "Follow" ? r.follow : !r.follow,
  );

  const columns: Column<BacklinkRow>[] = [
    {
      key: "source", header: "Source page", width: "26%",
      render: (r) => <span className="break-all font-medium text-accent">{r.sourceUrl}</span>,
      csv: (r) => r.sourceUrl,
    },
    {
      key: "target", header: "Target", width: "20%",
      render: (r) => <span className="break-all text-ink-2">{r.targetUrl}</span>,
      csv: (r) => r.targetUrl,
    },
    { key: "anchor", header: "Anchor text", render: (r) => <span className="italic text-ink-2">“{r.anchor}”</span>, csv: (r) => r.anchor },
    { key: "authority", header: "Authority", align: "center", render: (r) => <ScoreBadge score={r.authority} />, csv: (r) => r.authority },
    {
      key: "type", header: "Type", align: "center",
      render: (r) => <Badge tone={r.follow ? "aqua" : "neutral"}>{r.follow ? "Follow" : "Nofollow"}</Badge>,
      csv: (r) => (r.follow ? "Follow" : "Nofollow"),
    },
    { key: "firstSeen", header: "First seen", align: "right", render: (r) => <span className="tnum text-ink-2">{r.firstSeen}</span>, csv: (r) => r.firstSeen },
  ];

  return (
    <>
      <PageHeader
        title="Backlink Analytics"
        subtitle={<>Link profile for <span className="font-medium text-ink">{domain}</span></>}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard loading={loading} label="Total backlinks" value={data ? compact(data.total) : ""} delta={data ? 2.4 : undefined} />
        <StatCard loading={loading} label="Referring domains" value={data ? compact(data.referringDomains) : ""} delta={data ? 1.1 : undefined} />
        <StatCard loading={loading} label="New links (30d)" value={data ? num(data.newLast30) : ""} delta={data ? 6.8 : undefined} />
        <StatCard loading={loading} label="Lost links (30d)" value={data ? num(data.lostLast30) : ""} delta={data ? 3.2 : undefined} invertDelta />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Referring domain authority"
          subtitle="Distribution of referring domains by authority score"
          loading={loading}
          height={240}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.authorityBuckets ?? []} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} strokeWidth={1} />
              <XAxis dataKey="bucket" axisLine={{ stroke: "var(--baseline)" }} tickLine={false} dy={6} />
              <YAxis tickFormatter={(v) => compact(v)} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<ChartTip formatter={num} />} cursor={{ fill: "var(--surface-2)", opacity: 0.6 }} />
              <Bar name="Referring domains" dataKey="count" fill="var(--s1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="New vs lost backlinks"
          subtitle="Monthly link acquisition and churn"
          loading={loading}
          height={240}
          legend={[
            { label: "Gained", color: "var(--s2)" },
            { label: "Lost", color: "var(--s6)" },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.newLostTrend.slice(-8) ?? []} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="24%" barGap={2}>
              <CartesianGrid vertical={false} strokeWidth={1} />
              <XAxis dataKey="month" axisLine={{ stroke: "var(--baseline)" }} tickLine={false} dy={6} />
              <YAxis tickFormatter={(v) => compact(v)} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<ChartTip formatter={num} />} cursor={{ fill: "var(--surface-2)", opacity: 0.6 }} />
              <Bar name="Gained" dataKey="gained" fill="var(--s2)" radius={[4, 4, 0, 0]} maxBarSize={14} />
              <Bar name="Lost" dataKey="lost" fill="var(--s6)" radius={[4, 4, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Backlinks</h2>
          <FilterBar>
            {data && (
              <span className="text-xs text-muted">
                {data.followShare}% follow · {100 - data.followShare}% nofollow
              </span>
            )}
            <PillGroup options={["All", "Follow", "Nofollow"]} value={linkType} onChange={setLinkType} />
          </FilterBar>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.sourceUrl + r.anchor}
          loading={loading}
          skeletonRows={8}
          exportName={`${domain}-backlinks`}
          emptyTitle="No backlinks of this type"
          emptyHint="Switch the link-type filter to see the rest of the profile."
        />
      </div>
    </>
  );
}
