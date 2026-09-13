import { describe, expect, it } from "vitest";
import { CONTACT_INTENTS } from "@/content/contact";
import { composeInquiryPayload } from "@/lib/inquiry-composition";
import type { InquiryValues } from "@/lib/validation";

const VALUES: InquiryValues = {
  name: "Jane Doe",
  email: "jane@example.com",
  subject: "",
  message: "A message that is definitely long enough.",
  serviceId: "3",
  serviceText: "",
  budget: "5000",
  timeline: "2 months",
};

// Mirrors the verified backend contract in lib/api/types.ts exactly -
// composeInquiryPayload must never produce a key outside these sets.
const ALLOWED_MESSAGE_KEYS = new Set([
  "sender_name",
  "email",
  "subject",
  "message",
  "service_type_text",
  "intent",
  "source_page",
  "website",
  "submission_id",
]);
const ALLOWED_PROJECT_KEYS = new Set([
  "sender_name",
  "email",
  "subject",
  "message",
  "service",
  "service_type_text",
  "budget_range",
  "timeline",
  "source_page",
  "intent",
  "website",
  "submission_id",
]);

describe("composeInquiryPayload", () => {
  it("never produces a key outside the verified backend contract, for every intent", () => {
    for (const intent of CONTACT_INTENTS) {
      const composed = composeInquiryPayload(intent, VALUES, "/contact");
      const allowed = composed.mode === "message" ? ALLOWED_MESSAGE_KEYS : ALLOWED_PROJECT_KEYS;
      for (const key of Object.keys(composed.payload)) {
        expect(allowed.has(key), `${intent.value} produced unsupported key "${key}"`).toBe(true);
      }
    }
  });

  it("routes a message-mode intent to a ContactMessagePayload with no service field", () => {
    const intent = CONTACT_INTENTS.find((i) => i.mode === "message")!;
    const composed = composeInquiryPayload(intent, VALUES, "/contact");
    expect(composed.mode).toBe("message");
    expect(composed.payload).not.toHaveProperty("service");
  });

  it("routes a project-mode intent to a ServiceRequestPayload carrying source_page", () => {
    const intent = CONTACT_INTENTS.find((i) => i.mode === "project")!;
    const composed = composeInquiryPayload(intent, VALUES, "/contact");
    expect(composed.mode).toBe("project");
    if (composed.mode === "project") {
      expect(composed.payload.source_page).toBe("/contact");
      expect(composed.payload.service).toBe(3);
    }
  });

  it("CONTACT-OPS-01-PROD-INCIDENT-01: a message-mode intent also carries source_page, not just project-mode", () => {
    for (const intent of CONTACT_INTENTS.filter((i) => i.mode === "message")) {
      const composed = composeInquiryPayload(intent, VALUES, "/contact");
      expect(composed.mode).toBe("message");
      expect(composed.payload.source_page, `${intent.value} lost source_page`).toBe("/contact");
    }
  });

  it("falls back to the intent's subject hint when no subject was typed", () => {
    const intent = CONTACT_INTENTS.find((i) => i.subjectHint.length > 0)!;
    const composed = composeInquiryPayload(intent, { ...VALUES, subject: "" }, "/contact");
    expect(composed.payload.subject).toBe(intent.subjectHint);
  });

  it("always sends the chosen intent's value", () => {
    for (const intent of CONTACT_INTENTS) {
      const composed = composeInquiryPayload(intent, VALUES, "/contact");
      expect(composed.payload.intent).toBe(intent.value);
    }
  });

  it("omits website/submission_id when no tracking info is given", () => {
    const composed = composeInquiryPayload(CONTACT_INTENTS[0]!, VALUES, "/contact");
    expect(composed.payload).not.toHaveProperty("website");
    expect(composed.payload).not.toHaveProperty("submission_id");
  });

  it("passes through a non-empty honeypot value and the submission id", () => {
    const composed = composeInquiryPayload(CONTACT_INTENTS[0]!, VALUES, "/contact", {
      website: "http://spam.example.com",
      submissionId: "11111111-1111-1111-1111-111111111111",
    });
    expect(composed.payload.website).toBe("http://spam.example.com");
    expect(composed.payload.submission_id).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("omits an empty honeypot value even when tracking info is provided", () => {
    const composed = composeInquiryPayload(CONTACT_INTENTS[0]!, VALUES, "/contact", {
      website: "",
      submissionId: "11111111-1111-1111-1111-111111111111",
    });
    expect(composed.payload).not.toHaveProperty("website");
  });
});
