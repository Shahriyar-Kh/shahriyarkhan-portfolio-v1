/** Copy and static configuration for the portfolio assistant and the
 * Client Project Discovery wizard (PORTFOLIO-ASSISTANTS-01). No portfolio
 * facts live here - every fact the assistant states comes from the
 * backend's grounded response; this file only holds UI labels. */

export const ASSISTANT_LAUNCHER_LABEL = "Ask about Shahriyar";

export const ASSISTANT_DISCLAIMER =
  "This is an AI-assisted guide grounded only in the published portfolio - not a live chat with Shahriyar.";

export const ASSISTANT_STARTER_QUESTIONS: readonly string[] = [
  "What does Shahriyar specialize in?",
  "Show me relevant Django projects.",
  "I'm hiring for a backend role.",
  "I need a custom web application.",
];

export const ASSISTANT_ENTRY_PATHS = {
  ask: { key: "ask", label: "Ask about Shahriyar" },
  discover: { key: "discover", label: "Start a project" },
} as const;

export type AssistantEntryPath = keyof typeof ASSISTANT_ENTRY_PATHS;

export const DISCOVERY_PRIVACY_NOTICE =
  "Submitting this enquiry stores your answers for review by a single person, the same way the contact form does. See the privacy page for details.";

// ---- Project Discovery wizard steps ----

export type DiscoveryStepKey = "contact" | "project" | "business" | "scope" | "constraints" | "review";

export interface DiscoveryStepMeta {
  key: DiscoveryStepKey;
  label: string;
}

export const DISCOVERY_STEPS: readonly DiscoveryStepMeta[] = [
  { key: "contact", label: "Contact" },
  { key: "project", label: "Project" },
  { key: "business", label: "Business context" },
  { key: "scope", label: "Scope" },
  { key: "constraints", label: "Constraints" },
  { key: "review", label: "Review" },
];

export const PROJECT_TYPE_OPTIONS: readonly string[] = [
  "New website",
  "Web application",
  "API / backend service",
  "Mobile app",
  "Improvement to an existing product",
  "Other",
];

export const PROJECT_STAGE_OPTIONS: readonly string[] = [
  "Just an idea",
  "Requirements are ready",
  "Existing product needs work",
];

export const BUDGET_RANGE_OPTIONS: readonly string[] = [
  "Under $1,000",
  "$1,000 - $5,000",
  "$5,000 - $10,000",
  "$10,000+",
  "Not sure yet",
];

export const TIMELINE_OPTIONS: readonly string[] = ["Less than 1 month", "1-3 months", "3-6 months", "Flexible"];

export const PREFERRED_CONTACT_OPTIONS: readonly { value: "email" | "phone" | "whatsapp"; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "whatsapp", label: "WhatsApp" },
];
