import { describe, expect, it } from "vitest";
import { isEmailShaped, validateInquiry, type InquiryValues } from "@/lib/validation";

const VALID: InquiryValues = {
  name: "Jane Doe",
  email: "jane@example.com",
  subject: "A project inquiry",
  message: "This message is definitely longer than twenty characters.",
  serviceId: "",
  serviceText: "",
  budget: "",
  timeline: "",
};

describe("isEmailShaped", () => {
  it("accepts a plausible email", () => {
    expect(isEmailShaped("jane@example.com")).toBe(true);
  });

  it("rejects a string with no @", () => {
    expect(isEmailShaped("not-an-email")).toBe(false);
  });
});

describe("validateInquiry", () => {
  it("returns no errors for fully valid message-mode values", () => {
    expect(validateInquiry("message", VALID)).toEqual({});
  });

  it("requires a name", () => {
    const errors = validateInquiry("message", { ...VALID, name: "  " });
    expect(errors.name).toBeDefined();
  });

  it("requires a valid email", () => {
    const errors = validateInquiry("message", { ...VALID, email: "nope" });
    expect(errors.email).toBeDefined();
  });

  it("rejects a message under 20 characters", () => {
    const errors = validateInquiry("message", { ...VALID, message: "too short" });
    expect(errors.message).toBeDefined();
  });

  it("does not require budget/timeline in message mode even if absurdly long", () => {
    const errors = validateInquiry("message", VALID);
    expect(errors.budget).toBeUndefined();
    expect(errors.timeline).toBeUndefined();
  });

  it("validates budget/timeline length only in project mode", () => {
    const tooLong = "x".repeat(121);
    const errors = validateInquiry("project", { ...VALID, budget: tooLong });
    expect(errors.budget).toBeDefined();
  });
});
