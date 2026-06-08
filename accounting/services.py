# ============================================================
# 📂 accounting/services.py
# 🧠 PrimeyAcc | Accounting Services - Phase 9.2 Part 1
# ------------------------------------------------------------
# ✅ زرع شجرة الحسابات السعودية لكل شركة
# ✅ نفس شجرة PrimeyCare كأساس
# ✅ عزل كامل حسب الشركة
# ✅ VAT 15%
# ✅ AccountingSettings لكل شركة
# ✅ Routing Rules أساسية
# ✅ لا يعتمد على company_id من الفرونت
# ============================================================

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from accounting.models import (
    Account,
    AccountNature,
    AccountType,
    AccountingAccountPurpose,
    AccountingPeriodStatus,
    AccountingRoutingRule,
    AccountingRoutingSource,
    AccountingSettings,
    CostCenter,
    JournalEntry,
    JournalEntryLine,
    JournalEntryStatus,
    PostingSource,
    TaxDirection,
    TaxRate,
    TaxType,
)


# ============================================================
# 🧾 DTOs
# ============================================================

@dataclass(frozen=True, slots=True)
class AccountSeedRow:
    code: str
    name_ar: str
    name_en: str
    account_type: str
    nature: str
    parent_code: str | None
    is_group: bool
    is_active: bool = True
    allow_manual_posting: bool = True
    is_system: bool = False
    description: str = ""
    purpose: str = AccountingAccountPurpose.OTHER


@dataclass(frozen=True, slots=True)
class RoutingSeedRow:
    source: str
    purpose: str
    account_code: str
    description: str = ""


# ============================================================
# 🌳 Default Saudi Chart of Accounts
# نفس الشجرة المعتمدة من PrimeyCare مع تكييف PrimeyAcc
# ============================================================

