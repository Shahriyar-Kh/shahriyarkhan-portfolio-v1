from dataclasses import dataclass

from apps.resume_builder.services.exceptions import SnapshotValidationError

from .security import MAX_SECTION_ITEMS, MAX_TOTAL_CHARS, MAX_TOTAL_ITEMS, clean_text

SECTION_ORDER = (
    ("summary", "PROFESSIONAL SUMMARY"),
    ("skills", "TECHNICAL SKILLS"),
    ("experience", "PROFESSIONAL EXPERIENCE"),
    ("projects", "SELECTED PROJECTS"),
    ("education", "EDUCATION"),
    ("certifications", "CERTIFICATIONS"),
)

SECTION_ALIASES = {
    "summary": "summary",
    "skills": "skills",
    "experience": "experience",
    "projects": "projects",
    "education": "education",
    "certifications": "certifications",
    "profile": "profile",
    "identity": "profile",
    "contact": "profile",
    "positioning": "profile",
}


@dataclass(frozen=True)
class NormalizedItem:
    text: str
    source_claim_ids: tuple[str, ...]
    kind: str = "body"


@dataclass(frozen=True)
class NormalizedSection:
    key: str
    heading: str
    items: tuple[NormalizedItem, ...]


@dataclass(frozen=True)
class NormalizedResume:
    name: str
    professional_title: str
    contacts: tuple[str, ...]
    sections: tuple[NormalizedSection, ...]
    content_hash: str

    @property
    def semantic_lines(self):
        lines = [value for value in (self.name, self.professional_title, *self.contacts) if value]
        for section in self.sections:
            lines.append(section.heading)
            lines.extend(item.text for item in section.items)
        return tuple(lines)


def _claim_index(facts):
    sections = facts.get("sections") if isinstance(facts, dict) else None
    if not isinstance(sections, dict):
        raise SnapshotValidationError("Source facts are invalid.")
    claims = {}
    claim_sections = {}
    for section, entries in sections.items():
        if not isinstance(entries, list):
            raise SnapshotValidationError("Source fact section is invalid.")
        for entry in entries:
            claim_id = entry.get("claim_id") if isinstance(entry, dict) else None
            if not isinstance(claim_id, str) or not claim_id or claim_id in claims:
                raise SnapshotValidationError("Source claim is invalid or duplicated.")
            claims[claim_id] = entry
            claim_sections[claim_id] = section
    return claims, claim_sections


def _item_kind(section, source_ids, claims):
    """Derive presentation semantics only from governed source fields.

    The immutable visible text is never rewritten here.  We only classify a
    line so PDF/DOCX renderers can distinguish entry headings from bullets,
    technical-skill rows and ordinary body copy.  This keeps export styling
    professional without weakening provenance or changing resume facts.
    """
    fields = {claims[value].get("source", {}).get("field") for value in source_ids}
    models = {claims[value].get("source", {}).get("model") for value in source_ids}

    if section == "summary":
        return "body"
    if section == "skills":
        return "skill"
    if section == "experience":
        if "role_title" in fields or "company_name" in fields:
            return "entry_heading"
        if "achievement" in fields or "description" in fields:
            return "bullet"
        return "detail"
    if section == "projects":
        if "title" in fields:
            return "entry_heading"
        if "description" in fields:
            return "bullet"
        if any(model == "portfolio.project.technology" for model in models):
            return "detail"
        return "bullet"
    if section == "education":
        if "degree" in fields or "institution" in fields:
            return "entry_heading"
        return "detail"
    if section == "certifications":
        if "name" in fields:
            return "entry_heading"
        return "detail"
    return "body"


def normalize_resume(version):
    claims, claim_sections = _claim_index(version.source_facts)
    content = version.resume_content
    items = content.get("items") if isinstance(content, dict) else None
    if not isinstance(items, list) or not items or len(items) > MAX_TOTAL_ITEMS:
        raise SnapshotValidationError("Resume item count is invalid.")

    name = ""
    professional_title = ""
    contacts = []
    grouped = {key: [] for key, _heading in SECTION_ORDER}
    total_chars = 0

    for position, raw_item in enumerate(items):
        if not isinstance(raw_item, dict):
            raise SnapshotValidationError("Resume item is invalid.")
        raw_section = raw_item.get("section")
        section = SECTION_ALIASES.get(raw_section)
        if section is None:
            raise SnapshotValidationError("Resume content contains an unsupported section.")
        text = clean_text(raw_item.get("text"), field=f"item {position + 1}")
        source_ids = raw_item.get("source_claim_ids")
        if not isinstance(source_ids, list) or not source_ids or any(not isinstance(value, str) for value in source_ids):
            raise SnapshotValidationError("Every resume item must have source claim IDs.")
        if len(source_ids) != len(set(source_ids)) or any(value not in claims for value in source_ids):
            raise SnapshotValidationError("Resume evidence IDs are invalid or duplicated.")

        if section != "summary" and any(claim_sections[value] != section for value in source_ids):
            raise SnapshotValidationError("Resume evidence does not match its section.")
        total_chars += len(text)
        if total_chars > MAX_TOTAL_CHARS:
            raise SnapshotValidationError("Resume content exceeds the safe total length limit.")

        item = NormalizedItem(
            text=text,
            source_claim_ids=tuple(source_ids),
            kind=_item_kind(section, source_ids, claims) if section != "profile" else "body",
        )
        if section == "profile":
            fields = {claims[value].get("source", {}).get("field") for value in source_ids}
            if raw_section == "positioning" or "professional_title" in fields:
                professional_title = text
            elif "owner_name" in fields:
                name = text
            else:
                contacts.append(text)
        else:
            grouped[section].append(item)

    if not name and not professional_title:
        raise SnapshotValidationError("Resume identity is missing.")
    if any(len(section_items) > MAX_SECTION_ITEMS for section_items in grouped.values()):
        raise SnapshotValidationError("Resume section exceeds the safe item limit.")

    sections = tuple(
        NormalizedSection(key=key, heading=heading, items=tuple(grouped[key]))
        for key, heading in SECTION_ORDER
        if grouped[key]
    )
    return NormalizedResume(
        name=name,
        professional_title=professional_title,
        contacts=tuple(dict.fromkeys(contacts)),
        sections=sections,
        content_hash=version.resume_content_hash,
    )
