"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, fieldDescribedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BUDGET_RANGE_OPTIONS,
  DISCOVERY_PRIVACY_NOTICE,
  DISCOVERY_STEPS,
  PREFERRED_CONTACT_OPTIONS,
  PROJECT_STAGE_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  TIMELINE_OPTIONS,
  type DiscoveryStepKey,
} from "@/content/assistant";
import { postProjectDiscovery, postProjectDiscoveryAnalysis } from "@/lib/api";
import type { ProjectDiscoveryPayload } from "@/lib/api/types";

export interface ProjectDiscoveryWizardProps {
  sourcePage: string;
  initialDescription?: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  organization: string;
  preferredContactMethod: "email" | "phone" | "whatsapp" | "";
  projectType: string;
  projectStage: string;
  businessProblem: string;
  targetUsers: string;
  expectedOutcome: string;
  requiredFeatures: string[];
  optionalFeatures: string[];
  existingAssets: string;
  budgetRange: string;
  timeline: string;
  technicalPreferences: string;
  additionalNotes: string;
  consentGiven: boolean;
}

const EMPTY_STATE: FormState = {
  name: "",
  email: "",
  phone: "",
  organization: "",
  preferredContactMethod: "",
  projectType: "",
  projectStage: "",
  businessProblem: "",
  targetUsers: "",
  expectedOutcome: "",
  requiredFeatures: [],
  optionalFeatures: [],
  existingAssets: "",
  budgetRange: "",
  timeline: "",
  technicalPreferences: "",
  additionalNotes: "",
  consentGiven: false,
};

type Errors = Partial<Record<keyof FormState, string>>;

function validateStep(step: DiscoveryStepKey, values: FormState): Errors {
  const errors: Errors = {};
  if (step === "contact") {
    if (!values.name.trim()) errors.name = "Name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "A valid email is required.";
  }
  if (step === "project") {
    if (!values.projectType) errors.projectType = "Select a project type.";
    if (!values.projectStage) errors.projectStage = "Select the current stage.";
  }
  if (step === "business") {
    if (values.businessProblem.trim().length < 10) errors.businessProblem = "Describe the problem in a bit more detail.";
    if (!values.expectedOutcome.trim()) errors.expectedOutcome = "Describe the goal.";
  }
  if (step === "scope") {
    if (values.requiredFeatures.length === 0) errors.requiredFeatures = "List at least one required feature.";
  }
  if (step === "review") {
    if (!values.consentGiven) errors.consentGiven = "Consent is required to submit.";
  }
  return errors;
}

