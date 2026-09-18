import hashlib
import hmac

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.assistant.models import AssistantUsageBucket


def _client_identity(request) -> str:
    """The same trusted-hop IP resolution the existing contact-form
    throttle uses (apps/inquiries/api/views.py's ClientIPThrottleMixin) -
    reused here only as raw input to an HMAC, never stored or logged."""
    if getattr(settings, "TRUST_CLOUDFLARE_CONNECTING_IP", False):
        cf_ip = request.META.get("HTTP_CF_CONNECTING_IP")
        if cf_ip:
            return cf_ip.strip()
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if xff:
        num_proxies = int(settings.REST_FRAMEWORK.get("NUM_PROXIES") or 0)
        hops = [part.strip() for part in xff.split(",") if part.strip()]
        if num_proxies and len(hops) >= num_proxies:
            return hops[-num_proxies]
        if hops:
            return hops[0]
    return request.META.get("REMOTE_ADDR", "") or "unknown"


def anonymous_key_hash(request) -> str:
    """HMAC-SHA256 of the client identity, keyed by the Django secret key.
    One-way: the raw identity is never recoverable from the stored hash,
    and never stored or logged anywhere itself."""
    identity = _client_identity(request)
    digest = hmac.new(settings.SECRET_KEY.encode("utf-8"), identity.encode("utf-8"), hashlib.sha256)
    return digest.hexdigest()


@transaction.atomic
def check_and_increment(key_hash: str, daily_limit: int) -> tuple[bool, int]:
    """Atomically increments today's request count for this anonymous key
    and reports whether the request is allowed under `daily_limit`. A
    request that is NOT allowed still increments `blocked_count` (for
    visibility) but not `request_count`, so a caller hammering the
    endpoint after being blocked cannot itself inflate the quota further.

    Returns (allowed, remaining_after_this_request).
    """
    today = timezone.now().date()
    bucket, _ = AssistantUsageBucket.objects.select_for_update().get_or_create(
        anonymous_key_hash=key_hash, bucket_date=today
    )
    if bucket.request_count >= daily_limit:
        bucket.blocked_count += 1
        bucket.save(update_fields=["blocked_count", "updated_at"])
        return False, 0

    bucket.request_count += 1
    bucket.save(update_fields=["request_count", "updated_at"])
    return True, max(0, daily_limit - bucket.request_count)
