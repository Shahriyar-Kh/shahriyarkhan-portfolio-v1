from apps.resume_builder.models import ResumeExport
from apps.resume_builder.services.exceptions import ExportIntegrityError
from apps.resume_builder.services.lifecycle import validate_generated_export


def resolve_downloadable_export(version, format_name):
    """The single source of truth for "is this format really downloadable
    right now" - used identically by the public JSON `downloads`
    availability flag and by the public download endpoint, so the two can
    never disagree (B7-RC correction 3). Always runs the full
    artifact-level revalidation (checksum, byte size, structural re-parse,
    content-hash binding) - never just the cheap DB-field check - so a
    structurally corrupt, stale, pending, or failed export is rejected by
    both surfaces identically. Never generates a document. Returns the
    export or None; never raises."""
    if format_name not in (ResumeExport.Format.PDF, ResumeExport.Format.DOCX):
        return None
    try:
        export = ResumeExport.objects.get(resume_version=version, format=format_name)
    except ResumeExport.DoesNotExist:
        return None
    try:
        validate_generated_export(export, inspect_artifact=True)
    except ExportIntegrityError:
        return None
    return export
