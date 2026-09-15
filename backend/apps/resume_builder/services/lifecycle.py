import hashlib
import json
from datetime import date

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.resume_builder.models import JobApplicationRecord, ResumeExport, ResumeVersion

from .canonical import source_hash, validate_snapshot
from .exceptions import (
    ApplicationTransitionError,
    ExportIntegrityError,
    ImmutableVersionError,
    LifecycleError,
    MissingExportError,
    PublicationConflictError,
    SnapshotValidationError,
    StaleSnapshotError,
)


def canonical_resume_content(content):
    return json.dumps(content, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def resume_content_hash(content):
    return hashlib.sha256(canonical_resume_content(content).encode("utf-8")).hexdigest()


def _assert_draft(version):
    if version.status != ResumeVersion.Status.DRAFT:
        raise ImmutableVersionError("Only draft versions can be changed.")


def validate_version_snapshot(version):
    if not version.source_facts or not version.resume_content or not version.source_hash or not version.resume_content_hash:
        raise SnapshotValidationError("Complete résumé snapshot is required.")
    if source_hash(version.source_facts) != version.source_hash:
        raise StaleSnapshotError("Source snapshot hash is stale.")
    if resume_content_hash(version.resume_content) != version.resume_content_hash:
        raise StaleSnapshotError("Résumé content hash is stale.")
    validate_snapshot(version.source_facts, version.resume_content, version.source_hash, version.resume_type)


@transaction.atomic
def update_resume_content(*, version, content):
    locked = ResumeVersion.objects.select_for_update().get(pk=version.pk)
    _assert_draft(locked)
    if not isinstance(content, dict):
        raise SnapshotValidationError("Résumé content must be a JSON object.")
    digest = resume_content_hash(content)
    validate_snapshot(locked.source_facts, content, locked.source_hash, locked.resume_type)
    locked.resume_content = content
    locked.resume_content_hash = digest
    locked.save(update_fields=("resume_content", "resume_content_hash", "updated_at"))
    return locked


@transaction.atomic
def approve_version(*, version, actor=None):
    locked = ResumeVersion.objects.select_for_update().get(pk=version.pk)
    _assert_draft(locked)
    validate_version_snapshot(locked)
    locked.status = ResumeVersion.Status.APPROVED
    locked.approved_by = actor
    locked.approved_at = timezone.now()
    locked.published_at = None
    locked.published_by = None
    locked.archived_at = None
    locked.is_default = False
    locked.save(update_fields=("status", "approved_by", "approved_at", "published_at", "published_by", "archived_at", "is_default", "updated_at"))
    return locked


def validate_generated_export(export, *, inspect_artifact=False):
    if export.status != ResumeExport.Status.GENERATED or export.format not in {ResumeExport.Format.PDF, ResumeExport.Format.DOCX}:
        raise ExportIntegrityError("Export is not a generated PDF or DOCX artifact.")
    if not export.binary_content:
        raise ExportIntegrityError("Generated export has no binary content.")
    if export.byte_size != len(export.binary_content):
        raise ExportIntegrityError("Generated export byte size is invalid.")
    digest = hashlib.sha256(bytes(export.binary_content)).hexdigest()
    if export.sha256 != digest or export.sha256.lower() != export.sha256:
        raise ExportIntegrityError("Generated export SHA-256 is invalid.")
    if export.content_hash != export.resume_version.resume_content_hash:
        raise ExportIntegrityError("Generated export content hash is stale.")
    if export.generated_at is None or export.generation_error:
        raise ExportIntegrityError("Generated export metadata is invalid.")
    if inspect_artifact:
        from .exports.validation import validate_artifact

        validate_artifact(
            format_name=export.format,
            artifact=bytes(export.binary_content),
            expected_content_hash=export.resume_version.resume_content_hash,
        )
    return True


@transaction.atomic
def publish_version(*, version, actor=None):
    locked = ResumeVersion.objects.select_for_update().get(pk=version.pk)
    if locked.status != ResumeVersion.Status.APPROVED or locked.resume_type != ResumeVersion.ResumeType.MASTER:
        raise LifecycleError("Only an approved master can be published.")
    validate_version_snapshot(locked)
    exports = {export.format: export for export in locked.exports.select_for_update()}
    for format_name in (ResumeExport.Format.PDF, ResumeExport.Format.DOCX):
        if format_name not in exports:
            raise MissingExportError("Both PDF and DOCX exports are required.")
        validate_generated_export(exports[format_name], inspect_artifact=True)
    previous = ResumeVersion.objects.select_for_update().filter(
        resume_type=ResumeVersion.ResumeType.MASTER,
        status=ResumeVersion.Status.PUBLISHED,
    ).exclude(pk=locked.pk).first()
    now = timezone.now()
    if previous:
        previous.status = ResumeVersion.Status.ARCHIVED
        previous.is_default = False
        previous.archived_at = now
        previous.save(update_fields=("status", "is_default", "archived_at", "updated_at"))
    locked.status = ResumeVersion.Status.PUBLISHED
    locked.is_default = True
    locked.published_by = actor
    locked.published_at = now
    locked.archived_at = None
    try:
        locked.save(update_fields=("status", "is_default", "published_by", "published_at", "archived_at", "updated_at"))
    except IntegrityError as exc:
        raise PublicationConflictError("Publication conflict; no résumé was published.") from exc
    return locked


@transaction.atomic
def archive_version(*, version, actor=None):
    locked = ResumeVersion.objects.select_for_update().get(pk=version.pk)
    if locked.status == ResumeVersion.Status.ARCHIVED:
        raise LifecycleError("Résumé is already archived.")
    locked.status = ResumeVersion.Status.ARCHIVED
    locked.is_default = False
    locked.archived_at = timezone.now()
    locked.save(update_fields=("status", "is_default", "archived_at", "updated_at"))
    return locked
