"use client";

/* ============================================================
   📂 app/system/reports/accounting/page.tsx
   🧠 Primey Care | Accounting Reports Page

   ✅ المسار:
      app/system/reports/accounting/page.tsx

   ✅ العمل:
      صفحة تقرير المحاسبة المركزية داخل وحدة التقارير.
      تعرض ملخص القيود المحاسبية، مصادر الترحيل، مراكز التكلفة، والأرصدة المدينة والدائنة.

   ✅ الإصدار:
      Phase 17 UX Refinement + Central Reports Accounting Review

   ✅ يعتمد على:
      - /api/reports/accounting/
      - /api/accounting/journal-entries/ كـ fallback آمن عند عدم توفر تقرير مخصص
      - /api/accounting/journals/ كـ fallback إضافي
      - primey-locale
      - AuthProvider
      - sonner
      - /currency/sar.svg

   ✅ متوافق مع صفحات:
      - Centers approved UX pattern
      - Customers approved UX pattern
      - Central Reports module
      - Accounting backend integration

   ✅ الوظائف:
      - عرض مؤشرات تقرير المحاسبة.
      - تحليل القيود حسب الحالة ومصدر الترحيل.
      - دعم مصادر الترحيل: يدوي، فاتورة، دفعة، خزينة، عمولة، رصيد افتتاحي، نظام.
      - دعم مراكز التكلفة عند توفرها في البيانات.
      - عرض المجاميع المالية: المدين، الدائن، فرق التوازن.
      - البحث في صف مستقل.
      - فلاتر حالة القيد ومصدر الترحيل في صفوف منظمة.
      - جدول تحليلي للبيانات.
      - Excel export بصيغة .xls HTML Workbook.
      - Web PDF Print.
      - Skeleton Loading.
      - Error State مستقل.
      - Empty State ذكي.
      - إخفاء الإجراءات حسب الصلاحيات قدر الإمكان.

   ------------------------------------------------------------
   تحسينات هذا الإصدار:
      - توحيد الترويسة الداخلية حسب النمط المعتمد.
      - الحفاظ على التقارير داخل المسار المركزي فقط.
      - إضافة دعم واضح لمراكز التكلفة ضمن التقرير.
      - إضافة دعم ميزان المدين والدائن وفرق التوازن.
      - دعم fallback آمن للصلاحيات بدون كسر system_admin/superuser.
      - استخدام الرقم ثم رمز SAR عند عرض القيم المالية.
      - منع عرض أي مسارات تقنية أو عبارات API داخل واجهة المستخدم.
============================================================ */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Calculator,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Landmark,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCcw,
  Search,
  Scale,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* ============================================================
   Types
============================================================ */

type AppLocale = "ar" | "en";
type Dict = Record<string, unknown>;

type JournalEntryStatus =
  | "DRAFT"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED"
  | "UNKNOWN";

type PostingSource =
  | "MANUAL"
  | "INVOICE"
  | "PAYMENT"
  | "TREASURY"
  | "COMMISSION"
  | "OPENING"
  | "SYSTEM"
  | "OTHER"
  | "UNKNOWN";

type StatusFilter = "ALL" | JournalEntryStatus;
type SourceFilter = "ALL" | PostingSource;

type AccountingReportRow = {
  id: string;
  entryNumber: string;
  reference: string;
  externalReference: string;
  description: string;
  status: JournalEntryStatus;
  postingSource: PostingSource;
  accountName: string;
  accountCode: string;
  costCenterName: string;
  costCenterCode: string;
  debitAmount: number;
  creditAmount: number;
  balanceAmount: number;
  linesCount: number;
  createdBy: string;
  entryDate: string;
  postedAt: string;
  cancelledAt: string;
  createdAt: string;
};

type AccountingReportSummary = {
  total_entries: number;
  draft_entries: number;
  posted_entries: number;
  cancelled_entries: number;
  reversed_entries: number;
  manual_entries: number;
  invoice_entries: number;
  payment_entries: number;
  treasury_entries: number;
  commission_entries: number;
  opening_entries: number;
  system_entries: number;
  cost_center_entries: number;
  total_lines: number;
  total_debit: number;
  total_credit: number;
  balance_difference: number;
};

type AccountingReportResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: {
    summary?: Partial<AccountingReportSummary>;
    results?: unknown[];
    entries?: unknown[];
    journal_entries?: unknown[];
    journals?: unknown[];
    items?: unknown[];
    rows?: unknown[];
  };
  summary?: Partial<AccountingReportSummary>;
  results?: unknown[];
  entries?: unknown[];
  journal_entries?: unknown[];
  journals?: unknown[];
  items?: unknown[];
  rows?: unknown[];
};

const SAR_ICON_PATH = "/currency/sar.svg";

const DEFAULT_SUMMARY: AccountingReportSummary = {
  total_entries: 0,
  draft_entries: 0,
  posted_entries: 0,
  cancelled_entries: 0,
  reversed_entries: 0,
  manual_entries: 0,
  invoice_entries: 0,
  payment_entries: 0,
  treasury_entries: 0,
  commission_entries: 0,
  opening_entries: 0,
  system_entries: 0,
  cost_center_entries: 0,
  total_lines: 0,
  total_debit: 0,
  total_credit: 0,
  balance_difference: 0,
};

/* ============================================================
   Locale / API
============================================================ */

function readLocale(): AppLocale {
  try {
    if (typeof window === "undefined") return "ar";

    const saved = window.localStorage.getItem("primey-locale");

    if (saved === "en") return "en";
    if (saved === "ar") return "ar";

    return document.documentElement.lang === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

function applyDocumentLocale(locale: AppLocale) {
  try {
    if (typeof document === "undefined") return;

    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.body.dir = locale === "ar" ? "rtl" : "ltr";
  } catch (error) {
    console.error("Apply locale error:", error);
  }
}

function apiUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  if (!base) return path;

  return `${base.replace(/\/$/, "")}${path}`;
}

/* ============================================================
   Auth / Permissions
============================================================ */

function asDict(value: unknown): Dict {
  return value && typeof value === "object" ? (value as Dict) : {};
}

function getNested(source: Dict, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (value && typeof value === "object") {
      return value as Dict;
    }
  }

  return {};
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .flatMap((value) => {
          if (!value) return [];

          if (typeof value === "string") return [value];

          if (Array.isArray(value)) {
            return value.flatMap((item) => {
              if (typeof item === "string") return [item];

              if (item && typeof item === "object") {
                const obj = item as Dict;

                return [
                  obj.code,
                  obj.codename,
                  obj.permission,
                  obj.name,
                  obj.role,
                ].filter(Boolean) as string[];
              }

              return [];
            });
          }

          if (value && typeof value === "object") {
            const obj = value as Dict;

            return [
              obj.code,
              obj.codename,
              obj.permission,
              obj.name,
              obj.role,
            ].filter(Boolean) as string[];
          }

          return [];
        })
        .map((item) => String(item).trim())
        .filter(Boolean),
    ),
  );
}

function getAuthUser(authValue: unknown) {
  const auth = asDict(authValue);

  return getNested(auth, [
    "user",
    "currentUser",
    "profile",
    "account",
    "session",
    "data",
  ]);
}

