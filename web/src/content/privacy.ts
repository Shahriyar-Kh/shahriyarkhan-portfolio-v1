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
    body: "Name, email address, subject, and message are always collected. Depending on the form, an optional service, budget range, timeline, and the page the form was opened from may also be sent. No other field is collected. Submitting a form never creates a marketing subscription - nothing here is used to send anything other than a reply to that specific enquiry.",
  },
  {
    heading: "Where it goes",
    body: "Submissions are stored in this site's own database first - that is what determines whether a submission succeeded. From there, an email notification is sent to the site owner, and a private, owner-only Google Sheet may be used as a secondary operational record of the same submission. A submission succeeding means the database accepted it - it does not guarantee the email notification was delivered or the Sheets record was written, since both are separate steps that can fail independently without affecting the stored submission.",
  },
  {
    heading: "Who else processes this data",
    body: "Google (Gmail/Workspace, for sending the owner's email notification, and Google Sheets, for the optional operational record above) and this site's hosting and database providers process submission data as part of running the site. None of them use it for their own purposes, and it is not sold or shared with anyone else.",
  },
  {
    heading: "How long submissions are kept",
    body: "Enquiry information is retained only for as long as reasonably necessary to review and respond, maintain relevant business records, and meet applicable legal obligations.",
  },
  {
    heading: "Requesting correction or deletion",
    body: "To request a correction or deletion of a submitted enquiry, use the contact form's General inquiry option, and include the reference ID shown after the original submission along with the email address it was submitted from.",
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
