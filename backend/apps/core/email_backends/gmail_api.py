from __future__ import annotations

import base64

import google_auth_httplib2
import httplib2
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


class _TimeoutBoundRequest(Request):
    """google.auth.transport.requests.Request, but __call__ defaults to a
    configured timeout instead of the library's own 120-second default
    whenever a caller (here, Credentials.refresh()) doesn't pass one
    explicitly. CONTACT-OPS-01-RC2: no Gmail network operation may rely
    on that 120s default - this is what bounds the OAuth token refresh."""

    def __init__(self, timeout: float, session=None):
        super().__init__(session=session)
        self._configured_timeout = timeout

    def __call__(self, url, method="GET", body=None, headers=None, timeout=None, **kwargs):
        if timeout is None:
            timeout = self._configured_timeout
        return super().__call__(url, method=method, body=body, headers=headers, timeout=timeout, **kwargs)


def _email_timeout() -> float:
    return getattr(settings, "EMAIL_TIMEOUT", 5)


class GmailApiEmailBackend(BaseEmailBackend):
    """Send emails through Gmail API using OAuth refresh token credentials.

    Every network operation this backend makes is bound to
    settings.EMAIL_TIMEOUT (the same setting Django's own SMTP backend
    respects) - none are left at an underlying library's own default:

    - OAuth token refresh: bounded via _TimeoutBoundRequest above,
      instead of google-auth's own 120s default.
    - The API discovery-document fetch build() performs: bounded because
      an explicit http= (not credentials=) is passed, so build() uses
      THIS timeout-configured httplib2.Http for it rather than
      constructing its own default (unbounded) one.
    - The actual Gmail send call, and any token refresh AuthorizedHttp
      performs internally on an expired/invalid token: bounded by that
      same httplib2.Http, since AuthorizedHttp reuses the http= it was
      given for its own internal refresh requests too.

    No retries, no sleeps, no new dependency - google_auth_httplib2 and
    httplib2 are already installed (used identically by
    apps/inquiries/services/sheets.py).
    """

    def _build_service(self):
        timeout = _email_timeout()
        scopes = getattr(settings, "GMAIL_API_SCOPES", ["https://www.googleapis.com/auth/gmail.send"])
        credentials = Credentials(
            token=None,
            refresh_token=getattr(settings, "GMAIL_API_REFRESH_TOKEN", ""),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=getattr(settings, "GMAIL_API_CLIENT_ID", ""),
            client_secret=getattr(settings, "GMAIL_API_CLIENT_SECRET", ""),
            scopes=scopes,
        )

        # Always refresh before send to ensure we have a valid access token.
        credentials.refresh(_TimeoutBoundRequest(timeout=timeout))

        authorized_http = google_auth_httplib2.AuthorizedHttp(credentials, http=httplib2.Http(timeout=timeout))
        return build("gmail", "v1", http=authorized_http, cache_discovery=False)

    def send_messages(self, email_messages):
        if not email_messages:
            return 0

        try:
            service = self._build_service()
        except Exception:
            if not self.fail_silently:
                raise
            return 0

        sent_count = 0
        user_id = getattr(settings, "GMAIL_API_USER_ID", "me")

        for message in email_messages:
            try:
                mime_message = message.message()
                encoded_message = base64.urlsafe_b64encode(mime_message.as_bytes()).decode("utf-8")
                service.users().messages().send(userId=user_id, body={"raw": encoded_message}).execute()
                sent_count += 1
            except Exception:
                if not self.fail_silently:
                    raise

        return sent_count
