/**
 * Data contracts for Rankscope. Every page consumes these shapes via
 * src/data/api.ts — replace the mock generators with real API calls
 * and the UI keeps working unchanged.
 */

export type Intent = "Informational" | "Commercial" | "Transactional" | "Navigational";
export type Sentiment = "Positive" | "Neutral" | "Negative";
export type Priority = "High" | "Medium" | "Low";

export interface TrendPoint {
  month: string;
  [series: string]: string | number;
}

export interface KeywordRow {
  keyword: string;
  position: number;
  volume: number;
  difficulty: number; // 0-100
  cpc: number;
  intent: Intent;
  traffic: number;
  change: number; // position change vs prev month
}

export interface RelatedKeyword {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  intent: Intent;
}

export interface KeywordCluster {
  name: string;
  keywords: number;
  totalVolume: number;
  avgDifficulty: number;
  intent: Intent;
}

export interface KeywordOverview {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  intent: Intent;
  competition: number; // 0-1 paid competition
  volumeTrend: TrendPoint[];
  related: RelatedKeyword[];
  questions: RelatedKeyword[];
  clusters: KeywordCluster[];
}

export interface CompetitorRow {
  domain: string;
  authority: number;
  commonKeywords: number;
  traffic: number;
  overlap: number; // 0-100 keyword overlap %
}

export interface PageRow {
  url: string;
  traffic: number;
  keywords: number;
  backlinks: number;
}

export interface SerpFeature {
  name: string;
  present: boolean;
  keywords: number; // keywords where the domain holds this feature
}

export interface DomainProfile {
  domain: string;
  niche: string;
  authorityScore: number;
  organicTraffic: number;
  paidTraffic: number;
  organicKeywords: number;
  backlinks: number;
  referringDomains: number;
  trafficDelta: number; // % vs prev month
  trafficTrend: TrendPoint[]; // { month, organic, paid }
  topKeywords: KeywordRow[];
  competitors: CompetitorRow[];
  topPages: PageRow[];
  serpFeatures: SerpFeature[];
}

export interface BacklinkRow {
  sourceUrl: string;
  targetUrl: string;
  anchor: string;
  authority: number;
  follow: boolean;
  firstSeen: string;
}

export interface BacklinkProfile {
  domain: string;
  total: number;
  referringDomains: number;
  newLast30: number;
  lostLast30: number;
  followShare: number; // 0-100
  authorityBuckets: { bucket: string; count: number }[];
  newLostTrend: TrendPoint[]; // { month, new, lost }
  rows: BacklinkRow[];
}

export type IssueSeverity = "Error" | "Warning" | "Notice";

export interface AuditIssue {
  id: string;
  title: string;
  category: string;
  severity: IssueSeverity;
  priority: Priority;
  pagesAffected: number;
  description: string;
}

export interface AuditReport {
  domain: string;
  healthScore: number;
  crawledPages: number;
  errors: number;
  warnings: number;
  notices: number;
  issues: AuditIssue[];
}

export interface GapKeywordRow {
  keyword: string;
  volume: number;
  difficulty: number;
  intent: Intent;
  myPosition: number | null; // null = not ranking
  positions: (number | null)[]; // per competitor
}

export interface BacklinkGapRow {
  referringDomain: string;
  authority: number;
  linksToMe: boolean;
  linksTo: boolean[]; // per competitor
}

export interface ContentOpportunity {
  topic: string;
  volume: number;
  difficulty: number;
  competitorsCovering: number;
  angle: string;
}

export interface GapAnalysis {
  domain: string;
  competitors: string[];
  shared: GapKeywordRow[];
  missing: GapKeywordRow[];
  backlinkGap: BacklinkGapRow[];
  opportunities: ContentOpportunity[];
}

/* ---------------- AI Visibility (AEO / GEO) ---------------- */

export const AI_PLATFORMS = [
  "ChatGPT",
  "Perplexity",
  "Google AI Overviews",
  "Gemini",
  "Claude",
  "Bing Copilot",
] as const;
export type AiPlatform = (typeof AI_PLATFORMS)[number];

