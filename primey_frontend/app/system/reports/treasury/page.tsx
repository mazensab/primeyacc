"use client";

/* ============================================================
   📂 app/system/reports/treasury/page.tsx
   🧠 Primey Care | Treasury Reports Page

   ✅ المسار:
      app/system/reports/treasury/page.tsx

   ✅ العمل:
      صفحة تقرير الخزينة المركزية داخل وحدة التقارير.
      تعرض ملخص الخزينة والحركات المالية وسندات القبض والصرف والتحويلات بين الحسابات.

   ✅ الإصدار:
      Phase 17 UX Refinement + Central Reports Treasury Build

   ✅ يعتمد على:
      - /api/reports/treasury/
      - /api/treasury/transactions/ كـ fallback آمن عند عدم توفر تقرير مخصص
      - primey-locale
      - AuthProvider
      - sonner
      - /currency/sar.svg

   ✅ متوافق مع صفحات:
      - Centers approved UX pattern
      - Customers approved UX pattern
      - Central Reports module
      - Treasury module backend integration

   ✅ الوظائف:
      - عرض مؤشرات تقرير الخزينة.
      - تحليل حركات الخزينة حسب النوع والحالة والحساب.
      - دعم سندات القبض وسندات الصرف والتحويلات والتسويات.
      - عرض الصناديق والبنوك وحسابات الخزينة.
      - عرض المجاميع المالية: الداخل، الخارج، الصافي.
      - البحث في صف مستقل.
      - فلاتر نوع الحركة وحالة الحركة في صفوف منظمة.
      - جدول تحليلي للبيانات.
      - Excel export بصيغة .xls HTML Workbook.
      - Web PDF Print.
      - Skeleton Loading.
      - Error State مستقل.
      - Empty State ذكي.
      - إخفاء الإجراءات حسب الصلاحيات قدر الإمكان.

   ------------------------------------------------------------
   تحسينات هذا الإصدار:
      - بناء الملف من جديد كصفحة تقرير خزينة مركزية.
      - دعم مصطلحات الخزينة الحالية: سند قبض، سند صرف، تحويل، تسوية.
      - دعم حسابات الصندوق والبنك.
      - دعم fallback آمن للصلاحيات بدون كسر system_admin/superuser.
      - استخدام الرقم ثم رمز SAR عند عرض القيم المالية.
      - منع عرض أي مسارات تقنية أو عبارات API داخل واجهة المستخدم.
============================================================ */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpCircle,
  Banknote,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Landmark,
  Loader2,
  Printer,
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

type TreasuryTransactionType =
  | "RECEIPT"
  | "PAYMENT"
  | "TRANSFER"
  | "ADJUSTMENT"
  | "OPENING_BALANCE"
  | "UNKNOWN";

type TreasuryTransactionStatus =
  | "DRAFT"
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "REVERSED"
  | "UNKNOWN";

type TreasuryAccountType =
  | "CASHBOX"
  | "BANK"
  | "WALLET"
  | "OTHER"
  | "UNKNOWN";

type TypeFilter = "ALL" | TreasuryTransactionType;
type StatusFilter = "ALL" | TreasuryTransactionStatus;

type TreasuryReportRow = {
  id: string;
  reference: string;
  voucherNumber: string;
  type: TreasuryTransactionType;
  status: TreasuryTransactionStatus;
  accountId: string;
  accountName: string;
  accountType: TreasuryAccountType;
  sourceAccountName: string;
  targetAccountName: string;
  customerName: string;
  providerName: string;
  paymentNumber: string;
  invoiceNumber: string;
  orderNumber: string;
  description: string;
  amountIn: number;
  amountOut: number;
  amount: number;
  balanceAfter: number;
  isAccountingPosted: boolean;
  transactionDate: string;
  confirmedAt: string;
  cancelledAt: string;
  createdAt: string;
};

type TreasuryReportSummary = {
  total_transactions: number;
  receipt_transactions: number;
  payment_transactions: number;
  transfer_transactions: number;
  adjustment_transactions: number;
  confirmed_transactions: number;
  pending_transactions: number;
  cancelled_transactions: number;
  reversed_transactions: number;
  cashbox_transactions: number;
  bank_transactions: number;
  accounting_posted_transactions: number;
  total_in_amount: number;
  total_out_amount: number;
  net_amount: number;
  total_balance: number;
};

type TreasuryReportResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: {
    summary?: Partial<TreasuryReportSummary>;
    results?: unknown[];
    transactions?: unknown[];
    items?: unknown[];
    rows?: unknown[];
  };
  summary?: Partial<TreasuryReportSummary>;
  results?: unknown[];
  transactions?: unknown[];
  items?: unknown[];
  rows?: unknown[];
};

const SAR_ICON_PATH = "/currency/sar.svg";

