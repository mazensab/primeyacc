# ============================================================
# 📂 api/company/accounting/journal_entries/create.py
# 🧠 PrimeyAcc | Company Accounting Journal Entry Create API
# ------------------------------------------------------------
# ✅ إنشاء قيد يومية يدوي للشركة الحالية
# ✅ عزل كامل حسب CompanyMembership
# ✅ لا يعتمد على company_id من الفرونت
# ✅ يستخدم accounting.services بدل تكرار المنطق
# ✅ يمنع القيود غير المتوازنة
# ✅ يدعم auto_post اختياريًا
# ============================================================

from __future__ import annotations

from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounting.models import Account, CostCenter, TaxRate
from accounting.services import (
    AccountingConfigurationError,
    AccountingPostingError,
    EntryLinePayload,
    create_manual_journal_entry,
)
from api.permissions import HasAnyCompanyPermission


# ============================================================
# Helpers
# ============================================================

def _clean_text(value: Any) -> str:
    return str(value or "").strip()


def _to_bool(value: Any) -> bool:
    if value in [None, ""]:
        return False

    text = str(value).strip().lower()
    return text in {"1", "true", "yes", "y", "on"}


def _to_date(value: Any):
    if value in [None, ""]:
        return None

    text = str(value).strip()

    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        return None


def _to_decimal(value: Any, *, field_name: str) -> Decimal:
    try:
        return Decimal(str(value or "0.00")).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise AccountingPostingError(f"{field_name}: قيمة رقمية غير صحيحة.") from exc


def _get_account(company, raw_account_id: Any, raw_account_code: Any) -> Account:
    account_id = _clean_text(raw_account_id)
    account_code = _clean_text(raw_account_code)

    queryset = Account.objects.filter(
        company=company,
        is_active=True,
        is_group=False,
    )

    account = None

    if account_id:
        try:
            account = queryset.filter(pk=int(account_id)).first()
        except (TypeError, ValueError):
            account = None

    if not account and account_code:
        account = queryset.filter(code=account_code).first()

    if not account:
        raise AccountingConfigurationError("الحساب غير موجود أو غير قابل للترحيل داخل الشركة الحالية.")

    return account


def _get_cost_center(company, raw_cost_center_id: Any) -> CostCenter | None:
    value = _clean_text(raw_cost_center_id)

    if not value:
        return None

    try:
        cost_center_id = int(value)
    except (TypeError, ValueError) as exc:
        raise AccountingPostingError("مركز التكلفة غير صحيح.") from exc

    cost_center = CostCenter.objects.filter(
        company=company,
        pk=cost_center_id,
    ).first()

    if not cost_center:
        raise AccountingPostingError("مركز التكلفة غير موجود داخل الشركة الحالية.")

    return cost_center


def _get_tax_rate(company, raw_tax_rate_id: Any) -> TaxRate | None:
    value = _clean_text(raw_tax_rate_id)

    if not value:
        return None

    try:
        tax_rate_id = int(value)
    except (TypeError, ValueError) as exc:
        raise AccountingPostingError("الضريبة غير صحيحة.") from exc

    tax_rate = TaxRate.objects.filter(
        company=company,
        pk=tax_rate_id,
    ).first()

    if not tax_rate:
        raise AccountingPostingError("الضريبة غير موجودة داخل الشركة الحالية.")

    return tax_rate


def _build_line_payloads(company, raw_lines: Any) -> list[EntryLinePayload]:
    if not isinstance(raw_lines, list) or not raw_lines:
        raise AccountingPostingError("أسطر القيد مطلوبة.")

    lines: list[EntryLinePayload] = []

    for index, raw_line in enumerate(raw_lines, start=1):
        if not isinstance(raw_line, dict):
            raise AccountingPostingError(f"السطر رقم {index} غير صحيح.")

        account = _get_account(
            company,
            raw_line.get("account_id"),
            raw_line.get("account_code"),
        )

        cost_center = _get_cost_center(
            company,
            raw_line.get("cost_center_id"),
        )

        tax_rate = _get_tax_rate(
            company,
            raw_line.get("tax_rate_id"),
        )

        debit_amount = _to_decimal(
            raw_line.get("debit_amount"),
            field_name=f"السطر {index} المدين",
        )
        credit_amount = _to_decimal(
            raw_line.get("credit_amount"),
            field_name=f"السطر {index} الدائن",
        )
        tax_amount = _to_decimal(
            raw_line.get("tax_amount"),
            field_name=f"السطر {index} الضريبة",
        )

        lines.append(
            EntryLinePayload(
                account=account,
                description=_clean_text(raw_line.get("description")),
                debit_amount=debit_amount,
                credit_amount=credit_amount,
                tax_amount=tax_amount,
                currency=_clean_text(raw_line.get("currency")) or "SAR",
                cost_center=cost_center,
                tax_rate=tax_rate,
                party_type=_clean_text(raw_line.get("party_type")),
                party_id=_clean_text(raw_line.get("party_id")),
                source_line_id=_clean_text(raw_line.get("source_line_id")),
                sort_order=int(raw_line.get("sort_order") or index),
                metadata=raw_line.get("metadata") if isinstance(raw_line.get("metadata"), dict) else {},
            )
        )

    return lines


