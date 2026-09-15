import hashlib

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models import ProtectedError
from django.test import TestCase, TransactionTestCase

from apps.resume_builder.models import JobApplicationRecord, ResumeAssessment, ResumeVersion
from apps.resume_builder.services import create_master_draft
from apps.resume_builder.services.canonical import source_hash
from apps.resume_builder.services.lifecycle import resume_content_hash
from apps.resume_builder.services.ats import ATS_RULESET_VERSION, DISCLAIMER, READINESS_WEIGHTS, assessment_is_current, run_job_match_assessment, run_readiness_assessment
from apps.resume_builder.services.ats.exceptions import ATSInputError
from apps.resume_builder.services.ats.job_match import score_job_match
from apps.resume_builder.services.ats.readiness import score_readiness
from apps.resume_builder.services.ats.rules import JOB_MATCH_WEIGHTS


class ATSScoringTests(TestCase):
    def setUp(self):
        self.version = create_master_draft(custom_summary="A verified summary.")

    def test_weights_total_100_and_score_is_bounded(self):
        self.assertEqual(sum(READINESS_WEIGHTS.values()), 100)
        result = score_readiness(self.version)
        self.assertGreaterEqual(result["score"], 0)
        self.assertLessEqual(result["score"], 100)

    def test_readiness_report_contains_scores_maxima_governance_and_valid_evidence(self):
        result = score_readiness(self.version)
        self.assertEqual(result["ruleset_version"], ATS_RULESET_VERSION)
        self.assertEqual(set(result["categories"]), set(READINESS_WEIGHTS))
        self.assertEqual(result["category_maxima"], READINESS_WEIGHTS)
        self.assertEqual(set(result["category_evidence_ids"]), set(READINESS_WEIGHTS))
        for category, maximum in READINESS_WEIGHTS.items():
            self.assertGreaterEqual(result["categories"][category], 0)
            self.assertLessEqual(result["categories"][category], maximum)
        valid_claim_ids = {
            item["claim_id"]
            for section in self.version.source_facts["sections"].values()
            for item in section
        }
        self.assertTrue(set(result["evidence_ids"]).issubset(valid_claim_ids))
        self.assertTrue(
            all(
                set(evidence_ids).issubset(valid_claim_ids)
                for evidence_ids in result["category_evidence_ids"].values()
            )
        )
        self.assertIsInstance(result["critical_blockers"], list)
        self.assertIsInstance(result["warnings"], list)
        self.assertIsInstance(result["recommendations"], list)
        self.assertEqual(result["disclaimer"], DISCLAIMER)

    def test_same_input_is_deterministic_and_blocker_caps_score(self):
        first = score_readiness(self.version)
        second = score_readiness(self.version)
        self.assertEqual(first, second)
        self.assertLessEqual(first["score"], 59)
        self.assertIn("no_experience", first["critical_blockers"])
        self.assertEqual(first["score"], 33)

    def test_readiness_assessment_is_immutable_and_current(self):
        assessment = run_readiness_assessment(version=self.version)
        self.assertEqual(assessment.ruleset_version, ATS_RULESET_VERSION)
        self.assertIsNone(assessment.job_application)
        self.assertEqual(assessment.job_description_hash, "")
        self.assertTrue(assessment_is_current(assessment))
        historical_hashes = (assessment.source_hash, assessment.resume_content_hash)
        with self.assertRaises(ValidationError):
            assessment.score = 99
            assessment.save()
        ResumeVersion.objects.filter(pk=self.version.pk).update(
            source_hash="f" * 64,
            resume_content_hash="e" * 64,
        )
        assessment.refresh_from_db()
        self.assertEqual(
            (assessment.source_hash, assessment.resume_content_hash),
            historical_hashes,
        )
        self.assertFalse(assessment_is_current(assessment))

    def test_exact_duplicate_assessment_is_rejected(self):
        run_readiness_assessment(version=self.version)
        with self.assertRaises(Exception):
            run_readiness_assessment(version=self.version)

    def test_stale_hash_blocks_assessment_without_lifecycle_change(self):
        self.version.source_hash = "0" * 64
        self.version.save(update_fields=("source_hash",))
        with self.assertRaises(ATSInputError):
            run_readiness_assessment(version=self.version)
        self.version.refresh_from_db()
        self.assertEqual(self.version.status, ResumeVersion.Status.DRAFT)

    def test_job_match_reports_verified_evidence_and_recommendations(self):
        application = JobApplicationRecord.objects.create(
            organization="Org", job_title="Engineer", resume_version=self.version,
            job_description_snapshot="Python and Django backend engineer; PostgreSQL preferred.",
            job_description_hash=hashlib.sha256(b"Python and Django backend engineer; PostgreSQL preferred.").hexdigest(),
        )
        result = score_job_match(self.version, application)
        self.assertTrue(result["recommendations"] or result["matched_evidence"])
        self.assertEqual(result["ruleset_version"], ATS_RULESET_VERSION)
        self.assertEqual(result["category_maxima"], JOB_MATCH_WEIGHTS)
        self.assertEqual(result["disclaimer"], DISCLAIMER)
        valid_claim_ids = {
            item["claim_id"]
            for section in self.version.source_facts["sections"].values()
            for item in section
        }
        self.assertTrue(set(result["evidence_ids"]).issubset(valid_claim_ids))
        assessment = run_job_match_assessment(version=self.version, application=application)
        self.assertEqual(assessment.job_application, application)
        self.assertEqual(assessment.job_description_hash, application.job_description_hash)
        self.assertEqual(assessment.report, result)
        self.assertTrue(assessment_is_current(assessment))
        with self.assertRaises(ProtectedError):
            application.delete()

    def test_jd_only_keyword_has_no_resume_evidence_credit(self):
        application = JobApplicationRecord.objects.create(
            organization="Org", job_title="Engineer", resume_version=self.version,
            job_description_snapshot="Kubernetes and Rust experience required.",
        )
        result = score_job_match(self.version, application)
        self.assertEqual(result["matched_evidence"], [])

    def test_job_match_rejects_oversized_or_wrong_resume_input(self):
        application = JobApplicationRecord.objects.create(
            organization="Org", job_title="Engineer", resume_version=self.version,
            job_description_snapshot="x" * 20001,
        )
        with self.assertRaises(ATSInputError):
            run_job_match_assessment(version=self.version, application=application)
        other = create_master_draft()
        application.job_description_snapshot = "Python"
        application.resume_version = other
        application.save(update_fields=("resume_version",))
        with self.assertRaises(ATSInputError):
            run_job_match_assessment(version=self.version, application=application)

    def test_assessment_admin_is_read_only(self):
        from apps.resume_builder.admin import ResumeAssessmentAdmin
        admin = ResumeAssessmentAdmin(ResumeAssessment, None)
        self.assertFalse(admin.has_add_permission(None))
        self.assertFalse(admin.has_change_permission(None))
        self.assertFalse(admin.has_delete_permission(None))

    def test_strong_evidence_fixture_reaches_85_without_blockers(self):
        sparse_score = score_readiness(self.version)["score"]
        facts = {"schema_version": 1, "sections": {
            "profile": [
                {"claim_id": "profile:title", "value": "Software Engineer", "source": {"model": "test", "record_id": 1, "field": "professional_title"}},
                {"claim_id": "profile:email", "value": "public@example.com", "source": {"model": "test", "record_id": 1, "field": "public_email"}},
                {"claim_id": "profile:location", "value": "Dhaka", "source": {"model": "test", "record_id": 1, "field": "location"}},
                {"claim_id": "profile:links", "value": "https://github.com/example", "source": {"model": "test", "record_id": 1, "field": "links"}},
            ],
            "experience": [{"claim_id": f"experience:{i}", "value": value, "source": {"model": "test", "record_id": 2, "field": "experience"}} for i, value in enumerate(["Python Django developer", "Backend Engineer", "2022", "2024", "Built APIs", "Improved security", "Led testing", "Shipped deployment"])],
            "education": [{"claim_id": "education:1", "value": "Computer Science", "source": {"model": "test", "record_id": 3, "field": "degree"}}],
            "skills": [{"claim_id": f"skill:{i}", "value": value, "source": {"model": "test", "record_id": 4, "field": "skill"}} for i, value in enumerate(["Python", "Django", "Django REST Framework", "PostgreSQL", "Full Stack", "Testing", "Security", "Deployment", "REST API", "Backend", "JavaScript", "React"])],
            "projects": [{"claim_id": f"project:{i}", "value": value, "source": {"model": "test", "record_id": 5, "field": "project"}} for i, value in enumerate(["Project purpose", "Technical contribution", "Live repository", "Delivered functionality", "API", "Security", "Testing", "Deployment"])],
            "certifications": [],
            "custom_summary": [{"claim_id": "summary:1", "value": "Experienced engineer", "source": {"model": "test", "record_id": 1, "field": "summary"}}],
        }, "provenance": {"source": "fixture"}}
        content = {
            "items": [
                {
                    "section": section,
                    "source_claim_ids": [item["claim_id"]],
                    "text": str(item["value"]),
                }
                for section, items in facts["sections"].items()
                for item in items
            ]
        }
        self.version.source_facts = facts
        self.version.resume_content = content
        self.version.source_hash = source_hash(facts)
        self.version.resume_content_hash = resume_content_hash(content)
        self.version.save(update_fields=("source_facts", "resume_content", "source_hash", "resume_content_hash"))
        result = score_readiness(self.version)
        self.assertGreaterEqual(result["score"], 85)
        self.assertGreater(result["score"], sparse_score)
        self.assertEqual(result["critical_blockers"], [])
        valid_claim_ids = {
            item["claim_id"]
            for section in facts["sections"].values()
            for item in section
        }
        self.assertEqual(set(result["evidence_ids"]), valid_claim_ids)
        self.assertTrue(
            all(
                set(item["source_claim_ids"]).issubset(valid_claim_ids)
                for item in content["items"]
            )
        )

    def test_stuffed_fixture_does_not_improve_keyword_quality(self):
        skill_claim = {
            "claim_id": "skill:1",
            "value": "Python Django",
            "source": {"model": "test", "record_id": 1, "field": "skill"},
        }
        self.version.source_facts["sections"]["skills"] = [skill_claim]
        self.version.resume_content = {
            "positioning": self.version.resume_content.get("positioning", ""),
            "items": [
                *self.version.resume_content["items"],
                {
                    "section": "skills",
                    "text": "Python Django",
                    "source_claim_ids": [skill_claim["claim_id"]],
                },
            ],
        }
        self.version.source_hash = source_hash(self.version.source_facts)
        self.version.resume_content_hash = resume_content_hash(self.version.resume_content)
        self.version.save(
            update_fields=(
                "source_facts",
                "source_hash",
                "resume_content",
                "resume_content_hash",
            )
        )
        truthful = score_readiness(self.version)
        stuffed_items = [dict(item) for item in self.version.resume_content["items"]]
        stuffed_items[-1]["text"] = "Python Django " * 20
        self.version.resume_content = {
            **self.version.resume_content,
            "items": stuffed_items,
        }
        self.version.resume_content_hash = resume_content_hash(self.version.resume_content)
        self.version.save(update_fields=("resume_content", "resume_content_hash"))
        stuffed = score_readiness(self.version)
        self.assertLessEqual(stuffed["score"], truthful["score"])
        self.assertLessEqual(
            stuffed["categories"]["keyword_quality"],
            truthful["categories"]["keyword_quality"],
        )
        self.assertIn("keyword_repetition_detected", stuffed["warnings"])
        self.assertEqual(stuffed["evidence_ids"], truthful["evidence_ids"])


