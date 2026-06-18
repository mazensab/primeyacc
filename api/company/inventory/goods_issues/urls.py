from __future__ import annotations

from django.urls import path

from .cancel import company_goods_issue_cancel
from .create import company_goods_issue_create
from .detail import company_goods_issue_detail
from .list import company_goods_issues_list
from .post import company_goods_issue_post


urlpatterns = [
    path(
        "",
        company_goods_issues_list,
        name="company-inventory-goods-issues-list",
    ),
    path(
        "create/",
        company_goods_issue_create,
        name="company-inventory-goods-issue-create",
    ),
    path(
        "<int:goods_issue_id>/",
        company_goods_issue_detail,
        name="company-inventory-goods-issue-detail",
    ),
    path(
        "<int:goods_issue_id>/post/",
        company_goods_issue_post,
        name="company-inventory-goods-issue-post",
    ),
    path(
        "<int:goods_issue_id>/cancel/",
        company_goods_issue_cancel,
        name="company-inventory-goods-issue-cancel",
    ),
]
