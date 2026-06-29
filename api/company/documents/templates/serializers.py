# ============================================================
# 📂 api/company/documents/templates/serializers.py
# 🧠 Mhamcloud | Company Document Templates Serializers V1.0
# ============================================================

from __future__ import annotations

from documents.models import DocumentTemplate


def serialize_document_template(template: DocumentTemplate) -> dict:
    return {
        "id": template.id,
        "company_id": template.company_id,
        "name": template.name,
        "document_type": template.document_type,
        "layout_style": template.layout_style,
        "primary_color": template.primary_color,
        "secondary_color": template.secondary_color,
        "show_logo": template.show_logo,
        "show_qr": template.show_qr,
        "show_vat_number": template.show_vat_number,
        "show_commercial_registration": template.show_commercial_registration,
        "header_text": template.header_text,
        "footer_text": template.footer_text,
        "terms_and_conditions": template.terms_and_conditions,
        "is_default": template.is_default,
        "is_active": template.is_active,
        "extra_data": template.extra_data,
        "notes": template.notes,
        "created_by_id": template.created_by_id,
        "updated_by_id": template.updated_by_id,
        "created_at": template.created_at.isoformat() if template.created_at else None,
        "updated_at": template.updated_at.isoformat() if template.updated_at else None,
    }
