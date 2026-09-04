from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path
from urllib.request import urlopen

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.core.models import PublishableModel
from apps.portfolio.models import Education, Experience, Project, Service, Skill, SkillCategory, Technology
from apps.resume_builder.models import ResumeVersion
from apps.seo.models import PageSEO, SEOAliasKeyword
from apps.site_config.models import SiteSetting


@dataclass
class SeedProject:
    title: str
    description: str
    tools: list[str]
    live_url: str
    github_url: str
    featured: bool = False
    preview_image_url: str = ""
    featured_image_url: str = ""
    # Publication gate for seed content whose authenticity/status has not
    # been verified yet (see docs/rebuild/CONTENT_TRUTH_INVENTORY.md and
    # OPEN_DECISIONS.md). Seeded as a real Project row either way so it
    # stays manageable in the admin, but excluded from every public
    # queryset via the existing Project.status mechanism until verified.
    published: bool = True


def _download_remote_image(url: str, filename: str):
    if not url:
        return None

    try:
        with urlopen(url, timeout=10) as response:  # nosec: trusted public image source for seed content
            return ContentFile(response.read(), name=Path(filename).name)
    except Exception:
        # A seed-time image fetch failing (network hiccup, host down) must
        # not fail the whole deploy build - the project record still gets
        # created/updated without a preview image.
        return None


