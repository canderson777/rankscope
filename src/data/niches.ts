/**
 * Term banks used by the mock generators. A domain hashes into one of
 * these niches (or matches a curated entry), and keyword/competitor
 * data is synthesized from its vocabulary.
 */

export interface Niche {
  name: string;
  terms: string[]; // core topical phrases
  modifiers: string[]; // audience / context modifiers
  brands: string[]; // competitor brand stems
  topics: string[]; // content topics for gap/AEO suggestions
}

export const NICHES: Niche[] = [
  {
    name: "Project Management",
    terms: ["project management", "task tracking", "kanban board", "team collaboration", "gantt chart", "sprint planning", "workflow automation", "resource planning"],
    modifiers: ["for small teams", "for agencies", "for startups", "for remote teams", "for developers", "for marketing teams"],
    brands: ["taskflow", "planbeam", "sprintly", "boardwise", "teamorbit", "flowdesk"],
    topics: ["agile methodology", "OKR tracking", "meeting notes", "time tracking", "roadmap planning", "team standups"],
  },
  {
    name: "Email Marketing",
    terms: ["email marketing", "newsletter software", "email automation", "drip campaign", "email templates", "audience segmentation", "email deliverability", "welcome sequence"],
    modifiers: ["for ecommerce", "for creators", "for small business", "for saas", "for nonprofits", "for agencies"],
    brands: ["mailforge", "sendloop", "inboxly", "campaignkit", "lettercraft", "flowmail"],
    topics: ["open rate benchmarks", "subject line testing", "list building", "cart abandonment emails", "re-engagement campaigns", "email design"],
  },
  {
    name: "SEO & Analytics",
    terms: ["seo tools", "keyword research", "rank tracking", "backlink analysis", "site audit", "competitor analysis", "content optimization", "technical seo"],
    modifiers: ["for small business", "for agencies", "for bloggers", "for ecommerce", "for local business", "for enterprise"],
    brands: ["ranklyzer", "serpwatch", "linkscout", "auditbee", "keywordly", "crawlpoint"],
    topics: ["core web vitals", "schema markup", "local seo", "content briefs", "log file analysis", "seo reporting"],
  },
  {
    name: "CRM & Sales",
    terms: ["crm software", "sales pipeline", "lead management", "contact management", "sales automation", "deal tracking", "sales forecasting", "outreach sequences"],
    modifiers: ["for small business", "for real estate", "for startups", "for consultants", "for b2b", "for agencies"],
    brands: ["pipeworks", "dealstack", "leadnest", "salesloftly", "contacthub", "closerly"],
    topics: ["cold email templates", "lead scoring", "sales reports", "crm migration", "follow-up cadence", "pipeline reviews"],
  },
  {
    name: "E-commerce",
    terms: ["online store builder", "ecommerce platform", "product pages", "checkout optimization", "inventory management", "dropshipping", "abandoned cart recovery", "product reviews"],
    modifiers: ["for small business", "for handmade goods", "for digital products", "for subscriptions", "for wholesale", "for fashion brands"],
    brands: ["shopnest", "cartwise", "storeloop", "sellgrid", "merchantry", "checkoutly"],
    topics: ["conversion rate optimization", "product photography", "shipping strategy", "holiday campaigns", "loyalty programs", "marketplace selling"],
  },
  {
    name: "Design & Creative",
    terms: ["design tool", "ui design", "prototyping", "design systems", "vector editing", "collaboration for designers", "wireframing", "brand assets"],
    modifiers: ["for teams", "for beginners", "for developers", "for product teams", "for freelancers", "for agencies"],
    brands: ["pixelforge", "canvasly", "draftboard", "vectorly", "mockhive", "artframe"],
    topics: ["design tokens", "accessibility in design", "handoff to developers", "component libraries", "user testing", "design critique"],
  },
  {
    name: "Developer Tools",
    terms: ["ci cd pipeline", "code review", "error monitoring", "feature flags", "api testing", "deployment automation", "observability", "developer productivity"],
    modifiers: ["for startups", "for enterprise", "for open source", "for mobile teams", "for platform teams", "for solo developers"],
    brands: ["deployhub", "codepulse", "shipfast", "buildrail", "stacktrace", "devgrid"],
    topics: ["incident response", "monorepo tooling", "test flakiness", "release trains", "sre practices", "developer onboarding"],
  },
  {
    name: "HR & People Ops",
    terms: ["hr software", "applicant tracking", "employee onboarding", "performance reviews", "payroll software", "time off tracking", "employee engagement", "org charts"],
    modifiers: ["for small business", "for startups", "for remote teams", "for agencies", "for enterprise", "for nonprofits"],
    brands: ["peoplekit", "hireloop", "staffly", "onboardly", "teampulse", "worklane"],
    topics: ["compensation benchmarking", "1:1 templates", "hybrid work policy", "engagement surveys", "hiring funnels", "hr compliance"],
  },
];

/** Curated profiles so well-known domains feel hand-indexed */
export const CURATED: Record<string, { niche: string; brand: string }> = {
  "notion.so": { niche: "Project Management", brand: "Notion" },
  "asana.com": { niche: "Project Management", brand: "Asana" },
  "monday.com": { niche: "Project Management", brand: "Monday" },
  "mailchimp.com": { niche: "Email Marketing", brand: "Mailchimp" },
  "convertkit.com": { niche: "Email Marketing", brand: "ConvertKit" },
  "ahrefs.com": { niche: "SEO & Analytics", brand: "Ahrefs" },
  "semrush.com": { niche: "SEO & Analytics", brand: "Semrush" },
  "moz.com": { niche: "SEO & Analytics", brand: "Moz" },
  "hubspot.com": { niche: "CRM & Sales", brand: "HubSpot" },
  "pipedrive.com": { niche: "CRM & Sales", brand: "Pipedrive" },
  "shopify.com": { niche: "E-commerce", brand: "Shopify" },
  "bigcommerce.com": { niche: "E-commerce", brand: "BigCommerce" },
  "figma.com": { niche: "Design & Creative", brand: "Figma" },
  "canva.com": { niche: "Design & Creative", brand: "Canva" },
  "vercel.com": { niche: "Developer Tools", brand: "Vercel" },
  "sentry.io": { niche: "Developer Tools", brand: "Sentry" },
  "gusto.com": { niche: "HR & People Ops", brand: "Gusto" },
  "rippling.com": { niche: "HR & People Ops", brand: "Rippling" },
};

export const TLDS = [".com", ".io", ".app", ".co", ".dev"];

export const PATH_STEMS = [
  "blog", "guides", "features", "pricing", "templates", "integrations",
  "resources", "docs", "compare", "customers", "help", "academy",
];

export const REF_DOMAIN_STEMS = [
  "techradar", "producthunt", "medium", "dev-to", "hackernoon", "g2",
  "capterra", "reddit", "quora", "forbes", "businessinsider", "zapier",
  "makeuseof", "lifehacker", "smashingmagazine", "cnet", "pcmag",
  "trustpilot", "softwareadvice", "getapp", "slant", "alternativeto",
];