CHART_OF_ACCOUNTS: list[AccountSeedRow] = [
    # ========================================================
    # 1 الأصول
    # ========================================================
    AccountSeedRow("1", "الأصول", "Assets", AccountType.ASSET, AccountNature.DEBIT, None, True, is_system=True),
    AccountSeedRow("11", "الأصول المتداولة", "Current Assets", AccountType.ASSET, AccountNature.DEBIT, "1", True, is_system=True),

    AccountSeedRow("1101", "النقد وما في حكمه", "Cash and Cash Equivalents", AccountType.ASSET, AccountNature.DEBIT, "11", True, is_system=True),
    AccountSeedRow("110101", "النقدية في الخزينة", "Cash on Hand", AccountType.ASSET, AccountNature.DEBIT, "1101", False, is_system=True, description="حساب الصناديق النقدية الرئيسي", purpose=AccountingAccountPurpose.CASH),
    AccountSeedRow("110102", "العهد النقدية", "Petty Cash", AccountType.ASSET, AccountNature.DEBIT, "1101", False),
    AccountSeedRow("110103", "محافظ إلكترونية", "Digital Wallets", AccountType.ASSET, AccountNature.DEBIT, "1101", False),

    AccountSeedRow("1102", "النقدية في البنوك", "Cash at Banks", AccountType.ASSET, AccountNature.DEBIT, "11", True, is_system=True),
    AccountSeedRow("110201", "حساب البنك الجاري", "Current Bank Account", AccountType.ASSET, AccountNature.DEBIT, "1102", False, is_system=True, purpose=AccountingAccountPurpose.BANK),
    AccountSeedRow("110202", "حساب بنكي آخر", "Other Bank Account", AccountType.ASSET, AccountNature.DEBIT, "1102", False),

    AccountSeedRow("1103", "الذمم المدينة - العملاء", "Accounts Receivable - Customers", AccountType.ASSET, AccountNature.DEBIT, "11", False, is_system=True, purpose=AccountingAccountPurpose.ACCOUNTS_RECEIVABLE),

    AccountSeedRow("1104", "تسويات بوابات الدفع", "Payment Gateway Clearing", AccountType.ASSET, AccountNature.DEBIT, "11", True, is_system=True),
    AccountSeedRow("110401", "تسوية ميسر", "Moyasar Clearing", AccountType.ASSET, AccountNature.DEBIT, "1104", False, is_system=True),
    AccountSeedRow("110402", "تسوية تاب", "Tap Clearing", AccountType.ASSET, AccountNature.DEBIT, "1104", False, is_system=True),
    AccountSeedRow("110403", "تسوية تمارا", "Tamara Clearing", AccountType.ASSET, AccountNature.DEBIT, "1104", False, is_system=True),
    AccountSeedRow("110404", "تسوية تابي", "Tabby Clearing", AccountType.ASSET, AccountNature.DEBIT, "1104", False, is_system=True),

    AccountSeedRow("1105", "مصروفات مقدمة", "Prepaid Expenses", AccountType.ASSET, AccountNature.DEBIT, "11", True),
    AccountSeedRow("110501", "تأمين طبي مقدم", "Prepaid Medical Insurance", AccountType.ASSET, AccountNature.DEBIT, "1105", False),
    AccountSeedRow("110502", "إيجار مقدم", "Prepaid Rent", AccountType.ASSET, AccountNature.DEBIT, "1105", False),
    AccountSeedRow("110503", "اشتراكات مقدمة", "Prepaid Subscriptions", AccountType.ASSET, AccountNature.DEBIT, "1105", False),

    AccountSeedRow("1106", "مدفوعات مقدمة للموظفين", "Employee Advances", AccountType.ASSET, AccountNature.DEBIT, "11", False),
    AccountSeedRow("1107", "مدفوعات مقدمة للمزودين", "Provider Advances", AccountType.ASSET, AccountNature.DEBIT, "11", False),
    AccountSeedRow("1108", "المخزون", "Inventory", AccountType.ASSET, AccountNature.DEBIT, "11", False, is_system=True, purpose=AccountingAccountPurpose.INVENTORY),

    AccountSeedRow("1109", "العهد التشغيلية", "Operational Custodies", AccountType.ASSET, AccountNature.DEBIT, "11", True, is_system=True),
    AccountSeedRow("110901", "عهدة المندوبين", "Agent Custody", AccountType.ASSET, AccountNature.DEBIT, "1109", False, is_system=True, description="مبالغ تشغيلية محصلة بواسطة مندوبين ولم تورد بعد"),
    AccountSeedRow("110902", "عهدة الوسطاء", "Broker Custody", AccountType.ASSET, AccountNature.DEBIT, "1109", False, is_system=True, description="مبالغ تشغيلية على الوسطاء ولم تورد بعد"),

    AccountSeedRow("12", "الأصول غير المتداولة", "Non-current Assets", AccountType.ASSET, AccountNature.DEBIT, "1", True),
    AccountSeedRow("1201", "العقارات والآلات والمعدات", "Property, Plant and Equipment", AccountType.ASSET, AccountNature.DEBIT, "12", True),
    AccountSeedRow("120101", "الأراضي", "Land", AccountType.ASSET, AccountNature.DEBIT, "1201", False),
    AccountSeedRow("120102", "المباني", "Buildings", AccountType.ASSET, AccountNature.DEBIT, "1201", False),
    AccountSeedRow("120103", "المعدات", "Equipment", AccountType.ASSET, AccountNature.DEBIT, "1201", False),
    AccountSeedRow("120104", "أجهزة مكتبية وطابعات", "Office Equipment and Printers", AccountType.ASSET, AccountNature.DEBIT, "1201", False),
    AccountSeedRow("120105", "أجهزة حاسب وبرمجيات", "Computers and Software", AccountType.ASSET, AccountNature.DEBIT, "1201", False),
    AccountSeedRow("1202", "الأصول غير الملموسة", "Intangible Assets", AccountType.ASSET, AccountNature.DEBIT, "12", False),

    # ========================================================
    # 2 الالتزامات
    # ========================================================
    AccountSeedRow("2", "الالتزامات", "Liabilities", AccountType.LIABILITY, AccountNature.CREDIT, None, True, is_system=True),
    AccountSeedRow("21", "الالتزامات المتداولة", "Current Liabilities", AccountType.LIABILITY, AccountNature.CREDIT, "2", True, is_system=True),

    AccountSeedRow("2101", "الذمم الدائنة - الموردون", "Accounts Payable - Suppliers", AccountType.LIABILITY, AccountNature.CREDIT, "21", False, is_system=True, purpose=AccountingAccountPurpose.ACCOUNTS_PAYABLE),
    AccountSeedRow("2102", "مصروفات مستحقة", "Accrued Expenses", AccountType.LIABILITY, AccountNature.CREDIT, "21", False, is_system=True),
    AccountSeedRow("2103", "رواتب مستحقة", "Accrued Salaries", AccountType.LIABILITY, AccountNature.CREDIT, "21", False),
    AccountSeedRow("2104", "قروض قصيرة الأجل", "Short-term Loans", AccountType.LIABILITY, AccountNature.CREDIT, "21", False),

    AccountSeedRow("2105", "ضريبة القيمة المضافة المستحقة", "VAT Payable", AccountType.LIABILITY, AccountNature.CREDIT, "21", False, is_system=True, purpose=AccountingAccountPurpose.VAT_PAYABLE),
    AccountSeedRow("210501", "ضريبة مخرجات", "Output VAT", AccountType.LIABILITY, AccountNature.CREDIT, "21", False, is_system=True, purpose=AccountingAccountPurpose.OUTPUT_VAT),
    AccountSeedRow("210502", "ضريبة مدخلات", "Input VAT", AccountType.LIABILITY, AccountNature.CREDIT, "21", False, is_system=True, purpose=AccountingAccountPurpose.INPUT_VAT),

    AccountSeedRow("2106", "ضرائب ورسوم مستحقة", "Taxes and Fees Payable", AccountType.LIABILITY, AccountNature.CREDIT, "21", False),
    AccountSeedRow("2107", "إيرادات غير مكتسبة", "Unearned Revenue", AccountType.LIABILITY, AccountNature.CREDIT, "21", False, is_system=True),
    AccountSeedRow("2108", "مستحقات التأمينات الاجتماعية", "GOSI Payable", AccountType.LIABILITY, AccountNature.CREDIT, "21", False),

    AccountSeedRow("2110", "مستحقات المندوبين", "Agent Payables", AccountType.LIABILITY, AccountNature.CREDIT, "21", False, is_system=True, description="مستحقات عمولات وقيم تشغيل للمندوبين"),
    AccountSeedRow("2111", "مستحقات مزودي الخدمة", "Provider Payables", AccountType.LIABILITY, AccountNature.CREDIT, "21", False, is_system=True),
    AccountSeedRow("2112", "مستحقات بوابات الدفع", "Gateway Payables", AccountType.LIABILITY, AccountNature.CREDIT, "21", False, is_system=True),
    AccountSeedRow("2113", "مستحقات الوسطاء", "Broker Payables", AccountType.LIABILITY, AccountNature.CREDIT, "21", False, is_system=True, description="مستحقات الوسطاء والوكلاء"),

    AccountSeedRow("2120", "مجمع الإهلاك", "Accumulated Depreciation", AccountType.LIABILITY, AccountNature.CREDIT, "21", True),
    AccountSeedRow("212001", "مجمع إهلاك المباني", "Accumulated Depreciation - Buildings", AccountType.LIABILITY, AccountNature.CREDIT, "2120", False),
    AccountSeedRow("212002", "مجمع إهلاك المعدات", "Accumulated Depreciation - Equipment", AccountType.LIABILITY, AccountNature.CREDIT, "2120", False),
    AccountSeedRow("212003", "مجمع إهلاك أجهزة مكتبية وطابعات", "Accumulated Depreciation - Office Equipment", AccountType.LIABILITY, AccountNature.CREDIT, "2120", False),

    AccountSeedRow("22", "الالتزامات غير المتداولة", "Non-current Liabilities", AccountType.LIABILITY, AccountNature.CREDIT, "2", True),
    AccountSeedRow("2201", "قروض طويلة الأجل", "Long-term Loans", AccountType.LIABILITY, AccountNature.CREDIT, "22", False),
    AccountSeedRow("2202", "مخصص مكافأة نهاية الخدمة", "End of Service Benefit Provision", AccountType.LIABILITY, AccountNature.CREDIT, "22", False),

    # ========================================================
    # 3 حقوق الملكية
    # ========================================================
    AccountSeedRow("3", "حقوق الملكية", "Equity", AccountType.EQUITY, AccountNature.CREDIT, None, True, is_system=True),
    AccountSeedRow("31", "رأس المال", "Capital", AccountType.EQUITY, AccountNature.CREDIT, "3", True),
    AccountSeedRow("3101", "رأس المال المسجل", "Registered Capital", AccountType.EQUITY, AccountNature.CREDIT, "31", False),
    AccountSeedRow("3102", "رأس المال الإضافي المدفوع", "Additional Paid-in Capital", AccountType.EQUITY, AccountNature.CREDIT, "31", False),

    AccountSeedRow("32", "حقوق ملكية أخرى", "Other Equity", AccountType.EQUITY, AccountNature.CREDIT, "3", True),
    AccountSeedRow("3201", "أرصدة افتتاحية", "Opening Balances Equity", AccountType.EQUITY, AccountNature.CREDIT, "32", False, is_system=True, purpose=AccountingAccountPurpose.OPENING_EQUITY),

    AccountSeedRow("33", "احتياطيات", "Reserves", AccountType.EQUITY, AccountNature.CREDIT, "3", True),
    AccountSeedRow("3301", "احتياطي نظامي", "Statutory Reserve", AccountType.EQUITY, AccountNature.CREDIT, "33", False),

    AccountSeedRow("34", "الأرباح المبقاة", "Retained Earnings", AccountType.EQUITY, AccountNature.CREDIT, "3", True, is_system=True),
    AccountSeedRow("3401", "أرباح وخسائر العام الحالي", "Current Year Profit and Loss", AccountType.EQUITY, AccountNature.CREDIT, "34", False, is_system=True),
    AccountSeedRow("3402", "الأرباح المبقاة أو الخسائر المرحلة", "Retained Earnings or Accumulated Losses", AccountType.EQUITY, AccountNature.CREDIT, "34", False, is_system=True),

    # ========================================================
    # 4 الإيرادات
    # ========================================================
    AccountSeedRow("4", "الإيرادات", "Revenue", AccountType.REVENUE, AccountNature.CREDIT, None, True, is_system=True),
    AccountSeedRow("41", "الإيرادات التشغيلية", "Operating Revenue", AccountType.REVENUE, AccountNature.CREDIT, "4", True, is_system=True),
    AccountSeedRow("4101", "إيرادات المبيعات والخدمات", "Sales and Service Revenue", AccountType.REVENUE, AccountNature.CREDIT, "41", False, is_system=True, purpose=AccountingAccountPurpose.SALES_REVENUE),
    AccountSeedRow("410101", "إيرادات البطاقات", "Cards Revenue", AccountType.REVENUE, AccountNature.CREDIT, "41", False, is_system=True, purpose=AccountingAccountPurpose.SALES_REVENUE),
    AccountSeedRow("410102", "إيرادات البرامج", "Programs Revenue", AccountType.REVENUE, AccountNature.CREDIT, "41", False, is_system=True, purpose=AccountingAccountPurpose.SALES_REVENUE),
    AccountSeedRow("410103", "إيرادات الخدمات", "Services Revenue", AccountType.REVENUE, AccountNature.CREDIT, "41", False, is_system=True, purpose=AccountingAccountPurpose.SERVICE_REVENUE),
    AccountSeedRow("410104", "إيرادات الاشتراكات", "Subscriptions Revenue", AccountType.REVENUE, AccountNature.CREDIT, "41", False, is_system=True, purpose=AccountingAccountPurpose.SALES_REVENUE),
    AccountSeedRow("4102", "إيراد حصة النظام", "Platform Share Revenue", AccountType.REVENUE, AccountNature.CREDIT, "41", False, is_system=True, description="حصة النظام من العمليات"),

    AccountSeedRow("42", "إيرادات غير تشغيلية", "Non-operating Revenue", AccountType.REVENUE, AccountNature.CREDIT, "4", True),
    AccountSeedRow("4201", "إيرادات أخرى", "Other Revenue", AccountType.REVENUE, AccountNature.CREDIT, "42", False, purpose=AccountingAccountPurpose.OTHER_REVENUE),
    AccountSeedRow("4202", "فروقات تقريب دائنة", "Rounding Gains", AccountType.REVENUE, AccountNature.CREDIT, "42", False, purpose=AccountingAccountPurpose.ROUNDING),

    # ========================================================
    # 5 المصاريف
    # ========================================================
    AccountSeedRow("5", "المصاريف", "Expenses", AccountType.EXPENSE, AccountNature.DEBIT, None, True, is_system=True),
    AccountSeedRow("51", "التكاليف المباشرة", "Direct Costs", AccountType.EXPENSE, AccountNature.DEBIT, "5", True, is_system=True),
    AccountSeedRow("5101", "تكلفة الخدمات المقدمة", "Cost of Services", AccountType.EXPENSE, AccountNature.DEBIT, "51", False, is_system=True, purpose=AccountingAccountPurpose.COST_OF_SALES),
    AccountSeedRow("5102", "تكلفة مزودي الخدمة", "Provider Service Cost", AccountType.EXPENSE, AccountNature.DEBIT, "51", False, is_system=True, purpose=AccountingAccountPurpose.COST_OF_SALES),
    AccountSeedRow("5103", "عمولات البيع", "Sales Commissions", AccountType.EXPENSE, AccountNature.DEBIT, "51", False, is_system=True, purpose=AccountingAccountPurpose.EXPENSE),
    AccountSeedRow("5104", "تكلفة التوصيل", "Delivery Cost", AccountType.EXPENSE, AccountNature.DEBIT, "51", False, is_system=True, purpose=AccountingAccountPurpose.EXPENSE),
    AccountSeedRow("5105", "عمولات الوسطاء", "Broker Commissions", AccountType.EXPENSE, AccountNature.DEBIT, "51", False, is_system=True, purpose=AccountingAccountPurpose.EXPENSE),

    AccountSeedRow("52", "المصاريف التشغيلية", "Operating Expenses", AccountType.EXPENSE, AccountNature.DEBIT, "5", True),
    AccountSeedRow("5201", "الرواتب والرسوم الإدارية", "Administrative Salaries and Fees", AccountType.EXPENSE, AccountNature.DEBIT, "52", False),
    AccountSeedRow("5202", "تأمين طبي", "Medical Insurance", AccountType.EXPENSE, AccountNature.DEBIT, "52", False),
    AccountSeedRow("5203", "مصروفات تسويقية ودعائية", "Marketing and Advertising Expenses", AccountType.EXPENSE, AccountNature.DEBIT, "52", False),
    AccountSeedRow("5204", "مصروفات الإيجار", "Rent Expense", AccountType.EXPENSE, AccountNature.DEBIT, "52", False),
    AccountSeedRow("5205", "عمولات وحوافز", "Commissions and Incentives", AccountType.EXPENSE, AccountNature.DEBIT, "52", False),
    AccountSeedRow("5206", "تذاكر سفر", "Travel Tickets", AccountType.EXPENSE, AccountNature.DEBIT, "52", False),
    AccountSeedRow("5207", "التأمينات الاجتماعية", "Social Insurance", AccountType.EXPENSE, AccountNature.DEBIT, "52", False),
    AccountSeedRow("5208", "الرسوم الحكومية", "Government Fees", AccountType.EXPENSE, AccountNature.DEBIT, "52", False),
    AccountSeedRow("5209", "رسوم واشتراكات", "Fees and Subscriptions", AccountType.EXPENSE, AccountNature.DEBIT, "52", False),
    AccountSeedRow("5210", "مصروفات خدمات المكتب", "Office Service Expenses", AccountType.EXPENSE, AccountNature.DEBIT, "52", False),
    AccountSeedRow("5211", "مصروفات مكتبية ومطبوعات", "Office Supplies and Printing", AccountType.EXPENSE, AccountNature.DEBIT, "52", False),
    AccountSeedRow("5212", "مصروفات ضيافة", "Hospitality Expenses", AccountType.EXPENSE, AccountNature.DEBIT, "52", False),
    AccountSeedRow("5213", "رسوم بنكية", "Bank Charges", AccountType.EXPENSE, AccountNature.DEBIT, "52", False, is_system=True),
    AccountSeedRow("5214", "رسوم بوابات الدفع", "Payment Gateway Fees", AccountType.EXPENSE, AccountNature.DEBIT, "52", False, is_system=True, purpose=AccountingAccountPurpose.GATEWAY_FEES),
    AccountSeedRow("5215", "مصروفات أخرى", "Other Expenses", AccountType.EXPENSE, AccountNature.DEBIT, "52", False, purpose=AccountingAccountPurpose.EXPENSE),
    AccountSeedRow("5216", "فروقات تقريب مدينة", "Rounding Losses", AccountType.EXPENSE, AccountNature.DEBIT, "52", False, purpose=AccountingAccountPurpose.ROUNDING),
    AccountSeedRow("5217", "مصروفات الإهلاك", "Depreciation Expense", AccountType.EXPENSE, AccountNature.DEBIT, "52", True),
    AccountSeedRow("521701", "مصروف إهلاك المباني", "Depreciation Expense - Buildings", AccountType.EXPENSE, AccountNature.DEBIT, "5217", False),
    AccountSeedRow("521702", "مصروف إهلاك المعدات", "Depreciation Expense - Equipment", AccountType.EXPENSE, AccountNature.DEBIT, "5217", False),
    AccountSeedRow("521703", "مصروف إهلاك أجهزة مكتبية وطابعات", "Depreciation Expense - Office Equipment", AccountType.EXPENSE, AccountNature.DEBIT, "5217", False),
    AccountSeedRow("5219", "مصروف نقل ومواصلات", "Transportation Expense", AccountType.EXPENSE, AccountNature.DEBIT, "52", False),

    AccountSeedRow("53", "مصاريف غير تشغيلية", "Non-operating Expenses", AccountType.EXPENSE, AccountNature.DEBIT, "5", True),
    AccountSeedRow("5301", "الزكاة", "Zakat", AccountType.EXPENSE, AccountNature.DEBIT, "53", False),
    AccountSeedRow("5302", "الضرائب", "Taxes", AccountType.EXPENSE, AccountNature.DEBIT, "53", False),
    AccountSeedRow("5303", "فروقات عملة", "Foreign Currency Differences", AccountType.EXPENSE, AccountNature.DEBIT, "53", False),
    AccountSeedRow("5304", "فوائد", "Interest Expense", AccountType.EXPENSE, AccountNature.DEBIT, "53", False),
]


