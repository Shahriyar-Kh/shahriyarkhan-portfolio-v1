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


def _record_groups(claims):
    groups = {}
    for item in claims:
        record_id = str(item["source"]["record_id"])
        groups.setdefault(record_id, []).append(item)
    return groups


def _field_map(claims):
    return {item["source"]["field"]: item for item in claims}


def _display_date(value):
    if not value:
        return ""
    raw = str(value)
    try:
        year, month, _day = raw.split("-", 2)
        names = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
        return f"{names[int(month) - 1]} {year}"
    except (ValueError, IndexError):
        return raw


def _content(facts, title):
    """Build a compact recruiter-facing document from governed claims.

    Earlier drafts emitted one visible line for every source claim. That
    made skills, dates and project technologies explode into dozens of
    disconnected lines even though the underlying evidence was correct.
    The snapshot remains unchanged; this presentation layer now groups
    related claims into conventional résumé entries while retaining every
    source_claim_id used by the visible text.
    """
    items = []

    if title:
        summary_claims = [
            item for item in facts["sections"]["custom_summary"]
            if item["value"] == title
        ]
        if summary_claims:
            items.append({
                "section": "summary",
                "text": title,
                "source_claim_ids": [summary_claims[0]["claim_id"]],
            })

    # Identity/contact facts stay individually traceable.
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
        items.append({
            "section": section,
            "text": text,
            "source_claim_ids": [profile_claim["claim_id"]],
        })

    # Skills are most useful to recruiters as one ATS-readable line. The
    # visible list uses only the skill-name claims; category/level remain
    # preserved in source_facts for provenance but are not presentation
    # content.
    skill_name_claims = [
        item for item in facts["sections"]["skills"]
        if item["source"].get("field") == "name"
    ]
    if skill_name_claims:
        items.append({
            "section": "skills",
            "text": ", ".join(str(item["value"]) for item in skill_name_claims),
            "source_claim_ids": [item["claim_id"] for item in skill_name_claims],
        })

    # Experience: one role/company/date heading plus concise achievement
    # bullets. Missing end date is rendered as Present.
    for claims in _record_groups(facts["sections"]["experience"]).values():
        fields = _field_map(claims)
        role = fields.get("role_title")
        company = fields.get("company_name")
        start_claim = fields.get("start_date")
        end_claim = fields.get("end_date")
        heading_claims = [item for item in (role, company, start_claim, end_claim) if item]
        if role or company:
            identity = " — ".join(
                str(item["value"]) for item in (role, company) if item and item["value"]
            )
            dates = ""
            if start_claim:
                dates = _display_date(start_claim["value"])
                dates += f" – {_display_date(end_claim['value']) if end_claim else 'Present'}"
            items.append({
                "section": "experience",
                "text": f"{identity} | {dates}" if dates else identity,
                "source_claim_ids": [item["claim_id"] for item in heading_claims],
            })
        for item in claims:
            if item["source"].get("field") in {"achievement", "description"} and item["value"]:
                items.append({
                    "section": "experience",
                    "text": str(item["value"]),
                    "source_claim_ids": [item["claim_id"]],
                })

    # Projects: title, one description bullet and one compact technology
    # line. Technology claim IDs embed "<project_pk>:<technology_pk>".
    project_claims = facts["sections"]["projects"]
    project_groups = {}
    technology_groups = {}
    for item in project_claims:
        model = item["source"].get("model")
        record_id = str(item["source"].get("record_id"))
        if model == "portfolio.project.technology":
            project_id = record_id.split(":", 1)[0]
            technology_groups.setdefault(project_id, []).append(item)
        else:
            project_groups.setdefault(record_id, []).append(item)

    for project_id, claims in project_groups.items():
        fields = _field_map(claims)
        title_claim = fields.get("title")
        description_claim = fields.get("description")
        if title_claim:
            items.append({
                "section": "projects",
                "text": str(title_claim["value"]),
                "source_claim_ids": [title_claim["claim_id"]],
            })
        if description_claim and description_claim["value"]:
            items.append({
                "section": "projects",
                "text": str(description_claim["value"]),
                "source_claim_ids": [description_claim["claim_id"]],
            })
        tech_claims = technology_groups.get(project_id, [])
        if tech_claims:
            items.append({
                "section": "projects",
                "text": "Tech: " + ", ".join(str(item["value"]) for item in tech_claims),
                "source_claim_ids": [item["claim_id"] for item in tech_claims],
            })

    # Education is a single conventional entry per record.
    for claims in _record_groups(facts["sections"]["education"]).values():
        fields = _field_map(claims)
        degree = fields.get("degree")
        institution = fields.get("institution")
        start_claim = fields.get("start_date")
        end_claim = fields.get("end_date")
        used = [item for item in (degree, institution, start_claim, end_claim) if item]
        identity = " — ".join(
            str(item["value"]) for item in (degree, institution) if item and item["value"]
        )
        dates = ""
        if start_claim:
            dates = _display_date(start_claim["value"])
            if end_claim:
                dates += f" – {_display_date(end_claim['value'])}"
        text = f"{identity} | {dates}" if dates else identity
        if text:
            items.append({
                "section": "education",
                "text": text,
                "source_claim_ids": [item["claim_id"] for item in used],
            })

    # Certifications remain compact and are present only when the source
    # was both published and verified.
    for claims in _record_groups(facts["sections"]["certifications"]).values():
        fields = _field_map(claims)
        name = fields.get("name")
        issuer = fields.get("issuer")
        issue = fields.get("issue_date")
        expiry = fields.get("expiry_date")
        used = [item for item in (name, issuer, issue, expiry) if item]
        identity = " — ".join(
            str(item["value"]) for item in (name, issuer) if item and item["value"]
        )
        dates = _display_date(issue["value"]) if issue else ""
        if expiry:
            dates += f" – {_display_date(expiry['value'])}"
        text = f"{identity} | {dates}" if dates else identity
        if text:
            items.append({
                "section": "certifications",
                "text": text,
                "source_claim_ids": [item["claim_id"] for item in used],
            })

    return {"positioning": facts["sections"]["profile"][0]["value"] if facts["sections"]["profile"] else "", "items": items}


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
