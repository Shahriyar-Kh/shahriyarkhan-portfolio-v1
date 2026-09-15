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