# ============================================================
# 🧩 Operational codes
# ============================================================

REQUIRED_OPERATIONAL_CODES: dict[str, str] = {
    "110101": "النقدية في الخزينة",
    "110201": "حساب البنك الجاري",
    "1103": "الذمم المدينة - العملاء",
    "1108": "المخزون",
    "2101": "الذمم الدائنة - الموردون",
    "210501": "ضريبة مخرجات",
    "210502": "ضريبة مدخلات",
    "4101": "إيرادات المبيعات والخدمات",
    "5101": "تكلفة الخدمات المقدمة",
    "5214": "رسوم بوابات الدفع",
    "3201": "أرصدة افتتاحية",
}


DEFAULT_ROUTING_RULES: list[RoutingSeedRow] = [
    # Sales
    RoutingSeedRow(AccountingRoutingSource.SALES_INVOICE, AccountingAccountPurpose.ACCOUNTS_RECEIVABLE, "1103", "إثبات ذمم العميل عند إصدار فاتورة المبيعات"),
    RoutingSeedRow(AccountingRoutingSource.SALES_INVOICE, AccountingAccountPurpose.SALES_REVENUE, "4101", "إثبات إيرادات المبيعات والخدمات"),
    RoutingSeedRow(AccountingRoutingSource.SALES_INVOICE, AccountingAccountPurpose.OUTPUT_VAT, "210501", "إثبات ضريبة المخرجات"),

    RoutingSeedRow(AccountingRoutingSource.SALES_PAYMENT, AccountingAccountPurpose.CASH, "110101", "تحصيل نقدي"),
    RoutingSeedRow(AccountingRoutingSource.SALES_PAYMENT, AccountingAccountPurpose.BANK, "110201", "تحصيل بنكي"),
    RoutingSeedRow(AccountingRoutingSource.SALES_PAYMENT, AccountingAccountPurpose.ACCOUNTS_RECEIVABLE, "1103", "تسوية ذمم العميل عند التحصيل"),
    RoutingSeedRow(AccountingRoutingSource.SALES_PAYMENT, AccountingAccountPurpose.GATEWAY_FEES, "5214", "رسوم بوابات الدفع"),

    # Purchases
    RoutingSeedRow(AccountingRoutingSource.PURCHASE_BILL, AccountingAccountPurpose.ACCOUNTS_PAYABLE, "2101", "إثبات ذمم المورد عند إصدار فاتورة المشتريات"),
    RoutingSeedRow(AccountingRoutingSource.PURCHASE_BILL, AccountingAccountPurpose.INPUT_VAT, "210502", "إثبات ضريبة المدخلات"),
    RoutingSeedRow(AccountingRoutingSource.PURCHASE_BILL, AccountingAccountPurpose.INVENTORY, "1108", "إثبات مخزون مشتريات"),
    RoutingSeedRow(AccountingRoutingSource.PURCHASE_BILL, AccountingAccountPurpose.EXPENSE, "5215", "مصروف مشتريات افتراضي"),

    # Inventory
    RoutingSeedRow(AccountingRoutingSource.INVENTORY_RECEIPT, AccountingAccountPurpose.INVENTORY, "1108", "استلام مخزون"),
    RoutingSeedRow(AccountingRoutingSource.INVENTORY_ADJUSTMENT, AccountingAccountPurpose.INVENTORY, "1108", "تسوية مخزون"),
    RoutingSeedRow(AccountingRoutingSource.INVENTORY_ADJUSTMENT, AccountingAccountPurpose.INVENTORY_ADJUSTMENT, "5215", "فرق تسوية مخزون"),

    # Treasury later
    RoutingSeedRow(AccountingRoutingSource.TREASURY_INCOME, AccountingAccountPurpose.CASH, "110101", "قبض خزينة افتراضي"),
    RoutingSeedRow(AccountingRoutingSource.TREASURY_EXPENSE, AccountingAccountPurpose.EXPENSE, "5215", "صرف خزينة افتراضي"),
    RoutingSeedRow(AccountingRoutingSource.OPENING_BALANCE, AccountingAccountPurpose.OPENING_EQUITY, "3201", "أرصدة افتتاحية"),
]


