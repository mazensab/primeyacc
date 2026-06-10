# ============================================================
# 📂 api/company/hr/leave_types/serializers.py
# 🧠 PrimeyAcc | Company HR Leave Types Serializers V1.0
# ------------------------------------------------------------
# ✅ Serialize leave types
# ✅ Build service-safe payloads
# ✅ Ignore frontend company_id
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError

from hr.models import LeaveType, LeaveTypeUnit


def serialize_leave_type(leave_type: LeaveType) -> dict:
    """
    API representation for LeaveType.
    """

    return {
        "id": leave_type.id,
        "company": {
            "id": leave_type.company_id,
            "name": leave_type.company.display_name if leave_type.company_id else "",
        },
        "name": leave_type.name,
        "code": leave_type.code,
        "unit": leave_type.unit,
        "unit_label": leave_type.get_unit_display(),
        "annual_allowance": str(leave_type.annual_allowance),
        "is_paid": leave_type.is_paid,
        "requires_approval": leave_type.requires_approval,
        "allow_half_day": leave_type.allow_half_day,
        "allow_negative_balance": leave_type.allow_negative_balance,
        "is_active": leave_type.is_active,
        "notes": leave_type.notes,
        "created_at": leave_type.created_at.isoformat() if leave_type.created_at else None,
        "updated_at": leave_type.updated_at.isoformat() if leave_type.updated_at else None,
    }


def serialize_leave_type_choices() -> dict:
    """
    Choices payload for frontend forms.
    """

    return {
        "units": [
            {
                "value": value,
                "label": label,
            }
            for value, label in LeaveTypeUnit.choices
        ],
    }


def build_leave_type_data_from_request(payload: dict) -> dict:
    """
    Build service-safe leave type data from request payload.
    """

    data = dict(payload or {})

    data.pop("company", None)
    data.pop("company_id", None)
    data.pop("created_by", None)
    data.pop("updated_by", None)

    allowed_fields = [
        "name",
        "code",
        "unit",
        "annual_allowance",
        "is_paid",
        "requires_approval",
        "allow_half_day",
        "allow_negative_balance",
        "is_active",
        "notes",
    ]

    return {
        field_name: data.get(field_name)
        for field_name in allowed_fields
        if field_name in data
    }


def validate_leave_type_required_fields(data: dict) -> None:
    """
    Validate minimal required API fields.
    """

    errors = {}

    if not data.get("name"):
        errors["name"] = "Name is required."

    if not data.get("code"):
        errors["code"] = "Code is required."

    if errors:
        raise ValidationError(errors)