"""The assistant's only door into portfolio data (PORTFOLIO-ASSISTANTS-01,
sections 3-4). Every fact the AI provider or the deterministic fallback can
ever see comes from `build_evidence_bundle()` below - nothing else in this
app queries `apps.portfolio`/`apps.site_config` models directly.

Boundary, enforced by construction (each query below is copy-identical to
the corresponding `apps.portfolio.api.views` / `apps.site_config.api.views`
public queryset - see that module for the authoritative filter):

  ALLOWED   - published Projects, published Experiences, published Skills,
              published Services, published Education, and the handful of
              public SiteSetting fields already served by
              /api/v1/public/site/settings/.
  EXCLUDED  - everything else: inquiries/ServiceRequest rows, admin notes,
              ATS/resume_builder scoring or governance internals, any
              draft/unpublished record, auth/user data, environment
              variables, secrets. This module never imports
              apps.inquiries, apps.resume_builder, or apps.accounts.

CognoRise, the unverified Coursera certificates, and any TechBuilt Open
School deployment claim are excluded the same way they always have been in
this codebase: CognoRise was never entered as a published (or any) Experience
row, and Certification has zero rows in production, so the `published`-only
filters below never see them. TBOS's own Project row IS published (it is a
real, publicly-shown project on /work) - its `description`/`seo_description`
text is surfaced like any other project's, unmodified from what's already
live; this module adds no deployment claim of its own.
"""

from dataclasses import dataclass, field

from apps.core.models import PublishableModel
from apps.portfolio.models import Education, Experience, Project, Service, Skill
from apps.site_config.models import SiteSetting


@dataclass(frozen=True)
class EvidenceItem:
    source_id: str
    source_type: str
    title: str
    public_path: str | None
    facts: list[str] = field(default_factory=list)

    @property
    def searchable_text(self) -> str:
        return " ".join([self.title, *self.facts]).casefold()


def _date_range(start, end, current: bool = False) -> str:
    start_label = start.strftime("%b %Y") if start else "?"
    if current:
        return f"{start_label} - Present"
    end_label = end.strftime("%b %Y") if end else "Present"
    return f"{start_label} - {end_label}"


def _project_items() -> list[EvidenceItem]:
    items = []
    for project in Project.objects.filter(status=PublishableModel.Status.PUBLISHED).prefetch_related("technologies"):
        facts = [project.description]
        tech_names = [t.name for t in project.technologies.all()]
        if tech_names:
            facts.append(f"Technologies: {', '.join(tech_names)}")
        if project.live_url:
            facts.append(f"Live URL: {project.live_url}")
        if project.github_url:
            facts.append(f"Source: {project.github_url}")
        items.append(
            EvidenceItem(
                source_id=f"project:{project.slug}",
                source_type="project",
                title=project.title,
                public_path=f"/work/{project.slug}",
                facts=facts,
            )
        )
    return items


def _experience_items() -> list[EvidenceItem]:
    items = []
    for experience in Experience.objects.filter(status=PublishableModel.Status.PUBLISHED).prefetch_related("technologies"):
        facts = [
            f"{experience.role_title} at {experience.company_name}",
            _date_range(experience.start_date, experience.end_date, experience.current_role),
        ]
        if experience.location:
            facts.append(f"Location: {experience.location}")
        facts.extend(experience.achievements or [])
        tech_names = [t.name for t in experience.technologies.all()]
        if tech_names:
            facts.append(f"Technologies: {', '.join(tech_names)}")
        items.append(
            EvidenceItem(
                source_id=f"experience:{experience.pk}",
                source_type="experience",
                title=f"{experience.role_title}, {experience.company_name}",
                public_path=None,
                facts=facts,
            )
        )
    return items


def _skill_items() -> list[EvidenceItem]:
    items = []
    for skill in Skill.objects.filter(published=True).select_related("category"):
        facts = [f"Category: {skill.category.name}", f"Proficiency: {skill.get_level_display()}"]
        items.append(
            EvidenceItem(
                source_id=f"skill:{skill.pk}",
                source_type="skill",
                title=skill.name,
                public_path="/skills",
                facts=facts,
            )
        )
    return items


def _service_items() -> list[EvidenceItem]:
    items = []
    for service in Service.objects.filter(status=PublishableModel.Status.PUBLISHED):
        facts = [service.description]
        if service.deliverables:
            facts.append(f"Deliverables: {', '.join(str(d) for d in service.deliverables)}")
        items.append(
            EvidenceItem(
                source_id=f"service:{service.slug}",
                source_type="service",
                title=service.title,
                public_path=f"/services/{service.slug}",
                facts=facts,
            )
        )
    return items


def _education_items() -> list[EvidenceItem]:
    items = []
    for edu in Education.objects.filter(status=PublishableModel.Status.PUBLISHED):
        facts = [_date_range(edu.start_date, edu.end_date)]
        if edu.description:
            facts.append(edu.description)
        items.append(
            EvidenceItem(
                source_id=f"education:{edu.pk}",
                source_type="education",
                title=f"{edu.degree}, {edu.institution}",
                public_path=None,
                facts=facts,
            )
        )
    return items


def _profile_item() -> EvidenceItem | None:
    site = SiteSetting.objects.order_by("pk").first()
    if site is None:
        return None
    facts = []
    if site.hero_subtitle:
        facts.append(site.hero_subtitle)
    if site.default_seo_description:
        facts.append(site.default_seo_description)
    if site.public_location:
        facts.append(f"Location: {site.public_location}")
    return EvidenceItem(
        source_id="profile:owner",
        source_type="profile",
        title=site.owner_name or "Shahriyar Khan",
        public_path="/about",
        facts=facts,
    )


def build_evidence_bundle() -> list[EvidenceItem]:
    """The complete, current set of facts the assistant is allowed to
    ground an answer in. Built fresh on every request (PORTFOLIO-ASSISTANTS-01
    section 9 - the public dataset is small and structured enough that a
    live query is simpler and always current, so no cache/vector index is
    used for the MVP)."""
    items: list[EvidenceItem] = []
    profile = _profile_item()
    if profile:
        items.append(profile)
    items.extend(_project_items())
    items.extend(_experience_items())
    items.extend(_skill_items())
    items.extend(_service_items())
    items.extend(_education_items())
    return items
