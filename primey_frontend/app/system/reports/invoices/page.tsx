"use client";

/* ============================================================
   📂 app/system/reports/invoices/page.tsx
   🧠 Primey Care | Invoices Reports Page

   ✅ المسار:
      app/system/reports/invoices/page.tsx

   ✅ العمل:
      صفحة تقرير الفواتير المركزية داخل وحدة التقارير.
      تعرض ملخص الفواتير وجدولًا تحليليًا قابلًا للبحث والتصفية والتصدير والطباعة.

   ✅ الإصدار:
      Phase 17 UX Refinement + Central Reports Invoices Review

   ✅ يعتمد على:
      - /api/reports/invoices/
      - /api/invoices/ كـ fallback آمن عند عدم توفر تقرير مخصص
      - primey-locale
      - AuthProvider
      - sonner
      - /currency/sar.svg

   ✅ متوافق مع صفحات:
      - Centers approved UX pattern
      - Customers approved UX pattern
      - Central Reports module

   ✅ الوظائف:
      - عرض مؤشرات تقرير الفواتير.
      - تحليل الفواتير حسب حالة الفاتورة وحالة الدفع.
      - عرض القيم المالية: الإجمالي، الضريبة، الخصم، المدفوع، والمتبقي.
      - البحث في صف مستقل.
      - فلاتر حالة الفاتورة وحالة الدفع في صفوف منظمة.
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
      - منع عرض أي مسارات تقنية أو عبارات API داخل واجهة المستخدم.
============================================================ */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCcw,
  Search,
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

type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "VOID"
  | "UNKNOWN";

type PaymentStatus =
  | "UNPAID"
  | "PARTIAL"
  | "PAID"
  | "REFUNDED"
  | "FAILED"
  | "UNKNOWN";

type StatusFilter = "ALL" | InvoiceStatus;
type PaymentFilter = "ALL" | PaymentStatus;

type InvoiceReportRow = {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  providerName: string;
  productName: string;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  issuedAt: string;
  dueDate: string;
  paidAt: string;
  cancelledAt: string;
  createdAt: string;
};

type InvoicesReportSummary = {
  total_invoices: number;
  draft_invoices: number;
  issued_invoices: number;
  partial_invoices: number;
  paid_invoices: number;
  overdue_invoices: number;
  cancelled_invoices: number;
  void_invoices: number;
  unpaid_invoices: number;
  refunded_invoices: number;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
};

type InvoicesReportResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: {
    summary?: Partial<InvoicesReportSummary>;
    results?: unknown[];
    invoices?: unknown[];
    items?: unknown[];
    rows?: unknown[];
  };
  summary?: Partial<InvoicesReportSummary>;
  results?: unknown[];
  invoices?: unknown[];
  items?: unknown[];
  rows?: unknown[];
};

const SAR_ICON_PATH = "/currency/sar.svg";

