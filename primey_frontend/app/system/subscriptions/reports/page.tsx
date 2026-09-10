"use client";

// phase47D2B1_system_dashboard_design_contract=true

/* ============================================================
   📂 primey_frontend/app/system/subscriptions/reports/page.tsx
   🏢 Mhamcloud — System Subscriptions Reports
   ------------------------------------------------------------
   ✅ Premium PrimeyCare reports pattern adapted for Mhamcloud
   ✅ Real API only: GET /api/system/subscriptions/
   ✅ Summary KPIs + status/activity/city distributions
   ✅ Analytical full-width table
   ✅ Search, status, activity, city, date filters
   ✅ Excel .xls export
   ✅ Web print + PDF through browser print dialog
   ✅ Skeleton loading
   ✅ Error / Empty / No results states
   ✅ sonner toast
   ✅ Arabic/English via primey-locale
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowUpDown,
  BarChart3,
  Building2,
  ExternalLink,
  CheckCircle2,
  FileSpreadsheet,
  LayoutDashboard,
  ListChecks,
  Loader2,
  MapPin,
  MoreVertical,
  PieChart,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TableProperties,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { SystemKpiCard } from "@/components/ui/system-kpi-card";
import {
  DataRegisterDatePicker,
  DataRegisterEmptyState,
  DataRegisterSearch,
  DataRegisterToolbar,
  registerBrandButtonClass,
  registerOutlineButtonClass,
} from "@/components/ui/data-register";
import {
  DataRegisterResultCount,
  DataRegisterTableFrame,
} from "@/components/ui/data-register-table";
import { downloadExcelReport, type ExcelReportSection } from "@/lib/excel-report";
import {
  openPrintTableReport,
  type PrintReportTableSection,
} from "@/lib/print-report";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type StatusFilter =
  | "all"
  | "active"
  | "inactive"
  | "suspended"
  | "trial"
  | "pending"
  | "draft"
  | "cancelled"
  | "expired"
  | "past_due"
  | "unknown";
type SortKey = "newest" | "oldest" | "name" | "code" | "status" | "activity" | "city";

type CompanyRecord = {
  id: string;
  sort_id: number;
  company_key: string;
  name: string;
  code: string;
  status: string;
  owner: string;
  activity: string;
  subscription: string;
  amount: string;
  currency: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DistributionRow = {
  key: string;
  label: string;
  count: number;
  percent: number;
};

const API_ENDPOINT = "/api/system/subscriptions/";

const statusFilters: StatusFilter[] = [
  "all",
  "active",
  "inactive",
  "suspended",
  "trial",
  "pending",
  "draft",
  "cancelled",
  "expired",
  "past_due",
  "unknown",
];

const translations = {
  ar: {
    title: "تقارير الاشتراكات",
    subtitle:
      "تحليلات أحدث اشتراك لكل شركة في Mhamcloud حسب الحالة والخطة ودورة الفوترة والقيمة والتواريخ.",
    badge: "إدارة المنصة",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    addCompany: "قائمة الاشتراكات",
    companiesList: "قائمة الاشتراكات",
    companiesCenter: "مركز الاشتراكات",
    systemDashboard: "لوحة النظام",
    reset: "إعادة ضبط",

    searchPlaceholder: "ابحث باسم الشركة أو كود الاشتراك أو الخطة أو دورة الفوترة أو تاريخ الانتهاء...",
    statusFilter: "الحالة",
    activityFilter: "دورة الفوترة",
    cityFilter: "الخطة",
    fromDate: "من تاريخ",
    toDate: "إلى تاريخ",
    sort: "الترتيب",
    all: "الكل",
    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    codeSort: "الكود",
    statusSort: "الحالة",
    activitySort: "دورة الفوترة",
    citySort: "الخطة",

    totalCompanies: "إجمالي الاشتراكات",
    activeCompanies: "الاشتراكات النشطة",
    inactiveCompanies: "الاشتراكات المنتهية",
    subscribedCompanies: "شركات لديها اشتراك",
    uniqueActivities: "دورات فوترة مختلفة",
    uniqueCities: "خطط مختلفة",
    filteredRows: "نتائج التقرير",
    fromLiveApi: "من واجهات النظام الحقيقية",

    statusDistribution: "توزيع الاشتراكات حسب الحالة",
    statusDistributionDesc: "عدد ونسبة الاشتراكات في كل حالة.",
    activityDistribution: "توزيع الاشتراكات حسب دورة الفوترة",
    activityDistributionDesc: "أكثر دورات الفوترة ظهورا ضمن الاشتراكات الحالية.",
    cityDistribution: "توزيع الاشتراكات حسب الخطة",
    cityDistributionDesc: "توزيع الخطط ضمن الاشتراكات بعد تطبيق الفلاتر الحالية.",
    reportTable: "جدول التقرير التحليلي",
    reportTableDesc:
      "أحدث اشتراك لكل شركة بعد تطبيق الفلاتر الحالية وهي نفس البيانات المستخدمة في Excel والطباعة.",

    company: "الشركة",
    code: "كود الاشتراك",
    owner: "الخطة",
    activity: "دورة الفوترة",
    subscription: "القيمة",
    startsAt: "تاريخ البداية",
    endsAt: "تاريخ الانتهاء",
    status: "الحالة",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",
    open: "فتح",

    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    trial: "تجريبي",
    pending: "معلق",
    draft: "مسودة",
    cancelled: "ملغي",
    expired: "منتهي",
    past_due: "متأخر",
    unknown: "غير محدد",
    notAvailable: "غير متوفر",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    noDataTitle: "لا توجد اشتراكات",
    noDataDesc: "ستظهر تقارير الاشتراكات عند توفر بيانات من API.",
    noResultsTitle: "لا توجد اشتراكات مطابقة",
    noResultsDesc: "غير البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل تقارير الاشتراكات",
    errorDesc:
      "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    reportTitle: "تقرير اشتراكات Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
    refreshed: "تم تحديث تقارير الاشتراكات.",
  },
  en: {
    title: "Subscriptions reports",
    subtitle:
      "Analytics for each companys latest Mhamcloud subscription by status, plan, billing cycle, value, and dates.",
    badge: "Platform management",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    pdfHint: "Choose Save as PDF from the print dialog.",
    addCompany: "Subscriptions list",
    companiesList: "Subscriptions list",
    companiesCenter: "Subscriptions center",
    systemDashboard: "System dashboard",
    reset: "Reset",

    searchPlaceholder: "Search by company, subscription code, plan, billing cycle, or end date...",
    statusFilter: "Status",
    activityFilter: "Billing cycle",
    cityFilter: "Plan",
    fromDate: "From date",
    toDate: "To date",
    sort: "Sort",
    all: "All",
    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    codeSort: "Code",
    statusSort: "Status",
    activitySort: "Billing cycle",
    citySort: "Plan",

    totalCompanies: "Total subscriptions",
    activeCompanies: "Active subscriptions",
    inactiveCompanies: "Expired subscriptions",
    subscribedCompanies: "With subscription",
    uniqueActivities: "Unique billing cycles",
    uniqueCities: "Unique plans",
    filteredRows: "Report results",
    fromLiveApi: "From real system APIs",

    statusDistribution: "Subscriptions by status",
    statusDistributionDesc: "Count and ratio of companies by operational status.",
    activityDistribution: "Subscriptions by billing cycle",
    activityDistributionDesc: "Top billing cycles appearing in current subscriptions.",
    cityDistribution: "Subscriptions by plan",
    cityDistributionDesc: "Plan distribution across the current filtered subscriptions.",
    reportTable: "Analytical report table",
    reportTableDesc:
      "Each companys latest subscription after current filters, used by Excel export and print.",

    company: "Company",
    code: "Subscription code",
    owner: "Plan",
    activity: "Billing cycle",
    subscription: "Value",
    startsAt: "Start date",
    endsAt: "End date",
    status: "Status",
    createdAt: "Created at",
    updatedAt: "Updated at",
    open: "Open",

    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    trial: "Trial",
    pending: "Pending",
    draft: "Draft",
    cancelled: "Cancelled",
    expired: "Expired",
    past_due: "Past due",
    unknown: "Unknown",
    notAvailable: "Not available",

    showing: "Showing",
    of: "of",
    rows: "rows",
    noDataTitle: "No subscriptions",
    noDataDesc: "Subscription reports will appear when the API returns data.",
    noResultsTitle: "No matching subscriptions",
    noResultsDesc: "Change the search or filters to show other results.",
    errorTitle: "Could not load subscriptions reports",
    errorDesc:
      "Make sure you are signed in as a system user and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    reportTitle: "Mhamcloud Subscriptions Report",
    generatedAt: "Generated at",
    refreshed: "Subscriptions reports refreshed.",
  },
} as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
}

function normalizeText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(toNumber(value)),
  );
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value)}%`;
}

function MoneyValue({
  amount,
  currency,
}: {
  amount: string;
  currency: string;
}) {
  const parsed = Number.parseFloat(amount || "0");
  const formatted = Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
  const normalizedCurrency = normalizeText(currency, "SAR").toUpperCase();

  if (normalizedCurrency !== "SAR") {
    return (
      <span dir="ltr" className="tabular-nums">
        {formatted} {normalizedCurrency}
      </span>
    );
  }

  return (
    <span
      dir="ltr"
      className="inline-flex items-center gap-1 font-medium tabular-nums"
    >
      <Image
        src="/currency/sar.svg"
        alt="SAR"
        width={15}
        height={15}
        className="h-[15px] w-[15px]"
      />
      {formatted}
    </span>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function rowDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareSubscriptionRecency(
  a: CompanyRecord,
  b: CompanyRecord,
  direction: "newest" | "oldest",
) {
  const multiplier =
    direction === "newest"
      ? -1
      : 1;

  const createdDifference =
    rowDateValue(a.created_at) -
    rowDateValue(b.created_at);

  if (createdDifference !== 0) {
    return createdDifference * multiplier;
  }

  return (
    (a.sort_id - b.sort_id) *
    multiplier
  );
}

function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value)
      .replace("T", " ")
      .slice(0, 16);
  }

  return parsed
    .toISOString()
    .replace("T", " ")
    .slice(0, 16);
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function getApiBaseUrl() {
  const envBase =
    typeof process !== "undefined"
      ? (
          process.env.NEXT_PUBLIC_API_BASE_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          ""
        ).replace(/\/+$/, "")
      : "";

  if (envBase.endsWith("/api")) return envBase.slice(0, -4);
  return envBase;
}

function makeApiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${getApiBaseUrl()}${path}${query ? `?${query}` : ""}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
  let payload: unknown = null;

  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const record = asRecord(payload);
    const message =
      normalizeText(record.message) ||
      normalizeText(record.detail) ||
      normalizeText(record.error) ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return (payload || {}) as T;
}

function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const resultRecord = asRecord(record.result);

  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(record.subscriptions)) return record.subscriptions;
  if (Array.isArray(record.companies)) return record.companies;
  if (Array.isArray(record.data)) return record.data;

  if (Array.isArray(dataRecord.results)) return dataRecord.results;
  if (Array.isArray(dataRecord.items)) return dataRecord.items;
  if (Array.isArray(dataRecord.records)) return dataRecord.records;
  if (Array.isArray(dataRecord.subscriptions)) return dataRecord.subscriptions;
  if (Array.isArray(dataRecord.companies)) return dataRecord.companies;

  if (Array.isArray(resultRecord.results)) return resultRecord.results;
  if (Array.isArray(resultRecord.items)) return resultRecord.items;
  if (Array.isArray(resultRecord.records)) return resultRecord.records;
  if (Array.isArray(resultRecord.subscriptions)) return resultRecord.subscriptions;
  if (Array.isArray(resultRecord.companies)) return resultRecord.companies;

  return [];
}

function extractCount(payload: unknown) {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const metaRecord = asRecord(record.meta);
  const arrayCount = extractArray(payload).length;

  return toNumber(
    record.count ??
      record.total ??
      record.total_count ??
      dataRecord.count ??
      dataRecord.total ??
      dataRecord.total_count ??
      metaRecord.count ??
      metaRecord.total ??
      metaRecord.total_count,
    arrayCount,
  );
}


async function fetchAllSubscriptionRows(
  endpoint: string,
): Promise<{
  rows: CompanyRecord[];
  total: number;
}> {
  const pageSize = 500;
  const maxPages = 100;

  const accumulated: CompanyRecord[] = [];
  let expectedTotal = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      ordering: "-created_at",
    });

    const payload = await fetchJson<unknown>(
      makeApiUrl(endpoint, params),
    );

    const rawRows = extractArray(payload);

    if (page === 1) {
      expectedTotal = extractCount(payload);
    }

    if (!rawRows.length) {
      break;
    }

    accumulated.push(
      ...rawRows.map(normalizeCompany),
    );

    if (
      expectedTotal > 0 &&
      accumulated.length >= expectedTotal
    ) {
      break;
    }

    if (rawRows.length < pageSize) {
      break;
    }
  }

  return {
    rows: accumulated,
    total:
      expectedTotal > 0
        ? expectedTotal
        : accumulated.length,
  };
}

function normalizeNestedName(value: unknown, keys: string[] = ["name", "title", "full_name"]) {
  if (typeof value === "string") return value;
  const record = asRecord(value);

  for (const key of keys) {
    const text = normalizeText(record[key]);
    if (text) return text;
  }

  return "";
}

function normalizeStatus(value: unknown) {
  if (value === null || value === undefined || value === "") return "unknown";
  if (typeof value === "boolean") return value ? "active" : "inactive";

  const text = normalizeText(value).toLowerCase();

  if (!text) return "unknown";
  if (text === "true") return "active";
  if (text === "false") return "inactive";
  if (text === "enabled") return "active";
  if (text === "disabled") return "inactive";
  if (text === "pending_payment") return "pending";

  return text;
}

function normalizeCompany(value: unknown): CompanyRecord {
  const record = asRecord(value);
  const company =
    record.company ||
    record.company_ref ||
    record.tenant ||
    record.account_company;

  const companyRecord =
    asRecord(company);

  const plan =
    record.plan ||
    record.subscription_plan ||
    record.package ||
    record.product;
  const planRecord = asRecord(plan);
  const pricing = asRecord(record.pricing);
  const totals = asRecord(record.totals);
  const amount = normalizeText(
    record.amount ||
      record.price ||
      record.monthly_price ||
      record.subscription_amount ||
      record.total_amount ||
      pricing.amount ||
      pricing.price ||
      totals.amount ||
      totals.total,
    "0",
  );
  const currency = normalizeText(record.currency || pricing.currency || "SAR", "SAR");
  const rawCycle = normalizeText(
    record.billing_cycle || record.cycle || record.period || planRecord.billing_cycle,
    "unknown",
  ).toLowerCase();
  const cycle =
    rawCycle === "month"
      ? "monthly"
      : rawCycle === "year"
        ? "yearly"
        : rawCycle === "semiannual" || rawCycle === "semi-annual"
          ? "semi_annual"
          : rawCycle === "one-time"
            ? "one_time"
            : rawCycle;
  const planName =
    normalizeNestedName(plan, ["name", "plan_name", "title", "display_name"]) ||
    normalizeText(record.plan_name || record.package_name, "—");
  const rawId =
    record.id ??
    record.pk ??
    record.subscription_id;

  return {
    id: normalizeText(record.id || record.uuid || record.pk || record.slug || record.code),
    sort_id: toNumber(rawId, 0),
    company_key: normalizeText(
      companyRecord.id ||
        companyRecord.pk ||
        companyRecord.company_id ||
        companyRecord.companyId ||
        record.company_id ||
        record.companyId ||
        record.tenant_id ||
        record.account_company_id,
    ),
    name:
      normalizeNestedName(company, ["name", "company_name", "title", "display_name"]) ||
      normalizeText(record.company_name || record.company_title, "—"),
    code: normalizeText(
      record.code ||
        record.subscription_code ||
        record.reference ||
        record.invoice_number ||
        record.uuid ||
        record.id,
      "—",
    ),
    status: normalizeStatus(record.status ?? record.state ?? record.is_active),
    owner: planName,
    activity: cycle || "unknown",
    subscription: `${amount} ${currency}`,
    amount,
    currency,
    starts_at:
      normalizeText(
        record.starts_at ||
          record.start_date ||
          record.started_at ||
          record.valid_from,
      ) || null,
    ends_at:
      normalizeText(
        record.ends_at ||
          record.end_date ||
          record.expires_at ||
          record.valid_to,
      ) || null,
    created_at:
      normalizeText(
        record.created_at ||
          record.created ||
          record.inserted_at,
      ) || null,
    updated_at: normalizeText(record.updated_at || record.modified_at || record.updated || record.last_modified) || null,
  };
}function getStatusLabel(value: string, locale: Locale) {
  const normalized = value.toLowerCase();

  const ar: Record<string, string> = {
    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    trial: "تجريبي",
    pending: "معلق",
    draft: "مسودة",
    cancelled: "ملغي",
    expired: "منتهي",
    past_due: "متأخر",
    unknown: "غير محدد",
  };

  const en: Record<string, string> = {
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    trial: "Trial",
    pending: "Pending",
    draft: "Draft",
    cancelled: "Cancelled",
    expired: "Expired",
    past_due: "Past due",
    unknown: "Unknown",
  };

  return locale === "ar" ? ar[normalized] || value : en[normalized] || value;
}


function getBillingCycleLabel(value: string, locale: Locale) {
  const key = normalizeText(value, "unknown").toLowerCase().replace(/[\s-]+/g, "_");
  const ar: Record<string, string> = {
    monthly: "شهري", month: "شهري", yearly: "سنوي", year: "سنوي",
    annual: "سنوي", annually: "سنوي", quarterly: "ربع سنوي",
    semi_annual: "نصف سنوي", semiannual: "نصف سنوي",
    one_time: "مرة واحدة", unknown: "غير محدد",
  };
  const en: Record<string, string> = {
    monthly: "Monthly", month: "Monthly", yearly: "Yearly", year: "Yearly",
    annual: "Yearly", annually: "Yearly", quarterly: "Quarterly",
    semi_annual: "Semi-annual", semiannual: "Semi-annual",
    one_time: "One-time", unknown: "Unknown",
  };
  return (locale === "ar" ? ar : en)[key] || value;
}

function getStatusClass(value: string) {
  const normalized = value.toLowerCase();

  if (["active", "paid", "confirmed", "ready", "success"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["pending", "trial", "draft", "processing", "past_due"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["inactive", "failed", "cancelled", "expired", "suspended", "blocked"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function StatusBadge({ value, locale }: { value: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", getStatusClass(value))}
    >
      {getStatusLabel(value, locale)}
    </Badge>
  );
}


function RegisterActionMenu({
  href,
  label,
  locale,
}: {
  href: string;
  label: string;
  locale: Locale;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-lg bg-background"
          aria-label={label}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={
          locale === "ar"
            ? "start"
            : "end"
        }
        className="w-44"
      >
        <DropdownMenuItem asChild>
          <Link
            href={href}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4 text-[#a57b3d]" />
            {label}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function makeDistribution(
  rows: CompanyRecord[],
  pick: (row: CompanyRecord) => string,
  locale: Locale,
  options?: { status?: boolean; limit?: number },
): DistributionRow[] {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const key = normalizeText(pick(row), "—");
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const total = rows.length || 1;

  return [...counts.entries()]
    .map(([key, count]) => ({
      key,
      label: options?.status ? getStatusLabel(key, locale) : key,
      count,
      percent: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, options?.limit || 10);
}

function ReportSkeleton() {
  return (
    <main className="min-h-screen bg-transparent px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-8 w-72" />
          <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="rounded-2xl">
              <CardHeader>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="rounded-2xl">
          <CardHeader>
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function DistributionCard({
  title,
  description,
  rows,
  locale,
}: {
  title: string;
  description: string;
  rows: DistributionRow[];
  locale: Locale;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <div key={row.key} className="rounded-lg border bg-background p-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium text-foreground">{row.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatInteger(row.count)} · {formatPercent(row.percent)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    locale === "ar" ? "origin-right" : "origin-left",
                    "bg-primary",
                  )}
                  style={{ width: `${Math.max(3, Math.min(100, row.percent))}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="flex min-h-32 items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
            —
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SystemSubscriptionsReportsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [companies, setCompanies] = React.useState<CompanyRecord[]>([]);
  const [apiTotal, setApiTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [activity, setActivity] = React.useState("all");
  const [city, setCity] = React.useState("all");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("newest");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const alignClass = locale === "ar" ? "text-right" : "text-left";

  React.useEffect(() => {
    const applyLocale = () => {
      const nextLocale = getInitialLocale();
      setLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
      document.body.dir = nextLocale === "ar" ? "rtl" : "ltr";
    };

    applyLocale();
    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);

    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);

  const loadCompanies = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const result =
          await fetchAllSubscriptionRows(
            API_ENDPOINT,
          );

        setCompanies(result.rows);
        setApiTotal(result.total);

        if (silent) toast.success(t.refreshed);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);


  const latestCompanies = React.useMemo<CompanyRecord[]>(() => {
    const ordered = [...companies].sort((a, b) =>
      compareSubscriptionRecency(
        a,
        b,
        "newest",
      ),
    );

    const seenCompanies = new Set<string>();

    return ordered.filter((company) => {
      const key = company.company_key.trim();

      if (!key) {
        return true;
      }

      if (seenCompanies.has(key)) {
        return false;
      }

      seenCompanies.add(key);

      return true;
    });
  }, [companies]);

  const activityOptions = React.useMemo(
    () =>
      [
        ...new Set(
          latestCompanies
            .map(
              (company) =>
                company.activity,
            )
            .filter(
              (value) =>
                value &&
                value !== "—",
            ),
        ),
      ].sort(),
    [latestCompanies],
  );

  const cityOptions = React.useMemo(
    () =>
      [
        ...new Set(
          latestCompanies
            .map(
              (company) =>
                company.owner,
            )
            .filter(
              (value) =>
                value &&
                value !== "—",
            ),
        ),
      ].sort(),
    [latestCompanies],
  );

  const filteredCompanies = React.useMemo(() => {
    const needle =
      search.trim().toLowerCase();

    const fromTime = fromDate
      ? new Date(
          `${fromDate}T00:00:00`,
        ).getTime()
      : 0;

    const toTime = toDate
      ? new Date(
          `${toDate}T23:59:59`,
        ).getTime()
      : 0;

    const rows =
      latestCompanies.filter(
        (company) => {
          const haystack = [
            company.name,
            company.code,
            company.owner,
            company.activity,
            company.subscription,
            company.starts_at,
            company.ends_at,
            company.created_at,
            company.status,
          ]
            .join(" ")
            .toLowerCase();

          const businessTime =
            rowDateValue(
              company.starts_at,
            ) ||
            rowDateValue(
              company.created_at,
            );

          if (
            needle &&
            !haystack.includes(needle)
          ) {
            return false;
          }

          if (
            status !== "all" &&
            company.status !== status
          ) {
            return false;
          }

          if (
            activity !== "all" &&
            company.activity !== activity
          ) {
            return false;
          }

          if (
            city !== "all" &&
            company.owner !== city
          ) {
            return false;
          }

          if (
            fromTime &&
            businessTime &&
            businessTime < fromTime
          ) {
            return false;
          }

          if (
            toTime &&
            businessTime &&
            businessTime > toTime
          ) {
            return false;
          }

          return true;
        },
      );

    return [...rows].sort(
      (a, b) => {
        if (sort === "oldest") {
          return compareSubscriptionRecency(
            a,
            b,
            "oldest",
          );
        }

        if (sort === "name") {
          return (
            a.name.localeCompare(
              b.name,
            ) ||
            b.sort_id -
              a.sort_id
          );
        }

        if (sort === "code") {
          return (
            a.code.localeCompare(
              b.code,
            ) ||
            b.sort_id -
              a.sort_id
          );
        }

        if (sort === "status") {
          return (
            a.status.localeCompare(
              b.status,
            ) ||
            b.sort_id -
              a.sort_id
          );
        }

        if (sort === "activity") {
          return (
            a.activity.localeCompare(
              b.activity,
            ) ||
            b.sort_id -
              a.sort_id
          );
        }

        if (sort === "city") {
          return (
            a.owner.localeCompare(
              b.owner,
            ) ||
            b.sort_id -
              a.sort_id
          );
        }

        return compareSubscriptionRecency(
          a,
          b,
          "newest",
        );
      },
    );
  }, [
    activity,
    city,
    fromDate,
    latestCompanies,
    search,
    sort,
    status,
    toDate,
  ]);

  const stats = React.useMemo(() => {
    return {
      total:
        latestCompanies.length,

      active:
        latestCompanies.filter(
          (company) =>
            company.status === "active",
        ).length,

      inactive:
        latestCompanies.filter(
          (company) =>
            company.status === "expired",
        ).length,

      subscribed:
        latestCompanies.filter(
          (company) =>
            company.subscription &&
            company.subscription !== "—",
        ).length,

      activities:
        activityOptions.length,

      cities:
        cityOptions.length,

      filtered:
        filteredCompanies.length,
    };
  }, [
    activityOptions.length,
    cityOptions.length,
    filteredCompanies.length,
    latestCompanies,
  ]);

  const statusDistribution = React.useMemo(
    () => makeDistribution(filteredCompanies, (row) => row.status, locale, { status: true, limit: 8 }),
    [filteredCompanies, locale],
  );

  const activityDistribution = React.useMemo(
    () => makeDistribution(filteredCompanies, (row) => row.activity, locale, { limit: 8 }),
    [filteredCompanies, locale],
  );

  const cityDistribution = React.useMemo(
    () => makeDistribution(filteredCompanies, (row) => row.owner, locale, { limit: 8 }),
    [filteredCompanies, locale],
  );

  const hasFilters = Boolean(
    search || status !== "all" || activity !== "all" || city !== "all" || fromDate || toDate || sort !== "newest",
  );

  function resetFilters() {
    setSearch("");
    setStatus("all");
    setActivity("all");
    setCity("all");
    setFromDate("");
    setToDate("");
    setSort("newest");
  }

  function buildExportRows() {
    return filteredCompanies.map(
      (company) => [
        company.name,
        company.code,
        company.owner,
        getBillingCycleLabel(
          company.activity,
          locale,
        ),
        company.subscription,
        formatDate(
          company.starts_at,
        ),
        formatDate(
          company.ends_at,
        ),
        getStatusLabel(
          company.status,
          locale,
        ),
        formatDateTime(
          company.created_at,
        ),
      ],
    );
  }

  function buildPrintSection(): PrintReportTableSection {
    return {
      title: t.reportTable,
      columns: [
        {
          label: t.company,
          width: 220,
          type: "text",
        },
        {
          label: t.code,
          width: 120,
          type: "text",
        },
        {
          label: t.owner,
          width: 165,
          type: "text",
        },
        {
          label: t.activity,
          width: 105,
          type: "text",
        },
        {
          label: t.subscription,
          width: 115,
          type: "text",
        },
        {
          label: t.startsAt,
          width: 115,
          type: "text",
        },
        {
          label: t.endsAt,
          width: 115,
          type: "text",
        },
        {
          label: t.status,
          width: 105,
          type: "text",
        },
        {
          label: t.createdAt,
          width: 145,
          type: "text",
        },
      ],
      rows: buildExportRows(),
    };
  }

  function exportExcel() {
    const rows = buildExportRows();
    if (!rows.length) {
      toast.error(t.exportEmpty);
      return;
    }
    const headers = [
      t.company,
      t.code,
      t.owner,
      t.activity,
      t.subscription,
      t.startsAt,
      t.endsAt,
      t.status,
      t.createdAt,
    ];
    const section: ExcelReportSection = {
      title: t.reportTitle,
      headers,
      rows: rows.map((row) =>
        row.map((value) => ({ value: String(value ?? ""), type: "text" as const })),
      ),
    };
    downloadExcelReport({
      locale,
      title: t.reportTitle,
      filename: `Mhamcloud-system-subscriptions-${new Date().toISOString().slice(0, 10)}.xls`,
      generatedAtLabel: t.generatedAt,
      sections: [section],
    });
    toast.success(locale === "ar" ? "تم تجهيز ملف Excel بنجاح." : "Excel file prepared successfully.");
  }

  function openPrintWindow() {
    const rows = buildExportRows();
    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }
    const opened = openPrintTableReport({
      locale,
      title: t.reportTitle,
      sections: [buildPrintSection()],
      recordsCount: rows.length,
      recordsLabel: t.rows,
      generatedAtLabel: t.generatedAt,
    });
    if (!opened) {
      toast.error(locale === "ar"
        ? "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة."
        : "Could not open the print window. Allow pop-ups and try again.");
    }
  }

  if (loading) return <ReportSkeleton />;

  if (error) {
    return (
      <main dir={dir} className="min-h-screen bg-transparent px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl rounded-lg border-destructive/30 bg-card shadow-none">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-full bg-destructive/10 p-4 text-destructive">
              <TriangleAlert className="h-8 w-8" />
            </div>
            <CardTitle>{t.errorTitle}</CardTitle>
            <CardDescription>{t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => void loadCompanies({ silent: true })} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main
      dir={dir}
      className="min-h-screen bg-transparent px-4 py-6 text-foreground sm:px-6 lg:px-8"
    >
      <div className="w-full space-y-6">

        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#9a7139]">
              <Sparkles className="h-4 w-4 text-[#a57b3d]" />
              {t.badge}
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              {t.title}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              {t.subtitle}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">

            <Button
              type="button"
              variant="outline"
              className={registerOutlineButtonClass}
              onClick={() =>
                void loadCompanies({
                  silent: true,
                })
              }
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t.refresh}
            </Button>

            <Button
              type="button"
              variant="outline"
              className={registerOutlineButtonClass}
              onClick={exportExcel}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t.exportExcel}
            </Button>

            <Button
              type="button"
              variant="brand"
              className={registerBrandButtonClass}
              onClick={openPrintWindow}
            >
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>

            <Button
              asChild
              variant="brand"
              className={registerBrandButtonClass}
            >
              <Link href="/system/subscriptions/list">
                <ListChecks className="h-4 w-4" />
                {t.companiesList}
              </Link>
            </Button>

          </div>
        </header>


        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <SystemKpiCard
            title={t.totalCompanies}
            value={stats.total}
            description={t.fromLiveApi}
            href="/system/subscriptions/list"
            icon={Building2}
          />

          <SystemKpiCard
            title={t.activeCompanies}
            value={stats.active}
            description={t.fromLiveApi}
            href="/system/subscriptions/list"
            icon={CheckCircle2}
          />

          <SystemKpiCard
            title={t.inactiveCompanies}
            value={stats.inactive}
            description={t.fromLiveApi}
            href="/system/subscriptions/list"
            icon={ShieldCheck}
          />

          <SystemKpiCard
            title={t.subscribedCompanies}
            value={stats.subscribed}
            description={t.fromLiveApi}
            href="/system/subscriptions/list"
            icon={Activity}
          />

        </section>


        <section className="grid gap-4 md:grid-cols-3">

          <SystemKpiCard
            title={t.uniqueActivities}
            value={stats.activities}
            description={t.fromLiveApi}
            icon={PieChart}
          />

          <SystemKpiCard
            title={t.uniqueCities}
            value={stats.cities}
            description={t.fromLiveApi}
            icon={MapPin}
          />

          <SystemKpiCard
            title={t.filteredRows}
            value={stats.filtered}
            description={t.fromLiveApi}
            icon={TableProperties}
          />

        </section>


        <DataRegisterToolbar className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_150px_170px_170px_160px_160px_170px_auto]">

          <DataRegisterSearch
            value={search}
            onChange={setSearch}
            placeholder={t.searchPlaceholder}
          />

          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(
                value as StatusFilter,
              )
            }
          >
            <SelectTrigger className="h-9 bg-background shadow-none">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {statusFilters.map(
                (item) => (
                  <SelectItem
                    key={item}
                    value={item}
                  >
                    {item === "all"
                      ? t.all
                      : getStatusLabel(
                          item,
                          locale,
                        )}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>


          <Select
            value={activity}
            onValueChange={setActivity}
          >
            <SelectTrigger className="h-9 bg-background shadow-none">
              <SelectValue
                placeholder={
                  t.activityFilter
                }
              />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                {t.all}
              </SelectItem>

              {activityOptions.map(
                (item) => (
                  <SelectItem
                    key={item}
                    value={item}
                  >
                    {getBillingCycleLabel(
                      item,
                      locale,
                    )}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>


          <Select
            value={city}
            onValueChange={setCity}
          >
            <SelectTrigger className="h-9 bg-background shadow-none">
              <SelectValue
                placeholder={t.cityFilter}
              />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                {t.all}
              </SelectItem>

              {cityOptions.map(
                (item) => (
                  <SelectItem
                    key={item}
                    value={item}
                  >
                    {item}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>


          <DataRegisterDatePicker
            label={t.fromDate}
            value={fromDate}
            onChange={setFromDate}
            locale={locale}
          />

          <DataRegisterDatePicker
            label={t.toDate}
            value={toDate}
            onChange={setToDate}
            locale={locale}
          />


          <Select
            value={sort}
            onValueChange={(value) =>
              setSort(
                value as SortKey,
              )
            }
          >
            <SelectTrigger className="h-9 bg-background shadow-none">
              <ArrowUpDown className="h-4 w-4" />
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="newest">
                {t.newest}
              </SelectItem>
              <SelectItem value="oldest">
                {t.oldest}
              </SelectItem>
              <SelectItem value="name">
                {t.nameSort}
              </SelectItem>
              <SelectItem value="code">
                {t.codeSort}
              </SelectItem>
              <SelectItem value="status">
                {t.statusSort}
              </SelectItem>
              <SelectItem value="activity">
                {t.activitySort}
              </SelectItem>
              <SelectItem value="city">
                {t.citySort}
              </SelectItem>
            </SelectContent>
          </Select>


          <Button
            type="button"
            variant="outline"
            className="h-9 bg-background shadow-none"
            onClick={resetFilters}
          >
            <RotateCcw className="h-4 w-4" />
            {t.reset}
          </Button>

        </DataRegisterToolbar>


        <div className="grid gap-4 xl:grid-cols-3">

          <DistributionCard
            title={t.statusDistribution}
            description={
              t.statusDistributionDesc
            }
            rows={statusDistribution}
            locale={locale}
          />

          <DistributionCard
            title={t.activityDistribution}
            description={
              t.activityDistributionDesc
            }
            rows={activityDistribution}
            locale={locale}
          />

          <DistributionCard
            title={t.cityDistribution}
            description={
              t.cityDistributionDesc
            }
            rows={cityDistribution}
            locale={locale}
          />

        </div>


        <Card className="w-full overflow-hidden rounded-lg border bg-card shadow-none">

          <CardHeader className="px-5 pt-5 sm:px-6">

            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">

              <div className="min-w-0">

                <CardTitle className="flex items-center gap-2 text-base font-bold tracking-tight">

                  <TableProperties className="h-4 w-4 text-[#a57b3d]" />

                  {t.reportTable}

                </CardTitle>

                <CardDescription className="mt-1 leading-6">

                  {t.reportTableDesc}

                </CardDescription>

              </div>


              <div className="flex shrink-0 flex-wrap items-center gap-2">

                <Button
                  type="button"
                  variant="outline"
                  className={registerOutlineButtonClass}
                  onClick={exportExcel}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.exportExcel}
                </Button>

                <Button
                  type="button"
                  variant="brand"
                  className={registerBrandButtonClass}
                  onClick={openPrintWindow}
                >
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>

              </div>
            </div>
          </CardHeader>


          <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">

            <DataRegisterTableFrame>

              <div className="w-full overflow-x-auto">

                <Table
                  variant="register"
                  layout="fixed"
                  minWidth={1180}
                >

                  <TableHeader>

                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">

                      <TableHead className={cn(
                        "h-11 w-[220px] px-4 text-xs font-semibold text-muted-foreground",
                        alignClass,
                      )}>
                        {t.company}
                      </TableHead>

                      <TableHead className={cn(
                        "h-11 w-[120px] px-4 text-xs font-semibold text-muted-foreground",
                        alignClass,
                      )}>
                        {t.code}
                      </TableHead>

                      <TableHead className={cn(
                        "h-11 w-[165px] px-4 text-xs font-semibold text-muted-foreground",
                        alignClass,
                      )}>
                        {t.owner}
                      </TableHead>

                      <TableHead className={cn(
                        "h-11 w-[105px] px-4 text-xs font-semibold text-muted-foreground",
                        alignClass,
                      )}>
                        {t.activity}
                      </TableHead>

                      <TableHead className={cn(
                        "h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground",
                        alignClass,
                      )}>
                        {t.subscription}
                      </TableHead>

                      <TableHead className={cn(
                        "h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground",
                        alignClass,
                      )}>
                        {t.startsAt}
                      </TableHead>

                      <TableHead className={cn(
                        "h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground",
                        alignClass,
                      )}>
                        {t.endsAt}
                      </TableHead>

                      <TableHead className={cn(
                        "h-11 w-[105px] px-4 text-xs font-semibold text-muted-foreground",
                        alignClass,
                      )}>
                        {t.status}
                      </TableHead>

                      <TableHead className={cn(
                        "h-11 w-[145px] px-4 text-xs font-semibold text-muted-foreground",
                        alignClass,
                      )}>
                        {t.createdAt}
                      </TableHead>

                      <TableHead className="sticky end-0 z-10 h-11 w-[76px] bg-muted/40 px-3 text-center text-xs font-semibold text-muted-foreground">
                        {t.open}
                      </TableHead>

                    </TableRow>
                  </TableHeader>


                  <TableBody>

                    {filteredCompanies.length ? (

                      filteredCompanies.map(
                        (company) => (

                          <TableRow
                            key={
                              company.id ||
                              company.code ||
                              company.name
                            }
                            className="h-[62px]"
                          >

                            <TableCell className={cn(
                              "h-[62px] overflow-hidden px-4 align-middle",
                              alignClass,
                            )}>
                              <div className="min-w-0">

                                <span className="block truncate text-sm font-semibold text-foreground">
                                  {company.name ||
                                    t.notAvailable}
                                </span>

                                <span className="block truncate text-xs text-muted-foreground">
                                  #
                                  {company.id ||
                                    company.code ||
                                    "—"}
                                </span>

                              </div>
                            </TableCell>


                            <TableCell className={cn(
                              "h-[62px] overflow-hidden px-4 align-middle",
                              alignClass,
                            )}>
                              <span
                                dir="ltr"
                                className="block truncate text-sm tabular-nums text-muted-foreground"
                              >
                                {company.code ||
                                  "—"}
                              </span>
                            </TableCell>


                            <TableCell className={cn(
                              "h-[62px] overflow-hidden px-4 align-middle",
                              alignClass,
                            )}>
                              <span className="block truncate text-sm text-muted-foreground">
                                {company.owner ||
                                  "—"}
                              </span>
                            </TableCell>


                            <TableCell className={cn(
                              "h-[62px] overflow-hidden px-4 align-middle",
                              alignClass,
                            )}>
                              <span className="block truncate text-sm text-muted-foreground">
                                {getBillingCycleLabel(
                                  company.activity,
                                  locale,
                                )}
                              </span>
                            </TableCell>


                            <TableCell className={cn(
                              "h-[62px] overflow-hidden px-4 align-middle",
                              alignClass,
                            )}>
                              <MoneyValue
                                amount={
                                  company.amount
                                }
                                currency={
                                  company.currency
                                }
                              />
                            </TableCell>


                            <TableCell className={cn(
                              "h-[62px] overflow-hidden px-4 align-middle",
                              alignClass,
                            )}>
                              <span
                                dir="ltr"
                                lang="en"
                                className="block text-sm tabular-nums text-muted-foreground"
                              >
                                {formatDate(
                                  company.starts_at,
                                )}
                              </span>
                            </TableCell>


                            <TableCell className={cn(
                              "h-[62px] overflow-hidden px-4 align-middle",
                              alignClass,
                            )}>
                              <span
                                dir="ltr"
                                lang="en"
                                className="block text-sm tabular-nums text-muted-foreground"
                              >
                                {formatDate(
                                  company.ends_at,
                                )}
                              </span>
                            </TableCell>


                            <TableCell className={cn(
                              "h-[62px] px-4 align-middle",
                              alignClass,
                            )}>
                              <StatusBadge
                                value={
                                  company.status
                                }
                                locale={locale}
                              />
                            </TableCell>


                            <TableCell className={cn(
                              "h-[62px] px-4 align-middle",
                              alignClass,
                            )}>
                              <span
                                dir="ltr"
                                lang="en"
                                className="whitespace-nowrap text-sm tabular-nums text-muted-foreground"
                              >
                                {formatDateTime(
                                  company.created_at,
                                )}
                              </span>
                            </TableCell>


                            <TableCell className="sticky end-0 z-10 h-[62px] bg-background px-3 text-center align-middle">

                              <RegisterActionMenu
                                href={
                                  company.id
                                    ? `/system/subscriptions/${company.id}`
                                    : "/system/subscriptions/list"
                                }
                                label={t.open}
                                locale={locale}
                              />

                            </TableCell>

                          </TableRow>
                        ),
                      )

                    ) : (

                      <TableRow>

                        <TableCell
                          colSpan={10}
                          className="p-0"
                        >

                          <DataRegisterEmptyState
                            title={
                              hasFilters
                                ? t.noResultsTitle
                                : t.noDataTitle
                            }
                            description={
                              hasFilters
                                ? t.noResultsDesc
                                : t.noDataDesc
                            }
                            showReset={
                              hasFilters
                            }
                            resetLabel={
                              t.reset
                            }
                            onReset={
                              resetFilters
                            }
                          />

                        </TableCell>
                      </TableRow>

                    )}

                  </TableBody>
                </Table>

              </div>
            </DataRegisterTableFrame>


            <DataRegisterResultCount
              showingLabel={t.showing}
              showingCount={formatInteger(
                filteredCompanies.length,
              )}
              ofLabel={t.of}
              totalCount={formatInteger(
                latestCompanies.length,
              )}
              rowsLabel={t.rows}
            />


            <div className="flex flex-wrap gap-2 border-t pt-3">

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-9"
              >
                <Link href="/system/subscriptions">
                  <BarChart3 className="h-4 w-4 text-[#a57b3d]" />
                  {t.companiesCenter}
                </Link>
              </Button>

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-9"
              >
                <Link href="/system/subscriptions/list">
                  <ListChecks className="h-4 w-4 text-[#a57b3d]" />
                  {t.companiesList}
                </Link>
              </Button>

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-9"
              >
                <Link href="/system">
                  <LayoutDashboard className="h-4 w-4 text-[#a57b3d]" />
                  {t.systemDashboard}
                </Link>
              </Button>

            </div>

          </CardContent>
        </Card>

      </div>
    </main>
  );
}
