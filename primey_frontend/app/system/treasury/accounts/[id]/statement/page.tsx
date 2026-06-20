"use client";

/* ============================================================
   📂 app/system/treasury/accounts/[id]/statement/page.tsx
   🧠 Primey Care | Treasury Account Statement Page

   ✅ المسار:
      app/system/treasury/accounts/[id]/statement/page.tsx

   ✅ العمل:
      صفحة كشف حساب خزينة داخل النظام.
      تعرض بيانات الحساب، الرصيد الافتتاحي والختامي، وحركات القبض والصرف والتحويلات المرتبطة.

   ✅ الإصدار:
      Phase 17 UX Refinement + Treasury Account Statement Build

   ✅ يعتمد على:
      - /api/treasury/accounts/{id}/
      - /api/treasury/accounts/{id}/statement/
      - /api/treasury/transactions/?account_id={id}
      - primey-locale
      - AuthProvider
      - sonner
      - /currency/sar.svg

   ✅ متوافق مع:
      - Treasury accounts page
      - Treasury account details page
      - Treasury transactions pages
      - Centers / Customers approved UX standard

   ✅ الوظائف:
      - عرض كشف حساب خزينة.
      - عرض الرصيد الافتتاحي والختامي.
      - عرض إجمالي المدين والدائن.
      - عرض حركات القبض والصرف والتحويلات.
      - البحث في صف مستقل.
      - الفلاتر والأعمدة في صف مستقل.
      - فلترة حسب النوع والحالة.
      - التحكم بالأعمدة.
      - فرز الأعمدة المهمة.
      - صفحات محلية.
      - Excel export بصيغة .xls HTML Workbook.
      - Web PDF Print.
      - Error State مستقل.
      - Not Found State مستقل.
      - Empty State ذكي.
      - Skeleton Loading.
      - صلاحيات آمنة بدون كسر system_admin/superuser.
      - أرقام إنجليزية دائمًا.
      - رمز SAR من /currency/sar.svg بعد الرقم.

   ------------------------------------------------------------
   تحسينات هذا الإصدار:
      - الملف المرفق كان صفحة قائمة قيود يومية واستخدم كمرجع للنمط فقط.
      - تم بناء صفحة كشف حساب الخزينة كاملة من الصفر.
      - الالتزام بالقاعدة: w-full space-y-4 بدون main/min-h-screen/max-w.
      - عدم عرض أي مسارات أو عبارات تقنية داخل واجهة المستخدم.
      - إخفاء الأزرار غير المصرح بها.
      - استخدام sonner للتنبيهات.
      - استخدام Excel HTML Workbook بدل CSV أو XLSX.
============================================================ */

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Banknote,
  BarChart3,
  Columns3,
  CreditCard,
  Download,
  Eye,
  Filter,
  Loader2,
  Printer,
  Receipt,
  RefreshCcw,
  Search,
  ShieldCheck,
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type AccountType = "CASHBOX" | "BANK" | "WALLET" | "OTHER";
type AccountStatus = "ACTIVE" | "INACTIVE" | "CLOSED" | "UNKNOWN";

type StatementType =
  | "RECEIPT"
  | "PAYMENT"
  | "TRANSFER"
  | "ADJUSTMENT"
  | "OPENING"
  | "UNKNOWN";

type StatementStatus = "DRAFT" | "CONFIRMED" | "CANCELLED" | "UNKNOWN";

type TypeFilter = "ALL" | StatementType;
type StatusFilter = "ALL" | StatementStatus;

type SortKey =
  | "date"
  | "reference"
  | "type"
  | "status"
  | "debit"
  | "credit"
  | "balance"
  | "created_at";

type SortDirection = "asc" | "desc";

type TreasuryAccount = {
  id: string;
  name: string;
  code: string;
  account_type: AccountType;
  status: AccountStatus;
  current_balance: number;
  opening_balance: number;
  bank_name: string;
  account_number: string;
  iban: string;
  is_default: boolean;
};

type StatementRow = {
  id: string;
  date: string;
  reference: string;
  type: StatementType;
  status: StatementStatus;
  debit: number;
  credit: number;
  balance: number;
  description: string;
  transaction_id: string;
  created_at: string;
};

type StatementSummary = {
  opening_balance: number;
  closing_balance: number;
  total_debit: number;
  total_credit: number;
  rows_count: number;
  confirmed_count: number;
  receipts_total: number;
  payments_total: number;
  transfers_total: number;
};

type ApiEnvelope<T> = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  data?: T;
  account?: unknown;
  treasury_account?: unknown;
  statement?: unknown[];
  transactions?: unknown[];
  results?: unknown[];
  items?: unknown[];
  rows?: unknown[];
  summary?: Partial<StatementSummary>;
};

type VisibleColumns = {
  date: boolean;
  reference: boolean;
  type: boolean;
  status: boolean;
  debit: boolean;
  credit: boolean;
  balance: boolean;
  description: boolean;
  actions: boolean;
};

const SAR_ICON_PATH = "/currency/sar.svg";
const PAGE_SIZE = 16;

const DEFAULT_COLUMNS: VisibleColumns = {
  date: true,
  reference: true,
  type: true,
  status: true,
  debit: true,
  credit: true,
  balance: true,
  description: true,
  actions: true,
};

const DEFAULT_SUMMARY: StatementSummary = {
  opening_balance: 0,
  closing_balance: 0,
  total_debit: 0,
  total_credit: 0,
  rows_count: 0,
  confirmed_count: 0,
  receipts_total: 0,
  payments_total: 0,
  transfers_total: 0,
};

/* ============================================================
   Locale / API
============================================================ */