const DEFAULT_SUMMARY: InvoicesReportSummary = {
  total_invoices: 0,
  draft_invoices: 0,
  issued_invoices: 0,
  partial_invoices: 0,
  paid_invoices: 0,
  overdue_invoices: 0,
  cancelled_invoices: 0,
  void_invoices: 0,
  unpaid_invoices: 0,
  refunded_invoices: 0,
  subtotal_amount: 0,
  discount_amount: 0,
  tax_amount: 0,
  total_amount: 0,
  paid_amount: 0,
  remaining_amount: 0,
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
    title: isArabic ? "تقارير الفواتير" : "Invoices Reports",
    subtitle: isArabic
      ? "تحليل الفواتير حسب الحالة والدفع والعميل والطلب والقيم المالية والضريبة والمتبقي."
      : "Analyze invoices by status, payment, customer, order, financial values, tax, and remaining balances.",

    back: isArabic ? "مركز التقارير" : "Reports Center",
    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    exportExcel: isArabic ? "تصدير Excel" : "Export Excel",
    print: isArabic ? "طباعة PDF" : "Print PDF",
    clearFilters: isArabic ? "مسح الفلاتر" : "Clear Filters",
    viewDetails: isArabic ? "عرض التفاصيل" : "View Details",

    searchPlaceholder: isArabic
      ? "ابحث برقم الفاتورة أو العميل أو الطلب أو المركز أو المنتج..."
      : "Search by invoice number, customer, order, provider, or product...",

    all: isArabic ? "الكل" : "All",
    allStatuses: isArabic ? "كل حالات الفاتورة" : "All Invoice Statuses",
    allPaymentStatuses: isArabic ? "كل حالات الدفع" : "All Payment Statuses",

    totalInvoices: isArabic ? "إجمالي الفواتير" : "Total Invoices",
    issuedInvoices: isArabic ? "فواتير صادرة" : "Issued Invoices",
    paidInvoices: isArabic ? "فواتير مدفوعة" : "Paid Invoices",
    overdueInvoices: isArabic ? "فواتير متأخرة" : "Overdue Invoices",
    totalAmount: isArabic ? "إجمالي الفواتير" : "Total Invoice Value",
    paidAmount: isArabic ? "المدفوع" : "Paid Amount",
    remainingAmount: isArabic ? "المتبقي" : "Remaining Amount",
    taxAmount: isArabic ? "الضريبة" : "Tax Amount",
    discountAmount: isArabic ? "الخصم" : "Discount Amount",

    draft: isArabic ? "مسودة" : "Draft",
    issued: isArabic ? "صادرة" : "Issued",
    partial: isArabic ? "جزئية" : "Partial",
    paid: isArabic ? "مدفوعة" : "Paid",
    overdue: isArabic ? "متأخرة" : "Overdue",
    cancelled: isArabic ? "ملغاة" : "Cancelled",
    void: isArabic ? "باطلة" : "Void",
    unknown: isArabic ? "غير محدد" : "Unknown",

    unpaid: isArabic ? "غير مدفوع" : "Unpaid",
    refunded: isArabic ? "مسترد" : "Refunded",
    failed: isArabic ? "فشل" : "Failed",

    financialTitle: isArabic ? "المؤشرات المالية" : "Financial Indicators",
    financialDesc: isArabic
      ? "ملخص إجمالي الفواتير والمدفوع والمتبقي والضريبة والخصم."
      : "Summary of total invoices, paid, remaining, tax, and discount.",

    distributionTitle: isArabic
      ? "توزيع حالات الفواتير"
      : "Invoice Status Distribution",
    distributionDesc: isArabic
      ? "تحليل سريع لحالات الفواتير."
      : "Quick analysis of invoice statuses.",

    paymentDistributionTitle: isArabic
      ? "توزيع حالات الدفع"
      : "Payment Status Distribution",
    paymentDistributionDesc: isArabic
      ? "تحليل سريع لحالات الدفع المرتبطة بالفواتير."
      : "Quick analysis of invoice payment statuses.",

    tableTitle: isArabic ? "بيانات تقرير الفواتير" : "Invoices Report Data",
    tableDesc: isArabic
      ? "جدول تحليلي للفواتير حسب الفلاتر الحالية."
      : "Analytical invoices table based on current filters.",

    table: {
      invoice: isArabic ? "الفاتورة" : "Invoice",
      order: isArabic ? "الطلب" : "Order",
      customer: isArabic ? "العميل" : "Customer",
      provider: isArabic ? "المركز" : "Provider",
      product: isArabic ? "المنتج / البرنامج" : "Product / Program",
      status: isArabic ? "حالة الفاتورة" : "Invoice Status",
      paymentStatus: isArabic ? "حالة الدفع" : "Payment Status",
      subtotal: isArabic ? "قبل الضريبة" : "Subtotal",
      discount: isArabic ? "الخصم" : "Discount",
      tax: isArabic ? "الضريبة" : "Tax",
      totalAmount: isArabic ? "الإجمالي" : "Total",
      paidAmount: isArabic ? "المدفوع" : "Paid",
      remainingAmount: isArabic ? "المتبقي" : "Remaining",
      issuedAt: isArabic ? "تاريخ الإصدار" : "Issued At",
      dueDate: isArabic ? "تاريخ الاستحقاق" : "Due Date",
      paidAt: isArabic ? "تاريخ السداد" : "Paid At",
      createdAt: isArabic ? "تاريخ الإنشاء" : "Created At",
      action: isArabic ? "الإجراء" : "Action",
    },

    emptyTitle: isArabic ? "لا توجد بيانات فواتير" : "No invoices data",
    emptyText: isArabic
      ? "ستظهر بيانات تقرير الفواتير هنا عند توفر سجلات."
      : "Invoices report data will appear here when records are available.",
    noResultsTitle: isArabic ? "لا توجد نتائج مطابقة" : "No matching results",
    noResultsText: isArabic
      ? "جرّب تغيير كلمات البحث أو فلاتر الحالة والدفع."
      : "Try changing search keywords, invoice status, or payment status.",

    accessDeniedTitle: isArabic ? "غير مصرح بعرض التقرير" : "Access denied",
    accessDeniedText: isArabic
      ? "لا تملك صلاحية عرض تقارير الفواتير. تواصل مع مسؤول النظام إذا كنت تحتاج الوصول."
      : "You do not have permission to view invoices reports. Contact your system administrator if you need access.",

    apiError: isArabic
      ? "تعذر تحميل تقرير الفواتير."
      : "Unable to load invoices report.",
    apiErrorHint: isArabic
      ? "تحقق من الاتصال أو الصلاحيات ثم أعد المحاولة."
      : "Check the connection or permissions, then try again.",
    refreshSuccess: isArabic
      ? "تم تحديث تقرير الفواتير بنجاح."
      : "Invoices report refreshed successfully.",
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
    filterStatus: isArabic ? "فلتر حالة الفاتورة" : "Invoice Status Filter",
    filterPayment: isArabic ? "فلتر حالة الدفع" : "Payment Status Filter",
    printedAt: isArabic ? "تاريخ الطباعة" : "Printed At",
    rowsCount: isArabic ? "عدد السجلات" : "Rows Count",
    printTitle: isArabic ? "تقرير الفواتير" : "Invoices Report",
  };
}

