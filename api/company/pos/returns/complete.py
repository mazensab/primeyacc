# ============================================================
# 📂 api/company/pos/returns/complete.py
# 🧠 PrimeyAcc | Company POS Return Complete API V1.0
# ------------------------------------------------------------
# ✅ Company-scoped POS Return Complete
# ✅ Uses pos.services.complete_pos_return
# ✅ No company_id from frontend
# ✅ No treasury / inventory / accounting posting here
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم رد مبلغ أو إرجاع مخزون أو ترحيل محاسبي هنا
# - كل منطق التشغيل داخل pos/services.py
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.services import complete_pos_return

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
def pos_return_complete(request, return_id: int):
    """
    Complete a POS return for the current company.
    """

    company = getattr(request, "company", None)

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
        pos_return = complete_pos_return(
            company=company,
            pos_return=pos_return,
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