function getAuthRoles(authValue: unknown): string[] {
  const auth = asDict(authValue);
  const user = getAuthUser(authValue);

  return uniqueStrings([
    auth.role,
    auth.roles,
    auth.user_role,
    auth.userType,
    auth.user_type,
    auth.workspace,
    auth.workspaces,
    auth.type,
    user.role,
    user.roles,
    user.user_role,
    user.userType,
    user.user_type,
    user.workspace,
    user.workspaces,
    user.type,
  ]).map((item) => item.toLowerCase());
}

function getAuthPermissionCodes(authValue: unknown): string[] {
  const auth = asDict(authValue);
  const user = getAuthUser(authValue);

  const authPermissions = asDict(auth.permissions);
  const userPermissions = asDict(user.permissions);
  const authProfilePermissions = asDict(auth.profile_permissions);
  const userProfilePermissions = asDict(user.profile_permissions);

  return uniqueStrings([
    auth.permission_codes,
    auth.permissions,
    auth.codes,
    auth.profile_permissions,
    authPermissions.codes,
    authProfilePermissions.codes,
    user.permission_codes,
    user.permissions,
    user.codes,
    user.profile_permissions,
    userPermissions.codes,
    userProfilePermissions.codes,
  ]);
}

function isAuthResolving(authValue: unknown) {
  const auth = asDict(authValue);

  return Boolean(
    auth.isLoading ||
      auth.loading ||
      auth.isInitializing ||
      auth.initializing ||
      auth.pending,
  );
}

function isSystemAdmin(authValue: unknown) {
  const auth = asDict(authValue);
  const user = getAuthUser(authValue);
  const roles = getAuthRoles(authValue);

  return (
    Boolean(auth.is_superuser) ||
    Boolean(auth.isSuperuser) ||
    Boolean(auth.is_system_admin) ||
    Boolean(auth.isSystemAdmin) ||
    Boolean(user.is_superuser) ||
    Boolean(user.isSuperuser) ||
    Boolean(user.is_system_admin) ||
    Boolean(user.isSystemAdmin) ||
    roles.some((role) =>
      [
        "system_admin",
        "superuser",
        "super_admin",
        "superadmin",
        "admin",
        "administrator",
      ].includes(role),
    )
  );
}

function hasSafePermission(
  authValue: unknown,
  codes: string[],
  mode: "view" | "action",
) {
  if (isSystemAdmin(authValue)) return true;

  const permissions = getAuthPermissionCodes(authValue);

  if (permissions.length > 0) {
    return codes.some((code) => permissions.includes(code));
  }

  const roles = getAuthRoles(authValue);

  if (roles.length > 0) {
    if (mode === "view") {
      return roles.some((role) =>
        [
          "system_admin",
          "superuser",
          "super_admin",
          "accountant",
          "support",
          "viewer",
        ].includes(role),
      );
    }

    return roles.some((role) =>
      ["system_admin", "superuser", "super_admin", "accountant"].includes(role),
    );
  }

  return true;
}

/* ============================================================
   Dictionary
============================================================ */

function dictionary(locale: AppLocale) {
  const isArabic = locale === "ar";

  return {
    title: isArabic ? "تقارير المحاسبة" : "Accounting Reports",
    subtitle: isArabic
      ? "تحليل القيود المحاسبية حسب الحالة ومصدر الترحيل ومراكز التكلفة والأرصدة المدينة والدائنة."
      : "Analyze journal entries by status, posting source, cost centers, debit, and credit balances.",

    back: isArabic ? "مركز التقارير" : "Reports Center",
    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    exportExcel: isArabic ? "تصدير Excel" : "Export Excel",
    print: isArabic ? "طباعة PDF" : "Print PDF",
    clearFilters: isArabic ? "مسح الفلاتر" : "Clear Filters",
    viewDetails: isArabic ? "عرض التفاصيل" : "View Details",

    searchPlaceholder: isArabic
      ? "ابحث برقم القيد أو المرجع أو الحساب أو مركز التكلفة أو الوصف..."
      : "Search by entry number, reference, account, cost center, or description...",

    all: isArabic ? "الكل" : "All",
    allStatuses: isArabic ? "كل حالات القيود" : "All Entry Statuses",
    allSources: isArabic ? "كل مصادر الترحيل" : "All Posting Sources",

    totalEntries: isArabic ? "إجمالي القيود" : "Total Entries",
    postedEntries: isArabic ? "قيود مرحلة" : "Posted Entries",
    draftEntries: isArabic ? "قيود مسودة" : "Draft Entries",
    costCenterEntries: isArabic ? "مرتبطة بمراكز تكلفة" : "With Cost Centers",
    totalLines: isArabic ? "إجمالي السطور" : "Total Lines",

    totalDebit: isArabic ? "إجمالي المدين" : "Total Debit",
    totalCredit: isArabic ? "إجمالي الدائن" : "Total Credit",
    balanceDifference: isArabic ? "فرق التوازن" : "Balance Difference",

    draft: isArabic ? "مسودة" : "Draft",
    posted: isArabic ? "مرحّل" : "Posted",
    cancelled: isArabic ? "ملغي" : "Cancelled",
    reversed: isArabic ? "معكوس" : "Reversed",
    unknown: isArabic ? "غير محدد" : "Unknown",

    manual: isArabic ? "يدوي" : "Manual",
    invoice: isArabic ? "فاتورة" : "Invoice",
    payment: isArabic ? "دفعة" : "Payment",
    treasury: isArabic ? "خزينة" : "Treasury",
    commission: isArabic ? "عمولة" : "Commission",
    opening: isArabic ? "رصيد افتتاحي" : "Opening Balance",
    system: isArabic ? "النظام" : "System",
    other: isArabic ? "أخرى" : "Other",

    yes: isArabic ? "نعم" : "Yes",
    no: isArabic ? "لا" : "No",

    financialTitle: isArabic ? "المؤشرات المحاسبية" : "Accounting Indicators",
    financialDesc: isArabic
      ? "ملخص المدين والدائن وفرق التوازن وسطور القيود."
      : "Summary of debit, credit, balance difference, and journal lines.",

    statusDistributionTitle: isArabic
      ? "توزيع حالات القيود"
      : "Entry Status Distribution",
    statusDistributionDesc: isArabic
      ? "تحليل سريع لحالات القيود المحاسبية."
      : "Quick analysis of journal entry statuses.",

    sourceDistributionTitle: isArabic
      ? "توزيع مصادر الترحيل"
      : "Posting Source Distribution",
    sourceDistributionDesc: isArabic
      ? "تحليل سريع لمصادر إنشاء وترحيل القيود."
      : "Quick analysis of journal posting sources.",

    costCenterTitle: isArabic ? "مراكز التكلفة" : "Cost Centers",
    costCenterDesc: isArabic
      ? "متابعة القيود المرتبطة بمراكز التكلفة عند توفرها."
      : "Track entries linked to cost centers when available.",

    tableTitle: isArabic ? "بيانات تقرير المحاسبة" : "Accounting Report Data",
    tableDesc: isArabic
      ? "جدول تحليلي للقيود المحاسبية حسب الفلاتر الحالية."
      : "Analytical accounting table based on current filters.",

    table: {
      entry: isArabic ? "القيد" : "Entry",
      reference: isArabic ? "المرجع" : "Reference",
      externalReference: isArabic ? "مرجع خارجي" : "External Reference",
      description: isArabic ? "الوصف" : "Description",
      status: isArabic ? "الحالة" : "Status",
      source: isArabic ? "مصدر الترحيل" : "Posting Source",
      account: isArabic ? "الحساب" : "Account",
      accountCode: isArabic ? "رمز الحساب" : "Account Code",
      costCenter: isArabic ? "مركز التكلفة" : "Cost Center",
      costCenterCode: isArabic ? "رمز مركز التكلفة" : "Cost Center Code",
      debit: isArabic ? "مدين" : "Debit",
      credit: isArabic ? "دائن" : "Credit",
      balance: isArabic ? "الفرق" : "Balance",
      lines: isArabic ? "السطور" : "Lines",
      createdBy: isArabic ? "أنشئ بواسطة" : "Created By",
      entryDate: isArabic ? "تاريخ القيد" : "Entry Date",
      postedAt: isArabic ? "تاريخ الترحيل" : "Posted At",
      createdAt: isArabic ? "تاريخ الإنشاء" : "Created At",
      action: isArabic ? "الإجراء" : "Action",
    },

    emptyTitle: isArabic ? "لا توجد بيانات محاسبية" : "No accounting data",
    emptyText: isArabic
      ? "ستظهر بيانات تقرير المحاسبة هنا عند توفر قيود محاسبية."
      : "Accounting report data will appear here when journal entries are available.",
    noResultsTitle: isArabic ? "لا توجد نتائج مطابقة" : "No matching results",
    noResultsText: isArabic
      ? "جرّب تغيير كلمات البحث أو فلاتر الحالة ومصدر الترحيل."
      : "Try changing search keywords, status, or posting source filters.",

    accessDeniedTitle: isArabic ? "غير مصرح بعرض التقرير" : "Access denied",
    accessDeniedText: isArabic
      ? "لا تملك صلاحية عرض تقارير المحاسبة. تواصل مع مسؤول النظام إذا كنت تحتاج الوصول."
      : "You do not have permission to view accounting reports. Contact your system administrator if you need access.",

    apiError: isArabic
      ? "تعذر تحميل تقرير المحاسبة."
      : "Unable to load accounting report.",
    apiErrorHint: isArabic
      ? "تحقق من الاتصال أو الصلاحيات ثم أعد المحاولة."
      : "Check the connection or permissions, then try again.",
    refreshSuccess: isArabic
      ? "تم تحديث تقرير المحاسبة بنجاح."
      : "Accounting report refreshed successfully.",
    exportSuccess: isArabic
      ? "تم تجهيز ملف Excel بنجاح."
      : "Excel file prepared successfully.",
    exportEmpty: isArabic
      ? "لا توجد بيانات قابلة للتصدير."
      : "No data available to export.",
    printSuccess: isArabic
      ? "تم تجهيز نافذة الطباعة."
      : "Print window prepared.",
    printError: isArabic
      ? "تعذر فتح نافذة الطباعة."
      : "Unable to open print window.",

    showing: isArabic ? "عرض" : "Showing",
    from: isArabic ? "من" : "of",
    generatedAt: isArabic ? "تاريخ التصدير" : "Generated At",
    reportScope: isArabic ? "نطاق التقرير" : "Report Scope",
    currentFilteredData: isArabic
      ? "حسب الفلاتر الحالية"
      : "Current filtered data",
    filterSearch: isArabic ? "البحث" : "Search",
    filterStatus: isArabic ? "فلتر حالة القيد" : "Entry Status Filter",
    filterSource: isArabic ? "فلتر مصدر الترحيل" : "Posting Source Filter",
    printedAt: isArabic ? "تاريخ الطباعة" : "Printed At",
    rowsCount: isArabic ? "عدد السجلات" : "Rows Count",
    printTitle: isArabic ? "تقرير المحاسبة" : "Accounting Report",
  };
}

