# Shahriyar Khan — Portfolio V1

The production release of Shahriyar Khan's personal portfolio: a Next.js
frontend backed by a Django/DRF API, showing real projects, services,
skills, and experience — no placeholder or fabricated content anywhere.

This repository is a clean release export. It contains only what the
production application needs to build, test, and run; it carries no
git history, design-exploration artifacts, or internal development
documentation from the project it was exported from. See
[`PROVENANCE.md`](PROVENANCE.md) for exactly what that means and where
this code came from.

## Structure

```
web/       Next.js 16 (App Router) frontend
backend/   Django/DRF API
```

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, React 19, TypeScript, Tailwind CSS v4) |
| Frontend hosting | Cloudflare Workers |
| Backend | Django 5 / Django REST Framework |
| Backend hosting | Railway |
| Database | Neon (managed PostgreSQL) |
| Motion | GSAP + ScrollTrigger, fully reduced-motion-safe |

## Local development

### Frontend (`web/`)

```bash
cd web
nvm use               # Node 22.22.2 - see web/README.md
npm ci
cp .env.example .env.local
npm run dev
```

### Backend (`backend/`)

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate   # or `source .venv/bin/activate` on macOS/Linux
pip install -r requirements/dev.txt
python manage.py migrate
python manage.py runserver
```

Each app has its own `README.md` (`web/README.md`, `backend/README.md`)
with the full command reference, environment variable list, and test
instructions.

## Quality gates

Both apps are covered by an automated test suite and a dedicated CI
workflow (`.github/workflows/ci.yml`) that runs on every pull request
and push to `main`:

- **Frontend**: typecheck, lint, unit/component tests, production build,
  dependency audit.
- **Backend**: Django system check, migration consistency check, full
  test suite.

The frontend additionally ships live-server verification scripts
(`web/scripts/`) used during release to confirm real API data renders
correctly, no fallback/unavailable states leak into production, and the
responsive header behaves correctly across device widths.

## Content integrity

Every project, service, skill, and experience entry shown on the site
is served live from the backend API — nothing is hardcoded in the
frontend. No price, delivery timeline, guarantee, testimonial, or
fabricated metric appears anywhere in the UI.

## License

Private. All rights reserved.
