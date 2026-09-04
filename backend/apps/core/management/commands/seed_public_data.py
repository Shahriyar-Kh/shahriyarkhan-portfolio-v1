from __future__ import annotations

import json
from urllib.error import URLError
from urllib.request import Request, urlopen

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from apps.core.models import PublishableModel
from apps.portfolio.models import Education, Experience, Project, Service, Skill, SkillCategory, Technology

DEFAULT_SOURCE = "https://shahriyarkhan.onrender.com"
PAGE_SIZE_PARAM = "?page_size=100"


def _fetch_json(url: str) -> dict:
    # The source API's free-tier host can cold-start (empirically ~22s).
    # This command is an occasional operator-run import, not a
    # request-path call, so a generous timeout costs nothing.
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "portfolio-v1-seed/1.0"})
    with urlopen(request, timeout=45) as response:
        return json.loads(response.read().decode("utf-8"))


def _fetch_all(base_url: str, path: str) -> list[dict]:
    """Follows DRF's `next` pagination link until exhausted. Every record
    returned here already passed through the *public* endpoint, which the
    backend itself filters to status=published server-side - there is no
    separate "exclude drafts" step needed on this side."""
    results: list[dict] = []
    url = f"{base_url}{path}{PAGE_SIZE_PARAM}"
    while url:
        payload = _fetch_json(url)
        page = payload.get("results", payload if isinstance(payload, list) else [])
        results.extend(page)
        url = payload.get("next") if isinstance(payload, dict) else None
    return results