export type MentionStatus = "Recommended" | "Mentioned" | "Compared" | "Ignored";

export interface PlatformScore {
  platform: AiPlatform;
  score: number; // 0-100
  mentions: number;
  citations: number;
  delta: number; // vs prev month
}

export interface BrandMention {
  prompt: string;
  platform: AiPlatform;
  status: MentionStatus;
  sentiment: Sentiment;
  snippet: string;
  date: string;
}

export interface AiQuery {
  prompt: string;
  intent: Intent;
  difficulty: number;
  opportunity: number; // 0-100
  visibility: MentionStatus;
  angle: string;
}

export interface AiCompetitorRow {
  domain: string;
  shareOfMentions: number; // %
  recommendationRate: number; // %
  citationRate: number; // %
  sentiment: Sentiment;
}

export type CitationSourceType =
  | "Blog post"
  | "Review site"
  | "Reddit thread"
  | "YouTube video"
  | "News article"
  | "Comparison page"
  | "Documentation";

export interface CitationSource {
  title: string;
  url: string;
  type: CitationSourceType;
  authority: number;
  freshness: string; // e.g. "2 weeks ago"
  citations: number;
}

export type AeoPageType =
  | "FAQ page"
  | "Comparison page"
  | "Best-of listicle"
  | "Definition / explainer"
  | "How-to guide";

export interface AeoOpportunity {
  title: string;
  targetQuestion: string;
  intent: Intent;
  pageType: AeoPageType;
  priority: number; // 0-100
  schema: string;
  outline: string[];
}

export type ChecklistStatus = "Done" | "Partial" | "Missing";

export interface GeoChecklistItem {
  item: string;
  status: ChecklistStatus;
  impact: Priority;
  description: string;
}

export interface EntityDimension {
  dimension: string;
  score: number; // 0-100
  note: string;
}

export interface AnswerPreview {
  prompt: string;
  paragraphs: string[];
  brandAppears: boolean;
  brandStatus: MentionStatus;
  competitorsMentioned: string[];
  citedSources: string[];
  suggestions: string[];
}

export interface AiVisibilityReport {
  domain: string;
  brand: string;
  overallScore: number;
  scoreDelta: number;
  scoreTrend: TrendPoint[]; // { month, score }
  platforms: PlatformScore[];
  mentions: BrandMention[];
  queries: AiQuery[];
  aiCompetitors: AiCompetitorRow[];
  missingTopics: string[];
  citationSources: CitationSource[];
  aeoOpportunities: AeoOpportunity[];
  geoChecklist: GeoChecklistItem[];
  entity: EntityDimension[];
}

/* ---------------- Google Search Console (first-party, free) ---------------- */

export interface SearchConsoleRow {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number; // 0-1
  avgPosition: number;
}

export interface SearchConsoleTotals {
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
  queries: number;
}

export interface SearchConsoleReport {
  domain: string;
  siteUrl: string | null;
  days: number;
  startDate: string;
  endDate: string;
  totals: SearchConsoleTotals;
  /** Queries sitting at average positions 5–20 — the "striking distance" zone. */
  strikingDistance: SearchConsoleRow[];
  note: string;
}

export interface SearchConsoleStatus {
  configured: boolean;
  connected: boolean;
  siteUrl: string | null;
  hint?: string;
}

export interface TopQueryRow {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
}

export interface TopPageRow {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
}

export interface GscDayPoint {
  date: string;
  clicks: number;
  impressions: number;
}

/** Domain-overview view of Search Console: totals, top queries/pages, trend. */
export interface SearchConsoleOverview {
  domain: string;
  siteUrl: string;
  days: number;
  startDate: string;
  endDate: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avgPosition: number;
  queries: number;
  topQueries: TopQueryRow[];
  topPages: TopPageRow[];
  trend: GscDayPoint[];
  strikingDistance: SearchConsoleRow[];
  note: string;
}
