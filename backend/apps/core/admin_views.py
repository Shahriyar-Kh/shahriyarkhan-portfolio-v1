from __future__ import annotations

from django.contrib.admin.views.decorators import staff_member_required
from django.core.exceptions import PermissionDenied
from django.db.models import Count
from django.shortcuts import render

from apps.accounts.permissions import is_portfolio_admin_user
from apps.analytics_app.models import AnalyticsEvent
from apps.inquiries.models import ContactMessage, ServiceRequest
from apps.portfolio.models import Experience, Project, Service, Skill
from apps.resume_builder.models import ResumeExport, ResumeVersion
from apps.resume_builder.services import validate_version_snapshot
from apps.resume_builder.services.exceptions import SnapshotError
from apps.resume_builder.services.exports import resolve_downloadable_export


def _resume_health():
    current = ResumeVersion.objects.filter(
        resume_type=ResumeVersion.ResumeType.MASTER,
        status=ResumeVersion.Status.PUBLISHED,
        is_default=True,
    ).first()
    if current is None:
        return {
            "state": "missing",
            "label": "No published default Master résumé",
            "version": None,
            "pdf": False,
            "docx": False,
        }

    try:
        validate_version_snapshot(current)
        snapshot_ok = True
    except SnapshotError:
        snapshot_ok = False

    pdf_ok = resolve_downloadable_export(current, ResumeExport.Format.PDF) is not None
    docx_ok = resolve_downloadable_export(current, ResumeExport.Format.DOCX) is not None
    healthy = snapshot_ok and pdf_ok and docx_ok
    return {
        "state": "healthy" if healthy else "broken",
        "label": "Healthy — public page + PDF + DOCX" if healthy else "Needs attention",
        "version": current,
        "snapshot": snapshot_ok,
        "pdf": pdf_ok,
        "docx": docx_ok,
    }


@staff_member_required
def admin_dashboard_view(request):
    if not is_portfolio_admin_user(request.user, require_owner_role=True):
        raise PermissionDenied
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
        "resume_health": _resume_health(),
    }
    return render(request, "admin/dashboard_summary.html", context)