const DEFAULT_SUMMARY: TreasuryReportSummary = {
  total_transactions: 0,
  receipt_transactions: 0,
  payment_transactions: 0,
  transfer_transactions: 0,
  adjustment_transactions: 0,
  confirmed_transactions: 0,
  pending_transactions: 0,
  cancelled_transactions: 0,
  reversed_transactions: 0,
  cashbox_transactions: 0,
  bank_transactions: 0,
  accounting_posted_transactions: 0,
  total_in_amount: 0,
  total_out_amount: 0,
  net_amount: 0,
  total_balance: 0,
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
          "support",
          "accountant",
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
    title: isArabic ? "تقارير الخزينة" : "Treasury Reports",
    subtitle: isArabic
      ? "تحليل حركات الخزينة وسندات القبض والصرف والتحويلات بين الصناديق والبنوك."
      : "Analyze treasury movements, receipt vouchers, payment vouchers, and transfers between cashboxes and banks.",

    back: isArabic ? "مركز التقارير" : "Reports Center",
    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    exportExcel: isArabic ? "تصدير Excel" : "Export Excel",
    print: isArabic ? "طباعة PDF" : "Print PDF",
    clearFilters: isArabic ? "مسح الفلاتر" : "Clear Filters",
    viewDetails: isArabic ? "عرض التفاصيل" : "View Details",

    searchPlaceholder: isArabic
      ? "ابحث برقم السند أو المرجع أو الحساب أو العميل أو الفاتورة أو الطلب..."
      : "Search by voucher number, reference, account, customer, invoice, or order...",

    all: isArabic ? "الكل" : "All",
    allTypes: isArabic ? "كل أنواع الحركات" : "All Transaction Types",
    allStatuses: isArabic ? "كل الحالات" : "All Statuses",

    totalTransactions: isArabic ? "إجمالي الحركات" : "Total Transactions",
    receiptTransactions: isArabic ? "سندات قبض" : "Receipt Vouchers",
    paymentTransactions: isArabic ? "سندات صرف" : "Payment Vouchers",
    transferTransactions: isArabic ? "تحويلات" : "Transfers",
    accountingPosted: isArabic ? "مرحلة للمحاسبة" : "Accounting Posted",

    totalInAmount: isArabic ? "إجمالي الداخل" : "Total In",
    totalOutAmount: isArabic ? "إجمالي الخارج" : "Total Out",
    netAmount: isArabic ? "الصافي" : "Net Amount",
    totalBalance: isArabic ? "إجمالي الأرصدة" : "Total Balance",

    receipt: isArabic ? "سند قبض" : "Receipt",
    payment: isArabic ? "سند صرف" : "Payment",
    transfer: isArabic ? "تحويل" : "Transfer",
    adjustment: isArabic ? "تسوية" : "Adjustment",
    openingBalance: isArabic ? "رصيد افتتاحي" : "Opening Balance",
    unknown: isArabic ? "غير محدد" : "Unknown",

    cashbox: isArabic ? "صندوق" : "Cashbox",
    bank: isArabic ? "بنك" : "Bank",
    wallet: isArabic ? "محفظة" : "Wallet",
    other: isArabic ? "أخرى" : "Other",

    draft: isArabic ? "مسودة" : "Draft",
    pending: isArabic ? "معلقة" : "Pending",
    confirmed: isArabic ? "مؤكدة" : "Confirmed",
    cancelled: isArabic ? "ملغاة" : "Cancelled",
    reversed: isArabic ? "معكوسة" : "Reversed",

    yes: isArabic ? "نعم" : "Yes",
    no: isArabic ? "لا" : "No",

    financialTitle: isArabic ? "المؤشرات المالية" : "Financial Indicators",
    financialDesc: isArabic
      ? "ملخص الداخل والخارج والصافي والأرصدة في الخزينة."
      : "Summary of incoming, outgoing, net amount, and treasury balances.",

    typeDistributionTitle: isArabic
      ? "توزيع أنواع الحركات"
      : "Transaction Type Distribution",
    typeDistributionDesc: isArabic
      ? "تحليل سريع لسندات القبض والصرف والتحويلات والتسويات."
      : "Quick analysis of receipt vouchers, payment vouchers, transfers, and adjustments.",

    statusDistributionTitle: isArabic
      ? "توزيع حالات الحركات"
      : "Transaction Status Distribution",
    statusDistributionDesc: isArabic
      ? "تحليل سريع لحالات حركات الخزينة."
      : "Quick analysis of treasury transaction statuses.",

    postingTitle: isArabic ? "حالة الترحيل المحاسبي" : "Accounting Posting Status",
    postingDesc: isArabic
      ? "متابعة الحركات المرحلة إلى المحاسبة من الخزينة."
      : "Track treasury movements posted to accounting.",

    tableTitle: isArabic ? "بيانات تقرير الخزينة" : "Treasury Report Data",
    tableDesc: isArabic
      ? "جدول تحليلي لحركات الخزينة حسب الفلاتر الحالية."
      : "Analytical treasury table based on current filters.",

    table: {
      transaction: isArabic ? "الحركة" : "Transaction",
      reference: isArabic ? "المرجع" : "Reference",
      voucher: isArabic ? "السند" : "Voucher",
      type: isArabic ? "النوع" : "Type",
      status: isArabic ? "الحالة" : "Status",
      account: isArabic ? "الحساب" : "Account",
      accountType: isArabic ? "نوع الحساب" : "Account Type",
      sourceAccount: isArabic ? "من حساب" : "From Account",
      targetAccount: isArabic ? "إلى حساب" : "To Account",
      customer: isArabic ? "العميل" : "Customer",
      provider: isArabic ? "المركز" : "Provider",
      payment: isArabic ? "الدفعة" : "Payment",
      invoice: isArabic ? "الفاتورة" : "Invoice",
      order: isArabic ? "الطلب" : "Order",
      amountIn: isArabic ? "داخل" : "In",
      amountOut: isArabic ? "خارج" : "Out",
      amount: isArabic ? "المبلغ" : "Amount",
      balanceAfter: isArabic ? "الرصيد بعد الحركة" : "Balance After",
      accountingPosted: isArabic ? "المحاسبة" : "Accounting",
      transactionDate: isArabic ? "تاريخ الحركة" : "Transaction Date",
      confirmedAt: isArabic ? "تاريخ التأكيد" : "Confirmed At",
      createdAt: isArabic ? "تاريخ الإنشاء" : "Created At",
      action: isArabic ? "الإجراء" : "Action",
    },

    emptyTitle: isArabic ? "لا توجد بيانات خزينة" : "No treasury data",
    emptyText: isArabic
      ? "ستظهر بيانات تقرير الخزينة هنا عند توفر حركات مالية."
      : "Treasury report data will appear here when financial movements are available.",
    noResultsTitle: isArabic ? "لا توجد نتائج مطابقة" : "No matching results",
    noResultsText: isArabic
      ? "جرّب تغيير كلمات البحث أو فلاتر النوع والحالة."
      : "Try changing search keywords, type, or status filters.",

    accessDeniedTitle: isArabic ? "غير مصرح بعرض التقرير" : "Access denied",
    accessDeniedText: isArabic
      ? "لا تملك صلاحية عرض تقارير الخزينة. تواصل مع مسؤول النظام إذا كنت تحتاج الوصول."
      : "You do not have permission to view treasury reports. Contact your system administrator if you need access.",

    apiError: isArabic
      ? "تعذر تحميل تقرير الخزينة."
      : "Unable to load treasury report.",
    apiErrorHint: isArabic
      ? "تحقق من الاتصال أو الصلاحيات ثم أعد المحاولة."
      : "Check the connection or permissions, then try again.",
    refreshSuccess: isArabic
      ? "تم تحديث تقرير الخزينة بنجاح."
      : "Treasury report refreshed successfully.",
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
    filterType: isArabic ? "فلتر نوع الحركة" : "Transaction Type Filter",
    filterStatus: isArabic ? "فلتر الحالة" : "Status Filter",
    printedAt: isArabic ? "تاريخ الطباعة" : "Printed At",
    rowsCount: isArabic ? "عدد السجلات" : "Rows Count",
    printTitle: isArabic ? "تقرير الخزينة" : "Treasury Report",
  };
}

