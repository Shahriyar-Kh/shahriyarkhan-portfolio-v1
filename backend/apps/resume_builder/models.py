import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.db.models.signals import m2m_changed
from django.dispatch import receiver

from apps.core.models import PublishableModel, TimeStampedModel
from apps.portfolio.models import Certification, Education, Experience, Project, Skill


class ResumeVersion(TimeStampedModel, PublishableModel):
    class ResumeType(models.TextChoices):
        MASTER = "master", "Master"
        TAILORED = "tailored", "Tailored"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        APPROVED = "approved", "Approved"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    target_role = models.CharField(max_length=150, blank=True)
    resume_type = models.CharField(max_length=8, choices=ResumeType.choices, default=ResumeType.MASTER)
    version_uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    target_organization = models.CharField(max_length=255, blank=True)
    custom_summary = models.TextField(blank=True)
    include_projects = models.ManyToManyField(Project, blank=True)
    include_experiences = models.ManyToManyField(Experience, blank=True)
    include_skills = models.ManyToManyField(Skill, blank=True)
    include_education = models.ManyToManyField(Education, blank=True)
    include_certifications = models.ManyToManyField(Certification, blank=True, related_name="resume_versions")
    is_default = models.BooleanField(default=False)
    ats_tags = models.CharField(max_length=500, blank=True)
    snapshot_schema_version = models.PositiveIntegerField(default=1)
    source_facts = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            "Canonical verified facts and provenance. It is not read from live portfolio content "
            "after approval."
        ),
    )
    resume_content = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            "Résumé-formatted wording referencing source claim IDs. It is not read from live portfolio "
            "content after approval."
        ),
    )
    source_hash = models.CharField(
        max_length=64,
        blank=True,
        db_index=True,
        help_text="Canonical SHA-256 of the source snapshot, populated by a later workflow.",
    )
    resume_content_hash = models.CharField(max_length=64, blank=True, db_index=True)
    approved_at = models.DateTimeField(blank=True, null=True)
    archived_at = models.DateTimeField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="resume_versions_created",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="resume_versions_approved",
    )
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="resume_versions_published",
    )

    class Meta:
        ordering = ("-updated_at",)
        constraints = (
            models.UniqueConstraint(
                fields=("resume_type",),
                condition=models.Q(resume_type="master", status="published"),
                name="resume_one_published_master",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(is_default=False)
                    | models.Q(resume_type="master", status="published")
                ),
                name="resume_default_published_master",
            ),
            models.CheckConstraint(
                condition=(
                    ~models.Q(resume_type="master", status="published")
                    | models.Q(is_default=True)
                ),
                name="resume_published_master_default",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(resume_type="master")
                    | (models.Q(status__in=("draft", "approved", "archived")) & models.Q(is_default=False))
                ),
                name="resume_tailored_not_published_default",
            ),
        )

    def __str__(self) -> str:
        return self.title


