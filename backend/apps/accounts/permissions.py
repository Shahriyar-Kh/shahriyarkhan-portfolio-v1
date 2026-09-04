from __future__ import annotations

from django.conf import settings
from rest_framework.permissions import BasePermission


def _has_owner_or_admin_role(user) -> bool:
    if getattr(user, "is_superuser", False):
        return True

    profile = getattr(user, "profile", None)
    if profile is None:
        return False

    role = (getattr(profile, "role", "") or "").strip().lower()
    allowed_roles = {role_name.strip().lower() for role_name in settings.ADMIN_ALLOWED_ROLES if role_name.strip()}
    return bool(getattr(profile, "is_owner", False) or role in allowed_roles)


def _passes_allowlist(user) -> bool:
    allowed_usernames = settings.ADMIN_ALLOWED_USERNAMES
    allowed_emails = {email.lower() for email in settings.ADMIN_ALLOWED_EMAILS}

    # If no allowlist is configured, allow active staff users through this gate.
    if not allowed_usernames and not allowed_emails:
        return True

    username_match = bool(user.username in allowed_usernames) if allowed_usernames else False
    email_match = bool((user.email or "").lower() in allowed_emails) if allowed_emails else False
    return username_match or email_match


def is_portfolio_admin_user(user, require_owner_role: bool = False) -> bool:
    if not getattr(user, "is_authenticated", False):
        return False

    if not (user.is_active and user.is_staff):
        return False

    if not _passes_allowlist(user):
        return False

    if require_owner_role:
        return _has_owner_or_admin_role(user)

    return True


class IsPortfolioAdmin(BasePermission):
    message = "You do not have permission to access this admin resource."

    def has_permission(self, request, view) -> bool:
        return is_portfolio_admin_user(
            request.user,
            require_owner_role=settings.ADMIN_REQUIRE_OWNER_FOR_ADMIN_API,
        )
