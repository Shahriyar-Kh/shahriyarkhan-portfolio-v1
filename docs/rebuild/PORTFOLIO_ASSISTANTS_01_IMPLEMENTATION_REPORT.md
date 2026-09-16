# PORTFOLIO-ASSISTANTS-01 — Implementation Report

## Scope delivered

- Grounded Visitor Portfolio Assistant: `POST /api/v1/public/assistant/query/`,
  a deterministic keyword-grounded fallback provider, an optional Gemini
  provider with hard output validation, an anonymous daily quota, and a
  globally-mounted chat UI with source links, recommendations, and
  Contact/Start-a-project handoffs.
- Client Project Discovery: `POST /api/v1/public/inquiries/project-discovery/`,
  reusing the existing `ServiceRequest` model/pipeline via additive fields,
  a deterministic-by-default structured summary generator, and a
  six-step guided wizard UI with review/consent/success/retry states.

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

- Backend: `manage.py test` - **334/334 pass** (280 pre-existing + 54 new).
- Frontend: `npx vitest run` - **599/599 pass** (577 pre-existing + 22 new).
- `manage.py check`: clean. `makemigrations --check --dry-run`: "No
  changes detected." `migrate --plan` (already-migrated dev DB): "No
  planned migration operations." Fresh isolated-database migration test:
  all 33 migrations across 11 apps applied cleanly, `AssistantUsageBucket`/
  `ServiceRequest` both usable at 0 rows.
- `npx tsc --noEmit`: clean (the one remaining error is the pre-existing,
  unrelated stale `.next/types/validator.ts` generated-file artifact,
  confirmed non-blocking by a clean production build - see the B9.1/B10
  reports for the same finding).
- `npm run lint`: 0 errors, 18 pre-existing unrelated `<img>` warnings.
- `npm run build:vinext`: succeeded.
- `npm audit --audit-level=high`: 4 pre-existing high-severity findings in
  `sharp`/`miniflare`/`wrangler`/`@cloudflare/vite-plugin` (build tooling,
  not shipped to the browser) - **not introduced by this phase**; `git
  diff --stat` on `package.json`/`package-lock.json` confirms this phase
  added zero frontend dependencies. Backend: zero new Python packages
  added (`requirements/` untouched) - the Gemini client uses only the
  standard library's `urllib`.
- `git diff --check`: clean (only harmless CRLF-conversion warnings).
- Secret scan of the full staged diff: no matches.

## Visual QA: NOT PERFORMED - no browser automation tooling available

This environment has no Playwright/Puppeteer/browser-screenshot tool
registered. `npx tsc --noEmit`, `npm run lint`, the full Vitest suite
(which does assert `role="dialog"`, `aria-modal`, focus placement,
keyboard Escape handling, and accessible labels), and `npm run
build:vinext` all passed, but no actual pixel-level rendering at
390px/768px/1440px was captured, and no screenshot exists. This is stated
explicitly per instruction, rather than claiming visual QA that didn't
happen.

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
- `GEMINI_API_KEY` is unset in every environment touched during this
  phase (local dev, CI, production) - `AI_PROVIDER` defaults to
  `"deterministic"` everywhere, so the Gemini code path is covered only
  by mocked-response tests, never a live call. This is intentional (no
  production deployment or live credential was in scope) but means the
  real Gemini integration's first live exercise will be whenever an
  operator sets `AI_PROVIDER=gemini` and a real key.
- Visual QA (above).

## Production status

**Unchanged.** No deploy, no migration, and no data write was performed
against Railway or Cloudflare in this phase - `git log` on `main` still
ends at the B10 release report commit; this branch has not been merged.
