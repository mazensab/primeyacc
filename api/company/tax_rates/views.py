# -*- coding: utf-8 -*-
"""
📂 api/company/tax_rates/views.py
Company Tax Rates API — Phase 1B minimal
✅ Tenant isolation via accounts.CompanyMembership
✅ Real API only
✅ VAT / Excise-ready TaxRate catalog
"""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from rest_framework import status as drf_status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounting.models import TaxCalculationBase, TaxDirection, TaxRate, TaxType
from accounting.services import ensure_company_tax_rate_catalog
from accounts.models import CompanyMembership


def _model_fields(model) -> set[str]:
    return {field.name for field in model._meta.get_fields()}


def _get_current_company(request):
    company = getattr(request, "company", None)
    if company is not None:
        return company

    if not request.user or not request.user.is_authenticated:
        return None

    fields = _model_fields(CompanyMembership)
    queryset = CompanyMembership.objects.filter(user=request.user).select_related("company")

    if "status" in fields:
        queryset = queryset.filter(status="ACTIVE")
    elif "is_active" in fields:
        queryset = queryset.filter(is_active=True)

    session_company_id = (
        request.session.get("company_id")
        or request.session.get("current_company_id")
        or request.session.get("active_company_id")
    )

    if session_company_id:
        selected = queryset.filter(company_id=session_company_id).first()
        if selected:
            return selected.company

    if "is_primary" in fields:
        primary = queryset.filter(is_primary=True).first()
        if primary:
            return primary.company

    membership = queryset.first()
    return membership.company if membership else None


def _company_required(request):
    company = _get_current_company(request)
    if company is None:
        return None, Response(
            {
                "success": False,
                "message": "Company context is required.",
                "errors": {"company": "تعذر تحديد الشركة الحالية."},
            },
            status=drf_status.HTTP_403_FORBIDDEN,
        )
    return company, None


def _text(value: Any) -> str:
    return str(value or "").strip()


def _bool(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "on", "active", "enabled"}:
        return True
    if text in {"0", "false", "no", "off", "inactive", "disabled"}:
        return False
    return default



def _decimal(value: Any, default: Decimal = Decimal("0.0000")) -> Decimal:
    if value is None or str(value).strip() == "":
        return default
    try:
        return Decimal(str(value)).quantize(Decimal("0.0001"))
    except (InvalidOperation, ValueError):
        raise ValidationError({"rate": "Tax rate is invalid."})
def _errors(exc: Exception) -> dict[str, Any]:
    if isinstance(exc, ValidationError):
        if hasattr(exc, "message_dict"):
            return exc.message_dict
        if hasattr(exc, "messages"):
            return {"non_field_errors": exc.messages}
    return {"non_field_errors": [str(exc)]}
def _apply_payload(tax_rate: TaxRate, payload: dict[str, Any], *, creating: bool) -> TaxRate:
    valid_tax_types = {value for value, _label in TaxType.choices}
    valid_directions = {value for value, _label in TaxDirection.choices}
    valid_bases = {value for value, _label in TaxCalculationBase.choices}
    if creating:
        tax_rate.code = _text(payload.get("code")).upper()
    if creating or "name" in payload:
        tax_rate.name = _text(payload.get("name"))
    if "name_en" in payload:
        tax_rate.name_en = _text(payload.get("name_en"))
    if creating or "tax_type" in payload:
        tax_type = _text(payload.get("tax_type") or TaxType.VAT).upper()
        if tax_type not in valid_tax_types:
            raise ValidationError({"tax_type": "Invalid tax type."})
        tax_rate.tax_type = tax_type
    if creating or "direction" in payload:
        direction = _text(payload.get("direction") or TaxDirection.OUTPUT).upper()
        if direction not in valid_directions:
            raise ValidationError({"direction": "Invalid tax direction."})
        tax_rate.direction = direction
    if creating or "rate" in payload:
        current_rate = tax_rate.rate if tax_rate.pk else Decimal("0.0000")
        tax_rate.rate = _decimal(payload.get("rate"), current_rate)
    if "calculation_base" in payload:
        base = _text(payload.get("calculation_base") or TaxCalculationBase.NET).upper()
        if base not in valid_bases:
            raise ValidationError({"calculation_base": "Invalid calculation base."})
        tax_rate.calculation_base = base
    for field in (
        "zatca_category_code",
        "zatca_exemption_reason_code",
        "zatca_exemption_reason",
        "description",
    ):
        if field in payload:
            setattr(tax_rate, field, _text(payload.get(field)))
    if "is_active" in payload:
        tax_rate.is_active = _bool(payload.get("is_active"), tax_rate.is_active)
    if "is_default" in payload:
        tax_rate.is_default = _bool(payload.get("is_default"), tax_rate.is_default)
    if "is_system" in payload:
        tax_rate.is_system = _bool(payload.get("is_system"), getattr(tax_rate, "is_system", False))
    tax_rate.full_clean()
    return tax_rate

