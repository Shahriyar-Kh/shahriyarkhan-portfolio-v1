from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from apps.resume_builder.models import ResumeExport, ResumeVersion
from apps.resume_builder.services import ensure_published_master, rebuild_and_publish_master, resolve_downloadable_export


class Command(BaseCommand):
    help = (
        "Build a fresh evidence-backed master résumé from current published portfolio data, "
        "generate PDF/DOCX, publish it as the default, and optionally purge old unreferenced versions."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            default=None,
            help="Owner/admin username to attribute the governed release to.",
        )
        parser.add_argument(
            "--purge-old",
            action="store_true",
            help=(
                "Delete old resume versions that are not referenced by job applications or ATS assessments. "
                "Governed history is preserved automatically."
            ),
        )
        parser.add_argument(
            "--ensure-current",
            action="store_true",
            help=(
                "Reuse the existing published default master when its curated selections, snapshot, and "
                "PDF/DOCX artifacts are current; otherwise rebuild and publish a fresh master."
            ),
        )

    def _actor(self, username):
        user_model = get_user_model()
        if username:
            actor = user_model.objects.filter(username=username, is_active=True).first()
            if actor is None:
                raise CommandError(f'Active user "{username}" was not found.')
            return actor

        actor = (
            user_model.objects.filter(is_active=True, profile__is_owner=True)
            .order_by("-is_superuser", "pk")
            .first()
        )
        if actor is None:
            actor = user_model.objects.filter(is_active=True, is_superuser=True).order_by("pk").first()
        if actor is None:
            raise CommandError("No active portfolio owner/superuser is available. Pass --username explicitly.")
        return actor

    def handle(self, *args, **options):
        actor = self._actor(options.get("username"))
        ensure_current = bool(options.get("ensure_current"))
        existing = (
            ResumeVersion.objects.filter(
                resume_type=ResumeVersion.ResumeType.MASTER,
                status=ResumeVersion.Status.PUBLISHED,
                is_default=True,
            )
            .order_by("-published_at", "-pk")
            .first()
        )
        if ensure_current:
            result = ensure_published_master(
                actor=actor,
                purge_old=bool(options.get("purge_old")),
            )
        else:
            result = rebuild_and_publish_master(
                actor=actor,
                purge_old=bool(options.get("purge_old")),
            )
        version = result.version

        pdf = resolve_downloadable_export(version, ResumeExport.Format.PDF)
        docx = resolve_downloadable_export(version, ResumeExport.Format.DOCX)
        if pdf is None or docx is None:
            raise CommandError("Master published but final artifact availability check failed.")

        if ensure_current and existing is not None and existing.pk == version.pk:
            self.stdout.write(self.style.SUCCESS("Published master résumé is already current."))
        else:
            self.stdout.write(self.style.SUCCESS("Fresh master résumé published successfully."))
        self.stdout.write(f"Version ID: {version.pk}")
        self.stdout.write(f"Slug: {version.slug}")
        self.stdout.write(f"Status: {version.status}")
        self.stdout.write(f"Default: {version.is_default}")
        self.stdout.write(f"PDF: {pdf.byte_size} bytes sha256={pdf.sha256}")
        self.stdout.write(f"DOCX: {docx.byte_size} bytes sha256={docx.sha256}")
        self.stdout.write(
            f"Old versions purged: {len(result.purged_ids)}"
            + (f" ({', '.join(map(str, result.purged_ids))})" if result.purged_ids else "")
        )
        self.stdout.write(
            f"Old versions preserved by governed references: {len(result.protected_ids)}"
            + (f" ({', '.join(map(str, result.protected_ids))})" if result.protected_ids else "")
        )