/* ============================================================
   Normalizers
============================================================ */

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value: unknown): JournalEntryStatus {
  const status = String(value || "").toUpperCase();

  if (status === "DRAFT") return "DRAFT";
  if (status === "POSTED" || status === "CONFIRMED") return "POSTED";
  if (status === "CANCELLED" || status === "CANCELED") return "CANCELLED";
  if (status === "REVERSED") return "REVERSED";

  return "UNKNOWN";
}

function normalizePostingSource(value: unknown): PostingSource {
  const source = String(value || "").toUpperCase();

  if (["MANUAL", "USER"].includes(source)) return "MANUAL";
  if (["INVOICE", "INVOICES"].includes(source)) return "INVOICE";
  if (["PAYMENT", "PAYMENTS"].includes(source)) return "PAYMENT";
  if (["TREASURY", "TREASURY_TRANSACTION", "CASHBOX", "BANK"].includes(source)) {
    return "TREASURY";
  }
  if (["COMMISSION", "AGENT_COMMISSION"].includes(source)) return "COMMISSION";
  if (["OPENING", "OPENING_BALANCE"].includes(source)) return "OPENING";
  if (["SYSTEM", "AUTO", "AUTOMATIC"].includes(source)) return "SYSTEM";
  if (["OTHER"].includes(source)) return "OTHER";

  return "UNKNOWN";
}

function getValue(obj: Dict, key: string): unknown {
  const direct = obj[key];

  if (direct !== undefined && direct !== null && direct !== "") {
    return direct;
  }

  for (const container of [
    "entry",
    "journal_entry",
    "journal",
    "account",
    "chart_account",
    "cost_center",
    "costCenter",
    "summary",
    "data",
    "item",
  ]) {
    const nested = obj[container];

    if (nested && typeof nested === "object") {
      const value = (nested as Dict)[key];

      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }

  return undefined;
}

function extractRows(payload: AccountingReportResponse | null): unknown[] {
  if (!payload) return [];

  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.entries)) return payload.entries;
  if (Array.isArray(payload.journal_entries)) return payload.journal_entries;
  if (Array.isArray(payload.journals)) return payload.journals;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;

  if (Array.isArray(payload.data?.results)) return payload.data.results;
  if (Array.isArray(payload.data?.entries)) return payload.data.entries;
  if (Array.isArray(payload.data?.journal_entries)) {
    return payload.data.journal_entries;
  }
  if (Array.isArray(payload.data?.journals)) return payload.data.journals;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  if (Array.isArray(payload.data?.rows)) return payload.data.rows;

  return [];
}

function extractSummary(
  payload: AccountingReportResponse | null,
): Partial<AccountingReportSummary> {
  return payload?.data?.summary || payload?.summary || {};
}

