"use client";

/* ============================================================
   📂 app/system/reports/page.tsx
   🧠 Primey Care | Central Reports Overview
============================================================ */

import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Calculator,
  CreditCard,
  Download,
  FileBarChart,
  Landmark,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCcw,
  Search,
  ShoppingCart,
  Stethoscope,
  Truck,
  Users,
  WalletCards,
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

/* ============================================================
   Types
============================================================ */

type AppLocale = "ar" | "en";
type Dict = Record<string, unknown>;

type ReportKey =
  | "accounting"
  | "customers"
  | "invoices"
  | "orders"
  | "payments"
  | "providers"
  | "treasury";

type ReportsSummary = {
  total_customers: number;
  total_providers: number;
  total_orders: number;
  total_invoices: number;
  total_payments: number;

  total_revenue: number;
  total_paid: number;
  total_outstanding: number;

  accounting_entries: number;
  posted_entries: number;

  pending_invoices: number;
  confirmed_payments: number;

  treasury_accounts: number;
  treasury_transactions: number;
  treasury_balance: number;
  treasury_cash_balance: number;
  treasury_bank_balance: number;

  total_order_items: number;
  confirmed_orders: number;
  card_ready_orders: number;
  assigned_for_delivery_orders: number;
  out_for_delivery_orders: number;
  delivered_orders: number;
  completed_orders: number;

  cod_orders: number;
  cod_collected_orders: number;
  cod_pending_orders: number;
  cash_collected_amount: number;
  cash_pending_collection_amount: number;
};

type ReportCard = {
  key: ReportKey;
  href: string;
  icon: ReactNode;
  permissionCodes: string[];
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  metricKey: keyof ReportsSummary;
  money?: boolean;
};

type ApiEnvelope<T> = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  detail?: string;
  error?: string;
  data?: T;
  summary?: Partial<ReportsSummary>;
  stats?: Partial<ReportsSummary>;
  totals?: Partial<ReportsSummary>;
  results?: unknown;
};

const SAR_ICON_PATH = "/currency/sar.svg";

