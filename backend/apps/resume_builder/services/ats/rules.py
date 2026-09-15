ATS_RULESET_VERSION = "ats-1"
DISCLAIMER = "Internal résumé-readiness estimate only. It does not guarantee ATS ranking, interview selection, or employment."
READINESS_WEIGHTS = {
    "identity_contact": 10,
    "required_sections": 15,
    "experience_quality": 20,
    "skills_alignment": 15,
    "projects_evidence": 15,
    "education_certification_integrity": 10,
    "clarity_structure": 10,
    "keyword_quality": 5,
}
JOB_MATCH_WEIGHTS = {
    "technical_skill_evidence": 45,
    "responsibility_domain_evidence": 25,
    "role_seniority_alignment": 15,
    "education_certification_requirements": 5,
    "readiness": 10,
}
TECHNICAL_TERMS = (
    "python", "django", "django rest framework", "rest api", "postgresql", "postgres", "database",
    "backend", "full stack", "testing", "security", "deployment", "javascript", "typescript", "react",
)
ALIASES = {"drf": "django rest framework", "postgres": "postgresql", "rest apis": "rest api"}
STOP_WORDS = {"the", "and", "for", "with", "from", "that", "this", "into", "your", "our", "you"}
MAX_JOB_DESCRIPTION_LENGTH = 20000
