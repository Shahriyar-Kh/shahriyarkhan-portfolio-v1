from __future__ import annotations

from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count
from django.shortcuts import render

from apps.analytics_app.models import AnalyticsEvent
from apps.inquiries.models import ContactMessage, ServiceRequest
from apps.portfolio.models import Experience, Project, Service, Skill
from apps.resume_builder.models import ResumeVersion


@staff_member_required
def admin_dashboard_view(request):
    top_projects = (
        AnalyticsEvent.objects.exclude(project__isnull=True)
        .values("project__title")
        .annotate(total=Count("id"))
        .order_by("-total")[:5]
    )
    top_pages = (
        AnalyticsEvent.objects.values("page_path")
        .annotate(total=Count("id"))
        .order_by("-total")[:5]
    )

    context = {
        "title": "Portfolio Admin Dashboard",
        "summary": {
            "projects": Project.objects.count(),
            "skills": Skill.objects.count(),
            "services": Service.objects.count(),
            "experiences": Experience.objects.count(),
            "contact_messages_new": ContactMessage.objects.filter(status=ContactMessage.Status.NEW).count(),
            "service_requests_new": ServiceRequest.objects.filter(status=ServiceRequest.Status.NEW).count(),
            "resume_versions": ResumeVersion.objects.count(),
            "analytics_events": AnalyticsEvent.objects.count(),
        },
        "top_projects": top_projects,
        "top_pages": top_pages,
        "recent_contacts": ContactMessage.objects.order_by("-created_at")[:5],
        "recent_service_requests": ServiceRequest.objects.order_by("-created_at")[:5],
    }
    return render(request, "admin/dashboard_summary.html", context)
