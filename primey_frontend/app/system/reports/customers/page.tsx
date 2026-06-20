"use client";

/* ============================================================
   📂 app/system/reports/customers/page.tsx
   🧠 Primey Care | Customers Reports Page

   ✅ المسار:
      app/system/reports/customers/page.tsx

   ✅ العمل:
      صفحة تقرير العملاء المركزية داخل وحدة التقارير.
      تعرض ملخص العملاء وجدولًا تحليليًا قابلًا للبحث والتصفية والتصدير والطباعة.

   ✅ الإصدار:
      Phase 17 UX Refinement + Central Reports Customers Review

   ✅ يعتمد على:
      - /api/reports/customers/
      - /api/customers/ كـ fallback آمن عند عدم توفر تقرير مخصص
      - primey-locale
      - AuthProvider
      - sonner
      - /currency/sar.svg

   ✅ متوافق مع صفحات:
      - Centers approved UX pattern
      - Customers approved UX pattern
      - Central Reports module

   ✅ الوظائف:
      - عرض مؤشرات تقرير العملاء.
      - تحليل العملاء حسب الحالة والنوع والمدينة والمصدر.
      - عرض القيم المالية المرتبطة بالطلبات والفواتير والمدفوعات.
      - البحث في صف مستقل.
      - فلاتر الحالة والنوع في صفوف منظمة.
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
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Printer,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
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

type CustomerStatus = "ACTIVE" | "INACTIVE" | "PENDING" | "BLOCKED" | "UNKNOWN";
type Gender = "MALE" | "FEMALE" | "UNKNOWN";

type StatusFilter = "ALL" | CustomerStatus;
type GenderFilter = "ALL" | Gender;

type CustomerReportRow = {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  mobile: string;
  city: string;
  area: string;
  status: CustomerStatus;
  gender: Gender;
  source: string;
  ordersCount: number;
  invoicesCount: number;
  paymentsCount: number;
  totalOrdersAmount: number;
  totalInvoicesAmount: number;
  totalPaymentsAmount: number;
  lastActivityAt: string;
  createdAt: string;
};

type CustomersReportSummary = {
  total_customers: number;
  active_customers: number;
  inactive_customers: number;
  pending_customers: number;
  blocked_customers: number;
  male_customers: number;
  female_customers: number;
  customers_with_orders: number;
  total_orders: number;
  total_invoices: number;
  total_payments: number;
  total_orders_amount: number;
  total_invoices_amount: number;
  total_payments_amount: number;
};

type CustomersReportResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: {
    summary?: Partial<CustomersReportSummary>;
    results?: unknown[];
    customers?: unknown[];
    items?: unknown[];
  };
  summary?: Partial<CustomersReportSummary>;
  results?: unknown[];
  customers?: unknown[];
  items?: unknown[];
};

const SAR_ICON_PATH = "/currency/sar.svg";

const DEFAULT_SUMMARY: CustomersReportSummary = {
  total_customers: 0,
  active_customers: 0,
  inactive_customers: 0,
  pending_customers: 0,
  blocked_customers: 0,
  male_customers: 0,
  female_customers: 0,
  customers_with_orders: 0,
  total_orders: 0,
  total_invoices: 0,
  total_payments: 0,
  total_orders_amount: 0,
  total_invoices_amount: 0,
  total_payments_amount: 0,
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
    title: isArabic ? "تقارير العملاء" : "Customers Reports",
    subtitle: isArabic
      ? "تحليل العملاء حسب الحالة، المدينة، المصدر، النوع، وحركة الطلبات والفواتير والمدفوعات."
      : "Analyze customers by status, city, source, gender, orders, invoices, and payments.",

    back: isArabic ? "مركز التقارير" : "Reports Center",
    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    exportExcel: isArabic ? "تصدير Excel" : "Export Excel",
    print: isArabic ? "طباعة PDF" : "Print PDF",
    clearFilters: isArabic ? "مسح الفلاتر" : "Clear Filters",
    viewDetails: isArabic ? "عرض التفاصيل" : "View Details",

    searchPlaceholder: isArabic
      ? "ابحث باسم العميل أو البريد أو الجوال أو المدينة أو المصدر..."
      : "Search by customer name, email, phone, city, or source...",

    all: isArabic ? "الكل" : "All",
    allStatuses: isArabic ? "كل الحالات" : "All Statuses",
    allGenders: isArabic ? "كل الأنواع" : "All Genders",

    totalCustomers: isArabic ? "إجمالي العملاء" : "Total Customers",
    activeCustomers: isArabic ? "العملاء النشطون" : "Active Customers",
    customersWithOrders: isArabic ? "لديهم طلبات" : "Customers With Orders",
    totalFinancialValue: isArabic
      ? "إجمالي القيمة المالية"
      : "Total Financial Value",

    active: isArabic ? "نشط" : "Active",
    inactive: isArabic ? "غير نشط" : "Inactive",
    pending: isArabic ? "بانتظار التفعيل" : "Pending",
    blocked: isArabic ? "محظور" : "Blocked",
    unknown: isArabic ? "غير محدد" : "Unknown",

    male: isArabic ? "ذكر" : "Male",
    female: isArabic ? "أنثى" : "Female",

    distributionTitle: isArabic ? "توزيع الحالات" : "Status Distribution",
    distributionDesc: isArabic
      ? "تحليل سريع لحالات العملاء."
      : "Quick analysis of customer statuses.",

    financialTitle: isArabic
      ? "القيم المالية المرتبطة"
      : "Related Financial Values",
    financialDesc: isArabic
      ? "إجمالي قيم الطلبات والفواتير والمدفوعات المرتبطة بالعملاء."
      : "Total values of orders, invoices, and payments linked to customers.",

    tableTitle: isArabic ? "بيانات تقرير العملاء" : "Customers Report Data",
    tableDesc: isArabic
      ? "جدول تحليلي للعملاء حسب الفلاتر الحالية."
      : "Analytical customers table based on current filters.",

    table: {
      customer: isArabic ? "العميل" : "Customer",
      contact: isArabic ? "التواصل" : "Contact",
      city: isArabic ? "المدينة" : "City",
      status: isArabic ? "الحالة" : "Status",
      gender: isArabic ? "النوع" : "Gender",
      source: isArabic ? "المصدر" : "Source",
      orders: isArabic ? "الطلبات" : "Orders",
      invoices: isArabic ? "الفواتير" : "Invoices",
      payments: isArabic ? "المدفوعات" : "Payments",
      lastActivity: isArabic ? "آخر نشاط" : "Last Activity",
      createdAt: isArabic ? "تاريخ الإنشاء" : "Created At",
      action: isArabic ? "الإجراء" : "Action",
    },

    emptyTitle: isArabic ? "لا توجد بيانات عملاء" : "No customers data",
    emptyText: isArabic
      ? "ستظهر بيانات تقرير العملاء هنا عند توفر سجلات."
      : "Customers report data will appear here when records are available.",
    noResultsTitle: isArabic ? "لا توجد نتائج مطابقة" : "No matching results",
    noResultsText: isArabic
      ? "جرّب تغيير كلمات البحث أو فلاتر الحالة والنوع."
      : "Try changing search keywords, status, or gender filters.",

    accessDeniedTitle: isArabic ? "غير مصرح بعرض التقرير" : "Access denied",
    accessDeniedText: isArabic
      ? "لا تملك صلاحية عرض تقارير العملاء. تواصل مع مسؤول النظام إذا كنت تحتاج الوصول."
      : "You do not have permission to view customers reports. Contact your system administrator if you need access.",

    apiError: isArabic
      ? "تعذر تحميل تقرير العملاء."
      : "Unable to load customers report.",
    apiErrorHint: isArabic
      ? "تحقق من الاتصال أو الصلاحيات ثم أعد المحاولة."
      : "Check the connection or permissions, then try again.",
    refreshSuccess: isArabic
      ? "تم تحديث تقرير العملاء بنجاح."
      : "Customers report refreshed successfully.",
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
    filterStatus: isArabic ? "فلتر الحالة" : "Status Filter",
    filterGender: isArabic ? "فلتر النوع" : "Gender Filter",
    printedAt: isArabic ? "تاريخ الطباعة" : "Printed At",
    rowsCount: isArabic ? "عدد السجلات" : "Rows Count",
    printTitle: isArabic ? "تقرير العملاء" : "Customers Report",
  };
}

/* ============================================================
   Normalizers
============================================================ */