function readLocale(): AppLocale {
  try {
    if (typeof window === "undefined") return "ar";

    const saved =
      window.localStorage.getItem("primey-locale") ||
      window.localStorage.getItem("locale") ||
      window.localStorage.getItem("lang");

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

function buildQuery(params: Record<string, string | number | null>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === "") return;
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
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

    if (value && typeof value === "object") return value as Dict;
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
    title: isArabic ? "كشف حساب الخزينة" : "Treasury Account Statement",
    subtitle: isArabic
      ? "مراجعة رصيد الحساب وحركات القبض والصرف والتحويلات خلال الفترة."
      : "Review account balance, receipts, payments, and transfers.",

    back: isArabic ? "تفاصيل الحساب" : "Account Details",
    accounts: isArabic ? "حسابات الخزينة" : "Treasury Accounts",
    treasury: isArabic ? "الخزينة" : "Treasury",
    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    exportExcel: isArabic ? "تصدير Excel" : "Export Excel",
    print: isArabic ? "طباعة PDF" : "Print PDF",

    summaryTitle: isArabic ? "ملخص كشف الحساب" : "Statement Summary",
    summaryDesc: isArabic
      ? "الأرصدة والإجماليات الخاصة بالحساب."
      : "Balances and totals for this account.",
    tableTitle: isArabic ? "حركات كشف الحساب" : "Statement Movements",
    tableDesc: isArabic
      ? "سندات القبض والصرف والتحويلات المرتبطة بالحساب."
      : "Receipts, payments, and transfers linked to this account.",
    accountInfo: isArabic ? "بيانات الحساب" : "Account Information",

    accountName: isArabic ? "اسم الحساب" : "Account Name",
    accountCode: isArabic ? "كود الحساب" : "Account Code",
    accountType: isArabic ? "نوع الحساب" : "Account Type",
    accountStatus: isArabic ? "حالة الحساب" : "Account Status",
    bankInfo: isArabic ? "بيانات البنك" : "Bank Information",
    defaultAccount: isArabic ? "حساب افتراضي" : "Default Account",
    regularAccount: isArabic ? "حساب عادي" : "Regular Account",

    openingBalance: isArabic ? "الرصيد الافتتاحي" : "Opening Balance",
    closingBalance: isArabic ? "الرصيد الختامي" : "Closing Balance",
    totalDebit: isArabic ? "إجمالي المدين" : "Total Debit",
    totalCredit: isArabic ? "إجمالي الدائن" : "Total Credit",
    movementsCount: isArabic ? "عدد الحركات" : "Movements Count",
    confirmedCount: isArabic ? "حركات مؤكدة" : "Confirmed Movements",
    receiptsTotal: isArabic ? "إجمالي القبض" : "Total Receipts",
    paymentsTotal: isArabic ? "إجمالي الصرف" : "Total Payments",
    transfersTotal: isArabic ? "إجمالي التحويلات" : "Total Transfers",

    searchPlaceholder: isArabic
      ? "ابحث بالمرجع أو الوصف أو نوع الحركة..."
      : "Search by reference, description, or movement type...",

    filters: isArabic ? "الفلاتر" : "Filters",
    columns: isArabic ? "الأعمدة" : "Columns",
    clearFilters: isArabic ? "مسح الفلاتر" : "Clear Filters",
    allTypes: isArabic ? "كل الأنواع" : "All Types",
    allStatuses: isArabic ? "كل الحالات" : "All Statuses",

    cashbox: isArabic ? "صندوق" : "Cashbox",
    bank: isArabic ? "بنك" : "Bank",
    wallet: isArabic ? "محفظة" : "Wallet",
    other: isArabic ? "أخرى" : "Other",

    active: isArabic ? "نشط" : "Active",
    inactive: isArabic ? "غير نشط" : "Inactive",
    closed: isArabic ? "مغلق" : "Closed",
    unknown: isArabic ? "غير محدد" : "Unknown",

    receipt: isArabic ? "قبض" : "Receipt",
    payment: isArabic ? "صرف" : "Payment",
    transfer: isArabic ? "تحويل" : "Transfer",
    adjustment: isArabic ? "تسوية" : "Adjustment",
    opening: isArabic ? "رصيد افتتاحي" : "Opening",

    draft: isArabic ? "مسودة" : "Draft",
    confirmed: isArabic ? "مؤكد" : "Confirmed",
    cancelled: isArabic ? "ملغي" : "Cancelled",

    table: {
      date: isArabic ? "التاريخ" : "Date",
      reference: isArabic ? "المرجع" : "Reference",
      type: isArabic ? "النوع" : "Type",
      status: isArabic ? "الحالة" : "Status",
      debit: isArabic ? "مدين" : "Debit",
      credit: isArabic ? "دائن" : "Credit",
      balance: isArabic ? "الرصيد" : "Balance",
      description: isArabic ? "الوصف" : "Description",
      action: isArabic ? "الإجراء" : "Action",
    },

    view: isArabic ? "عرض" : "View",

    emptyTitle: isArabic ? "لا توجد حركات في كشف الحساب" : "No statement movements",
    emptyText: isArabic
      ? "لم يتم العثور على حركات مرتبطة بهذا الحساب."
      : "No movements were found for this account.",
    noResultsTitle: isArabic ? "لا توجد نتائج مطابقة" : "No matching results",
    noResultsText: isArabic
      ? "جرّب تغيير البحث أو الفلاتر."
      : "Try changing the search or filters.",

    notFoundTitle: isArabic ? "حساب الخزينة غير موجود" : "Treasury account not found",
    notFoundText: isArabic
      ? "لم يتم العثور على حساب الخزينة المطلوب."
      : "The requested treasury account could not be found.",

    accessDeniedTitle: isArabic
      ? "غير مصرح بعرض كشف الحساب"
      : "Access denied",
    accessDeniedText: isArabic
      ? "لا تملك صلاحية عرض كشف حساب الخزينة. تواصل مع مسؤول النظام إذا كنت تحتاج الوصول."
      : "You do not have permission to view this treasury account statement. Contact your system administrator if you need access.",

    loadError: isArabic
      ? "تعذر تحميل كشف حساب الخزينة."
      : "Unable to load treasury account statement.",
    loadErrorHint: isArabic
      ? "تحقق من الاتصال أو الصلاحيات ثم أعد المحاولة."
      : "Check the connection or permissions, then try again.",
    loadSuccess: isArabic
      ? "تم تحديث كشف الحساب بنجاح."
      : "Statement refreshed successfully.",

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

    previous: isArabic ? "السابق" : "Previous",
    next: isArabic ? "التالي" : "Next",
    showing: isArabic ? "عرض" : "Showing",
    from: isArabic ? "من" : "of",
    generatedAt: isArabic ? "تاريخ التصدير" : "Generated At",
    printedAt: isArabic ? "تاريخ الطباعة" : "Printed At",
    rowsCount: isArabic ? "عدد السجلات" : "Rows Count",
  };
}

