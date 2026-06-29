# ============================================================
# 📂 api/company/activity_profiles/current.py
# 🧠 Mhamcloud | Current Company Activity Profile API
# ------------------------------------------------------------
# ✅ Current company activity profile snapshot
# ✅ Keeps legacy activity_profile visible
# ✅ Permission protected
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission

from .serializers import serialize_company_activity


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def current_activity_profile(request):
    """
    Return current company's activity profile state.
    """

    current_activity_profile.required_company_permissions = [
        "company.activity_profiles.view",
        "company.settings.view",
    ]

    company = request.company

    return Response(
        {
            "ok": True,
            "data": serialize_company_activity(company),
        }
    )