class Command(BaseCommand):
    help = "Seeds initial portfolio content so public pages can load from database immediately."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset-resume",
            action="store_true",
            help="Reset resume include relations before seeding default resume version.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        now = timezone.now()

        self.stdout.write(self.style.NOTICE("Seeding site settings..."))
        site_settings = SiteSetting.get_solo()
        site_settings.site_name = "Shahriyar Khan Portfolio"
        site_settings.owner_name = "Shahriyar Khan"
        site_settings.public_email = "shahriyarkhanpk1@gmail.com"
        site_settings.public_phone = "+92 311 0924560"
        site_settings.public_location = "Islamabad, Pakistan"
        site_settings.notification_email = "shahriyarkhanpk1@gmail.com"
        site_settings.hero_title = "Hi, I'm Shahriyar Khan"
        site_settings.hero_subtitle = "Software Engineer crafting scalable products with Python, Django, FastAPI, and modern frontend technologies."
        site_settings.default_seo_title = "Shahriyar Khan — Software Engineer | Python & Django Developer"
        site_settings.default_seo_description = "Premium portfolio of Shahriyar Khan (Shary), Software Engineer specializing in Python, Django, FastAPI, scalable backend systems, and modern full-stack development."
        site_settings.default_keywords = "Shahriyar, Shahriyar Khan, Shary, Software Engineer, Python Developer, Django Developer, Backend Developer, Junior Full Stack Developer"
        site_settings.footer_text = "Building reliable software with clean architecture and backend-first engineering."
        site_settings.social_links = {
            "linkedin": "https://linkedin.com/in/shahriyarkhan786",
            "github": "https://github.com/Shahriyar-Kh",
            "whatsapp": "https://wa.me/923110924560",
        }
        site_settings.maintenance_mode = False
        site_settings.save()

        self.stdout.write(self.style.NOTICE("Seeding SEO aliases and page metadata..."))
        alias_keywords = [
            "Shahriyar",
            "Shahriyar Khan",
            "Shary",
            "Software Engineer",
            "Python Developer",
            "Django Developer",
            "Backend Developer",
            "Junior Full Stack Developer",
        ]
        for keyword in alias_keywords:
            SEOAliasKeyword.objects.update_or_create(keyword=keyword, defaults={"is_active": True})

        page_seo = {
            "home": {
                "title_tag": "Shahriyar Khan — Software Engineer | Python & Django Developer",
                "meta_description": "Shahriyar Khan (Shary) is a Software Engineer, Python Developer, Django Developer, and Backend Developer building scalable, production-grade web applications.",
                "keywords": "Shahriyar, Shahriyar Khan, Shary, Software Engineer, Python Developer, Django Developer, Backend Developer, Junior Full Stack Developer",
                "og_title": "Shahriyar Khan — Software Engineer",
                "og_description": "Portfolio of Shahriyar Khan (Shary), a Python, Django, and FastAPI developer focused on scalable backend architecture.",
                "image_alt_text": "Professional profile photo of Shahriyar Khan",
            },
            "about": {
                "title_tag": "About — Shahriyar Khan | Software Engineer",
                "meta_description": "About Shahriyar Khan (Shary): Software Engineer, Python Developer, Django Developer, and Backend Developer with production experience building scalable systems.",
                "keywords": "About Shahriyar Khan, Shary, Software Engineer, Python Developer, Django Developer, Backend Developer",
                "og_title": "About Shahriyar Khan",
                "og_description": "Shahriyar Khan is a Software Engineer with strong Python, Django, FastAPI, and backend architecture expertise.",
                "image_alt_text": "Shahriyar Khan standing portrait",
            },
            "skills": {
                "title_tag": "Skills — Shahriyar Khan | Technical Expertise",
                "meta_description": "Technical skills of Shahriyar Khan (Shary), Software Engineer specializing in Python, Django, FastAPI, React, and scalable backend development.",
                "keywords": "Shahriyar skills, Python Developer, Django Developer, Backend Developer, Junior Full Stack Developer",
                "og_title": "Skills — Shahriyar Khan",
                "og_description": "Frontend, Backend, Database, Tools, and Deployment expertise.",
            },
            "services": {
                "title_tag": "Services — Shahriyar Khan | Web Development Services",
                "meta_description": "Professional services by Shahriyar Khan (Shary): website development, ecommerce, SaaS products, backend engineering, and custom web applications.",
                "keywords": "Shahriyar services, web development services, Django developer for hire, backend developer services",
                "og_title": "Services — Shahriyar Khan",
                "og_description": "Hire Shahriyar Khan for web development, backend engineering, and custom applications.",
            },
            "projects": {
                "title_tag": "Projects — Shahriyar Khan | Portfolio",
                "meta_description": "Explore projects by Shahriyar Khan (Shary), including AI platforms, full-stack systems, and scalable backend solutions built with Python, Django, and FastAPI.",
                "keywords": "Shahriyar projects, Python projects, Django projects, backend portfolio, software engineer projects",
                "og_title": "Projects — Shahriyar Khan",
                "og_description": "Real-world portfolio projects showcasing Python, Django, FastAPI, React, and production-ready architecture.",
            },
            "resume": {
                "title_tag": "Resume — Shahriyar Khan | Software Engineer CV",
                "meta_description": "Download Shahriyar Khan's ATS-optimized resume. Software Engineer, Python Developer, Django Developer, and Backend Developer.",
                "keywords": "Shahriyar resume, software engineer CV, python developer resume, django developer resume",
                "og_title": "Resume — Shahriyar Khan",
                "og_description": "ATS-friendly CV of a Python & Django developer.",
            },
            "contact": {
                "title_tag": "Contact — Shahriyar Khan | Get in Touch",
                "meta_description": "Contact Shahriyar Khan (Shary) for web development, backend engineering, freelance projects, and software engineering opportunities.",
                "keywords": "Contact Shahriyar Khan, hire Python developer, Django developer contact, backend developer Pakistan",
                "og_title": "Contact Shahriyar Khan",
                "og_description": "Reach out for web development services, freelance work, or employment opportunities.",
            },
        }

        for page_key, defaults in page_seo.items():
            PageSEO.objects.update_or_create(page_key=page_key, defaults=defaults)

        self.stdout.write(self.style.NOTICE("Seeding skills and categories..."))
        skill_map = {
            "backend": [
                ("Python", 4),
                ("Django / DRF", 4),
                ("FastAPI", 3),
                ("REST APIs", 4),
                ("JWT / RBAC", 4),
            ],
            "frontend": [
                ("React.js", 3),
                ("JavaScript", 3),
                ("HTML5 / CSS3", 4),
                ("Bootstrap", 3),
                ("Tailwind CSS", 3),
            ],
            "database": [
                ("PostgreSQL", 4),
                ("MongoDB", 3),
                ("MySQL", 3),
                ("Redis", 3),
            ],
            "tools": [
                ("Git / GitHub", 4),
                ("Postman", 4),
                ("Docker", 2),
                ("Render / Vercel", 4),
                ("Supabase / Cloudflare", 3),
            ],
            "deployment": [
                ("Cloudflare Workers", 3),
                ("Vercel", 4),
                ("Render", 4),
            ],
        }

        category_order = ["backend", "frontend", "database", "tools", "deployment"]
        category_instances: dict[str, SkillCategory] = {}

        for index, slug in enumerate(category_order, start=1):
            category, _ = SkillCategory.objects.update_or_create(
                slug=slug,
                defaults={"name": slug.replace("-", " ").title(), "display_order": index},
            )
            category_instances[slug] = category

        for category_slug, items in skill_map.items():
            category = category_instances[category_slug]
            for order, (name, level) in enumerate(items, start=1):
                Skill.objects.update_or_create(
                    name=name,
                    category=category,
                    defaults={
                        "level": level,
                        "display_order": order,
                        "published": True,
                        "description": f"{name} used in production and portfolio projects.",
                    },
                )

        self.stdout.write(self.style.NOTICE("Seeding projects, technologies, and services..."))
        projects = [
            SeedProject(
                title="SK-LearnTrack — AI Learning Platform",
                description="Full-stack LMS using Django REST Framework and React with JWT authentication, student progress tracking, and OpenAI-powered AI-assisted learning features.",
                tools=["Django", "DRF", "React", "PostgreSQL", "OpenAI"],
                live_url="https://sk-learntrack.vercel.app",
                github_url="https://github.com/Shahriyar-Kh",
                featured=True,
            ),
            SeedProject(
                title="NoteAssist-AI — Productivity Platform",
                description="Full-stack application with secure REST APIs, JWT authentication, RBAC, PostgreSQL database, and Redis caching for high performance.",
                tools=["Django", "DRF", "React.js", "PostgreSQL", "Redis", "JWT"],
                live_url="https://noteassistai.vercel.app",
                github_url="https://github.com/Shahriyar-Kh",
                featured=True,
            ),
            SeedProject(
                title="FeelWise — Emotion Detection System",
                description="Microservices-based AI system with FastAPI backend, Node.js API Gateway, and Chart.js visualization. Multi-modal emotion detection via text, speech, and facial analysis.",
                tools=["FastAPI", "Python", "Node.js", "MongoDB", "JWT"],
                live_url="https://feelwise-emotion-detection.feelwise.workers.dev",
                github_url="https://github.com/Shahriyar-Kh",
                featured=True,
            ),
            SeedProject(
                title="Advanced Restaurant Management System",
                description="Desktop application for business operations with inventory management, order tracking, analytics dashboards, and modern UI/UX design.",
                tools=["Python", "Django", "PyQt5", "SQLite"],
                live_url="",
                github_url="https://github.com/Shahriyar-Kh",
            ),
            SeedProject(
                title="InsightBoard CRM - Sales Intelligence Dashboard",
                description="A polished CRM and analytics dashboard with lead management, sales forecasting, reporting widgets, and role-based access for growing teams.",
                tools=["Django", "DRF", "React", "PostgreSQL", "Chart.js", "Tailwind CSS"],
                live_url="https://insightboard-crm.vercel.app",
                github_url="https://github.com/Shahriyar-Kh",
                featured=False,
                preview_image_url="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
                featured_image_url="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80",
                # P01A stabilization (2026-08-27): hidden pending owner
                # verification. Its images are generic Unsplash stock
                # photos, not real screenshots, and its live_url returned
                # HTTP 404 when checked live. Do not flip this to True
                # without first replacing the imagery and confirming the
                # project is real - see OPEN_DECISIONS.md blocker #5.
                published=False,
            ),
        ]

        project_instances: list[Project] = []
        for order, item in enumerate(projects, start=1):
            project, _ = Project.objects.update_or_create(
                slug=slugify(item.title),
                defaults={
                    "title": item.title,
                    "description": item.description,
                    "live_url": item.live_url,
                    "github_url": item.github_url,
                    "status": Project.Status.PUBLISHED if item.published else Project.Status.DRAFT,
                    "published_at": now if item.published else None,
                    "display_order": order,
                    "featured": item.featured and item.published,
                    "seo_title": f"{item.title} — Shahriyar Khan",
                    "seo_description": item.description,
                    "seo_keywords": ", ".join(item.tools),
                    "og_title": item.title,
                    "og_description": item.description,
                    "alt_text": f"Preview image for {item.title}",
                    "image_alt_text": f"Preview image for {item.title}",
                    "ai_summary": item.description,
                },
            )
            technologies = []
            for tool in item.tools:
                technology, _ = Technology.objects.get_or_create(name=tool, defaults={"slug": slugify(tool)})
                technologies.append(technology)
            project.technologies.set(technologies)

            preview_file = _download_remote_image(item.preview_image_url, f"{slugify(item.title)}-preview.jpg")
            if preview_file:
                project.preview_image.save(preview_file.name, preview_file, save=False)

            featured_file = _download_remote_image(item.featured_image_url, f"{slugify(item.title)}-featured.jpg")
            if featured_file:
                project.featured_image.save(featured_file.name, featured_file, save=False)

            if preview_file or featured_file:
                project.save()

            project_instances.append(project)

        services = [
            (
                "Website Development",
                "Modern, responsive, SEO-optimized websites tailored to your business needs.",
                ["Responsive UI", "SEO fundamentals", "Performance optimization", "Deployment support"],
            ),
            (
                "Restaurant Website",
                "Beautiful restaurant websites with menus, reservations, and online ordering.",
                ["Digital menu", "Reservation flow", "Order integration", "Mobile-first design"],
            ),
            (
                "Ecommerce Website",
                "Full-featured ecommerce platforms with payment integration and inventory management.",
                ["Catalog and cart", "Secure payments", "Inventory support", "Order workflow"],
            ),
            (
                "SaaS Project",
                "Scalable SaaS applications with authentication, dashboards, and subscription billing.",
                ["Authentication", "Multi-role dashboard", "Subscription model", "API integrations"],
            ),
            (
                "Portfolio Website",
                "Premium portfolio websites that showcase your work and attract clients.",
                ["Personal branding", "Project showcase", "Contact flow", "SEO setup"],
            ),
            (
                "Backend Development",
                "Robust APIs, database architecture, and server-side logic using Django and FastAPI.",
                ["REST API", "Database modeling", "Authentication and permissions", "Deployment-ready architecture"],
            ),
            (
                "Custom Web Application",
                "Tailored web applications built to solve your specific business problems.",
                ["Requirement analysis", "Custom implementation", "Testing", "Production deployment"],
            ),
        ]

        for order, (title, description, deliverables) in enumerate(services, start=1):
            Service.objects.update_or_create(
                slug=slugify(title),
                defaults={
                    "title": title,
                    "description": description,
                    "deliverables": deliverables,
                    "status": Service.Status.PUBLISHED,
                    "published_at": now,
                    "display_order": order,
                    "featured": order <= 3,
                    "seo_title": f"{title} — Shahriyar Khan",
                    "seo_description": description,
                    "seo_keywords": f"{title}, Shahriyar Khan, web development",
                    "og_title": title,
                    "og_description": description,
                    "image_alt_text": f"Service card for {title}",
                },
            )

        self.stdout.write(self.style.NOTICE("Seeding experience and education..."))
        experiences = [
            {
                "company_name": "HA Technologies (Pvt) Ltd",
                "role_title": "Software Developer",
                "start_date": date(2025, 6, 1),
                "end_date": None,
                "current_role": True,
                "location": "Islamabad",
                "description": "Developed scalable full-stack web applications using Django, DRF, FastAPI, and React.js.",
                "achievements": [
                    "Developed scalable full-stack web applications using Django, DRF, FastAPI, and React.js",
                    "Designed secure backend architectures with JWT authentication and RBAC",
                    "Implemented PostgreSQL, MongoDB, and Redis for data and caching",
                    "Integrated AI-powered modules for intelligent application features",
                    "Deployed applications using Render and Vercel in agile environments",
                ],
                "technologies": ["Django", "DRF", "FastAPI", "React.js", "PostgreSQL", "MongoDB", "Redis"],
            },
            {
                "company_name": "CodeAlpha",
                "role_title": "Python Developer Intern",
                "start_date": date(2025, 2, 1),
                "end_date": date(2025, 5, 31),
                "current_role": False,
                "location": "Remote",
                "description": "Developed desktop applications using Python, PyQt5, and Tkinter.",
                "achievements": [
                    "Developed desktop applications using Python, PyQt5, and Tkinter",
                    "Implemented event-driven architecture and API integrations",
                ],
                "technologies": ["Python", "PyQt5"],
            },
            {
                "company_name": "Abasyn University Incubation Center",
                "role_title": "Web Developer Intern (Team Lead)",
                "start_date": date(2024, 9, 1),
                "end_date": date(2025, 2, 28),
                "current_role": False,
                "location": "Peshawar",
                "description": "Built full-stack applications using Django, PyQt5, and REST APIs while leading development tasks.",
                "achievements": [
                    "Built full-stack applications using Django, PyQt5, and REST APIs",
                    "Led development team and managed task execution",
                ],
                "technologies": ["Django", "REST APIs", "PyQt5"],
            },
        ]

        experience_instances: list[Experience] = []
        for order, item in enumerate(experiences, start=1):
            experience, _ = Experience.objects.update_or_create(
                company_name=item["company_name"],
                role_title=item["role_title"],
                defaults={
                    "start_date": item["start_date"],
                    "end_date": item["end_date"],
                    "current_role": item["current_role"],
                    "location": item["location"],
                    "description": item["description"],
                    "achievements": item["achievements"],
                    "status": PublishableModel.Status.PUBLISHED,
                    "display_order": order,
                    "seo_title": f"{item['role_title']} at {item['company_name']}",
                    "seo_description": item["description"],
                    "seo_keywords": ", ".join(item["technologies"]),
                },
            )
            tech_objs = []
            for name in item["technologies"]:
                tech, _ = Technology.objects.get_or_create(name=name, defaults={"slug": slugify(name)})
                tech_objs.append(tech)
            experience.technologies.set(tech_objs)
            experience_instances.append(experience)

        education, _ = Education.objects.update_or_create(
            institution="Abasyn University, Peshawar",
            degree="BS Software Engineering",
            defaults={
                "start_date": date(2021, 9, 1),
                "end_date": date(2025, 6, 30),
                "description": "Graduated 2025 • CGPA 3.67",
                "status": Education.Status.PUBLISHED,
                "published_at": now,
                "display_order": 1,
            },
        )

        self.stdout.write(self.style.NOTICE("Seeding default resume version..."))
        resume, _ = ResumeVersion.objects.update_or_create(
            slug="shahriyar-khan-software-engineer",
            defaults={
                "title": "Shahriyar Khan",
                "target_role": "Software Engineer | Python • Django • FastAPI",
                "custom_summary": "Software Engineer with experience designing and developing scalable web applications and backend systems using Python, Django, and FastAPI. Strong understanding of SDLC, system design, and API-driven architectures. Experienced in building production-ready systems, integrating AI-powered features, and delivering reliable solutions in agile environments.",
                "is_default": True,
                "status": ResumeVersion.Status.PUBLISHED,
                "published_at": now,
                "ats_tags": "Software Engineer, Python Developer, Django Developer, Backend Developer",
            },
        )

        if options["reset_resume"]:
            resume.include_projects.clear()
            resume.include_experiences.clear()
            resume.include_skills.clear()
            resume.include_education.clear()

        resume.include_projects.set(project_instances)
        resume.include_experiences.set(experience_instances)
        resume.include_skills.set(Skill.objects.filter(published=True))
        resume.include_education.set([education])

        ResumeVersion.objects.exclude(pk=resume.pk).filter(is_default=True).update(is_default=False)

        self.stdout.write(self.style.SUCCESS("Portfolio seed completed successfully."))
