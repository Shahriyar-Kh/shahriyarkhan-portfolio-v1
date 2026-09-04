from __future__ import annotations

import base64

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


class GmailApiEmailBackend(BaseEmailBackend):
    """Send emails through Gmail API using OAuth refresh token credentials."""

    def _build_service(self):
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
        credentials.refresh(Request())
        return build("gmail", "v1", credentials=credentials, cache_discovery=False)

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
