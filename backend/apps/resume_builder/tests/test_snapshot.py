from datetime import date

from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.portfolio.models import Certification, Experience
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
