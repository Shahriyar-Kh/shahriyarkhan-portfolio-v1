#!/usr/bin/env bash
# Railway start command. Runs after a successful railway-build.sh.
set -Eeuo pipefail

exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${WEB_CONCURRENCY:-2}" \
  --timeout "${GUNICORN_TIMEOUT:-30}" \
  --log-file -
