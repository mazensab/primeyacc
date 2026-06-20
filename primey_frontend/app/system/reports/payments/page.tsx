"use client";

/* ============================================================
   📂 app/system/reports/payments/page.tsx
   🧠 Primey Care | Payments Reports Page

   ✅ المسار:
      app/system/reports/payments/page.tsx

   ✅ العمل:
      صفحة تقرير المدفوعات المركزية داخل وحدة التقارير.
      تعرض ملخص المدفوعات وجدولًا تحليليًا قابلًا للبحث والتصفية والتصدير والطباعة.

   ✅ الإصدار:
      Phase 17 UX Refinement + Central Reports Payments Review

   ✅ يعتمد على:
      - /api/reports/payments/
      - /api/payments/ كـ fallback آمن عند عدم توفر تقرير مخصص
      - primey-locale
      - AuthProvider
      - sonner
      - /currency/sar.svg

   ✅ متوافق مع صفحات:
      - Centers approved UX pattern
      - Customers approved UX pattern
      - Central Reports module

   ✅ الوظائف:
      - عرض مؤشرات تقرير المدفوعات.
      - تحليل المدفوعات حسب الحالة وطريقة الدفع.
      - عرض القيم المالية: الإجمالي، المؤكد، المعلق، المسترد، الرسوم، والصافي.
      - عرض حالة الترحيل للخزينة والمحاسبة.
      - البحث في صف مستقل.
      - فلاتر حالة الدفع وطريقة الدفع في صفوف منظمة.
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
      - دعم fallback آمن للصلاحيات بدون كسر system_admin/superuser.
      - استخدام الرقم ثم رمز SAR عند عرض القيم المالية.
      - دعم طرق الدفع: Cash / Bank Transfer / Gateway / Card / Wallet / Tamara / Tabby.
      - منع عرض أي مسارات تقنية أو عبارات API داخل واجهة المستخدم.
============================================================ */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  FileText,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
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

type PaymentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "FAILED"
  | "REFUNDED"
  | "UNKNOWN";

type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "GATEWAY"
  | "CARD"
  | "WALLET"
  | "TAMARA"
  | "TABBY"
  | "OTHER"
  | "UNKNOWN";

type StatusFilter = "ALL" | PaymentStatus;
type MethodFilter = "ALL" | PaymentMethod;

type PaymentReportRow = {
  id: string;
  paymentNumber: string;
  reference: string;
  gatewayReference: string;
  invoiceId: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  providerName: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  feeAmount: number;
  netAmount: number;
  refundedAmount: number;
  isTreasuryPosted: boolean;
  isAccountingPosted: boolean;
  paidAt: string;
  confirmedAt: string;
  cancelledAt: string;
  createdAt: string;
};

type PaymentsReportSummary = {
  total_payments: number;
  pending_payments: number;
  confirmed_payments: number;
  cancelled_payments: number;
  failed_payments: number;
  refunded_payments: number;
  cash_payments: number;
  bank_transfer_payments: number;
  gateway_payments: number;
  card_payments: number;
  wallet_payments: number;
  tamara_payments: number;
  tabby_payments: number;
  treasury_posted_payments: number;
  accounting_posted_payments: number;
  total_amount: number;
  confirmed_amount: number;
  pending_amount: number;
  refunded_amount: number;
  fees_amount: number;
  net_amount: number;
};

type PaymentsReportResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: {
    summary?: Partial<PaymentsReportSummary>;
    results?: unknown[];
    payments?: unknown[];
    items?: unknown[];
    rows?: unknown[];
  };
  summary?: Partial<PaymentsReportSummary>;
  results?: unknown[];
  payments?: unknown[];
  items?: unknown[];
  rows?: unknown[];
};

const SAR_ICON_PATH = "/currency/sar.svg";

