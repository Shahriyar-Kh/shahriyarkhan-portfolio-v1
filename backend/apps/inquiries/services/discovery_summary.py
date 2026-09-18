"""Build the canonical Project Discovery summary.

The submitted, serializer-validated form data is the source of truth.
This summary is persisted on ServiceRequest and is also mirrored into the
legacy message field for the existing notification/Sheets pipeline.

Because persisted intake records must never contain model-invented
requirements, this canonical summary is deliberately deterministic even
when the public assistant itself uses Gemini. AI may help the visitor
prepare/review draft requirements in the separate stateless discovery
analysis endpoint, but only the visitor-reviewed structured form fields
are persisted here.
"""

_FIELD_LABELS = (
    ("project_type", "Project type"),
    ("project_stage", "Project stage"),
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


def build_summary(data: dict) -> str:
    """Return only facts from the validated visitor submission."""
    return build_deterministic_summary(data)
