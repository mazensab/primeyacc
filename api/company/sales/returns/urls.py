from __future__ import annotations

from django.urls import path

from .cancel import company_sales_return_cancel
from .confirm import company_sales_return_confirm
from .create import company_sales_return_create
from .detail import company_sales_return_detail
from .invoice_summary import (
    company_sales_invoice_returns_summary,
)
from .list import company_sales_returns_list


urlpatterns = [
    path(
        "",
        company_sales_returns_list,
        name="company_sales_returns_list",
    ),
    path(
        "create/",
        company_sales_return_create,
        name="company_sales_return_create",
    ),
    path(
        "invoice/<int:invoice_id>/summary/",
        company_sales_invoice_returns_summary,
        name=(
            "company_sales_invoice_returns_summary"
        ),
    ),
    path(
        "<int:return_id>/",
        company_sales_return_detail,
        name="company_sales_return_detail",
    ),
    path(
        "<int:return_id>/confirm/",
        company_sales_return_confirm,
        name="company_sales_return_confirm",
    ),
    path(
        "<int:return_id>/cancel/",
        company_sales_return_cancel,
        name="company_sales_return_cancel",
    ),
]