/* ============================================================
   Normalizers
============================================================ */

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;

  const clean = String(value || "").toLowerCase();

  return ["true", "1", "yes", "posted", "confirmed"].includes(clean);
}

function normalizeTransactionType(value: unknown): TreasuryTransactionType {
  const type = String(value || "").toUpperCase();

  if (["RECEIPT", "IN", "INFLOW", "CASH_IN", "COLLECTION"].includes(type)) {
    return "RECEIPT";
  }

  if (["PAYMENT", "OUT", "OUTFLOW", "CASH_OUT", "DISBURSEMENT"].includes(type)) {
    return "PAYMENT";
  }

  if (["TRANSFER", "MOVE", "ACCOUNT_TRANSFER"].includes(type)) {
    return "TRANSFER";
  }

  if (["ADJUSTMENT", "SETTLEMENT"].includes(type)) {
    return "ADJUSTMENT";
  }

  if (["OPENING_BALANCE", "OPENING"].includes(type)) {
    return "OPENING_BALANCE";
  }

  return "UNKNOWN";
}

function normalizeTransactionStatus(value: unknown): TreasuryTransactionStatus {
  const status = String(value || "").toUpperCase();

  if (status === "DRAFT") return "DRAFT";
  if (status === "PENDING") return "PENDING";
  if (status === "CONFIRMED" || status === "POSTED") return "CONFIRMED";
  if (status === "CANCELLED" || status === "CANCELED") return "CANCELLED";
  if (status === "REVERSED") return "REVERSED";

  return "UNKNOWN";
}

function normalizeAccountType(value: unknown): TreasuryAccountType {
  const type = String(value || "").toUpperCase();

  if (["CASHBOX", "CASH", "BOX"].includes(type)) return "CASHBOX";
  if (["BANK", "BANK_ACCOUNT"].includes(type)) return "BANK";
  if (["WALLET"].includes(type)) return "WALLET";
  if (["OTHER"].includes(type)) return "OTHER";

  return "UNKNOWN";
}

