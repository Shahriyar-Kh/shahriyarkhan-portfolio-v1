import json

from django.core.management.base import BaseCommand

from apps.resume_builder.models import ResumeExport, ResumeVersion
from apps.resume_builder.services import validate_version_snapshot
from apps.resume_builder.services.exceptions import SnapshotError
from apps.resume_builder.services.exports import resolve_downloadable_export


class Command(BaseCommand):
    help = "Audit résumé lifecycle, public-master state, references, and PDF/DOCX delivery without mutating data."

    def handle(self, *args, **options):
        versions = (
            ResumeVersion.objects.all()
            .prefetch_related("exports", "applications", "assessments")
            .order_by("-created_at", "-pk")
        )
        rows = []
        for version in versions:
            try:
                validate_version_snapshot(version)
                snapshot_valid = True
                snapshot_error = ""
            except SnapshotError as exc:
                snapshot_valid = False
                snapshot_error = getattr(exc, "code", exc.__class__.__name__)

            exports = {}
            for format_name in (ResumeExport.Format.PDF, ResumeExport.Format.DOCX):
                export = next((item for item in version.exports.all() if item.format == format_name), None)
                exports[format_name] = {
                    "exists": export is not None,
                    "status": export.status if export else None,
                    "byte_size": export.byte_size if export else 0,
                    "downloadable": resolve_downloadable_export(version, format_name) is not None,
                }

            rows.append(
                {
                    "id": version.pk,
                    "slug": version.slug,
                    "resume_type": version.resume_type,
                    "status": version.status,
                    "is_default": version.is_default,
                    "snapshot_valid": snapshot_valid,
                    "snapshot_error": snapshot_error,
                    "applications": version.applications.count(),
                    "assessments": version.assessments.count(),
                    "exports": exports,
                    "created_at": version.created_at.isoformat(),
                    "published_at": version.published_at.isoformat() if version.published_at else None,
                }
            )

        current = next(
            (
                row
                for row in rows
                if row["resume_type"] == ResumeVersion.ResumeType.MASTER
                and row["status"] == ResumeVersion.Status.PUBLISHED
                and row["is_default"]
            ),
            None,
        )
        payload = {
            "version_count": len(rows),
            "published_default_count": sum(
                1
                for row in rows
                if row["resume_type"] == ResumeVersion.ResumeType.MASTER
                and row["status"] == ResumeVersion.Status.PUBLISHED
                and row["is_default"]
            ),
            "public_master_healthy": bool(
                current
                and current["snapshot_valid"]
                and current["exports"]["pdf"]["downloadable"]
                and current["exports"]["docx"]["downloadable"]
            ),
            "current_public_master": current,
            "versions": rows,
        }
        self.stdout.write(json.dumps(payload, indent=2, sort_keys=True))