/* ============================================================
   Normalizers
============================================================ */

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeInvoiceStatus(value: unknown): InvoiceStatus {
  const status = String(value || "").toUpperCase();

  if (status === "DRAFT") return "DRAFT";
  if (status === "ISSUED" || status === "POSTED") return "ISSUED";
  if (status === "PARTIAL" || status === "PARTIALLY_PAID") return "PARTIAL";
  if (status === "PAID") return "PAID";
  if (status === "OVERDUE") return "OVERDUE";
  if (status === "CANCELLED" || status === "CANCELED") return "CANCELLED";
  if (status === "VOID") return "VOID";

  return "UNKNOWN";
}

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const status = String(value || "").toUpperCase();

  if (status === "UNPAID" || status === "PENDING") return "UNPAID";
  if (status === "PARTIAL" || status === "PARTIALLY_PAID") return "PARTIAL";
  if (status === "PAID" || status === "CONFIRMED") return "PAID";
  if (status === "REFUNDED") return "REFUNDED";
  if (status === "FAILED") return "FAILED";

  return "UNKNOWN";
}

function getValue(obj: Dict, key: string): unknown {
  const direct = obj[key];

  if (direct !== undefined && direct !== null && direct !== "") {
    return direct;
  }

  for (const container of [
    "invoice",
    "order",
    "customer",
    "provider",
    "center",
    "product",
    "program",
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

function extractRows(payload: InvoicesReportResponse | null): unknown[] {
  if (!payload) return [];

  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.invoices)) return payload.invoices;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;

  if (Array.isArray(payload.data?.results)) return payload.data.results;
  if (Array.isArray(payload.data?.invoices)) return payload.data.invoices;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  if (Array.isArray(payload.data?.rows)) return payload.data.rows;

  return [];
}

function extractSummary(
  payload: InvoicesReportResponse | null,
): Partial<InvoicesReportSummary> {
  return payload?.data?.summary || payload?.summary || {};
}

function normalizeInvoice(item: unknown): InvoiceReportRow {
  const obj = asDict(item);

  const invoice = asDict(obj.invoice);
  const order = asDict(obj.order);
  const customer = asDict(obj.customer || order.customer);
  const provider = asDict(obj.provider || obj.center || order.provider || order.center);
  const product = asDict(obj.product || obj.program || order.product || order.program);

  const id = String(getValue(obj, "id") || invoice.id || "");
  const subtotal =
    getValue(obj, "subtotal") ||
    getValue(obj, "subtotal_amount") ||
    getValue(obj, "amount_before_tax") ||
    0;
  const discountAmount =
    getValue(obj, "discount_amount") ||
    getValue(obj, "discount") ||
    0;
  const taxAmount =
    getValue(obj, "tax_amount") ||
    getValue(obj, "vat_amount") ||
    0;
  const totalAmount =
    getValue(obj, "total_amount") ||
    getValue(obj, "grand_total") ||
    getValue(obj, "amount") ||
    0;
  const paidAmount =
    getValue(obj, "paid_amount") ||
    getValue(obj, "total_paid") ||
    0;
  const remainingAmount =
    getValue(obj, "remaining_amount") ||
    getValue(obj, "balance_due") ||
    Math.max(0, toNumber(totalAmount) - toNumber(paidAmount));

  return {
    id,
    invoiceNumber: String(
      getValue(obj, "invoice_number") ||
        getValue(obj, "number") ||
        getValue(obj, "reference") ||
        invoice.invoice_number ||
        invoice.number ||
        id ||
        "-",
    ),
    orderId: String(order.id || getValue(obj, "order_id") || ""),
    orderNumber: String(
      getValue(obj, "order_number") ||
        order.order_number ||
        order.number ||
        order.reference ||
        "-",
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
    productName: String(
      getValue(obj, "product_name") ||
        getValue(obj, "program_name") ||
        product.name ||
        product.title ||
        "-",
    ),
    status: normalizeInvoiceStatus(getValue(obj, "status")),
    paymentStatus: normalizePaymentStatus(
      getValue(obj, "payment_status") || getValue(obj, "payment_state"),
    ),
    subtotal: toNumber(subtotal),
    discountAmount: toNumber(discountAmount),
    taxAmount: toNumber(taxAmount),
    totalAmount: toNumber(totalAmount),
    paidAmount: toNumber(paidAmount),
    remainingAmount: toNumber(remainingAmount),
    issuedAt: String(getValue(obj, "issued_at") || getValue(obj, "issue_date") || ""),
    dueDate: String(getValue(obj, "due_date") || ""),
    paidAt: String(getValue(obj, "paid_at") || ""),
    cancelledAt: String(getValue(obj, "cancelled_at") || getValue(obj, "canceled_at") || ""),
    createdAt: String(getValue(obj, "created_at") || ""),
  };
}

function normalizeSummary(
  rows: InvoiceReportRow[],
  summary?: Partial<InvoicesReportSummary>,
): InvoicesReportSummary {
  const fallback: InvoicesReportSummary = {
    total_invoices: rows.length,
    draft_invoices: rows.filter((item) => item.status === "DRAFT").length,
    issued_invoices: rows.filter((item) => item.status === "ISSUED").length,
    partial_invoices: rows.filter((item) => item.status === "PARTIAL").length,
    paid_invoices: rows.filter((item) => item.status === "PAID").length,
    overdue_invoices: rows.filter((item) => item.status === "OVERDUE").length,
    cancelled_invoices: rows.filter((item) => item.status === "CANCELLED").length,
    void_invoices: rows.filter((item) => item.status === "VOID").length,
    unpaid_invoices: rows.filter((item) => item.paymentStatus === "UNPAID").length,
    refunded_invoices: rows.filter((item) => item.paymentStatus === "REFUNDED").length,
    subtotal_amount: rows.reduce((sum, item) => sum + item.subtotal, 0),
    discount_amount: rows.reduce((sum, item) => sum + item.discountAmount, 0),
    tax_amount: rows.reduce((sum, item) => sum + item.taxAmount, 0),
    total_amount: rows.reduce((sum, item) => sum + item.totalAmount, 0),
    paid_amount: rows.reduce((sum, item) => sum + item.paidAmount, 0),
    remaining_amount: rows.reduce((sum, item) => sum + item.remainingAmount, 0),
  };

  return {
    total_invoices: toNumber(summary?.total_invoices ?? fallback.total_invoices),
    draft_invoices: toNumber(summary?.draft_invoices ?? fallback.draft_invoices),
    issued_invoices: toNumber(summary?.issued_invoices ?? fallback.issued_invoices),
    partial_invoices: toNumber(summary?.partial_invoices ?? fallback.partial_invoices),
    paid_invoices: toNumber(summary?.paid_invoices ?? fallback.paid_invoices),
    overdue_invoices: toNumber(summary?.overdue_invoices ?? fallback.overdue_invoices),
    cancelled_invoices: toNumber(
      summary?.cancelled_invoices ?? fallback.cancelled_invoices,
    ),
    void_invoices: toNumber(summary?.void_invoices ?? fallback.void_invoices),
    unpaid_invoices: toNumber(summary?.unpaid_invoices ?? fallback.unpaid_invoices),
    refunded_invoices: toNumber(
      summary?.refunded_invoices ?? fallback.refunded_invoices,
    ),
    subtotal_amount: toNumber(summary?.subtotal_amount ?? fallback.subtotal_amount),
    discount_amount: toNumber(summary?.discount_amount ?? fallback.discount_amount),
    tax_amount: toNumber(summary?.tax_amount ?? fallback.tax_amount),
    total_amount: toNumber(summary?.total_amount ?? fallback.total_amount),
    paid_amount: toNumber(summary?.paid_amount ?? fallback.paid_amount),
    remaining_amount: toNumber(
      summary?.remaining_amount ?? fallback.remaining_amount,
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

function invoiceStatusLabel(status: InvoiceStatus, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<InvoiceStatus, string> = {
    DRAFT: t.draft,
    ISSUED: t.issued,
    PARTIAL: t.partial,
    PAID: t.paid,
    OVERDUE: t.overdue,
    CANCELLED: t.cancelled,
    VOID: t.void,
    UNKNOWN: t.unknown,
  };

  return labels[status];
}

function paymentStatusLabel(status: PaymentStatus, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<PaymentStatus, string> = {
    UNPAID: t.unpaid,
    PARTIAL: t.partial,
    PAID: t.paid,
    REFUNDED: t.refunded,
    FAILED: t.failed,
    UNKNOWN: t.unknown,
  };

  return labels[status];
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

function invoiceStatusBadge(status: InvoiceStatus, locale: AppLocale) {
  const label = invoiceStatusLabel(status, locale);

  if (status === "PAID" || status === "ISSUED") {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        {label}
      </Badge>
    );
  }

  if (status === "PARTIAL" || status === "DRAFT") {
    return (
      <Badge className="rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
        {label}
      </Badge>
    );
  }

  if (status === "OVERDUE") {
    return (
      <Badge className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
        {label}
      </Badge>
    );
  }

  if (status === "CANCELLED" || status === "VOID") {
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

function paymentStatusBadge(status: PaymentStatus, locale: AppLocale) {
  const label = paymentStatusLabel(status, locale);

  if (status === "PAID") {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
        {label}
      </Badge>
    );
  }

  if (status === "PARTIAL") {
    return (
      <Badge className="rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
        {label}
      </Badge>
    );
  }

  if (status === "FAILED" || status === "REFUNDED") {
    return (
      <Badge variant="destructive" className="rounded-full px-3 py-1">
        {label}
      </Badge>
    );
  }

  if (status === "UNPAID") {
    return (
      <Badge variant="outline" className="rounded-full px-3 py-1">
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
  rows: InvoiceReportRow[];
  summary: InvoicesReportSummary;
  t: ReturnType<typeof dictionary>;
}) {
  const isArabic = locale === "ar";
  const now = new Date().toLocaleString("en-US");

  const tableRows = rows
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.invoiceNumber || "-")}</td>
          <td>${escapeHtml(item.customerName || "-")}</td>
          <td>${escapeHtml(item.orderNumber || "-")}</td>
          <td>${escapeHtml(invoiceStatusLabel(item.status, locale))}</td>
          <td>${escapeHtml(paymentStatusLabel(item.paymentStatus, locale))}</td>
          <td>${escapeHtml(formatMoney(item.totalAmount))}</td>
          <td>${escapeHtml(formatMoney(item.paidAmount))}</td>
          <td>${escapeHtml(formatMoney(item.remainingAmount))}</td>
          <td>${escapeHtml(formatDate(item.issuedAt || item.createdAt))}</td>
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
          <div class="summary-card"><span>${escapeHtml(t.totalInvoices)}</span><strong>${formatNumber(summary.total_invoices)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.issuedInvoices)}</span><strong>${formatNumber(summary.issued_invoices)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.paidInvoices)}</span><strong>${formatNumber(summary.paid_invoices)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.totalAmount)}</span><strong>${formatMoney(summary.total_amount)}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${escapeHtml(t.table.invoice)}</th>
              <th>${escapeHtml(t.table.customer)}</th>
              <th>${escapeHtml(t.table.order)}</th>
              <th>${escapeHtml(t.table.status)}</th>
              <th>${escapeHtml(t.table.paymentStatus)}</th>
              <th>${escapeHtml(t.table.totalAmount)}</th>
              <th>${escapeHtml(t.table.paidAmount)}</th>
              <th>${escapeHtml(t.table.remainingAmount)}</th>
              <th>${escapeHtml(t.table.issuedAt)}</th>
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

export default function SystemInvoicesReportsPage() {
  const auth = useAuth() as unknown;

  const [locale, setLocale] = useState<AppLocale>("ar");
  const [rows, setRows] = useState<InvoiceReportRow[]>([]);
  const [summary, setSummary] =
    useState<InvoicesReportSummary>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");

  const t = useMemo(() => dictionary(locale), [locale]);
  const isArabic = locale === "ar";
  const authResolving = isAuthResolving(auth);

  const canViewReport = hasSafePermission(
    auth,
    ["reports.view", "reports.invoices.view", "invoices.view"],
    "view",
  );

  const canViewInvoiceDetails = hasSafePermission(
    auth,
    ["invoices.view", "invoices.detail"],
    "view",
  );

  const canExportReport = hasSafePermission(
    auth,
    ["reports.export", "reports.invoices.export", "invoices.export"],
    "action",
  );

  const canPrintReport = hasSafePermission(
    auth,
    ["reports.print", "reports.invoices.print"],
    "action",
  );

  const filteredRows = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return rows.filter((item) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : item.status === statusFilter;

      const matchesPayment =
        paymentFilter === "ALL" ? true : item.paymentStatus === paymentFilter;

      const matchesQuery = !cleanQuery
        ? true
        : [
            item.invoiceNumber,
            item.orderNumber,
            item.customerName,
            item.customerPhone,
            item.providerName,
            item.productName,
            invoiceStatusLabel(item.status, locale),
            paymentStatusLabel(item.paymentStatus, locale),
          ]
            .join(" ")
            .toLowerCase()
            .includes(cleanQuery);

      return matchesStatus && matchesPayment && matchesQuery;
    });
  }, [locale, paymentFilter, query, rows, statusFilter]);

  const filteredSummary = useMemo(
    () => normalizeSummary(filteredRows),
    [filteredRows],
  );

  const hasSearchOrFilter =
    query.trim().length > 0 ||
    statusFilter !== "ALL" ||
    paymentFilter !== "ALL";

  const statusOptions = useMemo(
    () => [
      { value: "ALL" as StatusFilter, label: t.allStatuses, count: rows.length },
      {
        value: "DRAFT" as StatusFilter,
        label: t.draft,
        count: rows.filter((item) => item.status === "DRAFT").length,
      },
      {
        value: "ISSUED" as StatusFilter,
        label: t.issued,
        count: rows.filter((item) => item.status === "ISSUED").length,
      },
      {
        value: "PARTIAL" as StatusFilter,
        label: t.partial,
        count: rows.filter((item) => item.status === "PARTIAL").length,
      },
      {
        value: "PAID" as StatusFilter,
        label: t.paid,
        count: rows.filter((item) => item.status === "PAID").length,
      },
      {
        value: "OVERDUE" as StatusFilter,
        label: t.overdue,
        count: rows.filter((item) => item.status === "OVERDUE").length,
      },
      {
        value: "CANCELLED" as StatusFilter,
        label: t.cancelled,
        count: rows.filter((item) => item.status === "CANCELLED").length,
      },
    ],
    [rows, t],
  );

  const paymentOptions = useMemo(
    () => [
      {
        value: "ALL" as PaymentFilter,
        label: t.allPaymentStatuses,
        count: rows.length,
      },
      {
        value: "UNPAID" as PaymentFilter,
        label: t.unpaid,
        count: rows.filter((item) => item.paymentStatus === "UNPAID").length,
      },
      {
        value: "PARTIAL" as PaymentFilter,
        label: t.partial,
        count: rows.filter((item) => item.paymentStatus === "PARTIAL").length,
      },
      {
        value: "PAID" as PaymentFilter,
        label: t.paid,
        count: rows.filter((item) => item.paymentStatus === "PAID").length,
      },
      {
        value: "REFUNDED" as PaymentFilter,
        label: t.refunded,
        count: rows.filter((item) => item.paymentStatus === "REFUNDED").length,
      },
      {
        value: "FAILED" as PaymentFilter,
        label: t.failed,
        count: rows.filter((item) => item.paymentStatus === "FAILED").length,
      },
    ],
    [rows, t],
  );

  const summaryCards = useMemo(
    () => [
      {
        title: t.totalInvoices,
        value: summary.total_invoices,
        icon: ReceiptText,
        helper: t.issuedInvoices,
        helperValue: formatNumber(summary.issued_invoices),
        percent: summary.total_invoices > 0 ? 100 : 0,
        isMoney: false,
      },
      {
        title: t.issuedInvoices,
        value: summary.issued_invoices,
        icon: FileText,
        helper: t.totalInvoices,
        helperValue: `${percent(
          summary.issued_invoices,
          summary.total_invoices,
        )}%`,
        percent: percent(summary.issued_invoices, summary.total_invoices),
        isMoney: false,
      },
      {
        title: t.paidInvoices,
        value: summary.paid_invoices,
        icon: CheckCircle2,
        helper: t.paidAmount,
        helperValue: formatMoney(summary.paid_amount),
        percent: percent(summary.paid_invoices, summary.total_invoices),
        isMoney: false,
      },
      {
        title: t.totalAmount,
        value: summary.total_amount,
        icon: Wallet,
        helper: t.remainingAmount,
        helperValue: formatMoney(summary.remaining_amount),
        percent: summary.total_amount > 0 ? 100 : 0,
        isMoney: true,
      },
    ],
    [summary, t],
  );

  const statusCards = useMemo(
    () => [
      {
        title: t.draft,
        value: summary.draft_invoices,
        icon: FileText,
        filter: "DRAFT" as StatusFilter,
        percent: percent(summary.draft_invoices, summary.total_invoices),
      },
      {
        title: t.issued,
        value: summary.issued_invoices,
        icon: ReceiptText,
        filter: "ISSUED" as StatusFilter,
        percent: percent(summary.issued_invoices, summary.total_invoices),
      },
      {
        title: t.paid,
        value: summary.paid_invoices,
        icon: CheckCircle2,
        filter: "PAID" as StatusFilter,
        percent: percent(summary.paid_invoices, summary.total_invoices),
      },
      {
        title: t.overdue,
        value: summary.overdue_invoices,
        icon: AlertTriangle,
        filter: "OVERDUE" as StatusFilter,
        percent: percent(summary.overdue_invoices, summary.total_invoices),
      },
    ],
    [summary, t],
  );

  const paymentCards = useMemo(
    () => [
      {
        title: t.unpaid,
        value: summary.unpaid_invoices,
        icon: Wallet,
        filter: "UNPAID" as PaymentFilter,
        percent: percent(summary.unpaid_invoices, summary.total_invoices),
      },
      {
        title: t.partial,
        value: summary.partial_invoices,
        icon: ReceiptText,
        filter: "PARTIAL" as PaymentFilter,
        percent: percent(summary.partial_invoices, summary.total_invoices),
      },
      {
        title: t.paid,
        value: summary.paid_invoices,
        icon: CheckCircle2,
        filter: "PAID" as PaymentFilter,
        percent: percent(summary.paid_invoices, summary.total_invoices),
      },
      {
        title: t.refunded,
        value: summary.refunded_invoices,
        icon: XCircle,
        filter: "REFUNDED" as PaymentFilter,
        percent: percent(summary.refunded_invoices, summary.total_invoices),
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
          "/api/reports/invoices/",
          "/api/invoices/?page_size=300",
        ];

        let loadedPayload: InvoicesReportResponse | null = null;
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
            | InvoicesReportResponse
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
            loadedPayload?.message || "Unable to load invoices report",
          );
        }

        const normalizedRows = extractRows(loadedPayload).map(normalizeInvoice);

        setRows(normalizedRows);
        setSummary(
          normalizeSummary(normalizedRows, extractSummary(loadedPayload)),
        );

        if (showToast) {
          toast.success(t.refreshSuccess);
        }
      } catch (error) {
        console.error("Invoices report load error:", error);
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
    setPaymentFilter("ALL");
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

    const paymentFilterLabel =
      paymentOptions.find((item) => item.value === paymentFilter)?.label ||
      t.all;

    downloadExcel({
      filename: `primey-care-invoices-report-${generatedAt
        .toISOString()
        .slice(0, 10)}.xls`,
      worksheetName: isArabic ? "تقرير الفواتير" : "Invoices Report",
      title: t.title,
      locale,
      summaryRows: [
        [t.generatedAt, generatedAt.toLocaleString("en-US")],
        [t.reportScope, t.currentFilteredData],
        [t.totalInvoices, filteredSummary.total_invoices],
        [t.issuedInvoices, filteredSummary.issued_invoices],
        [t.paidInvoices, filteredSummary.paid_invoices],
        [t.totalAmount, formatMoney(filteredSummary.total_amount)],
        [t.taxAmount, formatMoney(filteredSummary.tax_amount)],
        [t.discountAmount, formatMoney(filteredSummary.discount_amount)],
        [t.paidAmount, formatMoney(filteredSummary.paid_amount)],
        [t.remainingAmount, formatMoney(filteredSummary.remaining_amount)],
      ],
      filterRows: [
        [t.filterSearch, query || t.all],
        [t.filterStatus, statusFilterLabel],
        [t.filterPayment, paymentFilterLabel],
      ],
      headers: [
        "ID",
        t.table.invoice,
        t.table.order,
        t.table.customer,
        t.table.provider,
        t.table.product,
        t.table.status,
        t.table.paymentStatus,
        t.table.subtotal,
        t.table.discount,
        t.table.tax,
        t.table.totalAmount,
        t.table.paidAmount,
        t.table.remainingAmount,
        t.table.issuedAt,
        t.table.dueDate,
        t.table.paidAt,
        t.table.createdAt,
      ],
      rows: filteredRows.map((item) => [
        item.id || "-",
        item.invoiceNumber || "-",
        item.orderNumber || item.orderId || "-",
        item.customerName || "-",
        item.providerName || "-",
        item.productName || "-",
        invoiceStatusLabel(item.status, locale),
        paymentStatusLabel(item.paymentStatus, locale),
        formatMoney(item.subtotal),
        formatMoney(item.discountAmount),
        formatMoney(item.taxAmount),
        formatMoney(item.totalAmount),
        formatMoney(item.paidAmount),
        formatMoney(item.remainingAmount),
        formatDate(item.issuedAt),
        formatDate(item.dueDate),
        formatDate(item.paidAt),
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

            <CardContent className="grid gap-4 md:grid-cols-5">
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.totalAmount}</p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.total_amount} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.paidAmount}</p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.paid_amount} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.remainingAmount}
                </p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.remaining_amount} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">{t.taxAmount}</p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.tax_amount} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.discountAmount}
                </p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.discount_amount} />
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
                {isLoading
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="space-y-3 rounded-xl border bg-background/70 p-3"
                      >
                        <SkeletonLine className="h-7 w-14" />
                        <SkeletonLine className="h-4 w-20" />
                        <SkeletonLine className="h-2 w-full" />
                      </div>
                    ))
                  : statusCards.map((card) => {
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
                {t.paymentDistributionTitle}
              </CardTitle>
              <CardDescription>{t.paymentDistributionDesc}</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {isLoading
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="space-y-3 rounded-xl border bg-background/70 p-3"
                      >
                        <SkeletonLine className="h-7 w-14" />
                        <SkeletonLine className="h-4 w-20" />
                        <SkeletonLine className="h-2 w-full" />
                      </div>
                    ))
                  : paymentCards.map((card) => {
                      const Icon = card.icon;

                      return (
                        <button
                          key={card.filter}
                          type="button"
                          className="space-y-2 rounded-xl border bg-background/70 p-3 text-start transition hover:bg-muted/40"
                          onClick={() => setPaymentFilter(card.filter)}
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
                    {paymentOptions.map((item) => {
                      const isSelected = paymentFilter === item.value;

                      return (
                        <Button
                          key={item.value}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          className="h-10 rounded-xl"
                          onClick={() => setPaymentFilter(item.value)}
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
                        <TableHead>{t.table.invoice}</TableHead>
                        <TableHead>{t.table.customer}</TableHead>
                        <TableHead>{t.table.order}</TableHead>
                        <TableHead>{t.table.provider}</TableHead>
                        <TableHead>{t.table.status}</TableHead>
                        <TableHead>{t.table.paymentStatus}</TableHead>
                        <TableHead>{t.table.totalAmount}</TableHead>
                        <TableHead>{t.table.paidAmount}</TableHead>
                        <TableHead>{t.table.remainingAmount}</TableHead>
                        <TableHead>{t.table.tax}</TableHead>
                        <TableHead>{t.table.issuedAt}</TableHead>
                        {canViewInvoiceDetails ? (
                          <TableHead>{t.table.action}</TableHead>
                        ) : null}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {isLoading ? (
                        <TableRowsSkeleton
                          columnsCount={canViewInvoiceDetails ? 12 : 11}
                        />
                      ) : filteredRows.length > 0 ? (
                        filteredRows.map((item) => (
                          <TableRow key={`${item.id}-${item.invoiceNumber}`}>
                            <TableCell>
                              <div className="flex min-w-[180px] items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                                  <ReceiptText className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-medium">
                                    {item.invoiceNumber || "-"}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {formatDate(item.issuedAt || item.createdAt)}
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
                                {item.orderNumber || item.orderId || "-"}
                              </span>
                            </TableCell>

                            <TableCell>
                              <span className="min-w-[150px] whitespace-nowrap">
                                {item.providerName || "-"}
                              </span>
                            </TableCell>

                            <TableCell>
                              {invoiceStatusBadge(item.status, locale)}
                            </TableCell>

                            <TableCell>
                              {paymentStatusBadge(item.paymentStatus, locale)}
                            </TableCell>

                            <TableCell>
                              <MoneyText value={item.totalAmount} />
                            </TableCell>

                            <TableCell>
                              <MoneyText value={item.paidAmount} />
                            </TableCell>

                            <TableCell>
                              <MoneyText value={item.remainingAmount} />
                            </TableCell>

                            <TableCell>
                              <MoneyText value={item.taxAmount} />
                            </TableCell>

                            <TableCell>
                              <span className="whitespace-nowrap">
                                {formatDate(item.issuedAt || item.createdAt)}
                              </span>
                            </TableCell>

                            {canViewInvoiceDetails ? (
                              <TableCell>
                                {isValidId(item.id) ? (
                                  <Link href={`/system/invoices/${item.id}`}>
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
                            colSpan={canViewInvoiceDetails ? 12 : 11}
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