const DEFAULT_SUMMARY: PaymentsReportSummary = {
  total_payments: 0,
  pending_payments: 0,
  confirmed_payments: 0,
  cancelled_payments: 0,
  failed_payments: 0,
  refunded_payments: 0,
  cash_payments: 0,
  bank_transfer_payments: 0,
  gateway_payments: 0,
  card_payments: 0,
  wallet_payments: 0,
  tamara_payments: 0,
  tabby_payments: 0,
  treasury_posted_payments: 0,
  accounting_posted_payments: 0,
  total_amount: 0,
  confirmed_amount: 0,
  pending_amount: 0,
  refunded_amount: 0,
  fees_amount: 0,
  net_amount: 0,
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
    title: isArabic ? "تقارير المدفوعات" : "Payments Reports",
    subtitle: isArabic
      ? "تحليل المدفوعات حسب الحالة والطريقة والترحيل للخزينة والمحاسبة والربط بالفواتير والطلبات."
      : "Analyze payments by status, method, treasury posting, accounting posting, invoices, and orders.",

    back: isArabic ? "مركز التقارير" : "Reports Center",
    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    exportExcel: isArabic ? "تصدير Excel" : "Export Excel",
    print: isArabic ? "طباعة PDF" : "Print PDF",
    clearFilters: isArabic ? "مسح الفلاتر" : "Clear Filters",
    viewDetails: isArabic ? "عرض التفاصيل" : "View Details",

    searchPlaceholder: isArabic
      ? "ابحث برقم الدفعة أو العميل أو الفاتورة أو الطلب أو المرجع..."
      : "Search by payment number, customer, invoice, order, or reference...",

    all: isArabic ? "الكل" : "All",
    allStatuses: isArabic ? "كل حالات الدفع" : "All Payment Statuses",
    allMethods: isArabic ? "كل طرق الدفع" : "All Payment Methods",

    totalPayments: isArabic ? "إجمالي المدفوعات" : "Total Payments",
    confirmedPayments: isArabic ? "مدفوعات مؤكدة" : "Confirmed Payments",
    pendingPayments: isArabic ? "مدفوعات معلقة" : "Pending Payments",
    refundedPayments: isArabic ? "مدفوعات مستردة" : "Refunded Payments",
    treasuryPosted: isArabic ? "مرحلة للخزينة" : "Treasury Posted",
    accountingPosted: isArabic ? "مرحلة للمحاسبة" : "Accounting Posted",

    totalAmount: isArabic ? "إجمالي المدفوعات" : "Total Payments Value",
    confirmedAmount: isArabic ? "المبلغ المؤكد" : "Confirmed Amount",
    pendingAmount: isArabic ? "المبلغ المعلق" : "Pending Amount",
    refundedAmount: isArabic ? "المبلغ المسترد" : "Refunded Amount",
    feesAmount: isArabic ? "الرسوم" : "Fees",
    netAmount: isArabic ? "الصافي" : "Net Amount",

    pending: isArabic ? "معلقة" : "Pending",
    confirmed: isArabic ? "مؤكدة" : "Confirmed",
    cancelled: isArabic ? "ملغاة" : "Cancelled",
    failed: isArabic ? "فاشلة" : "Failed",
    refunded: isArabic ? "مستردة" : "Refunded",
    unknown: isArabic ? "غير محدد" : "Unknown",

    cash: isArabic ? "نقدي" : "Cash",
    bankTransfer: isArabic ? "تحويل بنكي" : "Bank Transfer",
    gateway: isArabic ? "بوابة دفع" : "Gateway",
    card: isArabic ? "بطاقة" : "Card",
    wallet: isArabic ? "محفظة" : "Wallet",
    tamara: isArabic ? "تمارا" : "Tamara",
    tabby: isArabic ? "تابي" : "Tabby",
    other: isArabic ? "أخرى" : "Other",

    yes: isArabic ? "نعم" : "Yes",
    no: isArabic ? "لا" : "No",

    financialTitle: isArabic ? "المؤشرات المالية" : "Financial Indicators",
    financialDesc: isArabic
      ? "ملخص إجمالي المدفوعات والمؤكد والمعلق والمسترد والرسوم والصافي."
      : "Summary of total, confirmed, pending, refunded, fees, and net amounts.",

    distributionTitle: isArabic
      ? "توزيع حالات المدفوعات"
      : "Payment Status Distribution",
    distributionDesc: isArabic
      ? "تحليل سريع لحالات المدفوعات."
      : "Quick analysis of payment statuses.",

    methodDistributionTitle: isArabic
      ? "توزيع طرق الدفع"
      : "Payment Method Distribution",
    methodDistributionDesc: isArabic
      ? "تحليل سريع لطرق الدفع المستخدمة."
      : "Quick analysis of used payment methods.",

    postingTitle: isArabic ? "حالة الترحيل" : "Posting Status",
    postingDesc: isArabic
      ? "متابعة ترحيل المدفوعات إلى الخزينة والمحاسبة."
      : "Track payment posting to treasury and accounting.",

    tableTitle: isArabic ? "بيانات تقرير المدفوعات" : "Payments Report Data",
    tableDesc: isArabic
      ? "جدول تحليلي للمدفوعات حسب الفلاتر الحالية."
      : "Analytical payments table based on current filters.",

    table: {
      payment: isArabic ? "الدفعة" : "Payment",
      reference: isArabic ? "المرجع" : "Reference",
      customer: isArabic ? "العميل" : "Customer",
      invoice: isArabic ? "الفاتورة" : "Invoice",
      order: isArabic ? "الطلب" : "Order",
      provider: isArabic ? "المركز" : "Provider",
      method: isArabic ? "طريقة الدفع" : "Method",
      status: isArabic ? "الحالة" : "Status",
      amount: isArabic ? "المبلغ" : "Amount",
      fee: isArabic ? "الرسوم" : "Fee",
      net: isArabic ? "الصافي" : "Net",
      refunded: isArabic ? "المسترد" : "Refunded",
      treasuryPosted: isArabic ? "الخزينة" : "Treasury",
      accountingPosted: isArabic ? "المحاسبة" : "Accounting",
      paidAt: isArabic ? "تاريخ الدفع" : "Paid At",
      confirmedAt: isArabic ? "تاريخ التأكيد" : "Confirmed At",
      createdAt: isArabic ? "تاريخ الإنشاء" : "Created At",
      action: isArabic ? "الإجراء" : "Action",
    },

    emptyTitle: isArabic ? "لا توجد بيانات مدفوعات" : "No payments data",
    emptyText: isArabic
      ? "ستظهر بيانات تقرير المدفوعات هنا عند توفر سجلات."
      : "Payments report data will appear here when records are available.",
    noResultsTitle: isArabic ? "لا توجد نتائج مطابقة" : "No matching results",
    noResultsText: isArabic
      ? "جرّب تغيير كلمات البحث أو فلاتر الحالة وطريقة الدفع."
      : "Try changing search keywords, status, or payment method filters.",

    accessDeniedTitle: isArabic ? "غير مصرح بعرض التقرير" : "Access denied",
    accessDeniedText: isArabic
      ? "لا تملك صلاحية عرض تقارير المدفوعات. تواصل مع مسؤول النظام إذا كنت تحتاج الوصول."
      : "You do not have permission to view payments reports. Contact your system administrator if you need access.",

    apiError: isArabic
      ? "تعذر تحميل تقرير المدفوعات."
      : "Unable to load payments report.",
    apiErrorHint: isArabic
      ? "تحقق من الاتصال أو الصلاحيات ثم أعد المحاولة."
      : "Check the connection or permissions, then try again.",
    refreshSuccess: isArabic
      ? "تم تحديث تقرير المدفوعات بنجاح."
      : "Payments report refreshed successfully.",
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
    filterStatus: isArabic ? "فلتر حالة الدفع" : "Payment Status Filter",
    filterMethod: isArabic ? "فلتر طريقة الدفع" : "Payment Method Filter",
    printedAt: isArabic ? "تاريخ الطباعة" : "Printed At",
    rowsCount: isArabic ? "عدد السجلات" : "Rows Count",
    printTitle: isArabic ? "تقرير المدفوعات" : "Payments Report",
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

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const status = String(value || "").toUpperCase();

  if (status === "PENDING" || status === "DRAFT") return "PENDING";
  if (status === "CONFIRMED" || status === "PAID" || status === "SUCCESS") {
    return "CONFIRMED";
  }
  if (status === "CANCELLED" || status === "CANCELED") return "CANCELLED";
  if (status === "FAILED" || status === "DECLINED") return "FAILED";
  if (status === "REFUNDED") return "REFUNDED";

  return "UNKNOWN";
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  const method = String(value || "").toUpperCase();

  if (["CASH", "CASH_ON_DELIVERY"].includes(method)) return "CASH";
  if (["BANK_TRANSFER", "TRANSFER", "BANK"].includes(method)) {
    return "BANK_TRANSFER";
  }
  if (["GATEWAY", "ONLINE", "MOYASAR", "PAYMENT_GATEWAY"].includes(method)) {
    return "GATEWAY";
  }
  if (["CARD", "CREDIT_CARD", "DEBIT_CARD", "MADA", "VISA", "MASTERCARD"].includes(method)) {
    return "CARD";
  }
  if (["WALLET", "APPLE_PAY", "STC_PAY"].includes(method)) return "WALLET";
  if (method === "TAMARA") return "TAMARA";
  if (method === "TABBY") return "TABBY";
  if (method === "OTHER") return "OTHER";

  return "UNKNOWN";
}

