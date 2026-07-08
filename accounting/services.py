# ============================================================
# 📂 accounting/services.py
# 🧠 Mhamcloud | Accounting Services - Phase 10.1
# ------------------------------------------------------------
# ✅ زرع شجرة الحسابات السعودية لكل شركة
# ✅ عزل كامل حسب الشركة
# ✅ VAT 15%
# ✅ AccountingSettings لكل شركة حسب الموديل الحالي
# ✅ Routing Rules أساسية
# ✅ قيود يومية يدوية
# ✅ عكس القيود
# ✅ ربط فاتورة البيع بقيد محاسبي تلقائي
# ✅ لا يعتمد على company_id من الفرونت
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف مطابق فعليًا لحقول accounting/models.py الحالية
# - لا نستخدم أي field غير موجود في الموديل
# - لا نضيف migration في هذه الخطوة
# - لا نثق بأي company_id من الفرونت
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
# ✅ Model-compatible constants
# ============================================================

ACCOUNT_PURPOSE_COST_OF_SALES = getattr(
    AccountingAccountPurpose,
    "COST_OF_SALES",
    AccountingAccountPurpose.OTHER,
)
ACCOUNT_PURPOSE_EXPENSE = getattr(
    AccountingAccountPurpose,
    "EXPENSE",
    AccountingAccountPurpose.OTHER,
)
TAX_DIRECTION_OUTPUT = getattr(
    TaxDirection,
    "OUTPUT",
    "OUTPUT",
)


# ============================================================
# 🧾 DTOs
# ============================================================

@dataclass(frozen=True, slots=True)
class AccountSeedRow:
    code: str
    name: str
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
# ============================================================

CHART_OF_ACCOUNTS: list[AccountSeedRow] = [
    # ========================================================
    # Default chart generated from approved Excel + PrimeyAcc system accounts
    # ========================================================

    # -------------------- 1 --------------------
    AccountSeedRow('1', 'الأصول', 'Assets', AccountType.ASSET, AccountNature.DEBIT, None, True, is_system=True),

    # -------------------- 2 --------------------
    AccountSeedRow('2', 'الالتزامات', 'Liability', AccountType.LIABILITY, AccountNature.CREDIT, None, True, is_system=True),

    # -------------------- 3 --------------------
    AccountSeedRow('3', 'حقوق الملكية', 'Equity', AccountType.EQUITY, AccountNature.CREDIT, None, True, is_system=True),

    # -------------------- 4 --------------------
    AccountSeedRow('4', 'الإيرادات', 'Revenue', AccountType.REVENUE, AccountNature.CREDIT, None, True, is_system=True),

    # -------------------- 5 --------------------
    AccountSeedRow('5', 'المصاريف', 'Expenses', AccountType.EXPENSE, AccountNature.DEBIT, None, True, is_system=True),

    # -------------------- 1 --------------------
    AccountSeedRow('11', 'أصول متداولة', 'Current Assets', AccountType.ASSET, AccountNature.DEBIT, '1', True, is_system=True),
    AccountSeedRow('12', 'أصول غير متداولة', 'Non-current assets', AccountType.ASSET, AccountNature.DEBIT, '1', True, is_system=True),

    # -------------------- 2 --------------------
    AccountSeedRow('21', 'الالتزامات المتداولة', 'Current Liability', AccountType.LIABILITY, AccountNature.CREDIT, '2', True, is_system=True),
    AccountSeedRow('22', 'التزامات غير متداولة', 'Non-current Liability', AccountType.LIABILITY, AccountNature.CREDIT, '2', True, is_system=True),

    # -------------------- 3 --------------------
    AccountSeedRow('31', 'رأس المال', 'Issued Capital', AccountType.EQUITY, AccountNature.CREDIT, '3', True),
    AccountSeedRow('32', 'حقوق ملكية أخرى', 'Other equity', AccountType.EQUITY, AccountNature.CREDIT, '3', True),
    AccountSeedRow('33', 'احتياطيات', 'Reserve', AccountType.EQUITY, AccountNature.CREDIT, '3', True),
    AccountSeedRow('34', 'الأرباح المبقاة (أو الخسائر)', 'Retained earnings or losses', AccountType.EQUITY, AccountNature.CREDIT, '3', True),

    # -------------------- 4 --------------------
    AccountSeedRow('41', 'الإيرادات التشغيلية', 'Operational Revenue', AccountType.REVENUE, AccountNature.CREDIT, '4', True, is_system=True),
    AccountSeedRow('42', 'الإيرادات غير التشغيلية', 'Non-operating revenues', AccountType.REVENUE, AccountNature.CREDIT, '4', True),

    # -------------------- 5 --------------------
    AccountSeedRow('51', 'التكاليف المباشرة', 'Direct Cost', AccountType.EXPENSE, AccountNature.DEBIT, '5', True, is_system=True),
    AccountSeedRow('52', 'التكاليف التشغيلية', 'Operational Cost', AccountType.EXPENSE, AccountNature.DEBIT, '5', True, is_system=True),
    AccountSeedRow('53', 'مصاريف غير التشغيلية', 'Non- Operational Expenses', AccountType.EXPENSE, AccountNature.DEBIT, '5', True, is_system=True),

    # -------------------- 1 --------------------
    AccountSeedRow('1101', 'النقد ومايعادله', 'Cash and equivalents', AccountType.ASSET, AccountNature.DEBIT, '11', True, is_system=True),
    AccountSeedRow('1102', 'النقدية في البنك', 'Cash in bank', AccountType.ASSET, AccountNature.DEBIT, '11', True, is_system=True),
    AccountSeedRow('1103', 'المدينون', 'Accounts receivable', AccountType.ASSET, AccountNature.DEBIT, '11', False, is_system=True, purpose=AccountingAccountPurpose.ACCOUNTS_RECEIVABLE),
    AccountSeedRow('1104', 'مصروفات مقدمة', 'Prepaid expenses', AccountType.ASSET, AccountNature.DEBIT, '11', True),
    AccountSeedRow('1105', 'مدفوعات مقدمة للموظفين', 'Staff advances', AccountType.ASSET, AccountNature.DEBIT, '11', False),
    AccountSeedRow('1106', 'المخزون', 'Inventory', AccountType.ASSET, AccountNature.DEBIT, '11', False, is_system=True, purpose=AccountingAccountPurpose.INVENTORY),
    AccountSeedRow('1107', 'ضريبة القيمة المضافة - مدخلات', 'VAT Input', AccountType.ASSET, AccountNature.DEBIT, '11', False, is_system=True, purpose=AccountingAccountPurpose.INPUT_VAT, description='حساب ضريبة المدخلات القابلة للخصم.'),
    AccountSeedRow('1109', 'العهد التشغيلية', 'Operational Custodies', AccountType.ASSET, AccountNature.DEBIT, '11', True, is_system=True),
    AccountSeedRow('1110', 'تسويات بوابات الدفع', 'Payment Gateway Clearing', AccountType.ASSET, AccountNature.DEBIT, '11', True, is_system=True),
    AccountSeedRow('1201', 'عقارات وآلات ومعدات', 'PPE', AccountType.ASSET, AccountNature.DEBIT, '12', True),
    AccountSeedRow('1202', 'الأصول غير الملموسة', 'Intangible assets', AccountType.ASSET, AccountNature.DEBIT, '12', False),
    AccountSeedRow('1203', 'العقارات الاستثمارية', 'Investment property', AccountType.ASSET, AccountNature.DEBIT, '12', False),

    # -------------------- 2 --------------------
    AccountSeedRow('2101', 'الدائنون', 'Accounts payable', AccountType.LIABILITY, AccountNature.CREDIT, '21', False, is_system=True, purpose=AccountingAccountPurpose.ACCOUNTS_PAYABLE),
    AccountSeedRow('2102', 'مصروفات مستحقة', 'Accrued expenses', AccountType.LIABILITY, AccountNature.CREDIT, '21', False),
    AccountSeedRow('2103', 'الرواتب المستحقة', 'Accrued salaries', AccountType.LIABILITY, AccountNature.CREDIT, '21', False),
    AccountSeedRow('2104', 'قروض قصيرة الأجل', 'Short-term loans', AccountType.LIABILITY, AccountNature.CREDIT, '21', False),
    AccountSeedRow('2105', 'ضريبة القيمة المضافة المستحقة', 'VAT payable', AccountType.LIABILITY, AccountNature.CREDIT, '21', True, is_system=True),
    AccountSeedRow('2106', 'الضرائب المستحقة', 'Accrued Taxes', AccountType.LIABILITY, AccountNature.CREDIT, '21', False),
    AccountSeedRow('2107', 'إيرادات غير مكتسبة', 'Unearned revenues', AccountType.LIABILITY, AccountNature.CREDIT, '21', False),
    AccountSeedRow('2108', 'مستحقات المؤسسة العامة للتأمينات الاجتماعية', 'General Organization for Social insurance payable', AccountType.LIABILITY, AccountNature.CREDIT, '21', False),
    AccountSeedRow('2109', 'مجمع الاستهلاك', 'Accumulated Depreciation', AccountType.LIABILITY, AccountNature.CREDIT, '21', True),
    AccountSeedRow('2201', 'قروض طويلة أجل', 'Long-term loans', AccountType.LIABILITY, AccountNature.CREDIT, '22', False),
    AccountSeedRow('2202', 'مخصص مكافأة نهاية الخدمة', 'End of Services Provision', AccountType.LIABILITY, AccountNature.CREDIT, '22', False),

    # -------------------- 3 --------------------
    AccountSeedRow('3101', 'رأس المال المسجل', 'Registered capital', AccountType.EQUITY, AccountNature.CREDIT, '31', False),
    AccountSeedRow('3102', 'رأس المال الإضافي المدفوع', 'Additional paid in capital', AccountType.EQUITY, AccountNature.CREDIT, '31', False),
    AccountSeedRow('3201', 'أرصدة افتتاحية', 'Opening balance', AccountType.EQUITY, AccountNature.CREDIT, '32', False, is_system=True, purpose=AccountingAccountPurpose.OPENING_EQUITY),
    AccountSeedRow('3301', 'احتياطي نظامي', 'Statutory reserve', AccountType.EQUITY, AccountNature.CREDIT, '33', False),
    AccountSeedRow('3302', 'احتياطي ترجمة عملات أجنبية', 'Foreign currency translation reserve', AccountType.EQUITY, AccountNature.CREDIT, '33', False),
    AccountSeedRow('3401', 'الأرباح والخسائر العاملة', 'Profit and loss', AccountType.EQUITY, AccountNature.CREDIT, '34', False),
    AccountSeedRow('3402', 'الأرباح المبقاة (أو الخسائر)', 'Retained earnings or losses', AccountType.EQUITY, AccountNature.CREDIT, '34', False),

    # -------------------- 4 --------------------
    AccountSeedRow('4101', 'إيرادات المبيعات/ الخدمات', 'Revenue of Products and services Sales', AccountType.REVENUE, AccountNature.CREDIT, '41', False, is_system=True, purpose=AccountingAccountPurpose.SALES_REVENUE),
    AccountSeedRow('4201', 'إيرادات أخرى', 'Other income', AccountType.REVENUE, AccountNature.CREDIT, '42', False, purpose=AccountingAccountPurpose.OTHER_REVENUE),

    # -------------------- 5 --------------------
    AccountSeedRow('5101', 'تكلفة البضاعة المباعة', 'Cost of goods sold', AccountType.EXPENSE, AccountNature.DEBIT, '51', False, is_system=True, purpose=ACCOUNT_PURPOSE_COST_OF_SALES),
    AccountSeedRow('5102', 'رواتب وأجور', 'Salaries and wages', AccountType.EXPENSE, AccountNature.DEBIT, '51', False),
    AccountSeedRow('5103', 'عمولات البيع', 'Sales commissions', AccountType.EXPENSE, AccountNature.DEBIT, '51', False),
    AccountSeedRow('5104', 'شحن وتخليص جمركي', 'Shipping and custom fees', AccountType.EXPENSE, AccountNature.DEBIT, '51', False),
    AccountSeedRow('5201', 'الرواتب والرسوم الإدارية', 'Salaries and administrative fees', AccountType.EXPENSE, AccountNature.DEBIT, '52', False),
    AccountSeedRow('5202', 'تأمين طبي', 'Medical insurance and treatment', AccountType.EXPENSE, AccountNature.DEBIT, '52', False),
    AccountSeedRow('5203', 'مصاريف تسويقية ودعائية', 'Marketing and advertising', AccountType.EXPENSE, AccountNature.DEBIT, '52', False),
    AccountSeedRow('5204', 'مصاريف الإيجار', 'Rental expenses', AccountType.EXPENSE, AccountNature.DEBIT, '52', False),
    AccountSeedRow('5205', 'عمولات وحوافز', 'Commissions and incentives', AccountType.EXPENSE, AccountNature.DEBIT, '52', False),
    AccountSeedRow('5206', 'تذاكر سفر', 'Travel Expenses', AccountType.EXPENSE, AccountNature.DEBIT, '52', False),
    AccountSeedRow('5207', 'التأمينات الاجتماعية', 'Social insurance expense', AccountType.EXPENSE, AccountNature.DEBIT, '52', False),
    AccountSeedRow('5208', 'الرسوم الحكومية', 'Government fees', AccountType.EXPENSE, AccountNature.DEBIT, '52', False),
    AccountSeedRow('5209', 'رسوم واشتراكات', 'Fees and subscriptions', AccountType.EXPENSE, AccountNature.DEBIT, '52', False),
    AccountSeedRow('5210', 'مصاريف خدمات المكتب', 'Utilities expenses', AccountType.EXPENSE, AccountNature.DEBIT, '52', False),
    AccountSeedRow('5211', 'مصاريف مكتبية ومطبوعات', 'Stationery and prints', AccountType.EXPENSE, AccountNature.DEBIT, '52', False),
    AccountSeedRow('5212', 'مصاريف ضيافة', 'Hospitality and cleanliness', AccountType.EXPENSE, AccountNature.DEBIT, '52', False),
    AccountSeedRow('5213', 'عمولات بنكية', 'Bank commissions', AccountType.EXPENSE, AccountNature.DEBIT, '52', False),
    AccountSeedRow('5214', 'مصاريف أخرى', 'Other expenses', AccountType.EXPENSE, AccountNature.DEBIT, '52', False),
    AccountSeedRow('5215', 'مصاريف الإهلاك', 'Depreciation', AccountType.EXPENSE, AccountNature.DEBIT, '52', True),
    AccountSeedRow('5216', 'مصروف مشتريات / تسويات', 'Purchase / Adjustment Expense', AccountType.EXPENSE, AccountNature.DEBIT, '52', False, is_system=True, purpose=ACCOUNT_PURPOSE_EXPENSE, description='حساب نظامي للمشتريات غير المخزنية وفروقات التسوية.'),
    AccountSeedRow('5217', 'عمولات بوابات الدفع', 'Payment Gateway Fees', AccountType.EXPENSE, AccountNature.DEBIT, '52', False, is_system=True, purpose=AccountingAccountPurpose.GATEWAY_FEES, description='رسوم وعمولات بوابات الدفع.'),
    AccountSeedRow('5219', 'مصروف نقل ومواصلات', 'Transportation expense', AccountType.EXPENSE, AccountNature.DEBIT, '52', False),
    AccountSeedRow('5301', 'الزكاة', 'Zakat', AccountType.EXPENSE, AccountNature.DEBIT, '53', False),
    AccountSeedRow('5302', 'الضرائب', 'TAX', AccountType.EXPENSE, AccountNature.DEBIT, '53', False),
    AccountSeedRow('5303', 'ترجمة عملات أجنبية', 'Change in currency value gains or losses', AccountType.EXPENSE, AccountNature.DEBIT, '53', False),
    AccountSeedRow('5304', 'فوائد', 'Interest', AccountType.EXPENSE, AccountNature.DEBIT, '53', False),

    # -------------------- 1 --------------------
    AccountSeedRow('110101', 'النقدية في الخزينة', 'Cash on hand', AccountType.ASSET, AccountNature.DEBIT, '1101', False, is_system=True, purpose=AccountingAccountPurpose.CASH),
    AccountSeedRow('110102', 'العهد النقدية', 'Petty cash', AccountType.ASSET, AccountNature.DEBIT, '1101', False),
    AccountSeedRow('110103', 'محافظ إلكترونية', 'Digital Wallets', AccountType.ASSET, AccountNature.DEBIT, '1101', False, is_system=True, purpose=AccountingAccountPurpose.CASH, description='حساب محافظ إلكترونية لاستخدامات الخزينة والدفع.'),
    AccountSeedRow('110201', 'حساب البنك الجاري - اسم البنك', 'Bank Current Account - Bank Name', AccountType.ASSET, AccountNature.DEBIT, '1102', False, is_system=True, purpose=AccountingAccountPurpose.BANK),
    AccountSeedRow('110202', 'بنك تجريبي', 'bank demo', AccountType.ASSET, AccountNature.DEBIT, '1102', False),
    AccountSeedRow('110401', 'تأمين طبي مقدم', 'Prepaid medical insurance', AccountType.ASSET, AccountNature.DEBIT, '1104', False),
    AccountSeedRow('110402', 'إيجار مقدم', 'Prepaid rent', AccountType.ASSET, AccountNature.DEBIT, '1104', False),
    AccountSeedRow('110901', 'عهدة المندوبين', 'Agent Custody', AccountType.ASSET, AccountNature.DEBIT, '1109', False, is_system=True),
    AccountSeedRow('110902', 'عهدة الوسطاء', 'Broker Custody', AccountType.ASSET, AccountNature.DEBIT, '1109', False, is_system=True),
    AccountSeedRow('110903', 'عهدة الموظفين', 'Employee Custody', AccountType.ASSET, AccountNature.DEBIT, '1109', False, is_system=True),
    AccountSeedRow('110904', 'عهدة الموردين', 'Supplier Custody', AccountType.ASSET, AccountNature.DEBIT, '1109', False, is_system=True),
    AccountSeedRow('111001', 'تسوية ميسر', 'Moyasar Clearing', AccountType.ASSET, AccountNature.DEBIT, '1110', False, is_system=True),
    AccountSeedRow('111002', 'تسوية تاب', 'Tap Clearing', AccountType.ASSET, AccountNature.DEBIT, '1110', False, is_system=True),
    AccountSeedRow('111003', 'تسوية تمارا', 'Tamara Clearing', AccountType.ASSET, AccountNature.DEBIT, '1110', False, is_system=True),
    AccountSeedRow('111004', 'تسوية تابي', 'Tabby Clearing', AccountType.ASSET, AccountNature.DEBIT, '1110', False, is_system=True),
    AccountSeedRow('120101', 'الأراضي', 'Lands', AccountType.ASSET, AccountNature.DEBIT, '1201', False),
    AccountSeedRow('120102', 'المباني', 'Buildings', AccountType.ASSET, AccountNature.DEBIT, '1201', False),
    AccountSeedRow('120103', 'المعدات', 'Equipment', AccountType.ASSET, AccountNature.DEBIT, '1201', False),
    AccountSeedRow('120104', 'أجهزة مكتبية وطابعات', 'Computers & printers', AccountType.ASSET, AccountNature.DEBIT, '1201', False),

    # -------------------- 2 --------------------
    AccountSeedRow('210501', 'ضريبة القيمة المضافة - مخرجات', 'VAT Output', AccountType.LIABILITY, AccountNature.CREDIT, '2105', False, is_system=True, purpose=AccountingAccountPurpose.OUTPUT_VAT, description='حساب ضريبة المخرجات على المبيعات.'),
    AccountSeedRow('210503', 'صافي ضريبة القيمة المضافة', 'VAT Net Payable', AccountType.LIABILITY, AccountNature.CREDIT, '2105', False, is_system=True, purpose=AccountingAccountPurpose.VAT_PAYABLE, description='صافي ضريبة القيمة المضافة المستحقة.'),
    AccountSeedRow('210901', 'مجمع استهلاك المباني', 'Buildings accumulated depreciation', AccountType.LIABILITY, AccountNature.CREDIT, '2109', False),
    AccountSeedRow('210902', 'مجمع استهلاك المعدات', 'Equipment accumulated depreciation', AccountType.LIABILITY, AccountNature.CREDIT, '2109', False),
    AccountSeedRow('210903', 'مجمع استهلاك أجهزة مكتبية وطابعات', 'Computers & printers accumulated depreciation', AccountType.LIABILITY, AccountNature.CREDIT, '2109', False),

    # -------------------- 5 --------------------
    AccountSeedRow('521501', 'مصروف إهلاك المباني', 'Buildings depreciation expense', AccountType.EXPENSE, AccountNature.DEBIT, '5215', False),
    AccountSeedRow('521502', 'مصروف إهلاك المعدات', 'Equipment depreciation expense', AccountType.EXPENSE, AccountNature.DEBIT, '5215', False),
    AccountSeedRow('521503', 'مصروف إهلاك أجهزة مكتبية وطابعات', 'Computers & printers depreciation expense', AccountType.EXPENSE, AccountNature.DEBIT, '5215', False),
]


