# ============================================================
# 📂 api/company/payments/methods/list.py
# 🧠 PrimeyAcc | Company Payment Methods List/Create API V1.0
# ------------------------------------------------------------
# ✅ List payment methods for current company only
# ✅ Create payment methods for current company only
# ✅ Tenant isolation through request.company
# ✅ Search, type, active, default, POS and checkout filters
# ✅ Safe pagination and ordering
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي gateway مستخدم يجب أن يكون داخل نفس الشركة
# - منطق الإنشاء والتحديث يبقى داخل payments/services.py
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db import IntegrityError
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from payments.models import CompanyPaymentGateway, CompanyPaymentMethod
from payments.services import (
    create_payment_method,
    serialize_payment_method,
)


class PaymentMethodListAPIError(Exception):
    """
    Small API-level error for payment method list/create endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise PaymentMethodListAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize query/body text.
    """
    return str(value or "").strip()


def _clean_upper(value: Any) -> str:
    """
    Normalize enum-like text.
    """
    return _clean_text(value).upper()


def _clean_positive_int(value: Any, default: int, maximum: int | None = None) -> int:
    """
    Safely parse positive integer query params.
    """
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default

    if number < 1:
        number = default

    if maximum is not None:
        number = min(number, maximum)

    return number


def _to_bool(value: Any) -> bool | None:
    """
    Parse optional boolean query/body values.
    """
    if value in [None, ""]:
        return None

    text = str(value).strip().lower()

    if text in {"1", "true", "yes", "y", "on"}:
        return True

    if text in {"0", "false", "no", "n", "off"}:
        return False

    return None


def _get_gateway_for_company(company, gateway_id: Any):
    """
    Resolve gateway safely for current company only.
    """
    if gateway_id in [None, ""]:
        return None

    try:
        gateway_id = int(gateway_id)
    except (TypeError, ValueError):
        raise ValidationError({"gateway_id": "Invalid gateway id."})

    gateway = CompanyPaymentGateway.objects.filter(
        company=company,
        id=gateway_id,
    ).first()

    if not gateway:
        raise ValidationError({"gateway_id": "Payment gateway was not found."})

    return gateway


def get_payment_methods_queryset(company):
    """
    Return company-scoped payment methods queryset.
    """
    return CompanyPaymentMethod.objects.filter(company=company)


def serialize_payment_method_choices() -> dict[str, Any]:
    """
    Return choices payload for frontend filters/forms.
    """
    return {
        "method_types": [
            {"value": value, "label": label}
            for value, label in CompanyPaymentMethod.MethodType.choices
        ],
        "settlement_behaviors": [
            {"value": value, "label": label}
            for value, label in CompanyPaymentMethod.SettlementBehavior.choices
        ],
        "ordering": [
            {"value": "sort_order", "label": "Sort order"},
            {"value": "name", "label": "Name A-Z"},
            {"value": "-name", "label": "Name Z-A"},
            {"value": "code", "label": "Code A-Z"},
            {"value": "-code", "label": "Code Z-A"},
            {"value": "method_type", "label": "Type A-Z"},
            {"value": "-method_type", "label": "Type Z-A"},
            {"value": "-created_at", "label": "Newest created"},
            {"value": "created_at", "label": "Oldest created"},
        ],
    }


def _apply_method_filters(queryset, request: Request):
    """
    Apply safe company-scoped filters to payment methods queryset.
    """
    search = _clean_text(
        request.query_params.get("search")
        or request.query_params.get("q")
        or ""
    )
    method_type = _clean_upper(
        request.query_params.get("method_type")
        or request.query_params.get("type")
        or ""
    )
    settlement_behavior = _clean_upper(
        request.query_params.get("settlement_behavior")
        or ""
    )
    is_active = _to_bool(request.query_params.get("is_active"))
    is_default = _to_bool(request.query_params.get("is_default"))
    allow_pos = _to_bool(request.query_params.get("allow_pos"))
    allow_customer_checkout = _to_bool(
        request.query_params.get("allow_customer_checkout")
    )
    gateway_id = request.query_params.get("gateway_id") or ""

    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(code__icontains=search)
            | Q(method_type__icontains=search)
            | Q(notes__icontains=search)
            | Q(gateway__name__icontains=search)
        )

    if method_type:
        queryset = queryset.filter(method_type=method_type)

    if settlement_behavior:
        queryset = queryset.filter(settlement_behavior=settlement_behavior)

    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    if is_default is not None:
        queryset = queryset.filter(is_default=is_default)

    if allow_pos is not None:
        queryset = queryset.filter(allow_pos=allow_pos)

    if allow_customer_checkout is not None:
        queryset = queryset.filter(allow_customer_checkout=allow_customer_checkout)

    if gateway_id:
        queryset = queryset.filter(gateway_id=gateway_id)

    return queryset


def _apply_method_ordering(queryset, ordering: str):
    """
    Apply safe ordering without allowing arbitrary model fields.
    """
    allowed_ordering = {
        "sort_order": "sort_order",
        "-sort_order": "-sort_order",
        "name": "name",
        "-name": "-name",
        "code": "code",
        "-code": "-code",
        "method_type": "method_type",
        "-method_type": "-method_type",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "updated_at": "updated_at",
        "-updated_at": "-updated_at",
    }

    selected_ordering = allowed_ordering.get(ordering, "sort_order")

    if selected_ordering == "sort_order":
        return queryset.order_by("-is_default", "sort_order", "name", "id")

    return queryset.order_by(selected_ordering, "-id")


