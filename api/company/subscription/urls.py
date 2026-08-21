from django.urls import path

from .views import (
    company_subscription_billing,
    company_subscription_change_plan,
    company_subscription_detail,
    company_subscription_plans,
    company_subscription_renew,
)

urlpatterns = [
    path(
        "",
        company_subscription_detail,
        name="company_subscription_detail",
    ),
    path(
        "plans/",
        company_subscription_plans,
        name="company_subscription_plans",
    ),
    path(
        "billing/",
        company_subscription_billing,
        name="company_subscription_billing",
    ),
    path(
        "renew/",
        company_subscription_renew,
        name="company_subscription_renew",
    ),
    path(
        "change-plan/",
        company_subscription_change_plan,
        name="company_subscription_change_plan",
    ),
]
