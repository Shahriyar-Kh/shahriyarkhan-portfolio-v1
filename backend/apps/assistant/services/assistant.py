"""Orchestrator: the one function the public API view calls
(PORTFOLIO-ASSISTANTS-01 section 2's pipeline, wired together).

    public portfolio data (public_knowledge.build_evidence_bundle)
        -> provider (Gemini, else deterministic fallback)
        -> validated StructuredAnswer
        -> this module's dict shape
        -> view
"""

import logging

from django.conf import settings

from apps.assistant.services.gemini_client import GeminiUnavailableError
from apps.assistant.services.providers import DeterministicFallbackProvider, GeminiAssistantProvider
from apps.assistant.services.public_knowledge import EvidenceItem, build_evidence_bundle
from apps.assistant.services.schema import StructuredAnswer

logger = logging.getLogger(__name__)

_FALLBACK = DeterministicFallbackProvider()


def _slugs_by_type(evidence_bundle: list[EvidenceItem], source_type: str) -> set[str]:
    return {item.source_id.split(":", 1)[1] for item in evidence_bundle if item.source_type == source_type}


def answer_query(message: str, context: list[str] | None = None) -> tuple[StructuredAnswer, bool, list[EvidenceItem]]:
    """Returns (answer, fallback_used, evidence_bundle) - the bundle is
    handed back so the view can resolve `source_ids` to public
    title/path pairs without a second query. Never raises: any provider
    failure is caught here and turned into a guaranteed deterministic
    answer, per section 6's "the portfolio must never become unusable
    because Gemini is unavailable"."""
    evidence_bundle = build_evidence_bundle()
    project_slugs = _slugs_by_type(evidence_bundle, "project")
    service_slugs = _slugs_by_type(evidence_bundle, "service")

    provider_name = getattr(settings, "AI_PROVIDER", "deterministic")
    if provider_name == "gemini":
        try:
            answer = GeminiAssistantProvider().generate_grounded_answer(
                message=message, evidence_bundle=evidence_bundle, project_slugs=project_slugs, service_slugs=service_slugs, context=context
            )
            return answer, False, evidence_bundle
        except GeminiUnavailableError as exc:
            logger.info("Assistant provider fallback used: reason_class=%s", type(exc).__name__)
        except Exception as exc:  # noqa: BLE001 - any unexpected provider failure must still fail open to the deterministic path
            logger.warning("Assistant provider raised an unexpected error: exception_class=%s", type(exc).__name__)

    answer = _FALLBACK.generate_grounded_answer(
        message=message, evidence_bundle=evidence_bundle, project_slugs=project_slugs, service_slugs=service_slugs, context=context
    )
    return answer, provider_name == "gemini", evidence_bundle
