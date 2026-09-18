# PORTFOLIO-ASSISTANTS-01 — Architecture

## Pipeline

```
public portfolio data (Django models, published-only)
        |
apps/assistant/services/public_knowledge.py  (build_evidence_bundle)
        |
verified evidence bundle (EvidenceItem list: source_id, title, facts, public_path)
        |
apps/assistant/services/assistant.py  (answer_query - orchestrator)
        |
AI provider: GeminiAssistantProvider, else DeterministicFallbackProvider
        |
apps/assistant/services/schema.py  (validate_structured_response - hard gate)
        |
apps/assistant/api/views.py  (PublicAssistantQueryView)
        |
visitor response (answer, intent, sources, recommendations, handoff)
```

The AI is never the source of truth. Every fact it can reference comes from
`build_evidence_bundle()`, which queries only the same published-only
querysets the existing public portfolio API already uses
(`apps.portfolio.api.views`, `apps.site_config.api.views`). Nothing in
`apps/assistant` imports `apps.inquiries`, `apps.resume_builder`, or
`apps.accounts` - private, governance, and ATS data are structurally
unreachable, not just policy-excluded.

Every Gemini candidate answer passes through
`validate_structured_response()` before it can leave the provider. A `source_id` that doesn't exist in the evidence bundle, a
`recommended_project_slugs`/`recommended_service_slugs` value that isn't a
real published slug, an unknown `intent`, an overlong answer, or a URL
outside the public domain allowlist is rejected outright - not repaired,
not partially trusted. A rejected Gemini response falls back to
`DeterministicFallbackProvider`, which does not consume external model
text and constructs a typed answer only from matched published evidence;
regression tests assert its outputs satisfy the same schema contract.

## Why no vector database (section 9)

The published dataset is small and fully structured: projects,
experiences, skills, services, education, and public profile fields.
`build_evidence_bundle()` queries only published data, then
`_select_prompt_evidence()` sends a compact relevance-first subset to
Gemini for each question. A plain token/domain-overlap ranker
(`_rank_evidence` in `services/providers.py`) keeps provider latency and
prompt size bounded without introducing embeddings infrastructure. Adding
Pinecone/Weaviate/Qdrant/pgvector or an embeddings pipeline would add
infrastructure, an embedding-generation step to keep in sync with every
portfolio edit, and an external dependency - for no retrieval-quality
benefit at this data size. This decision should be revisited only if the
published dataset grows by roughly an order of magnitude (e.g., dozens of
detailed case studies) or multi-lingual/semantic retrieval becomes a real
requirement neither of which is true today.

## Why ServiceRequest is reused for Project Discovery (section 13)

`apps.inquiries.models.ServiceRequest` already had the identity/contact/
service/budget/timeline shape a project enquiry needs, plus a mature,
already-tested pipeline: collision-safe `reference_id` generation
(`EnquiryTrackingFields`), submission-id idempotency
(`IdempotentPublicCreateMixin`), honeypot handling, and the persist-then-
notify contract (`services/delivery.py`) that guarantees a notification
failure never undoes a saved enquiry. Building a second, parallel model
and pipeline for a structurally identical business object (a client wants
work done) would duplicate all of that, doubling the surface area to keep
correct. Instead, `apps/inquiries/migrations/0003_*` adds structured,
purely additive fields (`organization`, `project_type`,
`business_problem`, `required_features`, ... - all `blank=True`/
`default=...`, so every pre-existing `ServiceRequest` row is unaffected)
and a `source` field (`contact_form` default, `project_discovery`,
`assistant`) that distinguishes the guided-wizard submissions from the
Contact page's own free-form project path without needing a second table.