# ============================================================
# Exceptions
# ============================================================

class AccountingServiceError(Exception):
    """Base exception for accounting services."""


class AccountingConfigurationError(AccountingServiceError):
    """Raised when accounting configuration is missing or invalid."""


# ============================================================
# Helpers
# ============================================================

def _clean_code(value: Any) -> str:
    return str(value or "").strip()


def _sort_rows_by_code_length(rows: list[AccountSeedRow]) -> list[AccountSeedRow]:
    return sorted(rows, key=lambda item: (len(item.code), item.code))


def _get_seed_code_map() -> dict[str, AccountSeedRow]:
    return {row.code: row for row in CHART_OF_ACCOUNTS}


def validate_chart_definition() -> None:
    seen_codes: set[str] = set()

    for row in CHART_OF_ACCOUNTS:
        code = _clean_code(row.code)

        if not code:
            raise AccountingConfigurationError("يوجد حساب بدون كود داخل شجرة الحسابات.")

        if code in seen_codes:
            raise AccountingConfigurationError(f"كود حساب مكرر داخل شجرة الحسابات: {code}")

        seen_codes.add(code)

        if not row.name_ar:
            raise AccountingConfigurationError(f"الحساب {code} لا يحتوي على اسم عربي.")

        if not row.name_en:
            raise AccountingConfigurationError(f"الحساب {code} لا يحتوي على اسم إنجليزي.")

        if not row.account_type:
            raise AccountingConfigurationError(f"الحساب {code} لا يحتوي على نوع حساب.")

        if not row.nature:
            raise AccountingConfigurationError(f"الحساب {code} لا يحتوي على طبيعة حساب.")

    code_map = _get_seed_code_map()

    for row in CHART_OF_ACCOUNTS:
        if not row.parent_code:
            continue

        parent = code_map.get(row.parent_code)

        if not parent:
            raise AccountingConfigurationError(
                f"الحساب {row.code} مرتبط بحساب أب غير موجود: {row.parent_code}"
            )

        if not parent.is_group:
            raise AccountingConfigurationError(
                f"الحساب الأب {parent.code} للحساب {row.code} يجب أن يكون حسابًا تجميعيًا."
            )

        if parent.account_type != row.account_type:
            raise AccountingConfigurationError(
                f"نوع الحساب {row.code} لا يطابق نوع الحساب الأب {parent.code}."
            )

    for code in REQUIRED_OPERATIONAL_CODES:
        if code not in code_map:
            raise AccountingConfigurationError(f"الحساب التشغيلي المطلوب غير موجود في الشجرة: {code}")

    for rule in DEFAULT_ROUTING_RULES:
        if rule.account_code not in code_map:
            raise AccountingConfigurationError(
                f"قاعدة التوجيه تشير إلى حساب غير موجود في الشجرة: {rule.account_code}"
            )


