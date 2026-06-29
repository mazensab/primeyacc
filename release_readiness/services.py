# ============================================================
# 📂 release_readiness/services.py
# 🧠 Mhamcloud | Backend Release Readiness Services v1
# ============================================================
# ✅ Release readiness payload builder
# ✅ API contract validation
# ✅ Installed app readiness checks
# ✅ Stable JSON response helpers
# ============================================================
# القاعدة المعتمدة:
# - لا يتم كسر أي API سابق.
# - لا يتم تعديل بيانات قاعدة البيانات.
# - الفحص هنا Read-only بالكامل.
# ============================================================

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.apps import apps

from .contracts import API_CONTRACTS, contract_payload, grouped_contract_payload


REQUIRED_RELEASE_APPS: tuple[str, ...] = (
    "companies",
    "subscriptions",
    "sales",
    "purchases",
    "inventory",
    "accounting",
    "treasury",
    "payments",
    "reports",
    "documents",
    "business_controls",
    "activity_backends",
    "release_readiness",
)


@dataclass(frozen=True)
class ReadinessCheckResult:
    key: str
    label: str
    status: str
    message: str
    severity: str = "info"

    def as_dict(self) -> dict[str, str]:
        return {
            "key": self.key,
            "label": self.label,
            "status": self.status,
            "message": self.message,
            "severity": self.severity,
        }


def _success_response(message: str, data: Any | None = None, meta: dict | None = None) -> dict:
    return {
        "success": True,
        "message": message,
        "data": data if data is not None else {},
        "errors": [],
        "meta": meta or {},
    }


def _installed_app_labels() -> set[str]:
    return {app_config.label for app_config in apps.get_app_configs()}


def validate_installed_apps() -> ReadinessCheckResult:
    installed = _installed_app_labels()
    missing = [app_label for app_label in REQUIRED_RELEASE_APPS if app_label not in installed]

    if missing:
        return ReadinessCheckResult(
            key="installed_apps",
            label="Installed apps",
            status="warning",
            message=f"Missing optional/required release apps: {', '.join(missing)}",
            severity="warning",
        )

    return ReadinessCheckResult(
        key="installed_apps",
        label="Installed apps",
        status="passed",
        message="All release readiness app labels are installed.",
        severity="info",
    )


def validate_contract_registry() -> ReadinessCheckResult:
    keys = [contract.key for contract in API_CONTRACTS]
    duplicates = sorted({key for key in keys if keys.count(key) > 1})

    if duplicates:
        return ReadinessCheckResult(
            key="api_contract_registry",
            label="API contract registry",
            status="failed",
            message=f"Duplicate API contract keys found: {', '.join(duplicates)}",
            severity="error",
        )

    if not keys:
        return ReadinessCheckResult(
            key="api_contract_registry",
            label="API contract registry",
            status="failed",
            message="API contract registry is empty.",
            severity="error",
        )

    return ReadinessCheckResult(
        key="api_contract_registry",
        label="API contract registry",
        status="passed",
        message=f"{len(keys)} API contracts registered.",
        severity="info",
    )


def validate_contract_paths() -> ReadinessCheckResult:
    invalid = [
        contract.key
        for contract in API_CONTRACTS
        if not contract.base_path.startswith("/api/") or not contract.base_path.endswith("/")
    ]

    if invalid:
        return ReadinessCheckResult(
            key="api_contract_paths",
            label="API contract paths",
            status="failed",
            message=f"Invalid API contract paths: {', '.join(invalid)}",
            severity="error",
        )

    return ReadinessCheckResult(
        key="api_contract_paths",
        label="API contract paths",
        status="passed",
        message="All registered API contract paths use normalized /api/.../ format.",
        severity="info",
    )


def validate_company_scope() -> ReadinessCheckResult:
    company_contracts = [contract for contract in API_CONTRACTS if contract.company_scoped]
    invalid = [
        contract.key
        for contract in company_contracts
        if "/company/" not in contract.base_path
    ]

    if invalid:
        return ReadinessCheckResult(
            key="company_scope",
            label="Company API scope",
            status="failed",
            message=f"Company-scoped contracts without /company/ path: {', '.join(invalid)}",
            severity="error",
        )

    return ReadinessCheckResult(
        key="company_scope",
        label="Company API scope",
        status="passed",
        message=f"{len(company_contracts)} company-scoped contracts are normalized.",
        severity="info",
    )


def build_readiness_checks() -> list[ReadinessCheckResult]:
    return [
        validate_installed_apps(),
        validate_contract_registry(),
        validate_contract_paths(),
        validate_company_scope(),
    ]


def build_release_readiness_payload() -> dict:
    checks = build_readiness_checks()
    failed = [check for check in checks if check.status == "failed"]
    warnings = [check for check in checks if check.status == "warning"]

    status = "ready"
    if failed:
        status = "blocked"
    elif warnings:
        status = "ready_with_warnings"

    data = {
        "status": status,
        "phase": "Mhamcloud Phase 27",
        "title": "Backend Release Readiness and API Contract Final Closure",
        "summary": {
            "contracts_count": len(API_CONTRACTS),
            "checks_count": len(checks),
            "failed_count": len(failed),
            "warning_count": len(warnings),
            "company_scoped_contracts": len([contract for contract in API_CONTRACTS if contract.company_scoped]),
            "system_scoped_contracts": len([contract for contract in API_CONTRACTS if contract.scope == "system"]),
        },
        "checks": [check.as_dict() for check in checks],
        "contracts": contract_payload(),
        "contracts_by_scope": grouped_contract_payload(),
    }

    return _success_response(
        message="Backend release readiness payload generated.",
        data=data,
        meta={
            "contract_version": "v1",
            "safe_mode": True,
            "read_only": True,
        },
    )


def build_api_error_response(message: str, *, status_code: int, errors: list | None = None) -> dict:
    return {
        "success": False,
        "message": message,
        "data": {},
        "errors": errors or [],
        "meta": {
            "status_code": status_code,
            "contract_version": "v1",
        },
    }
