from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.resume_builder.models import ResumeAssessment, ResumeExport, ResumeVersion
from apps.resume_builder.services import validate_version_snapshot
from apps.resume_builder.services.exceptions import SnapshotError
from apps.resume_builder.services.exports import resolve_downloadable_export


class Command(BaseCommand):
    help = (
        "Safely purge old résumé versions after a healthy published default master exists. "
        "Dry-run by default; pass --execute to mutate data. Versions referenced by job "
        "applications are always preserved."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--execute",
            action="store_true",
            help="Actually delete eligible old résumé versions. Without this flag, only report.",
        )

    def _current_public_master(self):
        return ResumeVersion.objects.filter(
            resume_type=ResumeVersion.ResumeType.MASTER,
            status=ResumeVersion.Status.PUBLISHED,
            is_default=True,
        ).first()

    def _assert_healthy_current(self, current):
        if current is None:
            raise CommandError("Refusing purge: no published default master exists.")
        try:
            validate_version_snapshot(current)
        except SnapshotError as exc:
            raise CommandError("Refusing purge: current published master snapshot is invalid.") from exc
        for format_name in (ResumeExport.Format.PDF, ResumeExport.Format.DOCX):
            if resolve_downloadable_export(current, format_name) is None:
                raise CommandError(
                    f"Refusing purge: current published master has no valid {format_name.upper()} download."
                )

    def handle(self, *args, **options):
        current = self._current_public_master()
        self._assert_healthy_current(current)

        candidates = (
            ResumeVersion.objects.exclude(pk=current.pk)
            .prefetch_related("applications", "assessments", "exports")
            .order_by("created_at", "pk")
        )
        deletable = []
        protected = []

        for version in candidates:
            if version.applications.exists():
                protected.append(
                    {
                        "id": version.pk,
                        "slug": version.slug,
                        "status": version.status,
                        "reason": f"referenced by {version.applications.count()} job application(s)",
                    }
                )
            else:
                deletable.append(version)

        self.stdout.write(
            f"Current healthy public master: id={current.pk} slug={current.slug}"
        )
        self.stdout.write(f"Eligible old versions: {len(deletable)}")
        for version in deletable:
            self.stdout.write(
                "  DELETE "
                f"id={version.pk} slug={version.slug} status={version.status} "
                f"exports={version.exports.count()} assessments={version.assessments.count()}"
            )
        self.stdout.write(f"Protected old versions: {len(protected)}")
        for item in protected:
            self.stdout.write(
                f"  KEEP id={item['id']} slug={item['slug']} status={item['status']} — {item['reason']}"
            )

        if not options["execute"]:
            self.stdout.write(self.style.WARNING("DRY RUN — no data changed. Re-run with --execute after review."))
            return

        with transaction.atomic():
            for version in deletable:
                # Assessments are immutable audit records but belong only to
                # this obsolete résumé version. Job-application-linked
                # versions are excluded above and therefore never reach this
                # deletion path.
                ResumeAssessment.objects.filter(resume_version=version).delete()
                version.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Purged {len(deletable)} old résumé version(s); kept current master and "
                f"{len(protected)} application-referenced version(s)."
            )
        )