DEFAULT_ROUTING_RULES: list[RoutingSeedRow] = [
    RoutingSeedRow(AccountingRoutingSource.SALES_INVOICE, AccountingAccountPurpose.ACCOUNTS_RECEIVABLE, "1103", "مدين فاتورة البيع"),
    RoutingSeedRow(AccountingRoutingSource.SALES_INVOICE, AccountingAccountPurpose.SALES_REVENUE, "4101", "دائن إيرادات البيع"),
    RoutingSeedRow(AccountingRoutingSource.SALES_INVOICE, AccountingAccountPurpose.OUTPUT_VAT, "210501", "دائن ضريبة المخرجات"),
    RoutingSeedRow(AccountingRoutingSource.SALES_CREDIT_NOTE, AccountingAccountPurpose.ACCOUNTS_RECEIVABLE, "1103", "تخفيض ذمم العملاء من الإشعار الدائن"),
    RoutingSeedRow(AccountingRoutingSource.SALES_CREDIT_NOTE, AccountingAccountPurpose.SALES_REVENUE, "4101", "عكس إيراد المبيعات للإشعار الدائن"),
    RoutingSeedRow(AccountingRoutingSource.SALES_CREDIT_NOTE, AccountingAccountPurpose.OUTPUT_VAT, "210501", "عكس ضريبة المخرجات للإشعار الدائن"),
    RoutingSeedRow(AccountingRoutingSource.PURCHASE_BILL, ACCOUNT_PURPOSE_EXPENSE, "5216", "مدين مشتريات أو مصروفات"),
    RoutingSeedRow(AccountingRoutingSource.PURCHASE_BILL, AccountingAccountPurpose.INVENTORY, "1106", "مدين المخزون عند الشراء"),
    RoutingSeedRow(AccountingRoutingSource.PURCHASE_BILL, AccountingAccountPurpose.INPUT_VAT, "1107", "مدين ضريبة المدخلات"),
    RoutingSeedRow(AccountingRoutingSource.PURCHASE_BILL, AccountingAccountPurpose.ACCOUNTS_PAYABLE, "2101", "دائن الموردين"),
    RoutingSeedRow(AccountingRoutingSource.SUPPLIER_DEBIT_NOTE, AccountingAccountPurpose.ACCOUNTS_PAYABLE, "2101", "تخفيض ذمم الموردين من إشعار المورد"),
    RoutingSeedRow(AccountingRoutingSource.SUPPLIER_DEBIT_NOTE, AccountingAccountPurpose.INVENTORY, "1106", "عكس المخزون لإشعار المورد"),
    RoutingSeedRow(AccountingRoutingSource.SUPPLIER_DEBIT_NOTE, ACCOUNT_PURPOSE_EXPENSE, "5216", "عكس مصروفات المشتريات لإشعار المورد"),
    RoutingSeedRow(AccountingRoutingSource.SUPPLIER_DEBIT_NOTE, AccountingAccountPurpose.INPUT_VAT, "1107", "عكس ضريبة المدخلات لإشعار المورد"),
    RoutingSeedRow(AccountingRoutingSource.INVENTORY_RECEIPT, AccountingAccountPurpose.INVENTORY, "1106", "مدين المخزون"),
    RoutingSeedRow(AccountingRoutingSource.INVENTORY_ISSUE, ACCOUNT_PURPOSE_COST_OF_SALES, "5101", "مدين تكلفة البضاعة المباعة"),
    RoutingSeedRow(AccountingRoutingSource.INVENTORY_ISSUE, AccountingAccountPurpose.INVENTORY, "1106", "دائن المخزون"),
    RoutingSeedRow(AccountingRoutingSource.INVENTORY_ADJUSTMENT, AccountingAccountPurpose.INVENTORY, "1106", "حساب المخزون للتسوية"),
    RoutingSeedRow(AccountingRoutingSource.INVENTORY_ADJUSTMENT, AccountingAccountPurpose.INVENTORY_ADJUSTMENT, "5216", "فرق تسوية المخزون"),
]


