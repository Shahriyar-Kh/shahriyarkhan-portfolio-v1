from datetime import date

from django.db import transaction

from apps.resume_builder.models import JobApplicationRecord, ResumeExport, ResumeVersion

from .exceptions import ApplicationTransitionError, ExportIntegrityError
from .lifecycle import validate_generated_export

FINAL_STATUSES = {JobApplicationRecord.Status.OFFER, JobApplicationRecord.Status.REJECTED, JobApplicationRecord.Status.WITHDRAWN}
NEXT_STATUSES = {
    JobApplicationRecord.Status.APPLIED: {JobApplicationRecord.Status.INTERVIEWING, *FINAL_STATUSES},
    JobApplicationRecord.Status.INTERVIEWING: {JobApplicationRecord.Status.OFFER, *FINAL_STATUSES},
}


@transaction.atomic
def save_application(*, application=None, actor=None, **values):
    if application is None:
        values.setdefault("owner", actor)
        values.setdefault("status", JobApplicationRecord.Status.DRAFT)
        if values["status"] not in {JobApplicationRecord.Status.DRAFT, JobApplicationRecord.Status.SAVED}:
            raise ApplicationTransitionError("New applications must be draft or saved.")
        return JobApplicationRecord.objects.create(**values)
    locked = JobApplicationRecord.objects.select_for_update().get(pk=application.pk)
    if locked.status not in {JobApplicationRecord.Status.DRAFT, JobApplicationRecord.Status.SAVED}:
        raise ApplicationTransitionError("Only draft or saved applications can be edited.")
    for key, value in values.items():
        setattr(locked, key, value)
    locked.save()
    return locked


@transaction.atomic
def mark_application_applied(*, application, export, actor=None):
    locked = JobApplicationRecord.objects.select_for_update().select_related("resume_version").get(pk=application.pk)
    if locked.status not in {JobApplicationRecord.Status.DRAFT, JobApplicationRecord.Status.SAVED}:
        raise ApplicationTransitionError("Only draft or saved applications can be submitted.")
    if export.resume_version_id != locked.resume_version_id:
        raise ApplicationTransitionError("Export does not belong to the application résumé.")
    if locked.resume_version.status not in {ResumeVersion.Status.APPROVED, ResumeVersion.Status.PUBLISHED}:
        raise ApplicationTransitionError("Résumé must be approved or published before submission.")
    validate_generated_export(export)
    locked.resume_export = export
    locked.submitted_format = export.format
    locked.submitted_artifact_sha256 = export.sha256
    locked.application_date = locked.application_date or date.today()
    locked.status = JobApplicationRecord.Status.APPLIED
    locked.save(update_fields=("resume_export", "submitted_format", "submitted_artifact_sha256", "application_date", "status", "updated_at"))
    return locked


@transaction.atomic
def advance_application_status(*, application, status):
    locked = JobApplicationRecord.objects.select_for_update().get(pk=application.pk)
    if status not in NEXT_STATUSES.get(locked.status, set()):
        raise ApplicationTransitionError("Application status transition is not allowed.")
    locked.status = status
    locked.save(update_fields=("status", "updated_at"))
    return locked