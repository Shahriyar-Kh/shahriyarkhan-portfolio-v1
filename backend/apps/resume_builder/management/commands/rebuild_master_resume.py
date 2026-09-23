from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.portfolio.models import Certification, Education, Experience, Project, Skill
from apps.resume_builder.models import ResumeExport, ResumeVersion
from apps.resume_builder.services import (
    approve_version,
    create_master_draft,
    generate_resume_export,
    publish_version,
    validate_version_snapshot,
)
from apps.resume_builder.services.canonical import MASTER_POSITIONING, MASTER_SUMMARY
from apps.resume_builder.services.exports import resolve_downloadable_export


class Command(BaseCommand):
    help = (
        "Build a fresh canonical Master résumé from current verified/published portfolio records. "
        "Dry-run by default; pass --execute to create, approve, generate PDF/DOCX, and publish."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Create and publish the canonical Master résumé.",
        )
        parser.add_argument(
            "--owner-username",
            default="",
            help="Optional owner/admin username. Required only when multiple owner accounts exist.",
        )

    def _owner(self, username):
        user_model = get_user_model()
        if username:
            user = user_model.objects.filter(username=username, is_active=True, is_staff=True).first()
            if user is None or not getattr(getattr(user, "profile", None), "is_owner", False):
                raise CommandError("The requested user is not an active staff owner.")
            return user

        owners = list(
            user_model.objects.filter(
                is_active=True,
                is_staff=True,
                profile__is_owner=True,
            ).order_by("pk")[:2]
        )
        if not owners:
            raise CommandError("No active staff owner account exists.")
        if len(owners) > 1:
            raise CommandError(
                "Multiple owner accounts exist; re-run with --owner-username."
            )
        return owners[0]

    def _selections(self):
        return {
            "include_experiences": list(
                Experience.objects.filter(status="published").order_by("-start_date", "pk")
            ),
            "include_education": list(
                Education.objects.filter(status="published").order_by("-start_date", "pk")
            ),
            "include_skills": list(
                Skill.objects.filter(published=True)
                .select_related("category")
                .order_by("category__display_order", "display_order", "pk")
            ),
            "include_projects": list(
                Project.objects.filter(status="published").order_by("display_order", "pk")[:3]
            ),
            "include_certifications": list(
                Certification.objects.filter(status="published", is_verified=True)
                .order_by("-issue_date", "pk")
            ),
        }

    def handle(self, *args, **options):
        selections = self._selections()
        self.stdout.write(f"Positioning: {MASTER_POSITIONING}")
        self.stdout.write(f"Summary: {MASTER_SUMMARY}")
        self.stdout.write(
            "Selected sources: "
            f"{len(selections['include_experiences'])} experience, "
            f"{len(selections['include_education'])} education, "
            f"{len(selections['include_skills'])} skills, "
            f"{len(selections['include_projects'])} projects, "
            f"{len(selections['include_certifications'])} certifications."
        )
        self.stdout.write(
            "Projects: "
            + ", ".join(item.title for item in selections["include_projects"])
        )

        if not options["execute"]:
            self.stdout.write(
                self.style.WARNING(
                    "DRY RUN — no résumé created. Re-run with --execute after reviewing the selections."
                )
            )
            return

        owner = self._owner(options["owner_username"])
        with transaction.atomic():
            version = create_master_draft(
                actor=owner,
                custom_summary=MASTER_SUMMARY,
                selections=selections,
            )
            version = approve_version(version=version, actor=owner)
            generate_resume_export(
                resume_version=version,
                format_name=ResumeExport.Format.PDF,
                actor=owner,
            )
            generate_resume_export(
                resume_version=version,
                format_name=ResumeExport.Format.DOCX,
                actor=owner,
            )
            version = publish_version(version=version, actor=owner)
            validate_version_snapshot(version)
            for format_name in (ResumeExport.Format.PDF, ResumeExport.Format.DOCX):
                if resolve_downloadable_export(version, format_name) is None:
                    raise CommandError(
                        f"Published résumé failed final {format_name.upper()} delivery validation."
                    )

        self.stdout.write(
            self.style.SUCCESS(
                "Published healthy canonical Master résumé: "
                f"id={version.pk} slug={version.slug}"
            )
        )