`subject`/`message` (the model's original required fields) are not
hand-typed for a discovery submission - `ProjectDiscoverySerializer`
derives them from the structured fields via
`apps.inquiries.services.discovery_summary.build_summary()`, so the
existing required-field shape needed no changes at all.

## Provider abstraction (section 6)

`apps/assistant/services/providers.py` defines `AssistantProvider` with
one method, `generate_grounded_answer()`. Two implementations:

- `DeterministicFallbackProvider` - pure Python keyword classification and
  evidence-overlap ranking, zero network calls, cannot fail, cannot
  hallucinate (every fact in its answer is copied verbatim from a matched
  evidence item). This is the provider whenever `AI_PROVIDER` is not
  `"gemini"`, and the guaranteed fallback whenever Gemini is.
- `GeminiAssistantProvider` - calls the Gemini REST API directly via
  `urllib` (see `services/gemini_client.py`; no `google-generativeai` SDK
  dependency was added - a second heavy Google client library for one
  JSON-in/JSON-out endpoint would be infrastructure added for its own
  sake, the same principle as section 9's vector-database decision),
  requests a strict JSON response, and immediately runs it through
  `validate_structured_response()`. Any failure - missing/invalid API
  key, timeout, non-200 response, malformed JSON, or a response that
  fails grounding validation - raises `GeminiUnavailableError`, caught by
  `services/assistant.py`'s orchestrator, which then calls
  `DeterministicFallbackProvider` for that same request. The portfolio
  visitor never sees an error state caused by Gemini being unavailable -
  only a `fallback_used: true` flag in the response, used for
  observability, never surfaced as an error in the UI.

Configuration (`config/settings/base.py`): `AI_PROVIDER` (default
`"deterministic"`), `GEMINI_API_KEY`, `GEMINI_MODEL` (default
`gemini-2.0-flash`), `ASSISTANT_PROVIDER_TIMEOUT_SECONDS`,
`ASSISTANT_DAILY_LIMIT`, `ASSISTANT_MAX_MESSAGE_LENGTH`. All are plain
`os.getenv()` reads following the exact convention already used for
`GOOGLE_SHEETS_*`/`EMAIL_*` elsewhere in this settings module.
`GEMINI_API_KEY` is a server-only Django setting - the frontend has no
`NEXT_PUBLIC_GEMINI_*` variable and never calls Gemini directly.

## Usage limiting (section 10)

`apps/assistant/models.py::AssistantUsageBucket` is a daily counter keyed
by `anonymous_key_hash` (an HMAC-SHA256 of a per-request client-identity
string, keyed by `settings.SECRET_KEY`) and `bucket_date`. No raw IP
address, user agent, or other directly-identifying value is ever stored -
see `services/usage.py`. The identity derivation reuses the same trusted-
proxy-hop convention as the existing `ContactFormThrottle`
(`ClientIPThrottleMixin` in `apps.inquiries.api.views`, duplicated rather
than imported to keep the two apps' view modules independent). This is a
second, independent layer beneath the ordinary DRF `assistant_query`
scoped-rate throttle (default `20/hour`, per-request, not persisted) -
`AssistantUsageBucket` adds a persisted daily cap (default 40/day) that
survives process restarts and multiple throttle windows.

No visitor conversation content - neither submitted messages nor generated
answers - is persisted by the assistant backend. The browser may include up
to four recent visitor-written messages with a request so short follow-ups
can resolve references such as "this" or "similar system"; that bounded
context exists only for the request and is never written to
`AssistantUsageBucket` or another assistant table.

## Public knowledge boundary (sections 3-4)

`apps/assistant/services/public_knowledge.py` is the *only* place in this
app that queries portfolio/site-config models, and it does so with the
same `status="published"` / `published=True` filters the existing public
API views already use - see that module's own docstring for the full
allowed/excluded list. CognoRise and the two unverified Coursera
certificates are excluded the same way they always have been in this
codebase: CognoRise was never entered as a published Experience row, and
Certification has zero rows in production, so the published-only filters
never surface them - no special-casing exists or is needed. TechBuilt Open
School's Project row *is* published (it's a real, publicly-shown project
on `/work`); its already-live description text is surfaced like any other
project's, with no additional deployment claim added by this app.

Every `EvidenceItem.source_id` is a stable, human-legible string
(`project:<slug>`, `experience:<pk>`, `skill:<pk>`, `service:<slug>`,
`education:<pk>`, `profile:owner`) - never a raw internal identifier
exposed for its own sake, and the frontend never needs to know the
difference between a slug-based and a pk-based one.
