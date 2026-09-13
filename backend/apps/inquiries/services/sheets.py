import json

import google_auth_httplib2
import httplib2
from django.conf import settings
from google.oauth2 import service_account
from googleapiclient.discovery import build

from apps.inquiries.services.sanitize import neutralize_formula_prefix

SHEETS_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
REFERENCE_COLUMN_RANGE = "Sheet1!A:A"
APPEND_RANGE = "Sheet1!A:N"

# Order matches the brief's recommended column layout.
ROW_FIELDS = (
    "reference_id",
    "created_at",
    "intent",
    "sender_name",
    "email",
    "subject",
    "service_type_text",
    "budget_range",
    "timeline",
    "message",
    "source_page",
    "status",
    "email_status",
    "sheets_status",
)


def is_sheets_configured() -> bool:
    return bool(
        getattr(settings, "GOOGLE_SHEETS_ENABLED", False)
        and getattr(settings, "GOOGLE_SHEETS_SPREADSHEET_ID", "")
        and getattr(settings, "GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON", "")
    )


def build_service():
    info = json.loads(settings.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON)
    credentials = service_account.Credentials.from_service_account_info(info, scopes=SHEETS_SCOPES)
    timeout = getattr(settings, "DELIVERY_ATTEMPT_TIMEOUT_SECONDS", 3)
    authorized_http = google_auth_httplib2.AuthorizedHttp(credentials, http=httplib2.Http(timeout=timeout))
    return build("sheets", "v4", http=authorized_http, cache_discovery=False)


def _row_for(obj) -> list:
    raw_values = []
    for field in ROW_FIELDS:
        value = getattr(obj, field, "")
        if field == "created_at" and value:
            value = value.isoformat()
        raw_values.append("" if value is None else str(value))
    return [neutralize_formula_prefix(v) for v in raw_values]


def _reference_id_already_present(service, spreadsheet_id: str, reference_id: str) -> bool:
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=spreadsheet_id, range=REFERENCE_COLUMN_RANGE)
        .execute()
    )
    column = result.get("values", [])
    return any(row and row[0] == reference_id for row in column)


def sync_enquiry_row(obj) -> None:
    """Raises on failure - the caller (services/delivery.py) records the
    outcome. Idempotent against the REMOTE sheet, not just the local
    sheets_status: a prior attempt can have appended successfully and
    then crashed/timed out before the local status was updated, so this
    always checks the live sheet's reference-ID column before writing -
    the immutable reference ID is what guarantees one enquiry can never
    produce two rows, not the local flag alone.
    """
    spreadsheet_id = settings.GOOGLE_SHEETS_SPREADSHEET_ID
    service = build_service()
    if _reference_id_already_present(service, spreadsheet_id, obj.reference_id):
        return
    service.spreadsheets().values().append(
        spreadsheetId=spreadsheet_id,
        range=APPEND_RANGE,
        valueInputOption="RAW",
        insertDataOption="INSERT_ROWS",
        body={"values": [_row_for(obj)]},
    ).execute()