def _serialize_line(line) -> dict[str, Any]:
    return {
        "id": line.id,
        "account": {
            "id": line.account_id,
            "code": line.account.code,
            "name": line.account.name,
        },
        "description": line.description,
        "debit_amount": str(line.debit_amount),
        "credit_amount": str(line.credit_amount),
        "tax_amount": str(line.tax_amount),
        "currency": line.currency,
        "cost_center": (
            {
                "id": line.cost_center_id,
                "code": line.cost_center.code,
                "name": line.cost_center.name,
            }
            if line.cost_center_id
            else None
        ),
        "tax_rate": (
            {
                "id": line.tax_rate_id,
                "code": line.tax_rate.code,
                "name": line.tax_rate.name,
                "rate": str(line.tax_rate.rate),
            }
            if line.tax_rate_id
            else None
        ),
        "party_type": line.party_type,
        "party_id": line.party_id,
        "source_line_id": line.source_line_id,
        "sort_order": line.sort_order,
    }


def _serialize_entry(entry) -> dict[str, Any]:
    return {
        "id": entry.id,
        "company_id": entry.company_id,
        "entry_number": entry.entry_number,
        "entry_date": entry.entry_date.isoformat() if entry.entry_date else None,
        "status": entry.status,
        "status_display": entry.get_status_display(),
        "posting_source": entry.posting_source,
        "posting_source_display": entry.get_posting_source_display(),
        "reference": entry.reference,
        "external_reference": entry.external_reference,
        "source_type": entry.source_type,
        "source_id": entry.source_id,
        "source_number": entry.source_number,
        "description": entry.description,
        "notes": entry.notes,
        "currency": entry.currency,
        "is_auto_posted": entry.is_auto_posted,
        "posted_at": entry.posted_at.isoformat() if entry.posted_at else None,
        "total_debit": str(entry.total_debit),
        "total_credit": str(entry.total_credit),
        "is_balanced": entry.is_balanced,
        "can_edit": entry.can_edit,
        "lines": [
            _serialize_line(line)
            for line in entry.lines.select_related("account", "cost_center", "tax_rate").order_by("sort_order", "id")
        ],
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
    }


# ============================================================
# API
# ============================================================

@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
@transaction.atomic
def accounting_journal_entry_create(request):
    """
    POST /api/company/accounting/journal-entries/create/

    Body example:
    {
      "entry_date": "2026-06-08",
      "description": "قيد يدوي",
      "reference": "REF-001",
      "currency": "SAR",
      "auto_post": false,
      "lines": [
        {"account_code": "110101", "debit_amount": "100.00", "credit_amount": "0.00"},
        {"account_code": "3201", "debit_amount": "0.00", "credit_amount": "100.00"}
      ]
    }
    """
    company = getattr(request, "company", None)

    if not company:
        return Response(
            {
                "success": False,
                "message": "لا توجد شركة حالية مرتبطة بالمستخدم.",
            },
            status=403,
        )

    data = request.data if isinstance(request.data, dict) else {}

    entry_date = _to_date(data.get("entry_date"))

    if data.get("entry_date") and not entry_date:
        return Response(
            {
                "success": False,
                "message": "تاريخ القيد غير صحيح. استخدم الصيغة YYYY-MM-DD.",
            },
            status=400,
        )

    try:
        lines = _build_line_payloads(company, data.get("lines"))
        entry = create_manual_journal_entry(
            company=company,
            lines=lines,
            entry_date=entry_date,
            entry_number=_clean_text(data.get("entry_number")),
            description=_clean_text(data.get("description")),
            notes=_clean_text(data.get("notes")),
            reference=_clean_text(data.get("reference")),
            external_reference=_clean_text(data.get("external_reference")),
            currency=_clean_text(data.get("currency")) or "SAR",
            actor=request.user,
            auto_post=_to_bool(data.get("auto_post")),
        )

        entry.refresh_from_db()

        return Response(
            {
                "success": True,
                "message": "تم إنشاء قيد اليومية بنجاح.",
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "company_code": getattr(company, "company_code", ""),
                },
                "entry": _serialize_entry(entry),
            },
            status=201,
        )

    except (AccountingPostingError, AccountingConfigurationError, ValueError) as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )
    except Exception as exc:
        return Response(
            {
                "success": False,
                "message": f"تعذر إنشاء قيد اليومية: {exc}",
            },
            status=400,
        )


accounting_journal_entry_create.required_company_permissions = [
    "company.accounting.journals.create",
]