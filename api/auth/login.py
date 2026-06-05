# ============================================================
# 📂 api/auth/login.py
# 🧠 PrimeyAcc | Auth Login API V1
# ------------------------------------------------------------
# ✅ Session Login
# ✅ CSRF Protected
# ✅ Username / Email Login Support
# ✅ UserProfile Auto-create
# ✅ Safe Error Messages
# ✅ Whoami-compatible Response
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - User = حساب دخول فقط
# - UserProfile = ملف المستخدم العام داخل PrimeyAcc
# - تسجيل الدخول يستخدم Django Session + CSRF
# - لا يتم تحديد صلاحيات الواجهة من الفرونت
# - whoami هو مصدر معرفة مساحة المستخدم والشركة الافتراضية
# ============================================================

from __future__ import annotations

from typing import Any

from django.contrib.auth import authenticate, get_user_model, login as django_login
from django.db.models import Q
from django.views.decorators.csrf import csrf_protect
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.models import UserProfile
from api.auth.whoami import _profile_payload


def _get_username_from_identifier(identifier: str) -> str | None:
    identifier = (identifier or "").strip()
    if not identifier:
        return None

    User = get_user_model()

    user = (
        User.objects.filter(Q(username__iexact=identifier) | Q(email__iexact=identifier))
        .order_by("id")
        .first()
    )

    if not user:
        return identifier

    return user.get_username()


def _login_payload(user) -> dict[str, Any]:
    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            "display_name": user.get_full_name() or user.get_username(),
        },
    )

    profile_data = _profile_payload(profile)

    return {
        "authenticated": True,
        "detail": "Login successful.",
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


@api_view(["POST"])
@permission_classes([AllowAny])
@csrf_protect
def login(request: Request) -> Response:
    identifier = (
        request.data.get("username")
        or request.data.get("email")
        or request.data.get("identifier")
        or ""
    )
    password = request.data.get("password") or ""

    username = _get_username_from_identifier(str(identifier))

    if not username or not password:
        return Response(
            {
                "authenticated": False,
                "detail": "Username/email and password are required.",
            },
            status=400,
        )

    user = authenticate(
        request=request,
        username=username,
        password=password,
    )

    if user is None:
        return Response(
            {
                "authenticated": False,
                "detail": "Invalid username/email or password.",
            },
            status=400,
        )

    if not user.is_active:
        return Response(
            {
                "authenticated": False,
                "detail": "This user account is inactive.",
            },
            status=403,
        )

    django_login(request, user)

    return Response(_login_payload(user))