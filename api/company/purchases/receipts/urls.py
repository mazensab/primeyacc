from __future__ import annotations

from django.urls import path

from .cancel import company_purchase_receipt_cancel
from .create import company_purchase_receipt_create
from .detail import company_purchase_receipt_detail
from .list import company_purchase_receipts_list
from .post import company_purchase_receipt_post
from .update import company_purchase_receipt_update


urlpatterns = [
    path(
        "",
        company_purchase_receipts_list,
        name="company-purchase-receipts-list",
    ),
    path(
        "create/",
        company_purchase_receipt_create,
        name="company-purchase-receipt-create",
    ),
    path(
        "<int:purchase_receipt_id>/",
        company_purchase_receipt_detail,
        name="company-purchase-receipt-detail",
    ),
    path(
        "<int:purchase_receipt_id>/update/",
        company_purchase_receipt_update,
        name="company-purchase-receipt-update",
    ),
    path(
        "<int:purchase_receipt_id>/post/",
        company_purchase_receipt_post,
        name="company-purchase-receipt-post",
    ),
    path(
        "<int:purchase_receipt_id>/cancel/",
        company_purchase_receipt_cancel,
        name="company-purchase-receipt-cancel",
    ),
]
