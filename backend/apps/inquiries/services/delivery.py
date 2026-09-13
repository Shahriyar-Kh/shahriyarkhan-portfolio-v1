import logging
import time

from django.conf import settings
from django.utils import timezone

from apps.inquiries.models import ContactMessage, EmailDeliveryStatus, ReviewStatus, ServiceRequest, SheetsDeliveryStatus
from apps.inquiries.services.email import send_enquiry_notification
from apps.inquiries.services.sheets import is_sheets_configured, sync_enquiry_row

logger = logging.getLogger(__name__)

_EMAIL_TEMPLATES = {
    ContactMessage: ("contact_notification", "New Contact Message"),
    ServiceRequest: ("service_request_notification", "New Service Request"),
}


def _sheets_attempt_timeout_seconds() -> float:
    return getattr(settings, "DELIVERY_ATTEMPT_TIMEOUT_SECONDS", 3)


def _total_budget_seconds() -> float:
    return getattr(settings, "DELIVERY_TOTAL_TIMEOUT_SECONDS", 6)


def attempt_email_notification(obj) -> None:
    """Exactly one synchronous attempt, bound only by the already-bounded
    transport itself (settings.EMAIL_TIMEOUT, which Django's SMTP backend
    and the Gmail API backend both honor natively). Called both for a
    brand-new enquiry and, separately, by the authenticated admin "retry
    email" action - either way this is the single unit of work.

    CONTACT-OPS-01-PROD-INCIDENT-01: this used to run inside a daemon
    thread with an independent join() timeout layered on top of the
    transport's own timeout. When the join expired first, the row was
    marked FAILED while the thread kept sending in the background with
    no way to ever record what actually happened - the status could be
    wrong, and a later admin retry could produce a genuine duplicate
    email if that orphaned send also eventually succeeded. There is no
    thread here anymore: whatever this call raises (or doesn't) is the
    real, final, synchronously-known outcome - never ambiguous.
    """
    template_base, subject_label = _EMAIL_TEMPLATES[type(obj)]
    obj.email_attempts += 1
    obj.email_last_attempt_at = timezone.now()

    try:
        send_enquiry_notification(obj, template_base=template_base, subject_label=subject_label)
    except Exception as exc:
        obj.email_status = EmailDeliveryStatus.FAILED
        obj.email_error = f"{type(exc).__name__}: delivery failed"
        logger.error(
            "Email notification failed: type=%s id=%s exception_class=%s",
            type(obj).__name__,
            obj.pk,
            type(exc).__name__,
        )
    else:
        obj.email_status = EmailDeliveryStatus.SENT
        obj.email_error = ""

    obj.save(update_fields=["email_status", "email_attempts", "email_last_attempt_at", "email_error"])


def attempt_sheets_sync(obj, timeout_seconds: float | None = None) -> None:
    """Exactly one synchronous attempt, same reuse contract and the same
    "no thread, no ambiguity" guarantee as attempt_email_notification
    above. `timeout_seconds`, when given, overrides the Sheets
    transport's own httplib2 timeout for just this call - used by
    process_new_enquiry() to shrink this channel's bound to whatever of
    the total delivery budget remains after the email attempt. This is
    safe to do here (unlike the old thread-join approach) because
    httplib2's timeout is a real socket-level bound with no background
    work left running after it fires.
    """
    if not is_sheets_configured():
        obj.sheets_status = SheetsDeliveryStatus.NOT_CONFIGURED
        obj.save(update_fields=["sheets_status"])
        return

    obj.sheets_attempts += 1
    obj.sheets_last_attempt_at = timezone.now()

    try:
        sync_enquiry_row(obj, timeout=timeout_seconds)
    except Exception as exc:
        obj.sheets_status = SheetsDeliveryStatus.FAILED
        obj.sheets_error = f"{type(exc).__name__}: sync failed"
        logger.error(
            "Sheets sync failed: type=%s id=%s exception_class=%s",
            type(obj).__name__,
            obj.pk,
            type(exc).__name__,
        )
    else:
        obj.sheets_status = SheetsDeliveryStatus.SYNCED
        obj.sheets_error = ""

    obj.save(update_fields=["sheets_status", "sheets_attempts", "sheets_last_attempt_at", "sheets_error"])


def process_new_enquiry(obj) -> None:
    """Called once, synchronously, for a genuinely new (non-replay)
    enquiry row - the row and its reference_id are already committed
    before this runs, so nothing here can lose or duplicate the lead.

    Honeypot submissions are terminal: marked spam immediately, neither
    channel is ever attempted. Otherwise, at most one synchronous attempt
    per channel runs, bounded only by each channel's own already-bounded
    transport (EMAIL_TIMEOUT; the Sheets httplib2 timeout) - there is no
    independent outer timeout layered on top anymore (see
    attempt_email_notification's docstring for why that was removed).
    The practical consequence: the visitor's HTTP response now waits for
    up to EMAIL_TIMEOUT + (the Sheets timeout, if attempted) - keep those
    two settings sane; there is no separate hard cap shortening them
    further. What "preserving the total delivery budget" means here is
    narrower and safer than before: Sheets is skipped entirely (left
    PENDING) if the email attempt alone already used up the whole budget,
    and otherwise its own timeout is shrunk to whatever of the budget
    remains - never started with no time left, never running detached.
    """
    if obj.honeypot_triggered:
        obj.status = ReviewStatus.SPAM
        obj.email_status = EmailDeliveryStatus.SKIPPED
        obj.sheets_status = SheetsDeliveryStatus.SKIPPED
        obj.save(update_fields=["status", "email_status", "sheets_status"])
        return

    total_budget = _total_budget_seconds()
    started = time.monotonic()

    attempt_email_notification(obj)

    remaining = total_budget - (time.monotonic() - started)
    if remaining <= 0:
        # Budget exhausted by the email attempt alone - leave Sheets
        # PENDING (never started) rather than beginning a second call
        # with no time left; the admin retry action picks it up.
        return
    attempt_sheets_sync(obj, timeout_seconds=min(_sheets_attempt_timeout_seconds(), remaining))
