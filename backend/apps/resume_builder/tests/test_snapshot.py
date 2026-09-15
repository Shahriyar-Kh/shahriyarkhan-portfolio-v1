from datetime import date

from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.portfolio.models import Certification, Experience, Project, Technology
from apps.resume_builder.models import ResumeVersion
from apps.resume_builder.services import (
    SnapshotSourceUnavailable,
    SnapshotValidationError,
    canonical_json,
    clone_version_to_draft,
    compare_freshness,
    create_master_draft,
    create_tailored_draft,
    regenerate_from_current_portfolio,
    source_hash,
)
from apps.resume_builder.services.canonical import collect_source_facts
from apps.site_config.models import SiteSetting


class SnapshotServiceTests(TestCase):
    def setUp(self):
        SiteSetting.objects.create(owner_name="Owner", public_email="public@example.com")

    def test_identical_facts_have_identical_canonical_json_and_hash(self):
        facts = {"b": [2, 1], "a": {"value": "x"}}
        self.assertEqual(canonical_json(facts), canonical_json({"a": {"value": "x"}, "b": [2, 1]}))
        digest = source_hash(facts)
        self.assertEqual(digest, source_hash(facts))
        self.assertEqual(len(digest), 64)
        self.assertEqual(digest, digest.lower())

    def test_changed_value_changes_hash(self):
        self.assertNotEqual(source_hash({"value": "before"}), source_hash({"value": "after"}))

    def test_master_and_tailored_drafts_are_new_private_non_default_snapshots(self):
        master = create_master_draft()
        tailored = create_tailored_draft(target_role="Engineer", target_organization="Org")
        self.assertEqual(master.title, "Software Engineer | Python & Django Full-Stack Developer")
        self.assertEqual(master.status, ResumeVersion.Status.DRAFT)
        self.assertFalse(master.is_default)
        self.assertEqual(tailored.resume_type, ResumeVersion.ResumeType.TAILORED)
        self.assertFalse(tailored.is_default)
        self.assertEqual(tailored.target_organization, "Org")
        self.assertEqual(tailored.source_hash, source_hash(tailored.source_facts))

    def test_clone_creates_new_uuid_and_leaves_original_unchanged(self):
        original = create_master_draft(custom_summary="Original")
        original_values = (original.pk, original.version_uuid, original.source_hash, original.resume_content)
        clone = clone_version_to_draft(source=original)
        self.assertNotEqual(clone.pk, original.pk)
        self.assertNotEqual(clone.version_uuid, original.version_uuid)
        self.assertEqual((original.pk, original.version_uuid, original.source_hash, original.resume_content), original_values)
        self.assertEqual(clone.status, ResumeVersion.Status.DRAFT)

    def test_custom_summary_is_owner_authored_and_content_has_provenance(self):
        version = create_master_draft(custom_summary="Owner-authored summary")
        claims = version.source_facts["sections"]["custom_summary"]
        self.assertEqual(claims[0]["value"], "Owner-authored summary")
        self.assertTrue(all(item["source_claim_ids"] for item in version.resume_content["items"]))

    def test_freshness_detects_current_changed_and_unavailable(self):
        version = create_master_draft()
        self.assertEqual(compare_freshness(version)["status"], "current")
        SiteSetting.objects.update(owner_name="Changed")
        self.assertEqual(compare_freshness(version)["status"], "changed")
        experience = Experience.objects.create(
            company_name="Company", role_title="Role", start_date=date(2024, 1, 1), description="Verified", status="published"
        )
        version = create_master_draft(selections={"include_experiences": [experience]})
        refreshed = regenerate_from_current_portfolio(source=version)
        experience.delete()
        self.assertEqual(compare_freshness(refreshed)["status"], "unavailable")

    def test_unpublished_and_unverified_selected_sources_are_rejected(self):
        experience = Experience.objects.create(
            company_name="Company", role_title="Role", start_date=date(2024, 1, 1), description="Hidden", status="draft"
        )
        with self.assertRaises(SnapshotSourceUnavailable):
            create_master_draft(selections={"include_experiences": [experience]})
        certification = Certification.objects.create(
            name="Certificate", issuer="Issuer", issue_date=date(2024, 1, 1), status="published", is_verified=False
        )
        with self.assertRaises(SnapshotSourceUnavailable):
            create_master_draft(selections={"include_certifications": [certification]})

    def test_unknown_claim_and_unknown_section_are_rejected(self):
        facts = {"schema_version": 1, "sections": {"profile": []}, "provenance": {}}
        with self.assertRaises(SnapshotValidationError):
            from apps.resume_builder.services.canonical import validate_snapshot
            validate_snapshot(facts, {"items": []}, "0" * 64)


