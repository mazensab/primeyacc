# ============================================================
# api/system/companies/company_users.py
# Mhamcloud | System Company Users API V1.0
# ------------------------------------------------------------
# Creates or links a company user from the system workspace.
# This API is separate from /api/company/users/create/.
# The company is taken from the trusted system URL company_id.
# ============================================================
from __future__ import annotations
import json
from typing import Any
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST
from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
    SystemRole,
    UserProfile,
    UserProfileStatus,
    WorkspaceType,
)
from api.permissions import user_has_system_permission
from companies.models import Company
User = get_user_model()
def _json_body(request: HttpRequest) -> dict[str, Any]:
    if not request.body:
        return {}
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}
def _get_value(
    request: HttpRequest,
    payload: dict[str, Any],
    key: str,
    default: Any = None,
) -> Any:
    if key in payload:
        return payload.get(key)
    return request.POST.get(key, default)
def _clean_text(value: Any) -> str:
    return str(value or "").strip()
def _clean_upper(value: Any) -> str:
    return _clean_text(value).upper()
def _clean_bool(value: Any, default: bool = False) -> bool:
    if value in {None, ""}:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value == 1
    return str(value).strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
        "y",
    }
def _datetime_to_string(value: Any) -> str | None:
    if not value:
        return None
    return value.isoformat()
def _company_payload(company: Company) -> dict[str, Any]:
    display_name = (
        getattr(company, "display_name", None)
        or getattr(company, "name", "")
    )
    company_code = getattr(company, "company_code", "") or ""
    return {
        "id": company.id,
        "name": getattr(company, "name", ""),
        "display_name": display_name,
        "name_ar": getattr(company, "name_ar", ""),
        "name_en": getattr(company, "name_en", ""),
        "company_code": company_code,
        "code": company_code,
        "email": getattr(company, "email", ""),
        "phone": getattr(company, "phone", ""),
        "mobile": getattr(company, "mobile", ""),
        "city": getattr(company, "city", ""),
        "status": getattr(company, "status", ""),
        "is_active": getattr(company, "is_active", True),
    }
def _user_payload(user: Any) -> dict[str, Any]:
    full_name = user.get_full_name().strip()
    return {
        "id": user.id,
        "username": user.get_username(),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "name": full_name or user.get_username(),
        "is_active": user.is_active,
        "date_joined": _datetime_to_string(user.date_joined),
        "last_login": _datetime_to_string(user.last_login),
    }
def _profile_payload(user: Any) -> dict[str, Any] | None:
    profile = getattr(user, "Mhamcloud_profile", None)
    if not profile:
        return None
    return {
        "id": profile.id,
        "display_name": profile.display_name,
        "phone": profile.phone,
        "mobile": profile.mobile,
        "whatsapp_number": profile.whatsapp_number,
        "status": profile.status,
        "default_workspace": profile.default_workspace,
        "system_role": profile.system_role,
        "is_system_user": profile.is_system_user,
        "language": profile.language,
        "timezone": profile.timezone,
        "created_at": _datetime_to_string(profile.created_at),
        "updated_at": _datetime_to_string(profile.updated_at),
    }
def _membership_payload(
    membership: CompanyMembership,
) -> dict[str, Any]:
    user = membership.user
    return {
        "id": membership.id,
        "user": _user_payload(user),
        "profile": _profile_payload(user),
        "company": _company_payload(membership.company),
        "company_id": membership.company_id,
        "role": membership.role,
        "status": membership.status,
        "is_primary": membership.is_primary,
        "job_title": membership.job_title,
        "department": membership.department,
        "is_active_membership": membership.is_active_membership,
        "permissions": membership.company_permissions,
        "joined_at": _datetime_to_string(membership.joined_at),
        "invited_at": _datetime_to_string(membership.invited_at),
        "suspended_at": _datetime_to_string(membership.suspended_at),
        "suspended_reason": membership.suspended_reason,
        "notes": membership.notes,
        "created_at": _datetime_to_string(membership.created_at),
        "updated_at": _datetime_to_string(membership.updated_at),
    }
