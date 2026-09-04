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
const ALLOWED_MESSAGE_KEYS = new Set(["sender_name", "email", "subject", "message", "service_type_text"]);
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

  it("falls back to the intent's subject hint when no subject was typed", () => {
    const intent = CONTACT_INTENTS.find((i) => i.subjectHint.length > 0)!;
    const composed = composeInquiryPayload(intent, { ...VALUES, subject: "" }, "/contact");
    expect(composed.payload.subject).toBe(intent.subjectHint);
  });
});
