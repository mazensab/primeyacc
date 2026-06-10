# ============================================================
# 📂 api/company/whatsapp/settings.py
# 🧠 PrimeyAcc | Company WhatsApp Settings API V1.1
# ------------------------------------------------------------
# ✅ GET  /api/company/whatsapp/settings/
# ✅ POST /api/company/whatsapp/settings/
# ✅ Tenant-isolated by request.company
# ✅ GET requires company.whatsapp.view OR company.whatsapp.manage
# ✅ POST requires company.whatsapp.manage explicitly
# ✅ Does not expose raw access_token or webhook token
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نثق بأي company_id من الفرونت
# - الشركة الحالية تأتي من api/permissions.py عبر CompanyMembership
# - GET للعرض فقط
# - POST للتحديث الآمن لإعدادات واتساب
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import (
    HasAnyCompanyPermission,
    require_company_permission,
)
from whatsapp.services import (
    get_or_create_company_whatsapp_setting,
    serialize_whatsapp_setting,
    update_company_whatsapp_setting,
)


@api_view(["GET", "POST"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_settings(request):
    """
    Read or update current company WhatsApp settings.
    """
    company = getattr(request, "company", None)

    if not company:
        return Response(
            {
                "success": False,
                "message": "Company context was not resolved.",
            },
            status=403,
        )

    if request.method == "GET":
        setting = get_or_create_company_whatsapp_setting(
            company=company,
            user=request.user,
        )

        return Response(
            {
                "success": True,
                "setting": serialize_whatsapp_setting(setting),
            }
        )

    if not require_company_permission(
        request,
        "company.whatsapp.manage",
    ):
        return Response(
            {
                "success": False,
                "message": "You do not have permission to manage WhatsApp settings.",
            },
            status=403,
        )

    setting = update_company_whatsapp_setting(
        company=company,
        data=request.data,
        user=request.user,
    )

    return Response(
        {
            "success": True,
            "message": "WhatsApp settings updated successfully.",
            "setting": serialize_whatsapp_setting(setting),
        }
    )


company_whatsapp_settings.required_company_permissions = [
    "company.whatsapp.view",
    "company.whatsapp.manage",
]