function getValue(obj: Dict, key: string): unknown {
  const direct = obj[key];

  if (direct !== undefined && direct !== null && direct !== "") {
    return direct;
  }

  for (const container of [
    "payment",
    "invoice",
    "order",
    "customer",
    "provider",
    "center",
    "gateway",
    "gateway_response",
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

function extractRows(payload: PaymentsReportResponse | null): unknown[] {
  if (!payload) return [];

  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.payments)) return payload.payments;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;

  if (Array.isArray(payload.data?.results)) return payload.data.results;
  if (Array.isArray(payload.data?.payments)) return payload.data.payments;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  if (Array.isArray(payload.data?.rows)) return payload.data.rows;

  return [];
}

function extractSummary(
  payload: PaymentsReportResponse | null,
): Partial<PaymentsReportSummary> {
  return payload?.data?.summary || payload?.summary || {};
}

function normalizePayment(item: unknown): PaymentReportRow {
  const obj = asDict(item);

  const invoice = asDict(obj.invoice);
  const order = asDict(obj.order || invoice.order);
  const customer = asDict(obj.customer || invoice.customer || order.customer);
  const provider = asDict(obj.provider || obj.center || order.provider || order.center);

  const id = String(getValue(obj, "id") || "");
  const amount =
    getValue(obj, "amount") ||
    getValue(obj, "total_amount") ||
    getValue(obj, "paid_amount") ||
    0;

  const feeAmount =
    getValue(obj, "fee_amount") ||
    getValue(obj, "gateway_fee") ||
    getValue(obj, "fees_amount") ||
    0;

  const refundedAmount =
    getValue(obj, "refunded_amount") ||
    getValue(obj, "refund_amount") ||
    0;

  const netAmount =
    getValue(obj, "net_amount") ||
    Math.max(0, toNumber(amount) - toNumber(feeAmount) - toNumber(refundedAmount));

  return {
    id,
    paymentNumber: String(
      getValue(obj, "payment_number") ||
        getValue(obj, "number") ||
        getValue(obj, "reference") ||
        getValue(obj, "transaction_id") ||
        id ||
        "-",
    ),
    reference: String(
      getValue(obj, "reference") ||
        getValue(obj, "transaction_reference") ||
        getValue(obj, "merchant_reference") ||
        "",
    ),
    gatewayReference: String(
      getValue(obj, "gateway_reference") ||
        getValue(obj, "gateway_payment_id") ||
        getValue(obj, "moyasar_id") ||
        getValue(obj, "payment_id") ||
        "",
    ),
    invoiceId: String(invoice.id || getValue(obj, "invoice_id") || ""),
    invoiceNumber: String(
      invoice.invoice_number ||
        invoice.number ||
        getValue(obj, "invoice_number") ||
        "",
    ),
    orderId: String(order.id || getValue(obj, "order_id") || ""),
    orderNumber: String(
      order.order_number ||
        order.number ||
        order.reference ||
        getValue(obj, "order_number") ||
        "",
    ),
    customerName: String(
      getValue(obj, "customer_name") ||
        customer.full_name ||
        customer.name ||
        "-",
    ),
    customerPhone: String(
      getValue(obj, "customer_phone") ||
        customer.mobile ||
        customer.phone ||
        "",
    ),
    providerName: String(
      getValue(obj, "provider_name") ||
        getValue(obj, "center_name") ||
        provider.name ||
        "-",
    ),
    method: normalizePaymentMethod(
      getValue(obj, "method") ||
        getValue(obj, "payment_method") ||
        getValue(obj, "channel"),
    ),
    status: normalizePaymentStatus(getValue(obj, "status")),
    amount: toNumber(amount),
    feeAmount: toNumber(feeAmount),
    netAmount: toNumber(netAmount),
    refundedAmount: toNumber(refundedAmount),
    isTreasuryPosted: toBoolean(
      getValue(obj, "is_treasury_posted") ||
        getValue(obj, "treasury_posted"),
    ),
    isAccountingPosted: toBoolean(
      getValue(obj, "is_accounting_posted") ||
        getValue(obj, "accounting_posted"),
    ),
    paidAt: String(getValue(obj, "paid_at") || getValue(obj, "payment_date") || ""),
    confirmedAt: String(getValue(obj, "confirmed_at") || ""),
    cancelledAt: String(getValue(obj, "cancelled_at") || getValue(obj, "canceled_at") || ""),
    createdAt: String(getValue(obj, "created_at") || ""),
  };
}

function normalizeSummary(
  rows: PaymentReportRow[],
  summary?: Partial<PaymentsReportSummary>,
): PaymentsReportSummary {
  const fallback: PaymentsReportSummary = {
    total_payments: rows.length,
    pending_payments: rows.filter((item) => item.status === "PENDING").length,
    confirmed_payments: rows.filter((item) => item.status === "CONFIRMED").length,
    cancelled_payments: rows.filter((item) => item.status === "CANCELLED").length,
    failed_payments: rows.filter((item) => item.status === "FAILED").length,
    refunded_payments: rows.filter((item) => item.status === "REFUNDED").length,
    cash_payments: rows.filter((item) => item.method === "CASH").length,
    bank_transfer_payments: rows.filter((item) => item.method === "BANK_TRANSFER").length,
    gateway_payments: rows.filter((item) => item.method === "GATEWAY").length,
    card_payments: rows.filter((item) => item.method === "CARD").length,
    wallet_payments: rows.filter((item) => item.method === "WALLET").length,
    tamara_payments: rows.filter((item) => item.method === "TAMARA").length,
    tabby_payments: rows.filter((item) => item.method === "TABBY").length,
    treasury_posted_payments: rows.filter((item) => item.isTreasuryPosted).length,
    accounting_posted_payments: rows.filter((item) => item.isAccountingPosted).length,
    total_amount: rows.reduce((sum, item) => sum + item.amount, 0),
    confirmed_amount: rows
      .filter((item) => item.status === "CONFIRMED")
      .reduce((sum, item) => sum + item.amount, 0),
    pending_amount: rows
      .filter((item) => item.status === "PENDING")
      .reduce((sum, item) => sum + item.amount, 0),
    refunded_amount: rows.reduce((sum, item) => sum + item.refundedAmount, 0),
    fees_amount: rows.reduce((sum, item) => sum + item.feeAmount, 0),
    net_amount: rows.reduce((sum, item) => sum + item.netAmount, 0),
  };

  return {
    total_payments: toNumber(summary?.total_payments ?? fallback.total_payments),
    pending_payments: toNumber(summary?.pending_payments ?? fallback.pending_payments),
    confirmed_payments: toNumber(
      summary?.confirmed_payments ?? fallback.confirmed_payments,
    ),
    cancelled_payments: toNumber(
      summary?.cancelled_payments ?? fallback.cancelled_payments,
    ),
    failed_payments: toNumber(summary?.failed_payments ?? fallback.failed_payments),
    refunded_payments: toNumber(
      summary?.refunded_payments ?? fallback.refunded_payments,
    ),
    cash_payments: toNumber(summary?.cash_payments ?? fallback.cash_payments),
    bank_transfer_payments: toNumber(
      summary?.bank_transfer_payments ?? fallback.bank_transfer_payments,
    ),
    gateway_payments: toNumber(
      summary?.gateway_payments ?? fallback.gateway_payments,
    ),
    card_payments: toNumber(summary?.card_payments ?? fallback.card_payments),
    wallet_payments: toNumber(summary?.wallet_payments ?? fallback.wallet_payments),
    tamara_payments: toNumber(summary?.tamara_payments ?? fallback.tamara_payments),
    tabby_payments: toNumber(summary?.tabby_payments ?? fallback.tabby_payments),
    treasury_posted_payments: toNumber(
      summary?.treasury_posted_payments ?? fallback.treasury_posted_payments,
    ),
    accounting_posted_payments: toNumber(
      summary?.accounting_posted_payments ?? fallback.accounting_posted_payments,
    ),
    total_amount: toNumber(summary?.total_amount ?? fallback.total_amount),
    confirmed_amount: toNumber(
      summary?.confirmed_amount ?? fallback.confirmed_amount,
    ),
    pending_amount: toNumber(summary?.pending_amount ?? fallback.pending_amount),
    refunded_amount: toNumber(
      summary?.refunded_amount ?? fallback.refunded_amount,
    ),
    fees_amount: toNumber(summary?.fees_amount ?? fallback.fees_amount),
    net_amount: toNumber(summary?.net_amount ?? fallback.net_amount),
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

function statusLabel(status: PaymentStatus, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<PaymentStatus, string> = {
    PENDING: t.pending,
    CONFIRMED: t.confirmed,
    CANCELLED: t.cancelled,
    FAILED: t.failed,
    REFUNDED: t.refunded,
    UNKNOWN: t.unknown,
  };

  return labels[status];
}

function methodLabel(method: PaymentMethod, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<PaymentMethod, string> = {
    CASH: t.cash,
    BANK_TRANSFER: t.bankTransfer,
    GATEWAY: t.gateway,
    CARD: t.card,
    WALLET: t.wallet,
    TAMARA: t.tamara,
    TABBY: t.tabby,
    OTHER: t.other,
    UNKNOWN: t.unknown,
  };

  return labels[method];
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

function statusBadge(status: PaymentStatus, locale: AppLocale) {
  const label = statusLabel(status, locale);

  if (status === "CONFIRMED") {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        {label}
      </Badge>
    );
  }

  if (status === "PENDING") {
    return (
      <Badge className="rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
        {label}
      </Badge>
    );
  }

  if (status === "FAILED" || status === "CANCELLED" || status === "REFUNDED") {
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

function methodBadge(method: PaymentMethod, locale: AppLocale) {
  return (
    <Badge variant="secondary" className="rounded-full px-3 py-1">
      {methodLabel(method, locale)}
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
  rows: PaymentReportRow[];
  summary: PaymentsReportSummary;
  t: ReturnType<typeof dictionary>;
}) {
  const isArabic = locale === "ar";
  const now = new Date().toLocaleString("en-US");

  const tableRows = rows
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.paymentNumber || "-")}</td>
          <td>${escapeHtml(item.customerName || "-")}</td>
          <td>${escapeHtml(item.invoiceNumber || "-")}</td>
          <td>${escapeHtml(methodLabel(item.method, locale))}</td>
          <td>${escapeHtml(statusLabel(item.status, locale))}</td>
          <td>${escapeHtml(formatMoney(item.amount))}</td>
          <td>${escapeHtml(formatMoney(item.netAmount))}</td>
          <td>${escapeHtml(item.isTreasuryPosted ? t.yes : t.no)}</td>
          <td>${escapeHtml(item.isAccountingPosted ? t.yes : t.no)}</td>
          <td>${escapeHtml(formatDate(item.paidAt || item.createdAt))}</td>
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
          <div class="summary-card"><span>${escapeHtml(t.totalPayments)}</span><strong>${formatNumber(summary.total_payments)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.confirmedPayments)}</span><strong>${formatNumber(summary.confirmed_payments)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.treasuryPosted)}</span><strong>${formatNumber(summary.treasury_posted_payments)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.totalAmount)}</span><strong>${formatMoney(summary.total_amount)}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${escapeHtml(t.table.payment)}</th>
              <th>${escapeHtml(t.table.customer)}</th>
              <th>${escapeHtml(t.table.invoice)}</th>
              <th>${escapeHtml(t.table.method)}</th>
              <th>${escapeHtml(t.table.status)}</th>
              <th>${escapeHtml(t.table.amount)}</th>
              <th>${escapeHtml(t.table.net)}</th>
              <th>${escapeHtml(t.table.treasuryPosted)}</th>
              <th>${escapeHtml(t.table.accountingPosted)}</th>
              <th>${escapeHtml(t.table.paidAt)}</th>
            </tr>
          </thead>
          <tbody>
            ${
              tableRows ||
              `<tr><td colspan="11" style="text-align:center">${escapeHtml(t.emptyTitle)}</td></tr>`
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

export default function SystemPaymentsReportsPage() {
  const auth = useAuth() as unknown;

  const [locale, setLocale] = useState<AppLocale>("ar");
  const [rows, setRows] = useState<PaymentReportRow[]>([]);
  const [summary, setSummary] =
    useState<PaymentsReportSummary>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("ALL");

  const t = useMemo(() => dictionary(locale), [locale]);
  const isArabic = locale === "ar";
  const authResolving = isAuthResolving(auth);

  const canViewReport = hasSafePermission(
    auth,
    ["reports.view", "reports.payments.view", "payments.view"],
    "view",
  );

  const canViewPaymentDetails = hasSafePermission(
    auth,
    ["payments.view", "payments.detail"],
    "view",
  );

  const canExportReport = hasSafePermission(
    auth,
    ["reports.export", "reports.payments.export", "payments.export"],
    "action",
  );

  const canPrintReport = hasSafePermission(
    auth,
    ["reports.print", "reports.payments.print"],
    "action",
  );

  const filteredRows = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return rows.filter((item) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : item.status === statusFilter;

      const matchesMethod =
        methodFilter === "ALL" ? true : item.method === methodFilter;

      const matchesQuery = !cleanQuery
        ? true
        : [
            item.paymentNumber,
            item.reference,
            item.gatewayReference,
            item.customerName,
            item.customerPhone,
            item.invoiceNumber,
            item.orderNumber,
            item.providerName,
            statusLabel(item.status, locale),
            methodLabel(item.method, locale),
          ]
            .join(" ")
            .toLowerCase()
            .includes(cleanQuery);

      return matchesStatus && matchesMethod && matchesQuery;
    });
  }, [locale, methodFilter, query, rows, statusFilter]);

  const filteredSummary = useMemo(
    () => normalizeSummary(filteredRows),
    [filteredRows],
  );

  const hasSearchOrFilter =
    query.trim().length > 0 ||
    statusFilter !== "ALL" ||
    methodFilter !== "ALL";

  const statusOptions = useMemo(
    () => [
      { value: "ALL" as StatusFilter, label: t.allStatuses, count: rows.length },
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
        value: "FAILED" as StatusFilter,
        label: t.failed,
        count: rows.filter((item) => item.status === "FAILED").length,
      },
      {
        value: "REFUNDED" as StatusFilter,
        label: t.refunded,
        count: rows.filter((item) => item.status === "REFUNDED").length,
      },
    ],
    [rows, t],
  );

  const methodOptions = useMemo(
    () => [
      { value: "ALL" as MethodFilter, label: t.allMethods, count: rows.length },
      {
        value: "CASH" as MethodFilter,
        label: t.cash,
        count: rows.filter((item) => item.method === "CASH").length,
      },
      {
        value: "BANK_TRANSFER" as MethodFilter,
        label: t.bankTransfer,
        count: rows.filter((item) => item.method === "BANK_TRANSFER").length,
      },
      {
        value: "GATEWAY" as MethodFilter,
        label: t.gateway,
        count: rows.filter((item) => item.method === "GATEWAY").length,
      },
      {
        value: "CARD" as MethodFilter,
        label: t.card,
        count: rows.filter((item) => item.method === "CARD").length,
      },
      {
        value: "WALLET" as MethodFilter,
        label: t.wallet,
        count: rows.filter((item) => item.method === "WALLET").length,
      },
      {
        value: "TAMARA" as MethodFilter,
        label: t.tamara,
        count: rows.filter((item) => item.method === "TAMARA").length,
      },
      {
        value: "TABBY" as MethodFilter,
        label: t.tabby,
        count: rows.filter((item) => item.method === "TABBY").length,
      },
    ],
    [rows, t],
  );

  const summaryCards = useMemo(
    () => [
      {
        title: t.totalPayments,
        value: summary.total_payments,
        icon: ReceiptText,
        helper: t.confirmedPayments,
        helperValue: formatNumber(summary.confirmed_payments),
        percent: summary.total_payments > 0 ? 100 : 0,
        isMoney: false,
      },
      {
        title: t.confirmedPayments,
        value: summary.confirmed_payments,
        icon: CheckCircle2,
        helper: t.confirmedAmount,
        helperValue: formatMoney(summary.confirmed_amount),
        percent: percent(summary.confirmed_payments, summary.total_payments),
        isMoney: false,
      },
      {
        title: t.treasuryPosted,
        value: summary.treasury_posted_payments,
        icon: ShieldCheck,
        helper: t.accountingPosted,
        helperValue: formatNumber(summary.accounting_posted_payments),
        percent: percent(
          summary.treasury_posted_payments,
          summary.total_payments,
        ),
        isMoney: false,
      },
      {
        title: t.totalAmount,
        value: summary.total_amount,
        icon: Wallet,
        helper: t.netAmount,
        helperValue: formatMoney(summary.net_amount),
        percent: summary.total_amount > 0 ? 100 : 0,
        isMoney: true,
      },
    ],
    [summary, t],
  );

  const statusCards = useMemo(
    () => [
      {
        title: t.pending,
        value: summary.pending_payments,
        icon: Wallet,
        filter: "PENDING" as StatusFilter,
        percent: percent(summary.pending_payments, summary.total_payments),
      },
      {
        title: t.confirmed,
        value: summary.confirmed_payments,
        icon: CheckCircle2,
        filter: "CONFIRMED" as StatusFilter,
        percent: percent(summary.confirmed_payments, summary.total_payments),
      },
      {
        title: t.failed,
        value: summary.failed_payments,
        icon: XCircle,
        filter: "FAILED" as StatusFilter,
        percent: percent(summary.failed_payments, summary.total_payments),
      },
      {
        title: t.refunded,
        value: summary.refunded_payments,
        icon: XCircle,
        filter: "REFUNDED" as StatusFilter,
        percent: percent(summary.refunded_payments, summary.total_payments),
      },
    ],
    [summary, t],
  );

  const methodCards = useMemo(
    () => [
      {
        title: t.cash,
        value: summary.cash_payments,
        icon: Banknote,
        filter: "CASH" as MethodFilter,
        percent: percent(summary.cash_payments, summary.total_payments),
      },
      {
        title: t.bankTransfer,
        value: summary.bank_transfer_payments,
        icon: Banknote,
        filter: "BANK_TRANSFER" as MethodFilter,
        percent: percent(
          summary.bank_transfer_payments,
          summary.total_payments,
        ),
      },
      {
        title: t.gateway,
        value: summary.gateway_payments,
        icon: CreditCard,
        filter: "GATEWAY" as MethodFilter,
        percent: percent(summary.gateway_payments, summary.total_payments),
      },
      {
        title: t.card,
        value: summary.card_payments,
        icon: CreditCard,
        filter: "CARD" as MethodFilter,
        percent: percent(summary.card_payments, summary.total_payments),
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
          "/api/reports/payments/",
          "/api/payments/?page_size=300",
        ];

        let loadedPayload: PaymentsReportResponse | null = null;
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
            | PaymentsReportResponse
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
            loadedPayload?.message || "Unable to load payments report",
          );
        }

        const normalizedRows = extractRows(loadedPayload).map(normalizePayment);

        setRows(normalizedRows);
        setSummary(
          normalizeSummary(normalizedRows, extractSummary(loadedPayload)),
        );

        if (showToast) {
          toast.success(t.refreshSuccess);
        }
      } catch (error) {
        console.error("Payments report load error:", error);
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
    setMethodFilter("ALL");
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

    const methodFilterLabel =
      methodOptions.find((item) => item.value === methodFilter)?.label || t.all;

    downloadExcel({
      filename: `primey-care-payments-report-${generatedAt
        .toISOString()
        .slice(0, 10)}.xls`,
      worksheetName: isArabic ? "تقرير المدفوعات" : "Payments Report",
      title: t.title,
      locale,
      summaryRows: [
        [t.generatedAt, generatedAt.toLocaleString("en-US")],
        [t.reportScope, t.currentFilteredData],
        [t.totalPayments, filteredSummary.total_payments],
        [t.confirmedPayments, filteredSummary.confirmed_payments],
        [t.pendingPayments, filteredSummary.pending_payments],
        [t.refundedPayments, filteredSummary.refunded_payments],
        [t.treasuryPosted, filteredSummary.treasury_posted_payments],
        [t.accountingPosted, filteredSummary.accounting_posted_payments],
        [t.totalAmount, formatMoney(filteredSummary.total_amount)],
        [t.confirmedAmount, formatMoney(filteredSummary.confirmed_amount)],
        [t.pendingAmount, formatMoney(filteredSummary.pending_amount)],
        [t.refundedAmount, formatMoney(filteredSummary.refunded_amount)],
        [t.feesAmount, formatMoney(filteredSummary.fees_amount)],
        [t.netAmount, formatMoney(filteredSummary.net_amount)],
      ],
      filterRows: [
        [t.filterSearch, query || t.all],
        [t.filterStatus, statusFilterLabel],
        [t.filterMethod, methodFilterLabel],
      ],
      headers: [
        "ID",
        t.table.payment,
        t.table.reference,
        "Gateway Reference",
        t.table.customer,
        t.table.invoice,
        t.table.order,
        t.table.provider,
        t.table.method,
        t.table.status,
        t.table.amount,
        t.table.fee,
        t.table.net,
        t.table.refunded,
        t.table.treasuryPosted,
        t.table.accountingPosted,
        t.table.paidAt,
        t.table.confirmedAt,
        t.table.createdAt,
      ],
      rows: filteredRows.map((item) => [
        item.id || "-",
        item.paymentNumber || "-",
        item.reference || "-",
        item.gatewayReference || "-",
        item.customerName || "-",
        item.invoiceNumber || item.invoiceId || "-",
        item.orderNumber || item.orderId || "-",
        item.providerName || "-",
        methodLabel(item.method, locale),
        statusLabel(item.status, locale),
        formatMoney(item.amount),
        formatMoney(item.feeAmount),
        formatMoney(item.netAmount),
        formatMoney(item.refundedAmount),
        item.isTreasuryPosted ? t.yes : t.no,
        item.isAccountingPosted ? t.yes : t.no,
        formatDate(item.paidAt),
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

            <CardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.totalAmount}</p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.total_amount} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.confirmedAmount}
                </p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.confirmed_amount} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.pendingAmount}
                </p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.pending_amount} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.refundedAmount}
                </p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.refunded_amount} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.feesAmount}</p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.fees_amount} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.netAmount}</p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.net_amount} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">
                {t.distributionTitle}
              </CardTitle>
              <CardDescription>{t.distributionDesc}</CardDescription>
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
                {t.methodDistributionTitle}
              </CardTitle>
              <CardDescription>{t.methodDistributionDesc}</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {methodCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <button
                      key={card.filter}
                      type="button"
                      className="space-y-2 rounded-xl border bg-background/70 p-3 text-start transition hover:bg-muted/40"
                      onClick={() => setMethodFilter(card.filter)}
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

            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.treasuryPosted}
                </p>
                <div className="mt-2 text-2xl font-bold">
                  {formatNumber(summary.treasury_posted_payments)}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${percent(
                        summary.treasury_posted_payments,
                        summary.total_payments,
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.accountingPosted}
                </p>
                <div className="mt-2 text-2xl font-bold">
                  {formatNumber(summary.accounting_posted_payments)}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${percent(
                        summary.accounting_posted_payments,
                        summary.total_payments,
                      )}%`,
                    }}
                  />
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
                    {methodOptions.map((item) => {
                      const isSelected = methodFilter === item.value;

                      return (
                        <Button
                          key={item.value}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          className="h-10 rounded-xl"
                          onClick={() => setMethodFilter(item.value)}
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
                        <TableHead>{t.table.payment}</TableHead>
                        <TableHead>{t.table.customer}</TableHead>
                        <TableHead>{t.table.invoice}</TableHead>
                        <TableHead>{t.table.order}</TableHead>
                        <TableHead>{t.table.method}</TableHead>
                        <TableHead>{t.table.status}</TableHead>
                        <TableHead>{t.table.amount}</TableHead>
                        <TableHead>{t.table.fee}</TableHead>
                        <TableHead>{t.table.net}</TableHead>
                        <TableHead>{t.table.treasuryPosted}</TableHead>
                        <TableHead>{t.table.accountingPosted}</TableHead>
                        <TableHead>{t.table.paidAt}</TableHead>
                        {canViewPaymentDetails ? (
                          <TableHead>{t.table.action}</TableHead>
                        ) : null}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {isLoading ? (
                        <TableRowsSkeleton
                          columnsCount={canViewPaymentDetails ? 13 : 12}
                        />
                      ) : filteredRows.length > 0 ? (
                        filteredRows.map((item) => (
                          <TableRow key={`${item.id}-${item.paymentNumber}`}>
                            <TableCell>
                              <div className="flex min-w-[190px] items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                                  <ReceiptText className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-medium">
                                    {item.paymentNumber || "-"}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {item.reference ||
                                      item.gatewayReference ||
                                      "-"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex min-w-[170px] items-center gap-2">
                                <UserRound className="h-4 w-4 text-muted-foreground" />
                                <div className="min-w-0">
                                  <p className="truncate">
                                    {item.customerName || "-"}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {item.customerPhone || "-"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <span className="whitespace-nowrap">
                                {item.invoiceNumber || item.invoiceId || "-"}
                              </span>
                            </TableCell>

                            <TableCell>
                              <span className="whitespace-nowrap">
                                {item.orderNumber || item.orderId || "-"}
                              </span>
                            </TableCell>

                            <TableCell>{methodBadge(item.method, locale)}</TableCell>

                            <TableCell>{statusBadge(item.status, locale)}</TableCell>

                            <TableCell>
                              <MoneyText value={item.amount} />
                            </TableCell>

                            <TableCell>
                              <MoneyText value={item.feeAmount} />
                            </TableCell>

                            <TableCell>
                              <MoneyText value={item.netAmount} />
                            </TableCell>

                            <TableCell>
                              {postedBadge(item.isTreasuryPosted, locale)}
                            </TableCell>

                            <TableCell>
                              {postedBadge(item.isAccountingPosted, locale)}
                            </TableCell>

                            <TableCell>
                              <span className="whitespace-nowrap">
                                {formatDate(item.paidAt || item.createdAt)}
                              </span>
                            </TableCell>

                            {canViewPaymentDetails ? (
                              <TableCell>
                                {isValidId(item.id) ? (
                                  <Link href={`/system/payments/${item.id}`}>
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
                            colSpan={canViewPaymentDetails ? 13 : 12}
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