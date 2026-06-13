from __future__ import annotations

from django.urls import path

from .cancel import sales_order_cancel
from .complete import sales_order_complete
from .confirm import sales_order_confirm
from .create import sales_order_create
from .create_invoice import sales_order_create_invoice
from .create_from_quotation import (
    sales_order_create_from_quotation,
)
from .detail import sales_order_detail
from .invoices import sales_order_invoices
from .list import sales_orders_list
from .process import sales_order_process
from .update import sales_order_update


app_name = "company_sales_orders"


urlpatterns = [
    path(
        "",
        sales_orders_list,
        name="list",
    ),
    path(
        "create/",
        sales_order_create,
        name="create",
    ),
    path(
        "from-quotation/<int:quotation_id>/",
        sales_order_create_from_quotation,
        name="create-from-quotation",
    ),
    path(
        "<int:order_id>/",
        sales_order_detail,
        name="detail",
    ),
    path(
        "<int:order_id>/update/",
        sales_order_update,
        name="update",
    ),
    path(
        "<int:order_id>/create-invoice/",
        sales_order_create_invoice,
        name="create-invoice",
    ),
    path(
        "<int:order_id>/invoices/",
        sales_order_invoices,
        name="invoices",
    ),
    path(
        "<int:order_id>/confirm/",
        sales_order_confirm,
        name="confirm",
    ),
    path(
        "<int:order_id>/process/",
        sales_order_process,
        name="process",
    ),
    path(
        "<int:order_id>/complete/",
        sales_order_complete,
        name="complete",
    ),
    path(
        "<int:order_id>/cancel/",
        sales_order_cancel,
        name="cancel",
    ),
]
