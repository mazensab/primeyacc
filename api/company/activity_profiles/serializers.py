# ============================================================
# 📂 api/company/activity_profiles/serializers.py
# 🧠 Mhamcloud | Activity Profiles Serializers
# ------------------------------------------------------------
# ✅ ActivityProfile serializer
# ✅ Current company activity serializer
# ✅ Safe response payloads
# ✅ No frontend company_id trust
# ============================================================

from __future__ import annotations

from companies.models import ActivityProfile, Company


def serialize_activity_profile(profile: ActivityProfile | None) -> dict | None:
    """
    Serialize one activity profile safely.
    """

    if profile is None:
        return None

    return {
        "id": profile.id,
        "company_id": profile.company_id,
        "code": profile.code,
        "name": profile.name,
        "name_ar": profile.name_ar,
        "name_en": profile.name_en,
        "display_name": profile.display_name,
        "description": profile.description,
        "is_system": profile.is_system,
        "is_active": profile.is_active,
        "default_settings": profile.default_settings,
        "extra_data": profile.extra_data,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
    }


def serialize_company_activity(company: Company) -> dict:
    """
    Serialize current company's legacy and expandable activity profile state.
    """

    return {
        "company_id": company.id,
        "legacy_activity_profile": company.activity_profile,
        "activity_profile": serialize_activity_profile(company.activity_profile_ref),
    }