class ResumeExport(TimeStampedModel):
    class Format(models.TextChoices):
        PDF = "pdf", "PDF"
        JSON = "json", "JSON"
        HTML = "html", "HTML"
        DOCX = "docx", "DOCX"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        GENERATED = "generated", "Generated"
        FAILED = "failed", "Failed"

    resume_version = models.ForeignKey(ResumeVersion, on_delete=models.CASCADE, related_name="exports")
    format = models.CharField(max_length=8, choices=Format.choices)
    file = models.FileField(upload_to="resume_exports/", blank=True, null=True)
    download_count_snapshot = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    content_hash = models.CharField(max_length=64, blank=True)
    sha256 = models.CharField(max_length=64, blank=True)
    binary_content = models.BinaryField(blank=True, null=True, editable=False)
    byte_size = models.PositiveBigIntegerField(default=0)
    generated_at = models.DateTimeField(blank=True, null=True)
    generation_error = models.TextField(blank=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = (
            models.UniqueConstraint(
                fields=("resume_version", "format"),
                name="resume_export_version_format_unique",
            ),
        )


class JobApplicationRecord(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SAVED = "saved", "Saved"
        APPLIED = "applied", "Applied"
        INTERVIEWING = "interviewing", "Interviewing"
        OFFER = "offer", "Offer"
        REJECTED = "rejected", "Rejected"
        WITHDRAWN = "withdrawn", "Withdrawn"

    class SubmittedFormat(models.TextChoices):
        PDF = "pdf", "PDF"
        DOCX = "docx", "DOCX"

    record_uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    organization = models.CharField(max_length=255)
    job_title = models.CharField(max_length=255)
    job_url = models.URLField(blank=True)
    job_description_snapshot = models.TextField(blank=True)
    job_description_hash = models.CharField(max_length=64, blank=True)
    application_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    resume_version = models.ForeignKey(ResumeVersion, on_delete=models.PROTECT, related_name="applications")
    resume_export = models.ForeignKey(
        ResumeExport,
        blank=True,
        null=True,
        on_delete=models.PROTECT,
        related_name="applications",
    )
    submitted_format = models.CharField(max_length=4, choices=SubmittedFormat.choices, blank=True)
    submitted_artifact_sha256 = models.CharField(max_length=64, blank=True)
    notes = models.TextField(blank=True)
    follow_up_date = models.DateField(blank=True, null=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="job_application_records",
    )

    def clean(self):
        super().clean()
        if self.resume_export_id:
            if self.resume_export.resume_version_id != self.resume_version_id:
                raise ValidationError({"resume_export": "Export must belong to the selected resume version."})
            if self.submitted_format and self.submitted_format != self.resume_export.format:
                raise ValidationError({"submitted_format": "Submitted format must match the export format."})
            export_hash = self.resume_export.sha256 or self.resume_export.content_hash
            if self.submitted_artifact_sha256 and self.submitted_artifact_sha256 != export_hash:
                raise ValidationError({"submitted_artifact_sha256": "Submitted hash must match the export hash."})


class ResumeAssessment(TimeStampedModel):
    class AssessmentType(models.TextChoices):
        READINESS = "readiness", "Readiness"
        JOB_MATCH = "job_match", "Job match"

    assessment_uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    resume_version = models.ForeignKey(ResumeVersion, on_delete=models.PROTECT, related_name="assessments")
    assessment_type = models.CharField(max_length=16, choices=AssessmentType.choices)
    score = models.PositiveSmallIntegerField()
    ruleset_version = models.CharField(max_length=32)
    hash_validator = RegexValidator(r"^[0-9a-f]{64}$", "Must be a lowercase SHA-256 hexadecimal hash.")
    resume_content_hash = models.CharField(max_length=64, validators=[hash_validator])
    source_hash = models.CharField(max_length=64, validators=[hash_validator])
    job_application = models.ForeignKey(
        JobApplicationRecord,
        blank=True,
        null=True,
        on_delete=models.PROTECT,
        related_name="assessments",
    )
    job_description_hash = models.CharField(max_length=64, blank=True, validators=[hash_validator])
    report = models.JSONField(default=dict, blank=True)
    critical_blockers = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="resume_assessments_created",
    )

    class Meta:
        ordering = ("-created_at",)
        constraints = (
            models.CheckConstraint(condition=models.Q(score__gte=0, score__lte=100), name="assessment_score_0_100"),
            models.CheckConstraint(
                condition=(
                    models.Q(assessment_type="readiness", job_application__isnull=True, job_description_hash="")
                    | models.Q(assessment_type="job_match", job_application__isnull=False, job_description_hash__regex=r"^[0-9a-f]{64}$")
                ),
                name="assessment_type_requirements",
            ),
            models.UniqueConstraint(
                fields=("resume_version", "assessment_type", "ruleset_version", "resume_content_hash", "job_description_hash"),
                name="assessment_exact_duplicate",
            ),
        )

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Resume assessments are immutable.")
        self.full_clean()
        return super().save(*args, **kwargs)


def _block_frozen_selection_changes(sender, instance, action, **kwargs):
    if action not in {"pre_add", "pre_remove", "pre_clear"}:
        return
    if instance.source_hash or instance.status in {
        ResumeVersion.Status.APPROVED,
        ResumeVersion.Status.PUBLISHED,
        ResumeVersion.Status.ARCHIVED,
    } or instance.applications.filter(status__in=JobApplicationRecord.Status.values[2:]).exists():
        raise ValidationError("Résumé selections are immutable after snapshot finalization.")


for _selection_field in (
    ResumeVersion.include_projects,
    ResumeVersion.include_experiences,
    ResumeVersion.include_skills,
    ResumeVersion.include_education,
    ResumeVersion.include_certifications,
):
    m2m_changed.connect(_block_frozen_selection_changes, sender=_selection_field.through)