# ============================================================
# ⚠️ Exceptions
# ============================================================

class AccountingServiceError(Exception):
    """Base accounting service error."""


class AccountingConfigurationError(AccountingServiceError):
    """Raised when accounting configuration is missing or invalid."""


# ============================================================
# 🔧 Small helpers
# ============================================================

def _clean_code(value: Any) -> str:
    return str(value or "").strip()


def _clean_name(value: Any) -> str:
    return str(value or "").strip()


def _get_user(user: Any):
    if user is not None and getattr(user, "is_authenticated", False):
        return user
    return None


def _validate_seed_row(row: AccountSeedRow) -> None:
    if not row.code:
        raise AccountingConfigurationError("Account code is required.")

    if not row.name:
        raise AccountingConfigurationError(f"Account name is required for code {row.code}.")

    if not row.account_type:
        raise AccountingConfigurationError(f"Account type is required for code {row.code}.")

    if not row.nature:
        raise AccountingConfigurationError(f"Account nature is required for code {row.code}.")


def _validate_routing_row(row: RoutingSeedRow) -> None:
    if not row.source:
        raise AccountingConfigurationError("Routing source is required.")

    if not row.purpose:
        raise AccountingConfigurationError("Routing purpose is required.")

    if not row.account_code:
        raise AccountingConfigurationError("Routing account code is required.")


# ============================================================
# 🌳 Chart of Accounts Seeding
# ============================================================

@transaction.atomic
def seed_company_chart_of_accounts(company, *, user: Any = None, overwrite: bool = False) -> dict[str, int]:
    """
    Seed the default Saudi chart of accounts for a company.

    Safe to run multiple times:
    - Existing accounts are updated only when overwrite=True.
    - Missing accounts are created.
    - Parent-child relationships are resolved after all accounts exist.
    - Routing rules and AccountingSettings are also ensured.
    """
    if not company:
        raise AccountingConfigurationError("Company is required.")

    actor = _get_user(user)
    created_count = 0
    updated_count = 0
    skipped_count = 0
    parents_updated_count = 0

    account_cache: dict[str, Account] = {}

    for row in CHART_OF_ACCOUNTS:
        _validate_seed_row(row)

        account = Account.objects.filter(
            company=company,
            code=row.code,
        ).first()

        payload = {
            "name": row.name,
            "name_en": row.name_en,
            "account_type": row.account_type,
            "nature": row.nature,
            "is_group": row.is_group,
            "is_active": row.is_active,
            "allow_manual_posting": row.allow_manual_posting,
            "is_system": row.is_system,
            "description": row.description,
            "purpose": row.purpose,
        }

        if account:
            if overwrite:
                for key, value in payload.items():
                    setattr(account, key, value)

                account.full_clean()
                account.save()
                updated_count += 1
            else:
                skipped_count += 1
        else:
            account = Account(
                company=company,
                code=row.code,
                **payload,
            )

            account.full_clean()
            account.save()
            created_count += 1

        account_cache[row.code] = account

    for row in CHART_OF_ACCOUNTS:
        account = account_cache.get(row.code) or Account.objects.get(company=company, code=row.code)

        parent = None
        if row.parent_code:
            parent = account_cache.get(row.parent_code) or Account.objects.filter(
                company=company,
                code=row.parent_code,
            ).first()

            if not parent:
                raise AccountingConfigurationError(
                    f"Parent account {row.parent_code} was not found for account {row.code}."
                )

        update_fields = []

        if account.parent_id != (parent.id if parent else None):
            account.parent = parent
            update_fields.append("parent")

        if update_fields:
            update_fields.append("updated_at")
            account.full_clean()
            account.save(update_fields=update_fields)
            parents_updated_count += 1

    tax_rate = ensure_default_tax_rate(company, user=actor)
    settings_obj = ensure_accounting_settings(company, user=actor)
    routing_result = ensure_default_routing_rules(company, user=actor, overwrite=overwrite)

    total_accounts = Account.objects.filter(company=company).count()

    routing_created = routing_result.get("created", 0) if isinstance(routing_result, dict) else 0
    routing_updated = routing_result.get("updated", 0) if isinstance(routing_result, dict) else 0
    routing_skipped = routing_result.get("skipped", 0) if isinstance(routing_result, dict) else 0
    return {
        "company_id": company.id,
        "company_name": getattr(company, "name", ""),
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
        "created_accounts": created_count,
        "updated_accounts": updated_count,
        "skipped_accounts": skipped_count,
        "accounts_created": created_count,
        "accounts_updated": updated_count,
        "accounts_skipped": skipped_count,
        "parents_updated": parents_updated_count,
        "routing_rules_created": routing_created,
        "routing_rules_updated": routing_updated,
        "routing_rules_skipped": routing_skipped,
        "total": total_accounts,
        "total_accounts": total_accounts,
        "tax_rate_id": tax_rate.id if tax_rate else None,
        "settings_id": settings_obj.id if settings_obj else None,
    }


@transaction.atomic
def ensure_default_tax_rate(company, *, user: Any = None) -> TaxRate:
    """
    Ensure a default VAT 15% tax rate for the company.

    The current TaxRate model uses:
    - name
    - tax_type
    - direction
    - rate
    - sales_account / purchase_account
    - is_active / is_default

    No created_by / updated_by fields exist on this model.
    """
    if not company:
        raise AccountingConfigurationError("Company is required.")

    output_vat_account = get_account_by_purpose(
        company,
        AccountingAccountPurpose.OUTPUT_VAT,
        source=AccountingRoutingSource.SALES_INVOICE,
        required=False,
    )
    input_vat_account = get_account_by_purpose(
        company,
        AccountingAccountPurpose.INPUT_VAT,
        source=AccountingRoutingSource.PURCHASE_BILL,
        required=False,
    )

    tax_rate = TaxRate.objects.filter(
        company=company,
        code="VAT15",
    ).first()

    if tax_rate:
        updated_fields = []

        if tax_rate.name != "ضريبة القيمة المضافة 15%":
            tax_rate.name = "ضريبة القيمة المضافة 15%"
            updated_fields.append("name")

        if tax_rate.tax_type != TaxType.VAT:
            tax_rate.tax_type = TaxType.VAT
            updated_fields.append("tax_type")

        if tax_rate.direction != TAX_DIRECTION_OUTPUT:
            tax_rate.direction = TAX_DIRECTION_OUTPUT
            updated_fields.append("direction")

        if tax_rate.rate != Decimal("15.0000"):
            tax_rate.rate = Decimal("15.0000")
            updated_fields.append("rate")

        if output_vat_account and tax_rate.sales_account_id != output_vat_account.id:
            tax_rate.sales_account = output_vat_account
            updated_fields.append("sales_account")

        if input_vat_account and tax_rate.purchase_account_id != input_vat_account.id:
            tax_rate.purchase_account = input_vat_account
            updated_fields.append("purchase_account")

        if not tax_rate.is_active:
            tax_rate.is_active = True
            updated_fields.append("is_active")

        if not tax_rate.is_default:
            tax_rate.is_default = True
            updated_fields.append("is_default")

        if updated_fields:
            updated_fields.append("updated_at")
            tax_rate.full_clean()
            tax_rate.save(update_fields=updated_fields)

        return tax_rate

    tax_rate = TaxRate(
        company=company,
        code="VAT15",
        name="ضريبة القيمة المضافة 15%",
        tax_type=TaxType.VAT,
        direction=TAX_DIRECTION_OUTPUT,
        rate=Decimal("15.0000"),
        sales_account=output_vat_account,
        purchase_account=input_vat_account,
        is_default=True,
        is_active=True,
    )

    tax_rate.full_clean()
    tax_rate.save()
    return tax_rate


@transaction.atomic
def ensure_accounting_settings(company, *, user: Any = None) -> AccountingSettings:
    """
    Ensure accounting settings using only fields that exist on AccountingSettings.

    Current model fields:
    - default_currency
    - default_tax_rate
    - auto_post_sales
    - auto_post_purchases
    - auto_post_inventory
    - auto_post_treasury
    - require_period_for_posting
    - allow_posting_without_cost_center
    - metadata
    """
    if not company:
        raise AccountingConfigurationError("Company is required.")

    tax_rate = ensure_default_tax_rate(company, user=user)
    default_currency = getattr(company, "currency_code", None) or "SAR"

    settings_obj, _created = AccountingSettings.objects.get_or_create(
        company=company,
        defaults={
            "default_currency": default_currency,
            "default_tax_rate": tax_rate,
            "auto_post_sales": True,
            "auto_post_purchases": True,
            "auto_post_inventory": False,
            "auto_post_treasury": False,
            "require_period_for_posting": False,
            "allow_posting_without_cost_center": True,
            "metadata": {},
        },
    )

    update_fields: list[str] = []

    if not settings_obj.default_currency:
        settings_obj.default_currency = default_currency
        update_fields.append("default_currency")

    if not settings_obj.default_tax_rate_id:
        settings_obj.default_tax_rate = tax_rate
        update_fields.append("default_tax_rate")

    if update_fields:
        update_fields.append("updated_at")
        settings_obj.full_clean()
        settings_obj.save(update_fields=update_fields)

    return settings_obj


@transaction.atomic
def ensure_default_routing_rules(company, *, user: Any = None, overwrite: bool = False) -> dict[str, int]:
    if not company:
        raise AccountingConfigurationError("Company is required.")

    created_count = 0
    updated_count = 0
    skipped_count = 0
    default_tax_rate = TaxRate.objects.filter(company=company, code="VAT15").first()

    for row in DEFAULT_ROUTING_RULES:
        _validate_routing_row(row)

        account = get_account_by_code(company, row.account_code, required=True)

        tax_rate = None
        if row.purpose in {
            AccountingAccountPurpose.OUTPUT_VAT,
            AccountingAccountPurpose.INPUT_VAT,
            AccountingAccountPurpose.VAT_PAYABLE,
        }:
            tax_rate = default_tax_rate

        rule = AccountingRoutingRule.objects.filter(
            company=company,
            source=row.source,
            purpose=row.purpose,
            account=account,
            tax_rate=tax_rate,
            cost_center=None,
        ).first()

        if rule:
            if overwrite:
                rule.description = row.description
                rule.is_active = True
                rule.priority = 100
                rule.metadata = {
                    **(rule.metadata or {}),
                    "seeded_by": "seed_company_chart_of_accounts",
                }
                rule.full_clean()
                rule.save()
                updated_count += 1
            else:
                skipped_count += 1

            continue

        rule = AccountingRoutingRule(
            company=company,
            source=row.source,
            purpose=row.purpose,
            account=account,
            tax_rate=tax_rate,
            cost_center=None,
            description=row.description,
            priority=100,
            is_active=True,
            metadata={"seeded_by": "seed_company_chart_of_accounts"},
        )

        rule.full_clean()
        rule.save()
        created_count += 1

    return {
        "created": created_count,
        "updated": updated_count,
        "skipped": skipped_count,
        "total": AccountingRoutingRule.objects.filter(company=company).count(),
    }


