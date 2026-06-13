from __future__ import annotations

from django.urls import path

from .cancel import company_purchase_return_cancel
from .confirm import company_purchase_return_confirm
from .create import company_purchase_return_create
from .detail import company_purchase_return_detail
from .list import company_purchase_returns_list
from .update import company_purchase_return_update


urlpatterns = [
    path(
        "",
        company_purchase_returns_list,
        name="company-purchase-returns-list",
    ),
    path(
        "create/",
        company_purchase_return_create,
        name="company-purchase-return-create",
    ),
    path(
        "<int:purchase_return_id>/",
        company_purchase_return_detail,
        name="company-purchase-return-detail",
    ),
    path(
        "<int:purchase_return_id>/update/",
        company_purchase_return_update,
        name="company-purchase-return-update",
    ),
    path(
        "<int:purchase_return_id>/confirm/",
        company_purchase_return_confirm,
        name="company-purchase-return-confirm",
    ),
    path(
        "<int:purchase_return_id>/cancel/",
        company_purchase_return_cancel,
        name="company-purchase-return-cancel",
    ),
]
