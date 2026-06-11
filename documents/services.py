# ============================================================
# ًں“‚ documents/services.py
# ًں§  PrimeyAcc | Documents Templates Services V1.0
# ------------------------------------------------------------
# âœ… Tenant-safe document template services
# âœ… Create / update / activate / deactivate
# âœ… Set default template per company and document type
# âœ… Resolve default template safely
# ------------------------------------------------------------
# ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:
# - ظ„ط§ ظ†ط«ظ‚ ط¨ط£ظٹ company_id ظ‚ط§ط¯ظ… ظ…ظ† ط§ظ„ظپط±ظˆظ†طھ
# - ط§ظ„ط´ط±ظƒط© طھط¤ط®ط° ظ…ظ† CompanyMembership ط§ظ„ط­ط§ظ„ظٹ ظپظ‚ط·
# - ظ„ط§ ظٹظˆط¬ط¯ ط£ظƒط«ط± ظ…ظ† ظ‚ط§ظ„ط¨ ط§ظپطھط±ط§ط¶ظٹ ظ„ظ†ظپط³ ط§ظ„ط´ط±ظƒط© ظˆظ†ظپط³ ظ†ظˆط¹ ط§ظ„ظ…ط³طھظ†ط¯
# - ط§ظ„ظ‚ط§ظ„ط¨ ط؛ظٹط± ط§ظ„ظ†ط´ط· ظ„ط§ ظٹظ…ظƒظ† ط¬ط¹ظ„ظ‡ ط§ظپطھط±ط§ط¶ظٹظ‹ط§
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction

from companies.models import Company

from .models import DocumentTemplate, DocumentType


DOCUMENT_TEMPLATE_MUTABLE_FIELDS = {
    "name",
    "document_type",
    "layout_style",
    "primary_color",
    "secondary_color",
    "show_logo",
    "show_qr",
    "show_vat_number",
    "show_commercial_registration",
    "header_text",
    "footer_text",
    "terms_and_conditions",
    "is_active",
    "extra_data",
    "notes",
}


def get_company_document_templates(
    *,
    company: Company,
    document_type: str | None = None,
    is_active: bool | None = None,
):
    """
    Return document templates scoped to one company only.
    """

    queryset = DocumentTemplate.objects.filter(company=company).select_related(
        "company",
        "created_by",
        "updated_by",
    )

    if document_type:
        queryset = queryset.filter(document_type=document_type)

    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    return queryset.order_by("document_type", "-is_default", "name")


def get_company_document_template_or_raise(
    *,
    company: Company,
    template_id: int,
) -> DocumentTemplate:
    """
    Resolve one template within the current company boundary.
    """

    try:
        return DocumentTemplate.objects.select_related(
            "company",
            "created_by",
            "updated_by",
        ).get(company=company, id=template_id)
    except DocumentTemplate.DoesNotExist as exc:
        raise ValidationError("Document template was not found.") from exc


def get_default_document_template(
    *,
    company: Company,
    document_type: str,
) -> DocumentTemplate | None:
    """
    Return active default template for a company and document type.
    """

    return (
        DocumentTemplate.objects.filter(
            company=company,
            document_type=document_type,
            is_default=True,
            is_active=True,
        )
        .select_related("company")
        .first()
    )


@transaction.atomic
def create_document_template(
    *,
    company: Company,
    user,
    data: dict[str, Any],
) -> DocumentTemplate:
    """
    Create a document template safely inside one company.
    """

    payload = {
        field: data[field]
        for field in DOCUMENT_TEMPLATE_MUTABLE_FIELDS
        if field in data
    }

    if not payload.get("name"):
        raise ValidationError({"name": "Template name is required."})

    if not payload.get("document_type"):
        raise ValidationError({"document_type": "Document type is required."})

    document_type = payload["document_type"]
    allowed_types = {choice.value for choice in DocumentType}

    if document_type not in allowed_types:
        raise ValidationError({"document_type": "Invalid document type."})

    is_default = bool(data.get("is_default", False))

    if is_default:
        DocumentTemplate.objects.filter(
            company=company,
            document_type=document_type,
            is_default=True,
        ).update(is_default=False)

    template = DocumentTemplate(
        company=company,
        created_by=user,
        updated_by=user,
        is_default=is_default,
        **payload,
    )

    template.full_clean()
    template.save()
    return template


@transaction.atomic
def update_document_template(
    *,
    company: Company,
    template_id: int,
    user,
    data: dict[str, Any],
) -> DocumentTemplate:
    """
    Update a document template within the current company only.
    """

    template = get_company_document_template_or_raise(
        company=company,
        template_id=template_id,
    )

    old_document_type = template.document_type

    for field in DOCUMENT_TEMPLATE_MUTABLE_FIELDS:
        if field in data:
            setattr(template, field, data[field])

    template.updated_by = user
    template.full_clean()

    if template.is_default:
        DocumentTemplate.objects.filter(
            company=company,
            document_type=template.document_type,
            is_default=True,
        ).exclude(id=template.id).update(is_default=False)

    if old_document_type != template.document_type and template.is_default:
        DocumentTemplate.objects.filter(
            company=company,
            document_type=old_document_type,
            is_default=True,
        ).exclude(id=template.id).update(is_default=False)

    template.save()
    return template


@transaction.atomic
def set_default_document_template(
    *,
    company: Company,
    template_id: int,
    user,
) -> DocumentTemplate:
    """
    Mark one active template as default for its document type.
    """

    template = get_company_document_template_or_raise(
        company=company,
        template_id=template_id,
    )

    if not template.is_active:
        raise ValidationError("Inactive template cannot be set as default.")

    DocumentTemplate.objects.filter(
        company=company,
        document_type=template.document_type,
        is_default=True,
    ).exclude(id=template.id).update(is_default=False)

    template.is_default = True
    template.updated_by = user
    template.full_clean()
    template.save(update_fields=["is_default", "updated_by", "updated_at"])

    return template


@transaction.atomic
def deactivate_document_template(
    *,
    company: Company,
    template_id: int,
    user,
) -> DocumentTemplate:
    """
    Deactivate a template safely.

    Default templates cannot be deactivated until another default is selected.
    """

    template = get_company_document_template_or_raise(
        company=company,
        template_id=template_id,
    )

    if template.is_default:
        raise ValidationError("Default template cannot be deactivated.")

    template.is_active = False
    template.updated_by = user
    template.full_clean()
    template.save(update_fields=["is_active", "updated_by", "updated_at"])

    return template


@transaction.atomic
def activate_document_template(
    *,
    company: Company,
    template_id: int,
    user,
) -> DocumentTemplate:
    """
    Reactivate a template safely.
    """

    template = get_company_document_template_or_raise(
        company=company,
        template_id=template_id,
    )

    template.is_active = True
    template.updated_by = user
    template.full_clean()
    template.save(update_fields=["is_active", "updated_by", "updated_at"])

    return template

