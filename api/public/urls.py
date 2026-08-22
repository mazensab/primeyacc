from django.urls import path

from .registration import (
    public_registration_options,
    public_register_company,
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
]
