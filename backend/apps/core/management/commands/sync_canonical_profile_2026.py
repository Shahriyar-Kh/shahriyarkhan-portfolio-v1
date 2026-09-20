from __future__ import annotations

import json
import os
from datetime import date

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.core.models import PublishableModel
from apps.portfolio.models import Education, Experience, Project, Service, Skill, SkillCategory, Technology
from apps.resume_builder.models import ResumeVersion
from apps.seo.models import PageSEO, SEOAliasKeyword
from apps.site_config.models import SiteSetting


CANONICAL_LINKEDIN = "https://www.linkedin.com/in/shahriyar-kh/"
CANONICAL_GITHUB = "https://github.com/Shahriyar-Kh"
CANONICAL_PORTFOLIO = "https://shahriyarkhan.com/"
CANONICAL_EMAIL = "shahriyarkhanpk1@gmail.com"
# LinkedIn/public employment history records month granularity. The model
# stores a DateField, so July 2026 is normalized internally to 2026-07-01;
# public UI renders it as "Jul 2026", not as a claimed exact joining day.
CANONICAL_TRICORE_START_DATE = date(2026, 7, 1)


def _technology(name: str) -> Technology:
    obj, _ = Technology.objects.get_or_create(name=name, defaults={"slug": slugify(name)})
    return obj


def _parse_iso_date(raw: str | None, label: str) -> date | None:
    if not raw:
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError as exc:
        raise CommandError(f"{label} must use YYYY-MM-DD format.") from exc


def _published_resume_looks_stale(version: ResumeVersion) -> bool:
    """
    Detect only known public inconsistencies from the pre-sync profile.

    Published resume snapshots are intentionally immutable. We never rewrite
    one in place; if an old published default still contains a known stale
    identity marker, we archive it so /resume safely falls back to current
    published portfolio records until a fresh governed resume is approved.
    """
    payload = {
        "target_role": version.target_role,
        "custom_summary": version.custom_summary,
        "source_facts": version.source_facts,
        "resume_content": version.resume_content,
    }
    blob = json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str).lower()
    if "shahriyarkhan786" in blob or "shahriyar-khan-developer" in blob:
        return True
    if "junior full stack developer" in blob:
        return True
    if "ha technologies" in blob and "present" in blob:
        return True
    return False