class ATSVisibleContentRepetitionTests(TestCase):
    """RESUME-SYSTEM-01B9.1: the readiness scorer's repetition penalty
    (clarity_structure/keyword_quality) must reflect what the résumé
    actually SHOWS, never internal source-fact metadata (e.g. a real
    Skill's category/level, which collect_source_facts() captures as
    separate claims for provenance but never renders as its own line).
    Source coverage/provenance (evidence_ids, category_evidence_ids) is a
    different concern and must stay based on source_facts - unaffected
    by this fix."""

    def setUp(self):
        self.version = create_master_draft(custom_summary="A verified summary.")

    def _build_version_with_skills(self, skills, experience_role="Backend Engineer"):
        """`skills`: list of (name, category, level) tuples, mirroring the
        exact 3-claims-per-skill shape collect_source_facts() produces for
        real Skill rows. The visible resume_content only ever cites the
        *name* claims, grouped into one non-repeating line - exactly like
        a real polished résumé built through update_resume_content()."""
        profile = [{
            "claim_id": "resume_builder.positioning:0:professional_title",
            "value": "Software Engineer",
            "source": {"model": "resume_builder.positioning", "record_id": 0, "field": "professional_title"},
        }]
        skill_claims = []
        name_claim_ids = []
        for i, (name, category, level) in enumerate(skills, start=1):
            name_id = f"portfolio.skill:{i}:name"
            skill_claims.append({"claim_id": name_id, "value": name, "source": {"model": "portfolio.skill", "record_id": i, "field": "name"}})
            skill_claims.append({"claim_id": f"portfolio.skill:{i}:category", "value": category, "source": {"model": "portfolio.skill", "record_id": i, "field": "category"}})
            skill_claims.append({"claim_id": f"portfolio.skill:{i}:level", "value": str(level), "source": {"model": "portfolio.skill", "record_id": i, "field": "level"}})
            name_claim_ids.append(name_id)
        experience_claims = [
            {"claim_id": "portfolio.experience:1:role_title", "value": experience_role, "source": {"model": "portfolio.experience", "record_id": 1, "field": "role_title"}},
            {"claim_id": "portfolio.experience:1:achievement:0", "value": "Built and shipped a production feature.", "source": {"model": "portfolio.experience", "record_id": 1, "field": "achievement"}},
        ]
        education_claims = [
            {"claim_id": "portfolio.education:1:degree", "value": "BS Computer Science", "source": {"model": "portfolio.education", "record_id": 1, "field": "degree"}},
        ]
        summary_claims = [{
            "claim_id": "resume_builder.resumeversion:1:custom_summary",
            "value": "A verified summary.",
            "source": {"model": "resume_builder.resumeversion", "record_id": 1, "field": "custom_summary"},
        }]
        facts = {
            "schema_version": 1,
            "sections": {
                "profile": profile, "experience": experience_claims, "education": education_claims,
                "skills": skill_claims, "projects": [], "certifications": [], "custom_summary": summary_claims,
            },
            "provenance": {"source": "fixture"},
        }
        content = {
            "positioning": "Software Engineer",
            "items": [
                {"section": "positioning", "text": "Software Engineer", "source_claim_ids": ["resume_builder.positioning:0:professional_title"]},
                {"section": "summary", "text": "A verified summary.", "source_claim_ids": ["resume_builder.resumeversion:1:custom_summary"]},
                {"section": "skills", "text": ", ".join(name for name, _category, _level in skills), "source_claim_ids": name_claim_ids},
                {"section": "experience", "text": experience_role, "source_claim_ids": ["portfolio.experience:1:role_title"]},
                {"section": "experience", "text": "Built and shipped a production feature.", "source_claim_ids": ["portfolio.experience:1:achievement:0"]},
                {"section": "education", "text": "BS Computer Science", "source_claim_ids": ["portfolio.education:1:degree"]},
            ],
        }
        self.version.source_facts = facts
        self.version.resume_content = content
        self.version.source_hash = source_hash(facts)
        self.version.resume_content_hash = resume_content_hash(content)
        self.version.save(update_fields=("source_facts", "resume_content", "source_hash", "resume_content_hash"))
        return self.version

    def test_hidden_skill_category_and_level_repetition_does_not_penalize_visible_clarity(self):
        # 6 truthful, DISTINCT skill names, but category/level metadata
        # repeats heavily underneath - exactly like real verified data
        # (multiple Backend skills all rated level 4). None of that
        # metadata is ever rendered; only the distinct skill names are.
        skills = [
            ("Python", "Backend", 4),
            ("Django", "Backend", 4),
            ("REST APIs", "Backend", 4),
            ("PostgreSQL", "Database", 4),
            ("React.js", "Frontend", 3),
            ("JavaScript", "Frontend", 3),
        ]
        version = self._build_version_with_skills(skills)
        result = score_readiness(version)
        self.assertEqual(result["categories"]["clarity_structure"], 10, result)
        self.assertEqual(result["categories"]["keyword_quality"], 5, result)
        self.assertNotIn("keyword_repetition_detected", result["warnings"])

    def test_hidden_level_repetition_alone_does_not_penalize_visible_clarity(self):
        # Every skill shares both the same category AND the same level -
        # the worst case for hidden-metadata repetition - while every
        # skill NAME (the only thing ever displayed) stays distinct.
        skills = [(f"Skill{i}", "Backend", 4) for i in range(8)]
        version = self._build_version_with_skills(skills)
        result = score_readiness(version)
        self.assertEqual(result["categories"]["clarity_structure"], 10, result)
        self.assertEqual(result["categories"]["keyword_quality"], 5, result)

    def test_duplicated_visible_resume_bullet_is_still_penalized(self):
        version = self._build_version_with_skills([("Python", "Backend", 4)])
        content = version.resume_content
        content["items"].append(dict(content["items"][-2]))  # exact duplicate of the achievement bullet's visible text
        version.resume_content = content
        version.resume_content_hash = resume_content_hash(content)
        version.save(update_fields=("resume_content", "resume_content_hash"))
        result = score_readiness(version)
        self.assertLess(result["categories"]["clarity_structure"], 10)
        self.assertIn("keyword_repetition_detected", result["warnings"])

    def test_duplicate_visible_keyword_stuffing_within_one_bullet_is_still_penalized(self):
        version = self._build_version_with_skills([("Python", "Backend", 4)])
        content = version.resume_content
        content["items"][-1]["text"] = "Python Django Python Django Python Django Python Django " * 3
        version.resume_content = content
        version.resume_content_hash = resume_content_hash(content)
        version.save(update_fields=("resume_content", "resume_content_hash"))
        result = score_readiness(version)
        self.assertLess(result["categories"]["keyword_quality"], 5)
        self.assertIn("keyword_repetition_detected", result["warnings"])

    def test_unique_truthful_visible_content_has_no_false_repetition_penalty(self):
        skills = [("Python", "Backend", 4), ("Django", "Backend", 4)]
        version = self._build_version_with_skills(skills)
        result = score_readiness(version)
        self.assertEqual(result["categories"]["clarity_structure"], 10)
        self.assertEqual(result["categories"]["keyword_quality"], 5)

    def test_source_coverage_and_provenance_are_unaffected_by_the_fix(self):
        skills = [("Python", "Backend", 4), ("Django", "Backend", 4), ("REST APIs", "Backend", 4)]
        version = self._build_version_with_skills(skills)
        result = score_readiness(version)
        valid_claim_ids = {item["claim_id"] for section in version.source_facts["sections"].values() for item in section}
        self.assertTrue(set(result["evidence_ids"]).issubset(valid_claim_ids))
        # Category/level claims remain legitimate, resolvable provenance
        # even though this fix stops them from being scored as visible
        # repetition - they must not be deleted or hidden from facts.
        self.assertIn("portfolio.skill:1:category", valid_claim_ids)
        self.assertIn("portfolio.skill:1:level", valid_claim_ids)


class ResumeAssessmentConstraintTests(TransactionTestCase):
    def setUp(self):
        self.version = create_master_draft()
        self.hashes = {"resume_content_hash": self.version.resume_content_hash, "source_hash": self.version.source_hash}

    def assessment(self, **overrides):
        values = {"resume_version": self.version, "assessment_type": "readiness", "score": 50, "ruleset_version": "ats-1", **self.hashes, "report": {}, "critical_blockers": []}
        values.update(overrides)
        return ResumeAssessment(**values)

    def test_readiness_allows_no_application_and_job_match_requires_both(self):
        self.assessment().save()
        with self.assertRaises(ValidationError):
            self.assessment(assessment_type="job_match").full_clean()

    def test_score_bounds_and_duplicate_readiness_are_enforced(self):
        with self.assertRaises(IntegrityError):
            ResumeAssessment.objects.bulk_create([self.assessment(score=101)])
        first = self.assessment()
        first.save()
        with self.assertRaises(IntegrityError):
            ResumeAssessment.objects.bulk_create([self.assessment()])

    def test_referenced_rows_are_protected(self):
        assessment = self.assessment()
        assessment.save()
        from django.db.models import ProtectedError
        with self.assertRaises(ProtectedError):
            self.version.delete()