class ProjectTechnologyClaimIdTests(TestCase):
    """RESUME-SYSTEM-01B9.1: collect_source_facts() previously keyed each
    project-technology claim only by (Technology.pk, position-within-
    that-project's-own-alphabetical-list). Two selected projects sharing
    a Technology at the same alphabetical rank produced an IDENTICAL
    claim_id, which create_master_draft() correctly refused with
    "Duplicate claim IDs detected." - a real defect discovered in B9 when
    auditing real production data (multiple real projects share "Django",
    "PostgreSQL", etc). These tests prove the fix: claim IDs now also
    carry the owning Project's own identity, so they are unique per
    (project, technology) pair regardless of alphabetical position, and
    stable/deterministic for the same underlying fact."""

    def setUp(self):
        SiteSetting.objects.create(owner_name="Owner", public_email="public@example.com")

    def _project(self, title, slug, *technologies):
        project = Project.objects.create(title=title, slug=slug, description=f"{title} description.", status="published")
        project.technologies.set(technologies)
        return project

    def test_same_technology_on_two_projects_does_not_collide(self):
        django = Technology.objects.create(name="Django", slug="django")
        project_a = self._project("Project A", "project-a-claimid", django)
        project_b = self._project("Project B", "project-b-claimid", django)

        version = create_master_draft(selections={"include_projects": [project_a, project_b]})

        tech_claim_ids = [
            item["claim_id"]
            for item in version.source_facts["sections"]["projects"]
            if item["source"]["field"] == "name" and item["source"]["model"] == "portfolio.project.technology"
        ]
        self.assertEqual(len(tech_claim_ids), 2)
        self.assertEqual(len(set(tech_claim_ids)), 2, "claim IDs for the same Technology on two different Projects must be unique")

    def test_multiple_technologies_in_one_project_are_unique(self):
        django = Technology.objects.create(name="Django", slug="django")
        drf = Technology.objects.create(name="DRF", slug="drf")
        postgres = Technology.objects.create(name="PostgreSQL", slug="postgresql")
        project = self._project("Project C", "project-c-claimid", django, drf, postgres)

        version = create_master_draft(selections={"include_projects": [project]})

        tech_claim_ids = [
            item["claim_id"]
            for item in version.source_facts["sections"]["projects"]
            if item["source"]["field"] == "name" and item["source"]["model"] == "portfolio.project.technology"
        ]
        self.assertEqual(len(tech_claim_ids), 3)
        self.assertEqual(len(set(tech_claim_ids)), 3)

    def test_same_source_fact_collected_twice_is_deterministic(self):
        django = Technology.objects.create(name="Django", slug="django")
        project = self._project("Project D", "project-d-claimid", django)
        version = create_master_draft(selections={"include_projects": [project]})
        version.refresh_from_db()

        first = collect_source_facts(version)
        second = collect_source_facts(version)
        first_ids = sorted(item["claim_id"] for item in first["sections"]["projects"])
        second_ids = sorted(item["claim_id"] for item in second["sections"]["projects"])
        self.assertEqual(first_ids, second_ids)

    def test_different_source_facts_produce_different_ids(self):
        django = Technology.objects.create(name="Django", slug="django")
        project_a = self._project("Project E", "project-e-claimid", django)
        project_b = self._project("Project F", "project-f-claimid", django)

        version_a = create_master_draft(selections={"include_projects": [project_a]})
        version_b = create_master_draft(selections={"include_projects": [project_b]})

        tech_id_a = next(
            item["claim_id"] for item in version_a.source_facts["sections"]["projects"]
            if item["source"]["model"] == "portfolio.project.technology"
        )
        tech_id_b = next(
            item["claim_id"] for item in version_b.source_facts["sections"]["projects"]
            if item["source"]["model"] == "portfolio.project.technology"
        )
        self.assertNotEqual(tech_id_a, tech_id_b, "the same Technology used by two different Projects must produce different claim IDs")

    def test_create_master_draft_accepts_many_real_world_projects_sharing_technologies(self):
        # Mirrors the real production shape audited in B9: several
        # projects all genuinely using Django/DRF/PostgreSQL/React.js.
        django = Technology.objects.create(name="Django", slug="django")
        drf = Technology.objects.create(name="DRF", slug="drf")
        postgres = Technology.objects.create(name="PostgreSQL", slug="postgresql")
        react = Technology.objects.create(name="React.js", slug="reactjs")

        yango = self._project("Yango Wing Fleet", "yango-claimid", django, drf, postgres, react)
        noteassist = self._project("NoteAssist-AI", "noteassist-claimid", django, drf, postgres, react)
        learntrack = self._project("SK-LearnTrack", "learntrack-claimid", django, drf, postgres)

        version = create_master_draft(selections={"include_projects": [yango, noteassist, learntrack]})

        tech_claim_ids = [
            item["claim_id"]
            for item in version.source_facts["sections"]["projects"]
            if item["source"]["model"] == "portfolio.project.technology"
        ]
        # 4 + 4 + 3 = 11 technology claims total, all unique.
        self.assertEqual(len(tech_claim_ids), 11)
        self.assertEqual(len(set(tech_claim_ids)), 11)

    def test_provenance_lookup_resolves_for_shared_technology_claims(self):
        django = Technology.objects.create(name="Django", slug="django")
        project_a = self._project("Project G", "project-g-claimid", django)
        project_b = self._project("Project H", "project-h-claimid", django)
        version = create_master_draft(selections={"include_projects": [project_a, project_b]})

        claims_by_id = {
            item["claim_id"]: item
            for item in version.source_facts["sections"]["projects"]
            if item["source"]["model"] == "portfolio.project.technology"
        }
        self.assertEqual(len(claims_by_id), 2)
        for claim_id, item in claims_by_id.items():
            self.assertEqual(item["value"], "Django")
            self.assertEqual(item["source"]["field"], "name")
            self.assertIn(str(item["source"]["record_id"]), claim_id)
