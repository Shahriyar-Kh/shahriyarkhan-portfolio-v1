"""Minimal, dependency-free Gemini REST client. Deliberately implemented
with the standard library (`urllib`) rather than the `google-generativeai`
SDK - this project already talks to another Google API (Sheets, via
`google-api-python-client`) with a real client library, but adding a
second, heavier SDK just for one JSON-in/JSON-out endpoint would be
infrastructure added "for architectural fashion" (see
PORTFOLIO-ASSISTANTS-01 section 9's same principle applied to the AI
provider layer, not just retrieval). Shared by the visitor assistant
(services/providers.py) and the project-discovery AI summary
(apps.inquiries.services.discovery_summary), so there is exactly one place
that knows how to reach Gemini, timeout, and handle its errors.
"""

import json
import logging
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)

_ENDPOINT_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"


class GeminiUnavailableError(Exception):
    """Raised for any Gemini failure - missing config, network error,
    timeout, non-200 response, or an unparseable body. Callers never
    inspect the cause beyond this type; see the module docstring on why
    only the exception CLASS is ever logged, never its message (which can
    embed the API key's own error-echo or request detail)."""


def is_gemini_configured() -> bool:
    return bool(getattr(settings, "GEMINI_API_KEY", "") and getattr(settings, "GEMINI_MODEL", ""))


def generate_json(*, system_instruction: str, user_content: str, max_output_tokens: int = 700) -> dict:
    """Calls Gemini with a strict "respond with JSON only" instruction and
    returns the parsed JSON object. Raises GeminiUnavailableError - never
    an unhandled exception type - on any failure, so every caller has one
    thing to catch."""
    if not is_gemini_configured():
        raise GeminiUnavailableError("Gemini is not configured.")

    endpoint = _ENDPOINT_TEMPLATE.format(model=settings.GEMINI_MODEL, api_key=settings.GEMINI_API_KEY)
    payload = {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": user_content}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": max_output_tokens,
            "responseMimeType": "application/json",
        },
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    timeout = getattr(settings, "ASSISTANT_PROVIDER_TIMEOUT_SECONDS", 8)

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        logger.warning("Gemini request failed: exception_class=%s status=%s", type(exc).__name__, exc.code)
        raise GeminiUnavailableError("Gemini returned an error response.") from exc
    except Exception as exc:
        logger.warning("Gemini request failed: exception_class=%s", type(exc).__name__)
        raise GeminiUnavailableError("Gemini request failed.") from exc

    try:
        text = body["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        logger.warning("Gemini response was malformed: exception_class=%s", type(exc).__name__)
        raise GeminiUnavailableError("Gemini response was malformed.") from exc
