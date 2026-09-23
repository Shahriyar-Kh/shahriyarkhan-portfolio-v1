from collections import OrderedDict
from datetime import date

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


def _month_year(value):
    if not value:
        return ""
    try:
        parsed = date.fromisoformat(str(value))
    except (TypeError, ValueError):
        return str(value)
    months = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
    return f"{months[parsed.month - 1]} {parsed.year}"


def _group_by_record(entries, *, model):
    groups = OrderedDict()
    for item in entries:
        if item.get("source", {}).get("model") != model:
            continue
        record_id = str(item["source"]["record_id"])
        groups.setdefault(record_id, []).append(item)
    return groups


def _by_field(entries):
    result = {}
    for item in entries:
        result.setdefault(item.get("source", {}).get("field"), []).append(item)
    return result


def _first(fields, name):
    items = fields.get(name) or []
    return items[0] if items else None


def _ids(*claims):
    return [claim["claim_id"] for claim in claims if claim]


def _structured_content(facts, summary):
    """Build a compact, recruiter-readable draft from verified source claims.

    The old implementation emitted every database fact as a separate visible
    line (for example skill name, category and level as three independent
    lines). That made a newly generated Master résumé technically valid but
    visually noisy and forced the owner to manually rebuild the wording before
    every release. This formatter combines related claims into conventional CV
    lines while retaining exact claim provenance for every visible item.
    """
    items = []

    if summary and facts["sections"]["custom_summary"]:
        claim = facts["sections"]["custom_summary"][0]
        items.append(
            {
                "section": "summary",
                "text": summary,
                "source_claim_ids": [claim["claim_id"]],
            }
        )

    for profile_claim in facts["sections"]["profile"]:
        field = profile_claim["source"].get("field")
        value = profile_claim["value"]
        if not value:
            continue
        if field == "professional_title":
            section = "positioning"
            text = str(value)
        elif field == "owner_name":
            section = "profile"
            text = str(value)
        elif field == "social_links" and isinstance(value, dict):
            labels = {
                "github": "GitHub",
                "linkedin": "LinkedIn",
                "whatsapp": "WhatsApp",
            }
            text = " | ".join(
                f"{labels.get(key, key.replace('_', ' ').title())}: {value[key]}"
                for key in sorted(value)
                if value[key]
            )
            section = "contact"
        elif isinstance(value, (list, tuple)):
            text = " | ".join(str(part) for part in value if part)
            section = "contact"
        else:
            text = str(value)
            section = "contact"
        if text:
            items.append(
                {
                    "section": section,
                    "text": text,
                    "source_claim_ids": [profile_claim["claim_id"]],
                }
            )

    # Skills: one concise line per category, names only. Levels remain in the
    # governed source snapshot but are intentionally not repeated in the CV.
    skill_groups = _group_by_record(
        facts["sections"]["skills"],
        model="portfolio.skill",
    )
    categories = OrderedDict()
    for group in skill_groups.values():
        fields = _by_field(group)
        name = _first(fields, "name")
        category = _first(fields, "category")
        if not name or not category:
            continue
        category_name = str(category["value"])
        bucket = categories.setdefault(
            category_name,
            {"names": [], "claims": []},
        )
        bucket["names"].append(str(name["value"]))
        bucket["claims"].extend(_ids(name, category))
    for category_name, bucket in categories.items():
        items.append(
            {
                "section": "skills",
                "text": f"{category_name}: {', '.join(bucket['names'])}",
                "source_claim_ids": list(dict.fromkeys(bucket["claims"])),
            }
        )

    # Experience: conventional heading + achievement bullets.
    experience_groups = _group_by_record(
        facts["sections"]["experience"],
        model="portfolio.experience",
    )
    for group in experience_groups.values():
        fields = _by_field(group)
        role = _first(fields, "role_title")
        company = _first(fields, "company_name")
        start_claim = _first(fields, "start_date")
        end_claim = _first(fields, "end_date")
        heading_parts = []
        if role and company:
            heading_parts.append(f"{role['value']} — {company['value']}")
        elif role:
            heading_parts.append(str(role["value"]))
        elif company:
            heading_parts.append(str(company["value"]))
        if start_claim:
            dates = _month_year(start_claim["value"])
            dates += f" – {_month_year(end_claim['value']) if end_claim else 'Present'}"
            heading_parts.append(dates)
        if heading_parts:
            items.append(
                {
                    "section": "experience",
                    "text": " | ".join(heading_parts),
                    "source_claim_ids": _ids(role, company, start_claim, end_claim),
                }
            )
        achievements = fields.get("achievement") or fields.get("description") or []
        for claim in achievements:
            items.append(
                {
                    "section": "experience",
                    "text": str(claim["value"]),
                    "source_claim_ids": [claim["claim_id"]],
                }
            )

    # Projects: title, concise description and a single technology line.
    project_entries = facts["sections"]["projects"]
    project_groups = _group_by_record(project_entries, model="portfolio.project")
    technology_by_project = OrderedDict()
    for claim in project_entries:
        if claim.get("source", {}).get("model") != "portfolio.project.technology":
            continue
        owning_project = str(claim["source"]["record_id"]).split(":", 1)[0]
        technology_by_project.setdefault(owning_project, []).append(claim)

    for record_id, group in project_groups.items():
        fields = _by_field(group)
        title = _first(fields, "title")
        description = _first(fields, "description")
        if title:
            items.append(
                {
                    "section": "projects",
                    "text": str(title["value"]),
                    "source_claim_ids": [title["claim_id"]],
                }
            )
        if description:
            items.append(
                {
                    "section": "projects",
                    "text": str(description["value"]),
                    "source_claim_ids": [description["claim_id"]],
                }
            )
        technologies = technology_by_project.get(record_id, [])
        if technologies:
            items.append(
                {
                    "section": "projects",
                    "text": "Tech: " + ", ".join(str(item["value"]) for item in technologies),
                    "source_claim_ids": [item["claim_id"] for item in technologies],
                }
            )

    education_groups = _group_by_record(
        facts["sections"]["education"],
        model="portfolio.education",
    )
    for group in education_groups.values():
        fields = _by_field(group)
        degree = _first(fields, "degree")
        institution = _first(fields, "institution")
        start_claim = _first(fields, "start_date")
        end_claim = _first(fields, "end_date")
        heading_parts = []
        if degree and institution:
            heading_parts.append(f"{degree['value']} — {institution['value']}")
        elif degree:
            heading_parts.append(str(degree["value"]))
        elif institution:
            heading_parts.append(str(institution["value"]))
        if start_claim:
            date_text = _month_year(start_claim["value"])
            if end_claim:
                date_text += f" – {_month_year(end_claim['value'])}"
            heading_parts.append(date_text)
        if heading_parts:
            items.append(
                {
                    "section": "education",
                    "text": " | ".join(heading_parts),
                    "source_claim_ids": _ids(degree, institution, start_claim, end_claim),
                }
            )
        for description in fields.get("description", []):
            items.append(
                {
                    "section": "education",
                    "text": str(description["value"]),
                    "source_claim_ids": [description["claim_id"]],
                }
            )

    certification_groups = _group_by_record(
        facts["sections"]["certifications"],
        model="portfolio.certification",
    )
    for group in certification_groups.values():
        fields = _by_field(group)
        name = _first(fields, "name")
        issuer = _first(fields, "issuer")
        issue = _first(fields, "issue_date")
        expiry = _first(fields, "expiry_date")
        parts = []
        if name and issuer:
            parts.append(f"{name['value']} — {issuer['value']}")
        elif name:
            parts.append(str(name["value"]))
        if issue:
            date_text = _month_year(issue["value"])
            if expiry:
                date_text += f" – {_month_year(expiry['value'])}"
            parts.append(date_text)
        if parts:
            items.append(
                {
                    "section": "certifications",
                    "text": " | ".join(parts),
                    "source_claim_ids": _ids(name, issuer, issue, expiry),
                }
            )

    return {"positioning": facts["sections"]["profile"][0]["value"] if facts["sections"]["profile"] else "", "items": items}


def _store_snapshot(version):
    facts = collect_source_facts(version)
    content = _structured_content(facts, version.custom_summary)
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
