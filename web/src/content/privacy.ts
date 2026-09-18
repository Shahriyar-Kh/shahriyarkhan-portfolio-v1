/**
 * /privacy's copy. This is a factual disclosure, not a legal document -
 * see privacy-consistency.test.ts, which mechanically enforces that
 * nothing in src/** contradicts the claims made here (no cookie writes,
 * no third-party <script src>, no registered analytics provider).
 *
 * FINAL-DESIGN-01H-01: rewritten to describe the actual, deployed
 * Contact Ops pipeline (CONTACT-OPS-01) - database-first persistence,
 * reference IDs and idempotency, honeypot and rate limiting, the Gmail
 * notification and Google Sheets mirror, and who can review a
 * submission - rather than the earlier, pre-pipeline placeholder text.
 */

export const PRIVACY_INTRO =
  "This page describes, factually, what this website collects through its contact and project forms and where it goes. It is not a legal privacy policy - a formal policy requires decisions that have not yet been made.";

export interface PrivacySection {
  heading: string;
  body: string;
  /** Optional inline link rendered after the body - used only where a
   * direct next step (the contact form) is genuinely useful, not as
   * decoration on every section. */
  cta?: { label: string; href: string };
}

export const PRIVACY_SECTIONS: ReadonlyArray<PrivacySection> = [
  {
    heading: "What the contact and project forms collect",
    body: "The general contact form collects name, email address, subject, and message. Project enquiries can additionally include phone/WhatsApp, organization, project type and stage, business problem, target users, expected outcome, required and optional features, existing assets, budget range, timeline, technical preferences, preferred contact method, and the page the form was opened from. Submitting a form never creates a marketing subscription - the information is used to review and respond to that specific enquiry.",
  },
  {
    heading: "AI-assisted portfolio guide",
    body: "The portfolio assistant does not save a chat transcript in this site's database. The browser may send up to four recent visitor messages with the current question so short follow-ups can keep their context; those messages are used for that request only. When the optional Gemini provider is enabled, the current question and only the recent context needed for that follow-up are sent to Google's Gemini API together with published portfolio evidence. If Gemini is unavailable, a local deterministic fallback answers from the same published evidence. The server stores only a one-way HMAC-based daily usage counter, not the raw message, generated answer, raw IP address, or user agent.",
  },
  {
    heading: "AI-assisted project discovery",
    body: "If a visitor starts Project Discovery from an assistant conversation, recent visitor-written project messages can be carried into the form in the browser. The optional AI analysis endpoint may suggest draft fields and follow-up questions, but those suggestions are not saved automatically. The visitor can review and edit them, and only the structured form they explicitly submit is persisted. The final stored project summary is generated deterministically from those submitted fields so an AI model cannot add requirements to the saved record.",
  },
  {
    heading: "Where it goes",
    body: "Submissions are stored in this site's own database first - that is what actually determines whether a submission succeeded, and it happens before anything else is attempted. From there, an email notification is sent to the site owner through Google's Gmail service, and a private, owner-only Google Sheet may be used as a secondary operational record of the same submission. A submission succeeding means the database accepted it - it does not guarantee the email notification was delivered or the Sheets record was written, since both are separate steps that can fail independently without ever affecting the stored submission.",
  },
  {
    heading: "Reference IDs and duplicate protection",
    body: "Every accepted submission is given a short reference code (shown on screen right after sending, in the form SK-XXXXXXXX) tied to that one submission. If the same submission is sent twice in a row - for example after a slow connection or an accidental second click - the original reference code is returned instead of a duplicate being created.",
  },
  {
    heading: "Spam and abuse prevention",
    body: "This form uses two ordinary, invisible safeguards: a hidden field that only automated bots fill in, and a limit on how many submissions can be accepted from the same source in a short period. Neither collects any extra information about a visitor, and there is no CAPTCHA or third-party challenge to complete.",
  },
  {
    heading: "Who else processes this data",
    body: "Google may process data through Gmail (the owner's email notification), Google Sheets (the optional operational record), and, only when the optional Gemini provider is enabled, the current assistant/discovery text needed to generate an AI response. This site's hosting and database providers also process data as part of running the service. This site does not sell enquiry or assistant data or use it for advertising.",
  },
  {
    heading: "Who can review a submission",
    body: "Submitted enquiries are reviewed by the site owner through a password-protected administrative page. No one else has access to them.",
  },
  {
    heading: "How long submissions are kept",
    body: "Enquiry information is retained only for as long as reasonably necessary to review and respond, maintain relevant business records, and meet applicable legal obligations. A specific, fixed retention period has not yet been set.",
  },
  {
    heading: "Requesting correction or deletion",
    body: "To request a correction or deletion of a submitted enquiry, use the contact form's General inquiry option and include the reference code shown after the original submission, along with the email address it was submitted from.",
    cta: { label: "Go to the contact form", href: "/contact" },
  },
  {
    heading: "Cookies and tracking",
    body: "This site's own code does not set cookies and does not load any tracking or analytics script. Cloudflare, the network this site is delivered through, automatically inserts a reference to its own analytics beacon into every page it serves - that is Cloudflare's platform-level behavior, not something this application added or uses, and this site's Content-Security-Policy blocks it from ever running in a visitor's browser. Fonts are bundled and self-hosted at build time rather than requested from a third party at runtime.",
  },
  {
    heading: "Contact",
    body: "Questions about this page, or about a specific submission, can be sent through the contact form.",
    cta: { label: "Go to the contact form", href: "/contact" },
  },
];
