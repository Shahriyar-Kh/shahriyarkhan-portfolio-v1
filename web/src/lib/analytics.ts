export const ANALYTICS_EVENTS = {
  RECRUITER_CTA: "recruiter_cta_click",
  PROJECT_CTA: "project_cta_click",
  SERVICE_CTA: "service_cta_click",
  RESUME_VIEW: "resume_view",
  RESUME_DOWNLOAD: "resume_download",
  OUTBOUND_GITHUB: "outbound_github",
  OUTBOUND_LINKEDIN: "outbound_linkedin",
  CONTACT_STARTED: "contact_started",
  CONTACT_SUCCEEDED: "contact_succeeded",
  CONTACT_FAILED: "contact_failed",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** Only primitives - structurally prevents a form object from ever
 * reaching an analytics provider. */
export type AnalyticsValue = string | number | boolean | null;
export type AnalyticsProps = Readonly<Record<string, AnalyticsValue>>;
export type AnalyticsProvider = (name: AnalyticsEventName, props: AnalyticsProps) => void;

/** Second line of defence beyond the type system - form field names
 * never reach trackEvent by design, but this guards against a future
 * caller passing one anyway. */
const BLOCKED_PROP_KEYS = new Set([
  "email",
  "sender_name",
  "name",
  "message",
  "subject",
  "phone",
  "budget_range",
  "timeline",
]);

let provider: AnalyticsProvider | null = null;

/** NEXT_PUBLIC_ANALYTICS_PROVIDER unset (or "none") in this phase - no
 * provider has been chosen (docs/rebuild/OPEN_DECISIONS.md #19), so this
 * never gets called and every trackEvent() is a total no-op. Kept
 * provider-agnostic: wiring a real tool later means one call here, zero
 * call-site changes anywhere else in the app. */
export function setAnalyticsProvider(next: AnalyticsProvider | null): void {
  provider = next;
}

export function sanitizeProps(props: AnalyticsProps): AnalyticsProps {
  const clean: Record<string, AnalyticsValue> = {};
  for (const [key, value] of Object.entries(props)) {
    if (BLOCKED_PROP_KEYS.has(key)) continue;
    clean[key] = value;
  }
  return clean;
}

/** Fire-and-forget. Never throws, never awaits, never blocks render. */
export function trackEvent(name: AnalyticsEventName, props: AnalyticsProps = {}): void {
  if (!provider) return;
  try {
    provider(name, sanitizeProps(props));
  } catch {
    // Analytics must never break the page.
  }
}
