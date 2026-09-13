import logging
import threading
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


def _attempt_timeout_seconds() -> float:
    return getattr(settings, "DELIVERY_ATTEMPT_TIMEOUT_SECONDS", 3)


def _total_budget_seconds() -> float:
    return getattr(settings, "DELIVERY_TOTAL_TIMEOUT_SECONDS", 6)


def _run_with_timeout(fn, timeout_seconds: float):
    """Runs fn() in a daemon thread and waits up to timeout_seconds so a
    slow/hanging SMTP or Sheets call can never hold the visitor's HTTP
    request open indefinitely. Returns (completed, exception_or_none).

    Python threads cannot be forcibly killed: if fn() is still running
    when the timeout elapses, this returns (False, None) immediately and
    the request proceeds - that's what actually bounds response time.
    The orphaned thread keeps running in the background and will still
    write its own outcome via its own bounded obj.save(update_fields=...)
    call when it eventually finishes; that write only ever touches the
    delivery-status fields (never the visitor's original content) and
    losing a race with the "timed out" write already recorded here is an
    accepted, narrow edge case, not a correctness issue for the enquiry
    itself.
    """
    outcome: dict = {}

    def target():
        try:
            fn()
        except Exception as exc:  # noqa: BLE001 - deliberately broad, see module docstring
            outcome["error"] = exc

    thread = threading.Thread(target=target, daemon=True)
    thread.start()
    thread.join(timeout_seconds)
    if thread.is_alive():
        return False, None
    return True, outcome.get("error")


def attempt_email_notification(obj, timeout_seconds: float | None = None) -> None:
    """Exactly one bounded attempt. Called both for a brand-new enquiry
    and, separately, by the authenticated admin "retry email" action -
    either way this is the single unit of work, never a retry loop with
    sleeps. timeout_seconds defaults to the per-channel attempt timeout;
    process_new_enquiry() may pass a smaller value to keep the *total*
    wall-clock budget strict regardless of how the per-channel timeout is
    configured."""
    template_base, subject_label = _EMAIL_TEMPLATES[type(obj)]
    obj.email_attempts += 1
    obj.email_last_attempt_at = timezone.now()

    completed, error = _run_with_timeout(
        lambda: send_enquiry_notification(obj, template_base=template_base, subject_label=subject_label),
        timeout_seconds if timeout_seconds is not None else _attempt_timeout_seconds(),
    )
    if not completed:
        obj.email_status = EmailDeliveryStatus.FAILED
        obj.email_error = "timed out"
        logger.error("Email notification timed out: type=%s id=%s", type(obj).__name__, obj.pk)
    elif error is not None:
        obj.email_status = EmailDeliveryStatus.FAILED
        obj.email_error = f"{type(error).__name__}: delivery failed"
        logger.error(
            "Email notification failed: type=%s id=%s exception_class=%s",
            type(obj).__name__,
            obj.pk,
            type(error).__name__,
        )
    else:
        obj.email_status = EmailDeliveryStatus.SENT
        obj.email_error = ""

    obj.save(update_fields=["email_status", "email_attempts", "email_last_attempt_at", "email_error"])


def attempt_sheets_sync(obj, timeout_seconds: float | None = None) -> None:
    """Exactly one bounded attempt, same reuse contract as
    attempt_email_notification above."""
    if not is_sheets_configured():
        obj.sheets_status = SheetsDeliveryStatus.NOT_CONFIGURED
        obj.save(update_fields=["sheets_status"])
        return

    obj.sheets_attempts += 1
    obj.sheets_last_attempt_at = timezone.now()

    completed, error = _run_with_timeout(
        lambda: sync_enquiry_row(obj), timeout_seconds if timeout_seconds is not None else _attempt_timeout_seconds()
    )
    if not completed:
        obj.sheets_status = SheetsDeliveryStatus.FAILED
        obj.sheets_error = "timed out"
        logger.error("Sheets sync timed out: type=%s id=%s", type(obj).__name__, obj.pk)
    elif error is not None:
        obj.sheets_status = SheetsDeliveryStatus.FAILED
        obj.sheets_error = f"{type(error).__name__}: sync failed"
        logger.error(
            "Sheets sync failed: type=%s id=%s exception_class=%s",
            type(obj).__name__,
            obj.pk,
            type(error).__name__,
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
    channel is ever attempted. Otherwise, at most one bounded attempt per
    channel runs under a strict overall wall-clock budget - there is no
    background worker, so this function's return IS what the visitor's
    HTTP response waits on; the budget exists to keep that wait bounded,
    not to make it zero. The second channel's own timeout is clamped to
    whatever of the total budget remains after the first attempt, so the
    combined wall-clock time can never exceed the total budget regardless
    of how the per-channel timeout is configured (summing two independent
    per-channel timeouts would not give that guarantee on its own).
    """
    if obj.honeypot_triggered:
        obj.status = ReviewStatus.SPAM
        obj.email_status = EmailDeliveryStatus.SKIPPED
        obj.sheets_status = SheetsDeliveryStatus.SKIPPED
        obj.save(update_fields=["status", "email_status", "sheets_status"])
        return

    total_budget = _total_budget_seconds()
    started = time.monotonic()

    attempt_email_notification(obj, timeout_seconds=min(_attempt_timeout_seconds(), total_budget))

    remaining = total_budget - (time.monotonic() - started)
    if remaining <= 0:
        # Budget exhausted after the email attempt alone - leave Sheets
        # PENDING (never started) rather than beginning a second bounded
        # call with no time left; the admin retry action picks it up.
        return
    attempt_sheets_sync(obj, timeout_seconds=min(_attempt_timeout_seconds(), remaining))
