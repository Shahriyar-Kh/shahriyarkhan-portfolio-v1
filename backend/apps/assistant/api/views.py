from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.assistant.api.serializers import AssistantQuerySerializer
from apps.assistant.services.assistant import answer_query
from apps.assistant.services.usage import anonymous_key_hash, check_and_increment


class ClientIPThrottleMixin:
    """Same trusted-hop convention as apps.inquiries.api.views's mixin of
    the same name - duplicated rather than imported so this app has no
    dependency on another app's view module for a ten-line utility."""

    def get_ident(self, request):
        if getattr(settings, "TRUST_CLOUDFLARE_CONNECTING_IP", False):
            cf_ip = request.META.get("HTTP_CF_CONNECTING_IP")
            if cf_ip:
                return cf_ip.strip()
        return super().get_ident(request)


class AssistantQueryThrottle(ClientIPThrottleMixin, ScopedRateThrottle):
    pass


def _source_payload(evidence_bundle, source_ids):
    by_id = {item.source_id: item for item in evidence_bundle}
    sources = []
    for source_id in source_ids:
        item = by_id.get(source_id)
        if item is None:
            continue
        sources.append({"source_id": item.source_id, "type": item.source_type, "title": item.title, "public_path": item.public_path})
    return sources


class PublicAssistantQueryView(APIView):
    """The public grounded-assistant endpoint (PORTFOLIO-ASSISTANTS-01
    section 11). Anonymous, database-backed daily quota in addition to
    the per-hour DRF throttle below, strict message length, and no
    persistence of any visitor message or generated answer - only the
    anonymous, hashed usage counter in AssistantUsageBucket survives the
    request."""

    permission_classes = (AllowAny,)
    throttle_classes = (AssistantQueryThrottle,)
    throttle_scope = "assistant_query"

    def post(self, request):
        serializer = AssistantQuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.validated_data["message"]

        key_hash = anonymous_key_hash(request)
        daily_limit = getattr(settings, "ASSISTANT_DAILY_LIMIT", 40)
        allowed, remaining = check_and_increment(key_hash, daily_limit)
        if not allowed:
            return Response(
                {
                    "answer": "You've reached today's question limit for the assistant. Please try again tomorrow, or contact Shahriyar directly.",
                    "intent": "INSUFFICIENT_EVIDENCE",
                    "sources": [],
                    "recommended_projects": [],
                    "recommended_services": [],
                    "handoff": {"active": True, "reason": "quota_exceeded"},
                    "remaining_requests": 0,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        answer, fallback_used, evidence_bundle = answer_query(message)

        return Response(
            {
                "answer": answer.answer,
                "intent": answer.intent,
                "sources": _source_payload(evidence_bundle, answer.source_ids),
                "recommended_projects": answer.recommended_project_slugs,
                "recommended_services": answer.recommended_service_slugs,
                "handoff": {"active": answer.handoff, "reason": answer.handoff_reason} if answer.handoff else {"active": False, "reason": None},
                "remaining_requests": remaining,
                "fallback_used": fallback_used,
            },
            status=status.HTTP_200_OK,
        )