def _resolve_or_create_user(
    *,
    request: HttpRequest,
    payload: dict[str, Any],
) -> tuple[Any, bool]:
    email = _clean_text(
        _get_value(request, payload, "email", "")
    ).lower()
    username = _clean_text(
        _get_value(request, payload, "username", "")
    )
    first_name = _clean_text(
        _get_value(request, payload, "first_name", "")
    )
    last_name = _clean_text(
        _get_value(request, payload, "last_name", "")
    )
    password = str(
        _get_value(request, payload, "password", "") or ""
    )
    if not email and not username:
        raise ValidationError(
            {
                "email": "Email or username is required.",
                "username": "Email or username is required.",
            }
        )
    if not username:
        username = email
    user = None
    if email:
        user = User.objects.filter(
            email__iexact=email
        ).first()
    if not user and username:
        user = User.objects.filter(
            username__iexact=username
        ).first()
    if user:
        changed_fields = []
        if email and not user.email:
            user.email = email
            changed_fields.append("email")
        if first_name and user.first_name != first_name:
            user.first_name = first_name
            changed_fields.append("first_name")
        if last_name and user.last_name != last_name:
            user.last_name = last_name
            changed_fields.append("last_name")
        if changed_fields:
            user.full_clean()
            user.save(update_fields=changed_fields)
        return user, False
    user = User(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        is_active=_clean_bool(
            _get_value(request, payload, "is_active", True),
            default=True,
        ),
    )
    if password:
        user.set_password(password)
    else:
        user.set_unusable_password()
    user.full_clean()
    user.save()
    return user, True
def _ensure_company_user_profile(
    *,
    user: Any,
    request: HttpRequest,
    payload: dict[str, Any],
) -> UserProfile:
    display_name = _clean_text(
        _get_value(request, payload, "display_name", "")
    )
    phone = _clean_text(
        _get_value(request, payload, "phone", "")
    )
    mobile = _clean_text(
        _get_value(request, payload, "mobile", "")
    )
    whatsapp_number = _clean_text(
        _get_value(request, payload, "whatsapp_number", "")
    )
    language = (
        _clean_text(
            _get_value(request, payload, "language", "ar")
        )
        or "ar"
    )
    timezone_name = (
        _clean_text(
            _get_value(
                request,
                payload,
                "timezone",
                "Asia/Riyadh",
            )
        )
        or "Asia/Riyadh"
    )
    profile, created = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            "display_name": (
                display_name
                or user.get_full_name()
                or user.get_username()
            ),
            "phone": phone,
            "mobile": mobile,
            "whatsapp_number": whatsapp_number,
            "status": UserProfileStatus.ACTIVE,
            "default_workspace": WorkspaceType.COMPANY,
            "system_role": SystemRole.NONE,
            "is_system_user": False,
            "language": language,
            "timezone": timezone_name,
        },
    )
    if created:
        return profile
    changed_fields = []
    updates = {
        "display_name": display_name,
        "phone": phone,
        "mobile": mobile,
        "whatsapp_number": whatsapp_number,
        "language": language,
        "timezone": timezone_name,
    }
    for field_name, value in updates.items():
        if value and getattr(profile, field_name) != value:
            setattr(profile, field_name, value)
            changed_fields.append(field_name)
    if changed_fields:
        changed_fields.append("updated_at")
        profile.full_clean()
        profile.save(update_fields=changed_fields)
    return profile
def _default_company_role(company: Company) -> str:
    has_memberships = CompanyMembership.objects.filter(
        company=company,
    ).exists()
    if has_memberships:
        return CompanyRole.ADMIN
    return CompanyRole.OWNER
def _resolve_role(
    *,
    request: HttpRequest,
    payload: dict[str, Any],
    company: Company,
) -> str:
    role = _clean_upper(
        _get_value(
            request,
            payload,
            "role",
            _default_company_role(company),
        )
    )
    valid_roles = {
        choice[0]
        for choice in CompanyRole.choices
    }
    if role not in valid_roles:
        raise ValidationError(
            {
                "role": (
                    "Invalid company role. Use one of: "
                    + ", ".join(sorted(valid_roles))
                )
            }
        )
    return role
