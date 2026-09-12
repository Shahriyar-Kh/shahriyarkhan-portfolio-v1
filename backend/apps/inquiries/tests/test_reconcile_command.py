import io
from unittest.mock import MagicMock, patch

from django.core.management import call_command
from django.test import TestCase, override_settings

from apps.inquiries.models import ContactMessage, SheetsDeliveryStatus

SHEETS_SETTINGS = dict(
    GOOGLE_SHEETS_ENABLED=True,
    GOOGLE_SHEETS_SPREADSHEET_ID="fake-sheet-id",
    GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON='{"type": "service_account"}',
)


def make_contact(**overrides):
    defaults = dict(sender_name="Test", email="test@example.com", subject="Subj", message="A test message body.")
    defaults.update(overrides)
    return ContactMessage.objects.create(**defaults)


def _fake_service(reference_ids):
    service = MagicMock()
    service.spreadsheets.return_value.values.return_value.get.return_value.execute.return_value = {
        "values": [[ref] for ref in reference_ids]
    }
    return service


class ReconcileUnconfiguredTests(TestCase):
    def test_reports_and_exits_cleanly_when_unconfigured(self):
        out = io.StringIO()
        call_command("reconcile_sheets_sync", stdout=out)
        self.assertIn("not configured", out.getvalue().lower())


@override_settings(**SHEETS_SETTINGS)
class ReconcileConfiguredTests(TestCase):
    def test_detects_missing_and_duplicate_rows(self):
        synced_but_missing = make_contact(sheets_status=SheetsDeliveryStatus.SYNCED)
        present = make_contact(email="present@example.com", sheets_status=SheetsDeliveryStatus.SYNCED)

        service = _fake_service([present.reference_id, "SK-DUPDUPDU", "SK-DUPDUPDU"])
        out = io.StringIO()
        with patch("apps.inquiries.management.commands.reconcile_sheets_sync.build_service", return_value=service):
            call_command("reconcile_sheets_sync", stdout=out)

        output = out.getvalue()
        self.assertIn(f"Missing from sheet: {synced_but_missing.reference_id}", output)
        self.assertIn("Duplicate in sheet: SK-DUPDUPDU", output)
        self.assertNotIn(f"Missing from sheet: {present.reference_id}", output)

    def test_requeue_missing_only_touches_the_database(self):
        synced_but_missing = make_contact(sheets_status=SheetsDeliveryStatus.SYNCED)
        service = _fake_service([])

        with patch("apps.inquiries.management.commands.reconcile_sheets_sync.build_service", return_value=service):
            call_command("reconcile_sheets_sync", "--requeue-missing", stdout=io.StringIO())

        synced_but_missing.refresh_from_db()
        self.assertEqual(synced_but_missing.sheets_status, SheetsDeliveryStatus.PENDING)
        service.spreadsheets.return_value.values.return_value.append.assert_not_called()
