# ============================================================
# 📂 api/company/payments/gateways/list.py
# 🧠 Mhamcloud | Company Payment Gateways List/Create API V1.0
# ------------------------------------------------------------
# ✅ List payment gateways for current company only
# ✅ Create payment gateways for current company only
# ✅ Tenant isolation through request.company
# ✅ Search, type, environment, active and default filters
# ✅ Safe pagination and ordering
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - إعدادات البوابة الحساسة لا تعرض بشكل مكشوف
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
from payments.models import CompanyPaymentGateway
from payments.services import (
    create_payment_gateway,
    serialize_payment_gateway,
)


class PaymentGatewayListAPIError(Exception):
    """
    Small API-level error for payment gateway list/create endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise PaymentGatewayListAPIError("Current company context was not resolved.")

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


def serialize_payment_gateway_choices() -> dict[str, Any]:
    """
    Return choices payload for frontend filters/forms.
    """
    return {
        "gateway_types": [
            {"value": value, "label": label}
            for value, label in CompanyPaymentGateway.GatewayType.choices
        ],
        "environments": [
            {"value": value, "label": label}
            for value, label in CompanyPaymentGateway.Environment.choices
        ],
        "ordering": [
            {"value": "name", "label": "Name A-Z"},
            {"value": "-name", "label": "Name Z-A"},
            {"value": "code", "label": "Code A-Z"},
            {"value": "-code", "label": "Code Z-A"},
            {"value": "gateway_type", "label": "Type A-Z"},
            {"value": "-gateway_type", "label": "Type Z-A"},
            {"value": "environment", "label": "Environment A-Z"},
            {"value": "-environment", "label": "Environment Z-A"},
            {"value": "-created_at", "label": "Newest created"},
            {"value": "created_at", "label": "Oldest created"},
        ],
    }


def get_payment_gateways_queryset(company):
    """
    Return company-scoped payment gateways queryset.
    """
    return CompanyPaymentGateway.objects.filter(company=company)


def _apply_gateway_filters(queryset, request: Request):
    """
    Apply safe company-scoped filters to payment gateways queryset.
    """
    search = _clean_text(
        request.query_params.get("search")
        or request.query_params.get("q")
        or ""
    )
    gateway_type = _clean_upper(
        request.query_params.get("gateway_type")
        or request.query_params.get("type")
        or ""
    )
    environment = _clean_upper(request.query_params.get("environment") or "")
    is_active = _to_bool(request.query_params.get("is_active"))
    is_default = _to_bool(request.query_params.get("is_default"))

    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(code__icontains=search)
            | Q(gateway_type__icontains=search)
            | Q(merchant_id__icontains=search)
            | Q(notes__icontains=search)
        )

    if gateway_type:
        queryset = queryset.filter(gateway_type=gateway_type)

    if environment:
        queryset = queryset.filter(environment=environment)

    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    if is_default is not None:
        queryset = queryset.filter(is_default=is_default)

    return queryset


def _apply_gateway_ordering(queryset, ordering: str):
    """
    Apply safe ordering without allowing arbitrary model fields.
    """
    allowed_ordering = {
        "name": "name",
        "-name": "-name",
        "code": "code",
        "-code": "-code",
        "gateway_type": "gateway_type",
        "-gateway_type": "-gateway_type",
        "environment": "environment",
        "-environment": "-environment",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "updated_at": "updated_at",
        "-updated_at": "-updated_at",
    }

    selected_ordering = allowed_ordering.get(ordering, "name")

    if selected_ordering == "name":
        return queryset.order_by("-is_default", "name", "id")

    return queryset.order_by(selected_ordering, "-id")


def _build_gateway_summary(queryset) -> dict[str, Any]:
    """
    Build quick summary for the filtered gateway queryset.
    """
    return {
        "total_gateways": queryset.count(),
        "active_gateways": queryset.filter(is_active=True).count(),
        "inactive_gateways": queryset.filter(is_active=False).count(),
        "default_gateways": queryset.filter(is_default=True).count(),
        "sandbox_gateways": queryset.filter(
            environment=CompanyPaymentGateway.Environment.SANDBOX
        ).count(),
        "live_gateways": queryset.filter(
            environment=CompanyPaymentGateway.Environment.LIVE
        ).count(),
    }


def _create_gateway_from_request(request: Request, company):
    """
    Create payment gateway from request payload using payments service layer.
    """
    data = request.data or {}

    return create_payment_gateway(
        company=company,
        payload={
            "name": data.get("name") or "",
            "code": data.get("code") or "",
            "gateway_type": (
                data.get("gateway_type")
                or data.get("type")
                or CompanyPaymentGateway.GatewayType.CUSTOM
            ),
            "environment": data.get("environment")
            or CompanyPaymentGateway.Environment.SANDBOX,
            "settings": data.get("settings") or {},
            "public_key": data.get("public_key") or "",
            "merchant_id": data.get("merchant_id") or "",
            "settlement_account_code": data.get("settlement_account_code") or "",
            "fee_account_code": data.get("fee_account_code") or "",
            "supports_refunds": bool(_to_bool(data.get("supports_refunds"))),
            "supports_partial_refunds": bool(_to_bool(data.get("supports_partial_refunds"))),
            "supports_webhooks": bool(_to_bool(data.get("supports_webhooks"))),
            "is_active": True if _to_bool(data.get("is_active")) is None else bool(_to_bool(data.get("is_active"))),
            "is_default": bool(_to_bool(data.get("is_default"))),
            "notes": data.get("notes") or "",
        },
    )


@api_view(["GET", "POST"])
@permission_classes([HasAnyCompanyPermission])
def payment_gateways_list(request: Request) -> Response:
    """
    GET /api/company/payments/gateways/
    POST /api/company/payments/gateways/
    """
    try:
        company = _get_request_company(request)

        if request.method == "POST":
            gateway = _create_gateway_from_request(request, company)

            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Payment gateway created successfully.",
                    "company": {
                        "id": company.id,
                        "name": getattr(company, "display_name", None)
                        or getattr(company, "name", ""),
                    },
                    "item": serialize_payment_gateway(gateway, include_settings=True),
                    "result": serialize_payment_gateway(gateway, include_settings=True),
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
            or "name"
        )

        queryset = get_payment_gateways_queryset(company).select_related("company")

        queryset = _apply_gateway_filters(queryset, request)
        queryset = _apply_gateway_ordering(queryset, ordering)

        summary = _build_gateway_summary(queryset)

        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        gateways = [
            serialize_payment_gateway(gateway, include_settings=False)
            for gateway in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment gateways loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "filters": {
                    "search": request.query_params.get("search")
                    or request.query_params.get("q")
                    or "",
                    "gateway_type": request.query_params.get("gateway_type")
                    or request.query_params.get("type")
                    or "",
                    "environment": request.query_params.get("environment") or "",
                    "is_active": request.query_params.get("is_active") or "",
                    "is_default": request.query_params.get("is_default") or "",
                    "ordering": ordering,
                },
                "summary": summary,
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": gateways,
                "results": gateways,
                "choices": serialize_payment_gateway_choices(),
            },
            status=200,
        )

    except PaymentGatewayListAPIError as exc:
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
                "message": "Payment gateway validation failed.",
                "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages},
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Payment gateway already exists.",
                "errors": {
                    "detail": "Payment gateway code already exists for this company.",
                },
            },
            status=400,
        )


payment_gateways_list.required_company_permissions = [
    "company.payments.gateways.view",
    "company.payments.gateways.create",
]