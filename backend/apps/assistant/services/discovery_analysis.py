"""AI-assisted project-intake analysis for PA-03.

This service never persists visitor text. It turns a free-text project idea
into bounded, reviewable suggestions that the existing Project Discovery
wizard may prefill. The final wizard submission remains the only path that
writes a ServiceRequest, so Gemini can never directly create or mutate
requirements in storage.
"""

from __future__ import annotations

import logging

from django.conf import settings

from apps.assistant.services.gemini_client import GeminiUnavailableError, generate_json

logger = logging.getLogger(__name__)

PROJECT_TYPES = {
    "New website",
    "Web application",
    "API / backend service",
    "Mobile app",
    "Improvement to an existing product",
    "Other",
}
PROJECT_STAGES = {
    "Just an idea",
    "Requirements are ready",
    "Existing product needs work",
}

_MAX_SUMMARY = 700
_MAX_SHORT = 500
_MAX_FEATURES = 12
_MAX_QUESTIONS = 4

_FEATURE_PATTERNS: tuple[tuple[tuple[str, ...], str], ...] = (
    (("booking", "appointment", "reservation"), "Booking workflow"),
    (("staff scheduling", "staff schedule"), "Staff scheduling"),
    (("customer record", "customer records", "client record", "client records"), "Customer records"),
    (("email reminder", "email reminders"), "Email reminders"),
    (("authentication", "login", "sign in", "user account"), "User authentication"),
    (("payment", "payments", "checkout"), "Payments"),
    (("dashboard",), "Dashboard"),
    (("reporting", "reports"), "Reporting"),
    (("analytics",), "Analytics"),
    (("notification", "notifications"), "Notifications"),
    (("inventory",), "Inventory management"),
    (("order tracking", "orders"), "Order management"),
    (("course", "courses"), "Course management"),
    (("quiz", "quizzes", "assessment"), "Assessments"),
    (("progress tracking", "track progress"), "Progress tracking"),
)

_USER_PATTERNS: tuple[tuple[tuple[str, ...], str], ...] = (
    (("staff", "employee", "employees"), "Staff"),
    (("customer", "customers"), "Customers"),
    (("student", "students", "learner", "learners"), "Students"),
    (("teacher", "teachers", "instructor", "instructors"), "Instructors"),
    (("administrator", "administrators", "admin", "admins"), "Administrators"),
    (("driver", "drivers"), "Drivers"),
    (("patient", "patients"), "Patients"),
    (("client", "clients"), "Clients"),
)

_TECHNOLOGY_PATTERNS: tuple[tuple[tuple[str, ...], str], ...] = (
    (("django",), "Django"),
    (("django rest framework", "drf"), "Django REST Framework"),
    (("fastapi",), "FastAPI"),
    (("postgresql", "postgres"), "PostgreSQL"),
    (("react", "react.js"), "React"),
    (("next.js", "nextjs"), "Next.js"),
    (("redis",), "Redis"),
    (("celery",), "Celery"),
)

_SYSTEM_INSTRUCTION = """You help a prospective software-development client turn a rough project idea into
reviewable intake suggestions for a human engineer.

SAFETY / ACCURACY RULES:
- Use only information stated or directly implied by the visitor's description.
- Do not invent business facts, budgets, timelines, technologies, integrations, users, or requirements.
- Suggestions are drafts for the visitor to review; never present them as confirmed requirements.
- If a field is unknown, return an empty string/list rather than guessing.
- required_features may contain only features the visitor explicitly requested or that are unambiguously part
  of the named product function. Keep them short.
- Ask concise follow-up questions only for material missing information.
- project_type must be exactly one of: New website, Web application, API / backend service, Mobile app,
  Improvement to an existing product, Other, or an empty string.
- project_stage must be exactly one of: Just an idea, Requirements are ready,
  Existing product needs work, or an empty string.

Return one JSON object with EXACTLY these keys:
{
  "summary": "<plain text, <=700 chars>",
  "project_type": "<allowed value or empty>",
  "project_stage": "<allowed value or empty>",
  "target_users": "<string or empty>",
  "expected_outcome": "<string or empty>",
  "required_features": ["<short strings>"],
  "optional_features": ["<short strings>"],
  "technical_preferences": "<string or empty>",
  "follow_up_questions": ["<at most 4 concise questions>"]
}
"""


