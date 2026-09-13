from collections import Counter

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.inquiries.models import ContactMessage, ServiceRequest, SheetsDeliveryStatus
from apps.inquiries.services.sheets import REFERENCE_COLUMN_RANGE, build_service, is_sheets_configured


class Command(BaseCommand):
    help = (
        "Reconciles the Google Sheets mirror against the database: reports "
        "DB rows marked as synced that are missing from the sheet, and any "
        "duplicate reference IDs found in the sheet. Read-only by default."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--requeue-missing",
            action="store_true",
            help=(
                "For DB rows marked synced but missing from the sheet, reset "
                "sheets_status to pending so the existing single-attempt retry "
                "path (not a second write path) picks them up. Never writes "
                "to the sheet itself."
            ),
        )

    def handle(self, *args, **options):
        if not is_sheets_configured():
            self.stdout.write(self.style.WARNING("Google Sheets is not configured - nothing to reconcile."))
            return

        try:
            service = build_service()
            result = (
                service.spreadsheets()
                .values()
                .get(spreadsheetId=settings.GOOGLE_SHEETS_SPREADSHEET_ID, range=REFERENCE_COLUMN_RANGE)
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            raise CommandError(f"Could not read the sheet ({type(exc).__name__}).") from exc

        sheet_reference_ids = [row[0] for row in result.get("values", []) if row]
        sheet_counts = Counter(sheet_reference_ids)
        sheet_id_set = set(sheet_reference_ids)

        duplicates = sorted(ref for ref, count in sheet_counts.items() if count > 1)
        for ref in duplicates:
            self.stdout.write(self.style.ERROR(f"Duplicate in sheet: {ref} appears {sheet_counts[ref]} times."))

        missing_total = 0
        for model in (ContactMessage, ServiceRequest):
            synced_qs = model.objects.filter(sheets_status=SheetsDeliveryStatus.SYNCED)
            missing = [obj for obj in synced_qs if obj.reference_id not in sheet_id_set]
            for obj in missing:
                self.stdout.write(
                    self.style.WARNING(f"Missing from sheet: {obj.reference_id} ({model.__name__}, pk={obj.pk}).")
                )
            missing_total += len(missing)

            if options["requeue_missing"] and missing:
                with transaction.atomic():
                    model.objects.filter(pk__in=[obj.pk for obj in missing]).update(
                        sheets_status=SheetsDeliveryStatus.PENDING
                    )
                self.stdout.write(self.style.SUCCESS(f"Requeued {len(missing)} {model.__name__} row(s) for retry."))

        pending_or_failed_total = 0
        for model in (ContactMessage, ServiceRequest):
            pending_or_failed_total += model.objects.filter(
                sheets_status__in=[SheetsDeliveryStatus.PENDING, SheetsDeliveryStatus.FAILED]
            ).count()

        self.stdout.write(
            self.style.SUCCESS(
                f"Reconciliation complete: {len(duplicates)} duplicate reference ID(s) in sheet, "
                f"{missing_total} synced row(s) missing from sheet, "
                f"{pending_or_failed_total} row(s) still pending/failed."
            )
        )
