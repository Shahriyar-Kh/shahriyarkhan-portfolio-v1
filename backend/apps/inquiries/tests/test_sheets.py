from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings

from apps.inquiries.models import ContactMessage, SheetsDeliveryStatus
from apps.inquiries.services import sheets
from apps.inquiries.services.delivery import attempt_sheets_sync
from apps.inquiries.services.sanitize import neutralize_formula_prefix

SHEETS_SETTINGS = dict(
    GOOGLE_SHEETS_ENABLED=True,
    GOOGLE_SHEETS_SPREADSHEET_ID="fake-sheet-id",
    GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON='{"type": "service_account"}',
)


def make_contact(**overrides):
    defaults = dict(sender_name="Test", email="test@example.com", subject="Subj", message="A test message body.")
    defaults.update(overrides)
    return ContactMessage.objects.create(**defaults)


def _fake_service(existing_reference_ids=()):
    service = MagicMock()
    service.spreadsheets.return_value.values.return_value.get.return_value.execute.return_value = {
        "values": [[ref] for ref in existing_reference_ids]
    }
    service.spreadsheets.return_value.values.return_value.append.return_value.execute.return_value = {}
    return service


class SheetsConfigurationTests(TestCase):
    def test_unconfigured_by_default(self):
        self.assertFalse(sheets.is_sheets_configured())

    @override_settings(**SHEETS_SETTINGS)
    def test_configured_when_all_settings_present(self):
        self.assertTrue(sheets.is_sheets_configured())

    def test_unconfigured_sync_is_a_no_op_and_marks_not_configured(self):
        obj = make_contact()
        attempt_sheets_sync(obj)
        self.assertEqual(obj.sheets_status, SheetsDeliveryStatus.NOT_CONFIGURED)


class SheetsSyncTests(TestCase):
    @override_settings(**SHEETS_SETTINGS)
    def test_success_appends_row_with_raw_input_option(self):
        obj = make_contact()
        service = _fake_service()
        with patch("apps.inquiries.services.sheets.build_service", return_value=service):
            attempt_sheets_sync(obj)

        self.assertEqual(obj.sheets_status, SheetsDeliveryStatus.SYNCED)
        append_call = service.spreadsheets.return_value.values.return_value.append
        append_call.assert_called_once()
        self.assertEqual(append_call.call_args.kwargs["valueInputOption"], "RAW")

    @override_settings(**SHEETS_SETTINGS)
    def test_failure_after_db_save_does_not_lose_the_row(self):
        obj = make_contact()
        with patch("apps.inquiries.services.delivery.sync_enquiry_row", side_effect=RuntimeError("boom")):
            attempt_sheets_sync(obj)

        self.assertEqual(obj.sheets_status, SheetsDeliveryStatus.FAILED)
        self.assertEqual(ContactMessage.objects.count(), 1)

    @override_settings(**SHEETS_SETTINGS)
    def test_remote_already_present_skips_duplicate_append(self):
        """Idempotency against the REMOTE sheet, not just local status -
        even if sheets_status were stale/PENDING, a reference ID already
        present in the sheet must never be appended twice."""
        obj = make_contact()
        service = _fake_service(existing_reference_ids=[obj.reference_id])
        with patch("apps.inquiries.services.sheets.build_service", return_value=service):
            attempt_sheets_sync(obj)

        self.assertEqual(obj.sheets_status, SheetsDeliveryStatus.SYNCED)
        service.spreadsheets.return_value.values.return_value.append.assert_not_called()

    @override_settings(**SHEETS_SETTINGS)
    def test_single_bounded_attempt_no_retry_loop(self):
        obj = make_contact()
        with patch("apps.inquiries.services.delivery.sync_enquiry_row") as mock_sync:
            attempt_sheets_sync(obj)
        mock_sync.assert_called_once()

    @override_settings(**SHEETS_SETTINGS)
    def test_formula_prefixed_cell_is_neutralized_before_sending(self):
        obj = make_contact(sender_name="=cmd|'/c calc'!A1")
        service = _fake_service()
        with patch("apps.inquiries.services.sheets.build_service", return_value=service):
            attempt_sheets_sync(obj)

        append_call = service.spreadsheets.return_value.values.return_value.append
        sent_row = append_call.call_args.kwargs["body"]["values"][0]
        sent_sender_name = sent_row[sheets.ROW_FIELDS.index("sender_name")]
        self.assertTrue(sent_sender_name.startswith("'"))


class FormulaSanitizeTests(TestCase):
    def test_neutralizes_dangerous_prefixes(self):
        for dangerous in ("=SUM(A1)", "+1+1", "-1-1", "@SUM(A1)", "\ttabbed", "\rcr", "\nlf"):
            self.assertTrue(neutralize_formula_prefix(dangerous).startswith("'"))

    def test_leaves_safe_values_untouched(self):
        self.assertEqual(neutralize_formula_prefix("Hello world"), "Hello world")
        self.assertEqual(neutralize_formula_prefix(""), "")
