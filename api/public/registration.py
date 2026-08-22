from __future__ import annotations

import json
import re
from typing import Any

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET, require_POST

from accounts.models import UserProfile
from billing.payment_services import (
    create_or_get_subscription_payment,
)
from companies.models import Company, CompanyStatus
from companies.provisioning import provision_company_tenant
from subscriptions.models import (
    CompanySubscription,
    SubscriptionPlan,
)


User = get_user_model()

ALLOWED_GATEWAYS = {
    "MOYASAR",
    "TAMARA",
    "TABBY",
}

PHONE_PATTERN = re.compile(
    r"^(?:\+9665|9665|05|5)\d{8}$"
)

COMMERCIAL_REGISTRATION_PATTERN = re.compile(
    r"^\d{10}$"
)


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _json_body(
    request: HttpRequest,
) -> dict[str, Any]:
    if not request.body:
        return {}

    try:
        value = json.loads(
            request.body.decode("utf-8")
        )
    except (
        UnicodeDecodeError,
        json.JSONDecodeError,
    ):
        return {}

    return value if isinstance(value, dict) else {}


def _errors(
    exc: ValidationError,
) -> dict[str, Any]:
    if hasattr(exc, "message_dict"):
        return exc.message_dict

    return {
        "non_field_errors": (
            getattr(
                exc,
                "messages",
                [str(exc)],
            )
        ),
    }


def _normalize_phone(
    value: Any,
) -> str:
    value = re.sub(
        r"[\s\-()]",
        "",
        _clean(value),
    )

    if value.startswith("+9665"):
        return "0" + value[4:]

    if value.startswith("9665"):
        return "0" + value[3:]

    if value.startswith("5") and len(value) == 9:
        return "0" + value

    return value


def _validate_payload(
    payload: dict[str, Any],
) -> dict[str, Any]:
    errors: dict[str, list[str]] = {}

    owner_name = _clean(
        payload.get("owner_name")
    )

    phone = _normalize_phone(
        payload.get("phone")
    )

    email = _clean(
        payload.get("email")
    ).lower()

    password = str(
        payload.get("password") or ""
    )

    company_name = _clean(
        payload.get("company_name")
    )

    commercial_registration = _clean(
        payload.get(
            "commercial_registration"
        )
    )

    tax_number = _clean(
        payload.get("tax_number")
    )

    city = _clean(
        payload.get("city")
    )

    if len(owner_name) < 3:
        errors["owner_name"] = [
            "Owner name must contain at least 3 characters."
        ]

    if not PHONE_PATTERN.match(phone):
        errors["phone"] = [
            "Enter a valid Saudi mobile number."
        ]

    if (
        not email
        or "@" not in email
        or "." not in email.rsplit("@", 1)[-1]
    ):
        errors["email"] = [
            "Enter a valid email address."
        ]

    if len(password) < 8:
        errors["password"] = [
            "Password must contain at least 8 characters."
        ]

    if len(company_name) < 2:
        errors["company_name"] = [
            "Company name is required."
        ]

    if not COMMERCIAL_REGISTRATION_PATTERN.match(
        commercial_registration
    ):
        errors["commercial_registration"] = [
            "Commercial registration must contain exactly 10 digits."
        ]

    if not city:
        errors["city"] = [
            "City is required."
        ]

    try:
        plan_id = int(
            payload.get("plan_id")
        )

        if plan_id <= 0:
            raise ValueError

    except (TypeError, ValueError):
        plan_id = None
        errors["plan_id"] = [
            "A valid plan_id is required."
        ]

    billing_cycle = _clean(
        payload.get("billing_cycle")
    ).upper()

    if billing_cycle not in {
        CompanySubscription
        .BillingCycle
        .MONTHLY,

        CompanySubscription
        .BillingCycle
        .YEARLY,
    }:
        errors["billing_cycle"] = [
            "Billing cycle must be MONTHLY or YEARLY."
        ]

    gateway = _clean(
        payload.get("gateway")
    ).upper()

    if gateway not in ALLOWED_GATEWAYS:
        errors["gateway"] = [
            "Gateway must be MOYASAR, TAMARA, or TABBY."
        ]

    if errors:
        raise ValidationError(errors)

    return {
        "owner_name": owner_name,
        "phone": phone,
        "email": email,
        "password": password,
        "company_name": company_name,
        "commercial_registration": (
            commercial_registration
        ),
        "tax_number": tax_number,
        "city": city,
        "plan_id": plan_id,
        "billing_cycle": billing_cycle,
        "gateway": gateway,
        "auto_renew": bool(
            payload.get(
                "auto_renew",
                False,
            )
        ),
    }


def _assert_unique(
    *,
    email: str,
    phone: str,
    commercial_registration: str,
) -> None:
    errors: dict[str, list[str]] = {}

    if User.objects.filter(
        email__iexact=email
    ).exists():
        errors["email"] = [
            "An account already exists with this email."
        ]

    if User.objects.filter(
        username=phone
    ).exists():
        errors["phone"] = [
            "An account already exists with this mobile number."
        ]

    if (
        UserProfile.objects
        .filter(phone=phone)
        .exists()
        or UserProfile.objects
        .filter(mobile=phone)
        .exists()
    ):
        errors["phone"] = [
            "This mobile number is already registered."
        ]

    if Company.objects.filter(
        commercial_registration=(
            commercial_registration
        )
    ).exists():
        errors["commercial_registration"] = [
            "A company already exists with this commercial registration."
        ]

    if errors:
        raise ValidationError(errors)


