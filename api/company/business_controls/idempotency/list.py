# ============================================================
# 📂 api/company/business_controls/idempotency/list.py
# 🧠 Mhamcloud | Company Idempotency Keys List API V1.0
# ============================================================

from __future__ import annotations

from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_GET

from api.company.business_controls.helpers import (
    error_response,
    get_request_company,
    idempotency_key_to_dict,
    success_response,
)
from business_controls.models import BusinessIdempotencyKey


@login_required
@require_GET
def company_idempotency_keys_list(request):
    company = get_request_company(request)
    if company is None:
        return error_response("Company context is required.", status=403)

    qs = BusinessIdempotencyKey.objects.filter(company=company)

    scope = request.GET.get("scope")
    operation = request.GET.get("operation")
    status = request.GET.get("status")

    if scope:
        qs = qs.filter(scope=scope)
    if operation:
        qs = qs.filter(operation=operation)
    if status:
        qs = qs.filter(status=status)

    try:
        limit = min(max(int(request.GET.get("limit", "50")), 1), 200)
    except ValueError:
        limit = 50

    return success_response(
        {
            "count": qs.count(),
            "results": [idempotency_key_to_dict(record) for record in qs[:limit]],
        }
    )
