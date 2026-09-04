# Provenance

This repository is a **clean release export**, not a fork or clone of an
existing repository. It carries no imported git history.

## Source

Exported from commit `5efae55735c60259bfa2c6cd1a0ce1dc3b5c11d5` on branch
`feat/final-portfolio-v2-content-parity` of the original portfolio
development repository, via an allowlist export (`git archive` of that
exact commit, followed by explicit removal of everything outside the
production application's scope).

That source commit represents "Portfolio V1" - the outcome of a
multi-round design and reliability effort (visual system redesign,
content-parity restoration against the live API, real service imagery,
a responsive-header correction, and Render/ISR reliability hardening)
that the site owner reviewed and approved locally before this release
export was created.

## What was excluded, and why

- **The legacy Vite frontend** (`frontend/` in the source repository) -
  superseded by the Next.js app in `web/`, not part of this release.
- **Internal development documentation** (`docs/rebuild/` in the source
  repository - dozens of incremental audit/design-round reports) - a
  process history for the source repository's own development, not
  something a production release needs to carry forward. This file and
  each app's own `README.md` are this repository's documentation
  instead.
- **Stale root-level docs** (old `DEPLOYMENT_ENV.md`,
  `DEPLOYMENT_FIX_GUIDE.md`, `PROJECT_DOCUMENTATION.md`, `readmi.md`) -
  described an earlier, different technology stack (TanStack Start,
  Supabase) and predate the current Next.js/Django/Vercel-era
  architecture entirely.
- **Render-specific deployment configuration** (`render.yaml`,
  root `requirements.txt`, `scripts/render-build.sh`) - this release
  targets Railway instead; see `backend/README.md` for its production
  configuration.
- **`backend/check_skills.py`, `backend/create_test_data.py`** - local
  developer debug/seed scripts. `create_test_data.py` specifically
  created a fabricated demo project record; this release ships no
  fabricated data anywhere.
- **`backend/reset_superuser.py`** - contained a hardcoded plaintext
  admin username and password. Excluded entirely; never present in this
  repository's history.
- **Two tracked images for the "InsightBoard CRM" project**
  (`backend/media/projects/{featured,previews}/insightboard-*`) - that
  project is an unresolved draft (`status=draft`), excluded from every
  public API endpoint and the sitemap in the source repository, seeded
  with stock placeholder images rather than real screenshots. Not
  published data; excluded from this release's source and its data seed
  alike.

## What this means for reviewers

Every file in this repository was either exported unmodified from the
approved source commit, or is new scaffolding written specifically for
this clean release (this file, the root `README.md`, `.gitignore`,
`.github/workflows/ci.yml`, and each app's deployment configuration).
Nothing here was rewritten from the approved application code itself -
the frontend and backend application logic in `web/` and `backend/`
match the reviewed and approved source exactly, aside from the
production-configuration additions described in each app's own README.
