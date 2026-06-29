# ============================================================
# 📂 api/company/purchases/bills/list.py
# 🧠 Mhamcloud | Company Purchase Bills List API V1.1
# ------------------------------------------------------------
# ✅ List purchase bills for current company only
# ✅ Tenant isolation through request.company
# ✅ Search, status, supplier, branch and date filters
# ✅ Sorting and pagination
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي نتيجة يجب أن تكون داخل نفس شركة العضوية الحالية
# - صلاحية العرض المطلوبة: company.purchases.bills.view
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.purchases.bills.serializers import serialize_purchase_bill
from api.permissions import HasAnyCompanyPermission
from purchases.models import PurchaseBill, PurchaseBillStatus


class PurchaseBillListAPIError(Exception):
    """
    Small API-level error for purchase bill list endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise PurchaseBillListAPIError("Current company context was not resolved.")

    return company


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


def _clean_text(value: Any) -> str:
    """
    Normalize query text.
    """
    return str(value or "").strip()


def _apply_purchase_bill_filters(queryset, request: Request):
    """
    Apply safe company-scoped filters to purchase bill queryset.
    """
    search = _clean_text(
        request.query_params.get("search")
        or request.query_params.get("q")
        or ""
    )
    status = _clean_text(request.query_params.get("status") or "").upper()
    supplier_id = _clean_text(request.query_params.get("supplier_id") or "")
    branch_id = _clean_text(request.query_params.get("branch_id") or "")
    date_from = _clean_text(request.query_params.get("date_from") or "")
    date_to = _clean_text(request.query_params.get("date_to") or "")
    due_from = _clean_text(request.query_params.get("due_from") or "")
    due_to = _clean_text(request.query_params.get("due_to") or "")

    if search:
        queryset = queryset.filter(
            Q(bill_number__icontains=search)
            | Q(supplier_bill_number__icontains=search)
            | Q(supplier__display_name__icontains=search)
            | Q(supplier__legal_name__icontains=search)
            | Q(supplier__code__icontains=search)
            | Q(supplier__phone__icontains=search)
            | Q(supplier__mobile__icontains=search)
            | Q(supplier__email__icontains=search)
            | Q(supplier__vat_number__icontains=search)
            | Q(branch__name__icontains=search)
            | Q(branch__branch_code__icontains=search)
            | Q(notes__icontains=search)
        )

    if status:
        queryset = queryset.filter(status=status)

    if supplier_id:
        queryset = queryset.filter(supplier_id=supplier_id)

    if branch_id:
        queryset = queryset.filter(branch_id=branch_id)

    if date_from:
        queryset = queryset.filter(bill_date__gte=date_from)

    if date_to:
        queryset = queryset.filter(bill_date__lte=date_to)

    if due_from:
        queryset = queryset.filter(due_date__gte=due_from)

    if due_to:
        queryset = queryset.filter(due_date__lte=due_to)

    return queryset


def _apply_purchase_bill_ordering(queryset, ordering: str):
    """
    Apply safe ordering without allowing arbitrary model fields.
    """
    allowed_ordering = {
        "bill_date": "bill_date",
        "-bill_date": "-bill_date",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "due_date": "due_date",
        "-due_date": "-due_date",
        "total_amount": "total_amount",
        "-total_amount": "-total_amount",
        "bill_number": "bill_number",
        "-bill_number": "-bill_number",
        "status": "status",
        "-status": "-status",
    }

    selected_ordering = allowed_ordering.get(ordering, "-bill_date")

    if selected_ordering == "-bill_date":
        return queryset.order_by("-bill_date", "-id")

    return queryset.order_by(selected_ordering, "-id")


def serialize_purchase_bill_choices() -> dict[str, Any]:
    """
    Return choices payload for frontend filters/forms.
    """
    return {
        "statuses": [
            {"value": value, "label": label}
            for value, label in PurchaseBillStatus.choices
        ],
        "ordering": [
            {"value": "-bill_date", "label": "Newest bill date"},
            {"value": "bill_date", "label": "Oldest bill date"},
            {"value": "-created_at", "label": "Newest created"},
            {"value": "created_at", "label": "Oldest created"},
            {"value": "-due_date", "label": "Latest due date"},
            {"value": "due_date", "label": "Earliest due date"},
            {"value": "-total_amount", "label": "Highest total"},
            {"value": "total_amount", "label": "Lowest total"},
            {"value": "bill_number", "label": "Bill number A-Z"},
            {"value": "-bill_number", "label": "Bill number Z-A"},
        ],
    }


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def purchase_bills_list(request: Request) -> Response:
    """
    List purchase bills for the current company only.
    """
    try:
        company = _get_request_company(request)

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
            or "-bill_date"
        )

        queryset = (
            PurchaseBill.objects.select_related(
                "company",
                "branch",
                "supplier",
                "created_by",
                "updated_by",
                "posted_by",
                "cancelled_by",
            )
            .filter(company=company)
        )

        queryset = _apply_purchase_bill_filters(queryset, request)
        queryset = _apply_purchase_bill_ordering(queryset, ordering)

        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        bills = [
            serialize_purchase_bill(bill, include_items=False)
            for bill in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Purchase bills loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": company.display_name,
                },
                "filters": {
                    "search": request.query_params.get("search")
                    or request.query_params.get("q")
                    or "",
                    "status": request.query_params.get("status") or "",
                    "supplier_id": request.query_params.get("supplier_id") or "",
                    "branch_id": request.query_params.get("branch_id") or "",
                    "date_from": request.query_params.get("date_from") or "",
                    "date_to": request.query_params.get("date_to") or "",
                    "due_from": request.query_params.get("due_from") or "",
                    "due_to": request.query_params.get("due_to") or "",
                    "ordering": ordering,
                },
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": bills,
                "results": bills,
                "choices": serialize_purchase_bill_choices(),
            },
            status=200,
        )

    except PurchaseBillListAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {
                    "detail": str(exc),
                },
            },
            status=400,
        )


purchase_bills_list.required_company_permissions = [
    "company.purchases.bills.view",
]