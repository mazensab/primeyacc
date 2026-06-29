# ============================================================
# 📂 api/company/treasury/accounts/detail.py
# 🧠 Mhamcloud | Company Treasury Account Detail API V1.0
# ------------------------------------------------------------
# ✅ Retrieve treasury account for current company only
# ✅ Update treasury account for current company only
# ✅ Safe deactivate action instead of destructive delete
# ✅ Tenant isolation through request.company
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا نسمح بتعديل حساب خزينة تابع لشركة أخرى
# - لا نستخدم حذف فعلي في هذه المرحلة
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.treasury.accounts.list import serialize_treasury_account
from api.permissions import HasAnyCompanyPermission
from treasury.models import TreasuryAccount
from treasury.services import (
    deactivate_treasury_account,
    get_treasury_account_or_raise,
    update_treasury_account,
)


class TreasuryAccountDetailAPIError(Exception):
    """
    Small API-level error for treasury account detail endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise TreasuryAccountDetailAPIError("Current company context was not resolved.")

    return company


def _to_bool(value: Any) -> bool | None:
    """
    Parse optional boolean body values.
    """
    if value in [None, ""]:
        return None

    text = str(value).strip().lower()

    if text in {"1", "true", "yes", "y", "on"}:
        return True

    if text in {"0", "false", "no", "n", "off"}:
        return False

    return None


def _build_update_kwargs(data: dict[str, Any]) -> dict[str, Any]:
    """
    Build safe update kwargs without allowing current_balance direct mutation.
    """
    allowed_fields = {
        "name",
        "account_type",
        "code",
        "currency",
        "bank_name",
        "bank_account_number",
        "iban",
        "is_default",
        "notes",
        "status",
    }

    update_kwargs: dict[str, Any] = {}

    for field in allowed_fields:
        if field in data:
            update_kwargs[field] = data.get(field)

    if "type" in data and "account_type" not in update_kwargs:
        update_kwargs["account_type"] = data.get("type")

    if "is_default" in update_kwargs:
        parsed = _to_bool(update_kwargs["is_default"])
        update_kwargs["is_default"] = bool(parsed)

    return update_kwargs


@api_view(["GET", "PATCH", "PUT", "POST"])
@permission_classes([HasAnyCompanyPermission])
def treasury_account_detail(request: Request, account_id: int) -> Response:
    """
    GET /api/company/treasury/accounts/<account_id>/
    PATCH /api/company/treasury/accounts/<account_id>/
    PUT /api/company/treasury/accounts/<account_id>/
    POST /api/company/treasury/accounts/<account_id>/?action=deactivate
    """
    try:
        company = _get_request_company(request)
        account = get_treasury_account_or_raise(company, account_id)

        if request.method == "GET":
            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Treasury account loaded successfully.",
                    "item": serialize_treasury_account(account),
                    "result": serialize_treasury_account(account),
                },
                status=200,
            )

        action = str(
            request.query_params.get("action")
            or request.data.get("action")
            or ""
        ).strip().lower()

        if request.method == "POST" and action == "deactivate":
            account = deactivate_treasury_account(
                company=company,
                account=account,
                user=request.user,
            )

            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Treasury account deactivated successfully.",
                    "item": serialize_treasury_account(account),
                    "result": serialize_treasury_account(account),
                },
                status=200,
            )

        if request.method == "POST":
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Unsupported treasury account action.",
                    "errors": {
                        "action": "Supported action: deactivate.",
                    },
                },
                status=400,
            )

        update_kwargs = _build_update_kwargs(request.data or {})

        account = update_treasury_account(
            company=company,
            account=account,
            user=request.user,
            **update_kwargs,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Treasury account updated successfully.",
                "item": serialize_treasury_account(account),
                "result": serialize_treasury_account(account),
            },
            status=200,
        )

    except TreasuryAccountDetailAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=400,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Treasury account validation failed.",
                "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages},
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Treasury account already exists.",
                "errors": {
                    "detail": "Treasury account name or code already exists for this company.",
                },
            },
            status=400,
        )


treasury_account_detail.required_company_permissions = [
    "company.treasury.accounts.view",
    "company.treasury.accounts.update",
]