# backend — Django/DRF API

The production API for Shahriyar Khan's portfolio. Deployed to Railway,
backed by Neon (managed PostgreSQL). See the root
[`README.md`](../README.md) for the overall architecture and
[`PROVENANCE.md`](../PROVENANCE.md) for this repository's release
history.

## Local development

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate       # or `source .venv/bin/activate` on macOS/Linux
pip install -r requirements/dev.txt
cp .env.example .env         # defaults to USE_SQLITE=true - no Postgres needed locally
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The API is then available at `http://localhost:8000/api/v1/public/portfolio/`
(and `/admin/` for the Django admin).

## Settings modules

| Module | Used for |
|---|---|
| `config.settings.development` | Local development (`manage.py`'s default) |
| `config.settings.production` | Deployed environments - fails fast at boot if `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, or a real database aren't configured; never falls back to a local/SQLite database |

## Environment variables

See [`.env.example`](.env.example) for the full local-development list.
In production (Railway), the required set is:

| Variable | Purpose |
|---|---|
| `DJANGO_SETTINGS_MODULE` | `config.settings.production` |
| `DJANGO_SECRET_KEY` | A strong, unique secret - generate one, never reuse a development value |
| `DJANGO_DEBUG` | `false` |
| `DJANGO_ALLOWED_HOSTS` | The Railway-issued API domain (no `localhost`/wildcard) |
| `DATABASE_URL` | The Neon pooled connection string (`sslmode=require`) |
| `CORS_ALLOWED_ORIGINS` | The Cloudflare Workers frontend origin |
| `CSRF_TRUSTED_ORIGINS` | The Cloudflare Workers frontend origin |
| `PUBLIC_BASE_URL` | The Railway-issued API domain, `https://` |
| `PUBLIC_SITE_URL` | The Cloudflare Workers frontend origin |
| `CLOUDINARY_URL` (or the three `CLOUDINARY_*` vars) | Media storage - required for any new uploads in production |

Email delivery variables (`EMAIL_HOST*`, `DEFAULT_FROM_EMAIL`,
`ADMIN_NOTIFICATION_EMAIL`, or the `GMAIL_API_*` set) are optional -
without them, contact/service-request submissions still save correctly,
just without an outbound notification email.

## Commands

| Command | Purpose |
|---|---|
| `python manage.py runserver` | Local dev server |
| `python manage.py migrate` | Apply database migrations |
| `python manage.py makemigrations --check --dry-run` | Migration consistency check (used by CI) |
| `python manage.py check` | Django system check |
| `python manage.py check --deploy` | Django's built-in production-readiness check |
| `python manage.py test apps.portfolio apps.site_config apps.resume_builder apps.core apps.inquiries` | Full test suite (matches CI) |
| `python manage.py seed_public_data` | Idempotent sanitized public-data import - see below |

## Health check

`GET /healthz` returns `200` with no database dependency - used by
Railway's health check and any uptime monitoring.

## Sanitized public-data seed

`python manage.py seed_public_data` imports the real, currently-public
data set directly from the live API (`--source`, defaults to
`https://shahriyarkhan.onrender.com`) - published projects, services,
skills, experience, and education. It never includes contact inquiries,
admin users, or any unpublished record: the source's own public
endpoints already filter those out server-side, so there is nothing
private for this command to ever see or import. Safe to run repeatedly
(idempotent - matches existing rows by their real natural key: `slug`
for projects/services, `(company_name, role_title, start_date)` for
experience, `(institution, degree, start_date)` for education,
`(name, category)` for skills - never duplicates).

Pass `--skip-images` to skip downloading project preview/featured
images - the homepage's own hero imagery (Project Proof Timeline,
Services) is committed as local frontend static assets and never
depends on this field; only the `/work` grid's card thumbnails read it,
and degrade gracefully to a typographic fallback when it's empty.
