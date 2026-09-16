"""Structured-output contract for every assistant answer, and the
validator that enforces it (PORTFOLIO-ASSISTANTS-01, section 7-8).

No AI provider's raw text is ever trusted as application output. Every
candidate response - from Gemini or from the deterministic fallback - is
built into a `StructuredAnswer` only by passing through
`validate_structured_response()`. Anything that fails validation is
rejected outright; the caller (services/assistant.py) then falls back to
the deterministic provider, which by construction always produces a
schema-valid answer."""

from dataclasses import dataclass, field
from urllib.parse import urlsplit

MAX_ANSWER_LENGTH = 1200

INTENTS = {
    "PORTFOLIO_OVERVIEW",
    "SKILLS",
    "EXPERIENCE",
    "PROJECTS",
    "PROJECT_RECOMMENDATION",
    "SERVICES",
    "RECRUITER_QUESTION",
    "HIRING_AVAILABILITY_HANDOFF",
    "CLIENT_QUESTION",
    "CONTACT_HANDOFF",
    "OFF_TOPIC",
    "INSUFFICIENT_EVIDENCE",
}

# Every host an answer's inline links may point to - the visitor-facing
# production domain and its own API host. Never the AI provider's own
# domain, never an arbitrary third party.
ALLOWED_URL_HOSTS = {"shahriyarkhan.com", "www.shahriyarkhan.com"}
ALLOWED_URL_PATH_PREFIXES = ("/work/", "/services/", "/resume", "/contact", "/about", "/skills", "/experience")


@dataclass(frozen=True)
class StructuredAnswer:
    answer: str
    intent: str
    source_ids: list[str] = field(default_factory=list)
    recommended_project_slugs: list[str] = field(default_factory=list)
    recommended_service_slugs: list[str] = field(default_factory=list)
    handoff: bool = False
    handoff_reason: str | None = None


def _is_allowed_url(url: str) -> bool:
    try:
        parsed = urlsplit(url)
    except ValueError:
        return False
    if parsed.scheme not in {"http", "https"}:
        return False
    if parsed.hostname not in ALLOWED_URL_HOSTS:
        return False
    return parsed.path == "" or any(parsed.path.startswith(prefix) for prefix in ALLOWED_URL_PATH_PREFIXES)


def _contains_disallowed_url(text: str) -> bool:
    for token in text.split():
        if token.startswith("http://") or token.startswith("https://"):
            if not _is_allowed_url(token.rstrip(".,)")):
                return True
    return False


def validate_structured_response(raw: object, *, evidence_bundle, project_slugs: set[str], service_slugs: set[str]) -> StructuredAnswer | None:
    """Returns a `StructuredAnswer` only if every field is well-formed and
    every reference (source ID, project slug, service slug) resolves to a
    real, currently-published record. Returns None on any violation -
    a fabricated source ID, an invalid intent, an overlong answer, a URL
    outside the public allowlist, or simply malformed shape are all
    treated identically: reject, don't repair, don't partially trust."""
    if not isinstance(raw, dict):
        return None

    answer = raw.get("answer")
    intent = raw.get("intent")
    source_ids = raw.get("source_ids", [])
    recommended_projects = raw.get("recommended_project_slugs", [])
    recommended_services = raw.get("recommended_service_slugs", [])
    handoff = raw.get("handoff", False)
    handoff_reason = raw.get("handoff_reason")

    if not isinstance(answer, str) or not (0 < len(answer) <= MAX_ANSWER_LENGTH):
        return None
    if intent not in INTENTS:
        return None
    if not isinstance(source_ids, list) or not all(isinstance(item, str) for item in source_ids):
        return None
    if not isinstance(recommended_projects, list) or not all(isinstance(item, str) for item in recommended_projects):
        return None
    if not isinstance(recommended_services, list) or not all(isinstance(item, str) for item in recommended_services):
        return None
    if not isinstance(handoff, bool):
        return None
    if handoff_reason is not None and not isinstance(handoff_reason, str):
        return None

    valid_source_ids = {item.source_id for item in evidence_bundle}
    if any(source_id not in valid_source_ids for source_id in source_ids):
        return None
    if any(slug not in project_slugs for slug in recommended_projects):
        return None
    if any(slug not in service_slugs for slug in recommended_services):
        return None
    if _contains_disallowed_url(answer):
        return None

    return StructuredAnswer(
        answer=answer,
        intent=intent,
        source_ids=list(source_ids),
        recommended_project_slugs=list(recommended_projects),
        recommended_service_slugs=list(recommended_services),
        handoff=handoff,
        handoff_reason=handoff_reason,
    )
