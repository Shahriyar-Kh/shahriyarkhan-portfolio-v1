from rest_framework import serializers

from apps.portfolio.api.serializers import CertificationSerializer, EducationSerializer, ExperienceSerializer, ProjectSerializer, SkillSerializer
from apps.portfolio.models import Education, Experience, Project, Skill
from apps.resume_builder.models import JobApplicationRecord, ResumeExport, ResumeVersion
from apps.resume_builder.services.exceptions import SnapshotError
from apps.resume_builder.services.exports import normalize_resume, resolve_downloadable_export
from apps.resume_builder.services.exports.security import split_text_and_links


def _linked_segments(text):
    """Splits already-sanitized snapshot text into safe (text, href)
    segments using the exact same routine the PDF/DOCX renderers use
    (services.exports.security.split_text_and_links), so an embedded
    link is clickable identically - and only when actually safe
    (http/https only) - on every surface."""
    return [{"text": part, "href": url} for part, url in split_text_and_links(text)]


def build_public_resume_document(version):
    """The safe public presentation DTO for a résumé, built exclusively
    from the B6 shared normalized document (itself derived only from the
    immutable, approved resume_content/source_facts snapshot - never
    from live SiteSetting or live portfolio rows). This is the single
    source of truth for what /resume and the public API show once a
    version is published: it is byte-for-byte the same semantic content
    normalize_resume() hands to render_pdf()/render_docx(), so the page
    and both documents can never drift apart, and a later edit to
    SiteSetting or any Project/Experience/Education/Skill/Certification
    row can never change what a published résumé displays.

    Recursively contains only name/professional_title/contacts/sections
    text - no claim IDs, provenance, source_facts, hashes, governance
    users, lifecycle state, ATS data, or application data. Returns None
    (never raises, never leaks a traceback) if the snapshot cannot be
    normalized - a state a valid published master should never reach,
    since publish_version already requires a valid snapshot."""
    try:
        document = normalize_resume(version)
    except SnapshotError:
        return None
    return {
        "name": document.name,
        "professional_title": document.professional_title,
        "contacts": [_linked_segments(contact) for contact in document.contacts],
        "sections": [
            {
                "key": section.key,
                "heading": section.heading,
                "items": [_linked_segments(item.text) for item in section.items],
            }
            for section in document.sections
        ],
    }


class PublicResumeVersionSerializer(serializers.ModelSerializer):
    """The public résumé contract.

    `document` is the safe presentation DTO (see build_public_resume_document
    above) - populated only from the immutable published snapshot, and the
    field the frontend must render a published résumé from.

    `projects`/`experiences`/`skills`/`education`/`certifications` are
    preserved only for existing API-response-shape compatibility; they
    are sourced from the LIVE, mutable M2M selections and can legitimately
    drift from what was actually approved/published/exported, so they
    must never be used to render the published résumé (that is exactly
    the bug B7-RC's correction 1 fixes).

    Deliberately excludes every governance, provenance and integrity
    field (source_facts, resume_content, hashes, version_uuid, approved/
    published/archived_by, etc.) recursively, including inside `document`
    - see tests.test_api.ResumeSchemaFoundationTests.
    test_public_resume_contract_excludes_governance_and_private_fields for
    the enforced field allowlist. `downloads` is a minimal availability
    flag, never the artifact bytes or a hash - the stable download routes
    (default/download/<format>/) serve the real bytes and carry the
    SHA-256 only as an HTTP ETag. `downloads` and the download endpoint
    both resolve through the same resolve_downloadable_export() policy,
    so they can never disagree (B7-RC correction 3)."""

    projects = ProjectSerializer(source="include_projects", many=True, read_only=True)
    experiences = ExperienceSerializer(source="include_experiences", many=True, read_only=True)
    skills = SkillSerializer(source="include_skills", many=True, read_only=True)
    education = EducationSerializer(source="include_education", many=True, read_only=True)
    certifications = CertificationSerializer(source="include_certifications", many=True, read_only=True)
    downloads = serializers.SerializerMethodField()
    document = serializers.SerializerMethodField()

    class Meta:
        model = ResumeVersion
        fields = (
            "id",
            "title",
            "slug",
            "target_role",
            "custom_summary",
            "is_default",
            "ats_tags",
            "projects",
            "experiences",
            "skills",
            "education",
            "certifications",
            "downloads",
            "document",
        )

    def get_downloads(self, obj):
        return {
            "pdf": {"available": resolve_downloadable_export(obj, ResumeExport.Format.PDF) is not None},
            "docx": {"available": resolve_downloadable_export(obj, ResumeExport.Format.DOCX) is not None},
        }

    def get_document(self, obj):
        return build_public_resume_document(obj)


class AdminResumeVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeVersion
        fields = "__all__"
        read_only_fields = (
            "status",
            "is_default",
            "version_uuid",
            "source_hash",
            "resume_content_hash",
            "approved_at",
            "archived_at",
            "published_at",
            "created_by",
            "approved_by",
            "published_by",
            "snapshot_schema_version",
            "source_facts",
            "resume_content",
            "include_projects",
            "include_experiences",
            "include_skills",
            "include_education",
            "include_certifications",
            "created_at",
            "updated_at",
        )


class AdminJobApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplicationRecord
        fields = "__all__"
        read_only_fields = (
            "record_uuid", "status", "resume_export", "submitted_format", "submitted_artifact_sha256",
            "application_date", "created_at", "updated_at",
        )

    def validate(self, attrs):
        instance = self.instance
        if instance and instance.status in {"applied", "interviewing", "offer", "rejected", "withdrawn"}:
            immutable = {
                "organization", "job_title", "job_url", "job_description_snapshot", "job_description_hash",
                "resume_version", "resume_export", "submitted_format", "submitted_artifact_sha256", "application_date",
            }
            if immutable.intersection(attrs):
                raise serializers.ValidationError("Applied application identity and artifact fields are immutable.")
        return attrs
