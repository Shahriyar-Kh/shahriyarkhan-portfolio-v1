"""Minimal, dependency-free Gemini REST client. Deliberately implemented
with the standard library (`urllib`) rather than the `google-generativeai`
SDK - this project already talks to another Google API (Sheets, via
`google-api-python-client`) with a real client library, but adding a
second, heavier SDK just for one JSON-in/JSON-out endpoint would be
infrastructure added "for architectural fashion" (see
PORTFOLIO-ASSISTANTS-01 section 9's same principle applied to the AI
provider layer, not just retrieval). Shared by the visitor assistant and the stateless Project Discovery
analysis endpoint, so there is exactly one place that knows how to reach
Gemini, enforce timeouts, and handle provider errors. Persisted Project
Discovery summaries are deliberately deterministic and do not call Gemini.
"""

import json
import logging
import time
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

    model = settings.GEMINI_MODEL
    endpoint = _ENDPOINT_TEMPLATE.format(model=model, api_key=settings.GEMINI_API_KEY)
    generation_config = {
        "maxOutputTokens": max_output_tokens,
        "responseMimeType": "application/json",
    }
    # Gemini 3 models think by default. For this portfolio assistant we need
    # low-latency grounded extraction/composition, not deep reasoning. A low
    # thinking level also prevents the model from spending a small output
    # budget entirely on hidden thought tokens and returning no text.
    if model.startswith("gemini-3"):
        generation_config["thinkingConfig"] = {"thinkingLevel": "low"}
    else:
        generation_config["temperature"] = 0.2

    payload = {
        "system_instruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": user_content}]}],
        "generationConfig": generation_config,
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    timeout = getattr(settings, "ASSISTANT_PROVIDER_TIMEOUT_SECONDS", 8)

    # Treat Google's transient capacity/server failures as retryable, but
    # keep the retry inside the existing total provider timeout budget so a
    # temporary 503 can recover without turning the public assistant into a
    # long-hanging request. Invalid auth/config responses are never retried.
    deadline = time.monotonic() + timeout
    body = None
    for attempt in range(2):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise GeminiUnavailableError("Gemini request timed out.")

        try:
            with urllib.request.urlopen(request, timeout=remaining) as response:
                body = json.loads(response.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as exc:
            transient = exc.code in {500, 502, 503, 504}
            if transient and attempt == 0:
                sleep_for = min(0.35, max(0.0, deadline - time.monotonic() - 0.05))
                if sleep_for > 0:
                    time.sleep(sleep_for)
                    continue
            logger.warning("Gemini request failed: exception_class=%s status=%s", type(exc).__name__, exc.code)
            raise GeminiUnavailableError("Gemini returned an error response.") from exc
        except Exception as exc:
            logger.warning("Gemini request failed: exception_class=%s", type(exc).__name__)
            raise GeminiUnavailableError("Gemini request failed.") from exc

    if body is None:
        raise GeminiUnavailableError("Gemini request failed.")

    try:
        candidates = body.get("candidates") if isinstance(body, dict) else None
        if not candidates or not isinstance(candidates[0], dict):
            raise ValueError("missing candidate")

        candidate = candidates[0]
        content = candidate.get("content") or {}
        parts = content.get("parts") or []
        text_parts = [
            part.get("text")
            for part in parts
            if isinstance(part, dict)
            and isinstance(part.get("text"), str)
            and part.get("text")
            and not part.get("thought", False)
        ]
        if not text_parts:
            finish_reason = candidate.get("finishReason", "UNKNOWN")
            logger.warning("Gemini response had no text parts: finish_reason=%s", finish_reason)
            raise GeminiUnavailableError("Gemini returned no text response.")

        return json.loads("".join(text_parts))
    except GeminiUnavailableError:
        raise
    except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as exc:
        logger.warning("Gemini response was malformed: exception_class=%s", type(exc).__name__)
        raise GeminiUnavailableError("Gemini response was malformed.") from exc
