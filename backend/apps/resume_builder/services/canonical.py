import hashlib
import json
from datetime import date, datetime
from decimal import Decimal
from urllib.parse import urlsplit, urlunsplit

from apps.portfolio.models import Certification, Education, Experience, Project, Skill
from apps.site_config.models import SiteSetting

from .exceptions import SnapshotSourceUnavailable, SnapshotValidationError

SCHEMA_VERSION = 1
MASTER_POSITIONING = "Software Engineer | Backend Engineer | Python & Django Developer"


def _primitive(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if hasattr(value, "url"):
        return value.url
    if isinstance(value, str) and "://" in value:
        parts = urlsplit(value)
        return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path, parts.query, parts.fragment))
    return value


def claim(model_label, record_id, field, value, position=None):
    suffix = f":{position}" if position is not None else ""
    claim_id = f"{model_label}:{record_id}:{field}{suffix}"
    return {"claim_id": claim_id, "value": _primitive(value), "source": {"model": model_label, "record_id": record_id, "field": field}}


def _section_claims(items):
    claims = []
    for item in items:
        claims.extend(item)
    return claims


def _eligible(instance, label):
    if getattr(instance, "status", None) != "published":
        raise SnapshotSourceUnavailable(f"Selected {label} is not published.")
    return instance


def _ordered(queryset, *fields):
    return queryset.order_by(*fields, "pk")


def collect_source_facts(version):
    site = SiteSetting.objects.order_by("pk").first()
    profile = []
    profile.append(claim("resume_builder.positioning", 0, "professional_title", MASTER_POSITIONING))
    if site:
        for field in ("owner_name", "public_email", "public_phone", "public_location", "social_links"):
            value = getattr(site, field)
            if value:
                profile.append(claim("site_config.sitesetting", site.pk, field, value))

    experience_claims = []
    for item in _ordered(version.include_experiences.all(), "-start_date"):
        _eligible(item, "experience")
        values = [claim("portfolio.experience", item.pk, "role_title", item.role_title), claim("portfolio.experience", item.pk, "company_name", item.company_name), claim("portfolio.experience", item.pk, "start_date", item.start_date), claim("portfolio.experience", item.pk, "end_date", item.end_date) if item.end_date else None]
        values = [value for value in values if value]
        achievements = item.achievements or []
        for position, achievement in enumerate(achievements):
            values.append(claim("portfolio.experience", item.pk, "achievement", achievement, position))
        if not achievements and item.description:
            values.append(claim("portfolio.experience", item.pk, "description", item.description))
        experience_claims.append(values)

    education_claims = []
    for item in _ordered(version.include_education.all(), "-start_date"):
        _eligible(item, "education")
        education_claims.append([claim("portfolio.education", item.pk, "institution", item.institution), claim("portfolio.education", item.pk, "degree", item.degree), claim("portfolio.education", item.pk, "start_date", item.start_date), claim("portfolio.education", item.pk, "end_date", item.end_date) if item.end_date else None, claim("portfolio.education", item.pk, "description", item.description) if item.description else None])
        education_claims[-1] = [value for value in education_claims[-1] if value]

    skill_claims = []
    for item in _ordered(version.include_skills.select_related("category").all(), "category__display_order", "display_order"):
        if not item.published:
            raise SnapshotSourceUnavailable("Selected skill is not published.")
        skill_claims.append([claim("portfolio.skill", item.pk, "name", item.name), claim("portfolio.skill", item.pk, "category", item.category.name), claim("portfolio.skill", item.pk, "level", item.level)])

    project_claims = []
    for item in _ordered(version.include_projects.prefetch_related("technologies").all(), "display_order"):
        _eligible(item, "project")
        values = [claim("portfolio.project", item.pk, "title", item.title), claim("portfolio.project", item.pk, "description", item.description)]
        for technology in _ordered(item.technologies.all(), "name"):
            # record_id carries BOTH the owning Project's pk and the
            # Technology's pk (RESUME-SYSTEM-01B9.1). Technology.pk alone
            # is not unique here - the same Technology is routinely
            # shared by many real projects - so keying only on
            # (Technology.pk, alphabetical-position-within-this-project)
            # let two different projects produce an identical claim_id
            # whenever they shared a technology at the same alphabetical
            # rank (e.g. two projects both listing "Django" first).
            # Composing the ID from (item.pk, technology.pk) makes it
            # unique per (project, technology) pair - the smallest set of
            # identifiers that actually identifies this fact - and
            # deterministic/stable across recollection even if an
            # unrelated technology's name changes and shifts the
            # alphabetical order, which the old position-suffixed scheme
            # was not. `position` is dropped: once (project, technology)
            # is unique, it adds no further disambiguating information
            # (a project's technologies M2M cannot contain the same
            # Technology twice).
            values.append(claim("portfolio.project.technology", f"{item.pk}:{technology.pk}", "name", technology.name))
        project_claims.append(values)

    certification_claims = []
    for item in _ordered(version.include_certifications.all(), "-issue_date"):
        if not item.is_verified or item.status != "published":
            raise SnapshotSourceUnavailable("Selected certification is not verified and published.")
        certification_claims.append([claim("portfolio.certification", item.pk, "name", item.name), claim("portfolio.certification", item.pk, "issuer", item.issuer), claim("portfolio.certification", item.pk, "issue_date", item.issue_date), claim("portfolio.certification", item.pk, "expiry_date", item.expiry_date) if item.expiry_date else None])
        certification_claims[-1] = [value for value in certification_claims[-1] if value]

    custom_summary = []
    if version.custom_summary:
        custom_summary.append(claim("resume_builder.resumeversion", version.pk, "custom_summary", version.custom_summary))

    sections = {
        "profile": profile,
        "experience": _section_claims(experience_claims),
        "education": _section_claims(education_claims),
        "skills": _section_claims(skill_claims),
        "projects": _section_claims(project_claims),
        "certifications": _section_claims(certification_claims),
        "custom_summary": custom_summary,
    }
    claims = _section_claims(list(sections.values()))
    claim_ids = [item["claim_id"] for item in claims]
    if len(claim_ids) != len(set(claim_ids)):
        raise SnapshotValidationError("Duplicate claim IDs detected.")
    selected_records = sorted({item["source"]["model"] + ":" + str(item["source"]["record_id"]) for item in claims if item["source"]["model"] != "resume_builder.positioning"})
    return {"schema_version": SCHEMA_VERSION, "sections": sections, "provenance": {"claim_count": len(claims), "source": "selected_database_records", "selected_records": selected_records}}


