from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from urllib.request import urlopen

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.portfolio.models import Project, Technology


@dataclass
class ProjectSeed:
    title: str
    description: str
    tools: list[str]
    live_url: str
    github_url: str
    preview_image_url: str
    featured_image_url: str


def download_image(url: str, filename: str):
    try:
        with urlopen(url, timeout=10) as response:  # nosec: trusted public image source for seed content
            return ContentFile(response.read(), name=Path(filename).name)
    except Exception:
        # A seed-time image fetch failing must not fail the whole deploy
        # build - see docs/rebuild/P01A_STABILIZATION_REPORT.md.
        return None


class Command(BaseCommand):
    help = "Seeds the InsightBoard CRM project with real preview and featured images."

    @transaction.atomic
    def handle(self, *args, **options):
        seed = ProjectSeed(
            title="InsightBoard CRM - Sales Intelligence Dashboard",
            description="A polished CRM and analytics dashboard with lead management, sales forecasting, reporting widgets, and role-based access for growing teams.",
            tools=["Django", "DRF", "React", "PostgreSQL", "Chart.js", "Tailwind CSS"],
            live_url="https://insightboard-crm.vercel.app",
            github_url="https://github.com/Shahriyar-Kh",
            preview_image_url="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
            featured_image_url="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80",
        )

        project, _ = Project.objects.update_or_create(
            slug=slugify(seed.title),
            defaults={
                "title": seed.title,
                "description": seed.description,
                "live_url": seed.live_url,
                "github_url": seed.github_url,
                # P01A stabilization (2026-08-27): hidden pending owner
                # verification - this record still exists and is fully
                # admin-manageable, but must not appear on any public
                # endpoint until its authenticity, imagery, and demo
                # status are confirmed. See OPEN_DECISIONS.md blocker #5.
                "status": Project.Status.DRAFT,
                "published_at": None,
                "featured": False,
                "seo_title": f"{seed.title} - Shahriyar Khan",
                "seo_description": seed.description,
                "seo_keywords": ", ".join(seed.tools),
                "og_title": seed.title,
                "og_description": seed.description,
                "alt_text": f"Preview image for {seed.title}",
                "image_alt_text": f"Preview image for {seed.title}",
                "ai_summary": seed.description,
            },
        )

        technologies = []
        for tool in seed.tools:
            technology, _ = Technology.objects.get_or_create(name=tool, defaults={"slug": slugify(tool)})
            technologies.append(technology)
        project.technologies.set(technologies)

        preview_file = download_image(seed.preview_image_url, f"{slugify(seed.title)}-preview.jpg")
        if preview_file:
            project.preview_image.save(preview_file.name, preview_file, save=False)

        featured_file = download_image(seed.featured_image_url, f"{slugify(seed.title)}-featured.jpg")
        if featured_file:
            project.featured_image.save(featured_file.name, featured_file, save=False)

        project.save()

        self.stdout.write(self.style.SUCCESS(f"Seeded project (hidden/draft, pending verification): {project.title}"))