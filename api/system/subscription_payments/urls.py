from __future__ import annotations

from django.urls import path

from .webhooks import (
    system_subscription_payment_moyasar_webhook,
    system_subscription_payment_tabby_webhook,
    system_subscription_payment_tamara_webhook,
)

from .operations import (
    system_payment_gateway_readiness,
    system_payment_reconciliation_detail,
    system_payment_reconciliations_list,
    system_platform_webhook_event_detail,
    system_platform_webhook_event_reprocess,
    system_platform_webhook_events_list,
    system_subscription_payment_reconcile,
    system_subscription_payment_reconciliations,
)

from .views import (
    system_subscription_payment_cancel,
    system_subscription_payment_checkout,
    system_subscription_payment_confirm,
    system_subscription_payment_create,
    system_subscription_payment_moyasar_attach,
    system_subscription_payment_verify,
    system_subscription_payment_detail,
    system_subscription_payment_events,
    system_subscription_payment_fail,
    system_subscription_payments_list,
    system_subscription_payment_void,
    system_subscription_payment_adjustment_create,
    system_subscription_payment_adjustment_reverse,
)


app_name = "system_subscription_payments"


urlpatterns = [
    path("", system_subscription_payments_list, name="list"),
    path("create/", system_subscription_payment_create, name="create"),
    path("reconciliations/", system_payment_reconciliations_list, name="reconciliations"),
    path("reconciliations/<int:reconciliation_id>/", system_payment_reconciliation_detail, name="reconciliation_detail"),
    path("webhook-events/", system_platform_webhook_events_list, name="webhook_events"),
    path("webhook-events/<int:event_id>/", system_platform_webhook_event_detail, name="webhook_event_detail"),
    path("webhook-events/<int:event_id>/reprocess/", system_platform_webhook_event_reprocess, name="webhook_event_reprocess"),
    path("gateway-readiness/", system_payment_gateway_readiness, name="gateway_readiness"),
    path("webhooks/moyasar/", system_subscription_payment_moyasar_webhook, name="webhook_moyasar"),
    path("webhooks/tamara/", system_subscription_payment_tamara_webhook, name="webhook_tamara"),
    path("webhooks/tabby/", system_subscription_payment_tabby_webhook, name="webhook_tabby"),
    path("<int:payment_id>/", system_subscription_payment_detail, name="detail"),
    path("<int:payment_id>/events/", system_subscription_payment_events, name="events"),
    path("<int:payment_id>/reconcile/", system_subscription_payment_reconcile, name="reconcile"),
    path("<int:payment_id>/reconciliations/", system_subscription_payment_reconciliations, name="payment_reconciliations"),
    path("<int:payment_id>/checkout/", system_subscription_payment_checkout, name="checkout"),
    path("<int:payment_id>/verify/", system_subscription_payment_verify, name="verify"),
    path("<int:payment_id>/moyasar/attach/", system_subscription_payment_moyasar_attach, name="moyasar_attach"),
    path("<int:payment_id>/confirm/", system_subscription_payment_confirm, name="confirm"),
    path("<int:payment_id>/fail/", system_subscription_payment_fail, name="fail"),
    path("<int:payment_id>/cancel/", system_subscription_payment_cancel, name="cancel"),
    path("<int:payment_id>/void/", system_subscription_payment_void, name="void"),
    path(
        "<int:payment_id>/adjustments/",
        system_subscription_payment_adjustment_create,
        name="adjustment_create",
    ),
    path(
        "<int:payment_id>/adjustments/<int:adjustment_id>/reverse/",
        system_subscription_payment_adjustment_reverse,
        name="adjustment_reverse",
    ),
]
