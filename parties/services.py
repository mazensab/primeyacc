# ============================================================
# 📂 parties/services.py
# 🧠 PrimeyAcc | Business Parties Services V1.0
# ------------------------------------------------------------
# ✅ Company-scoped BusinessParty query helpers
# ✅ Safe create/update helpers for customers and suppliers
# ✅ Branch ownership validation
# ✅ Prevent frontend company_id trust
# ✅ Shared serialization helper for APIs
# ✅ Status transition helpers
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - أي branch_id يجب أن يكون تابعًا لنفس الشركة الحالية
# - كل Query يجب أن يكون محصورًا داخل الشركة الحالية
# - BusinessParty هو الأساس الموحد للعملاء والموردين
# ============================================================

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

from django.contrib.auth import get_user_model
from django.db.models import Q, QuerySet

from companies.models import Branch, Company
from .models import (
    BusinessParty,
    BusinessPartyKind,
    BusinessPartyStatus,
    BusinessPartyType,
)


User = get_user_model()


class PartyServiceError(ValueError):
    """
    Raised when party service validation fails.

    API views will convert this error into a safe JSON 400 response.
    """


# ============================================================
# Internal helpers
# ============================================================

def _clean_text(value: Any) -> str:
    """
    Normalize optional text input.
    """
    if value is None:
        return ""

    return str(value).strip()


def _clean_decimal(value: Any, default: Decimal = Decimal("0")) -> Decimal:
    """
    Normalize decimal values safely.
    """
    if value in [None, ""]:
        return default

    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise PartyServiceError("Invalid decimal value.") from exc


def _clean_int(value: Any, default: int = 0) -> int:
    """
    Normalize positive integer values safely.
    """
    if value in [None, ""]:
        return default

    try:
        number = int(value)
    except (TypeError, ValueError) as exc:
        raise PartyServiceError("Invalid integer value.") from exc

    if number < 0:
        raise PartyServiceError("Integer value cannot be negative.")

    return number


def _clean_bool(value: Any, default: bool = False) -> bool:
    """
    Normalize boolean-like input values.
    """
    if value in [None, ""]:
        return default

    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in ["1", "true", "yes", "y", "on"]:
            return True
        if normalized in ["0", "false", "no", "n", "off"]:
            return False

    return bool(value)


def _validate_choice(value: str, allowed_values: list[str], field_name: str) -> str:
    """
    Validate a TextChoices value.
    """
    cleaned = _clean_text(value).upper()

    if cleaned not in allowed_values:
        raise PartyServiceError(f"Invalid {field_name}.")

    return cleaned


def resolve_branch_for_company(
    *,
    company: Company,
    branch_id: Any,
) -> Branch | None:
    """
    Resolve branch safely inside the current company.

    The frontend may send branch_id as a selector only.
    It is accepted only if the branch belongs to the resolved company.
    """
    if branch_id in [None, ""]:
        return None

    try:
        parsed_branch_id = int(branch_id)
    except (TypeError, ValueError) as exc:
        raise PartyServiceError("Invalid branch_id.") from exc

    branch = Branch.objects.filter(
        id=parsed_branch_id,
        company=company,
    ).first()

    if not branch:
        raise PartyServiceError("Branch does not belong to the current company.")

    return branch


def _ensure_party_code_is_unique(
    *,
    company: Company,
    code: str,
    exclude_party_id: int | None = None,
) -> None:
    """
    Ensure party code is unique inside the same company when provided.
    """
    if not code:
        return

    queryset = BusinessParty.objects.filter(
        company=company,
        code=code,
    )

    if exclude_party_id:
        queryset = queryset.exclude(id=exclude_party_id)

    if queryset.exists():
        raise PartyServiceError("Party code already exists in this company.")


# ============================================================
# Query helpers
# ============================================================

def get_company_parties_queryset(
    *,
    company: Company,
) -> QuerySet[BusinessParty]:
    """
    Return BusinessParty records scoped to one company only.
    """
    return (
        BusinessParty.objects.select_related(
            "company",
            "branch",
            "created_by",
            "updated_by",
        )
        .filter(company=company)
        .order_by("-created_at")
    )


