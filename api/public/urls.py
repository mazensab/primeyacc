from django.urls import path

from .registration import (
    public_register_company,
    public_registration_checkout,
    public_registration_moyasar_attach,
    public_registration_options,
    public_registration_payment_verify,
)


app_name = "public"


urlpatterns = [
    path(
        "registration/options/",
        public_registration_options,
        name="registration_options",
    ),
    path(
        "registration/",
        public_register_company,
        name="registration",
    ),
    path(
        "registration/checkout/",
        public_registration_checkout,
        name="registration_checkout",
    ),
    path(
        "registration/moyasar/attach/",
        public_registration_moyasar_attach,
        name="registration_moyasar_attach",
    ),
    path(
        "registration/payment/verify/",
        public_registration_payment_verify,
        name="registration_payment_verify",
    ),
]
