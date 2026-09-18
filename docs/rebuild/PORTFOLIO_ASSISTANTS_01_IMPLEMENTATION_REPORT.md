# PORTFOLIO-ASSISTANTS-01 — Implementation Report

## Scope delivered

- Grounded Visitor Portfolio Assistant: `POST /api/v1/public/assistant/query/`,
  a deterministic keyword/domain-grounded fallback provider, an optional
  Gemini provider with hard output validation, an anonymous daily quota,
  bounded browser-supplied recent visitor context for short follow-ups,
  and a globally-mounted chat UI with source links, recommendations, and
  Contact/Start-a-project handoffs. No chat transcript is persisted.
- Client Project Discovery: `POST /api/v1/public/inquiries/project-discovery/`,
  reusing the existing `ServiceRequest` model/pipeline via additive fields,
  plus a stateless AI-assisted draft-analysis endpoint. Draft suggestions are
  reviewable only; the final persisted summary is always deterministic from
  visitor-approved structured fields. The six-step wizard includes
  review/consent/success/retry states.

See `PORTFOLIO_ASSISTANTS_01_ARCHITECTURE.md` and
`PORTFOLIO_ASSISTANTS_01_SECURITY_AND_GROUNDING.md` for the design and
safety detail this report doesn't repeat.

## What was explicitly NOT built (matches the task's non-goals)

CRM pipeline, tasks/reminders dashboard, Content Studio, advanced
analytics, Gallery Stage 2, advanced AI résumé tailoring, visitor account
registration, vector database infrastructure, arbitrary web browsing by
the assistant, autonomous tool execution by the LLM, and no production
deployment was performed in this phase.

## Regression results

- Backend and frontend full suites are required by `.github/workflows/ci.yml`
  on the PR head, together with Django system/migration checks, TypeScript
  typecheck, ESLint, frontend tests, and a production build. The PR must not
  merge unless the final head's CI run is green.
- `manage.py check`: clean. `makemigrations --check --dry-run`: "No
  changes detected." `migrate --plan` (already-migrated dev DB): "No
  planned migration operations." Fresh isolated-database migration test:
  all 33 migrations across 11 apps applied cleanly, `AssistantUsageBucket`/
  `ServiceRequest` both usable at 0 rows.
- `npm run typecheck`, `npm run lint`, the complete frontend test suite,
  and `npm run build` are CI gates. Existing unrelated `<img>` warnings
  remain warnings rather than errors.
- `npm audit --audit-level=high`: 4 pre-existing high-severity findings in
  `sharp`/`miniflare`/`wrangler`/`@cloudflare/vite-plugin` (build tooling,
  not shipped to the browser) - **not introduced by this phase**; `git
  diff --stat` on `package.json`/`package-lock.json` confirms this phase
  added zero frontend dependencies. Backend: zero new Python packages
  added (`requirements/` untouched) - the Gemini client uses only the
  standard library's `urllib`.
- `git diff --check`: clean (only harmless CRLF-conversion warnings).
- Secret scan of the full staged diff: no matches.

## Manual QA status

The owner exercised the assistant locally with real client-style ecommerce,
LMS/academy, salon, SaaS, and existing-project questions, including a live
Gemini smoke test and deterministic fallback behavior. Those tests exposed
and drove fixes for third-person voice, client-intent routing, prompt-size
timeouts, weak evidence matches, and short follow-up context.

Exact screenshot-based pixel QA at 390px/768px/1440px has still not been
captured by an automated browser in this implementation environment, so it
is not claimed here. Component tests cover dialog semantics, focus/Escape
behavior, launcher availability, links, handoffs, and the bounded-context
request shape.

**To perform it:** from `web/`, run `npm run dev` (or `npm run build:vinext
&& npm run start:vinext`), open any page, and:
1. Click the "Ask about Shahriyar" launcher (bottom-right) at 390px,
   768px, and 1440px widths - check the dialog fits without horizontal
   overflow or a scroll trap, both tabs ("Ask about Shahriyar" / "Start a
   project") render, and Tab/Escape work as expected.
2. Ask a starter question and confirm the answer, its source link(s), and
   any recommendation/handoff button render correctly.
3. Switch to "Start a project" and step through all six stages, including
   the review screen and a submission (safe to submit - it is a real
   `ServiceRequest` row against your local dev database, not production).

## Known limitations

- The deterministic provider's intent classification and evidence
  ranking are keyword/token-overlap based, not semantic - a question
  phrased very differently from the portfolio's own wording may land on
  `INSUFFICIENT_EVIDENCE` even when a human would recognize the topic.
  This is an accepted MVP trade-off (section 9's no-vector-database
  decision); Gemini (when enabled) handles paraphrased questions far
  better and always falls back to the same safe deterministic behavior.
- Gemini was exercised locally with a real configured key/model and returned
  valid JSON on the minimal smoke test. The full grounded assistant also
  returned successful Gemini answers, while intermittent timeout behavior
  was observed and safely fell back to the deterministic provider. No Gemini
  credential is committed to the repository; production provider enablement
  remains an environment/deployment decision.
- Exact screenshot-based responsive QA (above).
- The Google Sheets operational mirror remains backward-compatible with the
  existing generic row schema; rich Project Discovery fields are preserved
  in the database and canonical summary/message, but are not yet split into
  dedicated Sheets columns. That enhancement is deferred rather than hidden
  inside this merge.

## Production status

**Unchanged.** No deploy, no migration, and no data write was performed
against Railway or Cloudflare in this phase - `git log` on `main` still
ends at the B10 release report commit; this branch has not been merged.