function normalizeAccountingRow(item: unknown): AccountingReportRow {
  const obj = asDict(item);

  const account = asDict(obj.account || obj.chart_account);
  const costCenter = asDict(obj.cost_center || obj.costCenter);
  const user = asDict(obj.created_by || obj.user);

  const id = String(getValue(obj, "id") || "");
  const debitAmount =
    getValue(obj, "total_debit") ||
    getValue(obj, "debit_amount") ||
    getValue(obj, "debit") ||
    0;
  const creditAmount =
    getValue(obj, "total_credit") ||
    getValue(obj, "credit_amount") ||
    getValue(obj, "credit") ||
    0;

  return {
    id,
    entryNumber: String(
      getValue(obj, "entry_number") ||
        getValue(obj, "journal_number") ||
        getValue(obj, "number") ||
        getValue(obj, "reference") ||
        id ||
        "-",
    ),
    reference: String(
      getValue(obj, "reference") ||
        getValue(obj, "journal_reference") ||
        "",
    ),
    externalReference: String(
      getValue(obj, "external_reference") ||
        getValue(obj, "source_reference") ||
        "",
    ),
    description: String(
      getValue(obj, "description") ||
        getValue(obj, "memo") ||
        getValue(obj, "notes") ||
        "",
    ),
    status: normalizeStatus(getValue(obj, "status")),
    postingSource: normalizePostingSource(
      getValue(obj, "posting_source") ||
        getValue(obj, "source") ||
        getValue(obj, "source_type"),
    ),
    accountName: String(account.name || getValue(obj, "account_name") || ""),
    accountCode: String(account.code || getValue(obj, "account_code") || ""),
    costCenterName: String(
      costCenter.name || getValue(obj, "cost_center_name") || "",
    ),
    costCenterCode: String(
      costCenter.code || getValue(obj, "cost_center_code") || "",
    ),
    debitAmount: toNumber(debitAmount),
    creditAmount: toNumber(creditAmount),
    balanceAmount: toNumber(debitAmount) - toNumber(creditAmount),
    linesCount: toNumber(
      getValue(obj, "lines_count") ||
        getValue(obj, "items_count") ||
        getValue(obj, "details_count") ||
        0,
    ),
    createdBy: String(
      user.name ||
        user.full_name ||
        getValue(obj, "created_by_name") ||
        getValue(obj, "user_name") ||
        "",
    ),
    entryDate: String(
      getValue(obj, "entry_date") ||
        getValue(obj, "journal_date") ||
        getValue(obj, "date") ||
        "",
    ),
    postedAt: String(getValue(obj, "posted_at") || ""),
    cancelledAt: String(
      getValue(obj, "cancelled_at") || getValue(obj, "canceled_at") || "",
    ),
    createdAt: String(getValue(obj, "created_at") || ""),
  };
}

function normalizeSummary(
  rows: AccountingReportRow[],
  summary?: Partial<AccountingReportSummary>,
): AccountingReportSummary {
  const fallback: AccountingReportSummary = {
    total_entries: rows.length,
    draft_entries: rows.filter((item) => item.status === "DRAFT").length,
    posted_entries: rows.filter((item) => item.status === "POSTED").length,
    cancelled_entries: rows.filter((item) => item.status === "CANCELLED").length,
    reversed_entries: rows.filter((item) => item.status === "REVERSED").length,
    manual_entries: rows.filter((item) => item.postingSource === "MANUAL").length,
    invoice_entries: rows.filter((item) => item.postingSource === "INVOICE").length,
    payment_entries: rows.filter((item) => item.postingSource === "PAYMENT").length,
    treasury_entries: rows.filter((item) => item.postingSource === "TREASURY").length,
    commission_entries: rows.filter((item) => item.postingSource === "COMMISSION")
      .length,
    opening_entries: rows.filter((item) => item.postingSource === "OPENING").length,
    system_entries: rows.filter((item) => item.postingSource === "SYSTEM").length,
    cost_center_entries: rows.filter(
      (item) => item.costCenterName || item.costCenterCode,
    ).length,
    total_lines: rows.reduce((sum, item) => sum + item.linesCount, 0),
    total_debit: rows.reduce((sum, item) => sum + item.debitAmount, 0),
    total_credit: rows.reduce((sum, item) => sum + item.creditAmount, 0),
    balance_difference: rows.reduce(
      (sum, item) => sum + item.debitAmount - item.creditAmount,
      0,
    ),
  };

  return {
    total_entries: toNumber(summary?.total_entries ?? fallback.total_entries),
    draft_entries: toNumber(summary?.draft_entries ?? fallback.draft_entries),
    posted_entries: toNumber(summary?.posted_entries ?? fallback.posted_entries),
    cancelled_entries: toNumber(
      summary?.cancelled_entries ?? fallback.cancelled_entries,
    ),
    reversed_entries: toNumber(
      summary?.reversed_entries ?? fallback.reversed_entries,
    ),
    manual_entries: toNumber(summary?.manual_entries ?? fallback.manual_entries),
    invoice_entries: toNumber(
      summary?.invoice_entries ?? fallback.invoice_entries,
    ),
    payment_entries: toNumber(
      summary?.payment_entries ?? fallback.payment_entries,
    ),
    treasury_entries: toNumber(
      summary?.treasury_entries ?? fallback.treasury_entries,
    ),
    commission_entries: toNumber(
      summary?.commission_entries ?? fallback.commission_entries,
    ),
    opening_entries: toNumber(
      summary?.opening_entries ?? fallback.opening_entries,
    ),
    system_entries: toNumber(summary?.system_entries ?? fallback.system_entries),
    cost_center_entries: toNumber(
      summary?.cost_center_entries ?? fallback.cost_center_entries,
    ),
    total_lines: toNumber(summary?.total_lines ?? fallback.total_lines),
    total_debit: toNumber(summary?.total_debit ?? fallback.total_debit),
    total_credit: toNumber(summary?.total_credit ?? fallback.total_credit),
    balance_difference: toNumber(
      summary?.balance_difference ?? fallback.balance_difference,
    ),
  };
}

/* ============================================================
   UI Helpers
============================================================ */

function formatNumber(value: number | string): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return "0";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(numericValue);
}

function formatMoney(value: number | string): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return "0.00";

  return numericValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string): string {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function escapeHtml(value: string | number) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function percent(value: number, total: number) {
  if (!total) return 0;

  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

function isValidId(id: unknown) {
  const value = String(id || "").trim();

  return value.length > 0 && value !== "-" && value !== "undefined";
}

function statusLabel(status: JournalEntryStatus, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<JournalEntryStatus, string> = {
    DRAFT: t.draft,
    POSTED: t.posted,
    CANCELLED: t.cancelled,
    REVERSED: t.reversed,
    UNKNOWN: t.unknown,
  };

  return labels[status];
}

function sourceLabel(source: PostingSource, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<PostingSource, string> = {
    MANUAL: t.manual,
    INVOICE: t.invoice,
    PAYMENT: t.payment,
    TREASURY: t.treasury,
    COMMISSION: t.commission,
    OPENING: t.opening,
    SYSTEM: t.system,
    OTHER: t.other,
    UNKNOWN: t.unknown,
  };

  return labels[source];
}

function SarIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <Image
      src={SAR_ICON_PATH}
      alt=""
      width={16}
      height={16}
      className={className}
    />
  );
}

function MoneyText({ value }: { value: number | string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{formatMoney(value)}</span>
      <SarIcon className="h-3.5 w-3.5" />
    </span>
  );
}

function statusBadge(status: JournalEntryStatus, locale: AppLocale) {
  const label = statusLabel(status, locale);

  if (status === "POSTED") {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        {label}
      </Badge>
    );
  }

  if (status === "DRAFT") {
    return (
      <Badge className="rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
        {label}
      </Badge>
    );
  }

  if (status === "CANCELLED" || status === "REVERSED") {
    return (
      <Badge variant="destructive" className="rounded-full px-3 py-1">
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="rounded-full px-3 py-1">
      {label}
    </Badge>
  );
}

function sourceBadge(source: PostingSource, locale: AppLocale) {
  const label = sourceLabel(source, locale);

  if (source === "INVOICE") {
    return (
      <Badge className="rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
        {label}
      </Badge>
    );
  }

  if (source === "PAYMENT" || source === "TREASURY") {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        {label}
      </Badge>
    );
  }

  if (source === "COMMISSION") {
    return (
      <Badge className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="rounded-full px-3 py-1">
      {label}
    </Badge>
  );
}

