# ============================================================
# 📂 release_readiness/contracts.py
# 🧠 PrimeyAcc | API Contract Registry v1
# ============================================================
# ✅ Central backend API contract registry
# ✅ Release-readiness API map
# ✅ Stable response contract metadata
# ✅ Company/system scope documentation
# ============================================================
# القاعدة المعتمدة:
# - هذا الملف لا يغير منطق الوحدات السابقة.
# - هذا الملف يوثق عقود API الحالية ويخدم فحوصات الجاهزية.
# - أي مسار جديد مستقبلا يضاف هنا بدون كسر التوافق السابق.
# ============================================================

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class APIContract:
    key: str
    module: str
    scope: str
    base_path: str
    methods: tuple[str, ...]
    description: str
    response_shape: str = "object"
    requires_auth: bool = True
    company_scoped: bool = False
    release_critical: bool = True

    def as_dict(self) -> dict:
        return {
            "key": self.key,
            "module": self.module,
            "scope": self.scope,
            "base_path": self.base_path,
            "methods": list(self.methods),
            "description": self.description,
            "response_shape": self.response_shape,
            "requires_auth": self.requires_auth,
            "company_scoped": self.company_scoped,
            "release_critical": self.release_critical,
        }


API_CONTRACTS: tuple[APIContract, ...] = (
    APIContract(
        key="auth",
        module="Authentication",
        scope="auth",
        base_path="/api/auth/",
        methods=("GET", "POST"),
        description="CSRF, login, logout, whoami, change password, and profile contract.",
        company_scoped=False,
    ),
    APIContract(
        key="system-users",
        module="System Users",
        scope="system",
        base_path="/api/users/",
        methods=("GET", "POST", "PATCH"),
        description="System user list, detail, create, activation, deactivation, and password-link contract.",
        company_scoped=False,
    ),
    APIContract(
        key="companies",
        module="Companies",
        scope="system",
        base_path="/api/system/companies/",
        methods=("GET", "POST", "PATCH"),
        description="System companies and tenant management contract.",
        company_scoped=False,
    ),
    APIContract(
        key="subscriptions",
        module="Subscriptions",
        scope="system",
        base_path="/api/system/subscriptions/",
        methods=("GET", "POST", "PATCH"),
        description="Platform subscriptions, pending payment, renewal, change plan, and confirmation contract.",
        company_scoped=False,
    ),
    APIContract(
        key="customers",
        module="Customers",
        scope="company",
        base_path="/api/company/customers/",
        methods=("GET", "POST", "PATCH"),
        description="Company customers list, create, detail, update, and statement contract.",
        company_scoped=True,
    ),
    APIContract(
        key="products",
        module="Products",
        scope="company",
        base_path="/api/company/products/",
        methods=("GET", "POST", "PATCH"),
        description="Company products catalog contract.",
        company_scoped=True,
    ),
    APIContract(
        key="orders",
        module="Orders",
        scope="company",
        base_path="/api/company/orders/",
        methods=("GET", "POST", "PATCH"),
        description="Company order lifecycle contract.",
        company_scoped=True,
    ),
    APIContract(
        key="sales",
        module="Sales",
        scope="company",
        base_path="/api/company/sales/",
        methods=("GET", "POST", "PATCH"),
        description="Sales quotations, orders, invoices, fulfillment, and reports contract.",
        company_scoped=True,
    ),
    APIContract(
        key="purchases",
        module="Purchases",
        scope="company",
        base_path="/api/company/purchases/",
        methods=("GET", "POST", "PATCH"),
        description="Purchase orders, receipts, returns, supplier invoices, and reports contract.",
        company_scoped=True,
    ),
    APIContract(
        key="inventory",
        module="Inventory",
        scope="company",
        base_path="/api/company/inventory/",
        methods=("GET", "POST", "PATCH"),
        description="Inventory locations, stock movements, reservations, goods issues, counts, and valuation contract.",
        company_scoped=True,
    ),
    APIContract(
        key="accounting",
        module="Accounting",
        scope="company",
        base_path="/api/company/accounting/",
        methods=("GET", "POST"),
        description="Chart of accounts, journals, ledger, trial balance, profit and loss, and balance sheet contract.",
        company_scoped=True,
    ),
    APIContract(
        key="treasury",
        module="Treasury",
        scope="company",
        base_path="/api/company/treasury/",
        methods=("GET", "POST", "PATCH"),
        description="Cashboxes, banks, treasury movements, transfers, and statements contract.",
        company_scoped=True,
    ),
    APIContract(
        key="payments",
        module="Payments",
        scope="company",
        base_path="/api/company/payments/",
        methods=("GET", "POST", "PATCH"),
        description="Payments, checkout sessions, webhooks, and settlements contract.",
        company_scoped=True,
    ),
    APIContract(
        key="reports",
        module="Reports",
        scope="company",
        base_path="/api/company/reports/",
        methods=("GET", "POST"),
        description="Company reports overview and export contract.",
        company_scoped=True,
    ),
    APIContract(
        key="documents",
        module="Documents",
        scope="company",
        base_path="/api/company/documents/",
        methods=("GET", "POST"),
        description="Document templates, render payload, web print, PDF, and thermal print contract.",
        company_scoped=True,
    ),
    APIContract(
        key="whatsapp",
        module="WhatsApp",
        scope="company",
        base_path="/api/company/whatsapp/",
        methods=("GET", "POST"),
        description="WhatsApp status, templates, logs, inbox, webhook, send test, and broadcasts contract.",
        company_scoped=True,
    ),
    APIContract(
        key="business-controls",
        module="Business Controls",
        scope="company",
        base_path="/api/company/business-controls/",
        methods=("GET", "POST"),
        description="Numbering, approvals, audit, scheduled reports, exports, alerts, and final safe integration contract.",
        company_scoped=True,
    ),
    APIContract(
        key="activity-backends",
        module="Activity Backends",
        scope="company",
        base_path="/api/company/activity-backends/",
        methods=("GET", "POST"),
        description="Restaurant, clinic, and contracting activity-specific backend foundation contract.",
        company_scoped=True,
    ),
    APIContract(
        key="release-readiness",
        module="Release Readiness",
        scope="system",
        base_path="/api/system/release-readiness/",
        methods=("GET",),
        description="Backend release readiness and API contract registry contract.",
        company_scoped=False,
    ),
)


def iter_contracts() -> Iterable[APIContract]:
    return iter(API_CONTRACTS)


def contract_payload() -> list[dict]:
    return [contract.as_dict() for contract in API_CONTRACTS]


def contract_keys() -> set[str]:
    return {contract.key for contract in API_CONTRACTS}


def release_critical_contracts() -> list[APIContract]:
    return [contract for contract in API_CONTRACTS if contract.release_critical]


def grouped_contract_payload() -> dict:
    grouped: dict[str, list[dict]] = {}

    for contract in API_CONTRACTS:
        grouped.setdefault(contract.scope, []).append(contract.as_dict())

    return grouped