def ensure_previous_sources_available(version, facts):
    previous_claim_ids = {
        item["claim_id"]
        for section in version.source_facts.get("sections", {}).values()
        for item in section
    }
    current_claim_ids = {item["claim_id"] for section in facts["sections"].values() for item in section}
    if any(claim_id.startswith("portfolio.") and claim_id not in current_claim_ids for claim_id in previous_claim_ids):
        raise SnapshotSourceUnavailable("A previously selected source is no longer available.")


def canonical_json(facts):
    return json.dumps(facts, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def source_hash(facts):
    return hashlib.sha256(canonical_json(facts).encode("utf-8")).hexdigest()


def validate_snapshot(facts, content, digest, resume_type="master"):
    if facts.get("schema_version") != SCHEMA_VERSION or set(facts) != {"schema_version", "sections", "provenance"}:
        raise SnapshotValidationError("Unsupported snapshot schema.")
    known_sections = {"profile", "experience", "education", "skills", "projects", "certifications", "custom_summary"}
    if set(facts["sections"]) != known_sections:
        raise SnapshotValidationError("Snapshot contains an unknown section.")
    all_claim_ids = [item["claim_id"] for section in facts["sections"].values() for item in section]
    if len(all_claim_ids) != len(set(all_claim_ids)):
        raise SnapshotValidationError("Duplicate claim IDs detected.")
    claim_ids = set(all_claim_ids)
    content_items = content.get("items", [])
    if not content_items or any(not item.get("source_claim_ids") for item in content_items):
        raise SnapshotValidationError("Every résumé item must include source claims.")
    referenced = [claim_id for item in content_items for claim_id in item["source_claim_ids"]]
    if any(not claim_id or claim_id not in claim_ids for claim_id in referenced):
        raise SnapshotValidationError("Résumé content contains an unknown source claim.")
    if len(digest) != 64 or digest.lower() != digest or any(char not in "0123456789abcdef" for char in digest):
        raise SnapshotValidationError("source_hash must be lowercase SHA-256.")
    if digest != source_hash(facts):
        raise SnapshotValidationError("source_hash does not match canonical facts.")
    if resume_type not in {"master", "tailored"}:
        raise SnapshotValidationError("Unknown resume type.")
    return True
