/**
 * /privacy's copy. This is a factual disclosure, not a legal document -
 * see privacy-consistency.test.ts, which mechanically enforces that
 * nothing in src/** contradicts the claims made here (no cookie writes,
 * no third-party <script src>, no registered analytics provider).
 */

export const PRIVACY_INTRO =
  "This page describes, factually, what this website collects and where it goes. It is not a legal privacy policy - a formal policy requires decisions that have not yet been made.";

export const PRIVACY_SECTIONS: ReadonlyArray<{ heading: string; body: string }> = [
  {
    heading: "What the contact and project forms collect",
    body: "Name, email address, subject, and message are always collected. Depending on the form, an optional service, budget range, timeline, and the page the form was opened from may also be sent. No other field is collected.",
  },
  {
    heading: "Where it goes",
    body: "Submissions are sent directly to a single-person backend and stored there for review. A form submission succeeding means the backend accepted it - it does not guarantee an email notification was delivered, since notification delivery is a separate step that can fail independently.",
  },
  {
    heading: "How long submissions are kept",
    body: "How long submissions are kept has not yet been formally defined.",
  },
  {
    heading: "Cookies and tracking",
    body: "This site does not set cookies and does not load any third-party tracking or analytics script. Fonts are bundled and self-hosted at build time rather than requested from a third party at runtime.",
  },
  {
    heading: "Contact",
    body: "Questions about this page can be sent through the contact form.",
  },
];
