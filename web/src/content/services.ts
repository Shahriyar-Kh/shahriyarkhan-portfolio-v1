/**
 * Owner judgment call #6 (docs/rebuild/OPEN_DECISIONS.md #10): several of
 * the 7 real Service rows have no delivered project behind them (no
 * restaurant or ecommerce project exists in the portfolio). A service
 * WITHOUT an entry here gets the reduced template automatically (title,
 * description, deliverables, engagement process, CTA - no framing, no
 * related-work claim, no Service schema). This is the one place that
 * decision is encoded.
 */
export interface ServiceFraming {
  readonly audience: string;
  readonly problemFraming: string;
  readonly whatIsNeededToBegin: readonly string[];
  /** Must be real, published Project slugs with genuinely overlapping
   * technology - never the unaudited techbuilt-open-school-lms project. */
  readonly relatedProjectSlugs: readonly string[];
  readonly engagementSteps: readonly string[];
}

// "Handover" not "Support" (owner judgment call #7) - "Support" implies
// an ongoing commitment with no evidence behind it. Exported so the
// homepage's engineering-approach.tsx section uses the identical
// sequence, rather than a second hardcoded copy.
export const ENGAGEMENT_STEPS: readonly string[] = [
  "Discovery",
  "Scope",
  "Architecture",
  "Build",
  "Test",
  "Launch",
  "Handover",
];

/** One-line methodology framing per step, for the homepage's richer
 * process presentation (sections/engineering-approach.tsx). Generic
 * working-method description, not a project claim - carries no metric,
 * timeframe, or guarantee, so it needs no entry in the claim register. */
export const ENGAGEMENT_STEP_DETAILS: Readonly<Record<string, string>> = {
  Discovery: "Understand the problem, the users, and what the system actually needs to do.",
  Scope: "Turn that understanding into a concrete, buildable plan.",
  Architecture: "Design the data model, API surface, and authentication before any feature code.",
  Build: "Implement the system against that architecture, iteratively.",
  Test: "Verify behavior against real cases, not just the happy path.",
  Launch: "Deploy to a real, running environment.",
  Handover: "Hand over a system you own outright, with nothing left implicit.",
};

export const SERVICE_FRAMING: Readonly<Record<string, ServiceFraming>> = {
  "backend-development": {
    audience: "Teams that need an API or backend that holds up under real use.",
    problemFraming:
      "A product needs a data model, authentication, and API surface that won't need to be rebuilt as it grows.",
    whatIsNeededToBegin: [
      "The core entities and relationships the system needs to represent",
      "Who needs to authenticate, and what they should be able to do",
      "Any existing systems the API needs to integrate with",
    ],
    relatedProjectSlugs: [
      "yango-wing-fleet-digital-registration-fleet-management-platform",
      "sk-learntrack-ai-learning-platform",
    ],
    engagementSteps: ENGAGEMENT_STEPS,
  },
  "custom-web-application": {
    audience: "Businesses that need a web application built around a specific workflow.",
    problemFraming:
      "Off-the-shelf tools don't fit the actual process, and the gap is being papered over with spreadsheets or manual steps.",
    whatIsNeededToBegin: [
      "The workflow the application needs to support, end to end",
      "Who the users are and what each of them needs to do",
      "Any deadlines or systems the application needs to work around",
    ],
    relatedProjectSlugs: ["yango-wing-fleet-digital-registration-fleet-management-platform"],
    engagementSteps: ENGAGEMENT_STEPS,
  },
  "saas-project": {
    audience: "Founders building a multi-user product with accounts, dashboards, and ongoing usage.",
    problemFraming:
      "The product needs authentication, role-based access, and a dashboard experience that stays maintainable as features are added.",
    whatIsNeededToBegin: [
      "The core user roles and what each one can access",
      "The main dashboard views and data they need to show",
      "Any third-party services (payments, email, analytics) that need to be integrated",
    ],
    relatedProjectSlugs: ["sk-learntrack-ai-learning-platform", "noteassist-ai-productivity-platform"],
    engagementSteps: ENGAGEMENT_STEPS,
  },
  "website-development": {
    audience: "People and businesses that need a fast, clean, SEO-aware website.",
    problemFraming:
      "The current site (or lack of one) doesn't represent the business, loads slowly, or isn't findable.",
    whatIsNeededToBegin: [
      "The pages the site needs and the content for each one",
      "Any brand assets already in use (logo, colors, existing copy)",
      "Whether the site needs a CMS or is fully static",
    ],
    relatedProjectSlugs: [],
    engagementSteps: ENGAGEMENT_STEPS,
  },
};
