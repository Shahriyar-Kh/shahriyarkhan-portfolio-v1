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

export const ABOUT_CAREER_STORY: readonly string[] = [
  "My background is in Python and Django: designing the data model, wiring authentication and authorization, and building the REST API a frontend actually consumes. Most of the projects on this site follow that same shape - a Django REST Framework backend paired with a React frontend.",
  "I finished a BS in Software Engineering at Abasyn University and have worked across backend-focused roles and internships since, moving between greenfield builds and existing codebases. The structured record of exactly where and when is on the Experience page below, sourced from the same data as the résumé so it can't drift out of sync.",
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