# ============================================================
# 📘 Account helpers
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
AUTO_SOURCE_TYPE_SALES_INVOICE = "sales_invoice"


AUTO_SOURCE_TYPE_SALES_CREDIT_NOTE = "sales_credit_note"

AUTO_SOURCE_TYPE_SUPPLIER_DEBIT_NOTE = (
    "supplier_debit_note"
)
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
        raise AccountingConfigurationError(f"{field_name}: الحساب غير نشط.")

    if not account.allow_manual_posting:
        raise AccountingConfigurationError(f"{field_name}: الحساب لا يسمح بالترحيل.")

    return account


def resolve_accounting_period(company, entry_date: date):
    from accounting.models import AccountingPeriod

    period = (
        AccountingPeriod.objects.filter(
            company=company,
            start_date__lte=entry_date,
            end_date__gte=entry_date,
        )
        .order_by("start_date", "id")
        .first()
    )

    if not period:
        return None

    if period.status != AccountingPeriodStatus.OPEN:
        raise AccountingConfigurationError("الفترة المحاسبية غير مفتوحة.")

    return period


def generate_journal_entry_number(company, *, prefix: str = "JE", entry_date: date | None = None) -> str:
    entry_date = entry_date or timezone.localdate()
    year = entry_date.year

    starts_with = f"{prefix}-{year}-"

    last_entry = (
        JournalEntry.objects.filter(
            company=company,
            entry_number__startswith=starts_with,
        )
        .order_by("-entry_number", "-id")
        .first()
    )

    next_number = 1

    if last_entry and last_entry.entry_number:
        try:
            next_number = int(last_entry.entry_number.split("-")[-1]) + 1
        except (TypeError, ValueError):
            next_number = last_entry.id + 1

    return f"{starts_with}{next_number:06d}"


def _update_entry_totals(entry: JournalEntry) -> JournalEntry:
    totals = entry.lines.aggregate(
        debit=Sum("debit_amount"),
        credit=Sum("credit_amount"),
    )

    entry.total_debit = _money(totals.get("debit") or MONEY_ZERO)
    entry.total_credit = _money(totals.get("credit") or MONEY_ZERO)
    return entry


def _validate_line_payload(company, line: EntryLinePayload) -> EntryLinePayload:
    line.account = _validate_postable_account(line.account, company)
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

    update_fields = [
        "total_debit",
        "total_credit",
        "updated_at",
    ]

    if actor is not None and getattr(actor, "is_authenticated", False):
        entry.updated_by = actor
        update_fields.append("updated_by")

    entry.save(update_fields=update_fields)
    entry.refresh_from_db()
    return entry


