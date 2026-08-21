from __future__ import annotations

from django.urls import path

from .views import (
    system_subscription_payment_cancel,
    system_subscription_payment_checkout,
    system_subscription_payment_confirm,
    system_subscription_payment_create,
    system_subscription_payment_moyasar_attach,
    system_subscription_payment_detail,
    system_subscription_payment_events,
    system_subscription_payment_fail,
    system_subscription_payments_list,
)


app_name = "system_subscription_payments"


urlpatterns = [
    path("", system_subscription_payments_list, name="list"),
    path("create/", system_subscription_payment_create, name="create"),
    path("<int:payment_id>/", system_subscription_payment_detail, name="detail"),
    path("<int:payment_id>/events/", system_subscription_payment_events, name="events"),
    path("<int:payment_id>/checkout/", system_subscription_payment_checkout, name="checkout"),
    path("<int:payment_id>/moyasar/attach/", system_subscription_payment_moyasar_attach, name="moyasar_attach"),
    path("<int:payment_id>/confirm/", system_subscription_payment_confirm, name="confirm"),
    path("<int:payment_id>/fail/", system_subscription_payment_fail, name="fail"),
    path("<int:payment_id>/cancel/", system_subscription_payment_cancel, name="cancel"),
]
