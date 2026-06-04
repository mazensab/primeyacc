# ============================================================
# 📂 api/auth/whoami.py
# 🧠 PrimeyAcc | Auth Whoami API V1
# ------------------------------------------------------------
# ✅ Current User Session Snapshot
# ✅ System Access Detection
# ✅ Company Access Detection
# ✅ Default Company Snapshot
# ✅ Company Memberships Snapshot
# ✅ Anonymous-safe Response
# ✅ Session Auth Compatible
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - User = حساب دخول فقط
# - UserProfile = ملف المستخدم العام داخل PrimeyAcc
# - CompanyMembership = علاقة المستخدم بالشركة ودوره داخلها
# - /system لا يفتح إلا لمستخدم نظام مصرح
# - /company لا يفتح إلا بعضوية شركة فعالة
# - الباكند هو مصدر الحقيقة للصلاحيات وعزل الشركات
# ============================================================

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.models import CompanyMembership, UserProfile


def _company_payload(company) -> dict[str, Any] | None:
    if not company:
        return None

    return {
        "id": company.id,
        "name": company.display_name,
        "name_ar": company.name_ar,
        "name_en": company.name_en,
        "company_code": company.company_code,
        "activity_profile": company.activity_profile,
        "status": company.status,
        "is_active": company.is_active,
        "city": company.city,
        "district": company.district,
        "postal_code": company.postal_code,
        "short_address": company.short_address,
        "currency_code": company.currency_code,
        "vat_percentage": str(company.vat_percentage),
    }


def _membership_payload(membership: CompanyMembership) -> dict[str, Any]:
    return {
        "id": membership.id,
        "company": _company_payload(membership.company),
        "role": membership.role,
        "status": membership.status,
        "is_primary": membership.is_primary,
        "job_title": membership.job_title,
        "department": membership.department,
        "is_active_membership": membership.is_active_membership,
    }


def _profile_payload(profile: UserProfile) -> dict[str, Any]:
    memberships = (
        CompanyMembership.objects.select_related("company")
        .filter(user=profile.user)
        .order_by("-is_primary", "-created_at")
    )

    return {
        "id": profile.id,
        "display_name": profile.display_name,
        "status": profile.status,
        "default_workspace": profile.default_workspace,
        "is_system_user": profile.is_system_user,
        "system_role": profile.system_role,
        "can_access_system": profile.can_access_system,
        "can_access_company": profile.can_access_company,
        "default_company": _company_payload(profile.default_company),
        "memberships": [_membership_payload(membership) for membership in memberships],
        "language": profile.language,
        "timezone": profile.timezone,
    }


@api_view(["GET"])
@permission_classes([AllowAny])
def whoami(request: Request) -> Response:
    user = request.user

    if not user or not user.is_authenticated:
        return Response(
            {
                "authenticated": False,
                "user": None,
                "profile": None,
                "can_access_system": False,
                "can_access_company": False,
            }
        )

    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            "display_name": user.get_full_name() or user.get_username(),
        },
    )

    profile_data = _profile_payload(profile)

    return Response(
        {
            "authenticated": True,
            "user": {
                "id": user.id,
                "username": user.get_username(),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "is_active": user.is_active,
            },
            "profile": profile_data,
            "can_access_system": profile_data["can_access_system"],
            "can_access_company": profile_data["can_access_company"],
            "default_company": profile_data["default_company"],
            "memberships": profile_data["memberships"],
        }
    )