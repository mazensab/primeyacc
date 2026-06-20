"use client";

/* ============================================================
   📂 app/system/reports/providers/page.tsx
   🧠 Primey Care | Providers Reports Page

   ✅ المسار:
      app/system/reports/providers/page.tsx

   ✅ العمل:
      صفحة تقرير المراكز ومقدمي الخدمة المركزية داخل وحدة التقارير.
      تعرض ملخص شبكة الخدمة وجدولًا تحليليًا قابلًا للبحث والتصفية والتصدير والطباعة.

   ✅ الإصدار:
      Phase 17 UX Refinement + Central Reports Providers Review

   ✅ يعتمد على:
      - /api/reports/providers/
      - /api/providers/ كـ fallback آمن عند عدم توفر تقرير مخصص
      - primey-locale
      - AuthProvider
      - sonner
      - /currency/sar.svg

   ✅ متوافق مع صفحات:
      - Centers approved UX pattern
      - Customers approved UX pattern
      - Central Reports module

   ✅ الوظائف:
      - عرض مؤشرات تقرير المراكز ومقدمي الخدمة.
      - تحليل المراكز حسب الحالة والنوع والمدينة والتصنيف.
      - عرض حركة الخدمات والعقود والطلبات والفواتير والمدفوعات.
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
  BarChart3,
  Building2,
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
  Stethoscope,
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

type ProviderStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "PENDING"
  | "SUSPENDED"
  | "UNKNOWN";

type ProviderKind =
  | "CENTER"
  | "HOSPITAL"
  | "CLINIC"
  | "PHARMACY"
  | "LAB"
  | "DOCTOR"
  | "OTHER"
  | "UNKNOWN";

type StatusFilter = "ALL" | ProviderStatus;
type KindFilter = "ALL" | ProviderKind;

type ProviderReportRow = {
  id: string;
  code: string;
  name: string;
  legalName: string;
  type: ProviderKind;
  category: string;
  city: string;
  area: string;
  address: string;
  phone: string;
  mobile: string;
  email: string;
  status: ProviderStatus;
  servicesCount: number;
  contractsCount: number;
  ordersCount: number;
  invoicesCount: number;
  paymentsCount: number;
  totalOrdersAmount: number;
  totalInvoicesAmount: number;
  totalPaymentsAmount: number;
  lastActivityAt: string;
  createdAt: string;
};

type ProvidersReportSummary = {
  total_providers: number;
  active_providers: number;
  inactive_providers: number;
  pending_providers: number;
  suspended_providers: number;
  centers_count: number;
  hospitals_count: number;
  clinics_count: number;
  pharmacies_count: number;
  labs_count: number;
  doctors_count: number;
  providers_with_contracts: number;
  total_services: number;
  total_contracts: number;
  total_orders: number;
  total_invoices: number;
  total_payments: number;
  total_orders_amount: number;
  total_invoices_amount: number;
  total_payments_amount: number;
};

type ProvidersReportResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: {
    summary?: Partial<ProvidersReportSummary>;
    results?: unknown[];
    providers?: unknown[];
    centers?: unknown[];
    items?: unknown[];
    rows?: unknown[];
  };
  summary?: Partial<ProvidersReportSummary>;
  results?: unknown[];
  providers?: unknown[];
  centers?: unknown[];
  items?: unknown[];
  rows?: unknown[];
};

const SAR_ICON_PATH = "/currency/sar.svg";

const DEFAULT_SUMMARY: ProvidersReportSummary = {
  total_providers: 0,
  active_providers: 0,
  inactive_providers: 0,
  pending_providers: 0,
  suspended_providers: 0,
  centers_count: 0,
  hospitals_count: 0,
  clinics_count: 0,
  pharmacies_count: 0,
  labs_count: 0,
  doctors_count: 0,
  providers_with_contracts: 0,
  total_services: 0,
  total_contracts: 0,
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
    title: isArabic
      ? "تقارير المراكز ومقدمي الخدمة"
      : "Providers Reports",
    subtitle: isArabic
      ? "تحليل المراكز ومقدمي الخدمة حسب الحالة والنوع والمدينة والعقود والخدمات والحركة التشغيلية."
      : "Analyze providers by status, type, city, contracts, services, and operational activity.",

    back: isArabic ? "مركز التقارير" : "Reports Center",
    refresh: isArabic ? "تحديث" : "Refresh",
    retry: isArabic ? "إعادة المحاولة" : "Retry",
    exportExcel: isArabic ? "تصدير Excel" : "Export Excel",
    print: isArabic ? "طباعة PDF" : "Print PDF",
    clearFilters: isArabic ? "مسح الفلاتر" : "Clear Filters",
    viewDetails: isArabic ? "عرض التفاصيل" : "View Details",

    searchPlaceholder: isArabic
      ? "ابحث باسم المركز أو الكود أو المدينة أو النوع أو البريد أو الجوال..."
      : "Search by provider name, code, city, type, email, or phone...",

    all: isArabic ? "الكل" : "All",
    allStatuses: isArabic ? "كل الحالات" : "All Statuses",
    allTypes: isArabic ? "كل الأنواع" : "All Types",

    totalProviders: isArabic ? "إجمالي المراكز" : "Total Providers",
    activeProviders: isArabic ? "المراكز النشطة" : "Active Providers",
    providersWithContracts: isArabic ? "لديها عقود" : "With Contracts",
    totalActivity: isArabic ? "إجمالي النشاط" : "Total Activity",
    totalFinancialValue: isArabic
      ? "إجمالي القيمة المالية"
      : "Total Financial Value",

    active: isArabic ? "نشط" : "Active",
    inactive: isArabic ? "غير نشط" : "Inactive",
    pending: isArabic ? "بانتظار الاعتماد" : "Pending",
    suspended: isArabic ? "موقوف" : "Suspended",
    unknown: isArabic ? "غير محدد" : "Unknown",

    center: isArabic ? "مركز" : "Center",
    hospital: isArabic ? "مستشفى" : "Hospital",
    clinic: isArabic ? "عيادة" : "Clinic",
    pharmacy: isArabic ? "صيدلية" : "Pharmacy",
    lab: isArabic ? "مختبر" : "Lab",
    doctor: isArabic ? "طبيب" : "Doctor",
    other: isArabic ? "أخرى" : "Other",

    distributionTitle: isArabic ? "توزيع الحالات" : "Status Distribution",
    distributionDesc: isArabic
      ? "تحليل سريع لحالات المراكز ومقدمي الخدمة."
      : "Quick analysis of provider statuses.",

    typeDistributionTitle: isArabic ? "توزيع الأنواع" : "Type Distribution",
    typeDistributionDesc: isArabic
      ? "تحليل سريع للمراكز حسب النوع."
      : "Quick analysis of providers by type.",

    financialTitle: isArabic
      ? "القيم المالية المرتبطة"
      : "Related Financial Values",
    financialDesc: isArabic
      ? "إجمالي قيم الطلبات والفواتير والمدفوعات المرتبطة بالمراكز ومقدمي الخدمة."
      : "Total values of orders, invoices, and payments linked to providers.",

    tableTitle: isArabic
      ? "بيانات تقرير المراكز"
      : "Providers Report Data",
    tableDesc: isArabic
      ? "جدول تحليلي للمراكز ومقدمي الخدمة حسب الفلاتر الحالية."
      : "Analytical providers table based on current filters.",

    table: {
      provider: isArabic ? "المركز / مقدم الخدمة" : "Provider",
      contact: isArabic ? "التواصل" : "Contact",
      city: isArabic ? "المدينة" : "City",
      type: isArabic ? "النوع" : "Type",
      category: isArabic ? "التصنيف" : "Category",
      status: isArabic ? "الحالة" : "Status",
      services: isArabic ? "الخدمات" : "Services",
      contracts: isArabic ? "العقود" : "Contracts",
      orders: isArabic ? "الطلبات" : "Orders",
      invoices: isArabic ? "الفواتير" : "Invoices",
      payments: isArabic ? "المدفوعات" : "Payments",
      lastActivity: isArabic ? "آخر نشاط" : "Last Activity",
      createdAt: isArabic ? "تاريخ الإنشاء" : "Created At",
      action: isArabic ? "الإجراء" : "Action",
    },

    emptyTitle: isArabic ? "لا توجد بيانات مراكز" : "No providers data",
    emptyText: isArabic
      ? "ستظهر بيانات تقرير المراكز هنا عند توفر سجلات."
      : "Providers report data will appear here when records are available.",
    noResultsTitle: isArabic ? "لا توجد نتائج مطابقة" : "No matching results",
    noResultsText: isArabic
      ? "جرّب تغيير كلمات البحث أو فلاتر الحالة والنوع."
      : "Try changing search keywords, status, or type filters.",

    accessDeniedTitle: isArabic ? "غير مصرح بعرض التقرير" : "Access denied",
    accessDeniedText: isArabic
      ? "لا تملك صلاحية عرض تقارير المراكز. تواصل مع مسؤول النظام إذا كنت تحتاج الوصول."
      : "You do not have permission to view providers reports. Contact your system administrator if you need access.",

    apiError: isArabic
      ? "تعذر تحميل تقرير المراكز."
      : "Unable to load providers report.",
    apiErrorHint: isArabic
      ? "تحقق من الاتصال أو الصلاحيات ثم أعد المحاولة."
      : "Check the connection or permissions, then try again.",
    refreshSuccess: isArabic
      ? "تم تحديث تقرير المراكز بنجاح."
      : "Providers report refreshed successfully.",
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
    filterType: isArabic ? "فلتر النوع" : "Type Filter",
    printedAt: isArabic ? "تاريخ الطباعة" : "Printed At",
    rowsCount: isArabic ? "عدد السجلات" : "Rows Count",
    printTitle: isArabic ? "تقرير المراكز" : "Providers Report",
  };
}

/* ============================================================
   Normalizers
============================================================ */