function toNumber(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value: unknown, isActive?: unknown): CustomerStatus {
  const status = String(value || "").toUpperCase();

  if (status === "ACTIVE") return "ACTIVE";
  if (status === "INACTIVE" || status === "DISABLED") return "INACTIVE";
  if (status === "PENDING") return "PENDING";
  if (status === "BLOCKED" || status === "SUSPENDED") return "BLOCKED";

  if (typeof isActive === "boolean") return isActive ? "ACTIVE" : "INACTIVE";

  return "UNKNOWN";
}

function normalizeGender(value: unknown): Gender {
  const gender = String(value || "").toUpperCase();

  if (["MALE", "M"].includes(gender)) return "MALE";
  if (["FEMALE", "F"].includes(gender)) return "FEMALE";

  return "UNKNOWN";
}

function getValue(obj: Dict, key: string): unknown {
  const direct = obj[key];

  if (direct !== undefined && direct !== null && direct !== "") {
    return direct;
  }

  for (const container of ["customer", "profile", "user", "summary", "data"]) {
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

function extractRows(payload: CustomersReportResponse | null): unknown[] {
  if (!payload) return [];

  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.customers)) return payload.customers;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data?.results)) return payload.data.results;
  if (Array.isArray(payload.data?.customers)) return payload.data.customers;
  if (Array.isArray(payload.data?.items)) return payload.data.items;

  return [];
}