def filter_parties_queryset(
    queryset: QuerySet[BusinessParty],
    *,
    search: str = "",
    party_type: str = "",
    status: str = "",
    party_kind: str = "",
    branch_id: Any = None,
    city: str = "",
) -> QuerySet[BusinessParty]:
    """
    Apply safe filters to an already company-scoped queryset.
    """
    search = _clean_text(search)
    party_type = _clean_text(party_type).upper()
    status = _clean_text(status).upper()
    party_kind = _clean_text(party_kind).upper()
    city = _clean_text(city)

    if search:
        queryset = queryset.filter(
            Q(code__icontains=search)
            | Q(display_name__icontains=search)
            | Q(legal_name__icontains=search)
            | Q(contact_person__icontains=search)
            | Q(phone__icontains=search)
            | Q(mobile__icontains=search)
            | Q(whatsapp_number__icontains=search)
            | Q(email__icontains=search)
            | Q(commercial_registration__icontains=search)
            | Q(vat_number__icontains=search)
            | Q(national_id__icontains=search)
            | Q(city__icontains=search)
            | Q(short_address__icontains=search)
        )

    if party_type:
        if party_type == BusinessPartyType.CUSTOMER:
            queryset = queryset.filter(
                party_type__in=[
                    BusinessPartyType.CUSTOMER,
                    BusinessPartyType.BOTH,
                ]
            )
        elif party_type == BusinessPartyType.SUPPLIER:
            queryset = queryset.filter(
                party_type__in=[
                    BusinessPartyType.SUPPLIER,
                    BusinessPartyType.BOTH,
                ]
            )
        elif party_type in BusinessPartyType.values:
            queryset = queryset.filter(party_type=party_type)
        else:
            raise PartyServiceError("Invalid party_type filter.")

    if status:
        if status not in BusinessPartyStatus.values:
            raise PartyServiceError("Invalid status filter.")
        queryset = queryset.filter(status=status)

    if party_kind:
        if party_kind not in BusinessPartyKind.values:
            raise PartyServiceError("Invalid party_kind filter.")
        queryset = queryset.filter(party_kind=party_kind)

    if branch_id not in [None, ""]:
        try:
            parsed_branch_id = int(branch_id)
        except (TypeError, ValueError) as exc:
            raise PartyServiceError("Invalid branch_id filter.") from exc

        queryset = queryset.filter(branch_id=parsed_branch_id)

    if city:
        queryset = queryset.filter(city__icontains=city)

    return queryset


def get_company_party_or_raise(
    *,
    company: Company,
    party_id: Any,
) -> BusinessParty:
    """
    Return a single party scoped to the current company.
    """
    try:
        parsed_party_id = int(party_id)
    except (TypeError, ValueError) as exc:
        raise PartyServiceError("Invalid party id.") from exc

    party = get_company_parties_queryset(company=company).filter(
        id=parsed_party_id,
    ).first()

    if not party:
        raise PartyServiceError("Business party was not found.")

    return party


# ============================================================
# Serialization
# ============================================================

def serialize_business_party(party: BusinessParty) -> dict[str, Any]:
    """
    Serialize BusinessParty for company APIs.

    Keep this explicit instead of exposing model fields blindly.
    """
    return {
        "id": party.id,
        "company_id": party.company_id,
        "company_name": party.company.display_name if party.company_id else "",
        "branch_id": party.branch_id,
        "branch_name": party.branch.name if party.branch_id else "",
        "party_type": party.party_type,
        "party_type_label": party.get_party_type_display(),
        "party_kind": party.party_kind,
        "party_kind_label": party.get_party_kind_display(),
        "status": party.status,
        "status_label": party.get_status_display(),
        "code": party.code,
        "display_name": party.display_name,
        "legal_name": party.legal_name,
        "contact_person": party.contact_person,
        "phone": party.phone,
        "mobile": party.mobile,
        "whatsapp_number": party.whatsapp_number,
        "email": party.email,
        "website": party.website,
        "commercial_registration": party.commercial_registration,
        "vat_number": party.vat_number,
        "national_id": party.national_id,
        "country": party.country,
        "city": party.city,
        "district": party.district,
        "street": party.street,
        "building_number": party.building_number,
        "additional_number": party.additional_number,
        "postal_code": party.postal_code,
        "short_address": party.short_address,
        "address_line": party.address_line,
        "credit_limit": str(party.credit_limit),
        "opening_balance": str(party.opening_balance),
        "opening_balance_date": (
            party.opening_balance_date.isoformat()
            if party.opening_balance_date
            else None
        ),
        "payment_terms_days": party.payment_terms_days,
        "tax_exempt": party.tax_exempt,
        "blocked_at": party.blocked_at.isoformat() if party.blocked_at else None,
        "blocked_reason": party.blocked_reason,
        "archived_at": party.archived_at.isoformat() if party.archived_at else None,
        "is_customer": party.is_customer,
        "is_supplier": party.is_supplier,
        "is_active_party": party.is_active_party,
        "notes": party.notes,
        "extra_data": party.extra_data,
        "created_by_id": party.created_by_id,
        "updated_by_id": party.updated_by_id,
        "created_at": party.created_at.isoformat() if party.created_at else None,
        "updated_at": party.updated_at.isoformat() if party.updated_at else None,
    }


def serialize_party_choices() -> dict[str, list[dict[str, str]]]:
    """
    Return party choices for API consumers.
    """
    return {
        "party_types": [
            {"value": value, "label": label}
            for value, label in BusinessPartyType.choices
        ],
        "party_kinds": [
            {"value": value, "label": label}
            for value, label in BusinessPartyKind.choices
        ],
        "statuses": [
            {"value": value, "label": label}
            for value, label in BusinessPartyStatus.choices
        ],
    }


# ============================================================
# Create / Update
# ============================================================