def _build_method_summary(queryset) -> dict[str, Any]:
    """
    Build quick summary for the filtered payment methods queryset.
    """
    return {
        "total_methods": queryset.count(),
        "active_methods": queryset.filter(is_active=True).count(),
        "inactive_methods": queryset.filter(is_active=False).count(),
        "default_methods": queryset.filter(is_default=True).count(),
        "cash_methods": queryset.filter(
            method_type=CompanyPaymentMethod.MethodType.CASH
        ).count(),
        "bank_transfer_methods": queryset.filter(
            method_type=CompanyPaymentMethod.MethodType.BANK_TRANSFER
        ).count(),
        "pos_methods": queryset.filter(
            method_type=CompanyPaymentMethod.MethodType.POS_TERMINAL
        ).count(),
        "online_methods": queryset.filter(is_online=True).count(),
        "customer_checkout_methods": queryset.filter(
            allow_customer_checkout=True
        ).count(),
    }


def _create_method_from_request(request: Request, company):
    """
    Create payment method from request payload using payments service layer.
    """
    data = request.data or {}
    gateway = _get_gateway_for_company(company, data.get("gateway_id") or data.get("gateway"))

    parsed_is_active = _to_bool(data.get("is_active"))

    return create_payment_method(
        company=company,
        payload={
            "gateway": gateway,
            "name": data.get("name") or "",
            "code": data.get("code") or "",
            "method_type": (
                data.get("method_type")
                or data.get("type")
                or CompanyPaymentMethod.MethodType.CASH
            ),
            "settlement_behavior": (
                data.get("settlement_behavior")
                or CompanyPaymentMethod.SettlementBehavior.IMMEDIATE
            ),
            "cashbox_account_code": data.get("cashbox_account_code") or "",
            "bank_account_code": data.get("bank_account_code") or "",
            "settlement_account_code": data.get("settlement_account_code") or "",
            "fee_account_code": data.get("fee_account_code") or "",
            "fee_percentage": data.get("fee_percentage") or 0,
            "fixed_fee": data.get("fixed_fee") or 0,
            "requires_reference": bool(_to_bool(data.get("requires_reference"))),
            "requires_manual_confirmation": bool(
                _to_bool(data.get("requires_manual_confirmation"))
            ),
            "allow_customer_checkout": bool(
                _to_bool(data.get("allow_customer_checkout"))
            ),
            "allow_pos": True
            if _to_bool(data.get("allow_pos")) is None
            else bool(_to_bool(data.get("allow_pos"))),
            "is_active": True if parsed_is_active is None else bool(parsed_is_active),
            "is_default": bool(_to_bool(data.get("is_default"))),
            "sort_order": data.get("sort_order") or 100,
            "notes": data.get("notes") or "",
        },
    )


@api_view(["GET", "POST"])
@permission_classes([HasAnyCompanyPermission])
def payment_methods_list(request: Request) -> Response:
    """
    GET /api/company/payments/methods/
    POST /api/company/payments/methods/
    """
    try:
        company = _get_request_company(request)

        if request.method == "POST":
            method = _create_method_from_request(request, company)

            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Payment method created successfully.",
                    "company": {
                        "id": company.id,
                        "name": getattr(company, "display_name", None)
                        or getattr(company, "name", ""),
                    },
                    "item": serialize_payment_method(method),
                    "result": serialize_payment_method(method),
                },
                status=201,
            )

        page = _clean_positive_int(
            request.query_params.get("page"),
            default=1,
        )
        page_size = _clean_positive_int(
            request.query_params.get("page_size")
            or request.query_params.get("per_page"),
            default=25,
            maximum=100,
        )
        ordering = _clean_text(
            request.query_params.get("ordering")
            or request.query_params.get("order_by")
            or "sort_order"
        )

        queryset = get_payment_methods_queryset(company).select_related(
            "company",
            "gateway",
        )

        queryset = _apply_method_filters(queryset, request)
        queryset = _apply_method_ordering(queryset, ordering)

        summary = _build_method_summary(queryset)

        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        methods = [
            serialize_payment_method(method)
            for method in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment methods loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "filters": {
                    "search": request.query_params.get("search")
                    or request.query_params.get("q")
                    or "",
                    "method_type": request.query_params.get("method_type")
                    or request.query_params.get("type")
                    or "",
                    "settlement_behavior": request.query_params.get("settlement_behavior")
                    or "",
                    "is_active": request.query_params.get("is_active") or "",
                    "is_default": request.query_params.get("is_default") or "",
                    "allow_pos": request.query_params.get("allow_pos") or "",
                    "allow_customer_checkout": request.query_params.get(
                        "allow_customer_checkout"
                    )
                    or "",
                    "gateway_id": request.query_params.get("gateway_id") or "",
                    "ordering": ordering,
                },
                "summary": summary,
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": methods,
                "results": methods,
                "choices": serialize_payment_method_choices(),
            },
            status=200,
        )

    except PaymentMethodListAPIError as exc:
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
                "message": "Payment method validation failed.",
                "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages},
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Payment method already exists.",
                "errors": {
                    "detail": "Payment method code already exists for this company.",
                },
            },
            status=400,
        )


payment_methods_list.required_company_permissions = [
    "company.payments.methods.view",
    "company.payments.methods.create",
]