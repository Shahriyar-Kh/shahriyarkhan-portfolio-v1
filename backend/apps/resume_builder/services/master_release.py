from __future__ import annotations

from dataclasses import dataclass

from django.core.exceptions import PermissionDenied
from django.db import transaction

from apps.accounts.permissions import is_portfolio_admin_user
from apps.portfolio.models import Certification, Education, Experience, Project, Skill
from apps.resume_builder.models import ResumeExport, ResumeVersion

from .drafts import create_master_draft
from .exports import generate_resume_export, resolve_downloadable_export
from .lifecycle import approve_version, publish_version


MASTER_SUMMARY = (
    "Software Engineer focused on Python/Django backend engineering and backend-heavy "
    "full-stack product delivery. Builds REST APIs, authenticated workflows, "
    "PostgreSQL-backed systems, and React/Next.js interfaces, with testing, CI/CD, "
    "and cloud deployment experience."
)

MASTER_PROJECT_SLUGS = (
    "nurses-beyond-borders-nclex-learning-exam-preparation-platform",
    "yango-wing-fleet-digital-registration-fleet-management-platform",
    "noteassist-ai-productivity-platform",
)

MASTER_SKILL_NAMES = (
    "Python",
    "Django",
    "Django REST Framework (DRF)",
    "REST APIs",
    "FastAPI",
    "Authentication (JWT)",
    "Role-Based Access Control (RBAC)",
    "React.js",
    "Next.js",
    "TypeScript",
    "JavaScript",
    "PostgreSQL",
    "Database Design",
    "Redis",
    "SQL",
    "Software Architecture",
    "Software Testing",
    "Pytest",
    "Continuous Integration and Continuous Delivery (CI/CD)",
    "Git",
    "GitHub",
    "Postman",
    "Docker",
    "API Integration",
    "Cloudflare Workers",
    "Railway",
)


@dataclass(frozen=True)
class MasterReleaseResult:
    version: ResumeVersion
    purged_ids: tuple[int, ...]
    protected_ids: tuple[int, ...]


def _ordered_named(queryset, desired_values, attribute):
    by_value = {getattr(item, attribute): item for item in queryset}
    return [by_value[value] for value in desired_values if value in by_value]


def master_selections():
    projects = _ordered_named(
        Project.objects.filter(status="published", slug__in=MASTER_PROJECT_SLUGS),
        MASTER_PROJECT_SLUGS,
        "slug",
    )
    skills = _ordered_named(
        Skill.objects.filter(published=True, name__in=MASTER_SKILL_NAMES).select_related("category"),
        MASTER_SKILL_NAMES,
        "name",
    )
    experiences = list(
        Experience.objects.filter(status="published").order_by("-current_role", "-start_date", "pk")
    )
    education = list(Education.objects.filter(status="published").order_by("-start_date", "pk"))
    certifications = list(
        Certification.objects.filter(status="published", is_verified=True).order_by("-issue_date", "pk")
    )
    return {
        "include_projects": projects,
        "include_experiences": experiences,
        "include_skills": skills,
        "include_education": education,
        "include_certifications": certifications,
    }


def purge_old_resume_versions(*, keep_version):
    """Delete only old resume versions that have no governed application history.

    Job applications and ATS assessments are evidence/audit records and use
    PROTECT semantics. They are deliberately preserved instead of being
    destroyed merely to make the admin list look clean.
    """
    purged = []
    protected = []
    for version in ResumeVersion.objects.exclude(pk=keep_version.pk).order_by("pk"):
        if version.applications.exists() or version.assessments.exists():
            protected.append(version.pk)
            continue
        version_id = version.pk
        version.delete()
        purged.append(version_id)
    return tuple(purged), tuple(protected)


@transaction.atomic
def rebuild_and_publish_master(*, actor, purge_old=False):
    """Create, export and publish one fresh evidence-backed master résumé.

    The operation is atomic: if draft creation, artifact generation,
    validation or publication fails, no half-published master is left behind.
    """
    if not is_portfolio_admin_user(actor, require_owner_role=True):
        raise PermissionDenied("Only the portfolio owner can rebuild the master résumé.")

    version = create_master_draft(
        actor=actor,
        custom_summary=MASTER_SUMMARY,
        selections=master_selections(),
    )
    version = approve_version(version=version, actor=actor)

    generate_resume_export(
        resume_version=version,
        format_name=ResumeExport.Format.PDF,
        actor=actor,
    )
    generate_resume_export(
        resume_version=version,
        format_name=ResumeExport.Format.DOCX,
        actor=actor,
    )

    version = publish_version(version=version, actor=actor)

    # Publication already validates both artifacts; re-resolve with the
    # public download policy as a final invariant before optional cleanup.
    if resolve_downloadable_export(version, ResumeExport.Format.PDF) is None:
        raise RuntimeError("Published master PDF failed final availability validation.")
    if resolve_downloadable_export(version, ResumeExport.Format.DOCX) is None:
        raise RuntimeError("Published master DOCX failed final availability validation.")

    purged = ()
    protected = ()
    if purge_old:
        purged, protected = purge_old_resume_versions(keep_version=version)

    return MasterReleaseResult(
        version=version,
        purged_ids=purged,
        protected_ids=protected,
    )
