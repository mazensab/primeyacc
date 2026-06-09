# ============================================================
# 📂 api/company/pos/registers/update.py
# 🧠 PrimeyAcc | Company POS Registers Update API V1.0
# ------------------------------------------------------------
# ✅ Update POS register for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe register lookup inside current company
# ✅ Safe branch / warehouse / treasury account resolution
# ✅ Safe payment method / terminal resolution
# ✅ No frontend company_id trust
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم تعديل أي Register خارج شركة المستخدم الحالية
# - أي فرع أو مستودع أو حساب خزينة أو طريقة دفع يجب أن يكون داخل نفس الشركة
# - لا يتم فتح جلسة أو بيع أو تحصيل من update API
# - صلاحية التعديل المطلوبة: company.pos.registers.update
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from companies.models import Branch
from inventory.models import Warehouse
from payments.models import CompanyPaymentMethod, CompanyPaymentTerminal
from pos.models import POSRegister
from treasury.models import TreasuryAccount

from .detail import get_pos_register_for_company
from .list import serialize_pos_register


class POSRegisterUpdateAPIError(Exception):
    """
    Small API-level error for POS register update endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSRegisterUpdateAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize request text.
    """
    return str(value or "").strip()


def _clean_upper(value: Any) -> str:
    """
    Normalize code-like text.
    """
    return _clean_text(value).upper()


def _clean_id(value: Any, field_name: str) -> int | None:
    """
    Safely parse optional integer ids.
    """
    if value in [None, ""]:
        return None

    try:
        parsed_id = int(value)
    except (TypeError, ValueError):
        raise ValidationError({field_name: f"Invalid {field_name}."})

    if parsed_id < 1:
        raise ValidationError({field_name: f"Invalid {field_name}."})

    return parsed_id


def _field_was_sent(data: dict[str, Any], *names: str) -> bool:
    """
    Check whether one of the accepted field aliases was sent.
    """
    return any(name in data for name in names)


def _first_sent_value(data: dict[str, Any], *names: str):
    """
    Return the first sent value from accepted aliases.
    """
    for name in names:
        if name in data:
            return data.get(name)
    return None


def _get_branch_for_company(company, branch_id: Any):
    """
    Resolve branch safely for current company only.
    """
    parsed_id = _clean_id(branch_id, "branch_id")

    if not parsed_id:
        raise ValidationError({"branch_id": "Branch is required."})

    branch = Branch.objects.filter(
        company=company,
        id=parsed_id,
    ).first()

    if not branch:
        raise ValidationError({"branch_id": "Branch was not found."})

    return branch


def _get_warehouse_for_company(company, warehouse_id: Any):
    """
    Resolve optional warehouse safely for current company only.
    """
    parsed_id = _clean_id(warehouse_id, "warehouse_id")

    if not parsed_id:
        return None

    warehouse = Warehouse.objects.filter(
        company=company,
        id=parsed_id,
    ).first()

    if not warehouse:
        raise ValidationError({"warehouse_id": "Warehouse was not found."})

    return warehouse


def _get_treasury_account_for_company(company, treasury_account_id: Any):
    """
    Resolve optional treasury account safely for current company only.
    """
    parsed_id = _clean_id(treasury_account_id, "treasury_account_id")

    if not parsed_id:
        return None

    treasury_account = TreasuryAccount.objects.filter(
        company=company,
        id=parsed_id,
    ).first()

    if not treasury_account:
        raise ValidationError({"treasury_account_id": "Treasury account was not found."})

    return treasury_account


def _get_payment_method_for_company(company, payment_method_id: Any):
    """
    Resolve optional payment method safely for current company only.
    """
    parsed_id = _clean_id(payment_method_id, "default_payment_method_id")

    if not parsed_id:
        return None

    payment_method = CompanyPaymentMethod.objects.filter(
        company=company,
        id=parsed_id,
    ).first()

    if not payment_method:
        raise ValidationError(
            {"default_payment_method_id": "Default payment method was not found."}
        )

    return payment_method


def _get_payment_terminal_for_company(company, payment_terminal_id: Any):
    """
    Resolve optional payment terminal safely for current company only.
    """
    parsed_id = _clean_id(payment_terminal_id, "default_payment_terminal_id")

    if not parsed_id:
        return None

    payment_terminal = CompanyPaymentTerminal.objects.filter(
        company=company,
        id=parsed_id,
    ).first()

    if not payment_terminal:
        raise ValidationError(
            {"default_payment_terminal_id": "Default payment terminal was not found."}
        )

    return payment_terminal


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def pos_register_update(request: Request, register_id: int) -> Response:
    """
    POST/PATCH /api/company/pos/registers/<register_id>/update/
    """
    try:
        company = _get_request_company(request)
        register: POSRegister = get_pos_register_for_company(company, register_id)
        data = request.data or {}

        if _field_was_sent(data, "branch_id", "branch"):
            register.branch = _get_branch_for_company(
                company,
                _first_sent_value(data, "branch_id", "branch"),
            )

        if _field_was_sent(data, "warehouse_id", "warehouse"):
            register.warehouse = _get_warehouse_for_company(
                company,
                _first_sent_value(data, "warehouse_id", "warehouse"),
            )

        if _field_was_sent(data, "treasury_account_id", "treasury_account", "account_id"):
            register.treasury_account = _get_treasury_account_for_company(
                company,
                _first_sent_value(
                    data,
                    "treasury_account_id",
                    "treasury_account",
                    "account_id",
                ),
            )

        if _field_was_sent(
            data,
            "default_payment_method_id",
            "payment_method_id",
            "default_payment_method",
        ):
            register.default_payment_method = _get_payment_method_for_company(
                company,
                _first_sent_value(
                    data,
                    "default_payment_method_id",
                    "payment_method_id",
                    "default_payment_method",
                ),
            )

        if _field_was_sent(
            data,
            "default_payment_terminal_id",
            "payment_terminal_id",
            "default_payment_terminal",
        ):
            register.default_payment_terminal = _get_payment_terminal_for_company(
                company,
                _first_sent_value(
                    data,
                    "default_payment_terminal_id",
                    "payment_terminal_id",
                    "default_payment_terminal",
                ),
            )

        if "name" in data:
            register.name = _clean_text(data.get("name"))

        if "code" in data:
            register.code = _clean_upper(data.get("code"))

        if "receipt_header" in data:
            register.receipt_header = _clean_text(data.get("receipt_header"))

        if "receipt_footer" in data:
            register.receipt_footer = _clean_text(data.get("receipt_footer"))

        if "notes" in data:
            register.notes = _clean_text(data.get("notes"))

        if "settings_data" in data and isinstance(data.get("settings_data"), dict):
            register.settings_data = data.get("settings_data") or {}

        if "extra_data" in data and isinstance(data.get("extra_data"), dict):
            register.extra_data = data.get("extra_data") or {}

        register.updated_by = request.user if request.user.is_authenticated else None

        register.full_clean()
        register.save()

        register = get_pos_register_for_company(company, register.id)
        serialized_register = serialize_pos_register(register)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS register updated successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "item": serialized_register,
                "result": serialized_register,
            },
            status=200,
        )

    except POSRegisterUpdateAPIError as exc:
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
                "message": "POS register validation failed.",
                "errors": getattr(exc, "message_dict", None)
                or {"detail": getattr(exc, "messages", [str(exc)])},
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "POS register already exists.",
                "errors": {
                    "detail": "POS register code already exists for this company.",
                },
            },
            status=400,
        )


pos_register_update.required_company_permissions = [
    "company.pos.registers.update",
]