import { useEffect, useState } from "react";
import { Check, Lightbulb, Minus, RefreshCw, Swords } from "lucide-react";
import { useSearch } from "../context/SearchContext";
import { api, getDomainProfile } from "../data/api";
import { compact } from "../lib/format";
import PageHeader, { PrimaryButton } from "../components/PageHeader";
import DataTable, { type Column } from "../components/DataTable";
import ScoreBadge from "../components/ScoreBadge";
import { Badge, IntentBadge } from "../components/Badge";
import EmptyState from "../components/EmptyState";
import type { BacklinkGapRow, GapAnalysis, GapKeywordRow } from "../data/types";

export default function CompetitorGap() {
  const { domain } = useSearch();
  const [inputs, setInputs] = useState<string[]>([]);
  const [result, setResult] = useState<GapAnalysis | null>(null);
  const [running, setRunning] = useState(false);

  // Suggest competitors from the domain profile whenever the domain changes
  useEffect(() => {
    const suggested = getDomainProfile(domain).competitors.slice(0, 3).map((c) => c.domain);
    setInputs(suggested);
    setResult(null);
  }, [domain]);

  const compare = async () => {
    setRunning(true);
    const r = await api.gapAnalysis(domain, inputs.map((i) => i.trim()).filter(Boolean));
    setResult(r);
    setRunning(false);
  };

  const posCell = (pos: number | null) =>
    pos === null ? (
      <span className="inline-grid size-5 place-items-center rounded-full bg-surface-2 text-muted"><Minus size={11} /></span>
    ) : (
      <span className={`tnum font-medium ${pos <= 3 ? "text-delta-up" : ""}`}>#{pos}</span>
    );

  const kwColumns = (includeMine: boolean): Column<GapKeywordRow>[] => [
    { key: "keyword", header: "Keyword", render: (r) => <span className="font-medium">{r.keyword}</span>, csv: (r) => r.keyword },
    { key: "volume", header: "Volume", align: "right", render: (r) => <span className="tnum">{compact(r.volume)}</span>, csv: (r) => r.volume },
    { key: "kd", header: "KD", align: "center", render: (r) => <ScoreBadge score={r.difficulty} invert />, csv: (r) => r.difficulty },
    { key: "intent", header: "Intent", render: (r) => <IntentBadge intent={r.intent} />, csv: (r) => r.intent },
    ...(includeMine
      ? [{
          key: "me", header: "You", align: "center" as const,
          render: (r: GapKeywordRow) => posCell(r.myPosition),
          csv: (r: GapKeywordRow) => r.myPosition ?? "—",
        }]
      : []),
    ...(result?.competitors ?? []).map((c, i) => ({
      key: `c${i}`, header: c.split(".")[0], align: "center" as const,
      render: (r: GapKeywordRow) => posCell(r.positions[i]),
      csv: (r: GapKeywordRow) => r.positions[i] ?? "—",
    })),
  ];

  const blColumns: Column<BacklinkGapRow>[] = [
    { key: "domain", header: "Referring domain", render: (r) => <span className="font-medium text-accent">{r.referringDomain}</span>, csv: (r) => r.referringDomain },
    { key: "authority", header: "Authority", align: "center", render: (r) => <ScoreBadge score={r.authority} />, csv: (r) => r.authority },
    {
      key: "me", header: "Links to you", align: "center",
      render: (r) => linkCell(r.linksToMe),
      csv: (r) => (r.linksToMe ? "Yes" : "No"),
    },
    ...(result?.competitors ?? []).map((c, i) => ({
      key: `c${i}`, header: c.split(".")[0], align: "center" as const,
      render: (r: BacklinkGapRow) => linkCell(r.linksTo[i]),
      csv: (r: BacklinkGapRow) => (r.linksTo[i] ? "Yes" : "No"),
    })),
  ];

  return (
    <>
      <PageHeader
        title="Competitor Gap"
        subtitle={<>Where <span className="font-medium text-ink">{domain}</span> wins, loses, and is missing entirely</>}
      />

      {/* Competitor picker */}
      <section className="rounded-xl border border-hairline bg-surface p-5">
        <p className="text-sm font-semibold">Compare against three competitors</p>
        <p className="mt-0.5 text-xs text-muted">Suggested rivals are pre-filled from the domain's keyword overlap — edit freely.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {inputs.map((val, i) => (
            <input
              key={i}
              value={val}
              onChange={(e) => setInputs(inputs.map((v, j) => (j === i ? e.target.value : v)))}
              placeholder={`competitor-${i + 1}.com`}
              className="w-full min-w-0 flex-1 rounded-lg border border-hairline bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 sm:w-auto"
            />
          ))}
          <PrimaryButton onClick={compare} disabled={running || inputs.filter((i) => i.trim()).length < 3}>
            {running ? <RefreshCw size={14} className="animate-spin" /> : <Swords size={14} />}
            Compare Competitors
          </PrimaryButton>
        </div>
      </section>

      {!result && !running && (
        <div className="rounded-xl border border-hairline bg-surface">
          <EmptyState
            icon={<Swords size={20} strokeWidth={1.6} />}
            title="No comparison yet"
            hint="Pick three competitors above and run the comparison to see keyword and backlink gaps."
          />
        </div>
      )}

      {(result || running) && (
        <>
          <section className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Shared keywords</h2>
              <p className="text-xs text-muted">Terms where you and rivals all rank — defend the ones you lead.</p>
              <DataTable columns={kwColumns(true)} rows={result?.shared ?? []} rowKey={(r) => r.keyword} loading={running} exportName={`${domain}-shared-keywords`} dense />
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Missing keywords</h2>
              <p className="text-xs text-muted">Competitors rank, you don't — the fastest wins are low-KD, high-volume.</p>
              <DataTable columns={kwColumns(false)} rows={result?.missing ?? []} rowKey={(r) => r.keyword} loading={running} exportName={`${domain}-missing-keywords`} dense />
            </div>
          </section>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Backlink gap</h2>
            <p className="text-xs text-muted">High-authority domains linking to competitors but not to you — warm outreach targets.</p>
            <DataTable columns={blColumns} rows={result?.backlinkGap ?? []} rowKey={(r) => r.referringDomain} loading={running} exportName={`${domain}-backlink-gap`} dense />
          </div>

          <div className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Lightbulb size={14} className="text-muted" /> Content opportunities
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {running
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-hairline bg-surface p-4">
                      <div className="skeleton h-4 w-3/4" />
                      <div className="skeleton mt-2 h-3 w-1/2" />
                      <div className="skeleton mt-3 h-3 w-full" />
                    </div>
                  ))
                : result?.opportunities.map((o) => (
                    <div key={o.topic} className="flex flex-col rounded-xl border border-hairline bg-surface p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold capitalize">{o.topic}</p>
                        <ScoreBadge score={o.difficulty} invert />
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {compact(o.volume)} searches/mo · covered by {o.competitorsCovering}/3 competitors
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-ink-2">{o.angle}</p>
                      <div className="mt-auto pt-3">
                        <Badge tone="accent">Content gap</Badge>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function linkCell(linked: boolean) {
  return linked ? (
    <span className="inline-grid size-5 place-items-center rounded-full bg-good/12 text-delta-up dark:text-good"><Check size={12} strokeWidth={2.5} /></span>
  ) : (
    <span className="inline-grid size-5 place-items-center rounded-full bg-surface-2 text-muted"><Minus size={11} /></span>
  );
}
