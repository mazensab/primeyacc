# ============================================================
# 📂 api/company/activity_profiles/update.py
# 🧠 Mhamcloud | Update Company Activity Profile API
# ------------------------------------------------------------
# ✅ Update current company's activity_profile_ref
# ✅ Allows only system active profiles or own custom profiles
# ✅ Blocks cross-company profile assignment
# ✅ No frontend company_id trust
# ============================================================

from __future__ import annotations

from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from companies.models import ActivityProfile

from .serializers import serialize_company_activity


@api_view(["PATCH", "POST"])
@permission_classes([HasAnyCompanyPermission])
def update_current_activity_profile(request):
    """
    Update current company's expandable activity profile reference.

    Accepted payload:
    {
        "activity_profile_id": 1
    }

    To clear:
    {
        "activity_profile_id": null
    }
    """

    update_current_activity_profile.required_company_permissions = [
        "company.activity_profiles.update",
        "company.settings.update",
    ]

    company = request.company
    activity_profile_id = request.data.get("activity_profile_id")

    if activity_profile_id in ["", None]:
        company.activity_profile_ref = None
        company.updated_by = request.user
        company.save(
            update_fields=[
                "activity_profile_ref",
                "updated_by",
                "updated_at",
            ]
        )

        return Response(
            {
                "ok": True,
                "data": serialize_company_activity(company),
            }
        )

    try:
        activity_profile_id = int(activity_profile_id)
    except (TypeError, ValueError):
        return Response(
            {
                "ok": False,
                "code": "INVALID_ACTIVITY_PROFILE_ID",
                "errors": {
                    "activity_profile_id": "Activity profile id must be a valid integer.",
                },
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    profile = (
        ActivityProfile.objects.filter(
            Q(company__isnull=True, is_system=True) | Q(company=company),
            id=activity_profile_id,
            is_active=True,
        )
        .select_related("company")
        .first()
    )

    if profile is None:
        return Response(
            {
                "ok": False,
                "code": "ACTIVITY_PROFILE_NOT_FOUND",
                "errors": {
                    "activity_profile_id": "Activity profile was not found for the current company.",
                },
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    company.activity_profile_ref = profile
    company.updated_by = request.user
    company.save(
        update_fields=[
            "activity_profile_ref",
            "updated_by",
            "updated_at",
        ]
    )

    return Response(
        {
            "ok": True,
            "data": serialize_company_activity(company),
        }
    )
