# ============================================================
# 📂 api/company/pos/registers/create.py
# 🧠 PrimeyAcc | Company POS Registers Create API V1.0
# ------------------------------------------------------------
# ✅ Create POS register for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe branch / warehouse / treasury account resolution
# ✅ Safe payment method / terminal resolution
# ✅ Uses pos.services.create_pos_register
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي فرع أو مستودع أو حساب خزينة أو طريقة دفع يجب أن يكون داخل نفس الشركة
# - منطق الإنشاء يبقى داخل pos/services.py
# - صلاحية الإنشاء المطلوبة: company.pos.registers.create
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
from pos.services import create_pos_register
from treasury.models import TreasuryAccount

from .list import serialize_pos_register


class POSRegisterCreateAPIError(Exception):
    """
    Small API-level error for POS register create endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSRegisterCreateAPIError("Current company context was not resolved.")

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


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def pos_register_create(request: Request) -> Response:
    """
    POST /api/company/pos/registers/create/
    """
    try:
        company = _get_request_company(request)
        data = request.data or {}

        branch = _get_branch_for_company(
            company,
            data.get("branch_id") or data.get("branch"),
        )
        warehouse = _get_warehouse_for_company(
            company,
            data.get("warehouse_id") or data.get("warehouse"),
        )
        treasury_account = _get_treasury_account_for_company(
            company,
            data.get("treasury_account_id")
            or data.get("treasury_account")
            or data.get("account_id"),
        )
        default_payment_method = _get_payment_method_for_company(
            company,
            data.get("default_payment_method_id")
            or data.get("payment_method_id")
            or data.get("default_payment_method"),
        )
        default_payment_terminal = _get_payment_terminal_for_company(
            company,
            data.get("default_payment_terminal_id")
            or data.get("payment_terminal_id")
            or data.get("default_payment_terminal"),
        )

        register = create_pos_register(
            company=company,
            branch=branch,
            warehouse=warehouse,
            treasury_account=treasury_account,
            default_payment_method=default_payment_method,
            default_payment_terminal=default_payment_terminal,
            name=_clean_text(data.get("name")),
            code=_clean_upper(data.get("code")),
            receipt_header=_clean_text(data.get("receipt_header")),
            receipt_footer=_clean_text(data.get("receipt_footer")),
            notes=_clean_text(data.get("notes")),
            user=request.user,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS register created successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "item": serialize_pos_register(register),
                "result": serialize_pos_register(register),
            },
            status=201,
        )

    except POSRegisterCreateAPIError as exc:
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


pos_register_create.required_company_permissions = [
    "company.pos.registers.create",
]