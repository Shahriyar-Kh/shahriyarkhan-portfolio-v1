"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, fieldDescribedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_INTENTS, CONTACT_PRIVACY_NOTICE, getContactIntent, type ContactIntent, type ContactIntentGroup } from "@/content/contact";
import { postContact, postServiceRequest } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { composeInquiryPayload } from "@/lib/inquiry-composition";
import { validateInquiry, type FieldErrors, type InquiryValues } from "@/lib/validation";

export interface InquiryFormProps {
  services: readonly { id: number; title: string }[];
  initialIntent: ContactIntent;
  sourcePage: string;
  /** Pre-selects "Related service" when arriving from a service detail
   * page's "Request this service" CTA - already validated against the
   * real published service list by the page before it reaches here. */
  initialServiceId?: string | null;
}

const EMPTY_VALUES: InquiryValues = {
  name: "",
  email: "",
  subject: "",
  message: "",
  serviceId: "",
  serviceText: "",
  budget: "",
  timeline: "",
};

type SubmitState = "idle" | "submitting" | "success" | "error";

// Display order for the intent <select>'s <optgroup>s - recruiter path
// first, then the client/project paths, matching this page's own dual-
// audience framing. Purely presentational; CONTACT_INTENTS' own array
// order still governs option order within each group.
const INTENT_GROUPS: readonly ContactIntentGroup[] = ["General", "A role", "A project"];

export function InquiryForm({ services, initialIntent, sourcePage, initialServiceId }: InquiryFormProps) {
  const formId = useId();
  const [intentValue, setIntentValue] = useState<ContactIntent>(initialIntent);
  const [values, setValues] = useState<InquiryValues>({
    ...EMPTY_VALUES,
    serviceId: initialServiceId ?? "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const started = useRef(false);
  const honeypotRef = useRef<HTMLInputElement>(null);

  const intent = getContactIntent(intentValue);

  function markStarted() {
    if (started.current) return;
    started.current = true;
    trackEvent("contact_started", { intent: intentValue });
  }

  function setField<K extends keyof InquiryValues>(key: K, value: InquiryValues[K]) {
    markStarted();
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Prevents a double-click/double-Enter from firing a second POST
    // before the disabled-button re-render has committed.
    if (state === "submitting") return;

    // Honeypot: a real visitor never fills this hidden field. Silently
    // report success without ever posting to the API - no error, no
    // signal to whatever filled it in.
    if (honeypotRef.current?.value) {
      setState("success");
      return;
    }

    const fieldErrors = validateInquiry(intent.mode, values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setState("submitting");
    setErrorMessage(null);

    const composed = composeInquiryPayload(intent, values, sourcePage);
    const result =
      composed.mode === "message" ? await postContact(composed.payload) : await postServiceRequest(composed.payload);

    if (result.ok) {
      setState("success");
      trackEvent("contact_succeeded", { intent: intentValue });
      return;
    }

    setState("error");
    setErrorMessage(result.error.message);
    if (result.error.fieldErrors) {
      const mapped: FieldErrors = {};
      if (result.error.fieldErrors["sender_name"]) mapped.name = result.error.fieldErrors["sender_name"][0];
      if (result.error.fieldErrors["email"]) mapped.email = result.error.fieldErrors["email"][0];
      if (result.error.fieldErrors["subject"]) mapped.subject = result.error.fieldErrors["subject"][0];
      if (result.error.fieldErrors["message"]) mapped.message = result.error.fieldErrors["message"][0];
      setErrors((prev) => ({ ...prev, ...mapped }));
    }
    trackEvent("contact_failed", { intent: intentValue });
  }

  if (state === "success") {
    return (
      <div role="status" aria-live="polite" className="border border-dashed border-accent p-6">
        <p className="text-body font-medium text-ink-primary">Your message was received.</p>
        <p className="mt-2 text-body-sm text-ink-secondary">
          This confirms the backend accepted your submission - it does not guarantee an email notification was
          delivered. See the privacy page for how this works.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* Honeypot - visually and semantically hidden from real users and
       * screen readers, but present in the DOM/tab order for naive bots.
       * tabIndex=-1 and aria-hidden keep it out of the way of a keyboard
       * or screen-reader user without relying on display:none (which some
       * bots skip filling). */}
      <div aria-hidden="true" className="absolute -left-[9999px]" tabIndex={-1}>
        <label htmlFor={`${formId}-website`}>Website</label>
        <input id={`${formId}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" ref={honeypotRef} />
      </div>

      <Field label="What's this about?" htmlFor={`${formId}-intent`}>
        <Select
          id={`${formId}-intent`}
          value={intentValue}
          onChange={(e) => {
            markStarted();
            setIntentValue(e.target.value as ContactIntent);
          }}
        >
          {INTENT_GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {CONTACT_INTENTS.filter((option) => option.group === group).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${formId}-name`} required error={errors.name}>
          <Input
            id={`${formId}-name`}
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            invalid={Boolean(errors.name)}
            aria-describedby={fieldDescribedBy(`${formId}-name`, undefined, errors.name)}
            autoComplete="name"
            required
          />
        </Field>
        <Field label="Email" htmlFor={`${formId}-email`} required error={errors.email}>
          <Input
            id={`${formId}-email`}
            type="email"
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            invalid={Boolean(errors.email)}
            aria-describedby={fieldDescribedBy(`${formId}-email`, undefined, errors.email)}
            autoComplete="email"
            required
          />
        </Field>
      </div>

      <Field label="Subject" htmlFor={`${formId}-subject`} required error={errors.subject}>
        <Input
          id={`${formId}-subject`}
          value={values.subject}
          onChange={(e) => setField("subject", e.target.value)}
          placeholder={intent.subjectHint}
          invalid={Boolean(errors.subject)}
          aria-describedby={fieldDescribedBy(`${formId}-subject`, undefined, errors.subject)}
          required
        />
      </Field>

      {intent.mode === "project" && (
        <>
          {services.length > 0 && (
            <Field label="Related service (optional)" htmlFor={`${formId}-service`}>
              <Select
                id={`${formId}-service`}
                value={values.serviceId}
                onChange={(e) => setField("serviceId", e.target.value)}
              >
                <option value="">Not sure / other</option>
                {services.map((service) => (
                  <option key={service.id} value={String(service.id)}>
                    {service.title}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Budget range (optional)" htmlFor={`${formId}-budget`} error={errors.budget}>
              <Input
                id={`${formId}-budget`}
                value={values.budget}
                onChange={(e) => setField("budget", e.target.value)}
                invalid={Boolean(errors.budget)}
              />
            </Field>
            <Field label="Timeline (optional)" htmlFor={`${formId}-timeline`} error={errors.timeline}>
              <Input
                id={`${formId}-timeline`}
                value={values.timeline}
                onChange={(e) => setField("timeline", e.target.value)}
                invalid={Boolean(errors.timeline)}
              />
            </Field>
          </div>
        </>
      )}

      <Field label="Message" htmlFor={`${formId}-message`} required error={errors.message} hint="At least 20 characters.">
        <Textarea
          id={`${formId}-message`}
          rows={6}
          value={values.message}
          onChange={(e) => setField("message", e.target.value)}
          invalid={Boolean(errors.message)}
          aria-describedby={fieldDescribedBy(`${formId}-message`, "At least 20 characters.", errors.message)}
          required
        />
      </Field>

      {state === "error" && errorMessage && (
        <p role="alert" className="text-caption-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <p className="text-caption-sm text-ink-hint">{CONTACT_PRIVACY_NOTICE}</p>

      <Button type="submit" disabled={state === "submitting"} className="self-start">
        {state === "submitting" ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