def _resolve_status(
    *,
    request: HttpRequest,
    payload: dict[str, Any],
) -> str:
    status = _clean_upper(
        _get_value(
            request,
            payload,
            "status",
            MembershipStatus.ACTIVE,
        )
    )
    valid_statuses = {
        choice[0]
        for choice in MembershipStatus.choices
    }
    if status not in valid_statuses:
        raise ValidationError(
            {
                "status": (
                    "Invalid membership status. Use one of: "
                    + ", ".join(sorted(valid_statuses))
                )
            }
        )
    return status
def _validation_errors(
    exc: ValidationError,
) -> dict[str, Any] | list[Any] | str:
    if hasattr(exc, "message_dict"):
        return exc.message_dict
    if hasattr(exc, "messages"):
        return exc.messages
    return str(exc)
@login_required
@csrf_protect
@require_POST
def system_company_user_create(
    request: HttpRequest,
    company_id: int,
) -> JsonResponse:
    if not user_has_system_permission(
        request.user,
        "system.companies.update",
    ):
        return JsonResponse(
            {
                "ok": False,
                "message": (
                    "You do not have permission to manage company users."
                ),
                "code": (
                    "SYSTEM_COMPANY_USERS_CREATE_"
                    "PERMISSION_REQUIRED"
                ),
            },
            status=403,
        )
    company = get_object_or_404(
        Company,
        id=company_id,
    )
    payload = _json_body(request)
    try:
        role = _resolve_role(
            request=request,
            payload=payload,
            company=company,
        )
        status = _resolve_status(
            request=request,
            payload=payload,
        )
        with transaction.atomic():
            user, user_created = _resolve_or_create_user(
                request=request,
                payload=payload,
            )
            _ensure_company_user_profile(
                user=user,
                request=request,
                payload=payload,
            )
            existing_membership = (
                CompanyMembership.objects
                .filter(
                    user=user,
                    company=company,
                )
                .first()
            )
            if existing_membership:
                return JsonResponse(
                    {
                        "ok": False,
                        "message": (
                            "This user already has a membership "
                            "in the selected company."
                        ),
                        "errors": {
                            "user": (
                                "This user already has a membership "
                                "in the selected company."
                            ),
                            "membership_id": (
                                existing_membership.id
                            ),
                        },
                    },
                    status=400,
                )
            is_primary_default = not (
                CompanyMembership.objects
                .filter(
                    user=user,
                    status=MembershipStatus.ACTIVE,
                    is_primary=True,
                )
                .exists()
            )
            membership = CompanyMembership(
                user=user,
                company=company,
                role=role,
                status=status,
                is_primary=_clean_bool(
                    _get_value(
                        request,
                        payload,
                        "is_primary",
                        is_primary_default,
                    ),
                    default=is_primary_default,
                ),
                job_title=_clean_text(
                    _get_value(
                        request,
                        payload,
                        "job_title",
                        "",
                    )
                ),
                department=_clean_text(
                    _get_value(
                        request,
                        payload,
                        "department",
                        "",
                    )
                ),
                notes=_clean_text(
                    _get_value(
                        request,
                        payload,
                        "notes",
                        "",
                    )
                ),
                created_by=request.user,
                updated_by=request.user,
            )
            if status == MembershipStatus.ACTIVE:
                membership.joined_at = timezone.now()
            membership.full_clean()
            membership.save()
    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": (
                    "Unable to create company user because "
                    "the submitted data is invalid."
                ),
                "errors": _validation_errors(exc),
            },
            status=400,
        )
    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "message": (
                    "Unable to create company user because "
                    "of duplicate unique data."
                ),
            },
            status=400,
        )
    membership = (
        CompanyMembership.objects
        .select_related(
            "user",
            "company",
        )
        .get(id=membership.id)
    )
    return JsonResponse(
        {
            "ok": True,
            "message": "Company user created successfully.",
            "data": {
                "membership": _membership_payload(
                    membership
                ),
                "user_created": user_created,
                "company": _company_payload(company),
                "company_id": company.id,
            },
        },
        status=201,
    )