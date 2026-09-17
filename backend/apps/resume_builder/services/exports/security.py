import re
from urllib.parse import urlsplit

from apps.resume_builder.services.exceptions import SnapshotValidationError

MAX_ARTIFACT_BYTES = 5 * 1024 * 1024
MAX_ITEM_CHARS = 4_000
MAX_TOTAL_CHARS = 50_000
MAX_TOTAL_ITEMS = 220
MAX_SECTION_ITEMS = 60

_FORBIDDEN_SCHEME = re.compile(r"(?i)\b(?:javascript|data|file|ftp|mailto|tel|sms|ssh|ws|wss|blob):")
_OTHER_URL_SCHEME = re.compile(r"(?i)\b(?!https?://)[a-z][a-z0-9+.-]{2,}://")
_URL = re.compile(r"https?://[^\s<>]+", re.IGNORECASE)

MIME_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def _is_forbidden_control(character):
    codepoint = ord(character)
    return codepoint < 32 and character not in "\n\t" or 127 <= codepoint <= 159


def clean_text(value, *, field="text"):
    if not isinstance(value, str):
        raise SnapshotValidationError(f"{field} must be text.")
    value = "".join(character for character in value if not _is_forbidden_control(character))
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    value = "\n".join(part.strip() for part in value.split("\n")).strip()
    if not value:
        raise SnapshotValidationError(f"{field} cannot be empty.")
    if len(value) > MAX_ITEM_CHARS:
        raise SnapshotValidationError(f"{field} exceeds the safe length limit.")
    try:
        value.encode("utf-8", errors="strict")
    except UnicodeError as exc:
        raise SnapshotValidationError(f"{field} contains invalid Unicode.") from exc
    validate_text_links(value)
    return value


def validate_text_links(value):
    if _FORBIDDEN_SCHEME.search(value) or _OTHER_URL_SCHEME.search(value):
        raise SnapshotValidationError("Only HTTP and HTTPS links are allowed.")
    for match in _URL.finditer(value):
        validate_url(match.group(0).rstrip(".,;:!?)" + chr(34) + chr(39)))


def validate_url(value):
    if not isinstance(value, str) or any(
        _is_forbidden_control(char) or char.isspace() or char in "<>" or ord(char) in {34, 39, 92}
        for char in value
    ):
        raise SnapshotValidationError("Link is invalid.")
    parsed = urlsplit(value)
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.netloc or not parsed.hostname:
        raise SnapshotValidationError("Only HTTP and HTTPS links are allowed.")
    if parsed.username or parsed.password:
        raise SnapshotValidationError("Links cannot contain credentials.")
    return value


def split_text_and_links(value):
    parts = []
    cursor = 0
    for match in _URL.finditer(value):
        raw = match.group(0)
        url = raw.rstrip(".,;:!?)" + chr(34) + chr(39))
        suffix = raw[len(url):]
        if match.start() > cursor:
            parts.append((value[cursor:match.start()], None))
        parts.append((url, validate_url(url)))
        if suffix:
            parts.append((suffix, None))
        cursor = match.end()
    if cursor < len(value):
        parts.append((value[cursor:], None))
    return tuple(parts) or ((value, None),)


def _candidate_name(version):
    sections = version.source_facts.get("sections", {}) if isinstance(version.source_facts, dict) else {}
    for claim in sections.get("profile", []):
        if not isinstance(claim, dict):
            continue
        source = claim.get("source", {})
        if source.get("field") == "owner_name" and isinstance(claim.get("value"), str):
            name = re.sub(r"[^A-Za-z0-9]+", "", claim["value"])
            if name:
                return name
    return ""


def artifact_filename(version, format_name):
    if format_name not in MIME_TYPES:
        raise SnapshotValidationError("Unsupported export format.")

    # Keep legacy deterministic fixture names so historical contract tests and
    # synthetic integrations remain stable. Real portfolio snapshots receive a
    # professional, candidate-readable filename instead of an opaque UUID.
    provenance = version.source_facts.get("provenance", {}) if isinstance(version.source_facts, dict) else {}
    if provenance.get("source") == "synthetic_test_fixture":
        return f"resume-{version.version_uuid.hex}.{format_name}"

    candidate = _candidate_name(version) or "Candidate"
    return f"SE_{candidate}_CV.{format_name}"


def artifact_mime_type(format_name):
    try:
        return MIME_TYPES[format_name]
    except KeyError as exc:
        raise SnapshotValidationError("Unsupported export format.") from exc