function extractSummary(
  payload: CustomersReportResponse | null,
): Partial<CustomersReportSummary> {
  return payload?.data?.summary || payload?.summary || {};
}

function normalizeCustomer(item: unknown): CustomerReportRow {
  const obj = asDict(item);
  const id = getValue(obj, "id");
  const firstName = String(getValue(obj, "first_name") || "");
  const lastName = String(getValue(obj, "last_name") || "");

  return {
    id: String(id || ""),
    name: String(
      getValue(obj, "full_name") ||
        getValue(obj, "name") ||
        `${firstName} ${lastName}`.trim() ||
        getValue(obj, "customer_name") ||
        "-",
    ),
    code: String(getValue(obj, "code") || getValue(obj, "customer_code") || ""),
    email: String(getValue(obj, "email") || ""),
    phone: String(getValue(obj, "phone") || ""),
    mobile: String(
      getValue(obj, "mobile") ||
        getValue(obj, "mobile_number") ||
        getValue(obj, "phone") ||
        "",
    ),
    city: String(getValue(obj, "city") || ""),
    area: String(getValue(obj, "area") || getValue(obj, "district") || ""),
    status: normalizeStatus(getValue(obj, "status"), getValue(obj, "is_active")),
    gender: normalizeGender(getValue(obj, "gender")),
    source: String(
      getValue(obj, "source") || getValue(obj, "registration_source") || "-",
    ),
    ordersCount: toNumber(getValue(obj, "orders_count")),
    invoicesCount: toNumber(getValue(obj, "invoices_count")),
    paymentsCount: toNumber(getValue(obj, "payments_count")),
    totalOrdersAmount: toNumber(getValue(obj, "total_orders_amount")),
    totalInvoicesAmount: toNumber(getValue(obj, "total_invoices_amount")),
    totalPaymentsAmount: toNumber(getValue(obj, "total_payments_amount")),
    lastActivityAt: String(
      getValue(obj, "last_activity_at") ||
        getValue(obj, "last_order_at") ||
        getValue(obj, "updated_at") ||
        "",
    ),
    createdAt: String(
      getValue(obj, "created_at") || getValue(obj, "date_joined") || "",
    ),
  };
}

