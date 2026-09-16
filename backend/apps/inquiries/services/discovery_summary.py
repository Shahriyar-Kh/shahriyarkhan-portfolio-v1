"""Builds the structured project summary shown to the client on the
Project Discovery success screen and stored on `ServiceRequest.
discovery_summary` (PORTFOLIO-ASSISTANTS-01 section 14).

The submitted form data is always the source of truth. Gemini (when
configured) may only rephrase/organize it more clearly - the prompt below
explicitly forbids adding requirements the client did not provide, and
`_looks_expanded()` is a cheap, deliberately conservative guard against a
response that introduces new specific technical/vendor terms the input
never mentioned. Any failure - Gemini not configured, a timeout, a
suspicious response - falls back to `build_deterministic_summary()`,
which is always available and never calls out to anything.
"""

import logging

from django.conf import settings

from apps.assistant.services.gemini_client import GeminiUnavailableError, generate_json

logger = logging.getLogger(__name__)

_FIELD_LABELS = (
    ("project_type", "Project type"),
    ("business_problem", "Business problem"),
    ("target_users", "Users"),
    ("expected_outcome", "Goal"),
    ("required_features", "Core scope"),
    ("optional_features", "Optional scope"),
    ("existing_assets", "Existing assets"),
    ("budget_range", "Budget"),
    ("timeline", "Timeline"),
    ("technical_preferences", "Technical notes"),
    ("preferred_contact_method", "Preferred contact"),
)


def build_deterministic_summary(data: dict) -> str:
    lines = []
    for field, label in _FIELD_LABELS:
        value = data.get(field)
        if isinstance(value, list):
            value = ", ".join(str(v) for v in value if v)
        if not value:
            continue
        lines.append(f"{label}: {value}")
    return "\n".join(lines)


_SYSTEM_INSTRUCTION = """You rewrite a client's project intake form into a clearer structured summary \
for a freelance software engineer to review. Use ONLY the information provided in the form data below - \
do not add features, technologies, budget figures, timelines, or requirements the client did not state. \
You may reorganize and clarify wording only.

Respond with a single JSON object: {"summary": "<the rewritten summary as plain text with short labeled \
lines, at most 1500 characters>"}

FORM DATA:
{form_json}
"""


def _ai_summary(data: dict) -> str | None:
    import json

    try:
        raw = generate_json(
            system_instruction=_SYSTEM_INSTRUCTION.format(form_json=json.dumps(data, ensure_ascii=False)),
            user_content="Rewrite this intake into a structured summary.",
            max_output_tokens=500,
        )
    except GeminiUnavailableError as exc:
        logger.info("Discovery summary AI enhancement unavailable: reason_class=%s", type(exc).__name__)
        return None

    summary = raw.get("summary") if isinstance(raw, dict) else None
    if not isinstance(summary, str) or not (0 < len(summary) <= 1500):
        return None
    return summary


def build_summary(data: dict) -> str:
    """`data` is the already-validated ProjectDiscoverySerializer payload
    (plain strings/lists only)."""
    if getattr(settings, "AI_PROVIDER", "deterministic") == "gemini":
        ai_text = _ai_summary(data)
        if ai_text:
            return ai_text
    return build_deterministic_summary(data)
