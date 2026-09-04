import os
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from dotenv import load_dotenv


def env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

CLOUDINARY_URL = os.getenv("CLOUDINARY_URL", "").strip()
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "").strip()
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "").strip()

if CLOUDINARY_URL and (not CLOUDINARY_CLOUD_NAME or not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET):
    parsed_cloudinary_url = urlparse(CLOUDINARY_URL)
    if parsed_cloudinary_url.scheme == "cloudinary":
        CLOUDINARY_API_KEY = CLOUDINARY_API_KEY or unquote(parsed_cloudinary_url.username or "")
        CLOUDINARY_API_SECRET = CLOUDINARY_API_SECRET or unquote(parsed_cloudinary_url.password or "")
        CLOUDINARY_CLOUD_NAME = CLOUDINARY_CLOUD_NAME or (parsed_cloudinary_url.hostname or "")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-secret-key-change-me")
DEBUG = env_bool("DJANGO_DEBUG", False)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost")

PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")
# The public-facing site's canonical origin (the frontend), distinct from
# PUBLIC_BASE_URL (this backend's own origin). Used to build sitemap <loc>
# entries and the robots.txt Sitemap: pointer so both reference the domain
# search engines actually crawl. Temporary canonical per P01A stabilization:
# see docs/rebuild/OPEN_DECISIONS.md.
PUBLIC_SITE_URL = os.getenv("PUBLIC_SITE_URL", "https://shahriyarkhan.vercel.app")
ADMIN_URL_PATH = os.getenv("ADMIN_URL_PATH", "super-admin").strip("/")
ADMIN_ALLOWED_USERNAMES = set(env_list("ADMIN_ALLOWED_USERNAMES", ""))
ADMIN_ALLOWED_EMAILS = set(env_list("ADMIN_ALLOWED_EMAILS", ""))
ADMIN_ALLOWED_ROLES = set(env_list("ADMIN_ALLOWED_ROLES", "owner,admin"))
ADMIN_REQUIRE_OWNER_FOR_ADMIN_SITE = env_bool("ADMIN_REQUIRE_OWNER_FOR_ADMIN_SITE", True)
ADMIN_REQUIRE_OWNER_FOR_ADMIN_API = env_bool("ADMIN_REQUIRE_OWNER_FOR_ADMIN_API", True)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "django_filters",
    "apps.core",
    "apps.accounts",
    "apps.portfolio",
    "apps.inquiries",
    "apps.resume_builder",
    "apps.analytics_app",
    "apps.seo",
    "apps.site_config",
]

USE_CLOUDINARY = env_bool("USE_CLOUDINARY", False) or bool(
    CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET
)

if USE_CLOUDINARY:
    INSTALLED_APPS += ["cloudinary_storage", "cloudinary"]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.accounts.middleware.AdminAccessControlMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


def build_database_from_url(url: str) -> dict:
    parsed = urlparse(url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise ValueError("DATABASE_URL must use postgres:// or postgresql://")

    query = parse_qs(parsed.query)
    sslmode = query.get("sslmode", [os.getenv("POSTGRES_SSLMODE", "prefer")])[0]

    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": parsed.path.lstrip("/") or "postgres",
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "localhost",
        "PORT": str(parsed.port or "5432"),
        "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "60")),
        "OPTIONS": {
            "sslmode": sslmode,
        },
    }

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "portfolio_db"),
        "USER": os.getenv("POSTGRES_USER", "postgres"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "postgres"),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "60")),
        "OPTIONS": {
            "sslmode": os.getenv("POSTGRES_SSLMODE", "prefer"),
        },
    }
}

database_url = os.getenv("DATABASE_URL", "").strip()
if database_url:
    DATABASES["default"] = build_database_from_url(database_url)

if env_bool("USE_SQLITE", False):
    DATABASES["default"] = {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.getenv("TIME_ZONE", "UTC")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", str(BASE_DIR / "media")))

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

if USE_CLOUDINARY:
    CLOUDINARY_STORAGE = {
        "CLOUD_NAME": CLOUDINARY_CLOUD_NAME,
        "API_KEY": CLOUDINARY_API_KEY,
        "API_SECRET": CLOUDINARY_API_SECRET,
        "SECURE": env_bool("CLOUDINARY_SECURE", True),
    }
    STORAGES["default"] = {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    }

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

default_authentication_classes = [
    "rest_framework.authentication.SessionAuthentication",
]

if env_bool("ENABLE_BASIC_AUTH", DEBUG):
    default_authentication_classes.append("rest_framework.authentication.BasicAuthentication")

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": default_authentication_classes,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 12,
}


# The default below is a local-development fallback only: production sets
# CORS_ALLOWED_ORIGINS as an environment variable, which replaces this list
# entirely. http://localhost:3000 (the Next.js `next dev` / `next start`
# default port) is added in P01 so the new `web/` app can exercise the public
# contact and service-request intake endpoints locally without a CORS error.
# Purely additive - http://localhost:5173 (the existing Vite app) is unchanged,
# and no deployed origin is affected.
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = env_bool("CORS_ALLOW_CREDENTIALS", True)

if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", False)

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CSRF_TRUSTED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

GMAIL_API_CLIENT_ID = os.getenv("GMAIL_API_CLIENT_ID", "")
GMAIL_API_CLIENT_SECRET = os.getenv("GMAIL_API_CLIENT_SECRET", "")
GMAIL_API_REFRESH_TOKEN = os.getenv("GMAIL_API_REFRESH_TOKEN", "")
GMAIL_API_USER_ID = os.getenv("GMAIL_API_USER_ID", "me")
GMAIL_API_SCOPES = env_list("GMAIL_API_SCOPES", "https://www.googleapis.com/auth/gmail.send")
GMAIL_API_ENABLED = env_bool(
    "GMAIL_API_ENABLED",
    bool(GMAIL_API_CLIENT_ID and GMAIL_API_CLIENT_SECRET and GMAIL_API_REFRESH_TOKEN),
)

default_email_backend = "django.core.mail.backends.smtp.EmailBackend"
if GMAIL_API_ENABLED:
    default_email_backend = "apps.core.email_backends.gmail_api.GmailApiEmailBackend"

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    default_email_backend,
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER or "noreply@localhost")
ADMIN_NOTIFICATION_EMAIL = os.getenv("ADMIN_NOTIFICATION_EMAIL", EMAIL_HOST_USER or DEFAULT_FROM_EMAIL)

USE_X_FORWARDED_HOST = env_bool("USE_X_FORWARDED_HOST", True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_CONTENT_TYPE_NOSNIFF = env_bool("SECURE_CONTENT_TYPE_NOSNIFF", True)
SECURE_BROWSER_XSS_FILTER = env_bool("SECURE_BROWSER_XSS_FILTER", True)
X_FRAME_OPTIONS = os.getenv("X_FRAME_OPTIONS", "DENY")
SECURE_REFERRER_POLICY = os.getenv("SECURE_REFERRER_POLICY", "same-origin")
SECURE_CROSS_ORIGIN_OPENER_POLICY = os.getenv("SECURE_CROSS_ORIGIN_OPENER_POLICY", "same-origin")

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_HTTPONLY = env_bool("CSRF_COOKIE_HTTPONLY", False)
CSRF_COOKIE_SAMESITE = os.getenv("CSRF_COOKIE_SAMESITE", "Lax")
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", not DEBUG)
