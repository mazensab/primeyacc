# ============================================================
# 📂 api/company/business_controls/summary.py
# 🧠 PrimeyAcc | Company Business Controls Summary API V1.0
# ============================================================

from __future__ import annotations

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.views.decorators.http import require_GET

from api.company.business_controls.helpers import (
    error_response,
    get_request_company,
    success_response,
)
from business_controls.services import build_business_controls_summary


@login_required
@require_GET
def company_business_controls_summary(request):
    company = get_request_company(request)
    if company is None:
        return error_response("Company context is required.", status=403)

    try:
        payload = build_business_controls_summary(company=company)
    except ValidationError as exc:
        return error_response(str(exc), status=400)

    return success_response(payload)