function toNumber(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value: unknown, isActive?: unknown): ProviderStatus {
  const status = String(value || "").toUpperCase();

  if (status === "ACTIVE" || status === "APPROVED") return "ACTIVE";
  if (status === "INACTIVE" || status === "DISABLED") return "INACTIVE";
  if (status === "PENDING" || status === "UNDER_REVIEW") return "PENDING";
  if (status === "SUSPENDED" || status === "BLOCKED") return "SUSPENDED";

  if (typeof isActive === "boolean") return isActive ? "ACTIVE" : "INACTIVE";

  return "UNKNOWN";
}

function normalizeProviderKind(value: unknown): ProviderKind {
  const type = String(value || "").toUpperCase();

  if (["CENTER", "MEDICAL_CENTER", "PROVIDER_CENTER"].includes(type)) {
    return "CENTER";
  }

  if (["HOSPITAL", "HOSPITALS"].includes(type)) return "HOSPITAL";
  if (["CLINIC", "CLINICS", "POLYCLINIC"].includes(type)) return "CLINIC";
  if (["PHARMACY", "PHARMACIES"].includes(type)) return "PHARMACY";
  if (["LAB", "LABORATORY", "LABORATORIES"].includes(type)) return "LAB";
  if (["DOCTOR", "PHYSICIAN"].includes(type)) return "DOCTOR";
  if (["OTHER", "SERVICE"].includes(type)) return "OTHER";

  return "UNKNOWN";
}

