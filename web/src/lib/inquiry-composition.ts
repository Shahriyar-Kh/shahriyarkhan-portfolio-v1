import type { ContactIntentOption } from "@/content/contact";
import type { ContactMessagePayload, ServiceRequestPayload } from "@/lib/api/types";
import type { InquiryValues } from "@/lib/validation";

export type ComposedInquiry =
  | { mode: "message"; payload: ContactMessagePayload }
  | { mode: "project"; payload: ServiceRequestPayload };

/**
 * The only place an InquiryValues + a chosen intent become a request
 * body. Every key on both payload shapes is drawn from lib/api/types.ts's
 * verified contract - this function can only ever produce a subset of
 * those keys (see inquiry-composition.test.ts), so an intent can never
 * cause an unsupported property to reach the API.
 */
export function composeInquiryPayload(
  intent: ContactIntentOption,
  values: InquiryValues,
  sourcePage: string,
): ComposedInquiry {
  const subject = values.subject.trim() || intent.subjectHint;
  const serviceTypeText = values.serviceText.trim() || intent.serviceTypeHint || undefined;

  if (intent.mode === "message") {
    const payload: ContactMessagePayload = {
      sender_name: values.name.trim(),
      email: values.email.trim(),
      subject,
      message: values.message.trim(),
      ...(serviceTypeText ? { service_type_text: serviceTypeText } : {}),
    };
    return { mode: "message", payload };
  }

  const payload: ServiceRequestPayload = {
    sender_name: values.name.trim(),
    email: values.email.trim(),
    subject,
    message: values.message.trim(),
    service: values.serviceId ? Number(values.serviceId) : null,
    ...(serviceTypeText ? { service_type_text: serviceTypeText } : {}),
    ...(values.budget.trim() ? { budget_range: values.budget.trim() } : {}),
    ...(values.timeline.trim() ? { timeline: values.timeline.trim() } : {}),
    source_page: sourcePage,
  };
  return { mode: "project", payload };
}
