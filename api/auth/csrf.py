# ============================================================
# 📂 api/auth/csrf.py
# 🧠 PrimeyAcc | Auth CSRF API V1
# ------------------------------------------------------------
# ✅ CSRF Cookie Endpoint
# ✅ Session Auth Compatible
# ✅ Frontend Bootstrap Ready
# ✅ Anonymous-safe Access
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - CSRF endpoint عام وآمن لتهيئة جلسة المتصفح
# - الواجهة تستدعي /api/auth/csrf/ قبل login
# - تسجيل الدخول يعتمد على Session + CSRF وليس JWT في المرحلة الحالية
# - الباكند هو مصدر الحقيقة للجلسة والصلاحيات
# ============================================================

from __future__ import annotations

from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token(request: Request) -> Response:
    return Response(
        {
            "detail": "CSRF cookie set.",
            "csrf_token": get_token(request),
        }
    )