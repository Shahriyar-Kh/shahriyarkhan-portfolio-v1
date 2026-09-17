import hashlib

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.resume_builder.models import JobApplicationRecord, ResumeAssessment
from apps.resume_builder.services.lifecycle import resume_content_hash
from apps.resume_builder.services.canonical import source_hash

from .exceptions import ATSAssessmentError, ATSInputError
from .job_match import score_job_match
from .readiness import score_readiness
from .rules import ATS_RULESET_VERSION, MAX_JOB_DESCRIPTION_LENGTH


def _hash_text(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _validate_version(version):
    if not version.source_facts or not version.resume_content:
        raise ATSInputError("Résumé snapshot is incomplete.")
    if source_hash(version.source_facts) != version.source_hash:
        raise ATSInputError("Résumé source snapshot is stale.")
    if resume_content_hash(version.resume_content) != version.resume_content_hash:
        raise ATSInputError("Résumé content snapshot is stale.")


@transaction.atomic
def run_readiness_assessment(*, version, actor=None):
    _validate_version(version)
    identity = {
        "resume_version": version,
        "assessment_type": ResumeAssessment.AssessmentType.READINESS,
        "ruleset_version": ATS_RULESET_VERSION,
        "resume_content_hash": version.resume_content_hash,
        "job_description_hash": "",
    }
    existing = ResumeAssessment.objects.filter(**identity).first()
    if existing is not None:
        return existing

    result = score_readiness(version)
    try:
        return ResumeAssessment.objects.create(
            **identity,
            score=result["score"],
            source_hash=version.source_hash,
            report=result,
            critical_blockers=result["critical_blockers"],
            created_by=actor,
        )
    except (IntegrityError, ValidationError) as exc:
        # Model.save() calls full_clean(), so an exact duplicate may surface
        # as ValidationError before the database unique constraint is reached.
        # Treat repeat clicks/retries as idempotent and return the canonical
        # historical assessment instead of exposing a 500/debug traceback.
        existing = ResumeAssessment.objects.filter(**identity).first()
        if existing is not None:
            return existing
        raise ATSAssessmentError("Unable to create ATS readiness assessment.") from exc


@transaction.atomic
def run_job_match_assessment(*, version, application, actor=None):
    _validate_version(version)
    if application.resume_version_id != version.pk:
        raise ATSInputError("Application does not reference the selected résumé.")
    jd = application.job_description_snapshot or ""
    if len(jd) > MAX_JOB_DESCRIPTION_LENGTH:
        raise ATSInputError("Job description exceeds the safe maximum length.")
    digest = _hash_text(jd)
    if application.job_description_hash and application.job_description_hash != digest:
        raise ATSInputError("Stored job description hash is stale.")

    identity = {
        "resume_version": version,
        "assessment_type": ResumeAssessment.AssessmentType.JOB_MATCH,
        "ruleset_version": ATS_RULESET_VERSION,
        "resume_content_hash": version.resume_content_hash,
        "job_description_hash": digest,
    }
    existing = ResumeAssessment.objects.filter(**identity).first()
    if existing is not None:
        return existing

    result = score_job_match(version, application)
    try:
        return ResumeAssessment.objects.create(
            **identity,
            score=result["score"],
            source_hash=version.source_hash,
            job_application=application,
            report=result,
            critical_blockers=result["critical_blockers"],
            created_by=actor,
        )
    except (IntegrityError, ValidationError) as exc:
        existing = ResumeAssessment.objects.filter(**identity).first()
        if existing is not None:
            return existing
        raise ATSAssessmentError("Unable to create ATS job-match assessment.") from exc


def assessment_is_current(assessment):
    version = assessment.resume_version
    current = assessment.ruleset_version == ATS_RULESET_VERSION and assessment.resume_content_hash == version.resume_content_hash and assessment.source_hash == version.source_hash
    if assessment.assessment_type == ResumeAssessment.AssessmentType.JOB_MATCH:
        current = current and assessment.job_application and assessment.job_description_hash == _hash_text(assessment.job_application.job_description_snapshot or "")
    return bool(current)
