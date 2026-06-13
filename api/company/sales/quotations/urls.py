from __future__ import annotations

from django.urls import path

from .accept import sales_quotation_accept
from .cancel import sales_quotation_cancel
from .create import sales_quotation_create
from .detail import sales_quotation_detail
from .expire import sales_quotation_expire
from .list import sales_quotations_list
from .reject import sales_quotation_reject
from .send import sales_quotation_send
from .update import sales_quotation_update


app_name = "company_sales_quotations"


urlpatterns = [
    path(
        "",
        sales_quotations_list,
        name="list",
    ),
    path(
        "create/",
        sales_quotation_create,
        name="create",
    ),
    path(
        "<int:quotation_id>/",
        sales_quotation_detail,
        name="detail",
    ),
    path(
        "<int:quotation_id>/update/",
        sales_quotation_update,
        name="update",
    ),
    path(
        "<int:quotation_id>/send/",
        sales_quotation_send,
        name="send",
    ),
    path(
        "<int:quotation_id>/accept/",
        sales_quotation_accept,
        name="accept",
    ),
    path(
        "<int:quotation_id>/reject/",
        sales_quotation_reject,
        name="reject",
    ),
    path(
        "<int:quotation_id>/expire/",
        sales_quotation_expire,
        name="expire",
    ),
    path(
        "<int:quotation_id>/cancel/",
        sales_quotation_cancel,
        name="cancel",
    ),
]
