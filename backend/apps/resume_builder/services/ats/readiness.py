import re
from collections import Counter

from .exceptions import ATSInputError
from .rules import ATS_RULESET_VERSION, DISCLAIMER, READINESS_WEIGHTS, TECHNICAL_TERMS


def _claims(facts):
    return [item for section in facts.get("sections", {}).values() for item in section]


def _values(facts):
    return [str(item.get("value", "")) for item in _claims(facts)]


def _field(item):
    return item.get("field") or item.get("source", {}).get("field")


def _evidence_ids(items):
    return sorted({item.get("claim_id") for item in items if item.get("claim_id")})


def _repeated_content_keywords(content):
    repeated = 0
    for item in content.get("items", []):
        text = str(item.get("text", "")).casefold()
        for term in TECHNICAL_TERMS:
            occurrences = len(re.findall(rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])", text))
            repeated += max(0, occurrences - 1)
    return repeated


def _repeated_visible_values(content):
    """Counts exact duplicate VISIBLE résumé lines - i.e. two different
    `resume_content` items whose rendered text is identical. This is
    deliberately scoped to what the résumé document actually shows, not
    to `source_facts` (see _repeated_content_keywords for the sibling
    within-one-line stuffing check, and score_readiness()'s docstring-
    equivalent comment below for why source_facts must never feed this
    metric)."""
    texts = [str(item.get("text", "")).strip().casefold() for item in content.get("items", []) if str(item.get("text", "")).strip()]
    return sum(count - 1 for count in Counter(texts).values() if count > 1)


def _source_metadata_repetition(facts):
    """A provenance/debug-only signal: how often the same VALUE recurs
    anywhere across every source_facts claim, including fields that are
    never individually rendered in the résumé (e.g. a Skill's category or
    numeric level - real verified data routinely has many skills sharing
    "Backend" or level 4, which is expected and not a content defect).
    Intentionally NOT part of the scored categories - see
    RESUME-SYSTEM-01B9.1: the old implementation fed this straight into
    clarity_structure/keyword_quality, which penalized the underlying
    evidence's shape rather than anything a reader or an ATS would ever
    see."""
    values = _values(facts)
    return sum(count - 1 for count in Counter(value.casefold() for value in values if value).values() if count > 1)


def score_readiness(version):
    facts = version.source_facts or {}
    content = version.resume_content or {}
    sections = facts.get("sections", {})
    blockers = []
    if not facts or not content.get("items"):
        blockers.append("empty_resume_content")
    if not any(_field(item) == "professional_title" for item in sections.get("profile", [])):
        blockers.append("missing_professional_title")
    if not any(_field(item) in {"public_email", "social_links"} for item in sections.get("profile", [])):
        blockers.append("missing_public_contact_method")
    for key, blocker in (("experience", "no_experience"), ("education", "no_education"), ("skills", "no_skills")):
        if not sections.get(key):
            blockers.append(blocker)
    values = _values(facts)
    numbers = sum(bool(re.search(r"\b\d+(?:\.\d+)?%?\b", value)) for value in values)
    # Résumé-quality repetition (feeds clarity_structure/keyword_quality
    # below) is scored ONLY from what the document actually renders:
    # duplicate visible lines, and keyword stuffing within one visible
    # line. It must never be computed from source_facts, which also
    # carries internal provenance metadata (e.g. Skill.category,
    # Skill.level) that is never displayed and whose natural repetition
    # (many real skills sharing "Backend" or level 4) is not a content
    # defect. See RESUME-SYSTEM-01B9.1.
    repeated_visible_values = _repeated_visible_values(content)
    repeated_content_keywords = _repeated_content_keywords(content)
    repeated = repeated_visible_values + repeated_content_keywords
    # Provenance/debug-only signal - deliberately excluded from `repeated`
    # and from every scored category. Exposed on the report for
    # transparency/tooling, never used to reduce the score.
    source_metadata_repetition = _source_metadata_repetition(facts)
    technical_claims = [
        item
        for item in _claims(facts)
        if any(term in str(item.get("value", "")).casefold() for term in TECHNICAL_TERMS)
    ]
    categories = {
        "identity_contact": 10 if sections.get("profile") else 0,
        "required_sections": sum(bool(sections.get(key)) for key in ("custom_summary", "experience", "education", "skills")) * 3 + (3 if sections.get("custom_summary") else 0),
        "experience_quality": min(20, len(sections.get("experience", [])) * 2 + min(numbers, 4)),
        "skills_alignment": min(15, sum(term in " ".join(values).casefold() for term in TECHNICAL_TERMS)),
        "projects_evidence": min(15, len(sections.get("projects", [])) * 2),
        "education_certification_integrity": min(10, len(sections.get("education", [])) * 5 + min(len(sections.get("certifications", [])), 1) * 2),
        "clarity_structure": max(0, 10 - min(10, repeated)),
        "keyword_quality": max(0, 5 - min(5, repeated)),
    }
    score = min(100, max(0, sum(categories.values())))
    if blockers:
        score = min(score, 59)
    warnings = []
    recommendations = []
    if repeated:
        warnings.append("keyword_repetition_detected")
        recommendations.append("Reduce repeated keywords and keep each claim evidence-led.")
    if blockers:
        recommendations.append("Add verified evidence for missing sections.")
    category_evidence_ids = {
        "identity_contact": _evidence_ids(sections.get("profile", [])),
        "required_sections": _evidence_ids(
            sections.get("custom_summary", [])
            + sections.get("experience", [])
            + sections.get("education", [])
            + sections.get("skills", [])
        ),
        "experience_quality": _evidence_ids(sections.get("experience", [])),
        "skills_alignment": _evidence_ids(technical_claims),
        "projects_evidence": _evidence_ids(sections.get("projects", [])),
        "education_certification_integrity": _evidence_ids(
            sections.get("education", []) + sections.get("certifications", [])
        ),
        "clarity_structure": _evidence_ids(_claims(facts)),
        "keyword_quality": _evidence_ids(technical_claims),
    }
    return {
        "ruleset_version": ATS_RULESET_VERSION,
        "score": score,
        "categories": categories,
        "category_maxima": dict(READINESS_WEIGHTS),
        "critical_blockers": blockers,
        "warnings": warnings,
        "evidence_ids": sorted({claim_id for ids in category_evidence_ids.values() for claim_id in ids}),
        "category_evidence_ids": category_evidence_ids,
        "recommendations": recommendations,
        "disclaimer": DISCLAIMER,
        # Diagnostic/integrity signal only - see _source_metadata_repetition().
        # Never subtracted from `score` or any category; useful for owner/
        # data-quality tooling (e.g. flagging near-duplicate Skill rows).
        "source_metadata_repetition": source_metadata_repetition,
    }
