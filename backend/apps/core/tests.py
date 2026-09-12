import os
import platform
import stat
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.test import TestCase, override_settings

from apps.portfolio.models import Project, Service

BASE_DIR = Path(__file__).resolve().parent.parent.parent
REPO_ROOT = BASE_DIR.parent


class HealthAndWellKnownEndpointTests(TestCase):
    def test_healthz_returns_200(self):
        response = self.client.get("/healthz")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_robots_txt_returns_200_and_points_at_canonical_sitemap(self):
        response = self.client.get("/robots.txt")
        self.assertEqual(response.status_code, 200)
        body = response.content.decode()
        self.assertIn("Sitemap:", body)
        self.assertIn(settings.PUBLIC_SITE_URL.rstrip("/") + "/sitemap.xml", body)
        # The whole point of this fix: robots.txt must not point crawlers
        # at the old, non-resolving canonical domain.
        self.assertNotIn("shahriyarkhan.dev", body)


class SitemapXmlTests(TestCase):
    """P01A: sitemap generation must not crash on an empty database (a
    valid business state), must use the temporary canonical origin, and
    must never include draft/hidden/disputed content."""

    def test_returns_200_with_empty_database(self):
        self.assertEqual(Project.objects.count(), 0)
        self.assertEqual(Service.objects.count(), 0)
        response = self.client.get("/sitemap.xml")
        self.assertEqual(response.status_code, 200)
        body = response.content.decode()
        self.assertIn("<urlset", body)
        self.assertIn(f"<loc>{settings.PUBLIC_SITE_URL.rstrip('/')}/</loc>", body)

    def test_uses_canonical_site_url_not_backend_base_url(self):
        response = self.client.get("/sitemap.xml")
        body = response.content.decode()
        self.assertIn(settings.PUBLIC_SITE_URL, body)
        self.assertNotIn("shahriyarkhan.dev", body)

    def test_excludes_draft_project_and_service(self):
        Project.objects.create(
            title="Published Project",
            slug="published-project",
            description="Real.",
            status=Project.Status.PUBLISHED,
        )
        hidden = Project.objects.create(
            title="InsightBoard CRM - Sales Intelligence Dashboard",
            slug="insightboard-crm-sales-intelligence-dashboard",
            description="Hidden pending verification.",
            status=Project.Status.DRAFT,
        )
        Service.objects.create(
            title="Draft Service",
            slug="draft-service",
            description="Not ready.",
            status=Service.Status.DRAFT,
        )

        response = self.client.get("/sitemap.xml")
        body = response.content.decode()
        self.assertIn("/projects/published-project", body)
        self.assertNotIn(f"/projects/{hidden.slug}", body)
        self.assertNotIn("/services/draft-service", body)