function normalizeSummary(
  rows: CustomerReportRow[],
  summary?: Partial<CustomersReportSummary>,
): CustomersReportSummary {
  const fallback: CustomersReportSummary = {
    total_customers: rows.length,
    active_customers: rows.filter((item) => item.status === "ACTIVE").length,
    inactive_customers: rows.filter((item) => item.status === "INACTIVE").length,
    pending_customers: rows.filter((item) => item.status === "PENDING").length,
    blocked_customers: rows.filter((item) => item.status === "BLOCKED").length,
    male_customers: rows.filter((item) => item.gender === "MALE").length,
    female_customers: rows.filter((item) => item.gender === "FEMALE").length,
    customers_with_orders: rows.filter((item) => item.ordersCount > 0).length,
    total_orders: rows.reduce((sum, item) => sum + item.ordersCount, 0),
    total_invoices: rows.reduce((sum, item) => sum + item.invoicesCount, 0),
    total_payments: rows.reduce((sum, item) => sum + item.paymentsCount, 0),
    total_orders_amount: rows.reduce(
      (sum, item) => sum + item.totalOrdersAmount,
      0,
    ),
    total_invoices_amount: rows.reduce(
      (sum, item) => sum + item.totalInvoicesAmount,
      0,
    ),
    total_payments_amount: rows.reduce(
      (sum, item) => sum + item.totalPaymentsAmount,
      0,
    ),
  };

  return {
    total_customers: toNumber(summary?.total_customers ?? fallback.total_customers),
    active_customers: toNumber(
      summary?.active_customers ?? fallback.active_customers,
    ),
    inactive_customers: toNumber(
      summary?.inactive_customers ?? fallback.inactive_customers,
    ),
    pending_customers: toNumber(
      summary?.pending_customers ?? fallback.pending_customers,
    ),
    blocked_customers: toNumber(
      summary?.blocked_customers ?? fallback.blocked_customers,
    ),
    male_customers: toNumber(summary?.male_customers ?? fallback.male_customers),
    female_customers: toNumber(
      summary?.female_customers ?? fallback.female_customers,
    ),
    customers_with_orders: toNumber(
      summary?.customers_with_orders ?? fallback.customers_with_orders,
    ),
    total_orders: toNumber(summary?.total_orders ?? fallback.total_orders),
    total_invoices: toNumber(summary?.total_invoices ?? fallback.total_invoices),
    total_payments: toNumber(summary?.total_payments ?? fallback.total_payments),
    total_orders_amount: toNumber(
      summary?.total_orders_amount ?? fallback.total_orders_amount,
    ),
    total_invoices_amount: toNumber(
      summary?.total_invoices_amount ?? fallback.total_invoices_amount,
    ),
    total_payments_amount: toNumber(
      summary?.total_payments_amount ?? fallback.total_payments_amount,
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

function statusLabel(status: CustomerStatus, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<CustomerStatus, string> = {
    ACTIVE: t.active,
    INACTIVE: t.inactive,
    PENDING: t.pending,
    BLOCKED: t.blocked,
    UNKNOWN: t.unknown,
  };

  return labels[status];
}

function genderLabel(gender: Gender, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<Gender, string> = {
    MALE: t.male,
    FEMALE: t.female,
    UNKNOWN: t.unknown,
  };

  return labels[gender];
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

function statusBadge(status: CustomerStatus, locale: AppLocale) {
  const label = statusLabel(status, locale);

  if (status === "ACTIVE") {
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

  if (status === "BLOCKED") {
    return (
      <Badge variant="destructive" className="rounded-full px-3 py-1">
        {label}
      </Badge>
    );
  }

  if (status === "INACTIVE") {
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

function genderBadge(gender: Gender, locale: AppLocale) {
  return (
    <Badge variant="secondary" className="rounded-full px-3 py-1">
      {genderLabel(gender, locale)}
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
  rows: CustomerReportRow[];
  summary: CustomersReportSummary;
  t: ReturnType<typeof dictionary>;
}) {
  const isArabic = locale === "ar";
  const now = new Date().toLocaleString("en-US");

  const tableRows = rows
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.name || "-")}</td>
          <td>${escapeHtml(item.mobile || item.phone || "-")}</td>
          <td>${escapeHtml(item.city || "-")}</td>
          <td>${escapeHtml(statusLabel(item.status, locale))}</td>
          <td>${escapeHtml(genderLabel(item.gender, locale))}</td>
          <td>${escapeHtml(formatNumber(item.ordersCount))}</td>
          <td>${escapeHtml(formatNumber(item.invoicesCount))}</td>
          <td>${escapeHtml(formatNumber(item.paymentsCount))}</td>
          <td>${escapeHtml(formatMoney(item.totalPaymentsAmount))}</td>
          <td>${escapeHtml(formatDate(item.lastActivityAt))}</td>
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
          <div class="summary-card"><span>${escapeHtml(t.totalCustomers)}</span><strong>${formatNumber(summary.total_customers)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.activeCustomers)}</span><strong>${formatNumber(summary.active_customers)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.customersWithOrders)}</span><strong>${formatNumber(summary.customers_with_orders)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.totalFinancialValue)}</span><strong>${formatMoney(summary.total_payments_amount)}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${escapeHtml(t.table.customer)}</th>
              <th>${escapeHtml(t.table.contact)}</th>
              <th>${escapeHtml(t.table.city)}</th>
              <th>${escapeHtml(t.table.status)}</th>
              <th>${escapeHtml(t.table.gender)}</th>
              <th>${escapeHtml(t.table.orders)}</th>
              <th>${escapeHtml(t.table.invoices)}</th>
              <th>${escapeHtml(t.table.payments)}</th>
              <th>${escapeHtml(t.totalFinancialValue)}</th>
              <th>${escapeHtml(t.table.lastActivity)}</th>
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

export default function SystemCustomersReportsPage() {
  const auth = useAuth() as unknown;

  const [locale, setLocale] = useState<AppLocale>("ar");
  const [rows, setRows] = useState<CustomerReportRow[]>([]);
  const [summary, setSummary] =
    useState<CustomersReportSummary>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("ALL");

  const t = useMemo(() => dictionary(locale), [locale]);
  const isArabic = locale === "ar";
  const authResolving = isAuthResolving(auth);

  const canViewReport = hasSafePermission(
    auth,
    ["reports.view", "reports.customers.view", "customers.view"],
    "view",
  );

  const canViewCustomerDetails = hasSafePermission(
    auth,
    ["customers.view", "customers.detail"],
    "view",
  );

  const canExportReport = hasSafePermission(
    auth,
    ["reports.export", "reports.customers.export"],
    "action",
  );

  const canPrintReport = hasSafePermission(
    auth,
    ["reports.print", "reports.customers.print"],
    "action",
  );

  const filteredRows = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return rows.filter((item) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : item.status === statusFilter;

      const matchesGender =
        genderFilter === "ALL" ? true : item.gender === genderFilter;

      const matchesQuery = !cleanQuery
        ? true
        : [
            item.name,
            item.code,
            item.email,
            item.phone,
            item.mobile,
            item.city,
            item.area,
            item.source,
            statusLabel(item.status, locale),
            genderLabel(item.gender, locale),
          ]
            .join(" ")
            .toLowerCase()
            .includes(cleanQuery);

      return matchesStatus && matchesGender && matchesQuery;
    });
  }, [genderFilter, locale, query, rows, statusFilter]);

  const filteredSummary = useMemo(
    () => normalizeSummary(filteredRows),
    [filteredRows],
  );

  const hasSearchOrFilter =
    query.trim().length > 0 || statusFilter !== "ALL" || genderFilter !== "ALL";

  const statusOptions = useMemo(
    () => [
      { value: "ALL" as StatusFilter, label: t.allStatuses, count: rows.length },
      {
        value: "ACTIVE" as StatusFilter,
        label: t.active,
        count: rows.filter((item) => item.status === "ACTIVE").length,
      },
      {
        value: "INACTIVE" as StatusFilter,
        label: t.inactive,
        count: rows.filter((item) => item.status === "INACTIVE").length,
      },
      {
        value: "PENDING" as StatusFilter,
        label: t.pending,
        count: rows.filter((item) => item.status === "PENDING").length,
      },
      {
        value: "BLOCKED" as StatusFilter,
        label: t.blocked,
        count: rows.filter((item) => item.status === "BLOCKED").length,
      },
    ],
    [rows, t],
  );

  const genderOptions = useMemo(
    () => [
      { value: "ALL" as GenderFilter, label: t.allGenders, count: rows.length },
      {
        value: "MALE" as GenderFilter,
        label: t.male,
        count: rows.filter((item) => item.gender === "MALE").length,
      },
      {
        value: "FEMALE" as GenderFilter,
        label: t.female,
        count: rows.filter((item) => item.gender === "FEMALE").length,
      },
      {
        value: "UNKNOWN" as GenderFilter,
        label: t.unknown,
        count: rows.filter((item) => item.gender === "UNKNOWN").length,
      },
    ],
    [rows, t],
  );

  const summaryCards = useMemo(
    () => [
      {
        title: t.totalCustomers,
        value: summary.total_customers,
        icon: Users,
        helper: t.activeCustomers,
        helperValue: formatNumber(summary.active_customers),
        percent: summary.total_customers > 0 ? 100 : 0,
      },
      {
        title: t.activeCustomers,
        value: summary.active_customers,
        icon: CheckCircle2,
        helper: t.totalCustomers,
        helperValue: `${percent(
          summary.active_customers,
          summary.total_customers,
        )}%`,
        percent: percent(summary.active_customers, summary.total_customers),
      },
      {
        title: t.customersWithOrders,
        value: summary.customers_with_orders,
        icon: BadgeCheck,
        helper: t.table.orders,
        helperValue: formatNumber(summary.total_orders),
        percent: percent(summary.customers_with_orders, summary.total_customers),
      },
      {
        title: t.totalFinancialValue,
        value: summary.total_payments_amount,
        icon: Wallet,
        helper: t.table.payments,
        helperValue: formatNumber(summary.total_payments),
        percent: summary.total_payments_amount > 0 ? 100 : 0,
        isMoney: true,
      },
    ],
    [summary, t],
  );

  const statusCards = useMemo(
    () => [
      {
        title: t.active,
        value: summary.active_customers,
        icon: CheckCircle2,
        filter: "ACTIVE" as StatusFilter,
        percent: percent(summary.active_customers, summary.total_customers),
      },
      {
        title: t.inactive,
        value: summary.inactive_customers,
        icon: XCircle,
        filter: "INACTIVE" as StatusFilter,
        percent: percent(summary.inactive_customers, summary.total_customers),
      },
      {
        title: t.pending,
        value: summary.pending_customers,
        icon: ShieldCheck,
        filter: "PENDING" as StatusFilter,
        percent: percent(summary.pending_customers, summary.total_customers),
      },
      {
        title: t.blocked,
        value: summary.blocked_customers,
        icon: XCircle,
        filter: "BLOCKED" as StatusFilter,
        percent: percent(summary.blocked_customers, summary.total_customers),
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
          "/api/reports/customers/",
          "/api/customers/?page_size=300",
        ];

        let loadedPayload: CustomersReportResponse | null = null;
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
            | CustomersReportResponse
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
            loadedPayload?.message || "Unable to load customers report",
          );
        }

        const normalizedRows = extractRows(loadedPayload).map(normalizeCustomer);

        setRows(normalizedRows);
        setSummary(
          normalizeSummary(normalizedRows, extractSummary(loadedPayload)),
        );

        if (showToast) {
          toast.success(t.refreshSuccess);
        }
      } catch (error) {
        console.error("Customers report load error:", error);
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
    setGenderFilter("ALL");
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

    const genderFilterLabel =
      genderOptions.find((item) => item.value === genderFilter)?.label || t.all;

    downloadExcel({
      filename: `primey-care-customers-report-${generatedAt
        .toISOString()
        .slice(0, 10)}.xls`,
      worksheetName: isArabic ? "تقرير العملاء" : "Customers Report",
      title: t.title,
      locale,
      summaryRows: [
        [t.generatedAt, generatedAt.toLocaleString("en-US")],
        [t.reportScope, t.currentFilteredData],
        [t.totalCustomers, filteredSummary.total_customers],
        [t.activeCustomers, filteredSummary.active_customers],
        [t.customersWithOrders, filteredSummary.customers_with_orders],
        [t.table.orders, filteredSummary.total_orders],
        [t.table.invoices, filteredSummary.total_invoices],
        [t.table.payments, filteredSummary.total_payments],
        [
          t.totalFinancialValue,
          formatMoney(filteredSummary.total_payments_amount),
        ],
      ],
      filterRows: [
        [t.filterSearch, query || t.all],
        [t.filterStatus, statusFilterLabel],
        [t.filterGender, genderFilterLabel],
      ],
      headers: [
        "ID",
        t.table.customer,
        "Code",
        t.table.contact,
        "Email",
        t.table.city,
        t.table.status,
        t.table.gender,
        t.table.source,
        t.table.orders,
        t.table.invoices,
        t.table.payments,
        t.totalFinancialValue,
        t.table.lastActivity,
        t.table.createdAt,
      ],
      rows: filteredRows.map((item) => [
        item.id || "-",
        item.name || "-",
        item.code || "-",
        item.mobile || item.phone || "-",
        item.email || "-",
        item.city || "-",
        statusLabel(item.status, locale),
        genderLabel(item.gender, locale),
        item.source || "-",
        formatNumber(item.ordersCount),
        formatNumber(item.invoicesCount),
        formatNumber(item.paymentsCount),
        formatMoney(item.totalPaymentsAmount),
        formatDate(item.lastActivityAt),
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

            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.table.orders}
                </p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.total_orders_amount} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.table.invoices}
                </p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.total_invoices_amount} />
                </div>
              </div>

              <div className="rounded-2xl border bg-background p-4">
                <p className="text-xs text-muted-foreground">
                  {t.table.payments}
                </p>
                <div className="mt-2 text-lg font-bold">
                  <MoneyText value={summary.total_payments_amount} />
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
                    {genderOptions.map((item) => {
                      const isSelected = genderFilter === item.value;

                      return (
                        <Button
                          key={item.value}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          className="h-10 rounded-xl"
                          onClick={() => setGenderFilter(item.value)}
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
                        <TableHead>{t.table.customer}</TableHead>
                        <TableHead>{t.table.contact}</TableHead>
                        <TableHead>{t.table.city}</TableHead>
                        <TableHead>{t.table.status}</TableHead>
                        <TableHead>{t.table.gender}</TableHead>
                        <TableHead>{t.table.source}</TableHead>
                        <TableHead>{t.table.orders}</TableHead>
                        <TableHead>{t.table.invoices}</TableHead>
                        <TableHead>{t.table.payments}</TableHead>
                        <TableHead>{t.totalFinancialValue}</TableHead>
                        <TableHead>{t.table.lastActivity}</TableHead>
                        {canViewCustomerDetails ? (
                          <TableHead>{t.table.action}</TableHead>
                        ) : null}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {isLoading ? (
                        <TableRowsSkeleton
                          columnsCount={canViewCustomerDetails ? 12 : 11}
                        />
                      ) : filteredRows.length > 0 ? (
                        filteredRows.map((item) => (
                          <TableRow key={`${item.id}-${item.name}`}>
                            <TableCell>
                              <div className="flex min-w-[240px] items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                                  <UserRound className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-medium">
                                    {item.name || "-"}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {item.code || "-"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="min-w-[180px] space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>{item.mobile || item.phone || "-"}</span>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Mail className="h-3.5 w-3.5" />
                                  <span className="truncate">
                                    {item.email || "-"}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex min-w-[140px] items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{item.city || "-"}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              {statusBadge(item.status, locale)}
                            </TableCell>

                            <TableCell>
                              {genderBadge(item.gender, locale)}
                            </TableCell>

                            <TableCell>
                              <span className="whitespace-nowrap">
                                {item.source || "-"}
                              </span>
                            </TableCell>

                            <TableCell>{formatNumber(item.ordersCount)}</TableCell>
                            <TableCell>{formatNumber(item.invoicesCount)}</TableCell>
                            <TableCell>{formatNumber(item.paymentsCount)}</TableCell>

                            <TableCell>
                              <MoneyText value={item.totalPaymentsAmount} />
                            </TableCell>

                            <TableCell>
                              <span className="whitespace-nowrap">
                                {formatDate(item.lastActivityAt)}
                              </span>
                            </TableCell>

                            {canViewCustomerDetails ? (
                              <TableCell>
                                {isValidId(item.id) ? (
                                  <Link href={`/system/customers/${item.id}`}>
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
                            colSpan={canViewCustomerDetails ? 12 : 11}
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