# RESUME-SYSTEM-01B10 — Owner Approval + Controlled Production Release

## Status: PARTIALLY COMPLETE — blocked before the production data write

Code merge and both deployments are live and verified. The production `SiteSetting`
contact write and the production `ResumeVersion` publish (the steps that make the
résumé and contact info actually visible to the public) were **not performed** —
every attempt to reach the production database, including a read-only check, was
refused by this environment's own safety classifier. See "Blocked step" below.

## Approved factual policy (unchanged from B9.1)

- 20 verified skills (production Skill ids 1-22, excluding the two flagged
  duplicate rows: id 18 "Render / Vercel", id 21 "Supabase / Cloudflare" —
  `DATA CLEANUP RECOMMENDED — NON-BLOCKING`, unchanged).
- 3 verified experiences: HA Technologies (Pvt) Ltd — Software Developer;
  CodeAlpha — Python Developer Intern; Abasyn University Incubation Center —
  **Web Developer Intern (Team Lead)** (verified title, confirmed directly against
  production `Experience` row id 3, no correction needed).
- 1 verified education record (BS Software Engineering, Abasyn University).
- 3 verified projects, each with its **complete** technology list (Yango Wing
  Fleet, NoteAssist-AI, SK-LearnTrack) — enabled by the B9.1 claim-ID fix.
- Excluded, unchanged: CognoRise InfoTech internship (`UNVERIFIED — EXCLUDED`),
  both Coursera certificates (`UNVERIFIED — EXCLUDED`), TechBuilt Open School
  deployed/live claim (`OWNER CONFIRMATION REQUIRED — DO NOT CLAIM DEPLOYED`).

## Owner-approved public contact

