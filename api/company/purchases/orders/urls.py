from __future__ import annotations

from django.urls import path

from .approve import (
    company_purchase_order_approve,
)
from .cancel import (
    company_purchase_order_cancel,
)
from .create import (
    company_purchase_order_create,
)
from .create_bill import (
    company_purchase_order_create_bill,
)
from .detail import (
    company_purchase_order_detail,
)
from .list import (
    company_purchase_orders_list,
)
from .update import (
    company_purchase_order_update,
)


urlpatterns = [
    path(
        "",
        company_purchase_orders_list,
        name="company_purchase_orders_list",
    ),
    path(
        "create/",
        company_purchase_order_create,
        name="company_purchase_order_create",
    ),
    path(
        "<int:order_id>/",
        company_purchase_order_detail,
        name="company_purchase_order_detail",
    ),
    path(
        "<int:order_id>/update/",
        company_purchase_order_update,
        name="company_purchase_order_update",
    ),
    path(
        "<int:order_id>/approve/",
        company_purchase_order_approve,
        name="company_purchase_order_approve",
    ),
    path(
        "<int:order_id>/cancel/",
        company_purchase_order_cancel,
        name="company_purchase_order_cancel",
    ),
    path(
        "<int:order_id>/create-bill/",
        company_purchase_order_create_bill,
        name=(
            "company_purchase_order_create_bill"
        ),
    ),
]
