# ============================================================
# 📂 api/system/release_readiness/views.py
# 🧠 PrimeyAcc | System Release Readiness API Views v1
# ============================================================
# ✅ Read-only backend release readiness endpoint
# ✅ Staff/superuser protected
# ✅ Stable API response contract
# ============================================================

from __future__ import annotations

from django.http import JsonResponse
from django.views.decorators.http import require_GET

from release_readiness.services import (
    build_api_error_response,
    build_release_readiness_payload,
)


def _can_access_release_readiness(user) -> bool:
    return bool(
        user
        and getattr(user, "is_authenticated", False)
        and (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False))
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
