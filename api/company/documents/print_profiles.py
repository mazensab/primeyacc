from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.company.branch_enforcement import require_operational_branch, scope_operational_queryset
from api.permissions import HasAnyCompanyPermission, require_company_permission
from documents.models import DocumentTemplate, DocumentType, PrintProfile
from pos.models import POSRegister


def serialize_print_profile(profile):
    return {
        "id": profile.id,
        "name": profile.name,
        "document_type": profile.document_type,
        "output_format": profile.output_format,
        "paper_size": profile.paper_size,
        "thermal_width": profile.thermal_width,
        "language": profile.language,
        "copies": profile.copies,
        "is_default": profile.is_default,
        "is_active": profile.is_active,
        "branch_id": profile.branch_id,
        "register_id": profile.register_id,
        "template_id": profile.template_id,
        "settings_data": profile.settings_data,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
    }


def _positive_id(value, field):
    if value in [None, ""]:
        return None
    try:
        value = int(value)
    except (TypeError, ValueError):
        raise ValidationError({field: "Invalid id."})
    if value < 1:
        raise ValidationError({field: "Invalid id."})
    return value


@api_view(["GET", "POST"])
@permission_classes([HasAnyCompanyPermission])
def company_print_profiles(request):
    company = request.company

    if request.method == "GET":
        queryset = PrintProfile.objects.filter(company=company).select_related(
            "branch", "register", "template"
        )
        queryset = scope_operational_queryset(
            queryset, request, branch_lookup="branch_id", include_unscoped=True
        )
        document_type = str(request.query_params.get("document_type") or "").strip().upper()
        if document_type:
            queryset = queryset.filter(document_type=document_type)
        return Response({"ok": True, "results": [serialize_print_profile(x) for x in queryset.order_by("document_type", "name")]})

    if not require_company_permission(request, "company.documents.templates.create"):
        return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

    try:
        data = request.data or {}
        branch = None
        register = None
        template = None

        branch_id = _positive_id(data.get("branch_id"), "branch_id")
        register_id = _positive_id(data.get("register_id"), "register_id")
        template_id = _positive_id(data.get("template_id"), "template_id")

        if branch_id:
            branch = require_operational_branch(request, branch_id=branch_id)

        if register_id:
            register = POSRegister.objects.select_related("branch").filter(
                company=company, id=register_id
            ).first()
            if not register:
                raise ValidationError({"register_id": "POS register was not found."})
            require_operational_branch(request, branch_id=register.branch_id)
            if branch and register.branch_id != branch.id:
                raise ValidationError({"register_id": "Register branch mismatch."})
            branch = branch or register.branch

        document_type = str(data.get("document_type") or "").strip().upper()
        if document_type not in {choice.value for choice in DocumentType}:
            raise ValidationError({"document_type": "Invalid document type."})

        if template_id:
            template = DocumentTemplate.objects.filter(company=company, id=template_id).first()
            if not template:
                raise ValidationError({"template_id": "Template was not found."})
            if template.document_type != document_type:
                raise ValidationError({"template_id": "Template document type mismatch."})

        profile = PrintProfile(
            company=company,
            branch=branch,
            register=register,
            template=template,
            name=str(data.get("name") or "").strip(),
            document_type=document_type,
            output_format=str(data.get("output_format") or "WEB_PRINT").strip().upper(),
            paper_size=str(data.get("paper_size") or "A4").strip().upper(),
            thermal_width=str(data.get("thermal_width") or "80MM").strip().upper(),
            language=str(data.get("language") or "ar").strip().lower(),
            copies=int(data.get("copies") or 1),
            is_default=bool(data.get("is_default", False)),
            is_active=bool(data.get("is_active", True)),
            settings_data=data.get("settings_data") if isinstance(data.get("settings_data"), dict) else {},
        )
        profile.save()
        return Response(serialize_print_profile(profile), status=status.HTTP_201_CREATED)

    except (ValidationError, ValueError) as exc:
        errors = getattr(exc, "message_dict", None) or {"detail": getattr(exc, "messages", [str(exc)])}
        return Response({"detail": "Validation error.", "errors": errors}, status=status.HTTP_400_BAD_REQUEST)


company_print_profiles.required_company_permissions = [
    "company.documents.templates.view",
    "company.documents.templates.create",
]
