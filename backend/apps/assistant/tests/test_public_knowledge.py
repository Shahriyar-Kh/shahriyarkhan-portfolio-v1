from datetime import date

from django.test import TestCase

from apps.assistant.services.public_knowledge import build_evidence_bundle
from apps.portfolio.models import Certification, Experience, Project, Service, Skill, SkillCategory
from apps.site_config.models import SiteSetting


class PublicKnowledgeBoundaryTests(TestCase):
    """PORTFOLIO-ASSISTANTS-01 section 3-4/24: the evidence bundle must
    include only genuinely published data and must never leak a draft
    record, and CognoRise/unverified certifications stay excluded exactly
    because they are never published - no special-casing is needed or
    present in public_knowledge.py itself."""

    def setUp(self):
        SiteSetting.objects.create(owner_name="Shahriyar Khan", public_email="owner@example.com")

    def test_published_project_is_included(self):
        Project.objects.create(title="Public Project", slug="public-project", description="A published project.", status="published")

        bundle = build_evidence_bundle()

        source_ids = {item.source_id for item in bundle}
        self.assertIn("project:public-project", source_ids)

    def test_draft_project_is_excluded(self):
        Project.objects.create(title="Draft Project", slug="draft-project", description="Not yet published.", status="draft")

        bundle = build_evidence_bundle()

        source_ids = {item.source_id for item in bundle}
        self.assertNotIn("project:draft-project", source_ids)

    def test_draft_experience_is_excluded(self):
        Experience.objects.create(
            company_name="CognoRise InfoTech", role_title="Intern", start_date=date(2024, 1, 1), description="Unverified.", status="draft"
        )

        bundle = build_evidence_bundle()

        titles = " ".join(item.title for item in bundle)
        self.assertNotIn("CognoRise", titles)

    def test_unpublished_skill_is_excluded(self):
        category = SkillCategory.objects.create(name="Backend", slug="backend")
        Skill.objects.create(name="Rust", category=category, published=False)

        bundle = build_evidence_bundle()

        titles = {item.title for item in bundle}
        self.assertNotIn("Rust", titles)

    def test_unverified_certification_never_enters_the_bundle(self):
        """Certification isn't even queried by public_knowledge.py, but
        this proves it structurally: an unverified cert existing in the
        DB at all has zero effect on what the assistant can see."""
        Certification.objects.create(name="Unverified Cert", issuer="Coursera", issue_date=date(2024, 1, 1), status="published", is_verified=False)

        bundle = build_evidence_bundle()

        titles = {item.title for item in bundle}
        self.assertNotIn("Unverified Cert", titles)

    def test_draft_service_is_excluded(self):
        Service.objects.create(title="Draft Service", slug="draft-service", description="Not live.", status="draft")

        bundle = build_evidence_bundle()

        source_ids = {item.source_id for item in bundle}
        self.assertNotIn("service:draft-service", source_ids)

    def test_evidence_item_never_carries_a_raw_database_id_as_its_source_id(self):
        Project.objects.create(title="Slug Project", slug="slug-project", description="Uses slug not pk.", status="published")

        bundle = build_evidence_bundle()

        project_item = next(item for item in bundle if item.source_type == "project")
        self.assertEqual(project_item.source_id, "project:slug-project")
        self.assertTrue(project_item.public_path.startswith("/work/"))
