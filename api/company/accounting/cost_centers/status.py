# ============================================================
# 📂 api/company/accounting/cost_centers/status.py
# 🧠 Mhamcloud | Company Accounting Cost Center Status API
# ------------------------------------------------------------
# ✅ Real API only
# ✅ Tenant scoped by backend session/company membership
# ✅ Activate / Deactivate without delete
# ============================================================
from __future__ import annotations
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from accounting.models import CostCenter, CostCenterStatus
from .common import cost_center_summary, json_error, resolve_company, serialize_cost_center
def _change_status(request, cost_center_id: int, status: str):
    company = resolve_company(request)
    if company is None:
        return json_error("لا توجد شركة نشطة للمستخدم الحالي.", status=401)
    cost_center = CostCenter.objects.filter(company=company, pk=cost_center_id).first()
    if not cost_center:
        return json_error("مركز التكلفة غير موجود.", status=404)
    cost_center.status = status
    cost_center.full_clean()
    cost_center.save(update_fields=["status", "updated_at"])
    return JsonResponse(
        {
            "ok": True,
            "success": True,
            "message": "تم تحديث حالة مركز التكلفة بنجاح.",
            "cost_center": serialize_cost_center(cost_center),
            "summary": cost_center_summary(company),
        }
    )
@require_POST
def accounting_cost_center_activate(request, cost_center_id: int):
    return _change_status(request, cost_center_id, CostCenterStatus.ACTIVE)
@require_POST
def accounting_cost_center_deactivate(request, cost_center_id: int):
    return _change_status(request, cost_center_id, CostCenterStatus.INACTIVE)
accounting_cost_center_activate.required_company_permissions = [
    "company.accounting.journal_entries.view",
]
accounting_cost_center_deactivate.required_company_permissions = [
    "company.accounting.journal_entries.view",
]
