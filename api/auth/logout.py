# ============================================================
# 📂 api/auth/logout.py
# 🧠 PrimeyAcc | Auth Logout API V1
# ------------------------------------------------------------
# ✅ Session Logout
# ✅ CSRF Protected
# ✅ Safe Anonymous Handling
# ✅ Frontend Session Clear Support
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - تسجيل الخروج ينهي Django Session
# - الواجهة لا تعتمد على حذف بيانات محلية فقط
# - الباكند هو مصدر الحقيقة لحالة الجلسة
# - logout يجب أن يرجع استجابة آمنة حتى لو المستخدم غير مسجل
# ============================================================

from __future__ import annotations

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
    django_logout(request)

    return Response(
        {
            "authenticated": False,
            "detail": "Logout successful.",
        }
    )