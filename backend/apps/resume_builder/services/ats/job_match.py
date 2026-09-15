from .exceptions import ATSInputError
from .rules import ATS_RULESET_VERSION, DISCLAIMER, JOB_MATCH_WEIGHTS, MAX_JOB_DESCRIPTION_LENGTH, TECHNICAL_TERMS
from .text import normalize, phrases


def score_job_match(version, application):
    jd = application.job_description_snapshot or ""
    if not jd or len(jd) > MAX_JOB_DESCRIPTION_LENGTH:
        raise ATSInputError("Job description is missing or exceeds the safe maximum length.")
    if application.resume_version_id != version.pk:
        raise ATSInputError("Application does not reference the selected résumé.")
    resume_text = " ".join(str(item.get("value", "")) for section in (version.source_facts or {}).get("sections", {}).values() for item in section)
    normalized_jd = normalize(jd)
    matched = []
    missing = []
    claims = [item for section in (version.source_facts or {}).get("sections", {}).values() for item in section]
    for term in TECHNICAL_TERMS:
        if term in normalized_jd:
            evidence = [item for item in claims if term in normalize(str(item.get("value", "")))]
            if evidence:
                matched.append({"term": term, "source_claim_ids": [item["claim_id"] for item in evidence], "section": "source_facts"})
            else:
                missing.append(term)
    technical = min(45, len(matched) * 5)
    role = 15 if normalize(version.target_role or "software engineer") in normalized_jd else 0
    readiness = 10 if version.source_hash and version.resume_content_hash else 0
    categories = {"technical_skill_evidence": technical, "responsibility_domain_evidence": min(25, len(phrases(jd, ("responsibilities", "backend", "full stack"))) * 8), "role_seniority_alignment": role, "education_certification_requirements": 0, "readiness": readiness}
    evidence_ids = sorted({claim_id for item in matched for claim_id in item["source_claim_ids"]})
    return {
        "ruleset_version": ATS_RULESET_VERSION,
        "score": min(100, sum(categories.values())),
        "categories": categories,
        "category_maxima": dict(JOB_MATCH_WEIGHTS),
        "critical_blockers": [],
        "warnings": [],
        "evidence_ids": evidence_ids,
        "matched_evidence": matched,
        "recommendations": [f"Consider verified evidence for: {term}" for term in missing],
        "disclaimer": DISCLAIMER,
    }
