from __future__ import annotations

from django.urls import path

from .cancel import company_physical_inventory_count_cancel
from .create import company_physical_inventory_count_create
from .detail import company_physical_inventory_count_detail
from .list import company_physical_inventory_counts_list
from .mark_counted import company_physical_inventory_count_mark_counted
from .post import company_physical_inventory_count_post
from .start import company_physical_inventory_count_start
from .update_item import company_physical_inventory_count_item_update


urlpatterns = [
    path(
        "",
        company_physical_inventory_counts_list,
        name="company-inventory-physical-counts-list",
    ),
    path(
        "create/",
        company_physical_inventory_count_create,
        name="company-inventory-physical-count-create",
    ),
    path(
        "<int:count_id>/",
        company_physical_inventory_count_detail,
        name="company-inventory-physical-count-detail",
    ),
    path(
        "<int:count_id>/start/",
        company_physical_inventory_count_start,
        name="company-inventory-physical-count-start",
    ),
    path(
        "<int:count_id>/items/<int:item_id>/",
        company_physical_inventory_count_item_update,
        name="company-inventory-physical-count-item-update",
    ),
    path(
        "<int:count_id>/mark-counted/",
        company_physical_inventory_count_mark_counted,
        name="company-inventory-physical-count-mark-counted",
    ),
    path(
        "<int:count_id>/post/",
        company_physical_inventory_count_post,
        name="company-inventory-physical-count-post",
    ),
    path(
        "<int:count_id>/cancel/",
        company_physical_inventory_count_cancel,
        name="company-inventory-physical-count-cancel",
    ),
]