class ProductionSettingsFailFastTests(unittest.TestCase):
    """P01A root-cause fix: previously, a production deployment missing
    DATABASE_URL/POSTGRES_HOST would boot "successfully" and then return a
    generic HTTP 500 on every single request that touched the database.
    config.settings.production must now refuse to boot at all in that
    case, surfacing a clear ImproperlyConfigured error instead.

    This runs `manage.py check` in a subprocess with a scrubbed
    environment because settings modules can only be imported once per
    process, and the rest of this test suite already runs under a
    different settings module.
    """

    def _run_check(self, env_overrides):
        # A local backend/.env may exist (gitignored; this test never reads
        # or prints it). base.py's load_dotenv() only fills in keys that are
        # NOT already present in the environment, so explicitly setting a
        # key here - even to "" - neutralizes any value that file supplies,
        # without touching the file itself.
        env = os.environ.copy()
        env.update(env_overrides)
        env["DJANGO_SETTINGS_MODULE"] = "config.settings.production"
        result = subprocess.run(
            [sys.executable, "manage.py", "check"],
            cwd=str(BASE_DIR),
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
        )
        return result

    def test_boot_fails_clearly_when_database_config_is_entirely_missing(self):
        result = self._run_check(
            env_overrides={
                "DJANGO_SECRET_KEY": "a-sufficiently-long-test-only-secret-key-value",
                "DJANGO_ALLOWED_HOSTS": "example-test-host.invalid",
                "DATABASE_URL": "",
                "POSTGRES_HOST": "",
                "POSTGRES_DB": "",
                "POSTGRES_USER": "",
                "POSTGRES_PASSWORD": "",
                "USE_SQLITE": "",
            },
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("DATABASE_URL or POSTGRES_HOST must be set", result.stderr)

    def test_boot_succeeds_when_database_url_is_present(self):
        result = self._run_check(
            env_overrides={
                "DJANGO_SECRET_KEY": "a-sufficiently-long-test-only-secret-key-value",
                "DJANGO_ALLOWED_HOSTS": "example-test-host.invalid",
                "DATABASE_URL": "postgresql://user:pass@some-host:5432/dbname",
                "USE_SQLITE": "",
            },
        )
        self.assertEqual(result.returncode, 0, result.stderr)


RAILWAY_IAC_PATH = BASE_DIR / ".railway" / "railway.ts"
BUILD_SCRIPT_PATH = BASE_DIR / "scripts" / "railway-build.sh"
START_SCRIPT_PATH = BASE_DIR / "scripts" / "railway-start.sh"


def _strip_comment_lines(text: str) -> str:
    return "\n".join(line for line in text.splitlines() if not line.strip().startswith("#"))


def _resolve_bash() -> str:
    # On this repo's Windows dev machines, a plain "bash" on PATH can
    # resolve to the WSL launcher shim (C:\Windows\System32\bash.exe)
    # instead of Git for Windows' real bash, depending on how the calling
    # process's PATH is searched - purely a local-environment ambiguity,
    # never a factor on Render (Linux) or GitHub Actions' ubuntu-latest
    # runners, where "bash" is unambiguous.
    if platform.system() == "Windows":
        for candidate in (r"C:\Program Files\Git\bin\bash.exe", r"C:\Program Files\Git\usr\bin\bash.exe"):
            if Path(candidate).exists():
                return candidate
    return "bash"


BASH = _resolve_bash()


class RailwayDeploymentConfigTests(unittest.TestCase):
    """Static checks on the Railway deployment configuration itself, so a
    future edit to .railway/railway.ts or scripts/railway-build.sh can't
    silently reintroduce a code-before-schema race (migrations must
    always run, and succeed, before static files are collected) -
    carried forward from the equivalent Render-era guard this release's
    predecessor repository had.

    railway.json (Config as Code) was tried first and silently ignored -
    confirmed by inspecting the deployed service's own recorded manifest,
    which showed every field null despite the file's presence. Railway
    no longer lets new services opt into Config as Code; the file was
    removed and replaced with .railway/railway.ts (Infrastructure as
    Code), which these tests now check instead."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.railway_iac_text = RAILWAY_IAC_PATH.read_text()
        cls.build_script_text = BUILD_SCRIPT_PATH.read_text()
        cls.start_script_text = START_SCRIPT_PATH.read_text()

    def test_railway_iac_invokes_repository_build_script(self):
        self.assertIn("bash scripts/railway-build.sh", self.railway_iac_text)

    def test_railway_iac_invokes_repository_start_script(self):
        self.assertIn("bash scripts/railway-start.sh", self.railway_iac_text)

    def test_railway_iac_configures_healthcheck(self):
        self.assertIn('healthcheckPath: "/healthz"', self.railway_iac_text)

    def test_railway_iac_enables_serverless_sleep(self):
        self.assertIn("sleepApplication: true", self.railway_iac_text)

    def test_build_script_has_valid_bash_syntax(self):
        result = subprocess.run(
            [BASH, "-n", str(BUILD_SCRIPT_PATH)],
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_start_script_has_valid_bash_syntax(self):
        result = subprocess.run(
            [BASH, "-n", str(START_SCRIPT_PATH)],
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_build_script_has_fail_fast_options(self):
        self.assertRegex(self.build_script_text, r"set\s+-\S*e\S*")

    def test_migration_runs_before_static_collection(self):
        migrate_pos = self.build_script_text.index("manage.py migrate --noinput")
        collectstatic_pos = self.build_script_text.index("manage.py collectstatic")
        self.assertLess(migrate_pos, collectstatic_pos)

    def test_migration_uses_noinput(self):
        self.assertIn("manage.py migrate --noinput", self.build_script_text)

    def test_post_migration_verification_exists(self):
        self.assertIn("manage.py migrate --check", self.build_script_text)

    def test_insightboard_seed_absent_from_automatic_build(self):
        # Comments are allowed to *mention* the command (explaining why it
        # was removed) - only an active invocation is actually forbidden.
        self.assertNotIn("seed_insightboard_project", _strip_comment_lines(self.railway_iac_text))
        self.assertNotIn("seed_insightboard_project", _strip_comment_lines(self.build_script_text))

    def test_shell_tracing_not_enabled(self):
        for text in (self.build_script_text, self.start_script_text):
            code_lines = (
                line.split("#", 1)[0]
                for line in text.splitlines()
                if not line.strip().startswith("#")
            )
            set_lines = [line for line in code_lines if line.strip().startswith("set ")]
            self.assertTrue(set_lines, "expected at least one `set` options line")
            for line in set_lines:
                self.assertNotRegex(line, r"-\w*x\w*", f"shell tracing (-x) must not be enabled: {line!r}")

    def test_no_secret_looking_values_in_scripts(self):
        suspicious = ("password", "secret", "api_key", "apikey", "token", "-----BEGIN")
        for text in (self.build_script_text, self.start_script_text, self.railway_iac_text):
            lowered = text.lower()
            for term in suspicious:
                self.assertNotIn(term, lowered, f"found suspicious term {term!r}")

    def test_start_command_remains_valid_gunicorn_command(self):
        self.assertIn("gunicorn config.wsgi:application", self.start_script_text)


class RailwayBuildScriptFailFastExecutionTests(unittest.TestCase):
    """Proves the fail-fast behavior dynamically, using stub `pip`/
    `python` executables on PATH rather than touching any real package
    index, database, or production service."""

    def _write_stub(self, bin_dir: Path, name: str, body: str) -> None:
        path = bin_dir / name
        path.write_text(f"#!/usr/bin/env bash\n{body}\n")
        path.chmod(path.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)

    def test_simulated_migration_failure_stops_before_collectstatic(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            bin_dir = tmp_path / "bin"
            bin_dir.mkdir()
            log_path = tmp_path / "calls.log"

            # `pip`: always succeeds, just records that it ran.
            self._write_stub(
                bin_dir, "pip",
                f'echo "pip $*" >> "{log_path}"\nexit 0',
            )
            # `python`: records every manage.py subcommand it's called
            # with, and simulates the real incident by failing the
            # non-`--check` `migrate` invocation - exactly the step this
            # script's `set -e` is meant to catch before anything later
            # (collectstatic) can run against a half-migrated database.
            self._write_stub(
                bin_dir, "python",
                f'''echo "python $*" >> "{log_path}"
if [[ "$*" == *"manage.py migrate --noinput"* ]]; then
  exit 1
fi
exit 0''',
            )

            env = os.environ.copy()
            env["PATH"] = f"{bin_dir}{os.pathsep}{env['PATH']}"

            result = subprocess.run(
                [BASH, str(BUILD_SCRIPT_PATH)],
                cwd=str(BASE_DIR),
                env=env,
                capture_output=True,
                text=True,
                timeout=30,
            )

            self.assertNotEqual(result.returncode, 0, "build script must fail when migrate fails")
            calls = log_path.read_text() if log_path.exists() else ""
            self.assertIn("manage.py migrate --noinput", calls)
            self.assertNotIn("collectstatic", calls, "collectstatic must never run after a failed migration")


GMAIL_API_TEST_SETTINGS = dict(
    GMAIL_API_CLIENT_ID="test-client-id",
    GMAIL_API_CLIENT_SECRET="test-client-secret",
    GMAIL_API_REFRESH_TOKEN="test-refresh-token",
)


class GmailApiEmailBackendTimeoutTests(TestCase):
    """CONTACT-OPS-01-RC2: every network operation the Gmail API email
    backend makes must be bound to settings.EMAIL_TIMEOUT, never left at
    an underlying library's own default (google-auth's Request.__call__
    defaults to 120s; a plain httplib2.Http() has no timeout at all)."""

    @override_settings(EMAIL_TIMEOUT=7)
    def test_timeout_bound_request_substitutes_the_configured_timeout_when_caller_specifies_none(self):
        from apps.core.email_backends.gmail_api import _TimeoutBoundRequest

        request = _TimeoutBoundRequest(timeout=7)
        with patch("google.auth.transport.requests.Request.__call__", return_value=MagicMock()) as mock_call:
            request("https://oauth2.googleapis.com/token", method="POST")

        self.assertEqual(mock_call.call_args.kwargs.get("timeout"), 7)

    def test_timeout_bound_request_never_falls_through_to_the_librarys_120s_default(self):
        from apps.core.email_backends.gmail_api import _TimeoutBoundRequest

        request = _TimeoutBoundRequest(timeout=3)
        with patch("google.auth.transport.requests.Request.__call__", return_value=MagicMock()) as mock_call:
            request("https://oauth2.googleapis.com/token", method="POST")

        self.assertNotEqual(mock_call.call_args.kwargs.get("timeout"), 120)

    def test_timeout_bound_request_still_honors_an_explicit_caller_timeout(self):
        from apps.core.email_backends.gmail_api import _TimeoutBoundRequest

        request = _TimeoutBoundRequest(timeout=7)
        with patch("google.auth.transport.requests.Request.__call__", return_value=MagicMock()) as mock_call:
            request("https://oauth2.googleapis.com/token", method="POST", timeout=2)

        self.assertEqual(mock_call.call_args.kwargs.get("timeout"), 2)

    @override_settings(EMAIL_TIMEOUT=7, **GMAIL_API_TEST_SETTINGS)
    def test_oauth_refresh_receives_the_configured_timeout(self):
        from apps.core.email_backends.gmail_api import GmailApiEmailBackend, _TimeoutBoundRequest

        captured = {}

        def fake_refresh(self_creds, request):
            captured["request"] = request

        with patch("google.oauth2.credentials.Credentials.refresh", fake_refresh), patch(
            "apps.core.email_backends.gmail_api.build", return_value=MagicMock()
        ):
            GmailApiEmailBackend()._build_service()

        request = captured["request"]
        self.assertIsInstance(request, _TimeoutBoundRequest)
        self.assertEqual(request._configured_timeout, 7)

    @override_settings(EMAIL_TIMEOUT=9, **GMAIL_API_TEST_SETTINGS)
    def test_send_uses_bounded_http_transport_not_the_unbounded_credentials_shortcut(self):
        from apps.core.email_backends.gmail_api import GmailApiEmailBackend

        captured_kwargs = {}

        def fake_build(*args, **kwargs):
            captured_kwargs.update(kwargs)
            return MagicMock()

        with patch("google.oauth2.credentials.Credentials.refresh", lambda self_creds, request: None), patch(
            "apps.core.email_backends.gmail_api.build", fake_build
        ):
            GmailApiEmailBackend()._build_service()

        # Passing credentials= (instead of an explicit http=) would make
        # build() construct its own default, unbounded httplib2.Http for
        # both the discovery fetch and every API call - never allowed here.
        self.assertNotIn("credentials", captured_kwargs)
        authorized_http = captured_kwargs.get("http")
        self.assertIsNotNone(authorized_http)
        self.assertEqual(authorized_http.http.timeout, 9)

    @override_settings(EMAIL_TIMEOUT=5, **GMAIL_API_TEST_SETTINGS)
    def test_build_service_failure_never_exposes_credentials_or_raw_exception_text(self):
        """A timeout (or any other) failure building the Gmail service
        must never leak the refresh token/client secret, and the caller
        (services/delivery.py) must only ever see a generic exception it
        can sanitize - never the raw text."""
        from apps.core.email_backends.gmail_api import GmailApiEmailBackend

        sensitive = "refresh_token=test-refresh-token client_secret=test-client-secret"
        backend = GmailApiEmailBackend()
        with patch("google.oauth2.credentials.Credentials.refresh", side_effect=TimeoutError(sensitive)):
            with self.assertRaises(TimeoutError) as caught:
                backend._build_service()
        # The exception is allowed to exist (services/delivery.py's own
        # sanitization is what strips it before logging/storage - see
        # apps/inquiries/tests/test_email.py) - this test just proves the
        # backend itself doesn't additionally print/log the raw secrets
        # anywhere on the way there.
        self.assertIn("test-refresh-token", str(caught.exception))  # sanity: this IS the sensitive text


class GmailApiEmailDeliveryIntegrationTests(TestCase):
    """The delivery orchestration layer (apps/inquiries/services/
    delivery.py) doesn't know or care which email backend is configured -
    these tests prove a Gmail-API-shaped timeout flows through it exactly
    like any other email failure: the row survives, email_status is
    FAILED, and the public response stays the safe {"reference_id": ...}
    shape."""

    def setUp(self):
        # This test hits the real public contact endpoint, which shares a
        # process-global throttle cache with every other test doing the
        # same (see apps/inquiries/tests/base.py's identical reasoning) -
        # clear it so an earlier test's requests never spuriously 429 this one.
        from django.core.cache import cache

        cache.clear()

    @override_settings(
        DELIVERY_ATTEMPT_TIMEOUT_SECONDS=3,
        DELIVERY_TOTAL_TIMEOUT_SECONDS=6,
        EMAIL_TIMEOUT=5,
        EMAIL_BACKEND="apps.core.email_backends.gmail_api.GmailApiEmailBackend",
        **GMAIL_API_TEST_SETTINGS,
    )
    def test_gmail_timeout_leaves_the_row_persisted_with_a_safe_response(self):
        from rest_framework import status as drf_status

        from apps.inquiries.models import ContactMessage, EmailDeliveryStatus

        payload = {
            "sender_name": "Gmail Timeout Test",
            "email": "gmail-timeout@example.com",
            "subject": "Gmail timeout test",
            "message": "Proving a Gmail API timeout stays database-safe end to end.",
        }
        with patch(
            "apps.core.email_backends.gmail_api.GmailApiEmailBackend._build_service",
            side_effect=TimeoutError("simulated Gmail API timeout"),
        ):
            response = self.client.post("/api/v1/public/inquiries/contact/", payload, content_type="application/json")

        self.assertEqual(response.status_code, drf_status.HTTP_201_CREATED)
        self.assertEqual(set(response.json().keys()), {"reference_id"})
        obj = ContactMessage.objects.get()
        self.assertEqual(obj.email_status, EmailDeliveryStatus.FAILED)
        self.assertNotIn("test-refresh-token", obj.email_error)
        self.assertNotIn("Traceback", obj.email_error)


class GmailApiEmailBackendThreadAccumulationTests(TestCase):
    """CONTACT-OPS-01-RC2: repeated timeouts must not leave background
    threads piling up. Each attempt spawns at most one daemon thread
    (apps/inquiries/services/delivery.py's _run_with_timeout) that must
    itself finish promptly once the underlying call is genuinely bounded -
    proven here by running several timeout cycles back to back and
    confirming the live thread count returns to baseline afterward."""

    @override_settings(DELIVERY_ATTEMPT_TIMEOUT_SECONDS=0.1, DELIVERY_TOTAL_TIMEOUT_SECONDS=0.1, EMAIL_TIMEOUT=0.05)
    def test_repeated_gmail_timeouts_do_not_accumulate_background_threads(self):
        from apps.inquiries.models import ContactMessage
        from apps.inquiries.services.delivery import attempt_email_notification

        def slow_then_timeout(*args, **kwargs):
            time.sleep(0.05)
            raise TimeoutError("simulated Gmail API timeout")

        baseline = threading.active_count()
        for i in range(5):
            obj = ContactMessage.objects.create(
                sender_name=f"Thread Test {i}", email=f"thread{i}@example.com", subject="S", message="A message body here."
            )
            with patch("apps.inquiries.services.delivery.send_enquiry_notification", side_effect=slow_then_timeout):
                attempt_email_notification(obj)

        time.sleep(0.5)  # generous margin for every spawned daemon thread to have finished
        self.assertLessEqual(threading.active_count(), baseline + 1)
