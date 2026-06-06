# ============================================================
# 📂 api/auth/logout.py
# 🧠 PrimeyAcc | Auth Logout API V2
# ------------------------------------------------------------
# ✅ Session Logout
# ✅ CSRF Protected
# ✅ Safe Anonymous Handling
# ✅ Explicit Session Cookie Clear
# ✅ Frontend Session Clear Support
# ✅ Whoami-compatible Logged-out Response
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - تسجيل الخروج ينهي Django Session
# - الواجهة لا تعتمد على حذف بيانات محلية فقط
# - الباكند هو مصدر الحقيقة لحالة الجلسة
# - logout يجب أن يرجع استجابة آمنة حتى لو المستخدم غير مسجل
# - لا نحذف CSRF cookie هنا حتى يبقى تسجيل الدخول التالي سلسًا
# ============================================================

from __future__ import annotations

from django.conf import settings
from django.contrib.auth import logout as django_logout
from django.views.decorators.csrf import csrf_protect
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response


@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_protect
def logout(request: Request) -> Response:
    """
    End the current Django session safely.

    This endpoint is intentionally anonymous-safe:
    - If the user is authenticated, the session is flushed.
    - If the user is already anonymous, the response still succeeds.
    """
    django_logout(request)

    response = Response(
        {
            "authenticated": False,
            "detail": "Logout successful.",
            "user": None,
            "profile": None,
            "workspace": None,
            "dashboard_path": None,
            "can_access_system": False,
            "can_access_company": False,
            "system_permissions": [],
            "company_permissions": [],
            "current_company": None,
            "current_membership": None,
            "default_company": None,
            "memberships": [],
        }
    )

    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path=getattr(settings, "SESSION_COOKIE_PATH", "/"),
        domain=getattr(settings, "SESSION_COOKIE_DOMAIN", None),
        samesite=getattr(settings, "SESSION_COOKIE_SAMESITE", "Lax"),
    )

    return response