def _choices_payload() -> dict[str, Any]:
    return {
        "tax_types": [{"value": value, "label": label} for value, label in TaxType.choices],
        "directions": [{"value": value, "label": label} for value, label in TaxDirection.choices],
        "calculation_bases": [
            {"value": value, "label": label}
            for value, label in TaxCalculationBase.choices
        ],
        "zatca_vat_categories": [
            {"value": "S", "label": "Standard VAT"},
            {"value": "Z", "label": "Zero rated VAT"},
            {"value": "E", "label": "VAT exempt"},
            {"value": "O", "label": "Out of scope"},
        ],
    }


def _serialize(tax_rate: TaxRate) -> dict[str, Any]:
    return {
        "id": tax_rate.id,
        "code": tax_rate.code,
        "name": tax_rate.name,
        "name_en": getattr(tax_rate, "name_en", ""),
        "tax_type": tax_rate.tax_type,
        "tax_type_display": tax_rate.get_tax_type_display(),
        "direction": tax_rate.direction,
        "direction_display": tax_rate.get_direction_display(),
        "rate": str(tax_rate.rate),
        "calculation_base": getattr(tax_rate, "calculation_base", "NET"),
        "calculation_base_display": (
            tax_rate.get_calculation_base_display()
            if hasattr(tax_rate, "get_calculation_base_display")
            else "NET"
        ),
        "zatca_category_code": getattr(tax_rate, "zatca_category_code", ""),
        "zatca_exemption_reason_code": getattr(tax_rate, "zatca_exemption_reason_code", ""),
        "zatca_exemption_reason": getattr(tax_rate, "zatca_exemption_reason", ""),
        "sales_account_id": tax_rate.sales_account_id,
        "purchase_account_id": tax_rate.purchase_account_id,
        "is_active": tax_rate.is_active,
        "is_default": tax_rate.is_default,
        "is_system": getattr(tax_rate, "is_system", False),
        "valid_from": tax_rate.valid_from.isoformat() if tax_rate.valid_from else None,
        "valid_to": tax_rate.valid_to.isoformat() if getattr(tax_rate, "valid_to", None) else None,
        "description": tax_rate.description,
        "metadata": getattr(tax_rate, "metadata", {}) or {},
        "created_at": tax_rate.created_at.isoformat() if tax_rate.created_at else None,
        "updated_at": tax_rate.updated_at.isoformat() if tax_rate.updated_at else None,
    }


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def company_tax_rates(request):
    company, error = _company_required(request)
    if error:
        return error
    if request.method == "POST":
        payload = request.data if isinstance(request.data, dict) else {}
        try:
            with transaction.atomic():
                tax_rate = _apply_payload(TaxRate(company=company), payload, creating=True)
                tax_rate.save()
        except Exception as exc:
            return Response(
                {
                    "success": False,
                    "message": "Tax rate could not be created.",
                    "errors": _errors(exc),
                },
                status=drf_status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "success": True,
                "message": "Tax rate created successfully.",
                "tax_rate": _serialize(tax_rate),
            },
            status=drf_status.HTTP_201_CREATED,
        )

    queryset = TaxRate.objects.filter(company=company).order_by("tax_type", "code", "id")

    search = _text(request.query_params.get("search"))
    tax_type = _text(request.query_params.get("tax_type")).upper()
    is_active = request.query_params.get("is_active")

    if search:
        queryset = queryset.filter(
            Q(code__icontains=search)
            | Q(name__icontains=search)
            | Q(name_en__icontains=search)
            | Q(description__icontains=search)
        )

    if tax_type:
        queryset = queryset.filter(tax_type=tax_type)

    if is_active is not None and str(is_active).strip() != "":
        queryset = queryset.filter(is_active=_bool(is_active))

    records = list(queryset)

    return Response(
        {
            "success": True,
            "message": "Tax rates loaded successfully.",
            "results": [_serialize(item) for item in records],
            "count": len(records),
            "summary": {
                "total": len(records),
                "active": sum(1 for item in records if item.is_active),
                "vat": sum(1 for item in records if item.tax_type == TaxType.VAT),
                "excise": sum(1 for item in records if item.tax_type == "EXCISE"),
                "defaults": sum(1 for item in records if item.is_default),
            },
            "choices": _choices_payload(),
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def company_tax_rates_seed(request):
    company, error = _company_required(request)
    if error:
        return error

    try:
        with transaction.atomic():
            records = ensure_company_tax_rate_catalog(company, user=request.user)
    except Exception as exc:
        return Response(
            {
                "success": False,
                "message": "Tax catalog could not be seeded.",
                "errors": {"non_field_errors": [str(exc)]},
            },
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "success": True,
            "message": "Tax catalog seeded successfully.",
            "results": [_serialize(item) for item in records],
            "count": len(records),
            "choices": _choices_payload(),
        }
    )
@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def company_tax_rate_detail(request, tax_rate_id: int):
    company, error = _company_required(request)
    if error:
        return error
    tax_rate = TaxRate.objects.filter(company=company, pk=tax_rate_id).first()
    if tax_rate is None:
        return Response(
            {
                "success": False,
                "message": "Tax rate was not found.",
                "errors": {"tax_rate": "Tax rate was not found."},
            },
            status=drf_status.HTTP_404_NOT_FOUND,
        )
    if request.method == "GET":
        return Response(
            {
                "success": True,
                "message": "Tax rate loaded successfully.",
                "tax_rate": _serialize(tax_rate),
                "choices": _choices_payload(),
            }
        )
    payload = request.data if isinstance(request.data, dict) else {}
    try:
        with transaction.atomic():
            tax_rate = _apply_payload(tax_rate, payload, creating=False)
            tax_rate.save()
    except Exception as exc:
        return Response(
            {
                "success": False,
                "message": "Tax rate could not be updated.",
                "errors": _errors(exc),
            },
            status=drf_status.HTTP_400_BAD_REQUEST,
        )
    return Response(
        {
            "success": True,
            "message": "Tax rate updated successfully.",
            "tax_rate": _serialize(tax_rate),
        }
    )
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def company_tax_rate_activate(request, tax_rate_id: int):
    return _set_tax_rate_active(request, tax_rate_id, True)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def company_tax_rate_deactivate(request, tax_rate_id: int):
    return _set_tax_rate_active(request, tax_rate_id, False)
def _set_tax_rate_active(request, tax_rate_id: int, active: bool):
    company, error = _company_required(request)
    if error:
        return error
    tax_rate = TaxRate.objects.filter(company=company, pk=tax_rate_id).first()
    if tax_rate is None:
        return Response(
            {
                "success": False,
                "message": "Tax rate was not found.",
                "errors": {"tax_rate": "Tax rate was not found."},
            },
            status=drf_status.HTTP_404_NOT_FOUND,
        )
    if not active and tax_rate.is_default:
        return Response(
            {
                "success": False,
                "message": "Default tax rate cannot be deactivated.",
                "errors": {"is_default": "Default tax rate cannot be deactivated."},
            },
            status=drf_status.HTTP_400_BAD_REQUEST,
        )
    tax_rate.is_active = active
    tax_rate.full_clean()
    tax_rate.save(update_fields=["is_active", "updated_at"])
    return Response(
        {
            "success": True,
            "message": "Tax rate activated successfully." if active else "Tax rate deactivated successfully.",
            "tax_rate": _serialize(tax_rate),
        }
    )
