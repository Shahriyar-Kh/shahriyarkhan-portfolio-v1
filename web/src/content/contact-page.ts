/**
 * FINAL-DESIGN-01G-01: /contact's own page framing. Real contact details
 * always render live from SiteSettings (contact-details.tsx) - nothing
 * here restates or overrides an email, phone, or location. This file is
 * page copy only: no response-time promise, no availability claim, no
 * client count, no office hours - none of that is verified anywhere in
 * this repo (the same discipline content/skills-page.ts and
 * content/experience-page.ts already apply to their own pages).
 */
export const CONTACT_HERO = {
  eyebrow: "Contact",
  title: "Get in touch",
  lead: "For a role, a new project, or backend/API and full-stack development work - send the details below and it goes straight to a single-person inbox for review.",
} as const;

export interface WhatHappensNextStep {
  title: string;
  body: string;
}

export const WHAT_HAPPENS_NEXT: readonly WhatHappensNextStep[] = [
  { title: "Enquiry is reviewed", body: "Read in full, against what's actually being asked - a role, a project, or a specific technical question." },
  { title: "Details are clarified", body: "A reply asks whatever's still needed to understand the role or project properly." },
  { title: "Next step is agreed", body: "A call, a proposal, or a direct answer - whichever actually fits what was asked." },
] as const;

export const CONTACT_CLOSING_LINE =
  "Every message here is read personally - no forms team, no auto-responder script deciding what matters.";