@transaction.atomic
def create_manual_journal_entry(
    *,
    company,
    entry_date: date,
    lines: list[EntryLinePayload],
    entry_number: str = "",
    reference: str = "",
    external_reference: str = "",
    description: str = "",
    notes: str = "",
    currency: str = "SAR",
    actor: Any = None,
    auto_post: bool = False,
) -> JournalEntry:
    entry = create_journal_entry_header(
        company=company,
        entry_date=entry_date,
        entry_number=entry_number,
        posting_source=PostingSource.MANUAL,
        reference=reference,
        external_reference=external_reference,
        description=description,
        notes=notes,
        currency=currency,
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


# ============================================================
# 🔁 Phase 10.1 | Sales Invoice Automatic Accounting Posting
# ============================================================

def _source_id(value: Any) -> str:
    """
    Normalize source id for JournalEntry.source_id.
    """
    if value in [None, ""]:
        return ""

    return str(value).strip()


def _get_existing_auto_entry(
    *,
    company,
    source_type: str,
    source_id: Any,
    source_number: str = "",
) -> JournalEntry | None:
    """
    Return existing automatic journal entry for a source document.

    This prevents duplicate accounting posting for the same operational document.
    """
    if not company:
        raise AccountingPostingError("الشركة مطلوبة للبحث عن القيد المحاسبي.")

    normalized_source_id = _source_id(source_id)
    normalized_source_number = _clean_text(source_number)

    query = JournalEntry.objects.filter(
        company=company,
        source_type=source_type,
        source_id=normalized_source_id,
        is_auto_posted=True,
    ).exclude(
        status=JournalEntryStatus.CANCELLED,
    )

    if normalized_source_number:
        query = query.filter(source_number=normalized_source_number)

    return query.order_by("id").first()


def find_sales_invoice_journal_entry(invoice: Any) -> JournalEntry | None:
    """
    Find the existing accounting entry linked to a sales invoice.
    """
    if not invoice:
        return None

    company = getattr(invoice, "company", None)
    if not company:
        return None

    invoice_number = _clean_text(getattr(invoice, "invoice_number", ""))

    return _get_existing_auto_entry(
        company=company,
        source_type=AUTO_SOURCE_TYPE_SALES_INVOICE,
        source_id=getattr(invoice, "pk", None),
        source_number=invoice_number,
    )


@transaction.atomic
def post_sales_invoice_to_accounting(
    invoice: Any,
    *,
    actor: Any = None,
    auto_post: bool = True,
) -> JournalEntry:
    """
    Create and optionally post an automatic accounting journal entry for an issued sales invoice.

    Accounting treatment:
    - Debit  Accounts Receivable  = invoice.total_amount
    - Credit Sales Revenue        = invoice.total_amount - invoice.tax_amount
    - Credit Output VAT           = invoice.tax_amount, when tax exists

    Safety:
    - Does not trust company_id from frontend.
    - Uses invoice.company as the tenant source.
    - Prevents duplicate entries for the same invoice.
    - Refuses non-issued invoices.
    - Refuses zero-value invoices.
    """
    if not invoice:
        raise AccountingPostingError("فاتورة البيع مطلوبة للترحيل المحاسبي.")

    company = getattr(invoice, "company", None)
    _validate_company(company)

    if getattr(invoice, "company_id", None) != getattr(company, "pk", None):
        raise AccountingPostingError("فاتورة البيع لا تتبع الشركة المحددة.")

    invoice_number = _clean_text(getattr(invoice, "invoice_number", "")) or f"SALES-INVOICE-{invoice.pk}"

    existing = _get_existing_auto_entry(
        company=company,
        source_type=AUTO_SOURCE_TYPE_SALES_INVOICE,
        source_id=invoice.pk,
        source_number=invoice_number,
    )

    if existing:
        if auto_post and existing.status == JournalEntryStatus.DRAFT:
            return post_journal_entry(existing, actor=actor)
        return existing

    status = _clean_text(getattr(invoice, "status", "")).lower()
    if status != "issued":
        raise AccountingPostingError("لا يمكن ترحيل فاتورة بيع غير مصدرة محاسبيًا.")

    total_amount = _money(getattr(invoice, "total_amount", MONEY_ZERO))
    tax_amount = _money(getattr(invoice, "tax_amount", MONEY_ZERO))
    revenue_amount = _money(total_amount - tax_amount)

    if total_amount <= MONEY_ZERO:
        raise AccountingPostingError("لا يمكن ترحيل فاتورة بيع بإجمالي صفري.")

    if revenue_amount <= MONEY_ZERO:
        raise AccountingPostingError("لا يمكن ترحيل فاتورة بيع بدون إيراد.")

    seed_company_chart_of_accounts(company)

    receivable_account = get_account_by_purpose(
        company,
        AccountingAccountPurpose.ACCOUNTS_RECEIVABLE,
        source=AccountingRoutingSource.SALES_INVOICE,
        required=True,
    )

    revenue_account = get_account_by_purpose(
        company,
        AccountingAccountPurpose.SALES_REVENUE,
        source=AccountingRoutingSource.SALES_INVOICE,
        required=True,
    )

    output_vat_account = None
    default_tax_rate = None

    if tax_amount > MONEY_ZERO:
        output_vat_account = get_account_by_purpose(
            company,
            AccountingAccountPurpose.OUTPUT_VAT,
            source=AccountingRoutingSource.SALES_INVOICE,
            required=True,
        )
        default_tax_rate = get_default_tax_rate(company)

    currency = _clean_currency(getattr(invoice, "currency_code", "") or "SAR")
    entry_date = getattr(invoice, "invoice_date", None) or timezone.localdate()
    customer_id = _clean_text(getattr(invoice, "customer_id", "") or "")

    entry = create_journal_entry_header(
        company=company,
        entry_date=entry_date,
        entry_number=generate_journal_entry_number(company, prefix="SINV"),
        posting_source=PostingSource.SALES_INVOICE,
        reference=invoice_number,
        external_reference=invoice_number,
        description=f"قيد تلقائي لفاتورة بيع {invoice_number}",
        notes="تم إنشاء هذا القيد تلقائيًا عند إصدار فاتورة البيع.",
        currency=currency,
        source_type=AUTO_SOURCE_TYPE_SALES_INVOICE,
        source_id=_source_id(invoice.pk),
        source_number=invoice_number,
        is_auto_posted=True,
        actor=actor,
    )

    lines: list[EntryLinePayload] = [
        EntryLinePayload(
            account=receivable_account,
            description=f"ذمم مدينة عن فاتورة بيع {invoice_number}",
            debit_amount=total_amount,
            credit_amount=MONEY_ZERO,
            currency=currency,
            party_type="customer" if customer_id else "",
            party_id=customer_id,
            source_line_id="invoice-total",
            sort_order=1,
            metadata={
                "source": AUTO_SOURCE_TYPE_SALES_INVOICE,
                "invoice_id": invoice.pk,
                "invoice_number": invoice_number,
            },
        ),
        EntryLinePayload(
            account=revenue_account,
            description=f"إيراد فاتورة بيع {invoice_number}",
            debit_amount=MONEY_ZERO,
            credit_amount=revenue_amount,
            currency=currency,
            party_type="customer" if customer_id else "",
            party_id=customer_id,
            source_line_id="invoice-revenue",
            sort_order=2,
            metadata={
                "source": AUTO_SOURCE_TYPE_SALES_INVOICE,
                "invoice_id": invoice.pk,
                "invoice_number": invoice_number,
                "subtotal": str(getattr(invoice, "subtotal", MONEY_ZERO)),
                "discount_amount": str(getattr(invoice, "discount_amount", MONEY_ZERO)),
                "taxable_amount": str(getattr(invoice, "taxable_amount", MONEY_ZERO)),
            },
        ),
    ]

    if tax_amount > MONEY_ZERO and output_vat_account:
        lines.append(
            EntryLinePayload(
                account=output_vat_account,
                description=f"ضريبة مخرجات لفاتورة بيع {invoice_number}",
                debit_amount=MONEY_ZERO,
                credit_amount=tax_amount,
                currency=currency,
                tax_rate=default_tax_rate,
                tax_amount=tax_amount,
                party_type="customer" if customer_id else "",
                party_id=customer_id,
                source_line_id="invoice-output-vat",
                sort_order=3,
                metadata={
                    "source": AUTO_SOURCE_TYPE_SALES_INVOICE,
                    "invoice_id": invoice.pk,
                    "invoice_number": invoice_number,
                    "tax_amount": str(tax_amount),
                },
            )
        )

    entry = replace_journal_entry_lines(
        entry,
        lines,
        actor=actor,
    )

    entry.metadata = {
        **(entry.metadata or {}),
        "source": AUTO_SOURCE_TYPE_SALES_INVOICE,
        "source_app": "sales",
        "invoice_id": invoice.pk,
        "invoice_number": invoice_number,
        "customer_id": customer_id,
        "total_amount": str(total_amount),
        "tax_amount": str(tax_amount),
        "revenue_amount": str(revenue_amount),
        "auto_posted_by_phase": "phase_10_1",
    }

    metadata_update_fields = ["metadata", "updated_at"]

    if actor is not None and getattr(actor, "is_authenticated", False):
        entry.updated_by = actor
        metadata_update_fields.append("updated_by")

    entry.save(update_fields=metadata_update_fields)

    if auto_post:
        entry = post_journal_entry(entry, actor=actor)

    return entry



def find_sales_credit_note_journal_entry(
    credit_note: Any,
) -> JournalEntry | None:
    """
    Find the automatic journal entry linked to a sales
    credit note.
    """
    if not credit_note:
        return None

    company = getattr(
        credit_note,
        "company",
        None,
    )

    if not company:
        return None

    credit_note_number = _clean_text(
        getattr(
            credit_note,
            "credit_note_number",
            "",
        )
    )

    return _get_existing_auto_entry(
        company=company,
        source_type=(
            AUTO_SOURCE_TYPE_SALES_CREDIT_NOTE
        ),
        source_id=getattr(
            credit_note,
            "pk",
            None,
        ),
        source_number=credit_note_number,
    )


@transaction.atomic
def post_sales_credit_note_to_accounting(
    credit_note: Any,
    *,
    actor: Any = None,
    auto_post: bool = True,
) -> JournalEntry:
    """
    Create the accounting entry for an issued sales credit note.

    Treatment:
    - Debit sales revenue.
    - Debit output VAT when applicable.
    - Credit accounts receivable.
    """
    if not credit_note:
        raise AccountingPostingError(
            "??????? ?????? ????? ??????? ????????."
        )

    company = getattr(
        credit_note,
        "company",
        None,
    )
    _validate_company(company)

    if (
        getattr(credit_note, "company_id", None)
        != getattr(company, "pk", None)
    ):
        raise AccountingPostingError(
            "??????? ?????? ?? ???? ?????? ???????."
        )

    status = _clean_text(
        getattr(
            credit_note,
            "status",
            "",
        )
    ).lower()

    if status not in {
        "issued",
        "posted",
    }:
        raise AccountingPostingError(
            "?? ???? ????? ????? ???? ??? ???? ???????."
        )

    credit_note_number = (
        _clean_text(
            getattr(
                credit_note,
                "credit_note_number",
                "",
            )
        )
        or f"SALES-CREDIT-NOTE-{credit_note.pk}"
    )

    existing = _get_existing_auto_entry(
        company=company,
        source_type=(
            AUTO_SOURCE_TYPE_SALES_CREDIT_NOTE
        ),
        source_id=credit_note.pk,
        source_number=credit_note_number,
    )

    if existing:
        if (
            auto_post
            and existing.status
            == JournalEntryStatus.DRAFT
        ):
            existing = post_journal_entry(
                existing,
                actor=actor,
            )

        return existing

    total_amount = _money(
        getattr(
            credit_note,
            "total_amount",
            MONEY_ZERO,
        )
    )
    tax_amount = _money(
        getattr(
            credit_note,
            "tax_amount",
            MONEY_ZERO,
        )
    )
    revenue_amount = _money(
        total_amount - tax_amount
    )

    if total_amount <= MONEY_ZERO:
        raise AccountingPostingError(
            "?? ???? ????? ????? ???? ??????? ????."
        )

    if revenue_amount <= MONEY_ZERO:
        raise AccountingPostingError(
            "?? ???? ????? ????? ???? ???? ???? ?????."
        )

    seed_company_chart_of_accounts(
        company
    )

    receivable_account = get_account_by_purpose(
        company,
        AccountingAccountPurpose.ACCOUNTS_RECEIVABLE,
        source=(
            AccountingRoutingSource
            .SALES_CREDIT_NOTE
        ),
        required=True,
    )

    revenue_account = get_account_by_purpose(
        company,
        AccountingAccountPurpose.SALES_REVENUE,
        source=(
            AccountingRoutingSource
            .SALES_CREDIT_NOTE
        ),
        required=True,
    )

    output_vat_account = None
    default_tax_rate = None

    if tax_amount > MONEY_ZERO:
        output_vat_account = get_account_by_purpose(
            company,
            AccountingAccountPurpose.OUTPUT_VAT,
            source=(
                AccountingRoutingSource
                .SALES_CREDIT_NOTE
            ),
            required=True,
        )
        default_tax_rate = get_default_tax_rate(
            company
        )

    currency = _clean_currency(
        getattr(
            credit_note,
            "currency_code",
            "",
        )
        or "SAR"
    )

    entry_date = (
        getattr(
            credit_note,
            "credit_note_date",
            None,
        )
        or timezone.localdate()
    )

    customer_id = _clean_text(
        getattr(
            credit_note,
            "customer_id",
            "",
        )
        or ""
    )

    invoice_id = getattr(
        credit_note,
        "invoice_id",
        None,
    )
    sales_return_id = getattr(
        credit_note,
        "sales_return_id",
        None,
    )

    entry = create_journal_entry_header(
        company=company,
        entry_date=entry_date,
        entry_number=generate_journal_entry_number(
            company,
            prefix="SCN",
        ),
        posting_source=(
            PostingSource.SALES_CREDIT_NOTE
        ),
        reference=credit_note_number,
        external_reference=credit_note_number,
        description=(
            "??? ?????? ?????? ???? ?????? "
            f"{credit_note_number}"
        ),
        notes=(
            "?? ????? ????? ??????? ??? ????? "
            "??????? ??????."
        ),
        currency=currency,
        source_type=(
            AUTO_SOURCE_TYPE_SALES_CREDIT_NOTE
        ),
        source_id=_source_id(
            credit_note.pk
        ),
        source_number=credit_note_number,
        is_auto_posted=True,
        actor=actor,
    )

    lines = [
        EntryLinePayload(
            account=revenue_account,
            description=(
                "??? ????? ?????? ?? ????? ???? "
                f"{credit_note_number}"
            ),
            debit_amount=revenue_amount,
            currency=currency,
            party_type=(
                "customer"
                if customer_id
                else ""
            ),
            party_id=customer_id,
            source_line_id=(
                "credit-note-revenue"
            ),
            sort_order=1,
            metadata={
                "source": (
                    AUTO_SOURCE_TYPE_SALES_CREDIT_NOTE
                ),
                "credit_note_id": credit_note.pk,
                "invoice_id": invoice_id,
                "sales_return_id": sales_return_id,
            },
        ),
    ]

    if (
        tax_amount > MONEY_ZERO
        and output_vat_account
    ):
        lines.append(
            EntryLinePayload(
                account=output_vat_account,
                description=(
                    "??? ????? ?????? ?? ????? ???? "
                    f"{credit_note_number}"
                ),
                debit_amount=tax_amount,
                currency=currency,
                tax_rate=default_tax_rate,
                tax_amount=tax_amount,
                party_type=(
                    "customer"
                    if customer_id
                    else ""
                ),
                party_id=customer_id,
                source_line_id=(
                    "credit-note-output-vat"
                ),
                sort_order=2,
                metadata={
                    "source": (
                        AUTO_SOURCE_TYPE_SALES_CREDIT_NOTE
                    ),
                    "credit_note_id": credit_note.pk,
                    "invoice_id": invoice_id,
                    "sales_return_id": sales_return_id,
                },
            )
        )

    lines.append(
        EntryLinePayload(
            account=receivable_account,
            description=(
                "????? ??? ?????? ?? ????? ???? "
                f"{credit_note_number}"
            ),
            credit_amount=total_amount,
            currency=currency,
            party_type=(
                "customer"
                if customer_id
                else ""
            ),
            party_id=customer_id,
            source_line_id=(
                "credit-note-receivable"
            ),
            sort_order=3,
            metadata={
                "source": (
                    AUTO_SOURCE_TYPE_SALES_CREDIT_NOTE
                ),
                "credit_note_id": credit_note.pk,
                "invoice_id": invoice_id,
                "sales_return_id": sales_return_id,
            },
        )
    )

    entry = replace_journal_entry_lines(
        entry,
        lines,
        actor=actor,
    )

    entry.metadata = {
        **(entry.metadata or {}),
        "source": (
            AUTO_SOURCE_TYPE_SALES_CREDIT_NOTE
        ),
        "source_app": "sales",
        "credit_note_id": credit_note.pk,
        "credit_note_number": credit_note_number,
        "invoice_id": invoice_id,
        "sales_return_id": sales_return_id,
        "customer_id": customer_id,
        "total_amount": str(total_amount),
        "tax_amount": str(tax_amount),
        "revenue_amount": str(revenue_amount),
        "auto_posted_by_phase": "phase_21_5_4",
    }

    update_fields = [
        "metadata",
        "updated_at",
    ]

    if (
        actor is not None
        and getattr(
            actor,
            "is_authenticated",
            False,
        )
    ):
        entry.updated_by = actor
        update_fields.append(
            "updated_by"
        )

    entry.save(
        update_fields=update_fields
    )

    if auto_post:
        entry = post_journal_entry(
            entry,
            actor=actor,
        )

    return entry



def find_supplier_debit_note_journal_entry(
    debit_note: Any,
) -> JournalEntry | None:
    """
    Find the automatic accounting entry linked to
    a supplier debit note.
    """
    if not debit_note:
        return None

    company = getattr(
        debit_note,
        "company",
        None,
    )

    if not company:
        return None

    debit_note_number = _clean_text(
        getattr(
            debit_note,
            "debit_note_number",
            "",
        )
    )

    return _get_existing_auto_entry(
        company=company,
        source_type=(
            AUTO_SOURCE_TYPE_SUPPLIER_DEBIT_NOTE
        ),
        source_id=getattr(
            debit_note,
            "pk",
            None,
        ),
        source_number=debit_note_number,
    )


def get_supplier_debit_note_posting_buckets(
    debit_note: Any,
) -> dict[str, Decimal]:
    """
    Split supplier debit note net amount between
    inventory and purchase expense.
    """
    inventory_amount = MONEY_ZERO
    expense_amount = MONEY_ZERO

    items = debit_note.items.select_related(
        "item"
    ).order_by(
        "line_number",
        "id",
    )

    for line in items:
        line_amount = _money(
            getattr(
                line,
                "taxable_amount",
                MONEY_ZERO,
            )
        )

        item = getattr(
            line,
            "item",
            None,
        )

        if (
            item
            and bool(
                getattr(
                    item,
                    "track_inventory",
                    False,
                )
            )
        ):
            inventory_amount += line_amount
        else:
            expense_amount += line_amount

    return {
        "inventory_amount": _money(
            inventory_amount
        ),
        "expense_amount": _money(
            expense_amount
        ),
    }


@transaction.atomic
def post_supplier_debit_note_to_accounting(
    debit_note: Any,
    *,
    actor: Any = None,
    auto_post: bool = True,
) -> JournalEntry:
    """
    Create the accounting entry for an issued
    supplier debit note.

    Treatment:
    - Debit accounts payable.
    - Credit inventory for returned products.
    - Credit purchase expense for service/non-stock lines.
    - Credit input VAT when applicable.
    """
    if not debit_note:
        raise AccountingPostingError(
            "????? ??? ?????? ????? ??????? ????????."
        )

    company = getattr(
        debit_note,
        "company",
        None,
    )
    _validate_company(company)

    if (
        getattr(debit_note, "company_id", None)
        != getattr(company, "pk", None)
    ):
        raise AccountingPostingError(
            "????? ??? ?????? ?? ???? ?????? ???????."
        )

    status = _clean_text(
        getattr(
            debit_note,
            "status",
            "",
        )
    ).upper()

    if status not in {
        "ISSUED",
        "POSTED",
    }:
        raise AccountingPostingError(
            "?? ???? ????? ????? ??? ???? ??? ????."
        )

    debit_note_number = (
        _clean_text(
            getattr(
                debit_note,
                "debit_note_number",
                "",
            )
        )
        or (
            "SUPPLIER-DEBIT-NOTE-"
            f"{debit_note.pk}"
        )
    )

    existing = _get_existing_auto_entry(
        company=company,
        source_type=(
            AUTO_SOURCE_TYPE_SUPPLIER_DEBIT_NOTE
        ),
        source_id=debit_note.pk,
        source_number=debit_note_number,
    )

    if existing:
        if (
            auto_post
            and existing.status
            == JournalEntryStatus.DRAFT
        ):
            return post_journal_entry(
                existing,
                actor=actor,
            )

        return existing

    total_amount = _money(
        getattr(
            debit_note,
            "total_amount",
            MONEY_ZERO,
        )
    )
    tax_amount = _money(
        getattr(
            debit_note,
            "tax_amount",
            MONEY_ZERO,
        )
    )

    if total_amount <= MONEY_ZERO:
        raise AccountingPostingError(
            "?? ???? ????? ????? ??? ???? ??????? ????."
        )

    if tax_amount < MONEY_ZERO:
        raise AccountingPostingError(
            "????? ????? ??? ?????? ?? ???? ?? ???? ?????."
        )

    seed_company_chart_of_accounts(
        company
    )

    payable_account = get_account_by_purpose(
        company,
        AccountingAccountPurpose.ACCOUNTS_PAYABLE,
        source=(
            AccountingRoutingSource
            .SUPPLIER_DEBIT_NOTE
        ),
        required=True,
    )

    inventory_account = get_account_by_purpose(
        company,
        AccountingAccountPurpose.INVENTORY,
        source=(
            AccountingRoutingSource
            .SUPPLIER_DEBIT_NOTE
        ),
        required=False,
    )

    expense_account = get_account_by_purpose(
        company,
        ACCOUNT_PURPOSE_EXPENSE,
        source=(
            AccountingRoutingSource
            .SUPPLIER_DEBIT_NOTE
        ),
        required=False,
    )

    input_vat_account = None
    default_tax_rate = None

    if tax_amount > MONEY_ZERO:
        input_vat_account = get_account_by_purpose(
            company,
            AccountingAccountPurpose.INPUT_VAT,
            source=(
                AccountingRoutingSource
                .SUPPLIER_DEBIT_NOTE
            ),
            required=True,
        )
        default_tax_rate = get_default_tax_rate(
            company
        )

    buckets = (
        get_supplier_debit_note_posting_buckets(
            debit_note
        )
    )
    inventory_amount = buckets[
        "inventory_amount"
    ]
    expense_amount = buckets[
        "expense_amount"
    ]

    base_amount = _money(
        total_amount - tax_amount
    )

    if (
        inventory_amount
        + expense_amount
        != base_amount
    ):
        raise AccountingPostingError(
            "?????? ????? ??? ?????? ?? ????? "
            "???????? ??? ???????."
        )

    if (
        inventory_amount > MONEY_ZERO
        and not inventory_account
    ):
        raise AccountingPostingError(
            "?? ???? ???? ????? ???? ?????? "
            "????? ??? ??????."
        )

    if (
        expense_amount > MONEY_ZERO
        and not expense_account
    ):
        raise AccountingPostingError(
            "?? ???? ???? ????? ??????? ???? "
            "?????? ????? ??? ??????."
        )

    currency = _clean_currency(
        getattr(
            debit_note,
            "currency_code",
            "",
        )
        or "SAR"
    )
    entry_date = (
        getattr(
            debit_note,
            "debit_note_date",
            None,
        )
        or timezone.localdate()
    )
    supplier_id = _clean_text(
        getattr(
            debit_note,
            "supplier_id",
            "",
        )
        or ""
    )

    entry = create_journal_entry_header(
        company=company,
        entry_date=entry_date,
        entry_number=generate_journal_entry_number(
            company,
            prefix="SDN",
        ),
        posting_source=(
            PostingSource.SUPPLIER_DEBIT_NOTE
        ),
        reference=debit_note_number,
        external_reference=(
            _clean_text(
                getattr(
                    debit_note,
                    "supplier_reference",
                    "",
                )
            )
            or debit_note_number
        ),
        description=(
            "??? ?????? ?????? ??? ???? "
            f"{debit_note_number}"
        ),
        notes=(
            "?? ????? ??? ????? ???????? ??? "
            "????? ????? ??? ??????."
        ),
        currency=currency,
        source_type=(
            AUTO_SOURCE_TYPE_SUPPLIER_DEBIT_NOTE
        ),
        source_id=_source_id(
            debit_note.pk
        ),
        source_number=debit_note_number,
        is_auto_posted=True,
        actor=actor,
    )

    lines: list[EntryLinePayload] = [
        EntryLinePayload(
            account=payable_account,
            description=(
                "????? ??? ?????? ?? ????? ????? "
                f"{debit_note_number}"
            ),
            debit_amount=total_amount,
            currency=currency,
            party_type=(
                "supplier"
                if supplier_id
                else ""
            ),
            party_id=supplier_id,
            source_line_id=(
                "supplier-debit-note-payable"
            ),
            sort_order=1,
            metadata={
                "source": (
                    AUTO_SOURCE_TYPE_SUPPLIER_DEBIT_NOTE
                ),
                "debit_note_id": debit_note.pk,
                "bill_id": getattr(
                    debit_note,
                    "bill_id",
                    None,
                ),
                "purchase_return_id": getattr(
                    debit_note,
                    "purchase_return_id",
                    None,
                ),
                "bucket": "payable",
            },
        ),
    ]

    sort_order = 2

    if inventory_amount > MONEY_ZERO:
        lines.append(
            EntryLinePayload(
                account=inventory_account,
                description=(
                    "????? ????? ?????? ?? ????? "
                    f"{debit_note_number}"
                ),
                credit_amount=inventory_amount,
                currency=currency,
                party_type=(
                    "supplier"
                    if supplier_id
                    else ""
                ),
                party_id=supplier_id,
                source_line_id=(
                    "supplier-debit-note-inventory"
                ),
                sort_order=sort_order,
                metadata={
                    "source": (
                        AUTO_SOURCE_TYPE_SUPPLIER_DEBIT_NOTE
                    ),
                    "debit_note_id": debit_note.pk,
                    "bucket": "inventory",
                },
            )
        )
        sort_order += 1

    if expense_amount > MONEY_ZERO:
        lines.append(
            EntryLinePayload(
                account=expense_account,
                description=(
                    "??? ????? ??????? ?? ????? "
                    f"{debit_note_number}"
                ),
                credit_amount=expense_amount,
                currency=currency,
                party_type=(
                    "supplier"
                    if supplier_id
                    else ""
                ),
                party_id=supplier_id,
                source_line_id=(
                    "supplier-debit-note-expense"
                ),
                sort_order=sort_order,
                metadata={
                    "source": (
                        AUTO_SOURCE_TYPE_SUPPLIER_DEBIT_NOTE
                    ),
                    "debit_note_id": debit_note.pk,
                    "bucket": "expense",
                },
            )
        )
        sort_order += 1

    if (
        tax_amount > MONEY_ZERO
        and input_vat_account
    ):
        lines.append(
            EntryLinePayload(
                account=input_vat_account,
                description=(
                    "??? ????? ?????? ?? ????? "
                    f"{debit_note_number}"
                ),
                credit_amount=tax_amount,
                currency=currency,
                tax_rate=default_tax_rate,
                tax_amount=tax_amount,
                party_type=(
                    "supplier"
                    if supplier_id
                    else ""
                ),
                party_id=supplier_id,
                source_line_id=(
                    "supplier-debit-note-input-vat"
                ),
                sort_order=sort_order,
                metadata={
                    "source": (
                        AUTO_SOURCE_TYPE_SUPPLIER_DEBIT_NOTE
                    ),
                    "debit_note_id": debit_note.pk,
                    "bucket": "input_vat",
                },
            )
        )

    entry = replace_journal_entry_lines(
        entry,
        lines,
        actor=actor,
    )

    entry.metadata = {
        **(entry.metadata or {}),
        "source": (
            AUTO_SOURCE_TYPE_SUPPLIER_DEBIT_NOTE
        ),
        "source_app": "purchases",
        "debit_note_id": debit_note.pk,
        "debit_note_number": (
            debit_note_number
        ),
        "bill_id": getattr(
            debit_note,
            "bill_id",
            None,
        ),
        "purchase_return_id": getattr(
            debit_note,
            "purchase_return_id",
            None,
        ),
        "supplier_id": supplier_id,
        "total_amount": str(total_amount),
        "tax_amount": str(tax_amount),
        "inventory_amount": str(
            inventory_amount
        ),
        "expense_amount": str(
            expense_amount
        ),
        "auto_posted_by_phase": (
            "phase_21_7_c"
        ),
    }

    update_fields = [
        "metadata",
        "updated_at",
    ]

    if (
        actor is not None
        and getattr(
            actor,
            "is_authenticated",
            False,
        )
    ):
        entry.updated_by = actor
        update_fields.append(
            "updated_by"
        )

    entry.save(
        update_fields=update_fields
    )

    if auto_post:
        entry = post_journal_entry(
            entry,
            actor=actor,
        )

    return entry


@transaction.atomic
def cancel_journal_entry(
    entry: JournalEntry,
    *,
    reason: str = "",
    actor: Any = None,
) -> JournalEntry:
    if not entry:
        raise AccountingPostingError("القيد مطلوب.")

    entry = JournalEntry.objects.select_for_update().get(pk=entry.pk)

    if entry.status == JournalEntryStatus.POSTED:
        raise AccountingPostingError("لا يمكن إلغاء قيد مرحل. استخدم عكس القيد.")

    if entry.status == JournalEntryStatus.REVERSED:
        raise AccountingPostingError("لا يمكن إلغاء قيد معكوس.")

    if entry.status == JournalEntryStatus.CANCELLED:
        return entry

    entry.status = JournalEntryStatus.CANCELLED
    entry.cancelled_at = timezone.now()
    entry.cancelled_reason = _clean_text(reason)

    update_fields = [
        "status",
        "cancelled_at",
        "cancelled_reason",
        "updated_at",
    ]

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
        raise AccountingPostingError("يمكن عكس القيود المرحلة فقط.")

    if entry.reversed_entry_id:
        return entry.reversed_entry

    reversal_date = reversal_date or timezone.localdate()

    reversal = create_journal_entry_header(
        company=entry.company,
        entry_date=reversal_date,
        entry_number=generate_journal_entry_number(entry.company, prefix="REV"),
        posting_source=PostingSource.OTHER,
        reference=entry.reference,
        external_reference=entry.external_reference,
        description=f"عكس القيد {entry.entry_number}",
        notes=_clean_text(reason) or f"قيد عكسي للقيد {entry.entry_number}",
        currency=entry.currency,
        source_type=entry.source_type,
        source_id=entry.source_id,
        source_number=entry.source_number,
        is_auto_posted=entry.is_auto_posted,
        actor=actor,
    )

    reversal.reversal_of = entry
    reversal.save(update_fields=["reversal_of", "updated_at"])

    reversal_lines = []

    for line in entry.lines.select_related(
        "account",
        "cost_center",
        "tax_rate",
    ).order_by("sort_order", "id"):
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
                sort_order=line.sort_order,
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
# ============================================================
# 💰 Phase 11.4 | Treasury Customer/Supplier Payment Accounting
# ============================================================

AUTO_SOURCE_TYPE_CUSTOMER_PAYMENT = "customer_payment"
AUTO_SOURCE_TYPE_SUPPLIER_PAYMENT = "supplier_payment"
POSTING_SOURCE_TREASURY = getattr(PostingSource, "TREASURY", PostingSource.OTHER)


def _payment_number(payment: Any, *, fallback_prefix: str) -> str:
    """
    Return a safe payment number for references.
    """
    number = _clean_text(getattr(payment, "payment_number", ""))
    if number:
        return number

    payment_id = getattr(payment, "pk", None) or getattr(payment, "id", None) or ""
    return f"{fallback_prefix}-{payment_id}"


def _ensure_confirmed_payment(payment: Any, *, payment_label: str) -> None:
    """
    Ensure payment is confirmed before posting to accounting.
    """
    status = _clean_text(getattr(payment, "status", "")).upper()

    if status != "CONFIRMED":
        raise AccountingPostingError(f"لا يمكن ترحيل {payment_label} غير مؤكدة محاسبيا.")


def _resolve_treasury_accounting_account(company, treasury_account: Any) -> Account:
    """
    Resolve accounting account for treasury payment posting.
    Confirmed treasury payments must post to the exact linked cashbox/bank
    ledger account. Missing linkage is an accounting configuration error.
    """
    if not treasury_account:
        raise AccountingConfigurationError("حساب الخزينة مطلوب للترحيل المحاسبي.")
    if getattr(treasury_account, "company_id", None) != getattr(company, "pk", None):
        raise AccountingConfigurationError("حساب الخزينة لا يتبع نفس الشركة.")
    linked_account = getattr(treasury_account, "accounting_account", None)
    linked_account_id = getattr(treasury_account, "accounting_account_id", None)
    if linked_account is None and linked_account_id:
        linked_account = Account.objects.filter(
            company=company,
            pk=linked_account_id,
        ).first()
    if linked_account is None:
        raise AccountingConfigurationError(
            "حساب الخزينة غير مربوط بحساب محاسبي. اربط الصندوق أو الحساب البنكي بحساب محاسبي قبل التأكيد."
        )
    if getattr(linked_account, "company_id", None) != getattr(company, "pk", None):
        raise AccountingConfigurationError("حساب الخزينة المحاسبي لا يتبع نفس الشركة.")
    if linked_account.is_group:
        raise AccountingConfigurationError("حساب الخزينة المحاسبي لا يمكن أن يكون حساب مجموعة.")
    if not linked_account.is_active:
        raise AccountingConfigurationError("حساب الخزينة المحاسبي غير نشط.")
    if not linked_account.allow_manual_posting:
        raise AccountingConfigurationError("حساب الخزينة المحاسبي لا يسمح بالترحيل.")
    if linked_account.account_type != AccountType.ASSET:
        raise AccountingConfigurationError("حساب الخزينة المحاسبي يجب أن يكون من نوع أصل.")
    if linked_account.nature != AccountNature.DEBIT:
        raise AccountingConfigurationError("حساب الخزينة المحاسبي يجب أن تكون طبيعته مدينة.")
    return linked_account

def _mark_payment_accounting_posted(payment: Any, entry: JournalEntry) -> None:
    """
    Mark operational payment as accounting-posted when the model supports these fields.
    """
    update_fields: list[str] = []

    if hasattr(payment, "accounting_entry"):
        payment.accounting_entry = entry
        update_fields.append("accounting_entry")

    if hasattr(payment, "is_accounting_posted"):
        payment.is_accounting_posted = True
        update_fields.append("is_accounting_posted")

    if hasattr(payment, "accounting_posted_at"):
        payment.accounting_posted_at = timezone.now()
        update_fields.append("accounting_posted_at")

    if update_fields:
        update_fields.append("updated_at")
        payment.save(update_fields=update_fields)



def _payment_counterparty_type(payment: Any, default: str) -> str:
    value = _clean_text(getattr(payment, "counterparty_type", "") or default).upper()
    return value or default
def _resolve_payment_counterparty_posting_account(
    company,
    payment: Any,
    *,
    payment_label: str,
) -> Account:
    account = getattr(payment, "counterparty_account", None)
    account_id = getattr(payment, "counterparty_account_id", None)
    if account is None and account_id:
        account = Account.objects.filter(
            company=company,
            pk=account_id,
        ).first()
    if not account:
        raise AccountingConfigurationError(
            f"{payment_label} يتطلب حساب طرف محاسبي صالح."
        )
    if getattr(account, "company_id", None) != getattr(company, "pk", None):
        raise AccountingConfigurationError(
            f"حساب الطرف في {payment_label} لا يتبع نفس الشركة."
        )
    if account.is_group:
        raise AccountingConfigurationError(
            f"حساب الطرف في {payment_label} لا يمكن أن يكون حساب مجموعة."
        )
    if not account.is_active:
        raise AccountingConfigurationError(
            f"حساب الطرف في {payment_label} غير نشط."
        )
    if not account.allow_manual_posting:
        raise AccountingConfigurationError(
            f"حساب الطرف في {payment_label} لا يسمح بالترحيل."
        )
    return account
def find_customer_payment_journal_entry(payment: Any) -> JournalEntry | None:
    """
    Find the existing accounting entry linked to a customer payment.
    """
    if not payment:
        return None

    company = getattr(payment, "company", None)
    if not company:
        return None

    payment_number = _payment_number(payment, fallback_prefix="CUSTOMER-PAYMENT")

    return _get_existing_auto_entry(
        company=company,
        source_type=AUTO_SOURCE_TYPE_CUSTOMER_PAYMENT,
        source_id=getattr(payment, "pk", None),
        source_number=payment_number,
    )


@transaction.atomic
def post_customer_payment_to_accounting(
    payment: Any,
    *,
    actor: Any = None,
    auto_post: bool = True,
) -> JournalEntry:
    """
    Create and optionally post an automatic accounting journal entry for a confirmed customer payment.

    Accounting treatment:
    - Debit  Treasury/Cash/Bank       = payment.amount
    - Credit Accounts Receivable      = payment.amount

    Safety:
    - Uses payment.company as tenant source.
    - Refuses non-confirmed payments.
    - Prevents duplicate entries for same payment.
    - Links entry back to payment when fields exist.
    """
    if not payment:
        raise AccountingPostingError("دفعة العميل مطلوبة للترحيل المحاسبي.")

    company = getattr(payment, "company", None)
    _validate_company(company)

    if getattr(payment, "company_id", None) != getattr(company, "pk", None):
        raise AccountingPostingError("دفعة العميل لا تتبع الشركة المحددة.")

    _ensure_confirmed_payment(payment, payment_label="دفعة عميل")

    payment_number = _payment_number(payment, fallback_prefix="CUSTOMER-PAYMENT")

    existing = _get_existing_auto_entry(
        company=company,
        source_type=AUTO_SOURCE_TYPE_CUSTOMER_PAYMENT,
        source_id=payment.pk,
        source_number=payment_number,
    )

    if existing:
        if auto_post and existing.status == JournalEntryStatus.DRAFT:
            existing = post_journal_entry(existing, actor=actor)
        _mark_payment_accounting_posted(payment, existing)
        return existing

    amount = _money(getattr(payment, "amount", MONEY_ZERO))

    if amount <= MONEY_ZERO:
        raise AccountingPostingError("لا يمكن ترحيل دفعة عميل بمبلغ صفري.")

    seed_company_chart_of_accounts(company)

    treasury_account = _resolve_treasury_accounting_account(
        company,
        getattr(payment, "treasury_account", None),
    )

    receivable_account = get_account_by_purpose(
        company,
        AccountingAccountPurpose.ACCOUNTS_RECEIVABLE,
        source=AccountingRoutingSource.SALES_INVOICE,
        required=True,
    )

    counterparty_type = _payment_counterparty_type(payment, "CUSTOMER")
    if counterparty_type == "OTHER":
        receivable_account = _resolve_payment_counterparty_posting_account(
            company,
            payment,
            payment_label="سند قبض طرف آخر",
        )
    elif counterparty_type != "CUSTOMER":
        raise AccountingConfigurationError(
            "سند القبض يدعم CUSTOMER أو OTHER فقط."
        )

    currency = _clean_currency(getattr(payment, "currency", "") or "SAR")
    entry_date = getattr(payment, "payment_date", None) or timezone.localdate()

    sales_invoice = getattr(payment, "sales_invoice", None)
    customer_id = (
        _clean_text(getattr(sales_invoice, "customer_id", "") or "")
        or _clean_text(getattr(payment, "customer_id", "") or "")
    )

    counterparty_party_type = (
        "other"
        if counterparty_type == "OTHER"
        else ("customer" if customer_id else "")
    )
    counterparty_party_id = (
        _clean_text(getattr(payment, "counterparty_id", "") or "")
        if counterparty_type == "OTHER"
        else customer_id
    )


    entry = create_journal_entry_header(
        company=company,
        entry_date=entry_date,
        entry_number=generate_journal_entry_number(company, prefix="CPAY"),
        posting_source=POSTING_SOURCE_TREASURY,
        reference=payment_number,
        external_reference=_clean_text(getattr(payment, "reference", "")),
        description=f"قيد تلقائي لدفعة عميل {payment_number}",
        notes="تم إنشاء هذا القيد تلقائيا عند تأكيد دفعة العميل.",
        currency=currency,
        source_type=AUTO_SOURCE_TYPE_CUSTOMER_PAYMENT,
        source_id=_source_id(payment.pk),
        source_number=payment_number,
        is_auto_posted=True,
        actor=actor,
    )

    lines: list[EntryLinePayload] = [
        EntryLinePayload(
            account=treasury_account,
            description=f"تحصيل دفعة عميل {payment_number}",
            debit_amount=amount,
            credit_amount=MONEY_ZERO,
            currency=currency,
            party_type=counterparty_party_type,
            party_id=counterparty_party_id,
            source_line_id="customer-payment-treasury",
            sort_order=1,
            metadata={
                "source": AUTO_SOURCE_TYPE_CUSTOMER_PAYMENT,
                "payment_id": payment.pk,
                "payment_number": payment_number,
                "treasury_account_id": getattr(payment, "treasury_account_id", None),
                "sales_invoice_id": getattr(payment, "sales_invoice_id", None),
            },
        ),
        EntryLinePayload(
            account=receivable_account,
            description=f"تسوية ذمم مدينة من دفعة عميل {payment_number}",
            debit_amount=MONEY_ZERO,
            credit_amount=amount,
            currency=currency,
            party_type=counterparty_party_type,
            party_id=counterparty_party_id,
            source_line_id="customer-payment-receivable",
            sort_order=2,
            metadata={
                "source": AUTO_SOURCE_TYPE_CUSTOMER_PAYMENT,
                "payment_id": payment.pk,
                "payment_number": payment_number,
                "customer_id": customer_id,
        "counterparty_type": counterparty_type,
        "counterparty_id": counterparty_party_id,
                "sales_invoice_id": getattr(payment, "sales_invoice_id", None),
            },
        ),
    ]

    entry = replace_journal_entry_lines(
        entry,
        lines,
        actor=actor,
    )

    entry.metadata = {
        **(entry.metadata or {}),
        "source": AUTO_SOURCE_TYPE_CUSTOMER_PAYMENT,
        "source_app": "treasury",
        "payment_id": payment.pk,
        "payment_number": payment_number,
        "customer_id": customer_id,
        "sales_invoice_id": getattr(payment, "sales_invoice_id", None),
        "treasury_account_id": getattr(payment, "treasury_account_id", None),
        "amount": str(amount),
        "auto_posted_by_phase": "phase_11_4",
    }

    metadata_update_fields = ["metadata", "updated_at"]

    if actor is not None and getattr(actor, "is_authenticated", False):
        entry.updated_by = actor
        metadata_update_fields.append("updated_by")

    entry.save(update_fields=metadata_update_fields)

    if auto_post:
        entry = post_journal_entry(entry, actor=actor)

    _mark_payment_accounting_posted(payment, entry)
    return entry


def find_supplier_payment_journal_entry(payment: Any) -> JournalEntry | None:
    """
    Find the existing accounting entry linked to a supplier payment.
    """
    if not payment:
        return None

    company = getattr(payment, "company", None)
    if not company:
        return None

    payment_number = _payment_number(payment, fallback_prefix="SUPPLIER-PAYMENT")

    return _get_existing_auto_entry(
        company=company,
        source_type=AUTO_SOURCE_TYPE_SUPPLIER_PAYMENT,
        source_id=getattr(payment, "pk", None),
        source_number=payment_number,
    )


@transaction.atomic
def post_supplier_payment_to_accounting(
    payment: Any,
    *,
    actor: Any = None,
    auto_post: bool = True,
) -> JournalEntry:
    """
    Create and optionally post an automatic accounting journal entry for a confirmed supplier payment.

    Accounting treatment:
    - Debit  Accounts Payable       = payment.amount
    - Credit Treasury/Cash/Bank     = payment.amount

    Safety:
    - Uses payment.company as tenant source.
    - Refuses non-confirmed payments.
    - Prevents duplicate entries for same payment.
    - Links entry back to payment when fields exist.
    """
    if not payment:
        raise AccountingPostingError("دفعة المورد مطلوبة للترحيل المحاسبي.")

    company = getattr(payment, "company", None)
    _validate_company(company)

    if getattr(payment, "company_id", None) != getattr(company, "pk", None):
        raise AccountingPostingError("دفعة المورد لا تتبع الشركة المحددة.")

    _ensure_confirmed_payment(payment, payment_label="دفعة مورد")

    payment_number = _payment_number(payment, fallback_prefix="SUPPLIER-PAYMENT")

    existing = _get_existing_auto_entry(
        company=company,
        source_type=AUTO_SOURCE_TYPE_SUPPLIER_PAYMENT,
        source_id=payment.pk,
        source_number=payment_number,
    )

    if existing:
        if auto_post and existing.status == JournalEntryStatus.DRAFT:
            existing = post_journal_entry(existing, actor=actor)
        _mark_payment_accounting_posted(payment, existing)
        return existing

    amount = _money(getattr(payment, "amount", MONEY_ZERO))

    if amount <= MONEY_ZERO:
        raise AccountingPostingError("لا يمكن ترحيل دفعة مورد بمبلغ صفري.")

    seed_company_chart_of_accounts(company)

    payable_account = get_account_by_purpose(
        company,
        AccountingAccountPurpose.ACCOUNTS_PAYABLE,
        source=AccountingRoutingSource.PURCHASE_BILL,
        required=True,
    )

    counterparty_type = _payment_counterparty_type(payment, "SUPPLIER")
    if counterparty_type in {"EMPLOYEE", "OTHER"}:
        payable_account = _resolve_payment_counterparty_posting_account(
            company,
            payment,
            payment_label="سند صرف موظف/طرف آخر",
        )
    elif counterparty_type != "SUPPLIER":
        raise AccountingConfigurationError(
            "سند الصرف يدعم SUPPLIER أو EMPLOYEE أو OTHER فقط."
        )

    treasury_account = _resolve_treasury_accounting_account(
        company,
        getattr(payment, "treasury_account", None),
    )

    currency = _clean_currency(getattr(payment, "currency", "") or "SAR")
    entry_date = getattr(payment, "payment_date", None) or timezone.localdate()

    purchase_bill = getattr(payment, "purchase_bill", None)
    supplier_id = (
        _clean_text(getattr(purchase_bill, "supplier_id", "") or "")
        or _clean_text(getattr(payment, "supplier_id", "") or "")
    )

    counterparty_party_type = (
        counterparty_type.lower()
        if counterparty_type in {"EMPLOYEE", "OTHER"}
        else ("supplier" if supplier_id else "")
    )
    counterparty_party_id = (
        _clean_text(getattr(payment, "counterparty_id", "") or "")
        if counterparty_type in {"EMPLOYEE", "OTHER"}
        else supplier_id
    )


    entry = create_journal_entry_header(
        company=company,
        entry_date=entry_date,
        entry_number=generate_journal_entry_number(company, prefix="SPAY"),
        posting_source=POSTING_SOURCE_TREASURY,
        reference=payment_number,
        external_reference=_clean_text(getattr(payment, "reference", "")),
        description=f"قيد تلقائي لدفعة مورد {payment_number}",
        notes="تم إنشاء هذا القيد تلقائيا عند تأكيد دفعة المورد.",
        currency=currency,
        source_type=AUTO_SOURCE_TYPE_SUPPLIER_PAYMENT,
        source_id=_source_id(payment.pk),
        source_number=payment_number,
        is_auto_posted=True,
        actor=actor,
    )

    lines: list[EntryLinePayload] = [
        EntryLinePayload(
            account=payable_account,
            description=f"تسوية ذمم دائنة من دفعة مورد {payment_number}",
            debit_amount=amount,
            credit_amount=MONEY_ZERO,
            currency=currency,
            party_type=counterparty_party_type,
            party_id=counterparty_party_id,
            source_line_id="supplier-payment-payable",
            sort_order=1,
            metadata={
                "source": AUTO_SOURCE_TYPE_SUPPLIER_PAYMENT,
                "payment_id": payment.pk,
                "payment_number": payment_number,
                "supplier_id": supplier_id,
        "counterparty_type": counterparty_type,
        "counterparty_id": counterparty_party_id,
                "purchase_bill_id": getattr(payment, "purchase_bill_id", None),
            },
        ),
        EntryLinePayload(
            account=treasury_account,
            description=f"صرف دفعة مورد {payment_number}",
            debit_amount=MONEY_ZERO,
            credit_amount=amount,
            currency=currency,
            party_type=counterparty_party_type,
            party_id=counterparty_party_id,
            source_line_id="supplier-payment-treasury",
            sort_order=2,
            metadata={
                "source": AUTO_SOURCE_TYPE_SUPPLIER_PAYMENT,
                "payment_id": payment.pk,
                "payment_number": payment_number,
                "treasury_account_id": getattr(payment, "treasury_account_id", None),
                "purchase_bill_id": getattr(payment, "purchase_bill_id", None),
            },
        ),
    ]

    entry = replace_journal_entry_lines(
        entry,
        lines,
        actor=actor,
    )

    entry.metadata = {
        **(entry.metadata or {}),
        "source": AUTO_SOURCE_TYPE_SUPPLIER_PAYMENT,
        "source_app": "treasury",
        "payment_id": payment.pk,
        "payment_number": payment_number,
        "supplier_id": supplier_id,
        "purchase_bill_id": getattr(payment, "purchase_bill_id", None),
        "treasury_account_id": getattr(payment, "treasury_account_id", None),
        "amount": str(amount),
        "auto_posted_by_phase": "phase_11_4",
    }

    metadata_update_fields = ["metadata", "updated_at"]

    if actor is not None and getattr(actor, "is_authenticated", False):
        entry.updated_by = actor
        metadata_update_fields.append("updated_by")

    entry.save(update_fields=metadata_update_fields)

    if auto_post:
        entry = post_journal_entry(entry, actor=actor)

    _mark_payment_accounting_posted(payment, entry)
    return entry

# ============================================================
# 🧾 Tax Rate Catalog Seeds | كتالوج الضرائب الافتراضي
# ============================================================

TAX_RATE_CATALOG_SEEDS = [
    {
        "code": "VAT15",
        "name": "ضريبة القيمة المضافة 15%",
        "name_en": "VAT 15%",
        "tax_type": "VAT",
        "direction": "OUTPUT",
        "rate": Decimal("15.0000"),
        "calculation_base": "NET",
        "zatca_category_code": "S",
        "is_default": True,
        "is_system": True,
        "description": "Default Saudi VAT standard rate.",
    },
    {
        "code": "VAT0",
        "name": "ضريبة القيمة المضافة 0%",
        "name_en": "VAT 0%",
        "tax_type": "VAT",
        "direction": "OUTPUT",
        "rate": Decimal("0.0000"),
        "calculation_base": "NET",
        "zatca_category_code": "Z",
        "is_default": False,
        "is_system": True,
        "description": "Zero-rated VAT tax code.",
    },
    {
        "code": "VATEXEMPT",
        "name": "معفى من ضريبة القيمة المضافة",
        "name_en": "VAT Exempt",
        "tax_type": "VAT",
        "direction": "OUTPUT",
        "rate": Decimal("0.0000"),
        "calculation_base": "NET",
        "zatca_category_code": "E",
        "is_default": False,
        "is_system": True,
        "description": "VAT exempt tax code.",
    },
    {
        "code": "VATOUTOFSCOPE",
        "name": "خارج نطاق ضريبة القيمة المضافة",
        "name_en": "VAT Out of Scope",
        "tax_type": "VAT",
        "direction": "OUTPUT",
        "rate": Decimal("0.0000"),
        "calculation_base": "NET",
        "zatca_category_code": "O",
        "is_default": False,
        "is_system": True,
        "description": "Out-of-scope VAT tax code.",
    },
    {
        "code": "EXCISETOBACCO100",
        "name": "ضريبة انتقائية تبغ 100%",
        "name_en": "Excise Tobacco 100%",
        "tax_type": "EXCISE",
        "direction": "OUTPUT",
        "rate": Decimal("100.0000"),
        "calculation_base": "NET",
        "zatca_category_code": "",
        "is_default": False,
        "is_system": True,
        "description": "Saudi excise tax code for tobacco products.",
    },
    {
        "code": "EXCISEENERGY100",
        "name": "ضريبة انتقائية مشروبات الطاقة 100%",
        "name_en": "Excise Energy Drinks 100%",
        "tax_type": "EXCISE",
        "direction": "OUTPUT",
        "rate": Decimal("100.0000"),
        "calculation_base": "NET",
        "zatca_category_code": "",
        "is_default": False,
        "is_system": True,
        "description": "Saudi excise tax code for energy drinks.",
    },
    {
        "code": "EXCISESWEETENED50",
        "name": "ضريبة انتقائية مشروبات محلاة 50%",
        "name_en": "Excise Sweetened Drinks 50%",
        "tax_type": "EXCISE",
        "direction": "OUTPUT",
        "rate": Decimal("50.0000"),
        "calculation_base": "NET",
        "zatca_category_code": "",
        "is_default": False,
        "is_system": True,
        "description": "Saudi excise tax code for sweetened drinks.",
    },
    {
        "code": "EXCISESOFTDRINK50",
        "name": "ضريبة انتقائية مشروبات غازية 50%",
        "name_en": "Excise Soft Drinks 50%",
        "tax_type": "EXCISE",
        "direction": "OUTPUT",
        "rate": Decimal("50.0000"),
        "calculation_base": "NET",
        "zatca_category_code": "",
        "is_default": False,
        "is_system": True,
        "description": "Saudi excise tax code for soft drinks.",
    },
]


def ensure_company_tax_rate_catalog(company, *, user=None):
    """
    Ensure the current company has the standard tax catalog.

    Existing invoice/product percentage fields remain untouched in this phase.
    This prepares accounting.TaxRate as the official catalog for VAT, excise,
    and future ZATCA mapping.
    """
    if not company:
        raise ValidationError("الشركة مطلوبة لإنشاء كتالوج الضرائب.")

    output_vat_account = None
    input_vat_account = None

    try:
        output_vat_account = get_account_by_purpose(
            company,
            AccountingAccountPurpose.OUTPUT_VAT,
        )
    except Exception:
        output_vat_account = None

    try:
        input_vat_account = get_account_by_purpose(
            company,
            AccountingAccountPurpose.INPUT_VAT,
        )
    except Exception:
        input_vat_account = None

    ensured_rates = []

    for seed in TAX_RATE_CATALOG_SEEDS:
        tax_rate = TaxRate.objects.filter(
            company=company,
            code=seed["code"],
        ).first()

        if tax_rate is None:
            tax_rate = TaxRate(company=company, code=seed["code"])

        tax_rate.name = seed["name"]

        if hasattr(tax_rate, "name_en"):
            tax_rate.name_en = seed["name_en"]

        tax_rate.tax_type = seed["tax_type"]
        tax_rate.direction = seed["direction"]
        tax_rate.rate = seed["rate"]

        if hasattr(tax_rate, "calculation_base"):
            tax_rate.calculation_base = seed["calculation_base"]

        if hasattr(tax_rate, "zatca_category_code"):
            tax_rate.zatca_category_code = seed["zatca_category_code"]

        if hasattr(tax_rate, "is_system"):
            tax_rate.is_system = seed["is_system"]

        tax_rate.is_active = True
        tax_rate.is_default = seed["is_default"]
        tax_rate.description = seed["description"]

        if tax_rate.tax_type == "VAT":
            if output_vat_account and tax_rate.sales_account_id != output_vat_account.id:
                tax_rate.sales_account = output_vat_account

            if input_vat_account and tax_rate.purchase_account_id != input_vat_account.id:
                tax_rate.purchase_account = input_vat_account

        tax_rate.full_clean()
        tax_rate.save()
        ensured_rates.append(tax_rate)

    return ensured_rates
