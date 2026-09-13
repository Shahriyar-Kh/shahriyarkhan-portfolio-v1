import type { ContactIntentOption } from "@/content/contact";
import type { ContactMessagePayload, ServiceRequestPayload } from "@/lib/api/types";
import type { InquiryValues } from "@/lib/validation";

export type ComposedInquiry =
  | { mode: "message"; payload: ContactMessagePayload }
  | { mode: "project"; payload: ServiceRequestPayload };

/** Honeypot value and client-generated idempotency key - not form values
 * the visitor typed, so kept as a separate optional argument rather than
 * folded into InquiryValues. */
export interface InquiryTracking {
  website?: string;
  submissionId?: string;
}

/**
 * The only place an InquiryValues + a chosen intent become a request
 * body. Every key on both payload shapes is drawn from lib/api/types.ts's
 * verified contract - this function can only ever produce a subset of
 * those keys (see inquiry-composition.test.ts), so an intent can never
 * cause an unsupported property to reach the API.
 *
 * `intent.value` is sent as the `intent` field on every payload shape -
 * the backend stores it (validated against the same six values this
 * file's CONTACT_INTENTS enumerates) so recruiter/project/technical
 * enquiries are distinguishable in admin, not just by which of the two
 * endpoints they landed on.
 */
export function composeInquiryPayload(
  intent: ContactIntentOption,
  values: InquiryValues,
  sourcePage: string,
  tracking: InquiryTracking = {},
): ComposedInquiry {
  const subject = values.subject.trim() || intent.subjectHint;
  const serviceTypeText = values.serviceText.trim() || intent.serviceTypeHint || undefined;
  const trackingFields = {
    ...(tracking.website ? { website: tracking.website } : {}),
    ...(tracking.submissionId ? { submission_id: tracking.submissionId } : {}),
  };

  if (intent.mode === "message") {
    const payload: ContactMessagePayload = {
      sender_name: values.name.trim(),
      email: values.email.trim(),
      subject,
      message: values.message.trim(),
      intent: intent.value,
      ...(serviceTypeText ? { service_type_text: serviceTypeText } : {}),
      ...trackingFields,
    };
    return { mode: "message", payload };
  }

  const payload: ServiceRequestPayload = {
    sender_name: values.name.trim(),
    email: values.email.trim(),
    subject,
    message: values.message.trim(),
    service: values.serviceId ? Number(values.serviceId) : null,
    intent: intent.value,
    ...(serviceTypeText ? { service_type_text: serviceTypeText } : {}),
    ...(values.budget.trim() ? { budget_range: values.budget.trim() } : {}),
    ...(values.timeline.trim() ? { timeline: values.timeline.trim() } : {}),
    source_page: sourcePage,
    ...trackingFields,
  };
  return { mode: "project", payload };
}
