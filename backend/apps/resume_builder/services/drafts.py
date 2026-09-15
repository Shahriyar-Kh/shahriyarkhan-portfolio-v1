from django.db import transaction
from django.utils.text import slugify

from apps.resume_builder.models import ResumeVersion

from .canonical import MASTER_POSITIONING, collect_source_facts, ensure_previous_sources_available, source_hash, validate_snapshot
from .lifecycle import resume_content_hash
from .exceptions import SnapshotMutationError, SnapshotSourceUnavailable


def _unique_slug(title):
    base = slugify(title) or "resume"
    slug = base
    number = 2
    while ResumeVersion.objects.filter(slug=slug).exists():
        slug = f"{base}-{number}"
        number += 1
    return slug


def _content(facts, title):
    items = []
    if title:
        claim_id = next(item["claim_id"] for item in facts["sections"]["custom_summary"] if item["value"] == title) if facts["sections"]["custom_summary"] else None
        if claim_id:
            items.append({"section": "summary", "text": title, "source_claim_ids": [claim_id]})
    for profile_claim in facts["sections"]["profile"]:
        field = profile_claim["source"].get("field")
        value = profile_claim["value"]
        if isinstance(value, dict):
            text = " | ".join(str(value[key]) for key in sorted(value) if value[key])
        elif isinstance(value, list):
            text = " | ".join(str(item) for item in value if item)
        else:
            text = str(value)
        if not text:
            continue
        if field == "professional_title":
            section = "positioning"
        elif field == "owner_name":
            section = "profile"
        else:
            section = "contact"
        items.append({"section": section, "text": text, "source_claim_ids": [profile_claim["claim_id"]]})
    for section in ("experience", "education", "skills", "projects", "certifications"):
        for item in facts["sections"][section]:
            items.append({"section": section, "text": str(item["value"]), "source_claim_ids": [item["claim_id"]]})
    return {"positioning": MASTER_POSITIONING, "items": items}


def _store_snapshot(version):
    facts = collect_source_facts(version)
    content = _content(facts, version.custom_summary)
    digest = source_hash(facts)
    validate_snapshot(facts, content, digest, version.resume_type)
    version.source_facts = facts
    version.resume_content = content
    version.source_hash = digest
    version.resume_content_hash = resume_content_hash(content)
    version.save(update_fields=("source_facts", "resume_content", "source_hash", "resume_content_hash", "updated_at"))
    return version


def _ensure_draft(version):
    if version.status != ResumeVersion.Status.DRAFT:
        raise SnapshotMutationError("Only draft versions can receive a snapshot.")


@transaction.atomic
def create_master_draft(*, actor=None, title=MASTER_POSITIONING, custom_summary="", selections=None):
    selections = selections or {}
    version = ResumeVersion.objects.create(
        title=MASTER_POSITIONING,
        slug=_unique_slug(MASTER_POSITIONING),
        custom_summary=custom_summary,
        resume_type=ResumeVersion.ResumeType.MASTER,
        status=ResumeVersion.Status.DRAFT,
        is_default=False,
        created_by=actor,
    )
    _copy_selections(version, selections)
    return _store_snapshot(version)


@transaction.atomic
def create_tailored_draft(*, actor=None, target_role="", target_organization="", title=MASTER_POSITIONING, custom_summary="", selections=None):
    selections = selections or {}
    version = ResumeVersion.objects.create(
        title=title,
        slug=_unique_slug(title),
        target_role=target_role,
        target_organization=target_organization,
        custom_summary=custom_summary,
        resume_type=ResumeVersion.ResumeType.TAILORED,
        status=ResumeVersion.Status.DRAFT,
        is_default=False,
        created_by=actor,
    )
    _copy_selections(version, selections)
    return _store_snapshot(version)


def _copy_selections(version, selections):
    for field in ("include_projects", "include_experiences", "include_skills", "include_education", "include_certifications"):
        if field in selections:
            getattr(version, field).set(selections[field])


@transaction.atomic
def clone_version_to_draft(*, source, actor=None):
    clone = ResumeVersion.objects.create(
        title=source.title,
        slug=_unique_slug(source.title),
        target_role=source.target_role,
        target_organization=source.target_organization,
        custom_summary=source.custom_summary,
        resume_type=source.resume_type,
        status=ResumeVersion.Status.DRAFT,
        is_default=False,
        created_by=actor,
        snapshot_schema_version=source.snapshot_schema_version,
    )
    _copy_selections(clone, {field: getattr(source, field).all() for field in ("include_projects", "include_experiences", "include_skills", "include_education", "include_certifications")})
    clone.source_facts = source.source_facts
    clone.resume_content = source.resume_content
    clone.source_hash = source.source_hash
    clone.resume_content_hash = source.resume_content_hash
    clone.save(update_fields=("source_facts", "resume_content", "source_hash", "resume_content_hash", "updated_at"))
    return clone


@transaction.atomic
def regenerate_from_current_portfolio(*, source, actor=None):
    _ensure_draft(source)
    ensure_previous_sources_available(source, collect_source_facts(source))
    selections = {field: getattr(source, field).all() for field in ("include_projects", "include_experiences", "include_skills", "include_education", "include_certifications")}
    return create_master_draft(
        actor=actor,
        title=source.title,
        custom_summary=source.custom_summary,
        selections=selections,
    ) if source.resume_type == ResumeVersion.ResumeType.MASTER else create_tailored_draft(
        actor=actor,
        target_role=source.target_role,
        target_organization=source.target_organization,
        title=source.title,
        custom_summary=source.custom_summary,
        selections=selections,
    )


def compare_freshness(version):
    try:
        facts = collect_source_facts(version)
    except SnapshotSourceUnavailable:
        return {"status": "unavailable"}
    previous_claim_ids = {item["claim_id"] for section in version.source_facts.get("sections", {}).values() for item in section}
    current_claim_ids = {item["claim_id"] for section in facts["sections"].values() for item in section}
    if any(claim_id.startswith("portfolio.") and claim_id not in current_claim_ids for claim_id in previous_claim_ids):
        return {"status": "unavailable"}
    digest = source_hash(facts)
    return {"status": "current" if digest == version.source_hash else "changed", "source_hash": digest}
