# ============================================================
# 📂 api/company/accounting/cost_centers/list.py
# 🧠 Mhamcloud | Company Accounting Cost Centers List/Create API
# ------------------------------------------------------------
# ✅ Real API only
# ✅ Tenant scoped by backend session/company membership
# ✅ GET list + POST create
# ============================================================
from __future__ import annotations
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from accounting.models import CostCenter, CostCenterStatus
from .common import (
    cost_center_summary,
    json_error,
    read_json_payload,
    resolve_company,
    save_cost_center_from_payload,
    serialize_cost_center,
    validation_errors,
)
@require_http_methods(["GET", "POST"])
def accounting_cost_centers_list(request):
    """
    GET  /api/company/accounting/cost-centers/
    POST /api/company/accounting/cost-centers/
    """
    company = resolve_company(request)
    if company is None:
        return json_error("لا توجد شركة نشطة للمستخدم الحالي.", status=401)
    if request.method == "POST":
        try:
            payload = read_json_payload(request)
            cost_center = save_cost_center_from_payload(company=company, payload=payload)
        except ValidationError as error:
            return json_error(
                "تعذر إنشاء مركز التكلفة.",
                status=400,
                field_errors=validation_errors(error),
            )
        return JsonResponse(
            {
                "ok": True,
                "success": True,
                "message": "تم إنشاء مركز التكلفة بنجاح.",
                "cost_center": serialize_cost_center(cost_center),
                "summary": cost_center_summary(company),
            },
            status=201,
        )
    base_queryset = CostCenter.objects.filter(company=company).select_related("parent")
    queryset = base_queryset
    status = (request.GET.get("status") or "all").strip().lower()
    postable = (request.GET.get("postable") or "").strip().lower()
    search = (request.GET.get("search") or request.GET.get("q") or "").strip()
    if status in {"active", "نشط"}:
        queryset = queryset.filter(status=CostCenterStatus.ACTIVE)
    elif status in {"inactive", "غير_نشط", "غير نشط"}:
        queryset = queryset.exclude(status=CostCenterStatus.ACTIVE)
    if postable in {"1", "true", "yes", "postable"}:
        queryset = queryset.filter(status=CostCenterStatus.ACTIVE, is_group=False)
    if search:
        queryset = queryset.filter(
            Q(code__icontains=search)
            | Q(name__icontains=search)
            | Q(name_en__icontains=search)
            | Q(description__icontains=search)
        )
    queryset = queryset.order_by("code", "id")
    results = [serialize_cost_center(cost_center) for cost_center in queryset[:500]]
    return JsonResponse(
        {
            "ok": True,
            "success": True,
            "message": "Cost centers loaded successfully.",
            "company": {
                "id": company.id,
                "name": getattr(company, "name", ""),
            },
            "count": len(results),
            "results": results,
            "items": results,
            "cost_centers": results,
            "summary": cost_center_summary(company),
        }
    )
accounting_cost_centers_list.required_company_permissions = [
    "company.accounting.journal_entries.view",
]