def _plan_payload(
    plan: SubscriptionPlan,
) -> dict[str, Any]:
    return {
        "id": plan.id,
        "name": plan.name,
        "code": plan.code,
        "slug": plan.slug,
        "description": plan.description,
        "monthly_price": str(
            plan.monthly_price
        ),
        "yearly_price": str(
            plan.yearly_price
        ),
        "max_users": plan.max_users,
        "max_branches": plan.max_branches,
        "max_warehouses": (
            plan.max_warehouses
        ),
        "max_pos": plan.max_pos,
        "features": (
            list(plan.features)
            if isinstance(
                plan.features,
                list,
            )
            else []
        ),
    }


@require_GET
def public_registration_options(
    request: HttpRequest,
) -> JsonResponse:
    plans = (
        SubscriptionPlan.objects
        .filter(
            is_active=True,
            is_public=True,
        )
        .order_by(
            "sort_order",
            "monthly_price",
            "id",
        )
    )

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "plans": [
                    _plan_payload(plan)
                    for plan in plans
                ],
                "billing_cycles": [
                    {
                        "value": value,
                        "label": label,
                    }
                    for value, label
                    in (
                        CompanySubscription
                        .BillingCycle
                        .choices
                    )
                ],
                "gateways": sorted(
                    ALLOWED_GATEWAYS
                ),
            },
        }
    )


@csrf_protect
@require_POST
def public_register_company(
    request: HttpRequest,
) -> JsonResponse:
    try:
        cleaned = _validate_payload(
            _json_body(request)
        )

        plan = (
            SubscriptionPlan.objects
            .filter(
                pk=cleaned["plan_id"],
                is_active=True,
                is_public=True,
            )
            .first()
        )

        if plan is None:
            raise ValidationError(
                {
                    "plan_id": [
                        "The selected plan is not available."
                    ]
                }
            )

        with transaction.atomic():
            _assert_unique(
                email=cleaned["email"],
                phone=cleaned["phone"],
                commercial_registration=(
                    cleaned[
                        "commercial_registration"
                    ]
                ),
            )

            owner = User.objects.create_user(
                username=cleaned["phone"],
                email=cleaned["email"],
                password=cleaned["password"],
            )

            owner.first_name = (
                cleaned["owner_name"][:150]
            )

            owner.save(
                update_fields=[
                    "first_name",
                ]
            )

            result = provision_company_tenant(
                name=cleaned[
                    "company_name"
                ],
                owner=owner,
                acting_user=owner,
                status=CompanyStatus.TRIAL,
                is_active=True,
                commercial_registration=(
                    cleaned[
                        "commercial_registration"
                    ]
                ),
                tax_number=cleaned[
                    "tax_number"
                ],
                email=cleaned["email"],
                phone=cleaned["phone"],
                mobile=cleaned["phone"],
                whatsapp_number=(
                    cleaned["phone"]
                ),
                city=cleaned["city"],
                initial_plan=plan,
                billing_cycle=cleaned[
                    "billing_cycle"
                ],
                auto_renew=cleaned[
                    "auto_renew"
                ],
                subscription_notes=(
                    "Public SaaS registration."
                ),
            )

            if result.owner_profile:
                profile = (
                    result.owner_profile
                )

                profile.display_name = (
                    cleaned["owner_name"]
                )
                profile.phone = (
                    cleaned["phone"]
                )
                profile.mobile = (
                    cleaned["phone"]
                )
                profile.whatsapp_number = (
                    cleaned["phone"]
                )

                profile.save(
                    update_fields=[
                        "display_name",
                        "phone",
                        "mobile",
                        "whatsapp_number",
                        "updated_at",
                    ]
                )

            subscription = result.subscription

            if subscription is None:
                raise ValidationError(
                    {
                        "subscription": [
                            "Pending subscription was not created."
                        ]
                    }
                )

            payment, _ = (
                create_or_get_subscription_payment(
                    subscription=subscription,
                    idempotency_key=(
                        "public-registration:"
                        f"{subscription.id}"
                    ),
                    gateway=cleaned[
                        "gateway"
                    ],
                    payment_method=cleaned[
                        "gateway"
                    ],
                    metadata={
                        "source": (
                            "public-registration"
                        ),
                        "company_id": (
                            result.company.id
                        ),
                    },
                    created_by=owner,
                )
            )

        return JsonResponse(
            {
                "ok": True,
                "code": (
                    "REGISTRATION_CREATED"
                ),
                "data": {
                    "owner": {
                        "id": owner.id,
                        "username": (
                            owner.get_username()
                        ),
                        "email": owner.email,
                    },
                    "company": {
                        "id": (
                            result.company.id
                        ),
                        "company_code": (
                            result.company
                            .company_code
                        ),
                        "name": (
                            result.company
                            .display_name
                        ),
                        "status": (
                            result.company.status
                        ),
                    },
                    "subscription": {
                        "id": subscription.id,
                        "status": (
                            subscription.status
                        ),
                        "billing_cycle": (
                            subscription
                            .billing_cycle
                        ),
                        "total_amount": str(
                            subscription
                            .total_amount
                        ),
                        "plan": (
                            _plan_payload(
                                subscription.plan
                            )
                        ),
                    },
                    "payment": {
                        "id": payment.id,
                        "payment_reference": (
                            payment
                            .payment_reference
                        ),
                        "status": (
                            payment.status
                        ),
                        "gateway": (
                            payment.gateway
                        ),
                        "amount": str(
                            payment.amount
                        ),
                        "currency_code": (
                            payment
                            .currency_code
                        ),
                    },
                },
            },
            status=201,
        )

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "code": (
                    "REGISTRATION_INVALID"
                ),
                "errors": _errors(exc),
            },
            status=400,
        )

    except IntegrityError:
        return JsonResponse(
            {
                "ok": False,
                "code": (
                    "REGISTRATION_CONFLICT"
                ),
            },
            status=409,
        )
