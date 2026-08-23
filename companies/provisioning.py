from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from accounting.services import seed_company_chart_of_accounts
from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
    SystemRole,
    UserProfile,
    UserProfileStatus,
    WorkspaceType,
)
from companies.models import (
    ActivityProfile,
    Company,
    CompanyActivityProfile,
    CompanyOnboarding,
    CompanyOnboardingStatus,
    CompanySettings,
    CompanyStatus,
)
from subscriptions.models import CompanySubscription, SubscriptionPlan
from subscriptions.services import create_commercial_pending_subscription


User = get_user_model()


@dataclass(frozen=True)
class TenantProvisioningResult:
    company: Company
    owner_profile: UserProfile | None
    owner_membership: CompanyMembership | None
    settings: CompanySettings
    subscription: CompanySubscription | None
    accounting_seed: dict[str, int]


def generate_company_code() -> str:
    """
    Generate the canonical backend-owned Mhamcloud company code.
    """
    current_year = timezone.now().year
    prefix = f"CMP-{current_year}-"
    pattern = re.compile(rf"^{re.escape(prefix)}(\d+)$")

    codes = (
        Company.objects.select_for_update()
        .filter(company_code__startswith=prefix)
        .values_list("company_code", flat=True)
    )

    maximum = 0

    for code in codes:
        match = pattern.match(str(code or ""))
        if match:
            maximum = max(maximum, int(match.group(1)))

    sequence = maximum + 1

    while True:
        candidate = f"{prefix}{sequence:06d}"
        if not Company.objects.filter(
            company_code__iexact=candidate
        ).exists():
            return candidate
        sequence += 1


def ensure_owner_access(
    *,
    owner: User | None,
    company: Company,
    acting_user=None,
) -> tuple[UserProfile | None, CompanyMembership | None]:
    """
    Ensure one company OWNER profile/membership without creating a parallel
    authorization model.
    """
    if owner is None:
        return None, None

    profile, _ = UserProfile.objects.get_or_create(
        user=owner,
        defaults={
            "display_name": (
                owner.get_full_name()
                or owner.get_username()
            ),
            "status": UserProfileStatus.ACTIVE,
            "default_workspace": WorkspaceType.COMPANY,
            "system_role": SystemRole.NONE,
            "is_system_user": False,
        },
    )

    profile_fields: list[str] = []

    if not profile.default_company_id:
        profile.default_company = company
        profile_fields.append("default_company")

    if profile.default_workspace != WorkspaceType.COMPANY:
        profile.default_workspace = WorkspaceType.COMPANY
        profile_fields.append("default_workspace")

    if profile_fields:
        profile_fields.append("updated_at")
        profile.save(update_fields=profile_fields)

    membership, created = CompanyMembership.objects.get_or_create(
        user=owner,
        company=company,
        defaults={
            "role": CompanyRole.OWNER,
            "status": MembershipStatus.ACTIVE,
            "is_primary": True,
            "joined_at": timezone.now(),
            "created_by": acting_user,
            "updated_by": acting_user,
        },
    )

    if not created:
        changed: list[str] = []

        if membership.role != CompanyRole.OWNER:
            membership.role = CompanyRole.OWNER
            changed.append("role")

        if membership.status != MembershipStatus.ACTIVE:
            membership.status = MembershipStatus.ACTIVE
            membership.suspended_at = None
            membership.suspended_reason = ""
            changed.extend([
                "status",
                "suspended_at",
                "suspended_reason",
            ])

        if not membership.is_primary:
            membership.is_primary = True
            changed.append("is_primary")

        if not membership.joined_at:
            membership.joined_at = timezone.now()
            changed.append("joined_at")

        if acting_user and membership.updated_by_id != acting_user.id:
            membership.updated_by = acting_user
            changed.append("updated_by")

        if changed:
            changed.append("updated_at")
            membership.save(update_fields=changed)

    CompanyMembership.objects.filter(
        user=owner,
        is_primary=True,
    ).exclude(pk=membership.pk).update(is_primary=False)

    return profile, membership