class Command(BaseCommand):
    help = (
        "Idempotently imports Portfolio V1's sanitized public data set - "
        "projects, services, skills, experience, and education - directly "
        "from the live public API (never contact inquiries, admin users, "
        "or any unpublished record: the source API already filters those "
        "out server-side before this command ever sees a response). Safe "
        "to run repeatedly; matches existing rows by their real natural "
        "key (slug, or company/role/date for experience) and never "
        "duplicates."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            default=DEFAULT_SOURCE,
            help=f"Public API base URL to import from (default: {DEFAULT_SOURCE}).",
        )
        parser.add_argument(
            "--skip-images",
            action="store_true",
            help=(
                "Skip downloading preview/featured project images. The "
                "homepage's own hero imagery (Project Proof Timeline, "
                "Services) is committed as local frontend static assets "
                "and never depends on this field - only the /work grid's "
                "card thumbnails read it, and degrade gracefully to a "
                "typographic fallback when it's empty."
            ),
        )

    def handle(self, *args, **options):
        source = options["source"].rstrip("/")
        skip_images = options["skip_images"]

        self.stdout.write(self.style.NOTICE(f"Importing sanitized public data from {source} ..."))

        try:
            self._import_technologies_and_projects(source, skip_images)
            self._import_services(source)
            self._import_skills(source)
            self._import_experiences(source)
            self._import_education(source)
        except URLError as exc:
            raise CommandError(f"Could not reach {source}: {exc}") from exc

        self.stdout.write(self.style.SUCCESS("Sanitized public-data import complete."))

    @transaction.atomic
    def _import_technologies_and_projects(self, source: str, skip_images: bool) -> None:
        records = _fetch_all(source, "/api/v1/public/portfolio/projects/")
        self.stdout.write(f"  projects: {len(records)} published record(s)")
        for record in records:
            technologies = []
            for tech in record.get("technologies", []):
                technology, _ = Technology.objects.get_or_create(
                    slug=tech["slug"], defaults={"name": tech["name"]}
                )
                technologies.append(technology)

            project, _ = Project.objects.update_or_create(
                slug=record["slug"],
                defaults={
                    "title": record["title"],
                    "description": record["description"],
                    "live_url": record.get("live_url", ""),
                    "github_url": record.get("github_url", ""),
                    "alt_text": record.get("alt_text", ""),
                    "ai_summary": record.get("ai_summary", ""),
                    "featured": record.get("featured", False),
                    "status": Project.Status.PUBLISHED,
                    "published_at": record.get("published_at"),
                    "display_order": record.get("display_order", 0),
                    "seo_title": record.get("seo_title", ""),
                    "seo_description": record.get("seo_description", ""),
                    "seo_keywords": record.get("seo_keywords", ""),
                    "og_title": record.get("og_title", ""),
                    "og_description": record.get("og_description", ""),
                    "image_alt_text": record.get("image_alt_text", ""),
                },
            )
            project.technologies.set(technologies)

            if not skip_images:
                self._attach_remote_image(project, "preview_image", record.get("preview_image"))
                self._attach_remote_image(project, "featured_image", record.get("featured_image"))

    def _attach_remote_image(self, project: Project, field_name: str, url: str | None) -> None:
        if not url:
            return
        from django.core.files.base import ContentFile
        from pathlib import Path

        try:
            request = Request(url, headers={"User-Agent": "portfolio-v1-seed/1.0"})
            with urlopen(request, timeout=15) as response:
                content = ContentFile(response.read(), name=Path(url.split("?")[0]).name)
        except Exception:
            # A seed-time image fetch failing must never fail the whole
            # import - the project record still gets created/updated
            # without that one image.
            return
        getattr(project, field_name).save(content.name, content, save=True)

    def _import_services(self, source: str) -> None:
        records = _fetch_all(source, "/api/v1/public/portfolio/services/")
        self.stdout.write(f"  services: {len(records)} published record(s)")
        for record in records:
            Service.objects.update_or_create(
                slug=record["slug"],
                defaults={
                    "title": record["title"],
                    "description": record["description"],
                    "deliverables": record.get("deliverables", []),
                    "featured": record.get("featured", False),
                    "status": Service.Status.PUBLISHED,
                    "published_at": record.get("published_at"),
                    "display_order": record.get("display_order", 0),
                    "seo_title": record.get("seo_title", ""),
                    "seo_description": record.get("seo_description", ""),
                    "seo_keywords": record.get("seo_keywords", ""),
                    "og_title": record.get("og_title", ""),
                    "og_description": record.get("og_description", ""),
                    "image_alt_text": record.get("image_alt_text", ""),
                },
            )

    def _import_skills(self, source: str) -> None:
        records = _fetch_all(source, "/api/v1/public/portfolio/skills/")
        self.stdout.write(f"  skills: {len(records)} published record(s)")
        for record in records:
            category_data = record["category"]
            category, _ = SkillCategory.objects.update_or_create(
                slug=category_data["slug"],
                defaults={
                    "name": category_data["name"],
                    "display_order": category_data.get("display_order", 0),
                },
            )
            Skill.objects.update_or_create(
                name=record["name"],
                category=category,
                defaults={
                    "description": record.get("description", ""),
                    "level": record["level"],
                    "icon_or_badge": record.get("icon_or_badge", ""),
                    "published": True,
                    "display_order": record.get("display_order", 0),
                },
            )

    def _import_experiences(self, source: str) -> None:
        records = _fetch_all(source, "/api/v1/public/portfolio/experiences/")
        self.stdout.write(f"  experiences: {len(records)} published record(s)")
        for record in records:
            technologies = []
            for tech in record.get("technologies", []):
                technology, _ = Technology.objects.get_or_create(
                    slug=tech["slug"], defaults={"name": tech["name"]}
                )
                technologies.append(technology)

            # No slug on this model - the real natural key is which role,
            # at which company, starting when.
            experience, _ = Experience.objects.update_or_create(
                company_name=record["company_name"],
                role_title=record["role_title"],
                start_date=record["start_date"],
                defaults={
                    "end_date": record.get("end_date"),
                    "location": record.get("location", ""),
                    "description": record.get("description", ""),
                    "achievements": record.get("achievements", []),
                    "current_role": record.get("current_role", False),
                    # Experience does not inherit PublishableModel (see
                    # apps/portfolio/models.py) - it has its own `status`
                    # field but reuses PublishableModel.Status's choices.
                    "status": PublishableModel.Status.PUBLISHED,
                    "display_order": record.get("display_order", 0),
                    "seo_title": record.get("seo_title", ""),
                    "seo_description": record.get("seo_description", ""),
                    "seo_keywords": record.get("seo_keywords", ""),
                    "og_title": record.get("og_title", ""),
                    "og_description": record.get("og_description", ""),
                    "image_alt_text": record.get("image_alt_text", ""),
                },
            )
            experience.technologies.set(technologies)

    def _import_education(self, source: str) -> None:
        records = _fetch_all(source, "/api/v1/public/portfolio/education/")
        self.stdout.write(f"  education: {len(records)} published record(s)")
        for record in records:
            Education.objects.update_or_create(
                institution=record["institution"],
                degree=record["degree"],
                start_date=record["start_date"],
                defaults={
                    "end_date": record.get("end_date"),
                    "description": record.get("description", ""),
                    "status": Education.Status.PUBLISHED,
                    "published_at": record.get("published_at"),
                    "display_order": record.get("display_order", 0),
                },
            )