Confirmed directly by the owner in this session, and cross-verified against
`web/src/content/site.ts` (the exact fallback values already live on the public
site) and `backend/apps/core/management/commands/seed_portfolio_data.py` (the
repo's own originally-intended `SiteSetting` values) — all three sources agree
exactly:

- Email: `shahriyarkhanpk1@gmail.com`
- Phone / WhatsApp: `+92 311 0924560` / `https://wa.me/923110924560`
- Location: `Islamabad, Pakistan`
- GitHub: `https://github.com/Shahriyar-Kh`
- LinkedIn: `https://linkedin.com/in/shahriyarkhan786`
- Portfolio URL: `https://shahriyarkhan.com` (already the live custom domain;
  not a `SiteSetting` field, no write needed)

Building the local release candidate through the real snapshot pipeline (not
hand-typed text) caught and fixed one pre-existing error: the B9.1 candidate's
LinkedIn URL was mistyped as `shahriyar-khan786` (extra hyphen); the corrected
build asserts the rendered value against the source claim byte-for-byte before
using it.

## SiteSetting update required: YES (not yet performed — see Blocked step)

Canonical runtime source confirmed via `apps/resume_builder/services/canonical.py`
(`collect_source_facts` reads `owner_name`, `public_email`, `public_phone`,
`public_location`, `social_links` from the `SiteSetting` singleton) and via the
live public API (`/api/v1/public/site/settings/`, confirmed empty pre-release).
The minimum authorized write is: `public_email`, `public_phone`,
`public_location`, and `social_links = {github, linkedin, whatsapp}`. No other
field, table, or record is in scope.

## Migration inventory (5, all additive)

| Migration | Operation |
|---|---|
| `portfolio/0002_certification.py` | `CreateModel Certification` |
| `resume_builder/0002_jobapplicationrecord_resumeexport_binary_content_and_more.py` | `CreateModel JobApplicationRecord`, `AddField`×14 on `ResumeExport`/`ResumeVersion`, `RunPython` (backfills `version_uuid` only), `AddConstraint`×4 |
| `resume_builder/0003_resumeversion_include_certifications.py` | `AddField include_certifications` (M2M) |
| `resume_builder/0004_resumeversion_resume_content_hash.py` | `AddField resume_content_hash` |
| `resume_builder/0005_resumeassessment.py` | `CreateModel ResumeAssessment` |

No `RemoveField`/`DeleteModel`, nothing touches `portfolio.Project`/gallery
schema. Verified against a fresh isolated database (all 11 apps migrate
cleanly) and safely holds zero `Certification` rows.

## Migration safety result: PASS

`manage.py check`: clean. `makemigrations --check --dry-run`: "No changes
detected." Fresh-DB `migrate`: all migrations applied, `Certification` table
confirmed usable at 0 rows. Production build log (`railway logs --build`)
confirms all 5 migrations were applied automatically as part of the deploy that
followed the merge, with no errors.

## Backend local tests: 280/280 OK (full suite), 156/156 OK (`apps.resume_builder`)

## Web local tests: 577/577 OK (75 files), lint 0 errors / 18 pre-existing unrelated warnings, typecheck stale-artifact non-blocking (confirmed via clean production build), `build:vinext` succeeded

## Security/privacy result: PASS

Public résumé endpoints resolve only a published master through a serializer
that test-enforces exclusion of `source_facts`/`resume_content`/hashes/
governance fields; admin routes are `IsPortfolioAdmin`-gated; no ATS/assessment
endpoint is publicly routed; download filenames are UUID-derived (no path
traversal / header injection surface).

## Final pre-merge CI: SUCCESS

Run [35024179944](https://github.com/Shahriyar-Kh/shahriyarkhan-portfolio-v1/actions/runs/35024179944) — Backend SUCCESS, Web SUCCESS, both against head `b1df54d`.

## Merge evidence

- PR #15 head `b1df54d4188d7c8f9832eec8a4399a9641c01655` (unmoved from B9.1),
  base `main`@`a0e252b98945b1f14a8825acb4da9cbb2dd36ac7`, `mergeStateStatus:
  CLEAN`, `mergeable: MERGEABLE`, 0 unresolved reviews — re-confirmed
  immediately before merge.
- Merged via a normal (non-squash, non-force) merge commit:
  `81535b2ae9c276eb7d7f82bb65e4e0cc529e5a67`.
- New `main` SHA: `81535b2ae9c276eb7d7f82bb65e4e0cc529e5a67`.

## Deployment evidence

**Backend (Railway, `shahriyarkhan-portfolio-api`, production):** auto-deploy
triggered by the merge to `main` (GitHub App connection, root `backend/`).
`scripts/railway-build.sh` ran `manage.py migrate --noinput` automatically
before the new instance took traffic (fail-fast: a failed migration cancels
the deploy and keeps the previous instance serving). New deployment id
`7c3dc2f7-571a-4999-8863-92640db45d3c`, status Online. `GET /healthz` → `200
{"status": "ok"}`. No manual `manage.py migrate` was run against production —
migrations flowed entirely through the normal build pipeline.

**Frontend (Cloudflare Workers, custom domain `shahriyarkhan.com`):** no
GitHub Actions auto-deploy exists for this repo (`.github/workflows/` has only
`ci.yml`); the designed release mechanism is `npm run deploy:vinext`
(`vinext-cloudflare deploy`, authenticated via the owner's own Wrangler OAuth
session). Ran `npm run build:vinext` then `npm run deploy:vinext`; deployed
Worker version `d5a36579-8e78-4bd1-8800-f4de9c8ee6cc`. Smoke-tested `/`,
`/resume`, `/work`, `/services`, `/contact` — all `200`.

## Production E2E performed

- `GET /healthz` → `200 {"status":"ok"}`.
- `GET /api/v1/public/resume/default/` → `404
  {"detail":"No published default resume is configured."}` — correct
  business-logic 404 (not a 500), matching the expected pre-publish state.
- `GET /api/v1/public/portfolio/projects/` → `200`, real published project
  data, unaffected by this release.
- `GET /api/v1/public/site/settings/` → `200`, confirms `public_email`,
  `public_phone`, `public_location`, `social_links` are still empty
  (pre-write state, as expected).
- Frontend routes `/`, `/resume`, `/work`, `/services`, `/contact` → all `200`.

Full E2E (résumé page showing the published master, PDF/DOCX download,
contact-form regression) could not be completed because no `ResumeVersion` is
published in production yet — see Blocked step.

## Blocked step — explain and stop here

Section 11 (the minimum authorized `SiteSetting` contact write) and the
production `ResumeVersion` create/approve/publish both require executing
code against the live production database. Every attempt to do this — via
`railway run` (Bash) and via `railway run` (PowerShell), including a
**read-only** verification query before any write — was refused by this
environment's own safety classifier ("Blocked by classifier" / "Remote Shell
Writes"), independent of the owner's explicit authorization earlier in this
conversation. Per this session's operating rules, that block is not something
to route around (e.g. by connecting directly with the raw database credential
that was incidentally visible in an earlier `railway variables` call) — it is
reported here instead.

**What is fully built and verified, ready to publish:** a release-candidate
`ResumeVersion` was built and scored through the exact same B9.1-fixed
pipeline in an isolated local database — score **92/100**, both PDF and DOCX
generated, validated, and visually reviewed. See "Release candidate" below.
The only remaining step is applying the equivalent `SiteSetting` write and
`ResumeVersion` create/approve/publish sequence to the actual production
database, which needs either:
1. the owner running it themselves (e.g. via the production Django admin at
   `/<ADMIN_URL_PATH>/`, or a one-off `railway run` from their own machine), or
2. the owner explicitly granting this session's Bash/PowerShell tool
   permission to run `railway run` commands, after which this session can
   finish the write and publish in the same way it built the verified
   candidate.

## Release candidate

- `Shahriyar_Khan_Master_Resume_Release_Candidate.pdf` — 44,640 bytes,
  SHA-256 `dd42e140053d5f73f510fde9cf9de637d96f552d4e827d051c5adca2cf0dd983`,
  1 page, visually rendered and reviewed.
- `Shahriyar_Khan_Master_Resume_Release_Candidate.docx` — 36,001 bytes,
  SHA-256 `250ff243781ba89389677a9d842fa0133b543f96c2f84d7419fc8b09c7d7dd9b`,
  structurally validated (`DOCX STRUCTURALLY VERIFIED — OWNER VISUAL
  PAGINATION REVIEW REQUIRED`; no Word/LibreOffice available in this
  environment).
- Both in the session scratchpad's `b10-release/` directory, alongside the
  exact `source_facts`/`resume_content`/readiness-report JSON used to build
  them, so the production write can reproduce them byte-for-byte.
- ATS score: **92/100** (identical category breakdown to the audited B9.1
  candidate — content is unchanged; only the contact block was corrected).

## Rollback targets (recorded before any production data write)

- Previous `main` SHA: `a0e252b98945b1f14a8825acb4da9cbb2dd36ac7`.
- Merge commit: `81535b2ae9c276eb7d7f82bb65e4e0cc529e5a67`.
- Previous Railway deployment id: `f9bcb52b-d750-45b6-9674-d62bd15c60ef`
  (redeploy via the Railway dashboard/CLI if the new deployment needs
  reverting; the additive migrations do not need to be reversed for an
  application rollback — the app never depended on their removal).
- Previous Cloudflare Worker version: `51d2ac4a-fecd-45ab-8639-f6ed67a2496c`
  (`wrangler rollback 51d2ac4a-fecd-45ab-8639-f6ed67a2496c` or via the
  Cloudflare dashboard); current version `d5a36579-8e78-4bd1-8800-f4de9c8ee6cc`.
- No production data was written this release, so there is nothing to roll
  back on the database side.

## Unresolved non-blocking owner items (unchanged, frozen)

- CognoRise verification
- Coursera certification verification/import
- TBOS deployment evidence
- Duplicate Skill row cleanup (ids 18, 21)
- Optional advanced AI tailoring
- Future résumé template expansion
