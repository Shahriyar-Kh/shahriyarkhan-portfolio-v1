/**
 * Homepage copy that is not itself an API-backed number. Every word here
 * was checked against docs/rebuild/CONTENT_TRUTH_INVENTORY.md before being
 * written - see P01_BRAND_DIRECTION.md for the voice rules this follows
 * (no "senior", no "we", no unverifiable superlative).
 */

export const HERO_ROLES: readonly string[] = ["Software Engineer", "Python Developer", "Django Backend Engineer"];

export const HERO_COPY = {
  eyebrow: "Islamabad, Pakistan",
  title: "Shahriyar Khan",
  lead: "Python and Django engineering for REST APIs, authenticated business platforms, and deployed web products.",
  primaryCta: { label: "See the work", href: "/work" },
  secondaryCta: { label: "Start a project", href: "/contact?intent=freelance_project" },
} as const;

/** §07 engagement track - mirrors content/services.ts's ENGAGEMENT_STEPS so
 * the homepage and every service page use the identical sequence. */
export const ENGINEERING_APPROACH_COPY = {
  title: "How a project moves from idea to a running system",
  subtitle: "The same sequence for every engagement, small or large.",
} as const;

/** §10 - native <details>/<summary>, zero JS. Timeline and pricing are
 * deliberately absent (owner judgment call #8) - no verified figure for
 * either exists anywhere in the repo. */
export const CLIENT_FAQ: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: "What do you actually build?",
    answer:
      "REST APIs and full-stack web applications, most often with Django REST Framework on the backend and React on the frontend. See the work page for real, running examples.",
  },
  {
    question: "Do you work with an existing codebase, or only greenfield builds?",
    answer:
      "Both. Discovery starts the same way either time: understanding the data model, the users, and what the system needs to do before any code changes.",
  },
  {
    question: "Who owns the code once the project is done?",
    answer: "You do. There's no vendor lock-in built into how these systems are structured.",
  },
  {
    question: "How do we start?",
    answer:
      "Send a message through the contact page with a short description of what you're building. That's the first step of the Discovery phase described above.",
  },
];

export const DUAL_CTA_COPY = {
  hiring: {
    title: "Hiring for a role",
    body: "Résumé, verified work history, and the systems behind it.",
    cta: { label: "View résumé", href: "/resume" },
  },
  project: {
    title: "Starting a project",
    body: "Tell me what you're building and what stage it's at.",
    cta: { label: "Get in touch", href: "/contact?intent=freelance_project" },
  },
} as const;
