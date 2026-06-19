# ============================================================
# 📂 release_readiness/checks.py
# 🧠 PrimeyAcc | Safe Django System Checks
# ============================================================
# ✅ Validates internal release readiness contract registry
# ✅ Keeps manage.py check clean unless a real registry error exists
# ✅ Does not touch database data
# ============================================================

from __future__ import annotations

from django.core.checks import Error, Tags, register

from .services import validate_contract_paths, validate_contract_registry


@register(Tags.compatibility)
def release_readiness_contract_checks(app_configs, **kwargs):
    errors = []

    registry_result = validate_contract_registry()
    if registry_result.status == "failed":
        errors.append(
            Error(
                registry_result.message,
                id="release_readiness.E001",
            )
        )

    paths_result = validate_contract_paths()
    if paths_result.status == "failed":
        errors.append(
            Error(
                paths_result.message,
                id="release_readiness.E002",
            )
        )

    return errors
