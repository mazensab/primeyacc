# ============================================================
# 📂 api/company/accounting/cost_centers/detail.py
# 🧠 Mhamcloud | Company Accounting Cost Center Detail/Update API
# ------------------------------------------------------------
# ✅ Real API only
# ✅ Tenant scoped by backend session/company membership
# ✅ GET detail + PATCH update
# ============================================================
from __future__ import annotations
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from accounting.models import CostCenter
from .common import (
    cost_center_summary,
    json_error,
    read_json_payload,
    resolve_company,
    save_cost_center_from_payload,
    serialize_cost_center,
    validation_errors,
)
@require_http_methods(["GET", "PATCH"])
def accounting_cost_center_detail(request, cost_center_id: int):
    """
    GET   /api/company/accounting/cost-centers/<id>/
    PATCH /api/company/accounting/cost-centers/<id>/
    """
    company = resolve_company(request)
    if company is None:
        return json_error("لا توجد شركة نشطة للمستخدم الحالي.", status=401)
    cost_center = (
        CostCenter.objects.select_related("parent")
        .filter(company=company, pk=cost_center_id)
        .first()
    )
    if not cost_center:
        return json_error("مركز التكلفة غير موجود.", status=404)
    if request.method == "GET":
        return JsonResponse(
            {
                "ok": True,
                "success": True,
                "message": "Cost center loaded successfully.",
                "cost_center": serialize_cost_center(cost_center),
            }
        )
    try:
        payload = read_json_payload(request)
        cost_center = save_cost_center_from_payload(
            company=company,
            payload=payload,
            cost_center=cost_center,
            partial=True,
        )
    except ValidationError as error:
        return json_error(
            "تعذر تحديث مركز التكلفة.",
            status=400,
            field_errors=validation_errors(error),
        )
    return JsonResponse(
        {
            "ok": True,
            "success": True,
            "message": "تم تحديث مركز التكلفة بنجاح.",
            "cost_center": serialize_cost_center(cost_center),
            "summary": cost_center_summary(company),
        }
    )
accounting_cost_center_detail.required_company_permissions = [
    "company.accounting.journal_entries.view",
]
