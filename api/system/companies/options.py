# ============================================================
# 📂 api/system/companies/options.py
# 🧠 Mhamcloud | System Company Options API V1.0
# ------------------------------------------------------------
# ✅ Returns company create/update options for system workspace
# ✅ Returns active system ActivityProfile choices
# ✅ Returns Company status choices
# ✅ Returns legacy activity choices for backward compatibility
# ✅ Declares backend-generated company_code behavior
# ✅ Declares billing/legal required fields
# ✅ Protected by system permission: system.companies.view
# ✅ Uses central api/permissions.py guard
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الواجهة لا تكتب company_code
# - النشاط في إنشاء الشركة يكون اختيارا من ActivityProfile
# - بيانات الفوترة والعنوان الوطني مطلوبة لإنشاء شركة قابلة للاشتراك والدفع
# ============================================================

from __future__ import annotations

from typing import Any

from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET

from api.permissions import user_has_system_permission
from companies.models import ActivityProfile, CompanyActivityProfile, CompanyStatus


def _activity_profile_payload(profile: ActivityProfile) -> dict[str, Any]:
    """
    يرجع خيار نشاط قابل للاستخدام في واجهة النظام.
    """

    return {
        "id": profile.id,
        "code": profile.code,
        "name": profile.name,
        "name_ar": profile.name_ar,
        "name_en": profile.name_en,
        "display_name": profile.display_name,
        "description": profile.description,
        "is_system": profile.is_system,
        "is_active": profile.is_active,
    }


def _choice_payload(value: str, label: str) -> dict[str, str]:
    """
    يحول TextChoices إلى JSON بسيط.
    """

    return {
        "value": value,
        "label": str(label),
    }


@login_required
@require_GET
def system_company_options(request: HttpRequest) -> JsonResponse:
    """
    GET /api/system/companies/options/

    يرجع خيارات إنشاء وتعديل الشركات لمساحة النظام.
    """

    if not user_has_system_permission(request.user, "system.companies.view"):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بعرض خيارات الشركات.",
                "code": "SYSTEM_COMPANIES_VIEW_PERMISSION_REQUIRED",
            },
            status=403,
        )

    activity_profiles = (
        ActivityProfile.objects.filter(
            is_active=True,
            company__isnull=True,
        )
        .order_by("-is_system", "name", "id")
    )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم جلب خيارات الشركات بنجاح.",
            "data": {
                "company_code": {
                    "auto_generated": True,
                    "editable": False,
                    "pattern": "CMP-YYYY-000001",
                    "description": "يتم توليد كود الشركة تلقائيا من النظام عند الإنشاء.",
                },
                "activity_profiles": [
                    _activity_profile_payload(profile)
                    for profile in activity_profiles
                ],
                "legacy_activity_profiles": [
                    _choice_payload(value, label)
                    for value, label in CompanyActivityProfile.choices
                ],
                "statuses": [
                    _choice_payload(value, label)
                    for value, label in CompanyStatus.choices
                ],
                "defaults": {
                    "status": CompanyStatus.TRIAL,
                    "country": "Saudi Arabia",
                    "currency_code": "SAR",
                    "vat_percentage": "15.00",
                },
                "required_fields": [
                    "name",
                    "commercial_registration",
                    "tax_number",
                    "activity_profile_id",
                    "building_number",
                    "street_name",
                    "district",
                    "city",
                    "region",
                    "postal_code",
                ],
                "billing_identity_fields": [
                    "commercial_registration",
                    "tax_number",
                    "building_number",
                    "street_name",
                    "district",
                    "city",
                    "region",
                    "postal_code",
                    "short_address",
                    "national_address_line",
                ],
            },
        },
        status=200,
    )