def _account_fields_from_seed(row: AccountSeedRow) -> dict[str, Any]:
    return {
        "name": row.name_ar,
        "name_en": row.name_en,
        "account_type": row.account_type,
        "nature": row.nature,
        "purpose": row.purpose,
        "is_group": row.is_group,
        "is_active": row.is_active,
        "allow_manual_posting": bool(row.allow_manual_posting and not row.is_group),
        "is_system": row.is_system,
        "currency": "SAR",
        "description": row.description,
    }


def _get_account(company, code: str) -> Account:
    try:
        account = Account.objects.get(company=company, code=code)
    except Account.DoesNotExist as exc:
        raise AccountingConfigurationError(f"الحساب المطلوب غير موجود للشركة: {code}") from exc

    if not account.is_active or account.is_group:
        raise AccountingConfigurationError(f"الحساب غير قابل للتوجيه أو الترحيل: {code} - {account.name}")

    return account


def ensure_operational_accounts_exist(company) -> list[str]:
    missing_codes: list[str] = []

    for code in REQUIRED_OPERATIONAL_CODES:
        if not Account.objects.filter(
            company=company,
            code=code,
            is_active=True,
            is_group=False,
        ).exists():
            missing_codes.append(code)

    return missing_codes


# ============================================================
# Seed Company Chart of Accounts
# ============================================================

@transaction.atomic
def seed_company_chart_of_accounts(company, *, reset: bool = False) -> dict[str, Any]:
    """
    يزرع نفس شجرة الحسابات المعتمدة لكل شركة بشكل مستقل.

    reset=True يحذف دليل حسابات الشركة فقط إذا لم توجد قيود مرتبطة.
    """

    if not company:
        raise ValidationError("الشركة مطلوبة لزرع شجرة الحسابات.")

    validate_chart_definition()

    if reset:
        if JournalEntryLine.objects.filter(company=company).exists():
            raise ValidationError(
                "لا يمكن إعادة ضبط دليل حسابات الشركة لأن هناك قيودًا محاسبية مرتبطة."
            )

        AccountingRoutingRule.objects.filter(company=company).delete()
        AccountingSettings.objects.filter(company=company).update(default_tax_rate=None)
        TaxRate.objects.filter(company=company).delete()
        Account.objects.filter(company=company).update(parent=None)
        Account.objects.filter(company=company).delete()

    created_count = 0
    updated_count = 0
    parent_updated_count = 0
    code_to_account: dict[str, Account] = {}

    for row in _sort_rows_by_code_length(CHART_OF_ACCOUNTS):
        defaults = _account_fields_from_seed(row)

        account, created = Account.objects.get_or_create(
            company=company,
            code=row.code,
            defaults=defaults,
        )

        if created:
            created_count += 1
        else:
            changed = False
            for field_name, new_value in defaults.items():
                if getattr(account, field_name) != new_value:
                    setattr(account, field_name, new_value)
                    changed = True

            if changed:
                account.save()
                updated_count += 1

        code_to_account[row.code] = account

    for row in _sort_rows_by_code_length(CHART_OF_ACCOUNTS):
        account = code_to_account[row.code]
        parent = code_to_account.get(row.parent_code) if row.parent_code else None

        expected_parent_id = parent.pk if parent else None
        expected_level = parent.level + 1 if parent else 1

        changed = False

        if account.parent_id != expected_parent_id:
            account.parent = parent
            changed = True

        if account.level != expected_level:
            account.level = expected_level
            changed = True

        if changed:
            account.save()
            parent_updated_count += 1

    default_tax_rate = seed_company_default_tax_rate(company)
    settings_obj = seed_company_accounting_settings(company, default_tax_rate)
    routing_created, routing_updated = seed_company_default_routing_rules(company, default_tax_rate)

    missing = ensure_operational_accounts_exist(company)
    if missing:
        raise AccountingConfigurationError(
            "توجد حسابات تشغيلية مفقودة بعد الزرع: " + ", ".join(missing)
        )

    return {
        "company_id": company.pk,
        "company_name": getattr(company, "name", ""),
        "accounts_created": created_count,
        "accounts_updated": updated_count,
        "parents_updated": parent_updated_count,
        "tax_rate_id": default_tax_rate.pk,
        "settings_id": settings_obj.pk,
        "routing_rules_created": routing_created,
        "routing_rules_updated": routing_updated,
        "total_accounts": Account.objects.filter(company=company).count(),
    }


