export interface ServiceFraming {
  readonly audience: string;
  readonly problemFraming: string;
  readonly whatIsNeededToBegin: readonly string[];
  readonly relatedProjectSlugs: readonly string[];
  readonly engagementSteps: readonly string[];
}

export const ENGAGEMENT_STEPS: readonly string[] = [
  "Discovery",
  "Scope",
  "Architecture",
  "Build",
  "Test",
  "Launch",
  "Handover",
];

export const ENGAGEMENT_STEP_DETAILS: Readonly<Record<string, string>> = {
  Discovery: "Understand the business problem, users, workflows, and constraints.",
  Scope: "Turn the problem into a concrete, reviewable delivery plan.",
  Architecture: "Define data models, APIs, permissions, integrations, and deployment boundaries.",
  Build: "Implement the product iteratively against the agreed architecture.",
  Test: "Verify behavior, permissions, failure cases, and integration paths.",
  Launch: "Prepare and deploy the application to its target environment.",
  Handover: "Document the system and hand over the code, configuration, and operating context.",
};

const YANGO = "yango-wing-fleet-digital-registration-fleet-management-platform";
const NOTEASSIST = "noteassist-ai-productivity-platform";
const SK_LEARNTRACK = "sk-learntrack-ai-learning-platform";
const FEELWISE = "feelwise-emotion-detection-system";
const NBB = "nurses-beyond-borders-nclex-learning-exam-preparation-platform";
const PORTFOLIO = "shahriyar-khan-full-stack-portfolio-ai-assistant-platform";
const TBOS = "techbuilt-open-school-multilingual-education-platform-operational-lms";

export const SERVICE_FRAMING: Readonly<Record<string, ServiceFraming>> = {
  "custom-software-development": {
    audience: "Businesses and product teams that need software built around a real workflow rather than a generic template.",
    problemFraming:
      "The system needs clear domain rules, permissions, integrations, and operational tooling that fit how the business actually works.",
    whatIsNeededToBegin: [
      "The business problem and the workflow that needs to be supported",
      "The user roles and access boundaries",
      "Required integrations, constraints, and deployment expectations",
    ],
    relatedProjectSlugs: [NBB, YANGO, PORTFOLIO],
    engagementSteps: ENGAGEMENT_STEPS,
  },
  "web-development": {
    audience: "Teams that need a modern public or authenticated web product backed by maintainable application logic.",
    problemFraming:
      "The product needs a responsive interface, reliable backend integration, clear content structure, and search-friendly delivery.",
    whatIsNeededToBegin: [
      "The pages, user journeys, and content requirements",
      "Any existing brand or product assets",
      "Whether the product needs authentication, a CMS, APIs, or integrations",
    ],
    relatedProjectSlugs: [YANGO, NOTEASSIST, PORTFOLIO],
    engagementSteps: ENGAGEMENT_STEPS,
  },
  "application-development": {
    audience: "Teams building multi-screen applications with accounts, business workflows, dashboards, and administration.",
    problemFraming:
      "The application needs to coordinate frontend flows, backend rules, data models, authentication, and internal operations as one maintainable system.",
    whatIsNeededToBegin: [
      "The core user roles and workflows",
      "The data the application must store and expose",
      "The integrations and operational requirements around the product",
    ],
    relatedProjectSlugs: [NBB, SK_LEARNTRACK, FEELWISE],
    engagementSteps: ENGAGEMENT_STEPS,
  },
  "saas-development": {
    audience: "Founders and teams building authenticated, multi-user products with recurring product workflows.",
    problemFraming:
      "The product needs maintainable accounts, roles, dashboards, quotas or entitlements, integrations, and room for feature growth.",
    whatIsNeededToBegin: [
      "The core product workflow and user roles",
      "Access, entitlement, subscription, or quota rules where applicable",
      "The dashboard, reporting, and integration requirements",
    ],
    relatedProjectSlugs: [NBB, NOTEASSIST, SK_LEARNTRACK],
    engagementSteps: ENGAGEMENT_STEPS,
  },
  "database-development": {
    audience: "Products that need a reliable relational data model, migration strategy, and query layer behind business workflows.",
    problemFraming:
      "The database should reflect the domain clearly enough that permissions, reporting, exports, and future changes remain understandable.",
    whatIsNeededToBegin: [
      "The core entities and their relationships",
      "Expected reporting, filtering, and export needs",
      "Existing data sources or migration requirements",
    ],
    relatedProjectSlugs: [NBB, YANGO, NOTEASSIST],
    engagementSteps: ENGAGEMENT_STEPS,
  },
  "cloud-application-development": {
    audience: "Teams that need an application prepared for repeatable deployment and operation in a cloud-hosted environment.",
    problemFraming:
      "The product needs environment-aware configuration, deployment workflows, health checks, background services, and clear operational boundaries.",
    whatIsNeededToBegin: [
      "The target hosting environment and domain setup",
      "Database, cache, worker, storage, and external-service requirements",
      "Release, monitoring, and operational expectations",
    ],
    relatedProjectSlugs: [NBB, PORTFOLIO, TBOS],
    engagementSteps: ENGAGEMENT_STEPS,
  },
};
