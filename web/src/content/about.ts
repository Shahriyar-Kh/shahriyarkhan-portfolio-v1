/**
 * /about's narrative copy. Employment and education specifics (dates,
 * titles, institution) are NOT duplicated here - they render from the
 * live Experience/Education API as a preview (with a link through to the
 * full record on /experience), so this file can never drift out of sync
 * with the database. This file is philosophy, specialization, and
 * approach only. No unverifiable superlative, no invented metric - see
 * docs/rebuild/CONTENT_TRUTH_INVENTORY.md.
 */

export const ABOUT_INTRO = {
  eyebrow: "About",
  title: "How I approach building software",
  lead: "I build backend systems and full-stack applications with Python and Django, most often paired with a React frontend and a PostgreSQL database.",
} as const;

/**
 * Fallback only - the live page prefers SiteSetting.hero_subtitle (the
 * same verified, database-backed sentence used elsewhere on the site) so
 * this specialization statement can never drift from what the backend
 * actually says. This constant exists purely so the page still renders a
 * real sentence, not a blank, if that fetch fails.
 */
export const ABOUT_SPECIALIZATION_FALLBACK =
  "Software Engineering graduate specializing in backend development with Python, Django, and FastAPI, and full-stack web applications with Django REST Framework and React.js.";

/**
 * FINAL-DESIGN-01B-01-R2: split into four short, scan-friendly blocks
 * (each a plain sentence-boundary split of the original two paragraphs -
 * no wording changed, no fact added) instead of two dense paragraphs, so
 * the career story reads as distinct beats rather than one wall of text.
 */
export const ABOUT_CAREER_STORY: readonly string[] = [
  "My background is in Python and Django: designing the data model, wiring authentication and authorization, and building the REST API a frontend actually consumes.",
  "Most of the projects on this site follow that same shape - a Django REST Framework backend paired with a React frontend.",
  "I finished a BS in Software Engineering at Abasyn University and have worked across backend-focused roles and internships since, moving between greenfield builds and existing codebases.",
  "The structured record of exactly where and when is on the Experience page below, sourced from the same data as the résumé so it can't drift out of sync.",
];

export const ABOUT_PRINCIPLES: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "The data model comes first",
    body: "Before any endpoint or UI, I work out what entities the system needs to represent and how they relate. Most later problems trace back to this step being rushed.",
  },
  {
    title: "Authentication and authorization are not an afterthought",
    body: "Who can do what is decided as part of the architecture, not bolted on once the feature list is done.",
  },
  {
    title: "A system should be explainable",
    body: "I can walk through why a system is built the way it is - which is also why every project on this site links to something real: a live URL, a repository, or an audited screenshot.",
  },
];

export const ABOUT_PREVIEW_CTA = { label: "See the work these principles produced", href: "/work" } as const;

export const ABOUT_RECORD_PREVIEW_CTA = { label: "View the full experience and education record", href: "/experience" } as const;

export const ABOUT_STRENGTHS_CTA = { label: "See the full skills breakdown", href: "/skills" } as const;

/** Self-declared, low-risk personal fact - not a performance or client
 * claim, so it doesn't fall under the same verification bar as project
 * metrics or certifications. Carried forward from the legacy site. */
export const ABOUT_LANGUAGES: readonly string[] = ["Pashto (Native)", "Urdu (Native)", "English (Professional)"];

/**
 * FINAL-DESIGN-01B-01: the premium /about page's editorial hero meta row
 * - the exact same two verified facts the homepage hero and HERO_COPY
 * already use (content/home.ts), never a second, drifting copy of an
 * availability or location claim.
 */
export const ABOUT_HERO_META = {
  location: "Islamabad, Pakistan",
  availability: "Available for new work",
} as const;

export const ABOUT_HERO_EYEBROW = "About";