# ============================================================
# Tax / Settings / Routing
# ============================================================

def seed_company_default_tax_rate(company) -> TaxRate:
    output_vat_account = _get_account(company, "210501")
    input_vat_account = _get_account(company, "210502")

    tax_rate, _ = TaxRate.objects.update_or_create(
        company=company,
        code="VAT15",
        defaults={
            "name": "ضريبة القيمة المضافة 15%",
            "tax_type": TaxType.VAT,
            "direction": TaxDirection.OUTPUT,
            "rate": Decimal("15.0000"),
            "sales_account": output_vat_account,
            "purchase_account": input_vat_account,
            "is_active": True,
            "is_default": True,
            "description": "ضريبة القيمة المضافة الافتراضية في المملكة العربية السعودية",
        },
    )

    return tax_rate


def seed_company_accounting_settings(company, default_tax_rate: TaxRate) -> AccountingSettings:
    settings_obj = AccountingSettings.get_for_company(company)

    settings_obj.default_currency = "SAR"
    settings_obj.default_tax_rate = default_tax_rate
    settings_obj.auto_post_sales = True
    settings_obj.auto_post_purchases = True
    settings_obj.auto_post_inventory = False
    settings_obj.auto_post_treasury = False
    settings_obj.require_period_for_posting = False
    settings_obj.allow_posting_without_cost_center = True
    settings_obj.save()

    return settings_obj


def seed_company_default_routing_rules(company, default_tax_rate: TaxRate | None = None) -> tuple[int, int]:
    created_count = 0
    updated_count = 0

    for row in DEFAULT_ROUTING_RULES:
        account = _get_account(company, row.account_code)

        tax_rate = None
        if row.purpose in {
            AccountingAccountPurpose.OUTPUT_VAT,
            AccountingAccountPurpose.INPUT_VAT,
            AccountingAccountPurpose.VAT_PAYABLE,
        }:
            tax_rate = default_tax_rate

        rule, created = AccountingRoutingRule.objects.update_or_create(
            company=company,
            source=row.source,
            purpose=row.purpose,
            account=account,
            tax_rate=tax_rate,
            cost_center=None,
            defaults={
                "is_active": True,
                "priority": 100,
                "description": row.description,
                "metadata": {"seeded_by": "seed_company_chart_of_accounts"},
            },
        )

        if created:
            created_count += 1
        else:
            updated_count += 1
            rule.save()

    return created_count, updated_count


# ============================================================
# Account resolution helpers
# ============================================================

def get_account_by_code(company, code: str, *, required: bool = True) -> Account | None:
    qs = Account.objects.filter(
        company=company,
        code=code,
        is_active=True,
        is_group=False,
    )

    account = qs.order_by("code", "id").first()

    if required and not account:
        raise AccountingConfigurationError(f"لم يتم العثور على الحساب: {code}")

    return account


def get_account_by_purpose(
    company,
    purpose: str,
    *,
    source: str | None = None,
    required: bool = True,
) -> Account | None:
    if source:
        rule = (
            AccountingRoutingRule.objects.filter(
                company=company,
                source=source,
                purpose=purpose,
                is_active=True,
            )
            .select_related("account")
            .order_by("priority", "id")
            .first()
        )

        if rule:
            if rule.account.can_post:
                return rule.account

            if required:
                raise AccountingConfigurationError(
                    f"حساب التوجيه غير قابل للترحيل: {rule.account.code}"
                )

    account = (
        Account.objects.filter(
            company=company,
            purpose=purpose,
            is_active=True,
            is_group=False,
        )
        .order_by("code", "id")
        .first()
    )

    if required and not account:
        raise AccountingConfigurationError(
            f"لم يتم العثور على حساب نشط قابل للترحيل للغرض المحاسبي: {purpose}"
        )

    return account


def get_default_tax_rate(company) -> TaxRate | None:
    settings_obj = AccountingSettings.objects.filter(company=company).select_related("default_tax_rate").first()

    if settings_obj and settings_obj.default_tax_rate_id:
        return settings_obj.default_tax_rate

    return (
        TaxRate.objects.filter(
            company=company,
            is_active=True,
            is_default=True,
        )
        .order_by("id")
        .first()
    )


# ============================================================
# 🧾 Journal Entry Core - Phase 9.2 Part 2
# ============================================================

MONEY_ZERO = Decimal("0.00")
MONEY_QUANT = Decimal("0.01")


@dataclass(slots=True)
class EntryLinePayload:
    account: Account
    description: str = ""
    debit_amount: Decimal = MONEY_ZERO
    credit_amount: Decimal = MONEY_ZERO
    currency: str = "SAR"
    cost_center: CostCenter | None = None
    tax_rate: TaxRate | None = None
    tax_amount: Decimal = MONEY_ZERO
    party_type: str = ""
    party_id: str = ""
    source_line_id: str = ""
    sort_order: int = 0
    metadata: dict[str, Any] | None = None


class AccountingPostingError(AccountingServiceError):
    """Raised when a journal entry cannot be posted."""


def _money(value: Any) -> Decimal:
    return Decimal(str(value or "0.00")).quantize(MONEY_QUANT)


def _clean_text(value: Any) -> str:
    return str(value or "").strip()


def _clean_currency(value: Any) -> str:
    return str(value or "SAR").strip().upper()


def _validate_company(company) -> None:
    if not company:
        raise ValidationError("الشركة مطلوبة.")


def _validate_postable_account(account: Account, company, field_name: str = "account") -> Account:
    if not account:
        raise AccountingConfigurationError(f"{field_name}: الحساب مطلوب.")

    if account.company_id != company.pk:
        raise AccountingConfigurationError(f"{field_name}: الحساب يجب أن يكون من نفس الشركة.")

    if account.is_group:
        raise AccountingConfigurationError(f"{field_name}: لا يمكن الترحيل على حساب تجميعي.")

    if not account.is_active:
        raise AccountingConfigurationError(f"{field_name}: لا يمكن الترحيل على حساب غير نشط.")

    return account