function getValue(obj: Dict, key: string): unknown {
  const direct = obj[key];

  if (direct !== undefined && direct !== null && direct !== "") {
    return direct;
  }

  for (const container of [
    "provider",
    "center",
    "profile",
    "company",
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

function extractRows(payload: ProvidersReportResponse | null): unknown[] {
  if (!payload) return [];

  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.providers)) return payload.providers;
  if (Array.isArray(payload.centers)) return payload.centers;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;

  if (Array.isArray(payload.data?.results)) return payload.data.results;
  if (Array.isArray(payload.data?.providers)) return payload.data.providers;
  if (Array.isArray(payload.data?.centers)) return payload.data.centers;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  if (Array.isArray(payload.data?.rows)) return payload.data.rows;

  return [];
}

function extractSummary(
  payload: ProvidersReportResponse | null,
): Partial<ProvidersReportSummary> {
  return payload?.data?.summary || payload?.summary || {};
}

function normalizeProvider(item: unknown): ProviderReportRow {
  const obj = asDict(item);

  const providerType =
    getValue(obj, "provider_type") ??
    getValue(obj, "type") ??
    getValue(obj, "kind") ??
    getValue(obj, "category");

  return {
    id: String(getValue(obj, "id") || ""),
    code: String(
      getValue(obj, "code") ||
        getValue(obj, "provider_code") ||
        getValue(obj, "center_code") ||
        "",
    ),
    name: String(
      getValue(obj, "name") ||
        getValue(obj, "provider_name") ||
        getValue(obj, "center_name") ||
        getValue(obj, "title") ||
        "-",
    ),
    legalName: String(
      getValue(obj, "legal_name") || getValue(obj, "commercial_name") || "",
    ),
    type: normalizeProviderKind(providerType),
    category: String(
      getValue(obj, "category") ||
        getValue(obj, "specialty") ||
        getValue(obj, "classification") ||
        "",
    ),
    city: String(getValue(obj, "city") || ""),
    area: String(
      getValue(obj, "area") ||
        getValue(obj, "district") ||
        getValue(obj, "neighborhood") ||
        "",
    ),
    address: String(getValue(obj, "address") || ""),
    phone: String(getValue(obj, "phone") || ""),
    mobile: String(
      getValue(obj, "mobile") ||
        getValue(obj, "mobile_number") ||
        getValue(obj, "phone") ||
        "",
    ),
    email: String(getValue(obj, "email") || ""),
    status: normalizeStatus(getValue(obj, "status"), getValue(obj, "is_active")),
    servicesCount: toNumber(getValue(obj, "services_count")),
    contractsCount: toNumber(getValue(obj, "contracts_count")),
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
    createdAt: String(getValue(obj, "created_at") || ""),
  };
}

function normalizeSummary(
  rows: ProviderReportRow[],
  summary?: Partial<ProvidersReportSummary>,
): ProvidersReportSummary {
  const fallback: ProvidersReportSummary = {
    total_providers: rows.length,
    active_providers: rows.filter((item) => item.status === "ACTIVE").length,
    inactive_providers: rows.filter((item) => item.status === "INACTIVE").length,
    pending_providers: rows.filter((item) => item.status === "PENDING").length,
    suspended_providers: rows.filter((item) => item.status === "SUSPENDED")
      .length,
    centers_count: rows.filter((item) => item.type === "CENTER").length,
    hospitals_count: rows.filter((item) => item.type === "HOSPITAL").length,
    clinics_count: rows.filter((item) => item.type === "CLINIC").length,
    pharmacies_count: rows.filter((item) => item.type === "PHARMACY").length,
    labs_count: rows.filter((item) => item.type === "LAB").length,
    doctors_count: rows.filter((item) => item.type === "DOCTOR").length,
    providers_with_contracts: rows.filter((item) => item.contractsCount > 0)
      .length,
    total_services: rows.reduce((sum, item) => sum + item.servicesCount, 0),
    total_contracts: rows.reduce((sum, item) => sum + item.contractsCount, 0),
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
    total_providers: toNumber(summary?.total_providers ?? fallback.total_providers),
    active_providers: toNumber(
      summary?.active_providers ?? fallback.active_providers,
    ),
    inactive_providers: toNumber(
      summary?.inactive_providers ?? fallback.inactive_providers,
    ),
    pending_providers: toNumber(
      summary?.pending_providers ?? fallback.pending_providers,
    ),
    suspended_providers: toNumber(
      summary?.suspended_providers ?? fallback.suspended_providers,
    ),
    centers_count: toNumber(summary?.centers_count ?? fallback.centers_count),
    hospitals_count: toNumber(
      summary?.hospitals_count ?? fallback.hospitals_count,
    ),
    clinics_count: toNumber(summary?.clinics_count ?? fallback.clinics_count),
    pharmacies_count: toNumber(
      summary?.pharmacies_count ?? fallback.pharmacies_count,
    ),
    labs_count: toNumber(summary?.labs_count ?? fallback.labs_count),
    doctors_count: toNumber(summary?.doctors_count ?? fallback.doctors_count),
    providers_with_contracts: toNumber(
      summary?.providers_with_contracts ?? fallback.providers_with_contracts,
    ),
    total_services: toNumber(summary?.total_services ?? fallback.total_services),
    total_contracts: toNumber(
      summary?.total_contracts ?? fallback.total_contracts,
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

function statusLabel(status: ProviderStatus, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<ProviderStatus, string> = {
    ACTIVE: t.active,
    INACTIVE: t.inactive,
    PENDING: t.pending,
    SUSPENDED: t.suspended,
    UNKNOWN: t.unknown,
  };

  return labels[status];
}

function kindLabel(kind: ProviderKind, locale: AppLocale) {
  const t = dictionary(locale);

  const labels: Record<ProviderKind, string> = {
    CENTER: t.center,
    HOSPITAL: t.hospital,
    CLINIC: t.clinic,
    PHARMACY: t.pharmacy,
    LAB: t.lab,
    DOCTOR: t.doctor,
    OTHER: t.other,
    UNKNOWN: t.unknown,
  };

  return labels[kind];
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

function statusBadge(status: ProviderStatus, locale: AppLocale) {
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

  if (status === "SUSPENDED") {
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

function kindBadge(kind: ProviderKind, locale: AppLocale) {
  return (
    <Badge variant="secondary" className="rounded-full px-3 py-1">
      {kindLabel(kind, locale)}
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
  rows: ProviderReportRow[];
  summary: ProvidersReportSummary;
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
          <td>${escapeHtml(kindLabel(item.type, locale))}</td>
          <td>${escapeHtml(item.mobile || item.phone || "-")}</td>
          <td>${escapeHtml(item.city || "-")}</td>
          <td>${escapeHtml(statusLabel(item.status, locale))}</td>
          <td>${escapeHtml(formatNumber(item.servicesCount))}</td>
          <td>${escapeHtml(formatNumber(item.contractsCount))}</td>
          <td>${escapeHtml(formatNumber(item.ordersCount))}</td>
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
          <div class="summary-card"><span>${escapeHtml(t.totalProviders)}</span><strong>${formatNumber(summary.total_providers)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.activeProviders)}</span><strong>${formatNumber(summary.active_providers)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.providersWithContracts)}</span><strong>${formatNumber(summary.providers_with_contracts)}</strong></div>
          <div class="summary-card"><span>${escapeHtml(t.totalFinancialValue)}</span><strong>${formatMoney(summary.total_payments_amount)}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>${escapeHtml(t.table.provider)}</th>
              <th>${escapeHtml(t.table.type)}</th>
              <th>${escapeHtml(t.table.contact)}</th>
              <th>${escapeHtml(t.table.city)}</th>
              <th>${escapeHtml(t.table.status)}</th>
              <th>${escapeHtml(t.table.services)}</th>
              <th>${escapeHtml(t.table.contracts)}</th>
              <th>${escapeHtml(t.table.orders)}</th>
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

export default function SystemProvidersReportsPage() {
  const auth = useAuth() as unknown;

  const [locale, setLocale] = useState<AppLocale>("ar");
  const [rows, setRows] = useState<ProviderReportRow[]>([]);
  const [summary, setSummary] =
    useState<ProvidersReportSummary>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [kindFilter, setKindFilter] = useState<KindFilter>("ALL");

  const t = useMemo(() => dictionary(locale), [locale]);
  const isArabic = locale === "ar";
  const authResolving = isAuthResolving(auth);

  const canViewReport = hasSafePermission(
    auth,
    ["reports.view", "reports.providers.view", "providers.view"],
    "view",
  );

  const canViewProviderDetails = hasSafePermission(
    auth,
    ["providers.view", "providers.detail", "centers.view"],
    "view",
  );

  const canExportReport = hasSafePermission(
    auth,
    ["reports.export", "reports.providers.export"],
    "action",
  );

  const canPrintReport = hasSafePermission(
    auth,
    ["reports.print", "reports.providers.print"],
    "action",
  );

  const filteredRows = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return rows.filter((item) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : item.status === statusFilter;

      const matchesKind = kindFilter === "ALL" ? true : item.type === kindFilter;

      const matchesQuery = !cleanQuery
        ? true
        : [
            item.name,
            item.legalName,
            item.code,
            item.email,
            item.phone,
            item.mobile,
            item.city,
            item.area,
            item.address,
            item.category,
            statusLabel(item.status, locale),
            kindLabel(item.type, locale),
          ]
            .join(" ")
            .toLowerCase()
            .includes(cleanQuery);

      return matchesStatus && matchesKind && matchesQuery;
    });
  }, [kindFilter, locale, query, rows, statusFilter]);

  const filteredSummary = useMemo(
    () => normalizeSummary(filteredRows),
    [filteredRows],
  );

  const hasSearchOrFilter =
    query.trim().length > 0 || statusFilter !== "ALL" || kindFilter !== "ALL";

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
        value: "SUSPENDED" as StatusFilter,
        label: t.suspended,
        count: rows.filter((item) => item.status === "SUSPENDED").length,
      },
    ],
    [rows, t],
  );

  const kindOptions = useMemo(
    () => [
      { value: "ALL" as KindFilter, label: t.allTypes, count: rows.length },
      {
        value: "CENTER" as KindFilter,
        label: t.center,
        count: rows.filter((item) => item.type === "CENTER").length,
      },
      {
        value: "HOSPITAL" as KindFilter,
        label: t.hospital,
        count: rows.filter((item) => item.type === "HOSPITAL").length,
      },
      {
        value: "CLINIC" as KindFilter,
        label: t.clinic,
        count: rows.filter((item) => item.type === "CLINIC").length,
      },
      {
        value: "PHARMACY" as KindFilter,
        label: t.pharmacy,
        count: rows.filter((item) => item.type === "PHARMACY").length,
      },
      {
        value: "LAB" as KindFilter,
        label: t.lab,
        count: rows.filter((item) => item.type === "LAB").length,
      },
      {
        value: "DOCTOR" as KindFilter,
        label: t.doctor,
        count: rows.filter((item) => item.type === "DOCTOR").length,
      },
      {
        value: "OTHER" as KindFilter,
        label: t.other,
        count: rows.filter((item) => item.type === "OTHER").length,
      },
    ],
    [rows, t],
  );

  const summaryCards = useMemo(
    () => [
      {
        title: t.totalProviders,
        value: summary.total_providers,
        icon: Building2,
        helper: t.activeProviders,
        helperValue: formatNumber(summary.active_providers),
        percent: summary.total_providers > 0 ? 100 : 0,
      },
      {
        title: t.activeProviders,
        value: summary.active_providers,
        icon: CheckCircle2,
        helper: t.totalProviders,
        helperValue: `${percent(
          summary.active_providers,
          summary.total_providers,
        )}%`,
        percent: percent(summary.active_providers, summary.total_providers),
      },
      {
        title: t.providersWithContracts,
        value: summary.providers_with_contracts,
        icon: BadgeCheck,
        helper: t.table.contracts,
        helperValue: formatNumber(summary.total_contracts),
        percent: percent(summary.providers_with_contracts, summary.total_providers),
      },
      {
        title: t.totalFinancialValue,
        value: summary.total_payments_amount,
        icon: BarChart3,
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
        value: summary.active_providers,
        icon: CheckCircle2,
        filter: "ACTIVE" as StatusFilter,
        percent: percent(summary.active_providers, summary.total_providers),
      },
      {
        title: t.inactive,
        value: summary.inactive_providers,
        icon: XCircle,
        filter: "INACTIVE" as StatusFilter,
        percent: percent(summary.inactive_providers, summary.total_providers),
      },
      {
        title: t.pending,
        value: summary.pending_providers,
        icon: ShieldCheck,
        filter: "PENDING" as StatusFilter,
        percent: percent(summary.pending_providers, summary.total_providers),
      },
      {
        title: t.suspended,
        value: summary.suspended_providers,
        icon: XCircle,
        filter: "SUSPENDED" as StatusFilter,
        percent: percent(summary.suspended_providers, summary.total_providers),
      },
    ],
    [summary, t],
  );

  const typeCards = useMemo(
    () => [
      {
        title: t.center,
        value: summary.centers_count,
        icon: Building2,
        filter: "CENTER" as KindFilter,
        percent: percent(summary.centers_count, summary.total_providers),
      },
      {
        title: t.hospital,
        value: summary.hospitals_count,
        icon: Building2,
        filter: "HOSPITAL" as KindFilter,
        percent: percent(summary.hospitals_count, summary.total_providers),
      },
      {
        title: t.clinic,
        value: summary.clinics_count,
        icon: Stethoscope,
        filter: "CLINIC" as KindFilter,
        percent: percent(summary.clinics_count, summary.total_providers),
      },
      {
        title: t.pharmacy,
        value: summary.pharmacies_count,
        icon: ShieldCheck,
        filter: "PHARMACY" as KindFilter,
        percent: percent(summary.pharmacies_count, summary.total_providers),
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
          "/api/reports/providers/",
          "/api/providers/?page_size=300",
        ];

        let loadedPayload: ProvidersReportResponse | null = null;
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
            | ProvidersReportResponse
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
            loadedPayload?.message || "Unable to load providers report",
          );
        }

        const normalizedRows = extractRows(loadedPayload).map(normalizeProvider);

        setRows(normalizedRows);
        setSummary(
          normalizeSummary(normalizedRows, extractSummary(loadedPayload)),
        );

        if (showToast) {
          toast.success(t.refreshSuccess);
        }
      } catch (error) {
        console.error("Providers report load error:", error);
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
    setKindFilter("ALL");
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

    const kindFilterLabel =
      kindOptions.find((item) => item.value === kindFilter)?.label || t.all;

    downloadExcel({
      filename: `primey-care-providers-report-${generatedAt
        .toISOString()
        .slice(0, 10)}.xls`,
      worksheetName: isArabic ? "تقرير المراكز" : "Providers Report",
      title: t.title,
      locale,
      summaryRows: [
        [t.generatedAt, generatedAt.toLocaleString("en-US")],
        [t.reportScope, t.currentFilteredData],
        [t.totalProviders, filteredSummary.total_providers],
        [t.activeProviders, filteredSummary.active_providers],
        [t.providersWithContracts, filteredSummary.providers_with_contracts],
        [t.table.services, filteredSummary.total_services],
        [t.table.contracts, filteredSummary.total_contracts],
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
        [t.filterType, kindFilterLabel],
      ],
      headers: [
        "ID",
        t.table.provider,
        "Code",
        t.table.type,
        t.table.category,
        t.table.contact,
        "Email",
        t.table.city,
        "Area",
        t.table.status,
        t.table.services,
        t.table.contracts,
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
        kindLabel(item.type, locale),
        item.category || "-",
        item.mobile || item.phone || "-",
        item.email || "-",
        item.city || "-",
        item.area || "-",
        statusLabel(item.status, locale),
        formatNumber(item.servicesCount),
        formatNumber(item.contractsCount),
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
              <CardTitle className="text-base font-bold">
                {t.typeDistributionTitle}
              </CardTitle>
              <CardDescription>{t.typeDistributionDesc}</CardDescription>
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
                  : typeCards.map((card) => {
                      const Icon = card.icon;

                      return (
                        <button
                          key={card.filter}
                          type="button"
                          className="space-y-2 rounded-xl border bg-background/70 p-3 text-start transition hover:bg-muted/40"
                          onClick={() => setKindFilter(card.filter)}
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
                    {kindOptions.map((item) => {
                      const isSelected = kindFilter === item.value;

                      return (
                        <Button
                          key={item.value}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          className="h-10 rounded-xl"
                          onClick={() => setKindFilter(item.value)}
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
                        <TableHead>{t.table.provider}</TableHead>
                        <TableHead>{t.table.contact}</TableHead>
                        <TableHead>{t.table.city}</TableHead>
                        <TableHead>{t.table.type}</TableHead>
                        <TableHead>{t.table.category}</TableHead>
                        <TableHead>{t.table.status}</TableHead>
                        <TableHead>{t.table.services}</TableHead>
                        <TableHead>{t.table.contracts}</TableHead>
                        <TableHead>{t.table.orders}</TableHead>
                        <TableHead>{t.table.invoices}</TableHead>
                        <TableHead>{t.table.payments}</TableHead>
                        <TableHead>{t.totalFinancialValue}</TableHead>
                        <TableHead>{t.table.lastActivity}</TableHead>
                        {canViewProviderDetails ? (
                          <TableHead>{t.table.action}</TableHead>
                        ) : null}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {isLoading ? (
                        <TableRowsSkeleton
                          columnsCount={canViewProviderDetails ? 14 : 13}
                        />
                      ) : filteredRows.length > 0 ? (
                        filteredRows.map((item) => (
                          <TableRow key={`${item.id}-${item.name}`}>
                            <TableCell>
                              <div className="flex min-w-[260px] items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                                  <Building2 className="h-4 w-4" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-medium">
                                    {item.name || "-"}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {item.code || item.legalName || "-"}
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

                            <TableCell>{kindBadge(item.type, locale)}</TableCell>

                            <TableCell>
                              <span className="whitespace-nowrap">
                                {item.category || "-"}
                              </span>
                            </TableCell>

                            <TableCell>
                              {statusBadge(item.status, locale)}
                            </TableCell>

                            <TableCell>
                              {formatNumber(item.servicesCount)}
                            </TableCell>

                            <TableCell>
                              {formatNumber(item.contractsCount)}
                            </TableCell>

                            <TableCell>{formatNumber(item.ordersCount)}</TableCell>

                            <TableCell>
                              {formatNumber(item.invoicesCount)}
                            </TableCell>

                            <TableCell>
                              {formatNumber(item.paymentsCount)}
                            </TableCell>

                            <TableCell>
                              <MoneyText value={item.totalPaymentsAmount} />
                            </TableCell>

                            <TableCell>
                              <span className="whitespace-nowrap">
                                {formatDate(item.lastActivityAt)}
                              </span>
                            </TableCell>

                            {canViewProviderDetails ? (
                              <TableCell>
                                {isValidId(item.id) ? (
                                  <Link href={`/system/providers/${item.id}`}>
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
                            colSpan={canViewProviderDetails ? 14 : 13}
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