/* ============================================================
   Helpers
============================================================ */

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: unknown): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatMoney(value: unknown): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: string, locale: AppLocale): string {
  if (!value) return locale === "ar" ? "غير محدد" : "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

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

function getNestedValue(obj: Dict, keys: string[]): unknown {
  for (const key of keys) {
    const value = obj[key];

    if (value !== undefined && value !== null && value !== "") return value;
  }

  for (const container of [
    "account",
    "treasury_account",
    "cashbox",
    "bank",
    "wallet",
    "transaction",
    "treasury_transaction",
    "movement",
    "statement_row",
    "item",
    "data",
  ]) {
    const nested = obj[container];

    if (nested && typeof nested === "object") {
      const value = getNestedValue(nested as Dict, keys);

      if (value !== undefined && value !== null && value !== "") return value;
    }
  }

  return undefined;
}

function extractAccountData(payload: ApiEnvelope<unknown> | null): Dict {
  if (!payload) return {};

  const data = asDict(payload.data);

  if (payload.account && typeof payload.account === "object") {
    return payload.account as Dict;
  }

  if (payload.treasury_account && typeof payload.treasury_account === "object") {
    return payload.treasury_account as Dict;
  }

  if (data.account && typeof data.account === "object") {
    return data.account as Dict;
  }

  if (data.treasury_account && typeof data.treasury_account === "object") {
    return data.treasury_account as Dict;
  }

  return Object.keys(data).length > 0 ? data : asDict(payload);
}

function extractRows(payload: ApiEnvelope<unknown> | null): unknown[] {
  if (!payload) return [];

  const data = asDict(payload.data);

  if (Array.isArray(payload.statement)) return payload.statement;
  if (Array.isArray(payload.transactions)) return payload.transactions;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;

  if (Array.isArray(data.statement)) return data.statement as unknown[];
  if (Array.isArray(data.transactions)) return data.transactions as unknown[];
  if (Array.isArray(data.results)) return data.results as unknown[];
  if (Array.isArray(data.items)) return data.items as unknown[];
  if (Array.isArray(data.rows)) return data.rows as unknown[];

  return [];
}

function extractSummary(payload: ApiEnvelope<unknown> | null) {
  if (!payload) return {};

  const data = asDict(payload.data);

  return {
    ...asDict(payload.summary),
    ...asDict(data.summary),
    ...asDict(data.totals),
    ...asDict(data),
  } as Partial<StatementSummary>;
}

function normalizeAccountType(value: unknown): AccountType {
  const clean = String(value || "").toUpperCase();

  if (["CASHBOX", "CASH", "BOX"].includes(clean)) return "CASHBOX";
  if (["BANK", "BANK_ACCOUNT"].includes(clean)) return "BANK";
  if (["WALLET", "E_WALLET"].includes(clean)) return "WALLET";

  return "OTHER";
}

function normalizeAccountStatus(value: unknown): AccountStatus {
  const clean = String(value || "").toUpperCase();

  if (["ACTIVE", "OPEN", "ENABLED", "TRUE"].includes(clean)) return "ACTIVE";
  if (["INACTIVE", "DISABLED", "FALSE"].includes(clean)) return "INACTIVE";
  if (["CLOSED", "LOCKED"].includes(clean)) return "CLOSED";

  if (typeof value === "boolean") return value ? "ACTIVE" : "INACTIVE";

  return "UNKNOWN";
}

function normalizeStatementType(value: unknown): StatementType {
  const clean = String(value || "").toUpperCase();

  if (["RECEIPT", "INCOME", "RECEIVE", "CASH_IN"].includes(clean)) return "RECEIPT";
  if (["PAYMENT", "EXPENSE", "PAY", "CASH_OUT"].includes(clean)) return "PAYMENT";
  if (["TRANSFER", "INTERNAL_TRANSFER"].includes(clean)) return "TRANSFER";
  if (["ADJUSTMENT"].includes(clean)) return "ADJUSTMENT";
  if (["OPENING", "OPENING_BALANCE"].includes(clean)) return "OPENING";

  return "UNKNOWN";
}

function normalizeStatementStatus(value: unknown): StatementStatus {
  const clean = String(value || "").toUpperCase();

  if (["DRAFT", "PENDING"].includes(clean)) return "DRAFT";
  if (["CONFIRMED", "POSTED", "APPROVED", "TRUE"].includes(clean)) {
    return "CONFIRMED";
  }
  if (["CANCELLED", "CANCELED", "VOID"].includes(clean)) return "CANCELLED";

  if (typeof value === "boolean") return value ? "CONFIRMED" : "DRAFT";

  return "UNKNOWN";
}

function normalizeAccount(item: unknown): TreasuryAccount {
  const obj = asDict(item);

  return {
    id: String(getNestedValue(obj, ["id", "uuid", "pk"]) || ""),
    name: String(getNestedValue(obj, ["name", "title", "label"]) || "-"),
    code: String(getNestedValue(obj, ["code", "account_code", "number"]) || "-"),
    account_type: normalizeAccountType(
      getNestedValue(obj, ["account_type", "type", "kind"]),
    ),
    status: normalizeAccountStatus(
      getNestedValue(obj, ["status", "state", "is_active"]),
    ),
    current_balance: toNumber(
      getNestedValue(obj, ["current_balance", "balance", "available_balance"]),
    ),
    opening_balance: toNumber(
      getNestedValue(obj, ["opening_balance", "initial_balance"]),
    ),
    bank_name: String(getNestedValue(obj, ["bank_name", "bank"]) || ""),
    account_number: String(
      getNestedValue(obj, ["account_number", "bank_account_number"]) || "",
    ),
    iban: String(getNestedValue(obj, ["iban", "IBAN"]) || ""),
    is_default: Boolean(getNestedValue(obj, ["is_default", "default"])),
  };
}

function normalizeStatementRow(item: unknown, index: number): StatementRow {
  const obj = asDict(item);

  const type = normalizeStatementType(
    getNestedValue(obj, ["movement_type", "transaction_type", "type", "kind", "voucher_type"]),
  );

  const amount = toNumber(getNestedValue(obj, ["amount", "total_amount"]));

  const debitValue = getNestedValue(obj, ["debit", "debit_amount", "in_amount"]);
  const creditValue = getNestedValue(obj, [
    "credit",
    "credit_amount",
    "out_amount",
  ]);

  const debit =
    debitValue !== undefined && debitValue !== null && debitValue !== ""
      ? toNumber(debitValue)
      : type === "RECEIPT" || type === "OPENING" || type === "ADJUSTMENT"
        ? Math.max(amount, 0)
        : 0;

  const credit =
    creditValue !== undefined && creditValue !== null && creditValue !== ""
      ? toNumber(creditValue)
      : type === "PAYMENT" || type === "TRANSFER"
        ? Math.max(amount, 0)
        : 0;

  return {
    id: String(getNestedValue(obj, ["id", "uuid", "pk"]) || `${index}`),
    date: String(getNestedValue(obj, ["date", "transaction_date", "created_at"]) || ""),
    reference: String(
      getNestedValue(obj, [
        "reference",
        "transaction_number",
        "number",
        "code",
        "source_reference",
        "external_reference",
      ]) || "-",
    ),
    type,
    status: normalizeStatementStatus(
      getNestedValue(obj, ["status", "state", "is_confirmed"]),
    ),
    debit,
    credit,
    balance: toNumber(
      getNestedValue(obj, ["balance", "running_balance", "current_balance"]),
    ),
    description: String(getNestedValue(obj, ["description", "notes", "memo"]) || ""),
    transaction_id: String(
      getNestedValue(obj, ["transaction_id", "treasury_transaction_id", "id", "uuid"]) ||
        "",
    ),
    created_at: String(getNestedValue(obj, ["created_at", "created"]) || ""),
  };
}

function buildSummary(
  account: TreasuryAccount | null,
  rows: StatementRow[],
  apiSummary?: Partial<StatementSummary>,
): StatementSummary {
  const fallback: StatementSummary = {
    opening_balance: account?.opening_balance || 0,
    closing_balance:
      rows.length > 0
        ? rows[rows.length - 1]?.balance || account?.current_balance || 0
        : account?.current_balance || 0,
    total_debit: rows.reduce((sum, item) => sum + item.debit, 0),
    total_credit: rows.reduce((sum, item) => sum + item.credit, 0),
    rows_count: rows.length,
    confirmed_count: rows.filter((item) => item.status === "CONFIRMED").length,
    receipts_total: rows
      .filter((item) => item.type === "RECEIPT")
      .reduce((sum, item) => sum + item.debit, 0),
    payments_total: rows
      .filter((item) => item.type === "PAYMENT")
      .reduce((sum, item) => sum + item.credit, 0),
    transfers_total: rows
      .filter((item) => item.type === "TRANSFER")
      .reduce((sum, item) => sum + item.credit, 0),
  };

  return {
    opening_balance:
      toNumber(apiSummary?.opening_balance) || fallback.opening_balance,
    closing_balance:
      toNumber(apiSummary?.closing_balance) ||
      toNumber((apiSummary as Dict)?.current_balance) ||
      fallback.closing_balance,
    total_debit: toNumber(apiSummary?.total_debit) || fallback.total_debit,
    total_credit: toNumber(apiSummary?.total_credit) || fallback.total_credit,
    rows_count:
      toNumber(apiSummary?.rows_count) ||
      toNumber((apiSummary as Dict)?.transactions_count) ||
      fallback.rows_count,
    confirmed_count:
      toNumber(apiSummary?.confirmed_count) ||
      toNumber((apiSummary as Dict)?.confirmed_transactions) ||
      fallback.confirmed_count,
    receipts_total:
      toNumber(apiSummary?.receipts_total) ||
      toNumber((apiSummary as Dict)?.receipt_total) ||
      fallback.receipts_total,
    payments_total:
      toNumber(apiSummary?.payments_total) ||
      toNumber((apiSummary as Dict)?.payment_total) ||
      fallback.payments_total,
    transfers_total:
      toNumber(apiSummary?.transfers_total) ||
      toNumber((apiSummary as Dict)?.transfer_total) ||
      fallback.transfers_total,
  };
}

function accountTypeLabel(type: AccountType, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<AccountType, string> = {
    CASHBOX: t.cashbox,
    BANK: t.bank,
    WALLET: t.wallet,
    OTHER: t.other,
  };

  return labels[type];
}

function accountStatusLabel(status: AccountStatus, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<AccountStatus, string> = {
    ACTIVE: t.active,
    INACTIVE: t.inactive,
    CLOSED: t.closed,
    UNKNOWN: t.unknown,
  };

  return labels[status];
}

function statementTypeLabel(type: StatementType, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<StatementType, string> = {
    RECEIPT: t.receipt,
    PAYMENT: t.payment,
    TRANSFER: t.transfer,
    ADJUSTMENT: t.adjustment,
    OPENING: t.opening,
    UNKNOWN: t.unknown,
  };

  return labels[type];
}

function statementStatusLabel(status: StatementStatus, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<StatementStatus, string> = {
    DRAFT: t.draft,
    CONFIRMED: t.confirmed,
    CANCELLED: t.cancelled,
    UNKNOWN: t.unknown,
  };

  return labels[status];
}

function accountTypeBadge(type: AccountType, locale: AppLocale) {
  const label = accountTypeLabel(type, locale);

  if (type === "CASHBOX") {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        {label}
      </Badge>
    );
  }

  if (type === "BANK") {
    return (
      <Badge className="rounded-full border-sky-200 bg-sky-50 px-3 py-1 text-sky-700 hover:bg-sky-50 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300">
        {label}
      </Badge>
    );
  }

  if (type === "WALLET") {
    return (
      <Badge className="rounded-full border-violet-200 bg-violet-50 px-3 py-1 text-violet-700 hover:bg-violet-50 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-300">
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="rounded-full px-3 py-1">
      {label}
    </Badge>
  );
}

function accountStatusBadge(status: AccountStatus, locale: AppLocale) {
  const label = accountStatusLabel(status, locale);

  if (status === "ACTIVE") {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        {label}
      </Badge>
    );
  }

  if (status === "INACTIVE") {
    return (
      <Badge className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
        {label}
      </Badge>
    );
  }

  if (status === "CLOSED") {
    return (
      <Badge variant="secondary" className="rounded-full px-3 py-1">
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="rounded-full px-3 py-1">
      {label}
    </Badge>
  );
}

function statementTypeBadge(type: StatementType, locale: AppLocale) {
  const label = statementTypeLabel(type, locale);

  if (type === "RECEIPT") {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        {label}
      </Badge>
    );
  }

  if (type === "PAYMENT") {
    return (
      <Badge className="rounded-full border-rose-200 bg-rose-50 px-3 py-1 text-rose-700 hover:bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
        {label}
      </Badge>
    );
  }

  if (type === "TRANSFER") {
    return (
      <Badge className="rounded-full border-sky-200 bg-sky-50 px-3 py-1 text-sky-700 hover:bg-sky-50 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300">
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="rounded-full px-3 py-1">
      {label}
    </Badge>
  );
}

function statementStatusBadge(status: StatementStatus, locale: AppLocale) {
  const label = statementStatusLabel(status, locale);

  if (status === "CONFIRMED") {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        {label}
      </Badge>
    );
  }

  if (status === "DRAFT") {
    return (
      <Badge className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
        {label}
      </Badge>
    );
  }

  if (status === "CANCELLED") {
    return (
      <Badge variant="secondary" className="rounded-full px-3 py-1">
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="rounded-full px-3 py-1">
      {label}
    </Badge>
  );
}

function sortValue(row: StatementRow, key: SortKey): string | number {
  if (key === "debit") return row.debit;
  if (key === "credit") return row.credit;
  if (key === "balance") return row.balance;

  return String(row[key] || "");
}

function isValidId(value: unknown) {
  const id = String(value || "").trim();

  return id && id !== "-" && id !== "undefined" && id !== "null";
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

function MoneyText({ value }: { value: unknown }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span>{formatMoney(value)}</span>
      <SarIcon className="h-3.5 w-3.5" />
    </span>
  );
}

/* ============================================================
   Skeleton
============================================================ */

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-muted ${className}`} />;
}

function KpiSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-5">
            <SkeletonLine className="h-8 w-28" />
            <SkeletonLine className="mt-3 h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton({ columnsCount }: { columnsCount: number }) {
  return (
    <>
      {Array.from({ length: 7 }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columnsCount }).map((__, columnIndex) => (
            <TableCell key={columnIndex}>
              <SkeletonLine
                className={
                  columnIndex === 1
                    ? "h-8 w-40 rounded-lg"
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
  account,
  summary,
  rows,
}: {
  filename: string;
  worksheetName: string;
  title: string;
  locale: AppLocale;
  account: TreasuryAccount;
  summary: StatementSummary;
  rows: StatementRow[];
}) {
  const isArabic = locale === "ar";
  const dir = isArabic ? "rtl" : "ltr";
  const align = isArabic ? "right" : "left";
  const t = dictionary(locale);

  const rowsHtml = rows
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(formatDate(item.date, locale))}</td>
          <td>${escapeHtml(item.reference || "-")}</td>
          <td>${escapeHtml(statementTypeLabel(item.type, locale))}</td>
          <td>${escapeHtml(statementStatusLabel(item.status, locale))}</td>
          <td>${escapeHtml(formatMoney(item.debit))}</td>
          <td>${escapeHtml(formatMoney(item.credit))}</td>
          <td>${escapeHtml(formatMoney(item.balance))}</td>
          <td>${escapeHtml(item.description || "-")}</td>
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
                  <x:DisplayRightToLeft>${isArabic ? "True" : "False"}</x:DisplayRightToLeft>
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
          <tr><td class="title" colspan="8">${escapeHtml(title)}</td></tr>
          <tr><td colspan="8"></td></tr>
          <tr><td class="section" colspan="8">${escapeHtml(t.accountInfo)}</td></tr>
          <tr><td class="summary-label">${escapeHtml(t.generatedAt)}</td><td class="summary-value" colspan="7">${escapeHtml(new Date().toLocaleString("en-US"))}</td></tr>
          <tr><td class="summary-label">${escapeHtml(t.accountName)}</td><td class="summary-value" colspan="7">${escapeHtml(account.name)}</td></tr>
          <tr><td class="summary-label">${escapeHtml(t.accountCode)}</td><td class="summary-value" colspan="7">${escapeHtml(account.code)}</td></tr>
          <tr><td class="summary-label">${escapeHtml(t.openingBalance)}</td><td class="summary-value" colspan="7">${escapeHtml(formatMoney(summary.opening_balance))}</td></tr>
          <tr><td class="summary-label">${escapeHtml(t.closingBalance)}</td><td class="summary-value" colspan="7">${escapeHtml(formatMoney(summary.closing_balance))}</td></tr>
          <tr><td class="summary-label">${escapeHtml(t.totalDebit)}</td><td class="summary-value" colspan="7">${escapeHtml(formatMoney(summary.total_debit))}</td></tr>
          <tr><td class="summary-label">${escapeHtml(t.totalCredit)}</td><td class="summary-value" colspan="7">${escapeHtml(formatMoney(summary.total_credit))}</td></tr>

          <tr><td colspan="8"></td></tr>
          <tr>
            <th>${escapeHtml(t.table.date)}</th>
            <th>${escapeHtml(t.table.reference)}</th>
            <th>${escapeHtml(t.table.type)}</th>
            <th>${escapeHtml(t.table.status)}</th>
            <th>${escapeHtml(t.table.debit)}</th>
            <th>${escapeHtml(t.table.credit)}</th>
            <th>${escapeHtml(t.table.balance)}</th>
            <th>${escapeHtml(t.table.description)}</th>
          </tr>
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
  account,
  summary,
  rows,
}: {
  locale: AppLocale;
  title: string;
  account: TreasuryAccount;
  summary: StatementSummary;
  rows: StatementRow[];
}) {
  const isArabic = locale === "ar";
  const t = dictionary(locale);
  const now = new Date().toLocaleString("en-US");

  const tableRows = rows
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(formatDate(item.date, locale))}</td>
          <td>${escapeHtml(item.reference || "-")}</td>
          <td>${escapeHtml(statementTypeLabel(item.type, locale))}</td>
          <td>${escapeHtml(statementStatusLabel(item.status, locale))}</td>
          <td>${escapeHtml(formatMoney(item.debit))}</td>
          <td>${escapeHtml(formatMoney(item.credit))}</td>
          <td>${escapeHtml(formatMoney(item.balance))}</td>
        </tr>`,
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
            background: #fff;
            direction: ${isArabic ? "rtl" : "ltr"};
            text-align: ${isArabic ? "right" : "left"};
          }
          .print-header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 18px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 14px;
          }
          h1 { margin: 0; font-size: 22px; font-weight: 800; }
          .meta { margin-top: 8px; color: #6b7280; font-size: 12px; line-height: 1.8; }
          .badge {
            border: 1px solid #d1d5db;
            border-radius: 999px;
            padding: 4px 10px;
            font-size: 12px;
            height: fit-content;
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
              <div>${escapeHtml(account.name)} - ${escapeHtml(account.code)}</div>
              <div>${escapeHtml(t.printedAt)}: ${escapeHtml(now)}</div>
              <div>${escapeHtml(t.rowsCount)}: ${formatNumber(rows.length)}</div>
            </div>
          </div>
          <div class="badge">Primey Care</div>
        </div>

        <div class="summary-grid">
          <div class="summary-card"><span>${escapeHtml(t.openingBalance)}</span><strong>${formatMoney(summary.opening_balance)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.closingBalance)}</span><strong>${formatMoney(summary.closing_balance)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.totalDebit)}</span><strong>${formatMoney(summary.total_debit)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.totalCredit)}</span><strong>${formatMoney(summary.total_credit)}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${escapeHtml(t.table.date)}</th>
              <th>${escapeHtml(t.table.reference)}</th>
              <th>${escapeHtml(t.table.type)}</th>
              <th>${escapeHtml(t.table.status)}</th>
              <th>${escapeHtml(t.table.debit)}</th>
              <th>${escapeHtml(t.table.credit)}</th>
              <th>${escapeHtml(t.table.balance)}</th>
            </tr>
          </thead>
          <tbody>
            ${
              tableRows ||
              `<tr><td colspan="8" style="text-align:center">${escapeHtml(t.emptyTitle)}</td></tr>`
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

export default function TreasuryAccountStatementPage() {
  const params = useParams<{ id?: string }>();
  const auth = useAuth() as unknown;

  const accountId = String(params?.id || "");

  const [locale, setLocale] = useState<AppLocale>("ar");
  const [account, setAccount] = useState<TreasuryAccount | null>(null);
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [summary, setSummary] = useState<StatementSummary>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notFound, setNotFound] = useState(false);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] =
    useState<VisibleColumns>(DEFAULT_COLUMNS);

  const t = useMemo(() => dictionary(locale), [locale]);
  const isArabic = locale === "ar";
  const authResolving = isAuthResolving(auth);

  const canView = hasSafePermission(
    auth,
    ["treasury.view", "treasury.accounts.view", "treasury.statement.view"],
    "view",
  );

  const canViewTransactions = hasSafePermission(
    auth,
    ["treasury.view", "treasury.transactions.view"],
    "view",
  );

  const canExport = hasSafePermission(
    auth,
    ["treasury.export", "treasury.reports.export", "reports.export"],
    "action",
  );

  const canPrint = hasSafePermission(
    auth,
    ["treasury.print", "treasury.reports.print", "reports.print"],
    "action",
  );

  const filteredRows = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    const filtered = rows.filter((item) => {
      const matchesType = typeFilter === "ALL" ? true : item.type === typeFilter;

      const matchesStatus =
        statusFilter === "ALL" ? true : item.status === statusFilter;

      const matchesQuery = !cleanQuery
        ? true
        : [
            item.reference,
            item.description,
            statementTypeLabel(item.type, locale),
            statementStatusLabel(item.status, locale),
          ]
            .join(" ")
            .toLowerCase()
            .includes(cleanQuery);

      return matchesType && matchesStatus && matchesQuery;
    });

    return [...filtered].sort((a, b) => {
      const first = sortValue(a, sortKey);
      const second = sortValue(b, sortKey);

      if (typeof first === "number" && typeof second === "number") {
        return sortDirection === "asc" ? first - second : second - first;
      }

      return sortDirection === "asc"
        ? String(first).localeCompare(String(second))
        : String(second).localeCompare(String(first));
    });
  }, [locale, query, rows, sortDirection, sortKey, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const paginatedRows = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * PAGE_SIZE;

    return filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRows, page, totalPages]);

  const hasSearchOrFilter =
    query.trim().length > 0 || typeFilter !== "ALL" || statusFilter !== "ALL";

  const visibleColumnCount = Object.entries(visibleColumns).filter(
    ([key, value]) => value && (key !== "actions" || canViewTransactions),
  ).length;

  const typeOptions = useMemo(
    () => [
      { value: "ALL" as TypeFilter, label: t.allTypes, count: rows.length },
      {
        value: "RECEIPT" as TypeFilter,
        label: t.receipt,
        count: rows.filter((item) => item.type === "RECEIPT").length,
      },
      {
        value: "PAYMENT" as TypeFilter,
        label: t.payment,
        count: rows.filter((item) => item.type === "PAYMENT").length,
      },
      {
        value: "TRANSFER" as TypeFilter,
        label: t.transfer,
        count: rows.filter((item) => item.type === "TRANSFER").length,
      },
      {
        value: "ADJUSTMENT" as TypeFilter,
        label: t.adjustment,
        count: rows.filter((item) => item.type === "ADJUSTMENT").length,
      },
      {
        value: "OPENING" as TypeFilter,
        label: t.opening,
        count: rows.filter((item) => item.type === "OPENING").length,
      },
    ],
    [rows, t],
  );

  const statusOptions = useMemo(
    () => [
      { value: "ALL" as StatusFilter, label: t.allStatuses, count: rows.length },
      {
        value: "DRAFT" as StatusFilter,
        label: t.draft,
        count: rows.filter((item) => item.status === "DRAFT").length,
      },
      {
        value: "CONFIRMED" as StatusFilter,
        label: t.confirmed,
        count: rows.filter((item) => item.status === "CONFIRMED").length,
      },
      {
        value: "CANCELLED" as StatusFilter,
        label: t.cancelled,
        count: rows.filter((item) => item.status === "CANCELLED").length,
      },
    ],
    [rows, t],
  );

  const columnOptions: Array<{ key: keyof VisibleColumns; label: string }> = [
    { key: "date", label: t.table.date },
    { key: "reference", label: t.table.reference },
    { key: "type", label: t.table.type },
    { key: "status", label: t.table.status },
    { key: "debit", label: t.table.debit },
    { key: "credit", label: t.table.credit },
    { key: "balance", label: t.table.balance },
    { key: "description", label: t.table.description },
    { key: "actions", label: t.table.action },
  ];

  const loadStatement = useCallback(
    async (showToast = false) => {
      if (!canView) {
        setIsLoading(false);
        return;
      }

      if (!accountId) {
        setIsLoading(false);
        setNotFound(true);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");
        setNotFound(false);

        const [accountResponse, statementResponse, transactionsResponse] =
          await Promise.allSettled([
            fetch(apiUrl(`/api/treasury/accounts/${accountId}/`), {
              method: "GET",
              credentials: "include",
              cache: "no-store",
              headers: { Accept: "application/json" },
            }),
            fetch(apiUrl(`/api/treasury/accounts/${accountId}/statement/`), {
              method: "GET",
              credentials: "include",
              cache: "no-store",
              headers: { Accept: "application/json" },
            }),
            fetch(
              apiUrl(
                `/api/treasury/transactions/${buildQuery({
                  account_id: accountId,
                  treasury_account_id: accountId,
                  page_size: 500,
                })}`,
              ),
              {
                method: "GET",
                credentials: "include",
                cache: "no-store",
                headers: { Accept: "application/json" },
              },
            ),
          ]);

        async function readJson(result: PromiseSettledResult<Response>) {
          if (result.status !== "fulfilled") return null;

          const response = result.value;
          const payload = (await response.json().catch(() => null)) as
            | ApiEnvelope<unknown>
            | null;

          if ([400, 404, 405].includes(response.status)) return null;

          if (
            !response.ok ||
            payload?.ok === false ||
            payload?.success === false
          ) {
            throw new Error(
              payload?.message ||
                payload?.detail ||
                payload?.error ||
                `HTTP ${response.status}`,
            );
          }

          return payload;
        }

        const accountPayload = await readJson(accountResponse);
        const statementPayload = await readJson(statementResponse);
        const transactionsPayload = await readJson(transactionsResponse);

        const accountSource = accountPayload || statementPayload;

        if (!accountSource) {
          setAccount(null);
          setRows([]);
          setSummary(DEFAULT_SUMMARY);
          setNotFound(true);
          return;
        }

        const normalizedAccount = normalizeAccount(extractAccountData(accountSource));

        if (!isValidId(normalizedAccount.id) && !normalizedAccount.name) {
          setAccount(null);
          setRows([]);
          setSummary(DEFAULT_SUMMARY);
          setNotFound(true);
          return;
        }

        const sourceRows = extractRows(statementPayload).length
          ? extractRows(statementPayload)
          : extractRows(transactionsPayload);

        const normalizedRows = sourceRows
          .map(normalizeStatementRow)
          .filter((item) => item.id || item.reference);

        setAccount(normalizedAccount);
        setRows(normalizedRows);
        setSummary(
          buildSummary(
            normalizedAccount,
            normalizedRows,
            extractSummary(statementPayload) || extractSummary(accountPayload),
          ),
        );
        setPage(1);

        if (showToast) {
          toast.success(t.loadSuccess);
        }
      } catch (error) {
        console.error("Treasury account statement load error:", error);
        setAccount(null);
        setRows([]);
        setSummary(DEFAULT_SUMMARY);
        setErrorMessage(t.loadError);
        toast.error(t.loadError);
      } finally {
        setIsLoading(false);
      }
    },
    [accountId, canView, t.loadError, t.loadSuccess],
  );

  function clearFilters() {
    setQuery("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setPage(1);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  function exportExcel() {
    if (!canExport || !account) return;

    if (filteredRows.length === 0) {
      toast.error(t.exportEmpty);
      return;
    }

    downloadExcel({
      filename: `primey-care-treasury-statement-${account.code}-${new Date()
        .toISOString()
        .slice(0, 10)}.xls`,
      worksheetName: isArabic ? "كشف الحساب" : "Statement",
      title: t.title,
      locale,
      account,
      summary,
      rows: filteredRows,
    });

    toast.success(t.exportSuccess);
  }

  function printPage() {
    if (!canPrint || !account) return;

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
        title: t.title,
        account,
        summary,
        rows: filteredRows,
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
      window.setTimeout(syncLocale, 0);
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
    loadStatement(false);
  }, [authResolving, loadStatement]);

  useEffect(() => {
    setPage(1);
  }, [query, typeFilter, statusFilter]);

  if (!authResolving && !canView) {
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
            {account ? `${account.name} - ${account.code}` : t.subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href={`/system/treasury/accounts/${accountId}`}>
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t.back}</span>
            </Button>
          </Link>

          <Link href="/system/treasury/accounts">
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl sm:w-auto"
            >
              <Wallet className="h-4 w-4" />
              <span>{t.accounts}</span>
            </Button>
          </Link>

          <Link href="/system/treasury">
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl sm:w-auto"
            >
              <BarChart3 className="h-4 w-4" />
              <span>{t.treasury}</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            className="h-10 rounded-xl"
            onClick={() => loadStatement(true)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            <span>{t.refresh}</span>
          </Button>

          {canExport ? (
            <Button
              className="h-10 rounded-xl"
              onClick={exportExcel}
              disabled={
                isLoading ||
                filteredRows.length === 0 ||
                Boolean(errorMessage) ||
                !account
              }
            >
              <Download className="h-4 w-4" />
              <span>{t.exportExcel}</span>
            </Button>
          ) : null}

          {canPrint ? (
            <Button
              variant="outline"
              className="h-10 rounded-xl"
              onClick={printPage}
              disabled={
                isLoading ||
                filteredRows.length === 0 ||
                Boolean(errorMessage) ||
                !account
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
                <p className="font-semibold text-destructive">{errorMessage}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.loadErrorHint}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => loadStatement(true)}
            >
              <RefreshCcw className="h-4 w-4" />
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && notFound ? (
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="flex items-start gap-3 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Wallet className="h-5 w-5" />
            </div>

            <div>
              <p className="font-semibold">{t.notFoundTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.notFoundText}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!errorMessage && !notFound ? (
        <>
          {isLoading ? (
            <KpiSkeleton />
          ) : account ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-2xl font-bold">
                        <MoneyText value={summary.opening_balance} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t.openingBalance}
                      </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                      <Wallet className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-2xl font-bold">
                        <MoneyText value={summary.closing_balance} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t.closingBalance}
                      </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-2xl font-bold">
                        <MoneyText value={summary.total_debit} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t.totalDebit}
                      </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
                      <Receipt className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-2xl font-bold">
                        <MoneyText value={summary.total_credit} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t.totalCredit}
                      </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                      <Banknote className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {account ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <Wallet className="h-4 w-4" />
                    {t.accountInfo}
                  </CardTitle>
                  <CardDescription>{t.summaryDesc}</CardDescription>
                </CardHeader>

                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs text-muted-foreground">
                      {t.accountCode}
                    </p>
                    <p className="mt-2 font-semibold" dir="ltr">
                      {account.code || "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs text-muted-foreground">
                      {t.accountName}
                    </p>
                    <p className="mt-2 font-semibold">{account.name || "-"}</p>
                  </div>

                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs text-muted-foreground">
                      {t.accountType}
                    </p>
                    <div className="mt-2">
                      {accountTypeBadge(account.account_type, locale)}
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs text-muted-foreground">
                      {t.accountStatus}
                    </p>
                    <div className="mt-2">
                      {accountStatusBadge(account.status, locale)}
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs text-muted-foreground">
                      {t.defaultAccount}
                    </p>
                    <p className="mt-2 font-semibold">
                      {account.is_default ? t.defaultAccount : t.regularAccount}
                    </p>
                  </div>

                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-xs text-muted-foreground">
                      {t.movementsCount}
                    </p>
                    <p className="mt-2 font-semibold">
                      {formatNumber(summary.rows_count)}
                    </p>
                  </div>

                  <div className="rounded-2xl border bg-background p-4 md:col-span-2 xl:col-span-3">
                    <p className="text-xs text-muted-foreground">{t.bankInfo}</p>
                    <p className="mt-2 font-semibold">
                      {account.bank_name || "-"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                      {account.account_number || "-"}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground" dir="ltr">
                      {account.iban || "-"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <BarChart3 className="h-4 w-4" />
                    {t.summaryTitle}
                  </CardTitle>
                  <CardDescription>{t.summaryDesc}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-3 py-2 text-sm">
                    <span>{t.confirmedCount}</span>
                    <span>{formatNumber(summary.confirmed_count)}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm">
                    <span>{t.receiptsTotal}</span>
                    <MoneyText value={summary.receipts_total} />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm">
                    <span>{t.paymentsTotal}</span>
                    <MoneyText value={summary.payments_total} />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm">
                    <span>{t.transfersTotal}</span>
                    <MoneyText value={summary.transfers_total} />
                  </div>

                  <div className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm">
                    <span>{t.movementsCount}</span>
                    <span>{formatNumber(summary.rows_count)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="space-y-4 pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-base font-bold">
                    {t.tableTitle}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {t.tableDesc}
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => loadStatement(true)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                    {t.refresh}
                  </Button>

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

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-10 rounded-xl">
                        <Filter className="h-4 w-4" />
                        {t.filters}
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align={isArabic ? "start" : "end"}
                      className="w-72 rounded-2xl"
                    >
                      <div dir={isArabic ? "rtl" : "ltr"}>
                        <DropdownMenuLabel>{t.allTypes}</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {typeOptions.map((item) => (
                          <DropdownMenuCheckboxItem
                            key={item.value}
                            checked={typeFilter === item.value}
                            onCheckedChange={() => setTypeFilter(item.value)}
                          >
                            {item.label} ({formatNumber(item.count)})
                          </DropdownMenuCheckboxItem>
                        ))}

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>{t.allStatuses}</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {statusOptions.map((item) => (
                          <DropdownMenuCheckboxItem
                            key={item.value}
                            checked={statusFilter === item.value}
                            onCheckedChange={() => setStatusFilter(item.value)}
                          >
                            {item.label} ({formatNumber(item.count)})
                          </DropdownMenuCheckboxItem>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-10 rounded-xl">
                        <Columns3 className="h-4 w-4" />
                        {t.columns}
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align={isArabic ? "start" : "end"}
                      className="w-64 rounded-2xl"
                    >
                      <div dir={isArabic ? "rtl" : "ltr"}>
                        <DropdownMenuLabel>{t.columns}</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {columnOptions.map((column) => {
                          if (column.key === "actions" && !canViewTransactions) {
                            return null;
                          }

                          return (
                            <DropdownMenuCheckboxItem
                              key={column.key}
                              checked={visibleColumns[column.key]}
                              onCheckedChange={(checked) =>
                                setVisibleColumns((current) => ({
                                  ...current,
                                  [column.key]: Boolean(checked),
                                }))
                              }
                            >
                              {column.label}
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {visibleColumns.date ? (
                          <TableHead className="min-w-[130px]">
                            <button
                              type="button"
                              onClick={() => toggleSort("date")}
                              className="inline-flex items-center gap-1 font-medium"
                            >
                              {t.table.date}
                              {sortKey === "date" &&
                                (sortDirection === "asc" ? (
                                  <ArrowUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ArrowDown className="h-3.5 w-3.5" />
                                ))}
                            </button>
                          </TableHead>
                        ) : null}

                        {visibleColumns.reference ? (
                          <TableHead className="min-w-[150px]">
                            <button
                              type="button"
                              onClick={() => toggleSort("reference")}
                              className="inline-flex items-center gap-1 font-medium"
                            >
                              {t.table.reference}
                              {sortKey === "reference" &&
                                (sortDirection === "asc" ? (
                                  <ArrowUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ArrowDown className="h-3.5 w-3.5" />
                                ))}
                            </button>
                          </TableHead>
                        ) : null}

                        {visibleColumns.type ? (
                          <TableHead className="min-w-[120px]">
                            {t.table.type}
                          </TableHead>
                        ) : null}

                        {visibleColumns.status ? (
                          <TableHead className="min-w-[120px]">
                            {t.table.status}
                          </TableHead>
                        ) : null}

                        {visibleColumns.debit ? (
                          <TableHead className="min-w-[140px]">
                            <button
                              type="button"
                              onClick={() => toggleSort("debit")}
                              className="inline-flex items-center gap-1 font-medium"
                            >
                              {t.table.debit}
                              {sortKey === "debit" &&
                                (sortDirection === "asc" ? (
                                  <ArrowUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ArrowDown className="h-3.5 w-3.5" />
                                ))}
                            </button>
                          </TableHead>
                        ) : null}

                        {visibleColumns.credit ? (
                          <TableHead className="min-w-[140px]">
                            <button
                              type="button"
                              onClick={() => toggleSort("credit")}
                              className="inline-flex items-center gap-1 font-medium"
                            >
                              {t.table.credit}
                              {sortKey === "credit" &&
                                (sortDirection === "asc" ? (
                                  <ArrowUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ArrowDown className="h-3.5 w-3.5" />
                                ))}
                            </button>
                          </TableHead>
                        ) : null}

                        {visibleColumns.balance ? (
                          <TableHead className="min-w-[140px]">
                            <button
                              type="button"
                              onClick={() => toggleSort("balance")}
                              className="inline-flex items-center gap-1 font-medium"
                            >
                              {t.table.balance}
                              {sortKey === "balance" &&
                                (sortDirection === "asc" ? (
                                  <ArrowUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ArrowDown className="h-3.5 w-3.5" />
                                ))}
                            </button>
                          </TableHead>
                        ) : null}

                        {visibleColumns.description ? (
                          <TableHead className="min-w-[220px]">
                            {t.table.description}
                          </TableHead>
                        ) : null}

                        {visibleColumns.actions && canViewTransactions ? (
                          <TableHead className="min-w-[100px]">
                            {t.table.action}
                          </TableHead>
                        ) : null}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {isLoading ? (
                        <TableSkeleton columnsCount={visibleColumnCount || 1} />
                      ) : paginatedRows.length > 0 ? (
                        paginatedRows.map((item) => (
                          <TableRow key={`${item.id}-${item.reference}`}>
                            {visibleColumns.date ? (
                              <TableCell className="whitespace-nowrap">
                                {formatDate(item.date, locale)}
                              </TableCell>
                            ) : null}

                            {visibleColumns.reference ? (
                              <TableCell className="font-semibold" dir="ltr">
                                {item.reference || "-"}
                              </TableCell>
                            ) : null}

                            {visibleColumns.type ? (
                              <TableCell>
                                {statementTypeBadge(item.type, locale)}
                              </TableCell>
                            ) : null}

                            {visibleColumns.status ? (
                              <TableCell>
                                {statementStatusBadge(item.status, locale)}
                              </TableCell>
                            ) : null}

                            {visibleColumns.debit ? (
                              <TableCell>
                                <MoneyText value={item.debit} />
                              </TableCell>
                            ) : null}

                            {visibleColumns.credit ? (
                              <TableCell>
                                <MoneyText value={item.credit} />
                              </TableCell>
                            ) : null}

                            {visibleColumns.balance ? (
                              <TableCell>
                                <MoneyText value={item.balance} />
                              </TableCell>
                            ) : null}

                            {visibleColumns.description ? (
                              <TableCell>
                                <span className="line-clamp-2 min-w-[200px] text-sm text-muted-foreground">
                                  {item.description || "-"}
                                </span>
                              </TableCell>
                            ) : null}

                            {visibleColumns.actions && canViewTransactions ? (
                              <TableCell>
                                {isValidId(item.transaction_id) ? (
                                  <Link
                                    href={`/system/treasury/transactions/${item.transaction_id}`}
                                  >
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 rounded-lg"
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span className="sr-only">{t.view}</span>
                                    </Button>
                                  </Link>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                            ) : null}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={visibleColumnCount || 1}
                            className="h-44 text-center"
                          >
                            <div className="flex flex-col items-center justify-center gap-2">
                              <CreditCard className="h-10 w-10 text-muted-foreground/40" />
                              <p className="font-semibold">
                                {hasSearchOrFilter
                                  ? t.noResultsTitle
                                  : t.emptyTitle}
                              </p>
                              <p className="max-w-md text-sm text-muted-foreground">
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

              <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {t.showing} {formatNumber(paginatedRows.length)} {t.from}{" "}
                  {formatNumber(filteredRows.length)}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={page <= 1 || isLoading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    {t.previous}
                  </Button>

                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {formatNumber(Math.min(page, totalPages))} /{" "}
                    {formatNumber(totalPages)}
                  </Badge>

                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={page >= totalPages || isLoading}
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                  >
                    {t.next}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}