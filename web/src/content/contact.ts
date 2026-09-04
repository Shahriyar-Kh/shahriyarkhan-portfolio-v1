import type { InquiryMode } from "@/lib/validation";

/**
 * Intent capture, entirely a frontend concept - it never adds a backend
 * field. Each option only decides (a) which of the two existing inquiry
 * endpoints the form posts to (message vs. project, via InquiryMode) and
 * (b) a pre-filled, still-editable subject/service_type_text hint. See
 * lib/inquiry-composition.ts for how an intent + form values become an
 * actual ContactMessagePayload/ServiceRequestPayload - never an
 * unsupported property reaches the API.
 */
export type ContactIntent =
  | "hiring"
  | "freelance_project"
  | "api_backend"
  | "full_stack"
  | "improvement"
  | "general";

export interface ContactIntentOption {
  readonly value: ContactIntent;
  readonly label: string;
  readonly mode: InquiryMode;
  readonly subjectHint: string;
  readonly serviceTypeHint?: string;
}

export const CONTACT_INTENTS: readonly ContactIntentOption[] = [
  { value: "general", label: "General inquiry", mode: "message", subjectHint: "" },
  {
    value: "hiring",
    label: "A role or hiring opportunity",
    mode: "message",
    subjectHint: "Hiring inquiry",
  },
  {
    value: "freelance_project",
    label: "A new project",
    mode: "project",
    subjectHint: "New project inquiry",
  },
  {
    value: "api_backend",
    label: "API / backend development",
    mode: "project",
    subjectHint: "API / backend development inquiry",
    serviceTypeHint: "API / backend development",
  },
  {
    value: "full_stack",
    label: "A full-stack web application",
    mode: "project",
    subjectHint: "Full-stack application inquiry",
    serviceTypeHint: "Full-stack web application",
  },
  {
    value: "improvement",
    label: "Improving an existing site or system",
    mode: "message",
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
  "Submitting this form sends your message to a single-person inbox for review. See the privacy page for exactly what's collected.";
