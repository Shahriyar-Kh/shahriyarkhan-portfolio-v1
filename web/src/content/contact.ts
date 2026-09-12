import type { InquiryMode } from "@/lib/validation";

/**
 * Intent capture. Each option decides (a) which of the two inquiry
 * endpoints the form posts to (message vs. project, via InquiryMode),
 * (b) a pre-filled, still-editable subject/service_type_text hint, and
 * (c) the `intent` value itself, which IS sent to and stored by the
 * backend (validated against this exact list of six values -
 * CONTACT-OPS-01) so recruiter/project/technical enquiries stay
 * distinguishable in admin. See lib/inquiry-composition.ts for how an
 * intent + form values become an actual ContactMessagePayload/
 * ServiceRequestPayload - never an unsupported property reaches the API.
 */
export type ContactIntent =
  | "hiring"
  | "freelance_project"
  | "api_backend"
  | "full_stack"
  | "improvement"
  | "general";

/** Purely a <select> presentation grouping (FINAL-DESIGN-01G-01) - never
 * read by validation, composition, or the backend. Lets the form
 * visually separate the recruiter path from the client/project paths
 * without touching the mode/payload logic below. */
export type ContactIntentGroup = "General" | "A role" | "A project";

export interface ContactIntentOption {
  readonly value: ContactIntent;
  readonly label: string;
  readonly mode: InquiryMode;
  readonly group: ContactIntentGroup;
  readonly subjectHint: string;
  readonly serviceTypeHint?: string;
}

export const CONTACT_INTENTS: readonly ContactIntentOption[] = [
  { value: "general", label: "General inquiry", mode: "message", group: "General", subjectHint: "" },
  {
    value: "hiring",
    label: "A role or hiring opportunity",
    mode: "message",
    group: "A role",
    subjectHint: "Hiring inquiry",
  },
  {
    value: "freelance_project",
    label: "A new project",
    mode: "project",
    group: "A project",
    subjectHint: "New project inquiry",
  },
  {
    value: "api_backend",
    label: "API / backend development",
    mode: "project",
    group: "A project",
    subjectHint: "API / backend development inquiry",
    serviceTypeHint: "API / backend development",
  },
  {
    value: "full_stack",
    label: "A full-stack web application",
    mode: "project",
    group: "A project",
    subjectHint: "Full-stack application inquiry",
    serviceTypeHint: "Full-stack web application",
  },
  {
    value: "improvement",
    label: "Improving an existing site or system",
    mode: "message",
    group: "A project",
    subjectHint: "Existing system - improvement inquiry",
  },
];

export function getContactIntent(value: string | null | undefined): ContactIntentOption {
  return CONTACT_INTENTS.find((intent) => intent.value === value) ?? CONTACT_INTENTS[0]!;
}

/** No response-time promise here on purpose - none is verified anywhere
 * in the repo (owner judgment call #9's same discipline applied to
 * contact copy). */
export const CONTACT_PRIVACY_NOTICE =
  "Submitting this form stores your message for review by a single person. See the privacy page for exactly what's collected and where it goes.";