def deterministic_analysis(description: str) -> dict:
    text = " ".join(description.split())[:_MAX_SUMMARY]
    lower = text.casefold()

    if any(marker in lower for marker in ("existing product", "existing app", "existing website", "needs improvement")):
        project_type = "Improvement to an existing product"
        project_stage = "Existing product needs work"
    elif any(marker in lower for marker in ("mobile app", "android app", "ios app")):
        project_type = "Mobile app"
        project_stage = ""
    elif any(marker in lower for marker in ("api service", "backend service", "rest api", "api / backend")):
        project_type = "API / backend service"
        project_stage = ""
    elif any(marker in lower for marker in ("web application", "web app", "platform", "portal", "dashboard", "booking")):
        project_type = "Web application"
        project_stage = ""
    elif any(marker in lower for marker in ("website", "landing page")):
        project_type = "New website"
        project_stage = ""
    else:
        project_type = ""
        project_stage = ""

    if any(marker in lower for marker in ("requirements are ready", "requirements ready", "specification is ready")):
        project_stage = "Requirements are ready"
    elif not project_stage and any(marker in lower for marker in ("just an idea", "idea for", "want to build", "need to build", "i need a", "we need a")):
        project_stage = "Just an idea"

    target_users = [label for markers, label in _USER_PATTERNS if any(marker in lower for marker in markers)]
    required_features = [label for markers, label in _FEATURE_PATTERNS if any(marker in lower for marker in markers)]
    technologies = [label for markers, label in _TECHNOLOGY_PATTERNS if any(marker in lower for marker in markers)]

    if "manual" in lower:
        expected_outcome = "Replace the current manual workflow with a more organized digital process."
    elif any(marker in lower for marker in ("booking", "appointment", "reservation")):
        expected_outcome = "Make booking and scheduling easier to manage."
    else:
        expected_outcome = ""

    questions: list[str] = []
    if not target_users:
        questions.append("Who will use this product?")
    if not expected_outcome:
        questions.append("What result should the project achieve for your business?")
    if not required_features:
        questions.append("Which features are essential for the first version?")
    if not project_stage:
        questions.append("Is this an early idea, a requirements-ready project, or an existing product?")
    questions.append("Do you have a target timeline or budget range?")

    return {
        "summary": text,
        "project_type": project_type,
        "project_stage": project_stage,
        "target_users": " and ".join(target_users),
        "expected_outcome": expected_outcome,
        "required_features": required_features[:_MAX_FEATURES],
        "optional_features": [],
        "technical_preferences": ", ".join(technologies),
        "follow_up_questions": questions[:_MAX_QUESTIONS],
    }


def _clean_short(value: object, *, limit: int = _MAX_SHORT) -> str:
    if not isinstance(value, str):
        return ""
    return " ".join(value.split())[:limit]


def _clean_list(value: object, *, limit: int) -> list[str]:
    if not isinstance(value, list):
        return []
    cleaned: list[str] = []
    for item in value:
        text = _clean_short(item, limit=200)
        if text and text not in cleaned:
            cleaned.append(text)
        if len(cleaned) >= limit:
            break
    return cleaned


def _validate(raw: object, description: str) -> dict | None:
    if not isinstance(raw, dict):
        return None

    project_type = _clean_short(raw.get("project_type"), limit=120)
    if project_type not in PROJECT_TYPES:
        project_type = ""

    project_stage = _clean_short(raw.get("project_stage"), limit=120)
    if project_stage not in PROJECT_STAGES:
        project_stage = ""

    summary = _clean_short(raw.get("summary"), limit=_MAX_SUMMARY)
    if not summary:
        summary = " ".join(description.split())[:_MAX_SUMMARY]

    return {
        "summary": summary,
        "project_type": project_type,
        "project_stage": project_stage,
        "target_users": _clean_short(raw.get("target_users")),
        "expected_outcome": _clean_short(raw.get("expected_outcome")),
        "required_features": _clean_list(raw.get("required_features"), limit=_MAX_FEATURES),
        "optional_features": _clean_list(raw.get("optional_features"), limit=_MAX_FEATURES),
        "technical_preferences": _clean_short(raw.get("technical_preferences")),
        "follow_up_questions": _clean_list(raw.get("follow_up_questions"), limit=_MAX_QUESTIONS),
    }


def analyze_project_idea(description: str) -> tuple[dict, bool]:
    """Return (analysis, fallback_used). No database writes, ever."""
    fallback = deterministic_analysis(description)
    if getattr(settings, "AI_PROVIDER", "deterministic") != "gemini":
        return fallback, True

    try:
        raw = generate_json(
            system_instruction=_SYSTEM_INSTRUCTION,
            user_content=description,
            max_output_tokens=700,
        )
    except GeminiUnavailableError as exc:
        logger.info("Project discovery analysis AI unavailable: reason_class=%s", type(exc).__name__)
        return fallback, True

    validated = _validate(raw, description)
    if validated is None:
        return fallback, True
    return validated, False