@transaction.atomic
def sync_canonical_profile(*, tricore_start_date: date | None = None) -> dict[str, int]:
    now = timezone.now()
    counts = {
        "projects": 0,
        "services": 0,
        "skills": 0,
        "experiences": 0,
        "seo": 0,
    }

    # ------------------------------------------------------------------
    # Canonical public identity and contact
    # ------------------------------------------------------------------
    site = SiteSetting.get_solo()
    site.site_name = "Shahriyar Khan"
    site.owner_name = "Shahriyar Khan"
    site.public_email = CANONICAL_EMAIL
    site.public_phone = ""
    site.public_location = "Pakistan"
    site.notification_email = CANONICAL_EMAIL
    site.hero_title = "Shahriyar Khan"
    site.hero_subtitle = (
        "Software Engineer specializing in Python/Django backend engineering "
        "and backend-heavy full-stack product development."
    )
    site.default_seo_title = "Shahriyar Khan | Software Engineer & Django Backend"
    site.default_seo_description = (
        "Software Engineer specializing in Python/Django backend engineering, "
        "REST APIs, PostgreSQL, and backend-heavy full-stack products with React/Next.js."
    )
    site.default_keywords = (
        "Shahriyar Khan, Software Engineer, Backend Engineer, Python Developer, "
        "Django Developer, Django REST Framework, REST APIs, PostgreSQL, Full-Stack Engineer"
    )
    site.footer_text = "Python/Django backend engineering with full-product delivery."
    site.social_links = {
        "linkedin": CANONICAL_LINKEDIN,
        "github": CANONICAL_GITHUB,
    }
    site.maintenance_mode = False
    site.save()

    # ------------------------------------------------------------------
    # SEO aliases + page metadata
    # ------------------------------------------------------------------
    aliases = [
        "Shahriyar Khan",
        "Software Engineer",
        "Backend Engineer",
        "Python Developer",
        "Django Developer",
        "Django REST Framework",
        "REST API Developer",
        "Full-Stack Engineer",
    ]
    for keyword in aliases:
        SEOAliasKeyword.objects.update_or_create(keyword=keyword, defaults={"is_active": True})
    SEOAliasKeyword.objects.filter(keyword__iexact="Junior Full Stack Developer").update(is_active=False)

    base = getattr(settings, "PUBLIC_SITE_URL", "https://shahriyarkhan.com").rstrip("/")
    page_seo = {
        "home": {
            "title_tag": "Shahriyar Khan | Software Engineer & Django Backend",
            "meta_description": (
                "Software Engineer specializing in Python/Django backend engineering, REST APIs, "
                "PostgreSQL, and backend-heavy full-stack products with React/Next.js."
            ),
            "keywords": (
                "Shahriyar Khan, Software Engineer, Backend Engineer, Python Developer, Django Developer, "
                "Django REST Framework, REST APIs, PostgreSQL"
            ),
            "og_title": "Shahriyar Khan — Software Engineer",
            "og_description": (
                "Python/Django backend engineering, REST APIs, PostgreSQL, and full-stack product delivery."
            ),
            "canonical_url": f"{base}/",
            "image_alt_text": "Professional portrait of Shahriyar Khan, Software Engineer",
        },
        "about": {
            "title_tag": "About Shahriyar Khan | Python/Django Backend Engineer",
            "meta_description": (
                "Software Engineer focused on Python/Django backend systems, API architecture, authentication, "
                "PostgreSQL, testing, and React/Next.js product delivery."
            ),
            "keywords": (
                "Shahriyar Khan about, Python Django backend engineer, backend developer Pakistan, "
                "full-stack software engineer"
            ),
            "og_title": "About Shahriyar Khan",
            "og_description": "Backend-focused software engineering with full-product delivery context.",
            "canonical_url": f"{base}/about",
        },
        "skills": {
            "title_tag": "Skills | Shahriyar Khan — Python & Backend Engineering",
            "meta_description": (
                "Evidence-backed skills across Python, Django/DRF, FastAPI, PostgreSQL, Redis/Celery, "
                "React/Next.js, testing, CI/CD, Docker, and API engineering."
            ),
            "keywords": (
                "Python, Django, Django REST Framework, FastAPI, PostgreSQL, Redis, Celery, React, "
                "Next.js, Docker, CI/CD"
            ),
            "og_title": "Software Engineering Skills — Shahriyar Khan",
            "og_description": "Backend-first engineering skills connected to real project evidence.",
            "canonical_url": f"{base}/skills",
        },
        "work": {
            "title_tag": "Projects | Shahriyar Khan — Software Engineering Portfolio",
            "meta_description": (
                "Case studies across Django/DRF, FastAPI, PostgreSQL, Redis/Celery, React/Next.js, "
                "testing, CI/CD, operational workflows, and practical AI integrations."
            ),
            "keywords": (
                "Django projects, backend engineering portfolio, REST API projects, Python software engineer, "
                "full-stack case studies"
            ),
            "og_title": "Engineering Work — Shahriyar Khan",
            "og_description": "Evidence-backed backend and full-stack software engineering case studies.",
            "canonical_url": f"{base}/work",
        },
        "experience": {
            "title_tag": "Experience | Shahriyar Khan — Software Engineer",
            "meta_description": (
                "Professional experience in backend and full-stack engineering across Python/Django APIs, "
                "authenticated products, client systems, and team delivery."
            ),
            "keywords": (
                "Shahriyar Khan experience, Software Engineer, Python Django developer experience, "
                "backend engineer Pakistan"
            ),
            "og_title": "Experience — Shahriyar Khan",
            "og_description": "Structured professional experience backed by the portfolio's canonical records.",
            "canonical_url": f"{base}/experience",
        },
        "resume": {
            "title_tag": "Resume | Shahriyar Khan — Software Engineer",
            "meta_description": (
                "Software Engineer resume covering Python/Django backend engineering, REST APIs, PostgreSQL, "
                "React/Next.js, testing, CI/CD, and verified project experience."
            ),
            "keywords": (
                "Shahriyar Khan resume, software engineer CV, Python developer resume, "
                "Django developer resume, backend engineer resume"
            ),
            "og_title": "Resume — Shahriyar Khan",
            "og_description": "Software Engineer resume focused on Python/Django backend and full-stack delivery.",
            "canonical_url": f"{base}/resume",
        },
        "services": {
            "title_tag": "Services | Python/Django & Full-Stack Development",
            "meta_description": (
                "Backend-heavy web applications, REST APIs, SaaS/EdTech platforms, and custom business systems "
                "using Python/Django, PostgreSQL, and React/Next.js."
            ),
            "keywords": (
                "custom software development, Django development, REST API development, SaaS development, "
                "web application development"
            ),
            "og_title": "Software Development Services — Shahriyar Khan",
            "og_description": "Backend-heavy web, SaaS, application, database, and cloud product development.",
            "canonical_url": f"{base}/services",
        },
        "contact": {
            "title_tag": "Contact Shahriyar Khan | Software Engineer",
            "meta_description": (
                "Open to international remote software engineering roles, Pakistan-based opportunities, "
                "contract engineering, and selected software product collaborations."
            ),
            "keywords": (
                "contact Shahriyar Khan, remote software engineer, Django developer Pakistan, backend engineer contract"
            ),
            "og_title": "Contact Shahriyar Khan",
            "og_description": "Software engineering roles, contract work, and selected product collaborations.",
            "canonical_url": f"{base}/contact",
        },
    }

    # Legacy deployments used "projects"; keep it synchronized without
    # making it the frontend's primary key.
    page_seo["projects"] = {
        **page_seo["work"],
        "canonical_url": f"{base}/work",
    }

    for page_key, defaults in page_seo.items():
        PageSEO.objects.update_or_create(page_key=page_key, defaults=defaults)
        counts["seo"] += 1

    # ------------------------------------------------------------------
    # Canonical project manifest
    # ------------------------------------------------------------------
    projects = [
        {
            "slug": "nurses-beyond-borders-nclex-learning-exam-preparation-platform",
            "title": "Nurses Beyond Borders — NCLEX Learning & Exam Preparation Platform",
            "description": (
                "Private NCLEX learning and assessment platform covering question-bank/NGN workflows, timed attempts, "
                "learning progress, analytics, subscriptions and entitlements, study planning, administration, testing, "
                "and deployment preparation."
            ),
            "technologies": [
                "Python", "Django", "Django REST Framework", "Next.js", "React.js", "TypeScript",
                "PostgreSQL", "Redis", "Celery", "JWT", "Docker"
            ],
            "live_url": "https://nbb-lms.vercel.app/",
            "github_url": (
                "https://github.com/Shahriyar-Kh/Shahriyar-Kh/blob/main/case-studies/nbb-lms.md"
            ),
            "featured": True,
            "display_order": 1,
        },
        {
            "slug": "yango-wing-fleet-digital-registration-fleet-management-platform",
            "title": "Yango Wing Fleet — Driver Registration & Fleet Operations Platform",
            "description": (
                "Full-stack driver onboarding and fleet operations platform with public registration and inquiry workflows, "
                "staff-protected APIs, admin operations, analytics, filtering/search, status management, offers/trip bonuses, "
                "email workflows, and CSV exports."
            ),
            "technologies": [
                "Python", "Django", "Django REST Framework", "React.js", "TypeScript",
                "PostgreSQL", "JWT", "REST APIs", "Vite"
            ],
            "live_url": "https://yango-wing-fleet.vercel.app/",
            "github_url": "https://github.com/Shahriyar-Kh/yango-wing-fleet",
            "featured": True,
            "display_order": 2,
        },
        {
            "slug": "noteassist-ai-productivity-platform",
            "title": "NoteAssist AI — AI-Assisted Learning & Productivity Platform",
            "description": (
                "Learning and productivity platform for structured notes, AI-assisted generation and summarization, saved "
                "outputs, Google OAuth/Drive integration, plans/quotas, exports, dashboards, administration, and background processing."
            ),
            "technologies": [
                "Python", "Django", "Django REST Framework", "React.js", "PostgreSQL",
                "Redis", "Celery", "JWT", "Groq API", "Google OAuth"
            ],
            "live_url": "https://noteassistai.vercel.app/",
            "github_url": "https://github.com/Shahriyar-Kh/noteassist_ai",
            "featured": True,
            "display_order": 3,
        },
        {
            "slug": "shahriyar-khan-full-stack-portfolio-ai-assistant-platform",
            "title": "Shahriyar Khan — Full-Stack Portfolio & AI Assistant Platform",
            "description": (
                "Full-stack professional portfolio platform with dynamic content, complete administration, project/service "
                "management, SEO/JSON-LD, a grounded AI assistant, structured client project discovery, CV management, "
                "and controlled PDF/DOCX exports."
            ),
            "technologies": [
                "Python", "Django", "Django REST Framework", "Next.js", "React.js", "TypeScript",
                "PostgreSQL", "Tailwind CSS", "Cloudflare Workers", "Railway", "AI Integration"
            ],
            "live_url": "https://shahriyarkhan.com/",
            "github_url": "https://github.com/Shahriyar-Kh/shahriyarkhan-portfolio-v1",
            "featured": True,
            "display_order": 5,
        },
        {
            "slug": "feelwise-emotion-detection-system",
            "title": "FeelWise — Multi-Service AI Emotion Analysis Platform",
            "description": (
                "Multi-service application with separate text, facial-expression, speech, and journal analysis services "
                "coordinated through a Node.js/Express API gateway, plus authentication, assessments, progress, and reporting."
            ),
            "technologies": [
                "Python", "FastAPI", "Node.js", "Express.js", "MongoDB", "PyTorch",
                "DeepFace", "Wav2Vec2", "OpenCV", "JWT"
            ],
            "live_url": "https://feelwise-emotion-detection.feelwise.workers.dev/",
            "github_url": "https://github.com/Shahriyar-Kh/feelwise-emotion-detection",
            "featured": True,
            "display_order": 4,
        },
        {
            "slug": "sk-learntrack-ai-learning-platform",
            "title": "SK LearnTrack — Full-Stack Learning & Course Management Platform",
            "description": (
                "Learning and course-management platform with Course → Chapter → Topic structure, admin course authoring, "
                "enrollment/progress, quizzes, notes, bookmarks, roadmaps, analytics, and Groq-powered AI-assisted learning."
            ),
            "technologies": [
                "Python", "Django", "Django REST Framework", "React.js", "PostgreSQL",
                "JWT", "Groq API", "Redux Toolkit", "Tailwind CSS", "Pytest"
            ],
            "live_url": "https://sk-learntrack.vercel.app/",
            "github_url": "https://github.com/Shahriyar-Kh/SK_LearnTrack",
            "featured": True,
            "display_order": 6,
        },
        {
            "slug": "techbuilt-open-school-multilingual-education-platform-operational-lms",
            "title": "TechBuilt Open School — Multilingual Education Platform & Operational LMS",
            "description": (
                "Next-generation multilingual education platform and operational-LMS foundation in Phase 1 active development, "
                "with API-first modular-monolith architecture, checked OpenAPI contracts, multilingual/RTL foundations, "
                "identity/authorization direction, structured logging, testing, CI, and security automation."
            ),
            "technologies": [
                "Python", "Django", "Django REST Framework", "Next.js", "React.js", "TypeScript",
                "PostgreSQL", "Redis", "Celery", "OpenAPI", "Docker", "GitHub Actions"
            ],
            "live_url": "",
            "github_url": "https://github.com/Shahriyar-Kh/TechBuilt_OS",
            "featured": False,
            "display_order": 7,
        },
        {
            "slug": "techbuilt-open-school-lms-final-year-project",
            "title": "TechBuilt Open School — Learning Management System | Final Year Project",
            "description": (
                "First-generation LMS built as a Final Year Project, with modular domains for accounts, courses, lessons, "
                "quizzes, assignments, enrollments, payments, analytics, certificates, and notifications."
            ),
            "technologies": [
                "Python", "Django", "Django REST Framework", "Next.js", "React.js",
                "PostgreSQL", "Redis", "Celery", "JWT", "OpenAPI"
            ],
            "live_url": "",
            "github_url": "https://github.com/Shahriyar-Kh/TBOS",
            "featured": False,
            "display_order": 8,
        },
    ]

    project_objects: list[Project] = []
    for item in projects:
        project, _ = Project.objects.update_or_create(
            slug=item["slug"],
            defaults={
                "title": item["title"],
                "description": item["description"],
                "live_url": item["live_url"],
                "github_url": item["github_url"],
                "status": Project.Status.PUBLISHED,
                "published_at": now,
                "display_order": item["display_order"],
                "featured": item["featured"],
                "seo_title": f'{item["title"]} — Shahriyar Khan',
                "seo_description": item["description"],
                "seo_keywords": ", ".join(item["technologies"]),
                "og_title": item["title"],
                "og_description": item["description"],
                "alt_text": f'Project preview for {item["title"]}',
                "image_alt_text": f'Project preview for {item["title"]}',
                "ai_summary": item["description"],
            },
        )
        project.technologies.set([_technology(name) for name in item["technologies"]])
        project_objects.append(project)
        counts["projects"] += 1

    # Historical real project remains available but should not outrank current work.
    Project.objects.filter(slug="advanced-restaurant-management-system").update(
        featured=False,
        display_order=90,
        github_url="https://github.com/Shahriyar-Kh/restaurent_managment_system",
    )

    # Hide known obsolete/ambiguous duplicate rows rather than deleting history.
    Project.objects.filter(
        slug__in=[
            "techbuilt-open-school-lms",
            "insightboard-crm-sales-intelligence-dashboard",
        ]
    ).update(status=Project.Status.DRAFT, featured=False)

    # ------------------------------------------------------------------
    # Canonical service catalog
    # ------------------------------------------------------------------
    services = [
        (
            "Custom Software Development",
            "Custom software built around real business workflows, roles, integrations, and operational needs.",
            [
                "Requirements and workflow analysis",
                "Backend/API architecture",
                "Authentication and permissions",
                "Frontend integration",
                "Testing and deployment preparation",
            ],
        ),
        (
            "Web Development",
            "Modern public and authenticated web products connected to maintainable backend services and structured content.",
            [
                "Responsive web interfaces",
                "Backend/API integration",
                "Authentication where required",
                "SEO-aware implementation",
                "Deployment support",
            ],
        ),
        (
            "Application Development",
            "Full application delivery across backend rules, data models, user workflows, dashboards, and administration.",
            [
                "Application architecture",
                "REST APIs",
                "Database-backed workflows",
                "Role-aware interfaces",
                "Operational administration",
            ],
        ),
        (
            "SaaS Development",
            "Authenticated multi-user products with dashboards, roles, quotas or entitlements, integrations, and maintainable product workflows.",
            [
                "User and role architecture",
                "Dashboard workflows",
                "Quotas or entitlements",
                "Third-party integrations",
                "Testing and release preparation",
            ],
        ),
        (
            "Database Development",
            "Relational schema and data-model work designed around real business rules, reporting, filtering, and future change.",
            [
                "Schema and relationship design",
                "PostgreSQL data modeling",
                "Migrations",
                "Filtering and reporting queries",
                "Data-backed exports and operations",
            ],
        ),
        (
            "Cloud Application Development",
            "Application delivery prepared for repeatable cloud deployment with environment-aware configuration and operational boundaries.",
            [
                "Deployment configuration",
                "Database/cache/worker integration",
                "Health and readiness checks",
                "CI/CD workflows",
                "Release and handover documentation",
            ],
        ),
    ]

    canonical_service_slugs: list[str] = []
    for order, (title, description, deliverables) in enumerate(services, start=1):
        service_slug = slugify(title)
        canonical_service_slugs.append(service_slug)
        Service.objects.update_or_create(
            slug=service_slug,
            defaults={
                "title": title,
                "description": description,
                "deliverables": deliverables,
                "status": Service.Status.PUBLISHED,
                "published_at": now,
                "display_order": order,
                "featured": order <= 4,
                "seo_title": f"{title} — Shahriyar Khan",
                "seo_description": description,
                "seo_keywords": f"{title}, Python Django, software engineering",
                "og_title": title,
                "og_description": description,
                "image_alt_text": f"Software development service: {title}",
            },
        )
        counts["services"] += 1

    Service.objects.exclude(slug__in=canonical_service_slugs).update(
        status=Service.Status.DRAFT,
        featured=False,
    )

    # ------------------------------------------------------------------
    # Skills: evidence-first, no "Expert" level
    # ------------------------------------------------------------------
    skill_map: dict[str, list[tuple[str, int]]] = {
        "backend": [
            ("Python", 3),
            ("Django", 3),
            ("Django REST Framework (DRF)", 3),
            ("Back-End Web Development", 3),
            ("REST APIs", 3),
            ("API Development", 3),
            ("FastAPI", 3),
            ("Authentication (JWT)", 3),
            ("Role-Based Access Control (RBAC)", 3),
            ("OpenAPI Specification (OAS)", 2),
        ],
        "frontend": [
            ("Full-Stack Development", 3),
            ("React.js", 3),
            ("Next.js", 2),
            ("TypeScript", 2),
            ("JavaScript", 3),
            ("HTML5", 3),
            ("CSS3", 3),
            ("Tailwind CSS", 2),
            ("Bootstrap (Framework)", 2),
        ],
        "database": [
            ("PostgreSQL", 3),
            ("Database Design", 3),
            ("Redis", 2),
            ("MongoDB", 2),
            ("SQL", 3),
            ("MySQL", 2),
        ],
        "engineering": [
            ("Software Engineering Practices", 3),
            ("Software Architecture", 2),
            ("Software Testing", 3),
            ("Continuous Integration and Continuous Delivery (CI/CD)", 2),
            ("Pytest", 3),
            ("Object-Oriented Programming (OOP)", 3),
            ("Software Development Life Cycle (SDLC)", 3),
            ("Debugging", 3),
            ("Problem Solving", 3),
        ],
        "tools": [
            ("Git", 3),
            ("GitHub", 3),
            ("Postman", 3),
            ("Docker", 2),
            ("API Integration", 3),
            ("Artificial Intelligence (AI)", 2),
            ("AI Integration", 2),
            ("Groq API", 2),
            ("OpenAI API", 2),
            ("Node.js", 2),
        ],
        "deployment": [
            ("Vercel", 3),
            ("Render", 3),
            ("Cloudflare Workers", 2),
            ("Railway", 2),
        ],
    }

    category_names = {
        "backend": "Backend",
        "frontend": "Frontend",
        "database": "Database",
        "engineering": "Engineering",
        "tools": "Tools",
        "deployment": "Deployment",
    }

    desired_skill_ids: list[int] = []
    for category_order, (category_slug, items) in enumerate(skill_map.items(), start=1):
        category, _ = SkillCategory.objects.update_or_create(
            slug=category_slug,
            defaults={"name": category_names[category_slug], "display_order": category_order},
        )
        for display_order, (name, level) in enumerate(items, start=1):
            skill, _ = Skill.objects.update_or_create(
                name=name,
                category=category,
                defaults={
                    "level": level,
                    "display_order": display_order,
                    "published": True,
                    "description": f"{name} demonstrated across verified portfolio work or professional experience.",
                },
            )
            desired_skill_ids.append(skill.pk)
            counts["skills"] += 1

    Skill.objects.exclude(pk__in=desired_skill_ids).update(published=False)

    # ------------------------------------------------------------------
    # Experience: close HA; preserve/create TriCore only with a verified date.
    # ------------------------------------------------------------------
    ha, _ = Experience.objects.update_or_create(
        company_name="HA Technologies (Pvt) Ltd",
        role_title="Software Developer",
        defaults={
            "start_date": date(2025, 7, 1),
            "end_date": date(2026, 4, 30),
            "current_role": False,
            "location": "Islamabad",
            "description": (
                "Worked across frontend and backend development using Python and React, "
                "contributing to software delivery, problem solving, and team workflows."
            ),
            "achievements": [
                "Contributed to backend and frontend development using Python and React",
                "Worked through technical problems and changing implementation requirements",
                "Collaborated with the development team and incorporated feedback into delivery",
            ],
            "status": PublishableModel.Status.PUBLISHED,
            "display_order": 2,
            "seo_title": "Software Developer at HA Technologies (Pvt) Ltd",
            "seo_description": "Software Developer experience across Python, React, backend/frontend development, and team delivery.",
            "seo_keywords": "Python, React.js, Software Development, Backend Development, Frontend Development",
        },
    )
    ha.technologies.set([
        _technology("Python"),
        _technology("React.js"),
        _technology("Software Development"),
    ])
    counts["experiences"] += 1

    codealpha, _ = Experience.objects.update_or_create(
        company_name="CodeAlpha",
        role_title="Python Developer Intern",
        defaults={
            "start_date": date(2025, 2, 1),
            "end_date": date(2025, 5, 31),
            "current_role": False,
            "location": "Remote",
            "description": "Built Python desktop applications and API-integrated workflows using PyQt5 and Tkinter.",
            "achievements": [
                "Developed Python desktop applications with PyQt5 and Tkinter",
                "Implemented event-driven workflows and third-party API integrations",
            ],
            "status": PublishableModel.Status.PUBLISHED,
            "display_order": 3,
            "seo_title": "Python Developer Intern at CodeAlpha",
            "seo_description": "Python internship focused on desktop application development and API-integrated workflows.",
            "seo_keywords": "Python, PyQt5, Tkinter, API Integration",
        },
    )
    codealpha.technologies.set([
        _technology("Python"),
        _technology("PyQt5"),
        _technology("API Integration"),
    ])
    counts["experiences"] += 1

    incubation, _ = Experience.objects.update_or_create(
        company_name="Abasyn University Incubation Center",
        role_title="Web Developer Intern (Team Lead)",
        defaults={
            "start_date": date(2024, 9, 1),
            "end_date": date(2025, 2, 28),
            "current_role": False,
            "location": "Peshawar",
            "description": "Built full-stack application functionality while leading development tasks within a small team.",
            "achievements": [
                "Built application functionality with Django and REST APIs",
                "Led development tasks and coordinated implementation work",
            ],
            "status": PublishableModel.Status.PUBLISHED,
            "display_order": 4,
            "seo_title": "Web Developer Intern (Team Lead) at Abasyn University Incubation Center",
            "seo_description": "Internship and team-lead experience across Django, REST APIs, and project delivery.",
            "seo_keywords": "Django, REST APIs, Team Leadership, Web Development",
        },
    )
    incubation.technologies.set([
        _technology("Django"),
        _technology("REST APIs"),
        _technology("Team Leadership"),
    ])
    counts["experiences"] += 1

    tricore = (
        Experience.objects.filter(company_name="TriCore Digital Tech")
        .order_by("-start_date")
        .first()
    )
    effective_tricore_start_date = tricore_start_date or CANONICAL_TRICORE_START_DATE

    if tricore is None:
        tricore = Experience(company_name="TriCore Digital Tech")

    tricore.role_title = "Software Engineer (Contract)"
    tricore.start_date = effective_tricore_start_date
    tricore.end_date = None
    tricore.current_role = True
    tricore.location = "Remote"
    tricore.description = (
        "Contract-based software engineering focused on backend-heavy and full-stack product delivery "
        "with Python/Django, APIs, PostgreSQL, and modern frontend integration."
    )
    tricore.achievements = [
        "Develop Python/Django backend services, REST APIs, authenticated workflows, and product features",
        "Work across data models, validation, authentication, permissions, testing, and deployment preparation",
        "Engineer the private Nurses Beyond Borders NCLEX/LMS platform through requirements, implementation, and hardening",
    ]
    tricore.status = PublishableModel.Status.PUBLISHED
    tricore.display_order = 1
    tricore.seo_title = "Software Engineer (Contract) at TriCore Digital Tech"
    tricore.seo_description = (
        "Contract software engineering focused on Python/Django backend and full-stack product delivery."
    )
    tricore.seo_keywords = (
        "Software Engineer, Python, Django, Django REST Framework, PostgreSQL, REST APIs, Next.js"
    )
    tricore.save()
    tricore.technologies.set([
        _technology("Python"),
        _technology("Django"),
        _technology("Django REST Framework"),
        _technology("PostgreSQL"),
        _technology("REST APIs"),
        _technology("Next.js"),
    ])
    counts["experiences"] += 1

    # No role outside the canonical current TriCore engagement may remain
    # incorrectly marked current.
    Experience.objects.exclude(pk=tricore.pk).update(current_role=False)

    # ------------------------------------------------------------------
    # Published resume snapshots are governed/immutable.
    # ------------------------------------------------------------------
    published_default = ResumeVersion.objects.filter(
        is_default=True,
        status=ResumeVersion.Status.PUBLISHED,
    ).first()
    if published_default is not None and _published_resume_looks_stale(published_default):
        published_default.is_default = False
        published_default.status = ResumeVersion.Status.ARCHIVED
        published_default.archived_at = now
        published_default.save(update_fields=["is_default", "status", "archived_at", "updated_at"])

    return counts


class Command(BaseCommand):
    help = "Synchronize the canonical 2026 public portfolio profile and evidence-backed content."

    def add_arguments(self, parser):
        parser.add_argument(
            "--tricore-start-date",
            dest="tricore_start_date",
            default=None,
            help="Optional TriCore start-date override in YYYY-MM-DD format. Default canonical month is July 2026.",
        )

    def handle(self, *args, **options):
        start_raw = options.get("tricore_start_date") or os.getenv("TRICORE_START_DATE")
        start_date = _parse_iso_date(start_raw, "TriCore start date")
        counts = sync_canonical_profile(tricore_start_date=start_date)

        self.stdout.write(
            self.style.SUCCESS(
                "Canonical profile sync complete: "
                f'{counts["projects"]} projects, {counts["services"]} services, '
                f'{counts["skills"]} skills, {counts["experiences"]} experience rows, '
                f'{counts["seo"]} SEO records.'
            )
        )