/**
 * The architecture section's framing - describes the shape most of the
 * real projects on this site actually take (see ABOUT_CAREER_STORY[0]
 * and content/home.ts's HERO_COPY.lead for the same "Django REST
 * Framework backend paired with a React frontend" fact stated
 * elsewhere), illustrated with the real skill-category names the
 * backend itself curates (see components/icons/tech-icons.tsx's
 * CategoryIcon) - never an invented tech stack or a claim about any one
 * specific project's actual architecture.
 */
export const ABOUT_ARCHITECTURE_COPY = {
  eyebrow: "Architecture",
  title: "The shape most of these systems take",
  lead: "Not every project looks identical, but most share the same underlying layers - each one backed by a real, published skill category, not a diagram drawn for its own sake.",
} as const;

export interface AboutArchitectureLayer {
  category: "Frontend" | "Backend" | "Database" | "Deployment";
  title: string;
  body: string;
}

/**
 * Framed as capability, never as a completed-project claim - matches
 * content/services-media.ts's own "frontend-only presentation copy over
 * real API data" rule. `category` must match a real SkillCategory name
 * exactly (see lib/skills.ts's groupSkillsByCategory) so the component
 * can pair each layer with its own real, live skill list rather than a
 * static, potentially-drifting tech list.
 */
export const ABOUT_ARCHITECTURE_LAYERS: readonly AboutArchitectureLayer[] = [
  {
    category: "Frontend",
    title: "Interface",
    body: "React and JavaScript, wired to whatever API the project actually needs - not a template dropped on top afterward.",
  },
  {
    category: "Backend",
    title: "API and data model",
    body: "Django, DRF, and FastAPI. The data model comes first, and authentication/authorization is decided as part of that same design - never bolted on once the feature list is done.",
  },
  {
    category: "Database",
    title: "Source of truth",
    body: "PostgreSQL as the primary store, MongoDB where a document shape genuinely fits better.",
  },
  {
    category: "Deployment",
    title: "Running system",
    body: "Docker, Git, and Postman to build and verify it; Cloudflare Workers and Vercel to actually ship it - a live URL, not a local demo.",
  },
] as const;

/**
 * "Core strengths" cards - one per real, published skill category
 * (matched by exact name against the live API in lib/skills.ts's
 * groupSkillsByCategory, the same way ABOUT_ARCHITECTURE_LAYERS is). A
 * category the backend doesn't currently publish simply never renders a
 * card - never a guessed or invented one.
 */
export const ABOUT_STRENGTHS_COPY = {
  eyebrow: "Coverage",
  title: "Core strengths",
  lead: "Grouped the same way the backend curates them - see the full breakdown, with every categorical level, on the Skills page.",
} as const;

export const ABOUT_STRENGTHS_CAPTIONS: Readonly<Record<string, string>> = {
  Backend: "Django, DRF, and FastAPI - REST APIs, authentication, and the data model underneath them.",
  Database: "PostgreSQL as the primary store, MongoDB where a document shape fits better.",
  Frontend: "React and JavaScript, wired to whatever API the project needs.",
  Tools: "Git, Docker, and Postman - the everyday toolkit for building and verifying an API.",
  Deployment: "Cloudflare Workers and Vercel for shipping a working system, not just a local demo.",
} as const;

/**
 * The alternating timeline section's framing - the record itself is the
 * real, live Experience API data (never duplicated here); this is only
 * the section's own heading copy.
 */
export const ABOUT_TIMELINE_COPY = {
  eyebrow: "Career",
  title: "Where this experience comes from",
  lead: "Every role below is the same structured record the résumé and the Experience page draw from - moving between greenfield builds and existing codebases.",
} as const;

/**
 * FINAL-DESIGN-01B-01-R2: Education no longer gets its own oversized,
 * mostly-empty standalone section (a single real record left a lot of
 * dead space) - `eyebrow` now labels the milestone chip folded into
 * AboutNarrative instead.
 */
export const ABOUT_EDUCATION_COPY = {
  eyebrow: "Education",
} as const;
