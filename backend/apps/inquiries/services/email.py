from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


def admin_change_url(obj) -> str:
    app_label = obj._meta.app_label
    model_name = obj._meta.model_name
    admin_path = getattr(settings, "ADMIN_URL_PATH", "admin").strip("/")
    base = getattr(settings, "PUBLIC_BASE_URL", "").rstrip("/")
    return f"{base}/{admin_path}/{app_label}/{model_name}/{obj.pk}/change/"


def send_enquiry_notification(obj, template_base: str, subject_label: str) -> None:
    """Builds and sends the owner notification email for one enquiry.
    Raises on failure - the caller (services/delivery.py) is responsible
    for turning that into a recorded status; this function's contract is
    unchanged so it stays independently testable.

    Reply-To is the visitor's own (already EmailField-validated) address,
    so a reply in the owner's mail client goes straight back to them.
    Header injection (a visitor-supplied subject/name containing a
    newline) is rejected by Django's own forbid_multi_line_headers before
    the message is ever sent - that surfaces here as a normal exception,
    which the caller records as a failed attempt rather than a crash.
    """
    payload = {"obj": obj, "admin_url": admin_change_url(obj)}
    text_body = render_to_string(f"emails/{template_base}.txt", payload)
    html_body = render_to_string(f"emails/{template_base}.html", payload)
    subject = f"[Portfolio {subject_label}] {obj.reference_id} - {obj.subject}"
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[settings.ADMIN_NOTIFICATION_EMAIL],
        reply_to=[obj.email],
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)