const DEFAULT_SUMMARY: ReportsSummary = {
  total_customers: 0,
  total_providers: 0,
  total_orders: 0,
  total_invoices: 0,
  total_payments: 0,

  total_revenue: 0,
  total_paid: 0,
  total_outstanding: 0,

  accounting_entries: 0,
  posted_entries: 0,

  pending_invoices: 0,
  confirmed_payments: 0,

  treasury_accounts: 0,
  treasury_transactions: 0,
  treasury_balance: 0,
  treasury_cash_balance: 0,
  treasury_bank_balance: 0,

  total_order_items: 0,
  confirmed_orders: 0,
  card_ready_orders: 0,
  assigned_for_delivery_orders: 0,
  out_for_delivery_orders: 0,
  delivered_orders: 0,
  completed_orders: 0,

  cod_orders: 0,
  cod_collected_orders: 0,
  cod_pending_orders: 0,
  cash_collected_amount: 0,
  cash_pending_collection_amount: 0,
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

function hasAnyPermission(
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
          "order_manager",
          "orders_manager",
        ].includes(role),
      );
    }

    return roles.some((role) =>
      [
        "system_admin",
        "superuser",
        "super_admin",
        "accountant",
        "order_manager",
        "orders_manager",
      ].includes(role),
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
    title: isArabic ? "التقارير المركزية" : "Central Reports",
    subtitle: isArabic
      ? "مركز موحد للوصول إلى تقارير العملاء وشبكة الخدمة والطلبات والفواتير والمدفوعات والخزينة والمحاسبة."
      : "A unified hub for customer, service network, orders, invoices, payments, treasury, and accounting reports.",

    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    exportExcel: isArabic ? "تصدير Excel" : "Export Excel",
    print: isArabic ? "طباعة PDF" : "Print PDF",

    totalRevenue: isArabic ? "إجمالي الإيراد" : "Total Revenue",
    totalPaid: isArabic ? "إجمالي المدفوع" : "Total Paid",
    totalOutstanding: isArabic ? "المبالغ المستحقة" : "Outstanding",
    totalOrders: isArabic ? "إجمالي الطلبات" : "Total Orders",

    totalCustomers: isArabic ? "العملاء" : "Customers",
    totalProviders: isArabic ? "مقدمو الخدمة" : "Providers",
    totalInvoices: isArabic ? "الفواتير" : "Invoices",
    totalPayments: isArabic ? "المدفوعات" : "Payments",

    accountingEntries: isArabic ? "القيود المحاسبية" : "Accounting Entries",
    postedEntries: isArabic ? "قيود مرحلة" : "Posted Entries",

    pendingInvoices: isArabic ? "فواتير معلقة" : "Pending Invoices",
    confirmedPayments: isArabic ? "مدفوعات مؤكدة" : "Confirmed Payments",

    treasuryAccounts: isArabic ? "حسابات الخزينة" : "Treasury Accounts",
    treasuryTransactions: isArabic ? "حركات الخزينة" : "Treasury Transactions",
    treasuryBalance: isArabic ? "رصيد الخزينة" : "Treasury Balance",
    cashBalance: isArabic ? "رصيد الصناديق" : "Cash Balance",
    bankBalance: isArabic ? "رصيد البنوك" : "Bank Balance",

    orderOperations: isArabic ? "تشغيل الطلبات والتوصيل" : "Order Operations",
    totalOrderItems: isArabic ? "بنود الطلبات" : "Order Items",
    confirmedOrders: isArabic ? "طلبات مؤكدة" : "Confirmed Orders",
    cardReadyOrders: isArabic ? "بطاقات جاهزة للتوصيل" : "Cards Ready",
    assignedForDelivery: isArabic ? "مسندة للتوصيل" : "Assigned for Delivery",
    outForDelivery: isArabic ? "خارج للتوصيل" : "Out for Delivery",
    deliveredOrders: isArabic ? "تم التسليم" : "Delivered",
    completedOrders: isArabic ? "مكتملة" : "Completed",

    codOrders: isArabic ? "طلبات الدفع عند الاستلام" : "COD Orders",
    codCollectedOrders: isArabic ? "طلبات COD محصلة" : "Collected COD Orders",
    codPendingOrders: isArabic ? "طلبات COD بانتظار التحصيل" : "Pending COD Orders",
    cashCollected: isArabic ? "الكاش المحصل" : "Cash Collected",
    cashPendingCollection: isArabic
      ? "الكاش بانتظار التحصيل"
      : "Cash Pending Collection",
    custodyHint: isArabic
      ? "مبالغ الدفع عند الاستلام تعتبر عهدة على مندوب التوصيل حتى تتم التسوية المالية."
      : "Cash on delivery amounts remain as delivery agent custody until financial settlement.",

    reportsTitle: isArabic ? "تقارير النظام" : "System Reports",
    reportsDesc: isArabic
      ? "اختر التقرير المطلوب لفتح صفحة التقرير التفصيلية."
      : "Choose a report to open its detailed page.",

    searchPlaceholder: isArabic
      ? "ابحث باسم التقرير..."
      : "Search reports by name...",

    openReport: isArabic ? "فتح التقرير" : "Open Report",

    noReportsTitle: isArabic ? "لا توجد تقارير مطابقة" : "No matching reports",
    noReportsText: isArabic
      ? "جرّب تغيير كلمات البحث أو راجع الصلاحيات."
      : "Try changing your search terms or review permissions.",

    accessDeniedTitle: isArabic ? "غير مصرح بعرض التقارير" : "Access denied",
    accessDeniedText: isArabic
      ? "لا تملك صلاحية عرض التقارير المركزية. تواصل مع مسؤول النظام إذا كنت تحتاج الوصول."
      : "You do not have permission to view central reports. Contact your system administrator if you need access.",

    loadError: isArabic
      ? "تعذر تحميل ملخص التقارير."
      : "Unable to load reports summary.",
    loadErrorHint: isArabic
      ? "يمكنك الاستمرار بفتح صفحات التقارير المتاحة، أو إعادة المحاولة لتحديث الملخص."
      : "You can still open available report pages, or retry to refresh the summary.",
    loadSuccess: isArabic
      ? "تم تحديث ملخص التقارير."
      : "Reports summary refreshed.",

    exportSuccess: isArabic ? "تم تجهيز ملف Excel." : "Excel file prepared.",
    exportEmpty: isArabic
      ? "لا توجد بيانات قابلة للتصدير."
      : "No data available to export.",
    printSuccess: isArabic ? "تم تجهيز نافذة الطباعة." : "Print window prepared.",
    printError: isArabic
      ? "تعذر فتح نافذة الطباعة."
      : "Unable to open print window.",

    generatedAt: isArabic ? "تاريخ التصدير" : "Generated At",
    printedAt: isArabic ? "تاريخ الطباعة" : "Printed At",
    available: isArabic ? "متاح" : "Available",

    excelReport: isArabic ? "التقرير" : "Report",
    excelDescription: isArabic ? "الوصف" : "Description",
    excelMetric: isArabic ? "المؤشر" : "Metric",
  };
}