/* ============================================================
   Skeleton
============================================================ */

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-muted ${className}`} />;
}

function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <SkeletonLine className="h-7 w-20" />
                <SkeletonLine className="h-4 w-32" />
              </div>
              <SkeletonLine className="h-10 w-10 rounded-xl" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <SkeletonLine className="h-3 w-8" />
              <SkeletonLine className="h-2 flex-1" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableRowsSkeleton({ columnsCount }: { columnsCount: number }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columnsCount }).map((__, columnIndex) => (
            <TableCell key={columnIndex}>
              <SkeletonLine
                className={
                  columnIndex === 0
                    ? "h-10 w-56 rounded-lg"
                    : "h-4 w-24 rounded-lg"
                }
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/* ============================================================
   Export / Print
============================================================ */

function downloadExcel({
  filename,
  worksheetName,
  title,
  locale,
  summaryRows,
  filterRows,
  headers,
  rows,
}: {
  filename: string;
  worksheetName: string;
  title: string;
  locale: AppLocale;
  summaryRows: Array<[string, string | number]>;
  filterRows: Array<[string, string | number]>;
  headers: string[];
  rows: Array<Array<string | number>>;
}) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? "right" : "left";
  const colspan = Math.max(headers.length, 2);

  const summaryHtml = summaryRows
    .map(
      ([label, value]) => `
        <tr>
          <td class="summary-label">${escapeHtml(label)}</td>
          <td class="summary-value">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  const filterHtml = filterRows
    .map(
      ([label, value]) => `
        <tr>
          <td class="summary-label">${escapeHtml(label)}</td>
          <td class="summary-value">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  const headerHtml = headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("");

  const rowsHtml = rows
    .map(
      (row) => `
        <tr>
          ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
        </tr>`,
    )
    .join("");

  const workbook = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${escapeHtml(worksheetName)}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayRightToLeft>${locale === "ar" ? "True" : "False"}</x:DisplayRightToLeft>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { direction: ${dir}; font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th, td {
            border: 1px solid #d9e2ef;
            padding: 8px;
            text-align: ${align};
            vertical-align: top;
            mso-number-format: "\\@";
          }
          th { background: #d8ecfb; color: #000; font-weight: 700; }
          .title { font-size: 20px; font-weight: 700; text-align: center; background: #fff; }
          .section { font-weight: 700; background: #eef6ff; }
          .summary-label { font-weight: 700; background: #f8fafc; width: 240px; }
          .summary-value { font-weight: 700; }
        </style>
      </head>
      <body dir="${dir}">
        <table>
          <tr><td class="title" colspan="${colspan}">${escapeHtml(title)}</td></tr>
          <tr><td colspan="${colspan}"></td></tr>
          <tr><td class="section" colspan="${colspan}">
            ${locale === "ar" ? "ملخص التقرير" : "Report Summary"}
          </td></tr>
          ${summaryHtml}
          <tr><td colspan="${colspan}"></td></tr>
          <tr><td class="section" colspan="${colspan}">
            ${locale === "ar" ? "الفلاتر المستخدمة" : "Applied Filters"}
          </td></tr>
          ${filterHtml}
          <tr><td colspan="${colspan}"></td></tr>
          <tr>${headerHtml}</tr>
          ${rowsHtml}
        </table>
      </body>
    </html>`;

  const blob = new Blob([workbook], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

function buildPrintHtml({
  locale,
  title,
  rows,
  summary,
  t,
}: {
  locale: AppLocale;
  title: string;
  rows: AccountingReportRow[];
  summary: AccountingReportSummary;
  t: ReturnType<typeof dictionary>;
}) {
  const isArabic = locale === "ar";
  const now = new Date().toLocaleString("en-US");

  const tableRows = rows
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.entryNumber || "-")}</td>
          <td>${escapeHtml(statusLabel(item.status, locale))}</td>
          <td>${escapeHtml(sourceLabel(item.postingSource, locale))}</td>
          <td>${escapeHtml(item.accountName || "-")}</td>
          <td>${escapeHtml(item.costCenterName || "-")}</td>
          <td>${escapeHtml(formatMoney(item.debitAmount))}</td>
          <td>${escapeHtml(formatMoney(item.creditAmount))}</td>
          <td>${escapeHtml(formatMoney(item.balanceAmount))}</td>
          <td>${escapeHtml(formatDate(item.entryDate || item.createdAt))}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html lang="${locale}" dir="${isArabic ? "rtl" : "ltr"}">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 24px;
            font-family: Arial, Tahoma, sans-serif;
            color: #111827;
            background: #ffffff;
            direction: ${isArabic ? "rtl" : "ltr"};
            text-align: ${isArabic ? "right" : "left"};
          }
          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 18px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 14px;
          }
          h1 { margin: 0; font-size: 22px; font-weight: 800; }
          .meta { margin-top: 8px; color: #6b7280; font-size: 12px; line-height: 1.8; }
          .badge {
            display: inline-block;
            border: 1px solid #d1d5db;
            border-radius: 999px;
            padding: 4px 10px;
            font-size: 12px;
            color: #374151;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 18px;
          }
          .summary-card {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 10px;
          }
          .summary-card span {
            display: block;
            color: #6b7280;
            font-size: 11px;
            margin-bottom: 5px;
          }
          .summary-card strong { font-size: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f3f4f6; color: #111827; font-weight: 700; }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 9px 8px;
            text-align: ${isArabic ? "right" : "left"};
            vertical-align: top;
          }
          tr:nth-child(even) td { background: #fafafa; }
          @page { size: A4 landscape; margin: 12mm; }
          @media print { body { padding: 0; } }
        </style>
      </head>

      <body>
        <div class="print-header">
          <div>
            <h1>${escapeHtml(title)}</h1>
            <div class="meta">
              <div>${escapeHtml(t.printedAt)}: ${escapeHtml(now)}</div>
              <div>${escapeHtml(t.rowsCount)}: ${formatNumber(rows.length)}</div>
            </div>
          </div>
          <div class="badge">Primey Care</div>
        </div>

        <div class="summary-grid">
          <div class="summary-card"><span>${escapeHtml(t.totalEntries)}</span><strong>${formatNumber(summary.total_entries)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.postedEntries)}</span><strong>${formatNumber(summary.posted_entries)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.totalDebit)}</span><strong>${formatMoney(summary.total_debit)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.totalCredit)}</span><strong>${formatMoney(summary.total_credit)}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${escapeHtml(t.table.entry)}</th>
              <th>${escapeHtml(t.table.status)}</th>
              <th>${escapeHtml(t.table.source)}</th>
              <th>${escapeHtml(t.table.account)}</th>
              <th>${escapeHtml(t.table.costCenter)}</th>
              <th>${escapeHtml(t.table.debit)}</th>
              <th>${escapeHtml(t.table.credit)}</th>
              <th>${escapeHtml(t.table.balance)}</th>
              <th>${escapeHtml(t.table.entryDate)}</th>
            </tr>
          </thead>
          <tbody>
            ${
              tableRows ||
              `<tr><td colspan="10" style="text-align:center">${escapeHtml(t.emptyTitle)}</td></tr>`
            }
          </tbody>
        </table>

        <script>
          window.addEventListener("load", () => {
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>
  `;
}

/* ============================================================
   Page
============================================================ */

export default function SystemAccountingReportsPage() {
  const auth = useAuth() as unknown;

  const [locale, setLocale] = useState<AppLocale>("ar");
  const [rows, setRows] = useState<AccountingReportRow[]>([]);
  const [summary, setSummary] =
    useState<AccountingReportSummary>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");

  const t = useMemo(() => dictionary(locale), [locale]);
  const isArabic = locale === "ar";
  const authResolving = isAuthResolving(auth);

  const canViewReport = hasSafePermission(
    auth,
    [
      "reports.view",
      "reports.accounting.view",
      "accounting.view",
      "accounting.reports",
    ],
    "view",
  );

  const canViewAccountingDetails = hasSafePermission(
    auth,
    ["accounting.view", "accounting.journals.view", "accounting.detail"],
    "view",
  );

  const canExportReport = hasSafePermission(
    auth,
    ["reports.export", "reports.accounting.export", "accounting.export"],
    "action",
  );

  const canPrintReport = hasSafePermission(
    auth,
    ["reports.print", "reports.accounting.print"],
    "action",
  );

  const filteredRows = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return rows.filter((item) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : item.status === statusFilter;

      const matchesSource =
        sourceFilter === "ALL" ? true : item.postingSource === sourceFilter;

      const matchesQuery = !cleanQuery
        ? true
        : [
            item.entryNumber,
            item.reference,
            item.externalReference,
            item.description,
            item.accountName,
            item.accountCode,
            item.costCenterName,
            item.costCenterCode,
            item.createdBy,
            statusLabel(item.status, locale),
            sourceLabel(item.postingSource, locale),
          ]
            .join(" ")
            .toLowerCase()
            .includes(cleanQuery);

      return matchesStatus && matchesSource && matchesQuery;
    });
  }, [locale, query, rows, sourceFilter, statusFilter]);

  const filteredSummary = useMemo(
    () => normalizeSummary(filteredRows),
    [filteredRows],
  );

  const hasSearchOrFilter =
    query.trim().length > 0 ||
    statusFilter !== "ALL" ||
    sourceFilter !== "ALL";

  const statusOptions = useMemo(
    () => [
      { value: "ALL" as StatusFilter, label: t.allStatuses, count: rows.length },
      {
        value: "DRAFT" as StatusFilter,
        label: t.draft,
        count: rows.filter((item) => item.status === "DRAFT").length,
      },
      {
        value: "POSTED" as StatusFilter,
        label: t.posted,
        count: rows.filter((item) => item.status === "POSTED").length,
      },
      {
        value: "CANCELLED" as StatusFilter,
        label: t.cancelled,
        count: rows.filter((item) => item.status === "CANCELLED").length,
      },
      {
        value: "REVERSED" as StatusFilter,
        label: t.reversed,
        count: rows.filter((item) => item.status === "REVERSED").length,
      },
    ],
    [rows, t],
  );

  const sourceOptions = useMemo(
    () => [
      { value: "ALL" as SourceFilter, label: t.allSources, count: rows.length },
      {
        value: "MANUAL" as SourceFilter,
        label: t.manual,
        count: rows.filter((item) => item.postingSource === "MANUAL").length,
      },
      {
        value: "INVOICE" as SourceFilter,
        label: t.invoice,
        count: rows.filter((item) => item.postingSource === "INVOICE").length,
      },
      {
        value: "PAYMENT" as SourceFilter,
        label: t.payment,
        count: rows.filter((item) => item.postingSource === "PAYMENT").length,
      },
      {
        value: "TREASURY" as SourceFilter,
        label: t.treasury,
        count: rows.filter((item) => item.postingSource === "TREASURY").length,
      },
      {
        value: "COMMISSION" as SourceFilter,
        label: t.commission,
        count: rows.filter((item) => item.postingSource === "COMMISSION").length,
      },
      {
        value: "OPENING" as SourceFilter,
        label: t.opening,
        count: rows.filter((item) => item.postingSource === "OPENING").length,
      },
      {
        value: "SYSTEM" as SourceFilter,
        label: t.system,
        count: rows.filter((item) => item.postingSource === "SYSTEM").length,
      },
    ],
    [rows, t],
  );

  const summaryCards = useMemo(
    () => [
      {
        title: t.totalEntries,
        value: summary.total_entries,
        icon: Calculator,
        helper: t.totalLines,
        helperValue: formatNumber(summary.total_lines),
        percent: summary.total_entries > 0 ? 100 : 0,
        isMoney: false,
      },
      {
        title: t.postedEntries,
        value: summary.posted_entries,
        icon: CheckCircle2,
        helper: t.totalEntries,
        helperValue: `${percent(
          summary.posted_entries,
          summary.total_entries,
        )}%`,
        percent: percent(summary.posted_entries, summary.total_entries),
        isMoney: false,
      },
      {
        title: t.costCenterEntries,
        value: summary.cost_center_entries,
        icon: Landmark,
        helper: t.costCenterTitle,
        helperValue: `${percent(
          summary.cost_center_entries,
          summary.total_entries,
        )}%`,
        percent: percent(summary.cost_center_entries, summary.total_entries),
        isMoney: false,
      },
      {
        title: t.balanceDifference,
        value: summary.balance_difference,
        icon: Scale,
        helper: t.totalDebit,
        helperValue: formatMoney(summary.total_debit),
        percent: summary.total_entries > 0 ? 100 : 0,
        isMoney: true,
      },
    ],
    [summary, t],
  );

  const statusCards = useMemo(
    () => [
      {
        title: t.draft,
        value: summary.draft_entries,
        icon: FileText,
        filter: "DRAFT" as StatusFilter,
        percent: percent(summary.draft_entries, summary.total_entries),
      },
      {
        title: t.posted,
        value: summary.posted_entries,
        icon: CheckCircle2,
        filter: "POSTED" as StatusFilter,
        percent: percent(summary.posted_entries, summary.total_entries),
      },
      {
        title: t.cancelled,
        value: summary.cancelled_entries,
        icon: XCircle,
        filter: "CANCELLED" as StatusFilter,
        percent: percent(summary.cancelled_entries, summary.total_entries),
      },
      {
        title: t.reversed,
        value: summary.reversed_entries,
        icon: AlertTriangle,
        filter: "REVERSED" as StatusFilter,
        percent: percent(summary.reversed_entries, summary.total_entries),
      },
    ],
    [summary, t],
  );

  const sourceCards = useMemo(
    () => [
      {
        title: t.manual,
        value: summary.manual_entries,
        icon: BookOpen,
        filter: "MANUAL" as SourceFilter,
        percent: percent(summary.manual_entries, summary.total_entries),
      },
      {
        title: t.invoice,
        value: summary.invoice_entries,
        icon: ReceiptText,
        filter: "INVOICE" as SourceFilter,
        percent: percent(summary.invoice_entries, summary.total_entries),
      },
      {
        title: t.payment,
        value: summary.payment_entries,
        icon: Wallet,
        filter: "PAYMENT" as SourceFilter,
        percent: percent(summary.payment_entries, summary.total_entries),
      },
      {
        title: t.treasury,
        value: summary.treasury_entries,
        icon: Landmark,
        filter: "TREASURY" as SourceFilter,
        percent: percent(summary.treasury_entries, summary.total_entries),
      },
    ],
    [summary, t],
  );

  const loadReport = useCallback(
    async (showToast = false) => {
      if (!canViewReport) {
        setIsLoading(false);
        setRows([]);
        setSummary(DEFAULT_SUMMARY);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");

        const endpoints = [
          "/api/reports/accounting/",
          "/api/accounting/journal-entries/?page_size=300",
          "/api/accounting/journals/?page_size=300",
          "/api/accounting/journal-entries/",
          "/api/accounting/journals/",
        ];

        let loadedPayload: AccountingReportResponse | null = null;
        let loaded = false;

        for (const endpoint of endpoints) {
          const response = await fetch(apiUrl(endpoint), {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          });

          const payload = (await response.json().catch(() => null)) as
            | AccountingReportResponse
            | null;

          if (response.status === 404 || response.status === 405) {
            loadedPayload = payload;
            continue;
          }

          if (
            !response.ok ||
            payload?.ok === false ||
            payload?.success === false
          ) {
            throw new Error(payload?.message || `HTTP ${response.status}`);
          }

          loadedPayload = payload;
          loaded = true;
          break;
        }

        if (!loaded) {
          throw new Error(
            loadedPayload?.message || "Unable to load accounting report",
          );
        }

        const normalizedRows =
          extractRows(loadedPayload).map(normalizeAccountingRow);

        setRows(normalizedRows);
        setSummary(
          normalizeSummary(normalizedRows, extractSummary(loadedPayload)),
        );

        if (showToast) {
          toast.success(t.refreshSuccess);
        }
      } catch (error) {
        console.error("Accounting report load error:", error);
        setRows([]);
        setSummary(DEFAULT_SUMMARY);
        setErrorMessage(t.apiError);
        toast.error(t.apiError);
      } finally {
        setIsLoading(false);
      }
    },
    [canViewReport, t.apiError, t.refreshSuccess],
  );

  function clearFilters() {
    setQuery("");
    setStatusFilter("ALL");
    setSourceFilter("ALL");
  }

  function exportExcel() {
    if (!canExportReport) return;

    if (filteredRows.length === 0) {
      toast.error(t.exportEmpty);
      return;
    }

    const generatedAt = new Date();

    const statusFilterLabel =
      statusOptions.find((item) => item.value === statusFilter)?.label || t.all;

    const sourceFilterLabel =
      sourceOptions.find((item) => item.value === sourceFilter)?.label || t.all;

    downloadExcel({
      filename: `primey-care-accounting-report-${generatedAt
        .toISOString()
        .slice(0, 10)}.xls`,
      worksheetName: isArabic ? "تقرير المحاسبة" : "Accounting Report",
      title: t.title,
      locale,
      summaryRows: [
        [t.generatedAt, generatedAt.toLocaleString("en-US")],
        [t.reportScope, t.currentFilteredData],
        [t.totalEntries, filteredSummary.total_entries],
        [t.postedEntries, filteredSummary.posted_entries],
        [t.draftEntries, filteredSummary.draft_entries],
        [t.costCenterEntries, filteredSummary.cost_center_entries],
        [t.totalLines, filteredSummary.total_lines],
        [t.totalDebit, formatMoney(filteredSummary.total_debit)],
        [t.totalCredit, formatMoney(filteredSummary.total_credit)],
        [t.balanceDifference, formatMoney(filteredSummary.balance_difference)],
      ],
      filterRows: [
        [t.filterSearch, query || t.all],
        [t.filterStatus, statusFilterLabel],
        [t.filterSource, sourceFilterLabel],
      ],
      headers: [
        "ID",
        t.table.entry,
        t.table.reference,
        t.table.externalReference,
        t.table.description,
        t.table.status,
        t.table.source,
        t.table.account,
        t.table.accountCode,
        t.table.costCenter,
        t.table.costCenterCode,
        t.table.debit,
        t.table.credit,
        t.table.balance,
        t.table.lines,
        t.table.createdBy,
        t.table.entryDate,
        t.table.postedAt,
        t.table.createdAt,
      ],
      rows: filteredRows.map((item) => [
        item.id || "-",
        item.entryNumber || "-",
        item.reference || "-",
        item.externalReference || "-",
        item.description || "-",
        statusLabel(item.status, locale),
        sourceLabel(item.postingSource, locale),
        item.accountName || "-",
        item.accountCode || "-",
        item.costCenterName || "-",
        item.costCenterCode || "-",
        formatMoney(item.debitAmount),
        formatMoney(item.creditAmount),
        formatMoney(item.balanceAmount),
        formatNumber(item.linesCount),
        item.createdBy || "-",
        formatDate(item.entryDate),
        formatDate(item.postedAt),
        formatDate(item.createdAt),
      ]),
    });

    toast.success(t.exportSuccess);
  }

  function printReport() {
    if (!canPrintReport) return;

    if (filteredRows.length === 0) {
      toast.error(t.exportEmpty);
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error(t.printError);
      return;
    }

    printWindow.document.open();
    printWindow.document.write(
      buildPrintHtml({
        locale,
        title: t.printTitle,
        rows: filteredRows,
        summary: filteredSummary,
        t,
      }),
    );
    printWindow.document.close();

    toast.success(t.printSuccess);
  }

  useEffect(() => {
    const syncLocale = () => {
      const nextLocale = readLocale();

      applyDocumentLocale(nextLocale);
      setLocale(nextLocale);
    };

    const syncAfterPaint = () => {
      syncLocale();

      window.setTimeout(() => {
        syncLocale();
      }, 0);
    };

    syncAfterPaint();

    window.addEventListener("primey-locale-changed", syncAfterPaint);
    window.addEventListener("storage", syncAfterPaint);

    return () => {
      window.removeEventListener("primey-locale-changed", syncAfterPaint);
      window.removeEventListener("storage", syncAfterPaint);
    };
  }, []);

  useEffect(() => {
    if (authResolving) return;
    loadReport(false);
  }, [authResolving, loadReport]);

  if (!authResolving && !canViewReport) {
    return (
      <div className="w-full space-y-4" dir={isArabic ? "rtl" : "ltr"}>
        <Card className="rounded-2xl border border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="flex items-start gap-3 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <XCircle className="h-5 w-5" />
            </div>

            <div>
              <p className="font-semibold text-destructive">
                {t.accessDeniedTitle}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.accessDeniedText}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={isArabic ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            {t.title}
          </h1>

          <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
            {t.subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href="/system/reports">
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t.back}</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            className="h-10 rounded-xl"
            onClick={() => loadReport(true)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            <span>{t.refresh}</span>
          </Button>

          {canExportReport ? (
            <Button
              variant="outline"
              className="h-10 rounded-xl"
              onClick={exportExcel}
              disabled={
                isLoading || filteredRows.length === 0 || Boolean(errorMessage)
              }
            >
              <Download className="h-4 w-4" />
              <span>{t.exportExcel}</span>
            </Button>
          ) : null}

          {canPrintReport ? (
            <Button
              variant="outline"
              className="h-10 rounded-xl"
              onClick={printReport}
              disabled={
                isLoading || filteredRows.length === 0 || Boolean(errorMessage)
              }
            >
              <Printer className="h-4 w-4" />
              <span>{t.print}</span>
            </Button>
          ) : null}
        </div>
      </div>

      {!isLoading && errorMessage ? (
        <Card className="rounded-2xl border border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <XCircle className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-destructive">
                  {errorMessage}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.apiErrorHint}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => loadReport(true)}
            >
              <RefreshCcw className="h-4 w-4" />
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!errorMessage ? (
        <>
          {isLoading ? (
            <SummaryCardsSkeleton />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((item) => {
                const Icon = item.icon;

                return (
                  <Card
                    key={item.title}
                    className="rounded-2xl border bg-card shadow-sm"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-2xl font-bold">
                            {item.isMoney ? (
                              <MoneyText value={item.value} />
                            ) : (
                              formatNumber(item.value)
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.title}
                          </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {formatNumber(item.percent)}%
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground">
                        {item.helper}
                        {item.helperValue ? `: ${item.helperValue}` : ""}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">
                {t.financialTitle}
              </CardTitle>
              <CardDescription>{t.financialDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.totalDebit}</p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.total_debit} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.totalCredit}</p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.total_credit} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.balanceDifference}
                </p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.balance_difference} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.totalLines}</p>
                <div className="mt-2 text-2xl font-bold">
                  {formatNumber(summary.total_lines)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">
                {t.statusDistributionTitle}
              </CardTitle>
              <CardDescription>{t.statusDistributionDesc}</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {statusCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <button
                      key={card.filter}
                      type="button"
                      className="space-y-2 rounded-xl border bg-background/70 p-3 text-start transition hover:bg-muted/40"
                      onClick={() => setStatusFilter(card.filter)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-2xl font-bold">
                          {formatNumber(card.value)}
                        </p>
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-muted-foreground">
                            {card.title}
                          </p>
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {formatNumber(card.percent)}%
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${card.percent}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">
                {t.sourceDistributionTitle}
              </CardTitle>
              <CardDescription>{t.sourceDistributionDesc}</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {sourceCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <button
                      key={card.filter}
                      type="button"
                      className="space-y-2 rounded-xl border bg-background/70 p-3 text-start transition hover:bg-muted/40"
                      onClick={() => setSourceFilter(card.filter)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-2xl font-bold">
                          {formatNumber(card.value)}
                        </p>
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-muted-foreground">
                            {card.title}
                          </p>
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {formatNumber(card.percent)}%
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${card.percent}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">
                {t.costCenterTitle}
              </CardTitle>
              <CardDescription>{t.costCenterDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.costCenterEntries}
                </p>
                <div className="mt-2 text-2xl font-bold">
                  {formatNumber(summary.cost_center_entries)}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${percent(
                        summary.cost_center_entries,
                        summary.total_entries,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.invoice}</p>
                <div className="mt-2 text-2xl font-bold">
                  {formatNumber(summary.invoice_entries)}
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.treasury}</p>
                <div className="mt-2 text-2xl font-bold">
                  {formatNumber(summary.treasury_entries)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <FileText className="h-4 w-4" />
                {t.tableTitle}
              </CardTitle>
              <CardDescription>{t.tableDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="relative w-full">
                <Search
                  className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${
                    isArabic ? "right-3" : "left-3"
                  }`}
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  className={`h-11 rounded-xl ${isArabic ? "pr-10" : "pl-10"}`}
                />
              </div>

              <div className="grid gap-3">
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((item) => {
                    const isSelected = statusFilter === item.value;

                    return (
                      <Button
                        key={item.value}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className="h-10 rounded-xl"
                        onClick={() => setStatusFilter(item.value)}
                      >
                        <span>{item.label}</span>
                        <Badge
                          variant={isSelected ? "secondary" : "outline"}
                          className="ms-1 rounded-full"
                        >
                          {formatNumber(item.count)}
                        </Badge>
                      </Button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {sourceOptions.map((item) => {
                      const isSelected = sourceFilter === item.value;

                      return (
                        <Button
                          key={item.value}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          className="h-10 rounded-xl"
                          onClick={() => setSourceFilter(item.value)}
                        >
                          <span>{item.label}</span>
                          <Badge
                            variant={isSelected ? "secondary" : "outline"}
                            className="ms-1 rounded-full"
                          >
                            {formatNumber(item.count)}
                          </Badge>
                        </Button>
                      );
                    })}
                  </div>

                  {hasSearchOrFilter ? (
                    <Button
                      variant="outline"
                      className="h-10 rounded-xl"
                      onClick={clearFilters}
                    >
                      {t.clearFilters}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.table.entry}</TableHead>
                        <TableHead>{t.table.status}</TableHead>
                        <TableHead>{t.table.source}</TableHead>
                        <TableHead>{t.table.account}</TableHead>
                        <TableHead>{t.table.costCenter}</TableHead>
                        <TableHead>{t.table.debit}</TableHead>
                        <TableHead>{t.table.credit}</TableHead>
                        <TableHead>{t.table.balance}</TableHead>
                        <TableHead>{t.table.lines}</TableHead>
                        <TableHead>{t.table.entryDate}</TableHead>
                        {canViewAccountingDetails ? (
                          <TableHead>{t.table.action}</TableHead>
                        ) : null}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {isLoading ? (
                        <TableRowsSkeleton
                          columnsCount={canViewAccountingDetails ? 11 : 10}
                        />
                      ) : filteredRows.length > 0 ? (
                        filteredRows.map((item) => (
                          <TableRow key={`${item.id}-${item.entryNumber}`}>
                            <TableCell>
                              <div className="flex min-w-[220px] items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                                  <Calculator className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-medium">
                                    {item.entryNumber || "-"}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {item.reference ||
                                      item.externalReference ||
                                      item.description ||
                                      "-"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>{statusBadge(item.status, locale)}</TableCell>

                            <TableCell>
                              {sourceBadge(item.postingSource, locale)}
                            </TableCell>

                            <TableCell>
                              <div className="min-w-[160px]">
                                <p className="truncate">
                                  {item.accountName || "-"}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {item.accountCode || "-"}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="min-w-[160px]">
                                <p className="truncate">
                                  {item.costCenterName || "-"}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {item.costCenterCode || "-"}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell>
                              <MoneyText value={item.debitAmount} />
                            </TableCell>

                            <TableCell>
                              <MoneyText value={item.creditAmount} />
                            </TableCell>

                            <TableCell>
                              <MoneyText value={item.balanceAmount} />
                            </TableCell>

                            <TableCell>
                              {formatNumber(item.linesCount)}
                            </TableCell>

                            <TableCell>
                              <span className="whitespace-nowrap">
                                {formatDate(item.entryDate || item.createdAt)}
                              </span>
                            </TableCell>

                            {canViewAccountingDetails ? (
                              <TableCell>
                                {isValidId(item.id) ? (
                                  <Link href={`/system/accounting/journals/${item.id}`}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 rounded-lg"
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span className="sr-only">
                                        {t.viewDetails}
                                      </span>
                                    </Button>
                                  </Link>
                                ) : null}
                              </TableCell>
                            ) : null}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={canViewAccountingDetails ? 11 : 10}
                            className="h-36 text-center"
                          >
                            <div className="mx-auto max-w-md space-y-2">
                              <p className="font-semibold">
                                {hasSearchOrFilter
                                  ? t.noResultsTitle
                                  : t.emptyTitle}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {hasSearchOrFilter
                                  ? t.noResultsText
                                  : t.emptyText}
                              </p>

                              {hasSearchOrFilter ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2 rounded-xl"
                                  onClick={clearFilters}
                                >
                                  {t.clearFilters}
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {t.showing} {formatNumber(filteredRows.length)} {t.from}{" "}
                {formatNumber(rows.length)}
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}