@transaction.atomic
def provision_company_tenant(
    *,
    name: str,
    owner: User | None,
    acting_user=None,
    name_ar: str = "",
    name_en: str = "",
    activity_profile: str = CompanyActivityProfile.GENERAL,
    activity_profile_ref: ActivityProfile | None = None,
    status: str = CompanyStatus.TRIAL,
    is_active: bool = True,
    commercial_registration: str = "",
    tax_number: str = "",
    email: str = "",
    phone: str = "",
    mobile: str = "",
    whatsapp_number: str = "",
    website: str = "",
    country: str = "Saudi Arabia",
    building_number: str = "",
    street_name: str = "",
    district: str = "",
    city: str = "",
    region: str = "",
    postal_code: str = "",
    short_address: str = "",
    address: str = "",
    currency_code: str = "SAR",
    vat_percentage: Decimal = Decimal("15.00"),
    notes: str = "",
    initial_plan: SubscriptionPlan | None = None,
    billing_cycle: str | None = None,
    auto_renew: bool = False,
    subscription_notes: str = "",
) -> TenantProvisioningResult:
    """
    Canonical tenant provisioning transaction.

    The service creates the tenant foundation only. It never performs a
    gateway payment and never activates a pending paid subscription.

    initial_plan is optional so the existing Primey System company-create
    workflow can continue to create a company without forcing a subscription.
    Public signup may provide a plan and receive PENDING_PAYMENT.
    """
    clean_name = str(name or "").strip()

    if not clean_name:
        raise ValidationError({"name": "ط§ط³ظ… ط§ظ„ط´ط±ظƒط© ظ…ط·ظ„ظˆط¨."})

    if status not in CompanyStatus.values:
        raise ValidationError({"status": "ط­ط§ظ„ط© ط§ظ„ط´ط±ظƒط© ط؛ظٹط± طµط­ظٹط­ط©."})

    if activity_profile not in CompanyActivityProfile.values:
        raise ValidationError(
            {"activity_profile": "ظ†ظˆط¹ ظ†ط´ط§ط· ط§ظ„ط´ط±ظƒط© ط؛ظٹط± طµط­ظٹط­."}
        )

    if initial_plan and not billing_cycle:
        raise ValidationError(
            {"billing_cycle": "ط¯ظˆط±ط© ط§ظ„ظپظˆطھط±ط© ظ…ط·ظ„ظˆط¨ط© ط¹ظ†ط¯ ط§ط®طھظٹط§ط± ط¨ط§ظ‚ط©."}
        )

    company = Company(
        name=clean_name,
        name_ar=str(name_ar or "").strip(),
        name_en=str(name_en or "").strip(),
        company_code=generate_company_code(),
        activity_profile=activity_profile,
        activity_profile_ref=activity_profile_ref,
        status=status,
        is_active=bool(is_active),
        commercial_registration=str(
            commercial_registration or ""
        ).strip(),
        tax_number=str(tax_number or "").strip(),
        email=str(email or "").strip(),
        phone=str(phone or "").strip(),
        mobile=str(mobile or "").strip(),
        whatsapp_number=str(
            whatsapp_number or ""
        ).strip(),
        country=str(country or "Saudi Arabia").strip()
        or "Saudi Arabia",
        building_number=str(building_number or "").strip(),
        street_name=str(street_name or "").strip(),
        district=str(district or "").strip(),
        city=str(city or "").strip(),
        region=str(region or "").strip(),
        postal_code=str(postal_code or "").strip(),
        short_address=str(short_address or "").strip(),
        address=str(address or "").strip(),
        currency_code=str(currency_code or "SAR").strip()
        or "SAR",
        vat_percentage=vat_percentage,
        notes=str(notes or "").strip(),
        owner=owner,
        created_by=acting_user,
        updated_by=acting_user,
    )
    company.full_clean()
    company.save()

    settings, _ = CompanySettings.objects.get_or_create(
        company=company,
        defaults={
            "default_vat_percentage": vat_percentage,
            "created_by": acting_user,
            "updated_by": acting_user,
        },
    )

    owner_profile, owner_membership = ensure_owner_access(
        owner=owner,
        company=company,
        acting_user=acting_user,
    )

    accounting_seed = seed_company_chart_of_accounts(
        company,
        user=acting_user,
        overwrite=False,
    )

    subscription = None

    if initial_plan is not None:
        CompanyOnboarding.objects.create(
            company=company,
            status=CompanyOnboardingStatus.REQUIRED,
            current_step="payment",
        )

        subscription = create_commercial_pending_subscription(
            company=company,
            plan=initial_plan,
            billing_cycle=billing_cycle,
            action=CompanySubscription.SubscriptionAction.NEW,
            auto_renew=auto_renew,
            created_by=acting_user,
            notes=subscription_notes,
        )

    return TenantProvisioningResult(
        company=company,
        owner_profile=owner_profile,
        owner_membership=owner_membership,
        settings=settings,
        subscription=subscription,
        accounting_seed=accounting_seed,
    )