/* ============================================================
   Helpers
============================================================ */

function toNumber(value: unknown): number {
  if (typeof value === "string") {
    const cleaned = value.replaceAll(",", "").trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickNumber(source: Dict, keys: string[]): number {
  for (const key of keys) {
    const value = toNumber(source[key]);

    if (value !== 0) return value;
  }

  return 0;
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

function escapeHtml(value: string | number) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function extractSummary(payload: ApiEnvelope<unknown> | null): Dict {
  if (!payload) return {};

  const data = asDict(payload.data);
  const results = asDict(payload.results);

  return {
    ...asDict(payload.summary),
    ...asDict(payload.stats),
    ...asDict(payload.totals),

    ...asDict(data.summary),
    ...asDict(data.stats),
    ...asDict(data.totals),
    ...asDict(data.overview),
    ...asDict(data.orders),
    ...asDict(data.financials),
    ...asDict(data.treasury),
    ...asDict(data.accounting),
    ...data,

    ...asDict(results.summary),
    ...asDict(results.stats),
    ...asDict(results.totals),
  };
}

function buildSummary(apiSummary?: Dict): ReportsSummary {
  const api = asDict(apiSummary);

  const cashCollectedAmount = pickNumber(api, [
    "cash_collected_amount",
    "cod_collected_amount",
    "total_cash_collected",
    "total_cod_collected",
    "collected_cod_amount",
    "collected_cash_amount",
  ]);

  const cashPendingCollectionAmount = pickNumber(api, [
    "cash_pending_collection_amount",
    "cod_pending_collection_amount",
    "pending_cash_collection_amount",
    "pending_cod_amount",
    "uncollected_cod_amount",
  ]);

  const codOrders = pickNumber(api, [
    "cod_orders",
    "cash_on_delivery_orders",
    "cash_on_delivery_orders_count",
    "cod_orders_count",
  ]);

  const codCollectedOrders = pickNumber(api, [
    "cod_collected_orders",
    "cash_collected_orders",
    "collected_cod_orders",
    "cod_paid_orders",
  ]);

  const codPendingOrders =
    pickNumber(api, [
      "cod_pending_orders",
      "cash_pending_orders",
      "pending_cod_orders",
      "pending_cash_collection_orders",
      "cod_uncollected_orders",
    ]) || Math.max(codOrders - codCollectedOrders, 0);

  return {
    total_customers: pickNumber(api, ["total_customers", "customers_count"]),
    total_providers: pickNumber(api, [
      "total_providers",
      "providers_count",
      "centers_count",
      "service_network_count",
    ]),
    total_orders: pickNumber(api, ["total_orders", "orders_count"]),
    total_invoices: pickNumber(api, ["total_invoices", "invoices_count"]),
    total_payments: pickNumber(api, ["total_payments", "payments_count"]),

    total_revenue: pickNumber(api, [
      "total_revenue",
      "revenue_total",
      "total_amount",
      "orders_total_amount",
      "invoices_total_amount",
    ]),
    total_paid: pickNumber(api, [
      "total_paid",
      "paid_amount",
      "total_paid_amount",
      "payments_total_amount",
    ]),
    total_outstanding: pickNumber(api, [
      "total_outstanding",
      "outstanding_amount",
      "remaining_amount",
      "total_remaining_amount",
    ]),

    accounting_entries: pickNumber(api, [
      "accounting_entries",
      "journal_entries_count",
      "entries_count",
    ]),
    posted_entries: pickNumber(api, [
      "posted_entries",
      "posted_entries_count",
      "posted_journal_entries_count",
    ]),

    pending_invoices: pickNumber(api, [
      "pending_invoices",
      "pending_invoices_count",
      "draft_invoices_count",
    ]),
    confirmed_payments: pickNumber(api, [
      "confirmed_payments",
      "confirmed_payments_count",
      "paid_payments_count",
    ]),

    treasury_accounts: pickNumber(api, [
      "treasury_accounts",
      "treasury_accounts_count",
    ]) || pickNumber(api, ["cashboxes_count"]) + pickNumber(api, ["banks_count"]),
    treasury_transactions: pickNumber(api, [
      "treasury_transactions",
      "treasury_transactions_count",
      "transactions_count",
    ]),
    treasury_balance: pickNumber(api, [
      "treasury_balance",
      "total_treasury_balance",
      "total_balance",
    ]),
    treasury_cash_balance: pickNumber(api, [
      "treasury_cash_balance",
      "cash_balance",
      "total_cash_balance",
    ]),
    treasury_bank_balance: pickNumber(api, [
      "treasury_bank_balance",
      "bank_balance",
      "total_bank_balance",
    ]),

    total_order_items: pickNumber(api, [
      "total_order_items",
      "order_items_count",
      "items_count",
    ]),
    confirmed_orders: pickNumber(api, [
      "confirmed_orders",
      "confirmed_orders_count",
    ]),
    card_ready_orders: pickNumber(api, [
      "card_ready_orders",
      "card_ready_orders_count",
      "ready_for_delivery_orders",
      "ready_for_delivery_orders_count",
    ]),
    assigned_for_delivery_orders: pickNumber(api, [
      "assigned_for_delivery_orders",
      "assigned_for_delivery_orders_count",
      "delivery_assigned_orders",
      "delivery_assigned_orders_count",
    ]),
    out_for_delivery_orders: pickNumber(api, [
      "out_for_delivery_orders",
      "out_for_delivery_orders_count",
    ]),
    delivered_orders: pickNumber(api, [
      "delivered_orders",
      "delivered_orders_count",
    ]),
    completed_orders: pickNumber(api, [
      "completed_orders",
      "completed_orders_count",
    ]),

    cod_orders: codOrders,
    cod_collected_orders: codCollectedOrders,
    cod_pending_orders: codPendingOrders,
    cash_collected_amount: cashCollectedAmount,
    cash_pending_collection_amount: cashPendingCollectionAmount,
  };
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

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-muted ${className}`} />;
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
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

      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <SkeletonLine key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function reportTitle(report: ReportCard, locale: AppLocale) {
  return locale === "ar" ? report.titleAr : report.titleEn;
}

function reportDescription(report: ReportCard, locale: AppLocale) {
  return locale === "ar" ? report.descriptionAr : report.descriptionEn;
}

/* ============================================================
   Export / Print
============================================================ */

function downloadExcel({
  filename,
  title,
  locale,
  summary,
  reports,
}: {
  filename: string;
  title: string;
  locale: AppLocale;
  summary: ReportsSummary;
  reports: ReportCard[];
}) {
  const isArabic = locale === "ar";
  const dir = isArabic ? "rtl" : "ltr";
  const align = isArabic ? "right" : "left";
  const t = dictionary(locale);

  const rowsHtml = reports
    .map((report) => {
      const value = summary[report.metricKey];
      const formatted = report.money ? formatMoney(value) : formatNumber(value);

      return `
        <tr>
          <td>${escapeHtml(reportTitle(report, locale))}</td>
          <td>${escapeHtml(reportDescription(report, locale))}</td>
          <td>${escapeHtml(formatted)}</td>
        </tr>`;
    })
    .join("");

  const workbook = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
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
          th { background: #d8ecfb; font-weight: 700; }
          .title { font-size: 20px; font-weight: 700; text-align: center; background: #fff; }
          .section { font-weight: 700; background: #eef6ff; }
          .summary-label { font-weight: 700; background: #f8fafc; width: 260px; }
        </style>
      </head>
      <body dir="${dir}">
        <table>
          <tr><td class="title" colspan="3">${escapeHtml(title)}</td></tr>
          <tr><td colspan="3"></td></tr>
          <tr><td class="section" colspan="3">${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString("en-US"))}</td></tr>

          <tr><td class="summary-label">${escapeHtml(t.totalRevenue)}</td><td colspan="2">${escapeHtml(formatMoney(summary.total_revenue))}</td></tr>
          <tr><td class="summary-label">${escapeHtml(t.totalPaid)}</td><td colspan="2">${escapeHtml(formatMoney(summary.total_paid))}</td></tr>
          <tr><td class="summary-label">${escapeHtml(t.treasuryBalance)}</td><td colspan="2">${escapeHtml(formatMoney(summary.treasury_balance))}</td></tr>
          <tr><td class="summary-label">${escapeHtml(t.totalOrders)}</td><td colspan="2">${escapeHtml(formatNumber(summary.total_orders))}</td></tr>
          <tr><td class="summary-label">${escapeHtml(t.deliveredOrders)}</td><td colspan="2">${escapeHtml(formatNumber(summary.delivered_orders))}</td></tr>
          <tr><td class="summary-label">${escapeHtml(t.cashCollected)}</td><td colspan="2">${escapeHtml(formatMoney(summary.cash_collected_amount))}</td></tr>
          <tr><td class="summary-label">${escapeHtml(t.cashPendingCollection)}</td><td colspan="2">${escapeHtml(formatMoney(summary.cash_pending_collection_amount))}</td></tr>

          <tr><td colspan="3"></td></tr>
          <tr>
            <th>${escapeHtml(t.excelReport)}</th>
            <th>${escapeHtml(t.excelDescription)}</th>
            <th>${escapeHtml(t.excelMetric)}</th>
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
  summary,
  reports,
}: {
  locale: AppLocale;
  title: string;
  summary: ReportsSummary;
  reports: ReportCard[];
}) {
  const isArabic = locale === "ar";
  const t = dictionary(locale);

  const rows = reports
    .map((report) => {
      const value = summary[report.metricKey];
      const formatted = report.money ? formatMoney(value) : formatNumber(value);

      return `
        <tr>
          <td>${escapeHtml(reportTitle(report, locale))}</td>
          <td>${escapeHtml(reportDescription(report, locale))}</td>
          <td>${escapeHtml(formatted)}</td>
        </tr>`;
    })
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
          .header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          h1 { margin: 0; font-size: 22px; font-weight: 800; }
          .meta { margin-top: 8px; color: #6b7280; font-size: 12px; }
          .badge {
            border: 1px solid #d1d5db;
            border-radius: 999px;
            padding: 5px 12px;
            font-size: 12px;
            height: fit-content;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 18px;
          }
          .box {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 10px;
          }
          .box span { color: #6b7280; display: block; font-size: 11px; }
          .box strong { display: block; margin-top: 6px; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
          th { background: #f3f4f6; font-weight: 700; }
          th, td {
            border: 1px solid #e5e7eb;
            padding: 8px;
            text-align: ${isArabic ? "right" : "left"};
          }
          @page { size: A4 landscape; margin: 12mm; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>${escapeHtml(title)}</h1>
            <div class="meta">${escapeHtml(t.printedAt)}: ${escapeHtml(new Date().toLocaleString("en-US"))}</div>
          </div>
          <div class="badge">Primey Care</div>
        </div>

        <div class="grid">
          <div class="box"><span>${escapeHtml(t.totalRevenue)}</span><strong>${escapeHtml(formatMoney(summary.total_revenue))}</strong></div>
          <div class="box"><span>${escapeHtml(t.totalPaid)}</span><strong>${escapeHtml(formatMoney(summary.total_paid))}</strong></div>
          <div class="box"><span>${escapeHtml(t.cashCollected)}</span><strong>${escapeHtml(formatMoney(summary.cash_collected_amount))}</strong></div>
          <div class="box"><span>${escapeHtml(t.totalOrders)}</span><strong>${escapeHtml(formatNumber(summary.total_orders))}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${escapeHtml(t.excelReport)}</th>
              <th>${escapeHtml(t.excelDescription)}</th>
              <th>${escapeHtml(t.excelMetric)}</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="3">${escapeHtml(t.noReportsTitle)}</td></tr>`}</tbody>
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
   Reports
============================================================ */

function getReportCards(): ReportCard[] {
  return [
    {
      key: "orders",
      href: "/system/reports/orders",
      icon: <ShoppingCart className="h-5 w-5" />,
      permissionCodes: ["reports.view", "reports.orders.view", "orders.view"],
      titleAr: "تقرير الطلبات",
      titleEn: "Orders Report",
      descriptionAr: "متابعة دورة الطلب والحالات والتوصيل والتحصيل.",
      descriptionEn: "Order lifecycle, statuses, delivery, and collection.",
      metricKey: "total_orders",
    },
    {
      key: "customers",
      href: "/system/reports/customers",
      icon: <Users className="h-5 w-5" />,
      permissionCodes: ["reports.view", "reports.customers.view", "customers.view"],
      titleAr: "تقرير العملاء",
      titleEn: "Customers Report",
      descriptionAr: "تحليل العملاء والنشاط والطلبات والمدفوعات.",
      descriptionEn: "Customer activity, orders, and payments analysis.",
      metricKey: "total_customers",
    },
    {
      key: "providers",
      href: "/system/reports/providers",
      icon: <Stethoscope className="h-5 w-5" />,
      permissionCodes: [
        "reports.view",
        "reports.providers.view",
        "providers.view",
        "centers.view",
      ],
      titleAr: "تقرير شبكة الخدمة",
      titleEn: "Service Network Report",
      descriptionAr: "تحليل مقدمي الخدمة والمراكز والعقود.",
      descriptionEn: "Providers, centers, and contracts analysis.",
      metricKey: "total_providers",
    },
    {
      key: "invoices",
      href: "/system/reports/invoices",
      icon: <ReceiptText className="h-5 w-5" />,
      permissionCodes: ["reports.view", "reports.invoices.view", "invoices.view"],
      titleAr: "تقرير الفواتير",
      titleEn: "Invoices Report",
      descriptionAr: "تحليل الفواتير والإصدار والمستحقات.",
      descriptionEn: "Invoice issuance and outstanding analysis.",
      metricKey: "total_invoices",
    },
    {
      key: "payments",
      href: "/system/reports/payments",
      icon: <CreditCard className="h-5 w-5" />,
      permissionCodes: ["reports.view", "reports.payments.view", "payments.view"],
      titleAr: "تقرير المدفوعات",
      titleEn: "Payments Report",
      descriptionAr: "تحليل الدفعات وطرق الدفع والتأكيد.",
      descriptionEn: "Payments, methods, and confirmations analysis.",
      metricKey: "total_payments",
    },
    {
      key: "treasury",
      href: "/system/reports/treasury",
      icon: <Landmark className="h-5 w-5" />,
      permissionCodes: [
        "reports.view",
        "reports.treasury.view",
        "treasury.view",
        "treasury.reports.view",
      ],
      titleAr: "تقرير الخزينة",
      titleEn: "Treasury Report",
      descriptionAr: "ملخص الصناديق والبنوك والحركات المالية والأرصدة.",
      descriptionEn: "Cashboxes, banks, transactions, and treasury balances.",
      metricKey: "treasury_balance",
      money: true,
    },
    {
      key: "accounting",
      href: "/system/reports/accounting",
      icon: <Calculator className="h-5 w-5" />,
      permissionCodes: [
        "reports.view",
        "reports.accounting.view",
        "accounting.view",
      ],
      titleAr: "تقرير المحاسبة",
      titleEn: "Accounting Report",
      descriptionAr: "ملخص القيود والترحيل والأثر المالي.",
      descriptionEn: "Journal entries, posting, and financial impact.",
      metricKey: "accounting_entries",
    },
  ];
}

/* ============================================================
   Page
============================================================ */

export default function SystemReportsPage() {
  const auth = useAuth() as unknown;

  const [locale, setLocale] = useState<AppLocale>("ar");
  const [summary, setSummary] = useState<ReportsSummary>(DEFAULT_SUMMARY);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const t = useMemo(() => dictionary(locale), [locale]);
  const isArabic = locale === "ar";
  const authResolving = isAuthResolving(auth);

  const allReports = useMemo(() => getReportCards(), []);

  const permittedReports = useMemo(
    () =>
      allReports.filter((report) =>
        hasAnyPermission(auth, report.permissionCodes, "view"),
      ),
    [allReports, auth],
  );

  const canView =
    hasAnyPermission(auth, ["reports.view"], "view") || permittedReports.length > 0;

  const canExport = hasAnyPermission(
    auth,
    ["reports.export", "reports.view"],
    "action",
  );

  const canPrint = hasAnyPermission(
    auth,
    ["reports.print", "reports.view"],
    "action",
  );

  const filteredReports = useMemo(() => {
    const clean = query.trim().toLowerCase();

    if (!clean) return permittedReports;

    return permittedReports.filter((report) =>
      [
        report.titleAr,
        report.titleEn,
        report.descriptionAr,
        report.descriptionEn,
        report.key,
      ]
        .join(" ")
        .toLowerCase()
        .includes(clean),
    );
  }, [permittedReports, query]);

  const hasReports = filteredReports.length > 0;

  const loadReports = useCallback(
    async (showToast = false) => {
      if (!canView) {
        setSummary(DEFAULT_SUMMARY);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage("");

        const payload = await loadFirstAvailable([
          "/api/reports/overview/",
          "/api/reports/",
        ]);

        if (!payload) {
          throw new Error(t.loadError);
        }

        setSummary(buildSummary(extractSummary(payload)));

        if (showToast) toast.success(t.loadSuccess);
      } catch (error) {
        console.error("Reports overview load error:", error);
        setSummary(DEFAULT_SUMMARY);
        setErrorMessage(t.loadError);
        toast.error(t.loadError);
      } finally {
        setIsLoading(false);
      }
    },
    [canView, t.loadError, t.loadSuccess],
  );

  function exportExcel() {
    if (!canExport) return;

    if (filteredReports.length === 0) {
      toast.error(t.exportEmpty);
      return;
    }

    downloadExcel({
      filename: `primey-care-reports-${new Date().toISOString().slice(0, 10)}.xls`,
      title: t.title,
      locale,
      summary,
      reports: filteredReports,
    });

    toast.success(t.exportSuccess);
  }

  function printPage() {
    if (!canPrint) return;

    if (filteredReports.length === 0) {
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
        summary,
        reports: filteredReports,
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
    loadReports(false);
  }, [authResolving, loadReports]);

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

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t.subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            className="h-10 rounded-xl"
            onClick={() => loadReports(true)}
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
              disabled={isLoading || !hasReports}
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
              disabled={isLoading || !hasReports}
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
              onClick={() => loadReports(true)}
            >
              <RefreshCcw className="h-4 w-4" />
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <PageSkeleton />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title={t.totalRevenue}
              value={<MoneyText value={summary.total_revenue} />}
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <KpiCard
              title={t.totalPaid}
              value={<MoneyText value={summary.total_paid} />}
              icon={<WalletCards className="h-5 w-5" />}
            />
            <KpiCard
              title={t.cashCollected}
              value={<MoneyText value={summary.cash_collected_amount} />}
              icon={<WalletCards className="h-5 w-5" />}
            />
            <KpiCard
              title={t.totalOrders}
              value={formatNumber(summary.total_orders)}
              icon={<ShoppingCart className="h-5 w-5" />}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MiniStat title={t.totalCustomers} value={summary.total_customers} />
            <MiniStat title={t.totalProviders} value={summary.total_providers} />
            <MiniStat title={t.totalInvoices} value={summary.total_invoices} />
            <MiniStat title={t.totalPayments} value={summary.total_payments} />
          </div>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardContent className="p-4">
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
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold">
                    {t.reportsTitle}
                  </CardTitle>
                  <CardDescription>{t.reportsDesc}</CardDescription>
                </div>

                <Badge variant="outline" className="rounded-full">
                  <FileBarChart className="h-3.5 w-3.5" />
                  {formatNumber(filteredReports.length)} {t.available}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              {filteredReports.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredReports.map((report) => (
                    <Link key={report.key} href={report.href}>
                      <Card className="h-full rounded-2xl border bg-background/70 shadow-sm transition hover:bg-muted/40">
                        <CardContent className="flex h-full flex-col gap-4 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                              {report.icon}
                            </div>

                            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                          </div>

                          <div>
                            <p className="font-semibold">
                              {reportTitle(report, locale)}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {reportDescription(report, locale)}
                            </p>
                          </div>

                          <div className="mt-auto flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 text-sm">
                            <span className="text-muted-foreground">
                              {t.openReport}
                            </span>
                            <span className="font-bold">
                              {report.money ? (
                                <MoneyText value={summary[report.metricKey]} />
                              ) : (
                                formatNumber(summary[report.metricKey])
                              )}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                  <FileBarChart className="h-12 w-12 text-muted-foreground/40" />
                  <p className="text-lg font-semibold">{t.noReportsTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.noReportsText}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold">
                    {t.orderOperations}
                  </CardTitle>
                  <CardDescription>{t.custodyHint}</CardDescription>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Truck className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MiniStat title={t.confirmedOrders} value={summary.confirmed_orders} />
              <MiniStat title={t.cardReadyOrders} value={summary.card_ready_orders} />
              <MiniStat
                title={t.assignedForDelivery}
                value={summary.assigned_for_delivery_orders}
              />
              <MiniStat
                title={t.outForDelivery}
                value={summary.out_for_delivery_orders}
              />
              <MiniStat title={t.deliveredOrders} value={summary.delivered_orders} />
              <MiniStat title={t.completedOrders} value={summary.completed_orders} />
              <MiniStat title={t.totalOrderItems} value={summary.total_order_items} />
              <MiniStat title={t.codOrders} value={summary.cod_orders} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MiniStat title={t.codCollectedOrders} value={summary.cod_collected_orders} />
            <MiniStat title={t.codPendingOrders} value={summary.cod_pending_orders} />
            <MiniMoneyStat
              title={t.cashCollected}
              value={summary.cash_collected_amount}
            />
            <MiniMoneyStat
              title={t.cashPendingCollection}
              value={summary.cash_pending_collection_amount}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MiniStat title={t.accountingEntries} value={summary.accounting_entries} />
            <MiniStat title={t.postedEntries} value={summary.posted_entries} />
            <MiniStat
              title={t.treasuryAccounts}
              value={summary.treasury_accounts}
            />
            <MiniStat
              title={t.treasuryTransactions}
              value={summary.treasury_transactions}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MiniMoneyStat title={t.treasuryBalance} value={summary.treasury_balance} />
            <MiniMoneyStat title={t.cashBalance} value={summary.treasury_cash_balance} />
            <MiniMoneyStat title={t.bankBalance} value={summary.treasury_bank_balance} />
            <MiniStat title={t.pendingInvoices} value={summary.pending_invoices} />
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   Small Components
============================================================ */

async function loadFirstAvailable(endpoints: string[]) {
  let lastError = "";

  for (const endpoint of endpoints) {
    const response = await fetch(apiUrl(endpoint), {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    const payload = (await response.json().catch(() => null)) as
      | ApiEnvelope<unknown>
      | null;

    if (response.ok && payload?.ok !== false && payload?.success !== false) {
      return payload;
    }

    lastError =
      payload?.message ||
      payload?.detail ||
      payload?.error ||
      `HTTP ${response.status}`;
  }

  console.warn("Reports endpoint fallback failed:", lastError);
  return null;
}

function KpiCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <p className="mt-1 text-sm text-muted-foreground">{title}</p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ title, value }: { title: string; value: number }) {
  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{title}</span>
          <span className="text-lg font-bold">{formatNumber(value)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMoneyStat({ title, value }: { title: string; value: number }) {
  return (
    <Card className="rounded-2xl border bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{title}</span>
          <span className="text-lg font-bold">
            <MoneyText value={value} />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}