from .base import *
from django.core.exceptions import ImproperlyConfigured

DEBUG = False

if not SECRET_KEY or SECRET_KEY == "dev-secret-key-change-me":
	raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set to a strong secret in production.")

if not ALLOWED_HOSTS:
	raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must include your production domain(s).")

if any(host in {"*", "127.0.0.1", "localhost"} for host in ALLOWED_HOSTS):
	raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS cannot contain wildcard or localhost entries in production.")

# Fail fast at boot instead of letting every request that touches the
# database 500 silently. Without DATABASE_URL (or at least POSTGRES_HOST),
# `DATABASES["default"]` falls back to base.py's localhost/postgres
# defaults, which cannot work on a deployed server and previously caused
# every DB-backed endpoint to return a generic 500 while healthz/robots.txt
# kept returning 200 (see docs/rebuild/P01A_STABILIZATION_REPORT.md).
if not env_bool("USE_SQLITE", False) and not os.getenv("DATABASE_URL") and not os.getenv("POSTGRES_HOST"):
	raise ImproperlyConfigured(
		"DATABASE_URL or POSTGRES_HOST must be set in production; refusing to fall back to a local database."
	)

SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", True)
SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", True)

# WhiteNoise for static file serving in production
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")
WHITENOISE_USE_FINDERS = True
WHITENOISE_MANIFEST_STRICT = False
STATICFILES_STORAGE = "whitenoise.storage.CompressedStaticFilesStorage"
STORAGES["staticfiles"] = {
	"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
}
