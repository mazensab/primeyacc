"use client";

// phase47D2B1_system_dashboard_design_contract=true

/* ============================================================
   📂 primey_frontend/app/system/subscriptions/page.tsx
   💳 Mhamcloud — System Subscriptions Overview
   ------------------------------------------------------------
   ✅ Premium PrimeyCare admin pattern adapted for Mhamcloud
   ✅ System subscriptions module center page
   ✅ Real API only: GET /api/system/subscriptions/
   ✅ KPI cards + quick actions + recent subscriptions table
   ✅ Search, status filter, sorting, reset
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
  Building2,
  CheckCircle2,
  ExternalLink,
  FileBarChart2,
  FileSpreadsheet,
  LayoutDashboard,
  ListChecks,
  Loader2,
  MoreVertical,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  DataRegisterPreviewLink,
  DataRegisterResultCount,
  DataRegisterTableFrame,
} from "@/components/ui/data-register-table";
import { SystemKpiCard } from "@/components/ui/system-kpi-card";
import {
  DataRegisterEmptyState,
  DataRegisterSearch,
  DataRegisterToolbar,
  registerBrandButtonClass,
  registerOutlineButtonClass,
} from "@/components/ui/data-register";
import { downloadExcelReport, type ExcelReportSection } from "@/lib/excel-report";
import {
  openPrintTableReport,
  type PrintReportTableSection,
} from "@/lib/print-report";

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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
type SortKey = "newest" | "oldest" | "name" | "code";
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
  | "past_due";

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
  email: string;
  phone: string;
  city: string;
  starts_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
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
];

const translations = {
  ar: {
    title: "اشتراكات الشركات",
    subtitle:
      "مركز إدارة اشتراكات شركات Mhamcloud لمتابعة الخطط والحالات والدورات والتواريخ من مكان واحد.",
    badge: "إدارة المنصة",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    addCompany: "قائمة الاشتراكات",
    list: "قائمة الاشتراكات",
    reports: "تقارير الاشتراكات",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث باسم الشركة أو الكود أو الخطة أو الدورة أو تاريخ الانتهاء...",
    all: "الكل",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    codeSort: "الكود",
    open: "فتح",

    totalCompanies: "إجمالي الاشتراكات",
    activeCompanies: "الاشتراكات النشطة",
    inactiveCompanies: "الاشتراكات المنتهية",
    subscribedCompanies: "شركات لديها اشتراك",
    fromLiveApi: "من واجهات النظام الحقيقية",

    actionsTitle: "اختصارات وحدة الاشتراكات",
    actionsDesc: "تنقل سريع بين صفحات الاشتراكات الأساسية بنفس نمط إدارة المنصة.",
    openListTitle: "عرض قائمة الاشتراكات",
    openListDesc: "جدول كامل للاشتراكات مع الفلاتر والتصدير والطباعة.",
    createTitle: "قائمة الاشتراكات",
    createDesc: "عرض الاشتراكات وربطها بإعدادات المنصة.",
    reportsTitle: "تقارير الاشتراكات",
    reportsDesc: "تحليل الاشتراكات حسب الحالة والدورة والخطة والقيمة.",
    dashboardTitle: "لوحة النظام",
    dashboardDesc: "العودة إلى لوحة تحكم النظام الرئيسية.",

    tableTitle: "أحدث الاشتراكات",
    tableDesc:
      "نظرة سريعة على أحدث اشتراكات الشركات في Mhamcloud مع الحالة والخطة والدورة والقيمة.",
    company: "الشركة",
    code: "الكود",
    owner: "الخطة",
    activity: "الدورة",
    subscription: "القيمة",
    city: "تاريخ الانتهاء",
    status: "الحالة",
    createdAt: "تاريخ الإنشاء",

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

    noDataTitle: "لا توجد شركات",
    noDataDesc: "ستظهر الشركات هنا عند توفرها من API.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غير البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل مركز الاشتراكات",
    errorDesc:
      "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    reportTitle: "تقرير مركز اشتراكات Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    refreshed: "تم تحديث مركز الاشتراكات.",
  },
  en: {
    title: "Company subscriptions",
    subtitle:
      "Mhamcloud subscriptions center for registered companies, activity status, subscriptions, and reports in one place.",
    badge: "Platform management",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    addCompany: "Subscriptions list",
    list: "Companies list",
    reports: "Companies reports",
    reset: "Reset",
    searchPlaceholder: "Search by company, plan, code, status, or billing cycle...",
    all: "All",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    codeSort: "Code",
    open: "Open",

    totalCompanies: "Total subscriptions",
    activeCompanies: "Active subscriptions",
    inactiveCompanies: "Expired subscriptions",
    subscribedCompanies: "With subscription",
    fromLiveApi: "From real system APIs",

    actionsTitle: "Subscriptions module shortcuts",
    actionsDesc: "Quick navigation between companies pages using the platform management pattern.",
    openListTitle: "Open subscriptions list",
    openListDesc: "Full subscriptions table with filters, export, and print.",
    createTitle: "Add a new company",
    createDesc: "Create a new company and connect it to platform settings.",
    reportsTitle: "Companies reports",
    reportsDesc: "Analyze companies by status, activity, and subscription.",
    dashboardTitle: "System dashboard",
    dashboardDesc: "Return to the main system dashboard.",

    tableTitle: "Latest subscriptions",
    tableDesc:
      "A quick view of the newest companies registered in Mhamcloud with status, activity, and subscription.",
    company: "Company",
    code: "Code",
    owner: "Plan",
    activity: "Cycle",
    subscription: "Amount",
    city: "End date",
    status: "Status",
    createdAt: "Created at",

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

    noDataTitle: "No companies",
    noDataDesc: "Companies will appear here when returned by the API.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    errorTitle: "Could not load subscriptions center",
    errorDesc:
      "Make sure you are signed in as a system user and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reportTitle: "Mhamcloud Companies Center Report",
    generatedAt: "Generated at",
    showing: "Showing",
    of: "of",
    rows: "rows",
    refreshed: "Subscriptions center refreshed.",
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

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function getApiBaseUrl() {
  const envBase =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(
          /\/+$/,
          "",
        )
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
  const metaRecord = asRecord(record.meta);

  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(dataRecord.results)) return dataRecord.results;
  if (Array.isArray(dataRecord.items)) return dataRecord.items;
  if (Array.isArray(dataRecord.records)) return dataRecord.records;
  if (Array.isArray(metaRecord.results)) return metaRecord.results;

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
  if (typeof value === "boolean") return value ? "active" : "inactive";

  const text = normalizeText(value, "active").toLowerCase();

  if (text === "true") return "active";
  if (text === "false") return "inactive";
  if (text === "enabled") return "active";
  if (text === "disabled") return "inactive";
  if (text === "pending_payment") return "pending";

  return text;
}

function normalizeCompany(value: unknown): CompanyRecord {
  const record = asRecord(value);
  const company = record.company || record.company_ref || record.tenant || record.account_company;
  const companyRecord = asRecord(company);
  const plan = record.plan || record.subscription_plan || record.package || record.product;
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
    email: currency,
    phone: normalizeText(record.starts_at || record.start_date || record.started_at || record.valid_from),
    city: normalizeText(record.ends_at || record.end_date || record.expires_at || record.valid_to, "—"),
    starts_at:
      normalizeText(
        record.starts_at ||
          record.start_date ||
          record.started_at ||
          record.valid_from,
      ) || null,
    created_at: normalizeText(record.created_at || record.created || record.inserted_at) || null,
    updated_at: normalizeText(record.updated_at || record.modified_at || record.updated || record.last_modified) || null,
  };
}
function getStatusLabel(value: string, locale: Locale) {
  const normalized = value.toLowerCase().replace(/[^a-z_]/g, "") as keyof (typeof translations)["ar"];
  const fallback = normalizeText(value, translations[locale].unknown);
  return normalizeText(translations[locale][normalized], fallback);
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

  if (["pending", "trial", "draft", "processing"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["inactive", "failed", "cancelled", "expired", "suspended", "blocked"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
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

function QuickActionCard({
  action,
}: {
  action: QuickAction;
}) {
  const Icon = action.icon;

  return (
    <Card className="group h-full rounded-xl border-border/60 bg-background/70 shadow-none transition-colors hover:border-[#a57b3d]/25 hover:bg-muted/20">
      <Link
        href={action.href}
        className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CardHeader className="flex h-full flex-row items-start justify-between gap-4 space-y-0 p-5">
          <div className="min-w-0">
            <CardTitle className="text-sm font-bold tracking-tight text-foreground">
              {action.title}
            </CardTitle>

            <CardDescription className="mt-2 line-clamp-2 text-xs leading-6">
              {action.description}
            </CardDescription>
          </div>

          <span className="shrink-0 rounded-xl border border-[#a57b3d]/15 bg-[#a57b3d]/[0.07] p-2.5 text-[#a57b3d] transition-colors group-hover:bg-[#a57b3d]/[0.11]">
            <Icon className="h-5 w-5" />
          </span>
        </CardHeader>
      </Link>
    </Card>
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
        align={locale === "ar" ? "start" : "end"}
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

function CompaniesOverviewSkeleton() {
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


export default function SystemSubscriptionsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [companies, setCompanies] = React.useState<CompanyRecord[]>([]);
  const [apiTotal, setApiTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
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

  const resetFilters = React.useCallback(() => {
    setSearch("");
    setStatus("all");
    setSort("newest");
  }, []);


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

  const filteredCompanies = React.useMemo(() => {
    const needle = search.trim().toLowerCase();

    const rows = latestCompanies.filter((company) => {
      const haystack = [
        company.name,
        company.code,
        company.owner,
        company.activity,
        company.subscription,
        company.city,
        company.status,
      ]
        .join(" ")
        .toLowerCase();

      if (needle && !haystack.includes(needle)) return false;
      if (status !== "all" && company.status !== status) return false;

      return true;
    });

    return [...rows].sort((a, b) => {
      if (sort === "oldest") {
        return compareSubscriptionRecency(
          a,
          b,
          "oldest",
        );
      }

      if (sort === "name") {
        return (
          a.name.localeCompare(b.name) ||
          b.sort_id - a.sort_id
        );
      }

      if (sort === "code") {
        return (
          a.code.localeCompare(b.code) ||
          b.sort_id - a.sort_id
        );
      }

      return compareSubscriptionRecency(
        a,
        b,
        "newest",
      );
    });
  }, [latestCompanies, search, sort, status]);

  const stats = React.useMemo(() => {
    return {
      total: latestCompanies.length,
      active: latestCompanies.filter(
        (company) =>
          company.status === "active",
      ).length,
      inactive: latestCompanies.filter(
        (company) =>
          company.status === "expired",
      ).length,
      subscribed: latestCompanies.filter(
        (company) =>
          company.subscription &&
          company.subscription !== "—",
      ).length,
    };
  }, [latestCompanies]);

  const quickActions = React.useMemo<QuickAction[]>(
    () => [
      {
        title: t.openListTitle,
        description: t.openListDesc,
        href: "/system/subscriptions/list",
        icon: ListChecks,
      },
      {
        title: t.createTitle,
        description: t.createDesc,
        href: "/system/subscriptions/list",
        icon: Plus,
      },
      {
        title: t.reportsTitle,
        description: t.reportsDesc,
        href: "/system/subscriptions/reports",
        icon: FileBarChart2,
      },
      {
        title: t.dashboardTitle,
        description: t.dashboardDesc,
        href: "/system",
        icon: LayoutDashboard,
      },
    ],
    [t.createDesc, t.createTitle, t.dashboardDesc, t.dashboardTitle, t.openListDesc, t.openListTitle, t.reportsDesc, t.reportsTitle],
  );

  const hasFilters = Boolean(search || status !== "all" || sort !== "newest");
  const previewRows = filteredCompanies.slice(0, 8);

  function buildExportRows() {
    return previewRows.map((company) => [
      company.name,
      company.code,
      company.owner,
      getBillingCycleLabel(company.activity, locale),
      company.subscription,
      company.city,
      getStatusLabel(company.status, locale),
      formatDate(company.created_at),
    ]);
  }

  function buildPrintSection(): PrintReportTableSection {
    return {
      title: t.tableTitle,
      columns: [
        { label: t.company, width: 220, type: "text" },
        { label: t.code, width: 135, type: "text" },
        { label: t.owner, width: 130, type: "text" },
        { label: t.activity, width: 130, type: "text" },
        { label: t.subscription, width: 130, type: "text" },
        { label: t.city, width: 115, type: "text" },
        { label: t.status, width: 110, type: "text" },
        { label: t.createdAt, width: 115, type: "text" },
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
      t.company, t.code, t.owner, t.activity, t.subscription,
      t.city, t.status, t.createdAt
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

  function openPrintWindow(mode: "print" | "pdf") {
    const rows = buildExportRows();
    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }
    if (mode === "pdf") toast.info(t.pdfHint);
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

  if (loading) return <CompaniesOverviewSkeleton />;

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

        {/* ==================================================
            PAGE HEADER
        ================================================== */}
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
                void loadCompanies({ silent: true })
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
              onClick={() =>
                openPrintWindow("print")
              }
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
                {t.addCompany}
              </Link>
            </Button>
          </div>
        </header>


        {/* ==================================================
            KPI CARDS
        ================================================== */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        </div>


        {/* ==================================================
            MODULE SHORTCUTS
        ================================================== */}
        <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 pt-5 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
              <ListChecks className="h-4 w-4 text-[#a57b3d]" />
              {t.actionsTitle}
            </CardTitle>

            <CardDescription className="mt-1">
              {t.actionsDesc}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => (
                <QuickActionCard
                  key={`${action.href}-${action.title}`}
                  action={action}
                />
              ))}
            </div>
          </CardContent>
        </Card>


        {/* ==================================================
            LATEST SUBSCRIPTIONS
        ================================================== */}
        <Card className="w-full overflow-hidden rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 pt-5 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">

              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
                  <ShieldCheck className="h-4 w-4 text-[#a57b3d]" />
                  {t.tableTitle}
                </CardTitle>

                <CardDescription className="mt-1">
                  {t.tableDesc}
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
                  onClick={() =>
                    openPrintWindow("print")
                  }
                >
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
              </div>
            </div>
          </CardHeader>


          <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">

            {/* ================================================
                TOOLBAR
            ================================================ */}
            <DataRegisterToolbar className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center">

                <DataRegisterSearch
                  value={search}
                  onChange={setSearch}
                  placeholder={t.searchPlaceholder}
                  className="min-w-0 flex-1"
                />

                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value as StatusFilter)
                  }
                >
                  <SelectTrigger className="h-9 bg-background shadow-none md:w-[170px]">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {statusFilters.map((item) => (
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
                    ))}
                  </SelectContent>
                </Select>
              </div>


              <div className="flex flex-wrap items-center gap-2">

                <Select
                  value={sort}
                  onValueChange={(value) =>
                    setSort(value as SortKey)
                  }
                >
                  <SelectTrigger className="h-9 bg-background shadow-none sm:w-[160px]">
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
              </div>
            </DataRegisterToolbar>


            {/* ================================================
                CENTRAL REGISTER TABLE
            ================================================ */}
            <DataRegisterTableFrame>
              <div className="w-full overflow-x-auto">

                <Table
                  variant="register"
                  layout="fixed"
                  minWidth="980px"
                >

                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">

                      <TableHead
                        className={cn(
                          "h-11 w-[220px] px-4 text-xs font-semibold text-muted-foreground",
                          alignClass,
                        )}
                      >
                        {t.company}
                      </TableHead>

                      <TableHead
                        className={cn(
                          "h-11 w-[135px] px-4 text-xs font-semibold text-muted-foreground",
                          alignClass,
                        )}
                      >
                        {t.code}
                      </TableHead>

                      <TableHead
                        className={cn(
                          "h-11 w-[130px] px-4 text-xs font-semibold text-muted-foreground",
                          alignClass,
                        )}
                      >
                        {t.owner}
                      </TableHead>

                      <TableHead
                        className={cn(
                          "h-11 w-[130px] px-4 text-xs font-semibold text-muted-foreground",
                          alignClass,
                        )}
                      >
                        {t.activity}
                      </TableHead>

                      <TableHead
                        className={cn(
                          "h-11 w-[130px] px-4 text-xs font-semibold text-muted-foreground",
                          alignClass,
                        )}
                      >
                        {t.subscription}
                      </TableHead>

                      <TableHead
                        className={cn(
                          "h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground",
                          alignClass,
                        )}
                      >
                        {t.city}
                      </TableHead>

                      <TableHead
                        className={cn(
                          "h-11 w-[110px] px-4 text-xs font-semibold text-muted-foreground",
                          alignClass,
                        )}
                      >
                        {t.status}
                      </TableHead>

                      <TableHead
                        className={cn(
                          "h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground",
                          alignClass,
                        )}
                      >
                        {t.createdAt}
                      </TableHead>

                      <TableHead className="sticky end-0 z-10 h-11 w-[76px] bg-muted/40 px-3 text-center text-xs font-semibold text-muted-foreground">
                        {t.open}
                      </TableHead>

                    </TableRow>
                  </TableHeader>


                  <TableBody>

                    {previewRows.length ? (

                      previewRows.map((company) => (

                        <TableRow
                          key={
                            company.id ||
                            company.code ||
                            company.name
                          }
                          className="h-[62px]"
                        >

                          <TableCell
                            className={cn(
                              "h-[62px] overflow-hidden px-4 align-middle",
                              alignClass,
                            )}
                          >
                            <div className="min-w-0">

                              <span className="block truncate text-sm font-semibold text-foreground">
                                {company.name ||
                                  t.unknown}
                              </span>

                              <span className="block truncate text-xs text-muted-foreground">
                                #
                                {company.id ||
                                  company.code ||
                                  "—"}
                              </span>

                            </div>
                          </TableCell>


                          <TableCell
                            className={cn(
                              "h-[62px] overflow-hidden px-4 align-middle",
                              alignClass,
                            )}
                          >
                            <span className="block truncate text-sm tabular-nums text-muted-foreground">
                              {company.code || "—"}
                            </span>
                          </TableCell>


                          <TableCell
                            className={cn(
                              "h-[62px] overflow-hidden px-4 align-middle",
                              alignClass,
                            )}
                          >
                            <span className="block truncate text-sm text-muted-foreground">
                              {company.owner || "—"}
                            </span>
                          </TableCell>


                          <TableCell
                            className={cn(
                              "h-[62px] overflow-hidden px-4 align-middle",
                              alignClass,
                            )}
                          >
                            <span className="block truncate text-sm text-muted-foreground">
                              {getBillingCycleLabel(
                                company.activity,
                                locale,
                              )}
                            </span>
                          </TableCell>


                          <TableCell
                            className={cn(
                              "h-[62px] overflow-hidden px-4 align-middle",
                              alignClass,
                            )}
                          >
                            <MoneyValue
                              amount={company.amount}
                              currency={company.currency}
                            />
                          </TableCell>


                          <TableCell
                            className={cn(
                              "h-[62px] overflow-hidden px-4 align-middle",
                              alignClass,
                            )}
                          >
                            <span
                              dir="ltr"
                              lang="en"
                              className="block truncate text-sm tabular-nums text-muted-foreground"
                            >
                              {company.city || "—"}
                            </span>
                          </TableCell>


                          <TableCell
                            className={cn(
                              "h-[62px] px-4 align-middle",
                              alignClass,
                            )}
                          >
                            <StatusBadge
                              value={company.status}
                              locale={locale}
                            />
                          </TableCell>


                          <TableCell
                            className={cn(
                              "h-[62px] px-4 align-middle",
                              alignClass,
                            )}
                          >
                            <span
                              dir="ltr"
                              lang="en"
                              className="text-sm tabular-nums text-muted-foreground"
                            >
                              {formatDate(
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
                      ))

                    ) : (

                      <TableRow>
                        <TableCell colSpan={9}>

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
                            showReset={hasFilters}
                            resetLabel={t.reset}
                            onReset={resetFilters}
                          />

                        </TableCell>
                      </TableRow>

                    )}

                  </TableBody>
                </Table>
              </div>
            </DataRegisterTableFrame>


            {/* ================================================
                RESULT COUNT + PREVIEW LINK
            ================================================ */}
            <div className="space-y-3">

              <DataRegisterResultCount
                showingLabel={t.showing}
                showingCount={formatInteger(
                  previewRows.length,
                )}
                ofLabel={t.of}
                totalCount={formatInteger(
                  latestCompanies.length,
                )}
                rowsLabel={t.rows}
              />

              <DataRegisterPreviewLink
                href="/system/subscriptions/list"
                label={t.list}
                icon={ShieldCheck}
              />

            </div>

          </CardContent>
        </Card>

      </div>
    </main>
  );
}
