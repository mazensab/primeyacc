# ============================================================
# 📂 api/company/activity_profiles/list.py
# 🧠 Mhamcloud | Activity Profiles List API
# ------------------------------------------------------------
# ✅ List system activity profiles
# ✅ List current-company custom activity profiles
# ✅ Tenant isolation
# ✅ Permission protected
# ============================================================

from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from companies.models import ActivityProfile

from .serializers import serialize_activity_profile


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def activity_profiles_list(request):
    """
    Return activity profiles available to the current company.

    Available profiles:
    - active system profiles
    - active custom profiles belonging to current company only
    """

    activity_profiles_list.required_company_permissions = [
        "company.activity_profiles.view",
        "company.settings.view",
    ]

    company = request.company

    profiles = (
        ActivityProfile.objects.filter(
            Q(company__isnull=True, is_system=True) | Q(company=company),
            is_active=True,
        )
        .select_related("company")
        .order_by("-is_system", "name")
    )

    return Response(
        {
            "ok": True,
            "data": {
                "company_id": company.id,
                "results": [
                    serialize_activity_profile(profile)
                    for profile in profiles
                ],
            },
        }
    )
