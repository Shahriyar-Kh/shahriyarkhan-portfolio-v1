# RESUME-SYSTEM-01B10 — Owner Approval + Controlled Production Release

## Status: COMPLETE — RESUME PLATFORM V1 PRODUCTION VERIFIED

Code merge, both deployments, the production contact write, and the résumé
publish are all live and verified. Initial attempts to reach the production
database (even a read-only check) were refused by this environment's own
safety classifier; the owner granted explicit tool permission, after which
the read/write/publish sequence completed successfully. See "Production
account note" below for one follow-up action the owner should take.

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

## SiteSetting update required: YES — performed

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

## Production E2E performed (post-publish)

- `GET /healthz` → `200 {"status":"ok"}`.
- `GET /api/v1/public/resume/default/` → `200`, full published master
  document, verified to contain no CognoRise / Coursera / TBOS text and the
  correct owner-confirmed contact block.
- `GET /api/v1/public/resume/default/download/pdf/` → `200`,
  `Content-Type: application/pdf`, `Content-Disposition: attachment;
  filename="resume-<uuid>.pdf"`, `ETag` matches the exact SHA-256 recorded at
  publish time, `Content-Length: 44640`.
- `GET /api/v1/public/resume/default/download/docx/` → `200`, correct
  DOCX content type, `ETag` matches, `Content-Length: 36000`.
- `GET /api/v1/public/resume/this-slug-does-not-exist/` → `404
  {"detail":"No ResumeVersion matches the given query."}` — no 500.
- `GET /api/v1/admin/resume/versions/` (unauthenticated) → `403` — ATS/
  governance data confirmed inaccessible without admin auth.
- `GET /api/v1/public/portfolio/projects/` → `200`, unaffected by this
  release.
- `GET /api/v1/public/site/settings/` → `200`, confirms the four contact
  fields now hold exactly the owner-confirmed values, nothing else changed.
- Frontend: `/`, `/resume`, `/about`, `/skills`, `/experience`, `/work`,
  `/services`, `/contact` → all `200`; `/resume` HTML confirmed to render
  "Shahriyar Khan", the correct email, and "Yango Wing Fleet", with no
  CognoRise/Coursera text present.
- `OPTIONS /api/v1/public/inquiries/contact/` → `200` (contact-form endpoint
  unaffected; no test submission was made to avoid writing a real inquiry
  record).

## Production account note

Publishing a résumé requires an authenticated owner/admin actor (the app's
own `is_portfolio_admin_user(actor, require_owner_role=True)` gate on export
generation) — and production had **zero user accounts** before this release.
Creating one wasn't in the B10 task's original write scope, so this was
paused and put to the owner directly; the owner asked for a superuser to be
created. One was created (`username: shahriyar_owner`) with a freshly
generated random password, printed once to this session's own command
output and nowhere else. **The owner should log in via the production Django
admin and rotate that password immediately**, and may also disable/replace
this account with their preferred personal one.

## Release candidate

- Local pre-flight build (isolated DB, identical content/logic to
  production): `Shahriyar_Khan_Master_Resume_Release_Candidate.pdf` (44,640
  bytes, SHA-256 `dd42e140053d5f73f510fde9cf9de637d96f552d4e827d051c5adca2cf0dd983`,
  1 page, visually rendered and reviewed) and
  `Shahriyar_Khan_Master_Resume_Release_Candidate.docx` (36,001 bytes, SHA-256
  `250ff243781ba89389677a9d842fa0133b543f96c2f84d7419fc8b09c7d7dd9b`,
  `DOCX STRUCTURALLY VERIFIED — OWNER VISUAL PAGINATION REVIEW REQUIRED`; no
  Word/LibreOffice available in this environment). Both kept in the session
  scratchpad's `b10-release/` directory.
- **Production-published artifacts** (same content, generated fresh in
  production so file metadata/timestamps differ from the local pre-flight
  build): PDF SHA-256 `1a37f338bc683e529b9729624d99037d466d2edc6c65cf64de78841096e37d82`
  (44,640 bytes), DOCX SHA-256 `818b18ef2afdbb50cf7f6502ea9afdd0dc90f2b88ad88c2da518e62f86cc6653`
  (36,000 bytes) — both confirmed live via their public download endpoints
  (`ETag` matches these hashes exactly).
- ATS score: **92/100** in both the local pre-flight build and the actual
  production `ResumeAssessment`-equivalent score, identical category
  breakdown to the audited B9.1 candidate — content is unchanged; only the
  contact block was corrected and completed.

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
