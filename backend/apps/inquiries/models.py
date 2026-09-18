import re
import secrets

from django.core.exceptions import ValidationError
from django.db import IntegrityError, models, transaction

from apps.core.models import TimeStampedModel
from apps.portfolio.models import Service

# Unambiguous alphabet - no 0/O or 1/I, so a reference ID read aloud or
# copy-pasted from an email never has a visually-confusable character.
REFERENCE_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
REFERENCE_ID_LENGTH = 8
REFERENCE_ID_PREFIX = "SK-"
REFERENCE_ID_MAX_ATTEMPTS = 5

# Mirrors web/src/content/contact.ts's CONTACT_INTENTS values exactly -
# keep in sync if that list ever changes.
CONTACT_INTENT_CHOICES = (
    "general",
    "hiring",
    "freelance_project",
    "api_backend",
    "full_stack",
    "improvement",
)

# Mirrors the site's real routes (web/src/app/**/page.tsx) - an enquiry's
# source_page is metadata about where the visitor was, not free text, so
# anything outside this shape is rejected rather than stored.
SOURCE_PAGE_PATTERN = re.compile(
    r"^/("
    r"about|contact|privacy|resume|skills|experience"
    r"|work(/[a-z0-9-]{1,100})?"
    r"|services(/[a-z0-9-]{1,100})?"
    r")?$"
)


def generate_reference_id() -> str:
    suffix = "".join(secrets.choice(REFERENCE_ID_ALPHABET) for _ in range(REFERENCE_ID_LENGTH))
    return f"{REFERENCE_ID_PREFIX}{suffix}"


def validate_intent(value: str) -> None:
    if value and value not in CONTACT_INTENT_CHOICES:
        raise ValidationError("Unrecognized intent.")


def validate_source_page(value: str) -> None:
    if value and not SOURCE_PAGE_PATTERN.match(value):
        raise ValidationError("Unrecognized source page.")


class ReviewStatus(models.TextChoices):
    NEW = "new", "New"
    REVIEWED = "reviewed", "Reviewed"
    CONTACTED = "contacted", "Contacted"
    QUALIFIED = "qualified", "Qualified"
    CLOSED = "closed", "Closed"
    SPAM = "spam", "Spam"


class EmailDeliveryStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SENT = "sent", "Sent"
    FAILED = "failed", "Failed"
    SKIPPED = "skipped", "Skipped"


class SheetsDeliveryStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SYNCED = "synced", "Synced"
    FAILED = "failed", "Failed"
    SKIPPED = "skipped", "Skipped"
    NOT_CONFIGURED = "not_configured", "Not configured"


class EnquiryTrackingFields(models.Model):
    """Shared by ContactMessage and ServiceRequest: the public reference
    ID, submission idempotency key, intent/source metadata, honeypot
    result, and per-channel (email/Sheets) delivery tracking. See
    CONTACT-OPS-01's plan for why this is one mixin rather than a
    separate model - both concrete models need identical tracking and
    the row itself is the "outbox" (no separate queue table)."""

    reference_id = models.CharField(max_length=20, unique=True, editable=False, blank=True)
    # Client-generated idempotency key (crypto.randomUUID() per form-fill
    # session). NULL for any client that doesn't send one - Postgres
    # treats multiple NULLs in a unique column as distinct, so that never
    # collides. A concrete value is what lets a retried HTTP submission
    # return the existing reference_id instead of creating a duplicate row.
    submission_id = models.UUIDField(unique=True, null=True, blank=True)
    intent = models.CharField(max_length=32, blank=True, validators=[validate_intent])
    source_page = models.CharField(max_length=200, blank=True, validators=[validate_source_page])
    # Never serialized publicly. True means the write-only honeypot field
    # was non-empty on submission - see services/delivery.py, which treats
    # this as terminal (status forced to spam, no email/Sheets attempted).
    honeypot_triggered = models.BooleanField(default=False, editable=False)

    email_status = models.CharField(
        max_length=16, choices=EmailDeliveryStatus.choices, default=EmailDeliveryStatus.PENDING
    )
    email_attempts = models.PositiveSmallIntegerField(default=0)
    email_last_attempt_at = models.DateTimeField(null=True, blank=True)
    # Sanitized summary only (exception class + generic text) - never the
    # raw exception message, which can embed SMTP/OAuth connection detail.
    email_error = models.CharField(max_length=255, blank=True)

    sheets_status = models.CharField(
        max_length=16, choices=SheetsDeliveryStatus.choices, default=SheetsDeliveryStatus.PENDING
    )
    sheets_attempts = models.PositiveSmallIntegerField(default=0)
    sheets_last_attempt_at = models.DateTimeField(null=True, blank=True)
    sheets_error = models.CharField(max_length=255, blank=True)

    class Meta:
        abstract = True

    @property
    def delivery_state(self) -> str:
        """Derived, never stored - always computed live from the two
        independent per-channel fields plus status, so it can never drift
        into a misleading persisted aggregate (CONTACT-OPS-01 correction).
        Admin display only; automation must read email_status/sheets_status
        directly, never this property."""
        if self.status == ReviewStatus.SPAM:
            return "spam"

        email_attempted = self.email_status != EmailDeliveryStatus.PENDING
        sheets_attempted = self.sheets_status != SheetsDeliveryStatus.PENDING
        if not email_attempted or not sheets_attempted:
            return "delivery_pending"

        email_ok = self.email_status == EmailDeliveryStatus.SENT
        sheets_ok = self.sheets_status in (SheetsDeliveryStatus.SYNCED, SheetsDeliveryStatus.NOT_CONFIGURED)
        if email_ok and sheets_ok:
            return "delivered"
        return "delivered_with_warning"

    def _generate_unique_reference_id(self) -> str:
        model_cls = type(self)
        for _ in range(REFERENCE_ID_MAX_ATTEMPTS):
            candidate = generate_reference_id()
            if not model_cls.objects.filter(reference_id=candidate).exists():
                return candidate
        raise RuntimeError("Could not generate a unique reference ID after multiple attempts.")

    def save(self, *args, **kwargs):
        if not self.reference_id:
            self.reference_id = self._generate_unique_reference_id()

        model_cls = type(self)
        attempts_remaining = REFERENCE_ID_MAX_ATTEMPTS
        while True:
            try:
                with transaction.atomic():
                    super().save(*args, **kwargs)
                return
            except IntegrityError:
                attempts_remaining -= 1
                # Only auto-recover a genuine reference_id collision - a
                # submission_id collision is a legitimate idempotent
                # replay the caller (the public view) is responsible for
                # resolving, so it must propagate unchanged rather than
                # being silently retried under a new reference_id here.
                reference_id_collided = model_cls.objects.filter(reference_id=self.reference_id).exists()
                if not reference_id_collided:
                    raise
                if attempts_remaining <= 0:
                    raise RuntimeError(
                        "Could not generate a unique reference ID after multiple attempts."
                    ) from None
                self.reference_id = generate_reference_id()


