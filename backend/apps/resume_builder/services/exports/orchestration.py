import hashlib

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.accounts.permissions import is_portfolio_admin_user
from apps.resume_builder.models import ResumeExport, ResumeVersion
from apps.resume_builder.services.exceptions import ExportGenerationError, ExportIntegrityError, SnapshotError
from apps.resume_builder.services.lifecycle import validate_generated_export, validate_version_snapshot

from .docx import render_docx
from .normalized import normalize_resume
from .pdf import render_pdf
from .security import MIME_TYPES
from .validation import validate_artifact

RENDERERS = {
    ResumeExport.Format.PDF: render_pdf,
    ResumeExport.Format.DOCX: render_docx,
}


def _validate_request(version, format_name, actor):
    if not is_portfolio_admin_user(actor, require_owner_role=True):
        raise ExportGenerationError("Export generation is not permitted.")
    if format_name not in MIME_TYPES:
        raise ExportGenerationError("Unsupported export format.")
    if version.status != ResumeVersion.Status.APPROVED:
        raise ExportGenerationError("Only an approved resume can be exported.")
    if version.resume_type not in {ResumeVersion.ResumeType.MASTER, ResumeVersion.ResumeType.TAILORED}:
        raise ExportGenerationError("Resume type cannot be exported.")


@transaction.atomic
def generate_resume_export(*, resume_version, format_name, actor):
    locked = ResumeVersion.objects.select_for_update().get(pk=resume_version.pk)
    _validate_request(locked, format_name, actor)
    validate_version_snapshot(locked)

    existing = ResumeExport.objects.select_for_update().filter(
        resume_version=locked,
        format=format_name,
    ).first()
    if existing is not None:
        try:
            validate_generated_export(existing, inspect_artifact=True)
            return existing
        except ExportIntegrityError:
            # A stale/corrupt/failed row must not permanently block the
            # admin workflow. The approved snapshot is immutable, so it is
            # safe to replace only this broken derived artifact and render
            # it again from the same governed content.
            existing.delete()

    document_model = normalize_resume(locked)
    try:
        artifact = RENDERERS[format_name](document_model)
        validate_artifact(
            format_name=format_name,
            artifact=artifact,
            expected_content_hash=locked.resume_content_hash,
            document_model=document_model,
        )
    except SnapshotError:
        raise
    except Exception as exc:
        raise ExportGenerationError("Resume export generation failed safely.") from exc

    digest = hashlib.sha256(artifact).hexdigest()
    values = {
        "status": ResumeExport.Status.GENERATED,
        "file": None,
        "download_count_snapshot": 0,
        "content_hash": locked.resume_content_hash,
        "sha256": digest,
        "binary_content": artifact,
        "byte_size": len(artifact),
        "generated_at": timezone.now(),
        "generation_error": "",
    }
    try:
        with transaction.atomic():
            return ResumeExport.objects.create(
                resume_version=locked,
                format=format_name,
                **values,
            )
    except IntegrityError:
        existing = ResumeExport.objects.select_for_update().get(
            resume_version=locked,
            format=format_name,
        )
        validate_generated_export(existing, inspect_artifact=True)
        return existing
