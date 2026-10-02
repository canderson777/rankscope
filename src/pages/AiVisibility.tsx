import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Bot, FileQuestion, Fingerprint, Lightbulb, ListChecks, MessageSquareQuote,
  RefreshCw, Sparkles, Wand2,
} from "lucide-react";
import { useSearch } from "../context/SearchContext";
import { useAsync } from "../lib/useAsync";
import { api } from "../data/api";
import { compact, num } from "../lib/format";
import PageHeader from "../components/PageHeader";
import { PrimaryButton } from "../components/PageHeader";
import ChartCard, { ChartTip } from "../components/ChartCard";
import DataTable, { type Column } from "../components/DataTable";
import ScoreBadge from "../components/ScoreBadge";
import Meter from "../components/Meter";
import EmptyState from "../components/EmptyState";
import {
  Badge, ChecklistBadge, IntentBadge, MentionBadge, PriorityBadge, SentimentBadge,
} from "../components/Badge";
import type {
  AiCompetitorRow, AiQuery, AnswerPreview, BrandMention, CitationSource,
} from "../data/types";

const TABS = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "mentions", label: "Brand Mentions", icon: MessageSquareQuote },
  { id: "queries", label: "Query Research", icon: FileQuestion },
  { id: "competitors", label: "AI Competitors", icon: Bot },
  { id: "opportunities", label: "AEO Opportunities", icon: Lightbulb },
  { id: "checklist", label: "GEO Checklist", icon: ListChecks },
  { id: "preview", label: "Answer Preview", icon: Wand2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AiVisibility() {
  const { domain } = useSearch();
  const { data, loading } = useAsync(() => api.aiVisibility(domain), [domain]);
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <>
      <PageHeader
        title="AI Visibility"
        subtitle={
          <>
            How <span className="font-medium text-ink">{data?.brand ?? domain}</span> shows up in AI answer
            engines — ChatGPT, Perplexity, Google AI Overviews, Gemini, Claude, and Bing Copilot.
          </>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-hairline pb-px">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab data={data} loading={loading} />}
      {tab === "mentions" && <MentionsTab data={data} loading={loading} />}
      {tab === "queries" && <QueriesTab data={data} loading={loading} />}
      {tab === "competitors" && <CompetitorsTab data={data} loading={loading} />}
      {tab === "opportunities" && <OpportunitiesTab data={data} loading={loading} />}
      {tab === "checklist" && <ChecklistTab data={data} loading={loading} />}
      {tab === "preview" && <PreviewTab domain={domain} brand={data?.brand ?? domain} />}
    </>
  );
}

type TabProps = { data: Awaited<ReturnType<typeof api.aiVisibility>> | null; loading: boolean };

/* ------------------------------------------------------------------ */

function OverviewTab({ data, loading }: TabProps) {
  return (
    <>
      <section className="grid gap-5 lg:grid-cols-3">
        {/* Score hero */}
        <div className="rounded-xl border border-hairline bg-surface p-5">
          {loading || !data ? (
            <><div className="skeleton h-3 w-28" /><div className="skeleton mt-4 h-14 w-24" /><div className="skeleton mt-4 h-3 w-36" /></>
          ) : (
            <>
              <p className="text-xs font-medium text-ink-2">AI visibility score</p>
              <p className="mt-2 text-5xl font-semibold tracking-tight">
                {data.overallScore}
                <span className="ml-1 text-base font-normal text-muted">/ 100</span>
              </p>
              <p className="mt-3 text-xs text-muted">
                <span className={`font-semibold ${data.scoreDelta >= 0 ? "text-delta-up" : "text-delta-down"}`}>
                  {data.scoreDelta >= 0 ? "▲" : "▼"} {Math.abs(data.scoreDelta)} pts
                </span>{" "}
                vs last month
              </p>
              <p className="mt-4 text-xs leading-relaxed text-ink-2">
                Composite of mention share, recommendation rate, and citation frequency
                across six answer engines.
              </p>
            </>
          )}
        </div>

        <div className="lg:col-span-2">
          <ChartCard title="Score trend" subtitle="Monthly AI visibility score, last 12 months" loading={loading} height={218}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.scoreTrend ?? []} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} strokeWidth={1} />
                <XAxis dataKey="month" axisLine={{ stroke: "var(--baseline)" }} tickLine={false} dy={6} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} width={32} />
                <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }} />
                <Line type="monotone" name="Score" dataKey="score" stroke="var(--s1)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </section>

      {/* Platform breakdown */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Visibility by platform</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(loading || !data ? Array.from({ length: 6 }) : data.platforms).map((p: any, i) => (
            <div key={p?.platform ?? i} className="rounded-xl border border-hairline bg-surface p-4">
              {loading || !data ? (
                <><div className="skeleton h-4 w-28" /><div className="skeleton mt-3 h-2 w-full" /><div className="skeleton mt-3 h-3 w-32" /></>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{p.platform}</p>
                    <span className={`text-[11px] font-semibold ${p.delta >= 0 ? "text-delta-up" : "text-delta-down"}`}>
                      {p.delta >= 0 ? "▲" : "▼"} {Math.abs(p.delta)}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2.5">
                    <Meter value={p.score} />
                    <span className="tnum w-7 shrink-0 text-right text-sm font-semibold">{p.score}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {num(p.mentions)} mentions · {num(p.citations)} citations / 30d
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Entity optimization */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <Fingerprint size={14} className="text-muted" /> Entity optimization
        </h2>
        <p className="text-xs text-muted">
          How clearly answer engines can understand who you are, what you sell, and who it's for.
        </p>
        <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
          {(loading || !data ? Array.from({ length: 6 }) : data.entity).map((e: any, i) => (
            <div key={e?.dimension ?? i} className="flex items-center gap-4 border-b border-hairline px-4 py-3 last:border-0">
              {loading || !data ? (
                <div className="skeleton h-4 w-full" />
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.dimension}</p>
                    <p className="truncate text-xs text-muted">{e.note}</p>
                  </div>
                  <div className="hidden w-40 sm:block"><Meter value={e.score} severity /></div>
                  <ScoreBadge score={e.score} />
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */

function MentionsTab({ data, loading }: TabProps) {
  const mentionCols: Column<BrandMention>[] = [
    {
      key: "prompt", header: "Prompt", width: "30%",
      render: (r) => (
        <div>
          <p className="font-medium">“{r.prompt}”</p>
          <p className="mt-1 max-w-md text-xs italic leading-relaxed text-muted">{r.snippet}</p>
        </div>
      ),
      csv: (r) => r.prompt,
    },
    { key: "platform", header: "Platform", render: (r) => <Badge tone="neutral">{r.platform}</Badge>, csv: (r) => r.platform },
    { key: "status", header: "Status", render: (r) => <MentionBadge status={r.status} />, csv: (r) => r.status },
    { key: "sentiment", header: "Sentiment", render: (r) => <SentimentBadge sentiment={r.sentiment} />, csv: (r) => r.sentiment },
    { key: "date", header: "Seen", align: "right", render: (r) => <span className="tnum text-ink-2">{r.date}</span>, csv: (r) => r.date },
  ];

  const citeCols: Column<CitationSource>[] = [
    {
      key: "title", header: "Source", width: "36%",
      render: (r) => (
        <div>
          <p className="font-medium">{r.title}</p>
          <p className="mt-0.5 break-all text-xs text-accent">{r.url}</p>
        </div>
      ),
      csv: (r) => r.title,
    },
    { key: "type", header: "Type", render: (r) => <Badge tone="accent">{r.type}</Badge>, csv: (r) => r.type },
    { key: "authority", header: "Authority", align: "center", render: (r) => <ScoreBadge score={r.authority} />, csv: (r) => r.authority },
    { key: "freshness", header: "Freshness", render: (r) => <span className="text-ink-2">{r.freshness}</span>, csv: (r) => r.freshness },
    { key: "citations", header: "AI citations", align: "right", render: (r) => <span className="tnum font-medium">{r.citations}</span>, csv: (r) => r.citations },
  ];

  return (
    <>
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Where your brand appears in AI answers</h2>
        <p className="text-xs text-muted">Sampled prompts across six engines, with how the answer treated the brand.</p>
        <DataTable columns={mentionCols} rows={data?.mentions ?? []} rowKey={(r) => r.prompt + r.platform} loading={loading} skeletonRows={6} exportName="brand-mentions" />
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Citation source analysis</h2>
        <p className="text-xs text-muted">The third-party pages answer engines lean on when talking about this space — earn presence here.</p>
        <DataTable columns={citeCols} rows={data?.citationSources ?? []} rowKey={(r) => r.url} loading={loading} skeletonRows={6} exportName="citation-sources" />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function QueriesTab({ data, loading }: TabProps) {
  const cols: Column<AiQuery>[] = [
    { key: "prompt", header: "AI prompt", width: "30%", render: (r) => <span className="font-medium">“{r.prompt}”</span>, csv: (r) => r.prompt },
    { key: "intent", header: "Intent", render: (r) => <IntentBadge intent={r.intent} />, csv: (r) => r.intent },
    { key: "difficulty", header: "Difficulty", align: "center", render: (r) => <ScoreBadge score={r.difficulty} invert />, csv: (r) => r.difficulty },
    {
      key: "opportunity", header: "Opportunity", align: "right",
      render: (r) => (
        <span className="flex items-center justify-end gap-2">
          <span className="w-16"><Meter value={r.opportunity} /></span>
          <span className="tnum w-7 text-right font-medium">{r.opportunity}</span>
        </span>
      ),
      csv: (r) => r.opportunity,
    },
    { key: "visibility", header: "Your visibility", render: (r) => <MentionBadge status={r.visibility} />, csv: (r) => r.visibility },
    { key: "angle", header: "Recommended angle", width: "22%", render: (r) => <span className="text-xs leading-relaxed text-ink-2">{r.angle}</span>, csv: (r) => r.angle },
  ];

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">Question-style prompts people ask AI tools</h2>
      <p className="text-xs text-muted">
        Ranked by opportunity: high-volume questions where your visibility is weak are the fastest wins.
      </p>
      <DataTable columns={cols} rows={data?.queries ?? []} rowKey={(r) => r.prompt} loading={loading} skeletonRows={8} exportName="ai-query-research" />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CompetitorsTab({ data, loading }: TabProps) {
  const cols: Column<AiCompetitorRow>[] = [
    { key: "domain", header: "Competitor", render: (r) => <span className="font-medium">{r.domain}</span>, csv: (r) => r.domain },
    {
      key: "share", header: "Share of AI mentions", align: "right",
      render: (r) => (
        <span className="flex items-center justify-end gap-2">
          <span className="w-24"><Meter value={r.shareOfMentions * 2.5} /></span>
          <span className="tnum w-9 text-right font-medium">{r.shareOfMentions}%</span>
        </span>
      ),
      csv: (r) => `${r.shareOfMentions}%`,
    },
    { key: "rec", header: "Recommended", align: "right", render: (r) => <span className="tnum">{r.recommendationRate}%</span>, csv: (r) => `${r.recommendationRate}%` },
    { key: "cite", header: "Cited", align: "right", render: (r) => <span className="tnum">{r.citationRate}%</span>, csv: (r) => `${r.citationRate}%` },
    { key: "sentiment", header: "Sentiment", render: (r) => <SentimentBadge sentiment={r.sentiment} />, csv: (r) => r.sentiment },
  ];

  return (
    <>
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Who wins AI answers in your category</h2>
        <p className="text-xs text-muted">Share of mentions, recommendation frequency, and citation rate across sampled prompts.</p>
        <DataTable columns={cols} rows={data?.aiCompetitors ?? []} rowKey={(r) => r.domain} loading={loading} exportName="ai-competitors" />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Missing topics</h2>
        <p className="text-xs text-muted">Themes competitors are cited for where your brand has no presence yet.</p>
        <div className="flex flex-wrap gap-2">
          {loading || !data
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-7 w-40 rounded-full" />)
            : data.missingTopics.map((t) => (
                <span key={t} className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs font-medium capitalize text-ink-2">
                  {t}
                </span>
              ))}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function OpportunitiesTab({ data, loading }: TabProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">Content to create for answer engines</h2>
      <p className="text-xs text-muted">
        Pages engineered to be quoted: direct answers up top, structured data, and clear comparisons.
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {(loading || !data ? Array.from({ length: 4 }) : data.aeoOpportunities).map((o: any, i) => (
          <div key={o?.title ?? i} className="rounded-xl border border-hairline bg-surface p-4">
            {loading || !data ? (
              <><div className="skeleton h-4 w-3/4" /><div className="skeleton mt-2 h-3 w-1/2" /><div className="skeleton mt-4 h-16 w-full" /></>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{o.title}</p>
                    <p className="mt-1 text-xs text-muted">
                      Target: <span className="italic">“{o.targetQuestion}”</span>
                    </p>
                  </div>
                  <ScoreBadge score={o.priority} />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone="accent">{o.pageType}</Badge>
                  <IntentBadge intent={o.intent} />
                  <Badge tone="violet">Schema: {o.schema}</Badge>
                </div>
                <div className="mt-3 rounded-lg bg-surface-2/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Suggested outline</p>
                  <ol className="mt-1.5 list-inside list-decimal space-y-0.5 text-xs text-ink-2">
                    {o.outline.map((s: string) => <li key={s}>{s}</li>)}
                  </ol>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ChecklistTab({ data, loading }: TabProps) {
  const done = data?.geoChecklist.filter((c) => c.status === "Done").length ?? 0;
  const total = data?.geoChecklist.length ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">GEO optimization checklist</h2>
          <p className="mt-0.5 text-xs text-muted">
            Foundations that make a brand easy for generative engines to discover, trust, and cite.
          </p>
        </div>
        {data && (
          <span className="flex items-center gap-2 text-xs text-muted">
            <span className="w-28"><Meter value={(done / Math.max(1, total)) * 100} severity /></span>
            <span className="tnum font-medium text-ink">{done}/{total} done</span>
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
        {(loading || !data ? Array.from({ length: 8 }) : data.geoChecklist).map((c: any, i) => (
          <div key={c?.item ?? i} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-hairline px-4 py-3 last:border-0">
            {loading || !data ? (
              <div className="skeleton h-4 w-full" />
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.item}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{c.description}</p>
                </div>
                <PriorityBadge priority={c.impact} />
                <ChecklistBadge status={c.status} />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PreviewTab({ domain, brand }: { domain: string; brand: string }) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<AnswerPreview | null>(null);
  const [running, setRunning] = useState(false);

  const run = async (p: string) => {
    if (!p.trim()) return;
    setRunning(true);
    const r = await api.answerPreview(domain, p);
    setResult(r);
    setRunning(false);
  };

  const highlighted = useMemo(() => {
    if (!result) return [];
    return result.paragraphs.map((para) =>
      para.split(new RegExp(`(${brand})`, "gi")).map((part, i) =>
        part.toLowerCase() === brand.toLowerCase()
          ? <mark key={i} className="rounded bg-accent-soft px-0.5 font-semibold text-ink">{part}</mark>
          : <span key={i}>{part}</span>,
      ),
    );
  }, [result, brand]);

  return (
    <>
      <section className="rounded-xl border border-hairline bg-surface p-5">
        <h2 className="text-sm font-semibold">Simulate an AI answer</h2>
        <p className="mt-0.5 text-xs text-muted">
          Enter a prompt a customer might ask an assistant, and see whether {brand} makes the answer.
        </p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => { e.preventDefault(); run(prompt); }}
        >
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`e.g. best tools like ${domain} for small teams…`}
            className="w-full flex-1 rounded-lg border border-hairline bg-bg px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
          <PrimaryButton disabled={running || !prompt.trim()}>
            {running ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
            Preview answer
          </PrimaryButton>
        </form>
      </section>

      {!result && !running && (
        <div className="rounded-xl border border-hairline bg-surface">
          <EmptyState
            icon={<Wand2 size={20} strokeWidth={1.6} />}
            title="No preview yet"
            hint={`Try "best ${brand.toLowerCase()} alternatives" or "how do I choose a tool like this" to see a simulated answer.`}
          />
        </div>
      )}

      {running && (
        <div className="rounded-xl border border-hairline bg-surface p-5">
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton mt-3 h-3 w-full" />
          <div className="skeleton mt-2 h-3 w-11/12" />
          <div className="skeleton mt-2 h-3 w-4/5" />
        </div>
      )}

      {result && !running && (
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-xl border border-hairline bg-surface p-5 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted">Simulated answer · “{result.prompt}”</p>
              <MentionBadge status={result.brandStatus} />
            </div>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-2">
              {highlighted.map((para, i) => <p key={i}>{para}</p>)}
            </div>
            <div className="mt-4 border-t border-hairline pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Sources the answer drew on</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {result.citedSources.map((s) => (
                  <span key={s} className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-ink-2">{s}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-hairline bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Competitors mentioned</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.competitorsMentioned.map((c) => (
                  <Badge key={c} tone="neutral">{c}</Badge>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-hairline bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">How to improve your odds</p>
              <ul className="mt-2 space-y-2 text-xs leading-relaxed text-ink-2">
                {result.suggestions.map((s) => (
                  <li key={s} className="flex gap-2">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-accent" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
