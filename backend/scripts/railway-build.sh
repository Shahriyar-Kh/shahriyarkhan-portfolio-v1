#!/usr/bin/env bash
# Railway build script.
#
# `set -Eeuo pipefail` makes the whole script fail-fast: any failing
# command (including one inside a pipeline) stops execution immediately
# with a non-zero exit code, which Railway treats as a failed build -
# the deploy is cancelled and the previously-running instance keeps
# serving traffic. This specifically guards against migrations running
# but a later step masking their failure, and against collectstatic
# ever running against a half-migrated database.
#
# Deliberately no `set -x`: that would echo every expanded command,
# including any that embed environment-derived values, to the build log.
set -Eeuo pipefail

# Railway's build root is this service's configured root directory
# (backend/) - every path below is relative to that, not the monorepo
# root.

echo "==> Upgrading packaging tools"
pip install --upgrade pip setuptools wheel

echo "==> Installing production requirements"
pip install -r requirements/prod.txt

echo "==> Django system check (production settings)"
python manage.py check --settings=config.settings.production

echo "==> Applying migrations"
python manage.py migrate --noinput --settings=config.settings.production

echo "==> Verifying no unapplied migrations remain"
python manage.py migrate --check --settings=config.settings.production

echo "==> Synchronizing canonical public portfolio data"
python manage.py sync_canonical_profile_2026 --settings=config.settings.production

echo "==> Collecting static files"
python manage.py collectstatic --noinput --clear --settings=config.settings.production

echo "==> Build complete"
