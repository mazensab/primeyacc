from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.db import transaction

from companies.models import (
    Branch,
    Company,
    CompanyOnboarding,
    CompanyOnboardingStatus,
    CompanySettings,
)


@dataclass(frozen=True)
class CompanyOnboardingAccess:
    managed: bool
    required: bool
    ready: bool
    status: str | None
    current_step: str
    onboarding_id: int | None

    def as_dict(self) -> dict[str, Any]:
        return {
            "managed": self.managed,
            "required": self.required,
            "ready": self.ready,
            "status": self.status,
            "current_step": self.current_step,
            "onboarding_id": self.onboarding_id,
        }


def get_company_onboarding_access(
    company: Company | None,
) -> CompanyOnboardingAccess:
    """
    Resolve onboarding without creating hidden state during reads.

    Legacy companies without CompanyOnboarding remain accessible.
    Only companies explicitly enrolled by provisioning are onboarding-managed.
    """

    if company is None:
        return CompanyOnboardingAccess(
            managed=False,
            required=False,
            ready=True,
            status=None,
            current_step="",
            onboarding_id=None,
        )

    onboarding = (
        CompanyOnboarding.objects
        .filter(company=company)
        .first()
    )

    if onboarding is None:
        return CompanyOnboardingAccess(
            managed=False,
            required=False,
            ready=True,
            status=None,
            current_step="",
            onboarding_id=None,
        )

    ready = onboarding.status == CompanyOnboardingStatus.READY

    return CompanyOnboardingAccess(
        managed=True,
        required=not ready,
        ready=ready,
        status=onboarding.status,
        current_step=onboarding.current_step,
        onboarding_id=onboarding.id,
    )


def get_setup_required_checks(
    *,
    company: Company,
    settings_obj: CompanySettings,
    default_branch: Branch | None,
) -> list[dict[str, Any]]:
    """
    Required setup contract only.

    Recommended fields stay visible in the overview but do not prevent
    onboarding completion.
    """

    return [
        {
            "code": "company_name",
            "is_complete": bool(
                company.name
                or company.name_ar
                or company.name_en
            ),
        },
        {
            "code": "company_code",
            "is_complete": bool(company.company_code),
        },
        {
            "code": "currency",
            "is_complete": bool(company.currency_code),
        },
        {
            "code": "settings",
            "is_complete": bool(
                settings_obj.default_language
                and settings_obj.timezone_name
            ),
        },
        {
            "code": "fiscal_year",
            "is_complete": bool(
                settings_obj.fiscal_year_start_month
                and settings_obj.fiscal_year_start_day
            ),
        },
        {
            "code": "default_branch",
            "is_complete": default_branch is not None,
        },
        {
            "code": "tax_number",
            "is_complete": (
                bool(company.tax_number)
                if settings_obj.enable_vat
                else True
            ),
        },
    ]


@transaction.atomic
def complete_company_onboarding(
    *,
    company: Company,
    user,
    settings_obj: CompanySettings,
    default_branch: Branch | None,
) -> CompanyOnboarding:
    """
    Complete onboarding only after all backend-required checks pass.

    This is idempotent and tenant-scoped.
    """

    onboarding = (
        CompanyOnboarding.objects
        .select_for_update()
        .get(company=company)
    )

    checks = get_setup_required_checks(
        company=company,
        settings_obj=settings_obj,
        default_branch=default_branch,
    )

    missing = [
        item["code"]
        for item in checks
        if not item["is_complete"]
    ]

    if missing:
        from django.core.exceptions import ValidationError

        raise ValidationError(
            {
                "onboarding": (
                    "Company setup is incomplete."
                ),
                "missing_required": missing,
            }
        )

    onboarding.mark_ready(user=user)

    return onboarding
