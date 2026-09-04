export type InquiryMode = "message" | "project";

export interface InquiryValues {
  name: string;
  email: string;
  subject: string;
  message: string;
  serviceId: string;
  serviceText: string;
  budget: string;
  timeline: string;
}

export type FieldErrors = Partial<Record<keyof InquiryValues, string>>;

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Max lengths mirror the backend's own field constraints
// (backend/apps/inquiries/models.py) - the server remains the real
// authority; this only prevents an obvious round-trip.
const MAX = {
  name: 150,
  subject: 200,
  serviceText: 255,
  budget: 120,
  timeline: 120,
} as const;

export function isEmailShaped(value: string): boolean {
  return EMAIL_SHAPE.test(value.trim());
}

export function validateInquiry(mode: InquiryMode, values: InquiryValues): FieldErrors {
  const errors: FieldErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = "Enter your name.";
  else if (name.length > MAX.name) errors.name = `Keep this under ${MAX.name} characters.`;

  const email = values.email.trim();
  if (!email) errors.email = "Enter your email.";
  else if (!isEmailShaped(email)) errors.email = "Enter a valid email address.";

  const subject = values.subject.trim();
  if (!subject) errors.subject = "Enter a subject.";
  else if (subject.length > MAX.subject) errors.subject = `Keep this under ${MAX.subject} characters.`;

  const message = values.message.trim();
  if (!message) errors.message = "Enter a message.";
  else if (message.length < 20) errors.message = "Say a bit more - at least 20 characters.";

  if (values.serviceText.trim().length > MAX.serviceText) {
    errors.serviceText = `Keep this under ${MAX.serviceText} characters.`;
  }

  if (mode === "project") {
    if (values.budget.trim().length > MAX.budget) {
      errors.budget = `Keep this under ${MAX.budget} characters.`;
    }
    if (values.timeline.trim().length > MAX.timeline) {
      errors.timeline = `Keep this under ${MAX.timeline} characters.`;
    }
  }

  return errors;
}
