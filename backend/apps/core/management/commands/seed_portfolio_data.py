from __future__ import annotations

import os

from django.core.management.base import BaseCommand

from apps.core.management.commands.sync_canonical_profile_2026 import (
    _parse_iso_date,
    sync_canonical_profile,
)
from apps.portfolio.models import Experience
from apps.resume_builder.models import ResumeVersion


class Command(BaseCommand):
    """
    Compatibility wrapper for local/bootstrap workflows.

    The canonical 2026 sync command is the single source for public profile,
    project, service, skill, SEO, and experience facts. Keeping this command
    as a wrapper prevents an older seed dataset from silently reintroducing
    stale employers, generic repository links, old services, or obsolete SEO.
    """

    help = "Seed/synchronize the canonical portfolio dataset."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset-resume",
            action="store_true",
            help="Clear current resume include-relations before rebuilding them from canonical published records.",
        )
        parser.add_argument(
            "--tricore-start-date",
            dest="tricore_start_date",
            default=None,
            help="Verified TriCore start date in YYYY-MM-DD format. Omit it rather than guessing.",
        )

    def handle(self, *args, **options):
        start_raw = options.get("tricore_start_date") or os.getenv("TRICORE_START_DATE")
        start_date = _parse_iso_date(start_raw, "TriCore start date")

        if options["reset_resume"]:
            resume = ResumeVersion.objects.filter(slug="shahriyar-khan-software-engineer").first()
            if resume is not None:
                resume.include_projects.clear()
                resume.include_experiences.clear()
                resume.include_skills.clear()
                resume.include_education.clear()

        counts = sync_canonical_profile(tricore_start_date=start_date)

        if start_date is None and not Experience.objects.filter(
            company_name="TriCore Digital Tech",
            role_title="Software Engineer (Contract)",
        ).exists():
            self.stdout.write(
                self.style.WARNING(
                    "TriCore Digital Tech was not created because its exact public start date is still unverified. "
                    "Provide --tricore-start-date YYYY-MM-DD only after confirming the published employment record."
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Portfolio seed synchronized from canonical data: "
                f'{counts["projects"]} projects, {counts["services"]} services, '
                f'{counts["skills"]} skills, {counts["experiences"]} experience rows, '
                f'{counts["seo"]} SEO records.'
            )
        )