def _validate_cost_center(cost_center: CostCenter | None, company) -> CostCenter | None:
    if not cost_center:
        return None

    if cost_center.company_id != company.pk:
        raise AccountingPostingError("مركز التكلفة يجب أن يكون من نفس الشركة.")

    if not cost_center.can_post:
        raise AccountingPostingError("مركز التكلفة غير نشط أو تجميعي.")

    return cost_center


def _validate_tax_rate(tax_rate: TaxRate | None, company) -> TaxRate | None:
    if not tax_rate:
        return None

    if tax_rate.company_id != company.pk:
        raise AccountingPostingError("الضريبة يجب أن تكون من نفس الشركة.")

    if not tax_rate.is_active:
        raise AccountingPostingError("لا يمكن استخدام ضريبة غير نشطة.")

    return tax_rate


def _find_open_period(company, entry_date: date):
    return (
        company.accounting_periods.filter(
            start_date__lte=entry_date,
            end_date__gte=entry_date,
            status=AccountingPeriodStatus.OPEN,
        )
        .select_related("fiscal_year")
        .order_by("-start_date", "-id")
        .first()
    )


def resolve_accounting_period(company, entry_date: date):
    settings_obj = AccountingSettings.get_for_company(company)
    period = _find_open_period(company, entry_date)

    if settings_obj.require_period_for_posting and not period:
        raise AccountingConfigurationError("لا توجد فترة محاسبية مفتوحة لتاريخ القيد.")

    return period


def generate_journal_entry_number(company, *, prefix: str = "JE") -> str:
    _validate_company(company)

    year = timezone.localdate().year
    base_prefix = f"{prefix}-{year}-"

    last_entry = (
        JournalEntry.objects.filter(
            company=company,
            entry_number__startswith=base_prefix,
        )
        .order_by("-id")
        .first()
    )

    if not last_entry:
        return f"{base_prefix}000001"

    try:
        last_serial = int(str(last_entry.entry_number).replace(base_prefix, ""))
    except Exception:
        last_serial = JournalEntry.objects.filter(
            company=company,
            entry_number__startswith=base_prefix,
        ).count()

    return f"{base_prefix}{last_serial + 1:06d}"


def _update_entry_totals(entry: JournalEntry) -> None:
    totals = entry.lines.aggregate(
        debit=Sum("debit_amount"),
        credit=Sum("credit_amount"),
    )

    entry.total_debit = _money(totals.get("debit") or MONEY_ZERO)
    entry.total_credit = _money(totals.get("credit") or MONEY_ZERO)
    entry.save(update_fields=["total_debit", "total_credit", "updated_at"])


def _validate_line_payload(company, line: EntryLinePayload) -> EntryLinePayload:
    line.account = _validate_postable_account(line.account, company)
    line.cost_center = _validate_cost_center(line.cost_center, company)
    line.tax_rate = _validate_tax_rate(line.tax_rate, company)

    line.debit_amount = _money(line.debit_amount)
    line.credit_amount = _money(line.credit_amount)
    line.tax_amount = _money(line.tax_amount)
    line.currency = _clean_currency(line.currency)
    line.party_type = _clean_text(line.party_type)
    line.party_id = _clean_text(line.party_id)
    line.source_line_id = _clean_text(line.source_line_id)

    if line.debit_amount > MONEY_ZERO and line.credit_amount > MONEY_ZERO:
        raise AccountingPostingError("لا يمكن أن يحتوي سطر القيد على مدين ودائن في نفس الوقت.")

    if line.debit_amount <= MONEY_ZERO and line.credit_amount <= MONEY_ZERO:
        raise AccountingPostingError("يجب أن يحتوي سطر القيد على مبلغ مدين أو دائن.")

    if line.tax_amount < MONEY_ZERO:
        raise AccountingPostingError("مبلغ الضريبة لا يمكن أن يكون سالبًا.")

    return line


@transaction.atomic
def create_journal_entry_header(
    *,
    company,
    entry_date: date,
    entry_number: str = "",
    posting_source: str = PostingSource.MANUAL,
    reference: str = "",
    external_reference: str = "",
    description: str = "",
    notes: str = "",
    currency: str = "SAR",
    source_type: str = "",
    source_id: str = "",
    source_number: str = "",
    is_auto_posted: bool = False,
    actor: Any = None,
) -> JournalEntry:
    _validate_company(company)

    entry_date = entry_date or timezone.localdate()
    entry_number = _clean_code(entry_number) or generate_journal_entry_number(company)
    period = resolve_accounting_period(company, entry_date)

    entry = JournalEntry(
        company=company,
        entry_number=entry_number,
        entry_date=entry_date,
        period=period,
        posting_source=posting_source,
        reference=_clean_text(reference),
        external_reference=_clean_text(external_reference),
        description=_clean_text(description),
        notes=_clean_text(notes),
        currency=_clean_currency(currency),
        source_type=_clean_text(source_type),
        source_id=_clean_text(source_id),
        source_number=_clean_text(source_number),
        is_auto_posted=is_auto_posted,
    )

    if actor is not None and getattr(actor, "is_authenticated", False):
        entry.created_by = actor
        entry.updated_by = actor

    entry.save()
    return entry


@transaction.atomic
def replace_journal_entry_lines(
    entry: JournalEntry,
    lines: list[EntryLinePayload],
    *,
    actor: Any = None,
) -> JournalEntry:
    if not entry:
        raise AccountingPostingError("القيد مطلوب.")

    entry = JournalEntry.objects.select_for_update().get(pk=entry.pk)

    if entry.status != JournalEntryStatus.DRAFT:
        raise AccountingPostingError("لا يمكن تعديل أسطر قيد غير مسودة.")

    line_payloads = [_validate_line_payload(entry.company, line) for line in lines]

    if not line_payloads:
        raise AccountingPostingError("لا يمكن إنشاء قيد بدون أسطر.")

    total_debit = _money(sum((line.debit_amount for line in line_payloads), MONEY_ZERO))
    total_credit = _money(sum((line.credit_amount for line in line_payloads), MONEY_ZERO))

    if total_debit != total_credit:
        raise AccountingPostingError(
            f"القيد غير متوازن: المدين {total_debit} والدائن {total_credit}"
        )

    if total_debit <= MONEY_ZERO:
        raise AccountingPostingError("لا يمكن إنشاء قيد بمبالغ صفرية.")

    entry.lines.all().delete()

    for index, line in enumerate(line_payloads, start=1):
        JournalEntryLine.objects.create(
            company=entry.company,
            journal_entry=entry,
            account=line.account,
            description=line.description or "",
            debit_amount=line.debit_amount,
            credit_amount=line.credit_amount,
            tax_amount=line.tax_amount,
            currency=line.currency or entry.currency,
            cost_center=line.cost_center,
            tax_rate=line.tax_rate,
            party_type=line.party_type,
            party_id=line.party_id,
            source_line_id=line.source_line_id,
            sort_order=line.sort_order or index,
            metadata=line.metadata or {},
        )

    _update_entry_totals(entry)

    if actor is not None and getattr(actor, "is_authenticated", False):
        entry.updated_by = actor
        entry.save(update_fields=["updated_by", "updated_at"])

    entry.refresh_from_db()
    return entry


