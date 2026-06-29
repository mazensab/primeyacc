# ============================================================
# 📂 api/company/pos/returns/cancel.py
# 🧠 Mhamcloud | Company POS Return Cancel API V1.0
# ------------------------------------------------------------
# ✅ Company-scoped POS Return Cancel
# ✅ Uses pos.services.cancel_pos_return
# ✅ No company_id from frontend
# ✅ No treasury / inventory / accounting reversal here
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم عكس مالي أو مخزني أو محاسبي هنا
# - كل منطق التشغيل داخل pos/services.py
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.services import cancel_pos_return

from .detail import POSReturnDetailAPIError, get_pos_return_for_company
from .list import serialize_pos_return


def _validation_error_response(exc: ValidationError) -> Response:
    """
    Convert Django ValidationError to a safe API response.
    """

    if hasattr(exc, "message_dict"):
        detail = exc.message_dict
    elif hasattr(exc, "messages"):
        detail = exc.messages
    else:
        detail = str(exc)

    return Response(
        {
            "ok": False,
            "detail": detail,
        },
        status=400,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated, HasAnyCompanyPermission])
def pos_return_cancel(request, return_id: int):
    """
    Cancel a POS return for the current company.
    """

    company = getattr(request, "company", None)
    data = request.data or {}
    reason = data.get("cancellation_reason") or data.get("reason") or ""

    try:
        pos_return = get_pos_return_for_company(
            company=company,
            return_id=return_id,
        )
    except POSReturnDetailAPIError as exc:
        return Response(
            {
                "ok": False,
                "detail": str(exc),
            },
            status=404 if "not found" in str(exc).lower() else 400,
        )

    try:
        pos_return = cancel_pos_return(
            company=company,
            pos_return=pos_return,
            reason=reason,
            user=request.user,
        )
        pos_return.refresh_from_db()
    except ValidationError as exc:
        return _validation_error_response(exc)

    return Response(
        {
            "ok": True,
            "item": serialize_pos_return(pos_return, include_items=True),
        },
        status=200,
    )