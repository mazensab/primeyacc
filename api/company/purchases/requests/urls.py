# ============================================================
# ?? api/company/purchases/requests/urls.py
# ?? Mhamcloud | Purchase Requests URLs
# ============================================================

from __future__ import annotations

from django.urls import path

from .approve import (
    company_purchase_request_approve,
)
from .cancel import (
    company_purchase_request_cancel,
)
from .convert_order import (
    company_purchase_request_convert_order,
)
from .create import (
    company_purchase_request_create,
)
from .detail import (
    company_purchase_request_detail,
)
from .list import (
    company_purchase_requests_list,
)
from .reject import (
    company_purchase_request_reject,
)
from .submit import (
    company_purchase_request_submit,
)
from .update import (
    company_purchase_request_update,
)


urlpatterns = [
    path(
        "",
        company_purchase_requests_list,
        name="company_purchase_requests_list",
    ),
    path(
        "create/",
        company_purchase_request_create,
        name="company_purchase_request_create",
    ),
    path(
        "<int:request_id>/",
        company_purchase_request_detail,
        name="company_purchase_request_detail",
    ),
    path(
        "<int:request_id>/update/",
        company_purchase_request_update,
        name="company_purchase_request_update",
    ),
    path(
        "<int:request_id>/submit/",
        company_purchase_request_submit,
        name="company_purchase_request_submit",
    ),
    path(
        "<int:request_id>/approve/",
        company_purchase_request_approve,
        name="company_purchase_request_approve",
    ),
    path(
        "<int:request_id>/reject/",
        company_purchase_request_reject,
        name="company_purchase_request_reject",
    ),
    path(
        "<int:request_id>/cancel/",
        company_purchase_request_cancel,
        name="company_purchase_request_cancel",
    ),
    path(
        "<int:request_id>/convert-order/",
        company_purchase_request_convert_order,
        name=(
            "company_purchase_request_convert_order"
        ),
    ),
]