@transaction.atomic
def create_manual_journal_entry(
    *,
    company,
    lines: list[EntryLinePayload],
    entry_date: date | None = None,
    entry_number: str = "",
    description: str = "",
    notes: str = "",
    reference: str = "",
    external_reference: str = "",
    currency: str = "SAR",
    actor: Any = None,
    auto_post: bool = False,
) -> JournalEntry:
    entry = create_journal_entry_header(
        company=company,
        entry_date=entry_date or timezone.localdate(),
        entry_number=entry_number,
        posting_source=PostingSource.MANUAL,
        reference=reference,
        external_reference=external_reference,
        description=description,
        notes=notes,
        currency=currency,
        source_type="manual",
        source_id="",
        source_number=entry_number,
        is_auto_posted=False,
        actor=actor,
    )

    entry = replace_journal_entry_lines(
        entry,
        lines,
        actor=actor,
    )

    if auto_post:
        entry = post_journal_entry(entry, actor=actor)

    return entry


@transaction.atomic
def post_journal_entry(entry: JournalEntry, *, actor: Any = None) -> JournalEntry:
    if not entry:
        raise AccountingPostingError("القيد مطلوب.")

    entry = JournalEntry.objects.select_for_update().get(pk=entry.pk)

    if entry.status == JournalEntryStatus.POSTED:
        return entry

    if entry.status == JournalEntryStatus.CANCELLED:
        raise AccountingPostingError("لا يمكن ترحيل قيد ملغي.")

    if entry.status == JournalEntryStatus.REVERSED:
        raise AccountingPostingError("لا يمكن ترحيل قيد معكوس.")

    _update_entry_totals(entry)

    if not entry.lines.exists():
        raise AccountingPostingError("لا يمكن ترحيل قيد بدون أسطر.")

    if _money(entry.total_debit) != _money(entry.total_credit):
        raise AccountingPostingError("لا يمكن ترحيل قيد غير متوازن.")

    if _money(entry.total_debit) <= MONEY_ZERO:
        raise AccountingPostingError("لا يمكن ترحيل قيد بدون مبالغ.")

    entry.status = JournalEntryStatus.POSTED
    entry.posted_at = timezone.now()

    update_fields = [
        "status",
        "posted_at",
        "total_debit",
        "total_credit",
        "updated_at",
    ]

    if actor is not None and getattr(actor, "is_authenticated", False):
        entry.posted_by = actor
        entry.updated_by = actor
        update_fields.extend(["posted_by", "updated_by"])

    entry.save(update_fields=update_fields)

    entry.refresh_from_db()
    return entry


@transaction.atomic
def cancel_journal_entry(
    entry: JournalEntry,
    *,
    actor: Any = None,
    reason: str = "",
) -> JournalEntry:
    if not entry:
        raise AccountingPostingError("القيد مطلوب.")

    entry = JournalEntry.objects.select_for_update().get(pk=entry.pk)

    if entry.status == JournalEntryStatus.CANCELLED:
        return entry

    if entry.status != JournalEntryStatus.POSTED:
        raise AccountingPostingError("لا يمكن إلغاء قيد غير مرحل.")

    entry.status = JournalEntryStatus.CANCELLED
    entry.cancelled_at = timezone.now()

    update_fields = [
        "status",
        "cancelled_at",
        "updated_at",
    ]

    if reason:
        entry.notes = f"{entry.notes}\nسبب الإلغاء: {reason}".strip()
        update_fields.append("notes")

    if actor is not None and getattr(actor, "is_authenticated", False):
        entry.cancelled_by = actor
        entry.updated_by = actor
        update_fields.extend(["cancelled_by", "updated_by"])

    entry.save(update_fields=update_fields)

    entry.refresh_from_db()
    return entry


@transaction.atomic
def reverse_journal_entry(
    entry: JournalEntry,
    *,
    reversal_date: date | None = None,
    reason: str = "",
    actor: Any = None,
) -> JournalEntry:
    if not entry:
        raise AccountingPostingError("القيد مطلوب.")

    entry = JournalEntry.objects.select_for_update().get(pk=entry.pk)

    if entry.status != JournalEntryStatus.POSTED:
        raise AccountingPostingError("لا يمكن عكس قيد غير مرحل.")

    existing = JournalEntry.objects.filter(
        company=entry.company,
        reversal_of=entry,
    ).order_by("id").first()

    if existing:
        return existing

    reversal_number = generate_journal_entry_number(entry.company, prefix="REV")
    reversal = create_journal_entry_header(
        company=entry.company,
        entry_date=reversal_date or timezone.localdate(),
        entry_number=reversal_number,
        posting_source=entry.posting_source,
        reference=f"REVERSAL:{entry.pk}",
        external_reference=entry.entry_number,
        description=f"عكس القيد {entry.entry_number}",
        notes=reason or "",
        currency=entry.currency,
        source_type=entry.source_type,
        source_id=entry.source_id,
        source_number=entry.source_number,
        is_auto_posted=True,
        actor=actor,
    )

    reversal.reversal_of = entry
    reversal.save(update_fields=["reversal_of", "updated_at"])

    reversal_lines: list[EntryLinePayload] = []

    for index, line in enumerate(
        entry.lines.select_related("account", "cost_center", "tax_rate").order_by("sort_order", "id"),
        start=1,
    ):
        reversal_lines.append(
            EntryLinePayload(
                account=line.account,
                description=f"عكس: {line.description}",
                debit_amount=_money(line.credit_amount),
                credit_amount=_money(line.debit_amount),
                currency=line.currency,
                cost_center=line.cost_center,
                tax_rate=line.tax_rate,
                tax_amount=_money(line.tax_amount),
                party_type=line.party_type,
                party_id=line.party_id,
                source_line_id=line.source_line_id,
                sort_order=index,
                metadata={"reversal_of_line_id": line.pk},
            )
        )

    reversal = replace_journal_entry_lines(
        reversal,
        reversal_lines,
        actor=actor,
    )
    reversal = post_journal_entry(reversal, actor=actor)

    entry.status = JournalEntryStatus.REVERSED
    entry.reversed_entry = reversal
    entry.reversed_at = timezone.now()

    update_fields = [
        "status",
        "reversed_entry",
        "reversed_at",
        "updated_at",
    ]

    if actor is not None and getattr(actor, "is_authenticated", False):
        entry.updated_by = actor
        update_fields.append("updated_by")

    entry.save(update_fields=update_fields)

    return reversal