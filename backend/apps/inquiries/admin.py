import csv

from django.contrib import admin
from django.http import HttpResponse
from django.utils.html import format_html

from apps.inquiries.models import ContactMessage, ReviewStatus, ServiceRequest
from apps.inquiries.services.delivery import attempt_email_notification, attempt_sheets_sync
from apps.inquiries.services.sanitize import neutralize_formula_prefix

# Everything the visitor originally submitted, plus the fields that only
# ever change through services/delivery.py or the retry actions below -
# none of it is hand-editable in the admin. Only `status` (review state)
# and `admin_notes` are, matching Phase 5's "never edit the visitor's
# original submission in place" requirement.
ORIGINAL_SUBMISSION_READONLY_FIELDS = (
    "reference_id",
    "submission_id",
    "sender_name",
    "email",
    "subject",
    "service_type_text",
    "message",
    "intent",
    "source_page",
    "honeypot_triggered",
    "email_status",
    "email_attempts",
    "email_last_attempt_at",
    "email_error",
    "sheets_status",
    "sheets_attempts",
    "sheets_last_attempt_at",
    "sheets_error",
    "created_at",
    "updated_at",
    "delivery_state",
    "reply_email",
)


def _make_status_action(value: str, label: str):
    def status_action(modeladmin, request, queryset):
        updated = queryset.update(status=value)
        modeladmin.message_user(request, f"Marked {updated} item(s) as {label}.")

    status_action.__name__ = f"mark_{value}"
    status_action.short_description = f"Mark as {label}"
    return status_action


def retry_email_notification(modeladmin, request, queryset):
    for obj in queryset:
        attempt_email_notification(obj)
    modeladmin.message_user(request, f"Retried email for {queryset.count()} item(s).")


retry_email_notification.short_description = "Retry email notification"


def retry_sheets_sync(modeladmin, request, queryset):
    for obj in queryset:
        attempt_sheets_sync(obj)
    modeladmin.message_user(request, f"Retried Google Sheets sync for {queryset.count()} item(s).")


retry_sheets_sync.short_description = "Retry Google Sheets sync"


def export_as_csv(modeladmin, request, queryset):
    """Every exported cell is run through neutralize_formula_prefix() -
    the same formula-injection defense used for the Sheets mirror -
    since a CSV opened later in Excel/Sheets is exactly as exploitable as
    a live spreadsheet row."""
    field_names = [f.name for f in modeladmin.model._meta.fields if f.name != "id"]
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f"attachment; filename={modeladmin.model._meta.model_name}_export.csv"
    writer = csv.writer(response)
    writer.writerow(field_names)
    for obj in queryset:
        writer.writerow([neutralize_formula_prefix(str(getattr(obj, name) or "")) for name in field_names])
    return response


export_as_csv.short_description = "Export selected as CSV"

_STATUS_ACTIONS = [_make_status_action(value, label) for value, label in ReviewStatus.choices]


class BaseEnquiryAdmin(admin.ModelAdmin):
    readonly_fields = ORIGINAL_SUBMISSION_READONLY_FIELDS
    list_filter = ("status", "intent", "email_status", "sheets_status", "created_at")
    search_fields = ("reference_id", "sender_name", "email", "subject")
    actions = [*_STATUS_ACTIONS, retry_email_notification, retry_sheets_sync, export_as_csv]

    @admin.display(description="Reply email")
    def reply_email(self, obj):
        return format_html('<a href="mailto:{0}">{0}</a>', obj.email)


@admin.register(ContactMessage)
class ContactMessageAdmin(BaseEnquiryAdmin):
    list_display = (
        "reference_id",
        "sender_name",
        "reply_email",
        "subject",
        "intent",
        "status",
        "delivery_state",
        "created_at",
    )


@admin.register(ServiceRequest)
class ServiceRequestAdmin(BaseEnquiryAdmin):
    list_display = (
        "reference_id",
        "sender_name",
        "reply_email",
        "subject",
        "service",
        "intent",
        "status",
        "delivery_state",
        "created_at",
    )
    list_filter = BaseEnquiryAdmin.list_filter + ("service",)
    search_fields = BaseEnquiryAdmin.search_fields + ("service_type_text",)
    # service/budget_range/timeline are ServiceRequest-only original
    # visitor-submitted fields, not present on ContactMessage, so they
    # aren't in the shared ORIGINAL_SUBMISSION_READONLY_FIELDS tuple.
    readonly_fields = BaseEnquiryAdmin.readonly_fields + ("service", "budget_range", "timeline")
