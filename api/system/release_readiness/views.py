# ============================================================
# File: api/system/release_readiness/views.py
# Module: PrimeyAcc System Release Readiness API Views v1
# ============================================================
# Read-only backend release readiness endpoint.
# Protected by PrimeyAcc system permissions, not Django staff flags.
# ============================================================
from __future__ import annotations
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from api.permissions import user_has_system_permission
from release_readiness.services import (
    build_api_error_response,
    build_release_readiness_payload,
)
RELEASE_READINESS_PERMISSION = "system.release_readiness.view"
def _can_access_release_readiness(user) -> bool:
    return bool(
        user
        and getattr(user, "is_authenticated", False)
        and user_has_system_permission(user, RELEASE_READINESS_PERMISSION)
    )
@require_GET
def release_readiness_overview(request):
    user = getattr(request, "user", None)
    if not user or not getattr(user, "is_authenticated", False):
        return JsonResponse(
            build_api_error_response(
                "Authentication is required to access release readiness.",
                status_code=401,
            ),
            status=401,
        )
    if not _can_access_release_readiness(user):
        return JsonResponse(
            build_api_error_response(
                "You do not have permission to access release readiness.",
                status_code=403,
            ),
            status=403,
        )
    return JsonResponse(build_release_readiness_payload(), status=200)
