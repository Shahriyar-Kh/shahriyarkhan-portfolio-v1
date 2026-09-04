from __future__ import annotations

from django.conf import settings
from django.http import HttpResponseForbidden

from apps.accounts.permissions import is_portfolio_admin_user


class AdminAccessControlMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        admin_path_prefix = f"/{settings.ADMIN_URL_PATH.strip('/')}/"
        if request.path.startswith(admin_path_prefix):
            # Allow unauthenticated users to see admin login form.
            if request.user.is_authenticated:
                if not is_portfolio_admin_user(
                    request.user,
                    require_owner_role=settings.ADMIN_REQUIRE_OWNER_FOR_ADMIN_SITE,
                ):
                    return HttpResponseForbidden("Admin access denied.")

        return self.get_response(request)
