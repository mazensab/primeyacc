# ============================================================
# 📂 api/auth/csrf.py
# 🧠 PrimeyAcc | Auth CSRF API V2
# ------------------------------------------------------------
# ✅ CSRF Cookie Endpoint
# ✅ Session Auth Compatible
# ✅ Frontend Bootstrap Ready
# ✅ Anonymous-safe Access
# ✅ Authenticated Session Hint
# ✅ Login / Logout / Whoami Compatible Response
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - CSRF endpoint عام وآمن لتهيئة جلسة المتصفح
# - الواجهة تستدعي /api/auth/csrf/ قبل login
# - تسجيل الدخول يعتمد على Session + CSRF وليس JWT في المرحلة الحالية
# - الباكند هو مصدر الحقيقة للجلسة والصلاحيات
# - هذا endpoint لا يمنح صلاحيات ولا يقرر مساحة المستخدم
# ============================================================

from __future__ import annotations

from typing import Any

from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response


def _user_hint_payload(user) -> dict[str, Any] | None:
    if not user or not user.is_authenticated:
        return None

    return {
        "id": user.id,
        "username": user.get_username(),
        "email": user.email,
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
    }


@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token(request: Request) -> Response:
    """
    Set and return the CSRF token for browser-based Session Auth.

    This endpoint is intentionally public and anonymous-safe.
    It should be called by the frontend before POST requests such as login.
    """
    user = request.user
    authenticated = bool(user and user.is_authenticated)

    return Response(
        {
            "detail": "CSRF cookie set.",
            "csrf_token": get_token(request),
            "authenticated": authenticated,
            "user": _user_hint_payload(user),
        }
    )