class ContactMessage(EnquiryTrackingFields, TimeStampedModel):
    sender_name = models.CharField(max_length=150)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    service_type_text = models.CharField(max_length=255, blank=True)
    message = models.TextField()
    status = models.CharField(max_length=12, choices=ReviewStatus.choices, default=ReviewStatus.NEW)
    admin_notes = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.sender_name} - {self.subject}"


class EnquirySource(models.TextChoices):
    """Where a ServiceRequest row originated. CONTACT_FORM (the default,
    for backward compatibility with every existing row) is the classic
    free-form project intent on the Contact page; PROJECT_DISCOVERY is
    the structured guided-intake wizard (PORTFOLIO-ASSISTANTS-01 section
    12); ASSISTANT is reserved for a future assistant-initiated submission
    and is not produced by anything in this phase."""

    CONTACT_FORM = "contact_form", "Contact form"
    PROJECT_DISCOVERY = "project_discovery", "Project discovery"
    ASSISTANT = "assistant", "Assistant"


class ServiceRequest(EnquiryTrackingFields, TimeStampedModel):
    sender_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True, related_name="service_requests")
    service_type_text = models.CharField(max_length=255, blank=True)
    subject = models.CharField(max_length=200)
    message = models.TextField()
    budget_range = models.CharField(max_length=120, blank=True)
    timeline = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=12, choices=ReviewStatus.choices, default=ReviewStatus.NEW)
    admin_notes = models.TextField(blank=True)

    # --- PORTFOLIO-ASSISTANTS-01 section 13: additive, nullable/blank-safe
    # fields for the structured Client Project Discovery intake. Every
    # existing ServiceRequest row (source defaults to CONTACT_FORM) is
    # unaffected - these are simply blank/empty for it, as they always
    # were before this migration. `message`/`subject` above remain the
    # single required free-text fields for both flows: for a discovery
    # submission they are populated from `discovery_summary` /
    # `project_type` rather than typed by hand - see
    # apps.inquiries.api.serializers.ProjectDiscoverySerializer. ---
    source = models.CharField(max_length=20, choices=EnquirySource.choices, default=EnquirySource.CONTACT_FORM)
    organization = models.CharField(max_length=200, blank=True)
    project_type = models.CharField(max_length=120, blank=True)
    project_stage = models.CharField(max_length=120, blank=True)
    business_problem = models.TextField(blank=True)
    target_users = models.CharField(max_length=300, blank=True)
    expected_outcome = models.TextField(blank=True)
    required_features = models.JSONField(default=list, blank=True)
    optional_features = models.JSONField(default=list, blank=True)
    existing_assets = models.TextField(blank=True)
    technical_preferences = models.CharField(max_length=300, blank=True)
    preferred_contact_method = models.CharField(max_length=20, blank=True)
    discovery_summary = models.TextField(blank=True)
    consent_given = models.BooleanField(default=False)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.sender_name} - {self.subject}"