def build_party_payload(
    *,
    company: Company,
    data: dict[str, Any],
    existing_party: BusinessParty | None = None,
) -> dict[str, Any]:
    """
    Build safe model payload from incoming API/Admin-like data.

    company is passed explicitly from trusted backend context.
    Any incoming company_id is intentionally ignored.
    """
    branch = resolve_branch_for_company(
        company=company,
        branch_id=data.get("branch_id") or data.get("branch"),
    )

    party_type = data.get(
        "party_type",
        existing_party.party_type if existing_party else BusinessPartyType.CUSTOMER,
    )
    party_kind = data.get(
        "party_kind",
        existing_party.party_kind if existing_party else BusinessPartyKind.INDIVIDUAL,
    )
    status = data.get(
        "status",
        existing_party.status if existing_party else BusinessPartyStatus.ACTIVE,
    )

    party_type = _validate_choice(
        party_type,
        list(BusinessPartyType.values),
        "party_type",
    )
    party_kind = _validate_choice(
        party_kind,
        list(BusinessPartyKind.values),
        "party_kind",
    )
    status = _validate_choice(
        status,
        list(BusinessPartyStatus.values),
        "status",
    )

    display_name = _clean_text(data.get("display_name"))
    if not display_name and existing_party:
        display_name = existing_party.display_name

    if not display_name:
        raise PartyServiceError("Display name is required.")

    code = _clean_text(data.get("code"))
    if not code and existing_party:
        code = existing_party.code

    _ensure_party_code_is_unique(
        company=company,
        code=code,
        exclude_party_id=existing_party.id if existing_party else None,
    )

    return {
        "company": company,
        "branch": branch,
        "party_type": party_type,
        "party_kind": party_kind,
        "status": status,
        "code": code,
        "display_name": display_name,
        "legal_name": _clean_text(data.get("legal_name")),
        "contact_person": _clean_text(data.get("contact_person")),
        "phone": _clean_text(data.get("phone")),
        "mobile": _clean_text(data.get("mobile")),
        "whatsapp_number": _clean_text(data.get("whatsapp_number")),
        "email": _clean_text(data.get("email")),
        "website": _clean_text(data.get("website")),
        "commercial_registration": _clean_text(
            data.get("commercial_registration")
        ),
        "vat_number": _clean_text(data.get("vat_number")),
        "national_id": _clean_text(data.get("national_id")),
        "country": _clean_text(data.get("country")) or "Saudi Arabia",
        "city": _clean_text(data.get("city")),
        "district": _clean_text(data.get("district")),
        "street": _clean_text(data.get("street")),
        "building_number": _clean_text(data.get("building_number")),
        "additional_number": _clean_text(data.get("additional_number")),
        "postal_code": _clean_text(data.get("postal_code")),
        "short_address": _clean_text(data.get("short_address")),
        "address_line": _clean_text(data.get("address_line")),
        "credit_limit": _clean_decimal(data.get("credit_limit")),
        "opening_balance": _clean_decimal(data.get("opening_balance")),
        "opening_balance_date": data.get("opening_balance_date") or None,
        "payment_terms_days": _clean_int(data.get("payment_terms_days")),
        "tax_exempt": _clean_bool(data.get("tax_exempt")),
        "notes": _clean_text(data.get("notes")),
        "extra_data": data.get("extra_data") if isinstance(data.get("extra_data"), dict) else {},
    }


def create_business_party(
    *,
    company: Company,
    data: dict[str, Any],
    user: User | None = None,
) -> BusinessParty:
    """
    Create a BusinessParty scoped to the current company.
    """
    payload = build_party_payload(
        company=company,
        data=data,
    )

    party = BusinessParty(**payload)
    party.created_by = user
    party.updated_by = user
    party.full_clean()
    party.save()

    return party


def update_business_party(
    *,
    party: BusinessParty,
    data: dict[str, Any],
    user: User | None = None,
) -> BusinessParty:
    """
    Update a BusinessParty without changing tenant ownership.
    """
    payload = build_party_payload(
        company=party.company,
        data=data,
        existing_party=party,
    )

    protected_fields = {
        "company",
    }

    for field_name, value in payload.items():
        if field_name in protected_fields:
            continue
        setattr(party, field_name, value)

    party.updated_by = user
    party.full_clean()
    party.save()

    return party


# ============================================================
# Status helpers
# ============================================================

def activate_business_party(
    *,
    party: BusinessParty,
    user: User | None = None,
) -> BusinessParty:
    party.activate(user=user)
    party.refresh_from_db()
    return party


def deactivate_business_party(
    *,
    party: BusinessParty,
    user: User | None = None,
) -> BusinessParty:
    party.mark_inactive(user=user)
    party.refresh_from_db()
    return party


def block_business_party(
    *,
    party: BusinessParty,
    reason: str = "",
    user: User | None = None,
) -> BusinessParty:
    party.block(reason=reason, user=user)
    party.refresh_from_db()
    return party


def archive_business_party(
    *,
    party: BusinessParty,
    user: User | None = None,
) -> BusinessParty:
    party.archive(user=user)
    party.refresh_from_db()
    return party