function getValue(obj: Dict, key: string): unknown {
  const direct = obj[key];

  if (direct !== undefined && direct !== null && direct !== "") {
    return direct;
  }

  for (const container of [
    "transaction",
    "movement",
    "treasury_transaction",
    "account",
    "source_account",
    "target_account",
    "payment",
    "invoice",
    "order",
    "customer",
    "provider",
    "center",
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

function extractRows(payload: TreasuryReportResponse | null): unknown[] {
  if (!payload) return [];

  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.transactions)) return payload.transactions;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;

  if (Array.isArray(payload.data?.results)) return payload.data.results;
  if (Array.isArray(payload.data?.transactions)) return payload.data.transactions;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  if (Array.isArray(payload.data?.rows)) return payload.data.rows;

  return [];
}

function extractSummary(
  payload: TreasuryReportResponse | null,
): Partial<TreasuryReportSummary> {
  return payload?.data?.summary || payload?.summary || {};
}

function normalizeTreasuryRow(item: unknown): TreasuryReportRow {
  const obj = asDict(item);

  const account = asDict(obj.account);
  const sourceAccount = asDict(obj.source_account);
  const targetAccount = asDict(obj.target_account);
  const payment = asDict(obj.payment);
  const invoice = asDict(obj.invoice || payment.invoice);
  const order = asDict(obj.order || invoice.order);
  const customer = asDict(obj.customer || invoice.customer || order.customer);
  const provider = asDict(obj.provider || obj.center || order.provider || order.center);

  const type = normalizeTransactionType(
    getValue(obj, "transaction_type") || getValue(obj, "type") || getValue(obj, "direction"),
  );

  const amount = toNumber(
    getValue(obj, "amount") ||
      getValue(obj, "transaction_amount") ||
      getValue(obj, "value") ||
      0,
  );

  const explicitIn = getValue(obj, "amount_in");
  const explicitOut = getValue(obj, "amount_out");

  const amountIn =
    explicitIn !== undefined
      ? toNumber(explicitIn)
      : type === "RECEIPT" || type === "OPENING_BALANCE"
        ? amount
        : 0;

  const amountOut =
    explicitOut !== undefined
      ? toNumber(explicitOut)
      : type === "PAYMENT"
        ? amount
        : 0;

  return {
    id: String(getValue(obj, "id") || ""),
    reference: String(
      getValue(obj, "reference") ||
        getValue(obj, "transaction_reference") ||
        getValue(obj, "external_reference") ||
        "",
    ),
    voucherNumber: String(
      getValue(obj, "voucher_number") ||
        getValue(obj, "movement_number") ||
        getValue(obj, "number") ||
        getValue(obj, "reference") ||
        getValue(obj, "id") ||
        "-",
    ),
    type,
    status: normalizeTransactionStatus(getValue(obj, "status")),
    accountId: String(account.id || getValue(obj, "account_id") || ""),
    accountName: String(
      getValue(obj, "account_name") ||
        account.name ||
        sourceAccount.name ||
        targetAccount.name ||
        "-",
    ),
    accountType: normalizeAccountType(
      getValue(obj, "account_type") || account.type || account.account_type,
    ),
    sourceAccountName: String(
      sourceAccount.name || getValue(obj, "source_account_name") || "",
    ),
    targetAccountName: String(
      targetAccount.name || getValue(obj, "target_account_name") || "",
    ),
    customerName: String(
      getValue(obj, "customer_name") ||
        customer.full_name ||
        customer.name ||
        "",
    ),
    providerName: String(
      getValue(obj, "provider_name") ||
        getValue(obj, "center_name") ||
        provider.name ||
        "",
    ),
    paymentNumber: String(
      payment.payment_number ||
        payment.number ||
        getValue(obj, "payment_number") ||
        "",
    ),
    invoiceNumber: String(
      invoice.invoice_number ||
        invoice.number ||
        getValue(obj, "invoice_number") ||
        "",
    ),
    orderNumber: String(
      order.order_number ||
        order.number ||
        order.reference ||
        getValue(obj, "order_number") ||
        "",
    ),
    description: String(
      getValue(obj, "description") ||
        getValue(obj, "notes") ||
        getValue(obj, "memo") ||
        "",
    ),
    amountIn,
    amountOut,
    amount,
    balanceAfter: toNumber(
      getValue(obj, "balance_after") ||
        getValue(obj, "running_balance") ||
        getValue(obj, "current_balance") ||
        0,
    ),
    isAccountingPosted: toBoolean(
      getValue(obj, "is_accounting_posted") ||
        getValue(obj, "accounting_posted"),
    ),
    transactionDate: String(
      getValue(obj, "transaction_date") ||
        getValue(obj, "movement_date") ||
        getValue(obj, "date") ||
        "",
    ),
    confirmedAt: String(getValue(obj, "confirmed_at") || ""),
    cancelledAt: String(
      getValue(obj, "cancelled_at") || getValue(obj, "canceled_at") || "",
    ),
    createdAt: String(getValue(obj, "created_at") || ""),
  };
}

function normalizeSummary(
  rows: TreasuryReportRow[],
  summary?: Partial<TreasuryReportSummary>,
): TreasuryReportSummary {
  const fallback: TreasuryReportSummary = {
    total_transactions: rows.length,
    receipt_transactions: rows.filter((item) => item.type === "RECEIPT").length,
    payment_transactions: rows.filter((item) => item.type === "PAYMENT").length,
    transfer_transactions: rows.filter((item) => item.type === "TRANSFER").length,
    adjustment_transactions: rows.filter((item) => item.type === "ADJUSTMENT").length,
    confirmed_transactions: rows.filter((item) => item.status === "CONFIRMED").length,
    pending_transactions: rows.filter((item) => item.status === "PENDING").length,
    cancelled_transactions: rows.filter((item) => item.status === "CANCELLED").length,
    reversed_transactions: rows.filter((item) => item.status === "REVERSED").length,
    cashbox_transactions: rows.filter((item) => item.accountType === "CASHBOX").length,
    bank_transactions: rows.filter((item) => item.accountType === "BANK").length,
    accounting_posted_transactions: rows.filter((item) => item.isAccountingPosted).length,
    total_in_amount: rows.reduce((sum, item) => sum + item.amountIn, 0),
    total_out_amount: rows.reduce((sum, item) => sum + item.amountOut, 0),
    net_amount: rows.reduce((sum, item) => sum + item.amountIn - item.amountOut, 0),
    total_balance: rows.reduce((max, item) => Math.max(max, item.balanceAfter), 0),
  };

  return {
    total_transactions: toNumber(summary?.total_transactions ?? fallback.total_transactions),
    receipt_transactions: toNumber(
      summary?.receipt_transactions ?? fallback.receipt_transactions,
    ),
    payment_transactions: toNumber(
      summary?.payment_transactions ?? fallback.payment_transactions,
    ),
    transfer_transactions: toNumber(
      summary?.transfer_transactions ?? fallback.transfer_transactions,
    ),
    adjustment_transactions: toNumber(
      summary?.adjustment_transactions ?? fallback.adjustment_transactions,
    ),
    confirmed_transactions: toNumber(
      summary?.confirmed_transactions ?? fallback.confirmed_transactions,
    ),
    pending_transactions: toNumber(
      summary?.pending_transactions ?? fallback.pending_transactions,
    ),
    cancelled_transactions: toNumber(
      summary?.cancelled_transactions ?? fallback.cancelled_transactions,
    ),
    reversed_transactions: toNumber(
      summary?.reversed_transactions ?? fallback.reversed_transactions,
    ),
    cashbox_transactions: toNumber(
      summary?.cashbox_transactions ?? fallback.cashbox_transactions,
    ),
    bank_transactions: toNumber(summary?.bank_transactions ?? fallback.bank_transactions),
    accounting_posted_transactions: toNumber(
      summary?.accounting_posted_transactions ??
        fallback.accounting_posted_transactions,
    ),
    total_in_amount: toNumber(summary?.total_in_amount ?? fallback.total_in_amount),
    total_out_amount: toNumber(
      summary?.total_out_amount ?? fallback.total_out_amount,
    ),
    net_amount: toNumber(summary?.net_amount ?? fallback.net_amount),
    total_balance: toNumber(summary?.total_balance ?? fallback.total_balance),
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

function transactionTypeLabel(type: TreasuryTransactionType, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<TreasuryTransactionType, string> = {
    RECEIPT: t.receipt,
    PAYMENT: t.payment,
    TRANSFER: t.transfer,
    ADJUSTMENT: t.adjustment,
    OPENING_BALANCE: t.openingBalance,
    UNKNOWN: t.unknown,
  };

  return labels[type];
}

function statusLabel(status: TreasuryTransactionStatus, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<TreasuryTransactionStatus, string> = {
    DRAFT: t.draft,
    PENDING: t.pending,
    CONFIRMED: t.confirmed,
    CANCELLED: t.cancelled,
    REVERSED: t.reversed,
    UNKNOWN: t.unknown,
  };

  return labels[status];
}

function accountTypeLabel(type: TreasuryAccountType, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<TreasuryAccountType, string> = {
    CASHBOX: t.cashbox,
    BANK: t.bank,
    WALLET: t.wallet,
    OTHER: t.other,
    UNKNOWN: t.unknown,
  };

  return labels[type];
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

function typeBadge(type: TreasuryTransactionType, locale: AppLocale) {
  const label = transactionTypeLabel(type, locale);

  if (type === "RECEIPT") {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        {label}
      </Badge>
    );
  }

  if (type === "PAYMENT") {
    return (
      <Badge className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
        {label}
      </Badge>
    );
  }

  if (type === "TRANSFER") {
    return (
      <Badge className="rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
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

function statusBadge(status: TreasuryTransactionStatus, locale: AppLocale) {
  const label = statusLabel(status, locale);

  if (status === "CONFIRMED") {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        {label}
      </Badge>
    );
  }

  if (status === "PENDING" || status === "DRAFT") {
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

function postedBadge(value: boolean, locale: AppLocale) {
  const t = dictionary(locale);

  if (value) {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        {t.yes}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="rounded-full px-3 py-1">
      {t.no}
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
  rows: TreasuryReportRow[];
  summary: TreasuryReportSummary;
  t: ReturnType<typeof dictionary>;
}) {
  const isArabic = locale === "ar";
  const now = new Date().toLocaleString("en-US");

  const tableRows = rows
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.voucherNumber || "-")}</td>
          <td>${escapeHtml(transactionTypeLabel(item.type, locale))}</td>
          <td>${escapeHtml(statusLabel(item.status, locale))}</td>
          <td>${escapeHtml(item.accountName || "-")}</td>
          <td>${escapeHtml(formatMoney(item.amountIn))}</td>
          <td>${escapeHtml(formatMoney(item.amountOut))}</td>
          <td>${escapeHtml(formatMoney(item.balanceAfter))}</td>
          <td>${escapeHtml(item.isAccountingPosted ? t.yes : t.no)}</td>
          <td>${escapeHtml(formatDate(item.transactionDate || item.createdAt))}</td>
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
          <div class="summary-card"><span>${escapeHtml(t.totalTransactions)}</span><strong>${formatNumber(summary.total_transactions)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.receiptTransactions)}</span><strong>${formatNumber(summary.receipt_transactions)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.paymentTransactions)}</span><strong>${formatNumber(summary.payment_transactions)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.netAmount)}</span><strong>${formatMoney(summary.net_amount)}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${escapeHtml(t.table.voucher)}</th>
              <th>${escapeHtml(t.table.type)}</th>
              <th>${escapeHtml(t.table.status)}</th>
              <th>${escapeHtml(t.table.account)}</th>
              <th>${escapeHtml(t.table.amountIn)}</th>
              <th>${escapeHtml(t.table.amountOut)}</th>
              <th>${escapeHtml(t.table.balanceAfter)}</th>
              <th>${escapeHtml(t.table.accountingPosted)}</th>
              <th>${escapeHtml(t.table.transactionDate)}</th>
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

export default function SystemTreasuryReportsPage() {
  const auth = useAuth() as unknown;

  const [locale, setLocale] = useState<AppLocale>("ar");
  const [rows, setRows] = useState<TreasuryReportRow[]>([]);
  const [summary, setSummary] =
    useState<TreasuryReportSummary>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const t = useMemo(() => dictionary(locale), [locale]);
  const isArabic = locale === "ar";
  const authResolving = isAuthResolving(auth);

  const canViewReport = hasSafePermission(
    auth,
    ["reports.view", "reports.treasury.view", "treasury.view", "treasury.reports"],
    "view",
  );

  const canViewTreasuryDetails = hasSafePermission(
    auth,
    ["treasury.view", "treasury.transactions.view", "treasury.detail"],
    "view",
  );

  const canExportReport = hasSafePermission(
    auth,
    ["reports.export", "reports.treasury.export", "treasury.export"],
    "action",
  );

  const canPrintReport = hasSafePermission(
    auth,
    ["reports.print", "reports.treasury.print"],
    "action",
  );

  const filteredRows = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return rows.filter((item) => {
      const matchesType =
        typeFilter === "ALL" ? true : item.type === typeFilter;

      const matchesStatus =
        statusFilter === "ALL" ? true : item.status === statusFilter;

      const matchesQuery = !cleanQuery
        ? true
        : [
            item.reference,
            item.voucherNumber,
            item.accountName,
            item.sourceAccountName,
            item.targetAccountName,
            item.customerName,
            item.providerName,
            item.paymentNumber,
            item.invoiceNumber,
            item.orderNumber,
            item.description,
            transactionTypeLabel(item.type, locale),
            statusLabel(item.status, locale),
            accountTypeLabel(item.accountType, locale),
          ]
            .join(" ")
            .toLowerCase()
            .includes(cleanQuery);

      return matchesType && matchesStatus && matchesQuery;
    });
  }, [locale, query, rows, statusFilter, typeFilter]);

  const filteredSummary = useMemo(
    () => normalizeSummary(filteredRows),
    [filteredRows],
  );

  const hasSearchOrFilter =
    query.trim().length > 0 || typeFilter !== "ALL" || statusFilter !== "ALL";

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
        value: "OPENING_BALANCE" as TypeFilter,
        label: t.openingBalance,
        count: rows.filter((item) => item.type === "OPENING_BALANCE").length,
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
        value: "PENDING" as StatusFilter,
        label: t.pending,
        count: rows.filter((item) => item.status === "PENDING").length,
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
      {
        value: "REVERSED" as StatusFilter,
        label: t.reversed,
        count: rows.filter((item) => item.status === "REVERSED").length,
      },
    ],
    [rows, t],
  );

  const summaryCards = useMemo(
    () => [
      {
        title: t.totalTransactions,
        value: summary.total_transactions,
        icon: Wallet,
        helper: t.confirmed,
        helperValue: formatNumber(summary.confirmed_transactions),
        percent: summary.total_transactions > 0 ? 100 : 0,
        isMoney: false,
      },
      {
        title: t.receiptTransactions,
        value: summary.receipt_transactions,
        icon: ArrowDownCircle,
        helper: t.totalInAmount,
        helperValue: formatMoney(summary.total_in_amount),
        percent: percent(summary.receipt_transactions, summary.total_transactions),
        isMoney: false,
      },
      {
        title: t.paymentTransactions,
        value: summary.payment_transactions,
        icon: ArrowUpCircle,
        helper: t.totalOutAmount,
        helperValue: formatMoney(summary.total_out_amount),
        percent: percent(summary.payment_transactions, summary.total_transactions),
        isMoney: false,
      },
      {
        title: t.netAmount,
        value: summary.net_amount,
        icon: Banknote,
        helper: t.totalBalance,
        helperValue: formatMoney(summary.total_balance),
        percent: summary.total_transactions > 0 ? 100 : 0,
        isMoney: true,
      },
    ],
    [summary, t],
  );

  const typeCards = useMemo(
    () => [
      {
        title: t.receipt,
        value: summary.receipt_transactions,
        icon: ArrowDownCircle,
        filter: "RECEIPT" as TypeFilter,
        percent: percent(summary.receipt_transactions, summary.total_transactions),
      },
      {
        title: t.payment,
        value: summary.payment_transactions,
        icon: ArrowUpCircle,
        filter: "PAYMENT" as TypeFilter,
        percent: percent(summary.payment_transactions, summary.total_transactions),
      },
      {
        title: t.transfer,
        value: summary.transfer_transactions,
        icon: ArrowRightLeft,
        filter: "TRANSFER" as TypeFilter,
        percent: percent(summary.transfer_transactions, summary.total_transactions),
      },
      {
        title: t.adjustment,
        value: summary.adjustment_transactions,
        icon: ShieldCheck,
        filter: "ADJUSTMENT" as TypeFilter,
        percent: percent(summary.adjustment_transactions, summary.total_transactions),
      },
    ],
    [summary, t],
  );

  const statusCards = useMemo(
    () => [
      {
        title: t.pending,
        value: summary.pending_transactions,
        icon: Wallet,
        filter: "PENDING" as StatusFilter,
        percent: percent(summary.pending_transactions, summary.total_transactions),
      },
      {
        title: t.confirmed,
        value: summary.confirmed_transactions,
        icon: CheckCircle2,
        filter: "CONFIRMED" as StatusFilter,
        percent: percent(summary.confirmed_transactions, summary.total_transactions),
      },
      {
        title: t.cancelled,
        value: summary.cancelled_transactions,
        icon: XCircle,
        filter: "CANCELLED" as StatusFilter,
        percent: percent(summary.cancelled_transactions, summary.total_transactions),
      },
      {
        title: t.reversed,
        value: summary.reversed_transactions,
        icon: XCircle,
        filter: "REVERSED" as StatusFilter,
        percent: percent(summary.reversed_transactions, summary.total_transactions),
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
          "/api/reports/treasury/",
          "/api/treasury/transactions/?page_size=300",
          "/api/treasury/transactions/",
        ];

        let loadedPayload: TreasuryReportResponse | null = null;
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
            | TreasuryReportResponse
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
            loadedPayload?.message || "Unable to load treasury report",
          );
        }

        const normalizedRows = extractRows(loadedPayload).map(normalizeTreasuryRow);

        setRows(normalizedRows);
        setSummary(
          normalizeSummary(normalizedRows, extractSummary(loadedPayload)),
        );

        if (showToast) {
          toast.success(t.refreshSuccess);
        }
      } catch (error) {
        console.error("Treasury report load error:", error);
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
    setTypeFilter("ALL");
    setStatusFilter("ALL");
  }

  function exportExcel() {
    if (!canExportReport) return;

    if (filteredRows.length === 0) {
      toast.error(t.exportEmpty);
      return;
    }

    const generatedAt = new Date();

    const typeFilterLabel =
      typeOptions.find((item) => item.value === typeFilter)?.label || t.all;

    const statusFilterLabel =
      statusOptions.find((item) => item.value === statusFilter)?.label || t.all;

    downloadExcel({
      filename: `primey-care-treasury-report-${generatedAt
        .toISOString()
        .slice(0, 10)}.xls`,
      worksheetName: isArabic ? "تقرير الخزينة" : "Treasury Report",
      title: t.title,
      locale,
      summaryRows: [
        [t.generatedAt, generatedAt.toLocaleString("en-US")],
        [t.reportScope, t.currentFilteredData],
        [t.totalTransactions, filteredSummary.total_transactions],
        [t.receiptTransactions, filteredSummary.receipt_transactions],
        [t.paymentTransactions, filteredSummary.payment_transactions],
        [t.transferTransactions, filteredSummary.transfer_transactions],
        [t.accountingPosted, filteredSummary.accounting_posted_transactions],
        [t.totalInAmount, formatMoney(filteredSummary.total_in_amount)],
        [t.totalOutAmount, formatMoney(filteredSummary.total_out_amount)],
        [t.netAmount, formatMoney(filteredSummary.net_amount)],
        [t.totalBalance, formatMoney(filteredSummary.total_balance)],
      ],
      filterRows: [
        [t.filterSearch, query || t.all],
        [t.filterType, typeFilterLabel],
        [t.filterStatus, statusFilterLabel],
      ],
      headers: [
        "ID",
        t.table.voucher,
        t.table.reference,
        t.table.type,
        t.table.status,
        t.table.account,
        t.table.accountType,
        t.table.sourceAccount,
        t.table.targetAccount,
        t.table.customer,
        t.table.provider,
        t.table.payment,
        t.table.invoice,
        t.table.order,
        t.table.amountIn,
        t.table.amountOut,
        t.table.amount,
        t.table.balanceAfter,
        t.table.accountingPosted,
        t.table.transactionDate,
        t.table.confirmedAt,
        t.table.createdAt,
      ],
      rows: filteredRows.map((item) => [
        item.id || "-",
        item.voucherNumber || "-",
        item.reference || "-",
        transactionTypeLabel(item.type, locale),
        statusLabel(item.status, locale),
        item.accountName || "-",
        accountTypeLabel(item.accountType, locale),
        item.sourceAccountName || "-",
        item.targetAccountName || "-",
        item.customerName || "-",
        item.providerName || "-",
        item.paymentNumber || "-",
        item.invoiceNumber || "-",
        item.orderNumber || "-",
        formatMoney(item.amountIn),
        formatMoney(item.amountOut),
        formatMoney(item.amount),
        formatMoney(item.balanceAfter),
        item.isAccountingPosted ? t.yes : t.no,
        formatDate(item.transactionDate),
        formatDate(item.confirmedAt),
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
                <p className="text-xs text-muted-foreground">
                  {t.totalInAmount}
                </p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.total_in_amount} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.totalOutAmount}
                </p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.total_out_amount} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.netAmount}</p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.net_amount} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.totalBalance}
                </p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.total_balance} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">
                {t.typeDistributionTitle}
              </CardTitle>
              <CardDescription>{t.typeDistributionDesc}</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {typeCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <button
                      key={card.filter}
                      type="button"
                      className="space-y-2 rounded-xl border bg-background/70 p-3 text-start transition hover:bg-muted/40"
                      onClick={() => setTypeFilter(card.filter)}
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
                {t.postingTitle}
              </CardTitle>
              <CardDescription>{t.postingDesc}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.accountingPosted}
                </p>
                <div className="mt-2 text-2xl font-bold">
                  {formatNumber(summary.accounting_posted_transactions)}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${percent(
                        summary.accounting_posted_transactions,
                        summary.total_transactions,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.cashbox}</p>
                <div className="mt-2 flex items-center gap-2 text-2xl font-bold">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                  {formatNumber(summary.cashbox_transactions)}
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.bank}</p>
                <div className="mt-2 flex items-center gap-2 text-2xl font-bold">
                  <Landmark className="h-5 w-5 text-muted-foreground" />
                  {formatNumber(summary.bank_transactions)}
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
                  {typeOptions.map((item) => {
                    const isSelected = typeFilter === item.value;

                    return (
                      <Button
                        key={item.value}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className="h-10 rounded-xl"
                        onClick={() => setTypeFilter(item.value)}
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
                        <TableHead>{t.table.transaction}</TableHead>
                        <TableHead>{t.table.type}</TableHead>
                        <TableHead>{t.table.status}</TableHead>
                        <TableHead>{t.table.account}</TableHead>
                        <TableHead>{t.table.accountType}</TableHead>
                        <TableHead>{t.table.amountIn}</TableHead>
                        <TableHead>{t.table.amountOut}</TableHead>
                        <TableHead>{t.table.balanceAfter}</TableHead>
                        <TableHead>{t.table.invoice}</TableHead>
                        <TableHead>{t.table.order}</TableHead>
                        <TableHead>{t.table.accountingPosted}</TableHead>
                        <TableHead>{t.table.transactionDate}</TableHead>
                        {canViewTreasuryDetails ? (
                          <TableHead>{t.table.action}</TableHead>
                        ) : null}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {isLoading ? (
                        <TableRowsSkeleton
                          columnsCount={canViewTreasuryDetails ? 13 : 12}
                        />
                      ) : filteredRows.length > 0 ? (
                        filteredRows.map((item) => (
                          <TableRow key={`${item.id}-${item.voucherNumber}`}>
                            <TableCell>
                              <div className="flex min-w-[220px] items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                                  <Wallet className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-medium">
                                    {item.voucherNumber || "-"}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {item.reference || item.description || "-"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>{typeBadge(item.type, locale)}</TableCell>

                            <TableCell>
                              {statusBadge(item.status, locale)}
                            </TableCell>

                            <TableCell>
                              <span className="min-w-[160px] whitespace-nowrap">
                                {item.accountName || "-"}
                              </span>
                            </TableCell>

                            <TableCell>
                              <Badge variant="secondary" className="rounded-full px-3 py-1">
                                {accountTypeLabel(item.accountType, locale)}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <MoneyText value={item.amountIn} />
                            </TableCell>

                            <TableCell>
                              <MoneyText value={item.amountOut} />
                            </TableCell>

                            <TableCell>
                              <MoneyText value={item.balanceAfter} />
                            </TableCell>

                            <TableCell>
                              <span className="whitespace-nowrap">
                                {item.invoiceNumber || "-"}
                              </span>
                            </TableCell>

                            <TableCell>
                              <span className="whitespace-nowrap">
                                {item.orderNumber || "-"}
                              </span>
                            </TableCell>

                            <TableCell>
                              {postedBadge(item.isAccountingPosted, locale)}
                            </TableCell>

                            <TableCell>
                              <span className="whitespace-nowrap">
                                {formatDate(item.transactionDate || item.createdAt)}
                              </span>
                            </TableCell>

                            {canViewTreasuryDetails ? (
                              <TableCell>
                                {isValidId(item.id) ? (
                                  <Link href={`/system/treasury/transactions/${item.id}`}>
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
                            colSpan={canViewTreasuryDetails ? 13 : 12}
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