from __future__ import annotations

import os

from django.core.management.base import BaseCommand

from apps.core.management.commands.sync_canonical_profile_2026 import (
    _parse_iso_date,
    sync_canonical_profile,
)


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
            help="Optional TriCore start-date override in YYYY-MM-DD format. Default canonical month is July 2026.",
        )

    def handle(self, *args, **options):
        start_raw = options.get("tricore_start_date") or os.getenv("TRICORE_START_DATE")
        start_date = _parse_iso_date(start_raw, "TriCore start date")

        if options["reset_resume"]:
            self.stdout.write(
                self.style.WARNING(
                    "--reset-resume is retained only for command compatibility; published resume snapshots are immutable "
                    "and are not rewritten by the canonical content sync."
                )
            )

        counts = sync_canonical_profile(tricore_start_date=start_date)

        self.stdout.write(
            self.style.SUCCESS(
                "Portfolio seed synchronized from canonical data: "
                f'{counts["projects"]} projects, {counts["services"]} services, '
                f'{counts["skills"]} skills, {counts["experiences"]} experience rows, '
                f'{counts["seo"]} SEO records.'
            )
        )