function FeatureListInput({
  label,
  values,
  onChange,
  error,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const [draft, setDraft] = useState("");
  const inputId = useId();

  function addFeature() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...values, trimmed]);
    setDraft("");
  }

  return (
    <Field label={label} htmlFor={inputId} error={error}>
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFeature();
            }
          }}
          placeholder="Type a feature and press Enter"
        />
        <Button type="button" variant="secondary" size="sm" onClick={addFeature}>
          Add
        </Button>
      </div>
      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {values.map((feature, index) => (
            <li key={`${feature}-${index}`} className="flex items-center gap-1 border border-border px-2 py-1 text-caption-sm">
              {feature}
              <button
                type="button"
                aria-label={`Remove ${feature}`}
                onClick={() => onChange(values.filter((_, i) => i !== index))}
                className="text-ink-hint hover:text-destructive"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}

export function ProjectDiscoveryWizard({ sourcePage, initialDescription = "" }: ProjectDiscoveryWizardProps) {
  const formId = useId();
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<FormState>(() => {
    const seed = initialDescription.trim();
    return seed.length >= 10 ? { ...EMPTY_STATE, businessProblem: seed } : EMPTY_STATE;
  });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ referenceId: string; summary: string } | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "loading" | "ready">(
    initialDescription.trim().length >= 10 ? "loading" : "idle",
  );
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const submissionIdRef = useRef<string>(crypto.randomUUID());

  const step = DISCOVERY_STEPS[stepIndex]!;

  useEffect(() => {
    const seed = initialDescription.trim();
    if (seed.length < 10) return;

    let active = true;

    void postProjectDiscoveryAnalysis({ description: seed }).then((result) => {
      if (!active) return;
      if (result.ok) {
        const ai = result.data;
        setValues((prev) => ({
          ...prev,
          projectType: prev.projectType || ai.project_type,
          projectStage: prev.projectStage || ai.project_stage,
          businessProblem: prev.businessProblem || ai.summary || seed,
          targetUsers: prev.targetUsers || ai.target_users,
          expectedOutcome: prev.expectedOutcome || ai.expected_outcome,
          requiredFeatures: prev.requiredFeatures.length ? prev.requiredFeatures : ai.required_features,
          optionalFeatures: prev.optionalFeatures.length ? prev.optionalFeatures : ai.optional_features,
          technicalPreferences: prev.technicalPreferences || ai.technical_preferences,
        }));
        setFollowUpQuestions(ai.follow_up_questions);
      } else {
        setFollowUpQuestions([
          "Who will use this product?",
          "What result should the project achieve?",
          "Which features are essential for the first version?",
        ]);
      }
      setAnalysisStatus("ready");
    });

    return () => {
      active = false;
    };
  }, [initialDescription]);


  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function goNext() {
    const stepErrors = validateStep(step.key, values);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    setStepIndex((i) => Math.min(i + 1, DISCOVERY_STEPS.length - 1));
  }

  function goBack() {
    setErrors({});
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleSubmit() {
    const stepErrors = validateStep("review", values);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    if (honeypotRef.current?.value) {
      setStatus("success");
      setReceipt({ referenceId: "", summary: "" });
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);

    const payload: ProjectDiscoveryPayload = {
      name: values.name,
      email: values.email,
      phone: values.phone || undefined,
      organization: values.organization || undefined,
      preferred_contact_method: values.preferredContactMethod || undefined,
      project_type: values.projectType,
      project_stage: values.projectStage,
      business_problem: values.businessProblem,
      target_users: values.targetUsers || undefined,
      expected_outcome: values.expectedOutcome,
      required_features: values.requiredFeatures,
      optional_features: values.optionalFeatures,
      existing_assets: values.existingAssets || undefined,
      budget_range: values.budgetRange || undefined,
      timeline: values.timeline || undefined,
      technical_preferences: values.technicalPreferences || undefined,
      additional_notes: values.additionalNotes || undefined,
      consent_given: values.consentGiven,
      source_page: sourcePage,
      intent: "freelance_project",
      submission_id: submissionIdRef.current,
      website: honeypotRef.current?.value,
    };

    const result = await postProjectDiscovery(payload);

    if (result.ok) {
      setReceipt({ referenceId: result.data.reference_id, summary: result.data.discovery_summary });
      setStatus("success");
      return;
    }

    setStatus("error");
    setErrorMessage(result.error.message);
  }

  if (status === "success" && receipt) {
    return (
      <div role="status" aria-live="polite" className="flex h-full flex-col justify-center gap-3 p-6 text-center">
        <p className="text-body font-medium text-ink-primary">Your project enquiry was received.</p>
        {receipt.referenceId && (
          <p className="text-body-sm text-ink-secondary">
            Reference: <span className="font-medium text-ink-primary">{receipt.referenceId}</span>
          </p>
        )}
        {receipt.summary && (
          <pre className="whitespace-pre-wrap border border-border p-3 text-left text-caption-sm text-ink-secondary">{receipt.summary}</pre>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border px-4 py-3" aria-label="Progress">
        {DISCOVERY_STEPS.map((s, index) => (
          <span
            key={s.key}
            aria-current={index === stepIndex || undefined}
            className={`h-1 flex-1 ${index <= stepIndex ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>
      <p className="px-4 pt-2 text-caption-sm text-ink-hint">
        Step {stepIndex + 1} of {DISCOVERY_STEPS.length}: {step.label}
      </p>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {initialDescription.trim().length >= 10 && (
          <div className="mb-4 border border-border bg-input/30 p-3 text-caption-sm text-ink-secondary">
            <p className="font-medium text-ink-primary">
              {analysisStatus === "loading" ? "Analyzing your project idea…" : "AI-assisted draft"}
            </p>
            <p className="mt-1">
              Your original description has been carried into this form. Review and edit every suggestion before submitting.
            </p>
            {analysisStatus === "ready" && followUpQuestions.length > 0 && (
              <div className="mt-2">
                <p className="font-medium text-ink-primary">Helpful questions to consider</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {followUpQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {step.key === "contact" && (
          <div className="flex flex-col gap-4">
            <Field label="Name" htmlFor={`${formId}-name`} required error={errors.name}>
              <Input
                id={`${formId}-name`}
                value={values.name}
                onChange={(e) => setField("name", e.target.value)}
                invalid={Boolean(errors.name)}
                aria-describedby={fieldDescribedBy(`${formId}-name`, undefined, errors.name)}
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
              />
            </Field>
            <Field label="Phone / WhatsApp (optional)" htmlFor={`${formId}-phone`}>
              <Input id={`${formId}-phone`} value={values.phone} onChange={(e) => setField("phone", e.target.value)} />
            </Field>
            <Field label="Organization (optional)" htmlFor={`${formId}-org`}>
              <Input id={`${formId}-org`} value={values.organization} onChange={(e) => setField("organization", e.target.value)} />
            </Field>
            <Field label="Preferred contact method (optional)" htmlFor={`${formId}-contact-method`}>
              <Select
                id={`${formId}-contact-method`}
                value={values.preferredContactMethod}
                onChange={(e) => setField("preferredContactMethod", e.target.value as FormState["preferredContactMethod"])}
              >
                <option value="">No preference</option>
                {PREFERRED_CONTACT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        {step.key === "project" && (
          <div className="flex flex-col gap-4">
            <Field label="Project type" htmlFor={`${formId}-project-type`} required error={errors.projectType}>
              <Select id={`${formId}-project-type`} value={values.projectType} onChange={(e) => setField("projectType", e.target.value)}>
                <option value="">Select one</option>
                {PROJECT_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Current stage" htmlFor={`${formId}-project-stage`} required error={errors.projectStage}>
              <Select id={`${formId}-project-stage`} value={values.projectStage} onChange={(e) => setField("projectStage", e.target.value)}>
                <option value="">Select one</option>
                {PROJECT_STAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        {step.key === "business" && (
          <div className="flex flex-col gap-4">
            <Field label="Business problem" htmlFor={`${formId}-problem`} required error={errors.businessProblem} hint="What isn't working today?">
              <Textarea id={`${formId}-problem`} rows={4} value={values.businessProblem} onChange={(e) => setField("businessProblem", e.target.value)} />
            </Field>
            <Field label="Target users (optional)" htmlFor={`${formId}-users`}>
              <Input id={`${formId}-users`} value={values.targetUsers} onChange={(e) => setField("targetUsers", e.target.value)} />
            </Field>
            <Field label="Expected outcome" htmlFor={`${formId}-outcome`} required error={errors.expectedOutcome}>
              <Textarea id={`${formId}-outcome`} rows={3} value={values.expectedOutcome} onChange={(e) => setField("expectedOutcome", e.target.value)} />
            </Field>
          </div>
        )}

        {step.key === "scope" && (
          <div className="flex flex-col gap-4">
            <FeatureListInput label="Required / core features" values={values.requiredFeatures} onChange={(next) => setField("requiredFeatures", next)} error={errors.requiredFeatures} />
            <FeatureListInput label="Optional features (nice to have)" values={values.optionalFeatures} onChange={(next) => setField("optionalFeatures", next)} />
            <Field label="Existing website / app / assets (optional)" htmlFor={`${formId}-assets`}>
              <Textarea id={`${formId}-assets`} rows={2} value={values.existingAssets} onChange={(e) => setField("existingAssets", e.target.value)} />
            </Field>
          </div>
        )}

        {step.key === "constraints" && (
          <div className="flex flex-col gap-4">
            <Field label="Budget range (optional)" htmlFor={`${formId}-budget`}>
              <Select id={`${formId}-budget`} value={values.budgetRange} onChange={(e) => setField("budgetRange", e.target.value)}>
                <option value="">Not sure yet</option>
                {BUDGET_RANGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Timeline (optional)" htmlFor={`${formId}-timeline`}>
              <Select id={`${formId}-timeline`} value={values.timeline} onChange={(e) => setField("timeline", e.target.value)}>
                <option value="">Flexible</option>
                {TIMELINE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Technical preferences (optional)" htmlFor={`${formId}-tech`}>
              <Input id={`${formId}-tech`} value={values.technicalPreferences} onChange={(e) => setField("technicalPreferences", e.target.value)} />
            </Field>
          </div>
        )}

        {step.key === "review" && (
          <div className="flex flex-col gap-4">
            <div aria-hidden="true" className="absolute -left-[9999px]" tabIndex={-1}>
              <label htmlFor={`${formId}-website`}>Website</label>
              <input id={`${formId}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" ref={honeypotRef} />
            </div>

            <Field label="Additional notes (optional)" htmlFor={`${formId}-notes`}>
              <Textarea id={`${formId}-notes`} rows={3} value={values.additionalNotes} onChange={(e) => setField("additionalNotes", e.target.value)} />
            </Field>

            <dl className="border border-border p-3 text-caption-sm text-ink-secondary">
              <div className="flex justify-between gap-2 py-1">
                <dt>Project</dt>
                <dd>{values.projectType || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <dt>Stage</dt>
                <dd>{values.projectStage || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <dt>Core features</dt>
                <dd className="text-right">{values.requiredFeatures.join(", ") || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <dt>Budget</dt>
                <dd>{values.budgetRange || "Not specified"}</dd>
              </div>
              <div className="flex justify-between gap-2 py-1">
                <dt>Timeline</dt>
                <dd>{values.timeline || "Flexible"}</dd>
              </div>
            </dl>

            <label className="flex items-start gap-2 text-body-sm text-ink-primary">
              <input
                type="checkbox"
                checked={values.consentGiven}
                onChange={(e) => setField("consentGiven", e.target.checked)}
                aria-describedby={errors.consentGiven ? `${formId}-consent-error` : undefined}
                className="mt-1"
              />
              I consent to this information being stored for review, as described in the privacy page.
            </label>
            {errors.consentGiven && (
              <p id={`${formId}-consent-error`} role="alert" className="text-caption-sm text-destructive">
                {errors.consentGiven}
              </p>
            )}
            <p className="text-caption-sm text-ink-hint">{DISCOVERY_PRIVACY_NOTICE}</p>

            {status === "error" && errorMessage && (
              <p role="alert" className="text-caption-sm text-destructive">
                {errorMessage}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <Button type="button" variant="ghost" size="sm" onClick={goBack} disabled={stepIndex === 0}>
          Back
        </Button>
        {step.key === "review" ? (
          <Button type="button" size="sm" onClick={() => void handleSubmit()} disabled={status === "submitting"}>
            {status === "submitting" ? "Submitting…" : "Submit enquiry"}
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={goNext}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
