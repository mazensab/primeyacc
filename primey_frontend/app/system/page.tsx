"use client";

/* ============================================================
   📂 primey_frontend/app/system/page.tsx
   🧠 PrimeyAcc — System Dashboard
   ------------------------------------------------------------
   ✅ Adapted from approved PrimeyCare system dashboard pattern
   ✅ PrimeyAcc SaaS/system operations focus
   ✅ Clickable KPI cards instead of shortcuts
   ✅ Separate full-width tables:
      - Latest companies
      - Latest subscriptions
      - Latest platform payments
   ✅ Real API only, no fake demo data
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error / Empty states
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost hardcoding
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  Gauge,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ServerCog,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

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
type SortKey = "newest" | "oldest" | "amount_high" | "amount_low" | "name";
type StatusFilter =
  | "all"
  | "active"
  | "inactive"
  | "trial"
  | "pending"
  | "paid"
  | "confirmed"
  | "failed"
  | "cancelled"
  | "expired"
  | "suspended"
  | "refunded";

type ApiResponse = ApiRecord | ApiRecord[];

type DashboardStats = {
  companies: number;
  activeCompanies: number;
  subscriptions: number;
  activeSubscriptions: number;
  platformPayments: number;
  platformPaymentAmount: number;
  apiContracts: number;
  readinessScore: number;
};

type CompanyRecord = {
  id: string;
  name: string;
  code: string;
  status: string;
  owner: string;
  activity: string;
  subscription: string;
  created_at: string | null;
};

type SubscriptionRecord = {
  id: string;
  company_name: string;
  plan_name: string;
  status: string;
  billing_cycle: string;
  amount: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
};

type PlatformPaymentRecord = {
  id: string;
  reference: string;
  company_name: string;
  gateway: string;
  method: string;
  status: string;
  amount: number;
  paid_at: string | null;
  created_at: string | null;
};

type DataColumn<T> = {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};

const API_ENDPOINTS = {
  companies: "/api/system/companies/",
  subscriptions: "/api/system/subscriptions/",
  platformPayments: "/api/system/platform-payments/",
  apiContracts: "/api/system/api-contracts/",
  releaseReadiness: "/api/system/release-readiness/",
};

const translations = {
  ar: {
    title: "لوحة تحكم النظام",
    subtitle:
      "مركز تشغيل PrimeyAcc لإدارة الشركات، الاشتراكات، مدفوعات المنصة، جاهزية الإصدار، وعقود واجهات API من مكان واحد.",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    search: "بحث",
    all: "الكل",
    from: "من",
    to: "إلى",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    amountHigh: "الأعلى مبلغًا",
    amountLow: "الأقل مبلغًا",
    nameSort: "الاسم",
    open: "فتح",
    showing: "عرض",
    rows: "صفوف",
    of: "من",
    sar: "ر.س",
    unknown: "غير محدد",
    systemHealth: "حالة النظام",
    connectedToLiveApis: "متصل بواجهات النظام الحقيقية",
    partialWarningTitle: "تم تحميل الصفحة جزئيًا",
    partialWarningDesc: "بعض واجهات النظام لم تعد بيانات صالحة، لذلك تظهر الجداول المتاحة فقط.",

    totalCompanies: "إجمالي الشركات",
    activeCompanies: "الشركات النشطة",
    totalSubscriptions: "إجمالي الاشتراكات",
    activeSubscriptions: "الاشتراكات النشطة",
    platformPayments: "مدفوعات المنصة",
    platformPaymentAmount: "إجمالي التحصيل",
    apiContracts: "عقود API",
    readinessScore: "جاهزية الإصدار",

    companies: "الشركات",
    subscriptions: "الاشتراكات",
    payments: "المدفوعات",
    latestCompanies: "آخر الشركات",
    latestCompaniesDesc: "أحدث الشركات المسجلة في PrimeyAcc مع الحالة والنشاط والاشتراك.",
    latestSubscriptions: "آخر الاشتراكات",
    latestSubscriptionsDesc: "آخر اشتراكات الشركات وخططها ودورتها المالية.",
    latestPayments: "آخر مدفوعات المنصة",
    latestPaymentsDesc: "أحدث عمليات التحصيل الخاصة باشتراكات وخدمات PrimeyAcc.",

    companySearchPlaceholder: "ابحث باسم الشركة أو الكود أو المالك أو النشاط...",
    subscriptionSearchPlaceholder: "ابحث باسم الشركة أو الخطة أو دورة الفوترة...",
    paymentSearchPlaceholder: "ابحث بالمرجع أو الشركة أو البوابة أو طريقة الدفع...",

    company: "الشركة",
    code: "الكود",
    owner: "المالك",
    activity: "النشاط",
    subscription: "الاشتراك",
    status: "الحالة",
    createdAt: "تاريخ الإنشاء",
    plan: "الخطة",
    billingCycle: "دورة الفوترة",
    amount: "المبلغ",
    startsAt: "البداية",
    endsAt: "النهاية",
    reference: "المرجع",
    gateway: "البوابة",
    method: "الطريقة",
    paidAt: "تاريخ الدفع",

    active: "نشط",
    inactive: "غير نشط",
    trial: "تجريبي",
    pending: "معلق",
    paid: "مدفوع",
    confirmed: "مؤكد",
    failed: "فشل",
    cancelled: "ملغي",
    expired: "منتهي",
    suspended: "موقوف",
    refunded: "مسترد",

    noDataTitle: "لا توجد بيانات",
    noDataDesc: "ستظهر البيانات هنا عند توفرها من API.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل لوحة النظام",
    errorDesc: "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير لوحة تحكم PrimeyAcc",
    generatedAt: "تاريخ الطباعة",
    refreshed: "تم تحديث لوحة النظام.",
  },
  en: {
    title: "System Dashboard",
    subtitle:
      "PrimeyAcc operations center for companies, subscriptions, platform payments, release readiness, and API contracts.",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    search: "Search",
    all: "All",
    from: "From",
    to: "To",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    amountHigh: "Highest amount",
    amountLow: "Lowest amount",
    nameSort: "Name",
    open: "Open",
    showing: "Showing",
    rows: "rows",
    of: "of",
    sar: "SAR",
    unknown: "Unknown",
    systemHealth: "System health",
    connectedToLiveApis: "Connected to real system APIs",
    partialWarningTitle: "Partially loaded",
    partialWarningDesc: "Some system APIs did not return valid data, so only available sections are shown.",

    totalCompanies: "Total companies",
    activeCompanies: "Active companies",
    totalSubscriptions: "Total subscriptions",
    activeSubscriptions: "Active subscriptions",
    platformPayments: "Platform payments",
    platformPaymentAmount: "Collected amount",
    apiContracts: "API contracts",
    readinessScore: "Release readiness",

    companies: "Companies",
    subscriptions: "Subscriptions",
    payments: "Payments",
    latestCompanies: "Latest companies",
    latestCompaniesDesc: "Newest companies registered in PrimeyAcc with status, activity, and subscription.",
    latestSubscriptions: "Latest subscriptions",
    latestSubscriptionsDesc: "Newest company subscriptions, plans, and billing cycles.",
    latestPayments: "Latest platform payments",
    latestPaymentsDesc: "Newest collected platform payments for PrimeyAcc services.",

    companySearchPlaceholder: "Search by company, code, owner, or activity...",
    subscriptionSearchPlaceholder: "Search by company, plan, or billing cycle...",
    paymentSearchPlaceholder: "Search by reference, company, gateway, or method...",

    company: "Company",
    code: "Code",
    owner: "Owner",
    activity: "Activity",
    subscription: "Subscription",
    status: "Status",
    createdAt: "Created at",
    plan: "Plan",
    billingCycle: "Billing cycle",
    amount: "Amount",
    startsAt: "Starts",
    endsAt: "Ends",
    reference: "Reference",
    gateway: "Gateway",
    method: "Method",
    paidAt: "Paid at",

    active: "Active",
    inactive: "Inactive",
    trial: "Trial",
    pending: "Pending",
    paid: "Paid",
    confirmed: "Confirmed",
    failed: "Failed",
    cancelled: "Cancelled",
    expired: "Expired",
    suspended: "Suspended",
    refunded: "Refunded",

    noDataTitle: "No data",
    noDataDesc: "Data will appear here when returned by the API.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    errorTitle: "Could not load system dashboard",
    errorDesc: "Make sure you are signed in as a system user and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    printTitle: "PrimeyAcc System Dashboard Report",
    generatedAt: "Generated at",
    refreshed: "System dashboard refreshed.",
  },
} as const;

const statusFilters: StatusFilter[] = [
  "all",
  "active",
  "inactive",
  "trial",
  "pending",
  "paid",
  "confirmed",
  "failed",
  "cancelled",
  "expired",
  "suspended",
  "refunded",
];

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

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatPercent(value: unknown) {
  const nextValue = Math.max(0, Math.min(100, toNumber(value)));
  return `${formatInteger(nextValue)}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).replace("T", " ").slice(0, 16);
  return parsed.toISOString().replace("T", " ").slice(0, 16);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal,
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
  const data = record.data;
  const meta = record.meta;

  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(data)) return data;

  const dataRecord = asRecord(data);
  if (Array.isArray(dataRecord.results)) return dataRecord.results;
  if (Array.isArray(dataRecord.items)) return dataRecord.items;
  if (Array.isArray(dataRecord.records)) return dataRecord.records;

  const metaRecord = asRecord(meta);
  if (Array.isArray(metaRecord.results)) return metaRecord.results;

  return [];
}

function extractSummary(payload: unknown): ApiRecord {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const metaRecord = asRecord(record.meta);

  return {
    ...asRecord(record.summary),
    ...asRecord(dataRecord.summary),
    ...asRecord(metaRecord.summary),
    ...record,
    ...dataRecord,
  };
}

function extractCount(payload: unknown) {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const metaRecord = asRecord(record.meta);
  const summary = extractSummary(payload);
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
      metaRecord.total_count ??
      summary.count ??
      summary.total ??
      summary.total_count,
    arrayCount,
  );
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

function normalizeCompany(value: unknown): CompanyRecord {
  const record = asRecord(value);
  const owner = record.owner || record.user || record.created_by || record.account_owner;
  const activity = record.activity_profile || record.activity || record.activity_profile_ref;
  const subscription = record.subscription || record.current_subscription || record.plan;

  return {
    id: normalizeText(record.id || record.uuid || record.pk || record.slug),
    name: normalizeText(record.name || record.company_name || record.title),
    code: normalizeText(record.code || record.company_code || record.slug || record.registration_number),
    status: normalizeText(record.status || record.state || record.is_active, "active").toLowerCase(),
    owner: normalizeNestedName(owner, ["name", "full_name", "email", "username"]),
    activity: normalizeNestedName(activity, ["name", "code", "title"]),
    subscription: normalizeNestedName(subscription, ["plan_name", "name", "title", "status"]),
    created_at: normalizeText(record.created_at || record.created || record.inserted_at) || null,
  };
}

function normalizeSubscription(value: unknown): SubscriptionRecord {
  const record = asRecord(value);
  const company = record.company || record.company_ref || record.tenant;
  const plan = record.plan || record.subscription_plan;

  return {
    id: normalizeText(record.id || record.uuid || record.pk),
    company_name: normalizeText(record.company_name) || normalizeNestedName(company),
    plan_name: normalizeText(record.plan_name) || normalizeNestedName(plan),
    status: normalizeText(record.status || record.state, "active").toLowerCase(),
    billing_cycle: normalizeText(record.billing_cycle || record.cycle || record.interval),
    amount: toNumber(record.amount || record.total_amount || record.price || record.grand_total),
    starts_at: normalizeText(record.starts_at || record.start_date || record.current_period_start) || null,
    ends_at: normalizeText(record.ends_at || record.end_date || record.current_period_end || record.expires_at) || null,
    created_at: normalizeText(record.created_at || record.created || record.inserted_at) || null,
  };
}

function normalizePlatformPayment(value: unknown): PlatformPaymentRecord {
  const record = asRecord(value);
  const company = record.company || record.company_ref || record.tenant;
  const gateway = record.gateway || record.payment_gateway;
  const method = record.method || record.payment_method;

  return {
    id: normalizeText(record.id || record.uuid || record.pk),
    reference: normalizeText(
      record.reference || record.reference_number || record.payment_number || record.transaction_id || record.gateway_reference,
    ),
    company_name: normalizeText(record.company_name) || normalizeNestedName(company),
    gateway: normalizeText(record.gateway_name) || normalizeNestedName(gateway),
    method: normalizeText(record.method_name) || normalizeNestedName(method) || normalizeText(record.payment_method),
    status: normalizeText(record.status || record.state, "pending").toLowerCase(),
    amount: toNumber(record.amount || record.total_amount || record.paid_amount || record.net_amount),
    paid_at: normalizeText(record.paid_at || record.confirmed_at || record.settled_at) || null,
    created_at: normalizeText(record.created_at || record.created || record.inserted_at) || null,
  };
}

function normalizeReadinessScore(payload: unknown) {
  const summary = extractSummary(payload);
  const checks = extractArray(payload);
  const rawScore =
    summary.readiness_score ??
    summary.score ??
    summary.percentage ??
    summary.percent ??
    summary.completion_percentage;

  if (rawScore !== undefined && rawScore !== null) return Math.max(0, Math.min(100, toNumber(rawScore)));

  if (checks.length) {
    const passed = checks.filter((item) => {
      const record = asRecord(item);
      return Boolean(record.passed || record.is_ready || record.ok || record.status === "passed");
    }).length;

    return Math.round((passed / checks.length) * 100);
  }

  return 0;
}

function getStatusLabel(value: string, locale: Locale) {
  const key = value.toLowerCase().replace(/[^a-z_]/g, "") as keyof (typeof translations)["ar"];
  const fallback = normalizeText(value, translations[locale].unknown);
  return normalizeText(translations[locale][key], fallback);
}

function getBadgeClass(value: string) {
  const normalized = value.toLowerCase();

  if (["active", "paid", "confirmed", "passed", "ready", "success"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["pending", "trial", "processing", "draft"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["failed", "cancelled", "expired", "suspended", "blocked", "refunded"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function rowDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function isWithinDate(dateValue: string | null, from: string, to: string) {
  const normalized = formatDate(dateValue);
  if (normalized === "—") return !from && !to;
  if (from && normalized < from) return false;
  if (to && normalized > to) return false;
  return true;
}

function sortRows<T>(
  rows: T[],
  sort: SortKey,
  getDate: (row: T) => string | null,
  getAmount: (row: T) => number,
  getName: (row: T) => string,
) {
  return [...rows].sort((a, b) => {
    if (sort === "oldest") return rowDateValue(getDate(a)) - rowDateValue(getDate(b));
    if (sort === "amount_high") return getAmount(b) - getAmount(a);
    if (sort === "amount_low") return getAmount(a) - getAmount(b);
    if (sort === "name") return getName(a).localeCompare(getName(b));
    return rowDateValue(getDate(b)) - rowDateValue(getDate(a));
  });
}

function MoneyValue({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold tabular-nums">
      <Image src="/currency/sar.svg" alt={label} width={14} height={14} className="h-3.5 w-3.5" />
      <span>{formatMoney(value)}</span>
    </span>
  );
}

function StatusBadge({ value, label }: { value: string; label: string }) {
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", getBadgeClass(value))}>
      {label}
    </Badge>
  );
}

function KpiCard({
  title,
  value,
  description,
  href,
  icon: Icon,
  money,
  percent,
  t,
}: {
  title: string;
  value: number;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  money?: boolean;
  percent?: boolean;
  t: (typeof translations)[Locale];
}) {
  return (
    <Card className="group overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
          <div className="min-w-0">
            <CardDescription className="truncate text-sm">{title}</CardDescription>
            <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
              {money ? <MoneyValue value={value} label={t.sar} /> : percent ? formatPercent(value) : formatInteger(value)}
            </CardTitle>
          </div>
          <span className="rounded-2xl bg-primary/10 p-2.5 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="h-5 w-5" />
          </span>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Link>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card p-6 shadow-sm">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-8 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
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
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="rounded-2xl">
          <CardHeader>
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyTableState({
  title,
  description,
  showReset,
  onReset,
  resetLabel,
}: {
  title: string;
  description: string;
  showReset?: boolean;
  onReset?: () => void;
  resetLabel: string;
}) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {showReset && onReset ? (
        <Button variant="outline" size="sm" onClick={onReset} className="rounded-lg">
          <RotateCcw className="h-4 w-4" />
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}

function FiltersBar({
  search,
  onSearchChange,
  searchPlaceholder,
  status,
  onStatusChange,
  sort,
  onSortChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onReset,
  t,
  locale,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  onReset: () => void;
  t: (typeof translations)[Locale];
  locale: Locale;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 rounded-xl ps-9"
          />
        </div>

        <Select value={status} onValueChange={(value) => onStatusChange(value as StatusFilter)}>
          <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusFilters.map((item) => (
              <SelectItem key={item} value={item}>
                {item === "all" ? t.all : getStatusLabel(item, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-10 items-center gap-2 rounded-xl border bg-background px-3">
          <span className="text-xs text-muted-foreground">{t.from}</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
            className="h-8 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex h-10 items-center gap-2 rounded-xl border bg-background px-3">
          <span className="text-xs text-muted-foreground">{t.to}</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
            className="h-8 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
        <Select value={sort} onValueChange={(value) => onSortChange(value as SortKey)}>
          <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[160px]">
            <ArrowUpDown className="h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t.newest}</SelectItem>
            <SelectItem value="oldest">{t.oldest}</SelectItem>
            <SelectItem value="amount_high">{t.amountHigh}</SelectItem>
            <SelectItem value="amount_low">{t.amountLow}</SelectItem>
            <SelectItem value="name">{t.nameSort}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          {t.reset}
        </Button>
      </div>
    </div>
  );
}

function DataTable<T extends { id: string }>({
  rows,
  allRowsCount,
  columns,
  rowKey,
  emptyTitle,
  emptyDescription,
  noResultsTitle,
  noResultsDescription,
  hasFilters,
  onReset,
  resetLabel,
  showingLabel,
  ofLabel,
  rowsLabel,
}: {
  rows: T[];
  allRowsCount: number;
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  emptyTitle: string;
  emptyDescription: string;
  noResultsTitle: string;
  noResultsDescription: string;
  hasFilters: boolean;
  onReset: () => void;
  resetLabel: string;
  showingLabel: string;
  ofLabel: string;
  rowsLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border bg-background">
        <div className="overflow-x-auto">
          <Table className="min-w-[1080px] table-fixed">
            <TableHeader>
              <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      "h-11 whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground",
                      column.className,
                    )}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow key={rowKey(row)} className="h-[62px]">
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn("h-[62px] overflow-hidden px-4 text-right align-middle", column.className)}
                      >
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-72">
                    <EmptyTableState
                      title={hasFilters ? noResultsTitle : emptyTitle}
                      description={hasFilters ? noResultsDescription : emptyDescription}
                      showReset={hasFilters}
                      onReset={onReset}
                      resetLabel={resetLabel}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {showingLabel} <span className="font-medium text-foreground tabular-nums">{formatInteger(rows.length)}</span> {ofLabel}{" "}
        <span className="font-medium text-foreground tabular-nums">{formatInteger(allRowsCount)}</span> {rowsLabel}
      </div>
    </div>
  );
}

export default function SystemDashboardPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [stats, setStats] = React.useState<DashboardStats>({
    companies: 0,
    activeCompanies: 0,
    subscriptions: 0,
    activeSubscriptions: 0,
    platformPayments: 0,
    platformPaymentAmount: 0,
    apiContracts: 0,
    readinessScore: 0,
  });
  const [companies, setCompanies] = React.useState<CompanyRecord[]>([]);
  const [subscriptions, setSubscriptions] = React.useState<SubscriptionRecord[]>([]);
  const [payments, setPayments] = React.useState<PlatformPaymentRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [warnings, setWarnings] = React.useState<string[]>([]);

  const [companySearch, setCompanySearch] = React.useState("");
  const [companyStatus, setCompanyStatus] = React.useState<StatusFilter>("all");
  const [companySort, setCompanySort] = React.useState<SortKey>("newest");
  const [companyDateFrom, setCompanyDateFrom] = React.useState("");
  const [companyDateTo, setCompanyDateTo] = React.useState("");

  const [subscriptionSearch, setSubscriptionSearch] = React.useState("");
  const [subscriptionStatus, setSubscriptionStatus] = React.useState<StatusFilter>("all");
  const [subscriptionSort, setSubscriptionSort] = React.useState<SortKey>("newest");
  const [subscriptionDateFrom, setSubscriptionDateFrom] = React.useState("");
  const [subscriptionDateTo, setSubscriptionDateTo] = React.useState("");

  const [paymentSearch, setPaymentSearch] = React.useState("");
  const [paymentStatus, setPaymentStatus] = React.useState<StatusFilter>("all");
  const [paymentSort, setPaymentSort] = React.useState<SortKey>("newest");
  const [paymentDateFrom, setPaymentDateFrom] = React.useState("");
  const [paymentDateTo, setPaymentDateTo] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

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

  const loadDashboard = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        setWarnings([]);

        const countParams = new URLSearchParams({ page: "1", page_size: "1" });
        const rowsParams = new URLSearchParams({ page: "1", page_size: "12", ordering: "-created_at" });

        const results = await Promise.allSettled([
          fetchJson<ApiResponse>(makeApiUrl(API_ENDPOINTS.companies, rowsParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(API_ENDPOINTS.subscriptions, rowsParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(API_ENDPOINTS.platformPayments, rowsParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(API_ENDPOINTS.apiContracts, countParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(API_ENDPOINTS.releaseReadiness), controller.signal),
        ]);

        const failedMessages = results
          .filter((result): result is PromiseRejectedResult => result.status === "rejected")
          .map((result) => normalizeText(result.reason instanceof Error ? result.reason.message : result.reason));

        const [companiesPayload, subscriptionsPayload, paymentsPayload, contractsPayload, readinessPayload] = results.map(
          (result) => (result.status === "fulfilled" ? result.value : {}),
        );

        const companyRows = extractArray(companiesPayload).map(normalizeCompany);
        const subscriptionRows = extractArray(subscriptionsPayload).map(normalizeSubscription);
        const paymentRows = extractArray(paymentsPayload).map(normalizePlatformPayment);
        const companiesSummary = extractSummary(companiesPayload);
        const subscriptionsSummary = extractSummary(subscriptionsPayload);
        const paymentsSummary = extractSummary(paymentsPayload);

        setCompanies(companyRows);
        setSubscriptions(subscriptionRows);
        setPayments(paymentRows);
        setStats({
          companies: extractCount(companiesPayload),
          activeCompanies: toNumber(
            companiesSummary.active_count ?? companiesSummary.active ?? companiesSummary.active_companies,
            companyRows.filter((item) => item.status === "active" || item.status === "true").length,
          ),
          subscriptions: extractCount(subscriptionsPayload),
          activeSubscriptions: toNumber(
            subscriptionsSummary.active_count ?? subscriptionsSummary.active ?? subscriptionsSummary.active_subscriptions,
            subscriptionRows.filter((item) => item.status === "active" || item.status === "trial").length,
          ),
          platformPayments: extractCount(paymentsPayload),
          platformPaymentAmount: toNumber(
            paymentsSummary.total_amount ??
              paymentsSummary.amount_total ??
              paymentsSummary.paid_amount ??
              paymentsSummary.collected_amount,
            paymentRows.reduce((sum, item) => sum + item.amount, 0),
          ),
          apiContracts: extractCount(contractsPayload),
          readinessScore: normalizeReadinessScore(readinessPayload),
        });

        setWarnings(failedMessages.filter(Boolean));

        if (failedMessages.length && failedMessages.length < results.length && !silent) {
          toast.warning(t.partialWarningTitle);
        }

        if (failedMessages.length === results.length) {
          throw new Error(failedMessages[0] || t.errorDesc);
        }

        if (silent) toast.success(t.refreshed);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [t.errorDesc, t.partialWarningTitle, t.refreshed],
  );

  React.useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const resetCompanyFilters = React.useCallback(() => {
    setCompanySearch("");
    setCompanyStatus("all");
    setCompanySort("newest");
    setCompanyDateFrom("");
    setCompanyDateTo("");
  }, []);

  const resetSubscriptionFilters = React.useCallback(() => {
    setSubscriptionSearch("");
    setSubscriptionStatus("all");
    setSubscriptionSort("newest");
    setSubscriptionDateFrom("");
    setSubscriptionDateTo("");
  }, []);

  const resetPaymentFilters = React.useCallback(() => {
    setPaymentSearch("");
    setPaymentStatus("all");
    setPaymentSort("newest");
    setPaymentDateFrom("");
    setPaymentDateTo("");
  }, []);

  const filteredCompanies = React.useMemo(() => {
    const needle = companySearch.trim().toLowerCase();
    const rows = companies.filter((company) => {
      const haystack = [company.name, company.code, company.owner, company.activity, company.subscription, company.status]
        .join(" ")
        .toLowerCase();

      if (needle && !haystack.includes(needle)) return false;
      if (companyStatus !== "all" && company.status !== companyStatus) return false;
      return isWithinDate(company.created_at, companyDateFrom, companyDateTo);
    });

    return sortRows(rows, companySort, (row) => row.created_at, () => 0, (row) => row.name);
  }, [companies, companyDateFrom, companyDateTo, companySearch, companySort, companyStatus]);

  const filteredSubscriptions = React.useMemo(() => {
    const needle = subscriptionSearch.trim().toLowerCase();
    const rows = subscriptions.filter((subscription) => {
      const haystack = [
        subscription.company_name,
        subscription.plan_name,
        subscription.billing_cycle,
        subscription.status,
      ]
        .join(" ")
        .toLowerCase();

      if (needle && !haystack.includes(needle)) return false;
      if (subscriptionStatus !== "all" && subscription.status !== subscriptionStatus) return false;
      return isWithinDate(subscription.created_at || subscription.starts_at, subscriptionDateFrom, subscriptionDateTo);
    });

    return sortRows(rows, subscriptionSort, (row) => row.created_at || row.starts_at, (row) => row.amount, (row) => row.company_name);
  }, [subscriptionDateFrom, subscriptionDateTo, subscriptionSearch, subscriptionSort, subscriptionStatus, subscriptions]);

  const filteredPayments = React.useMemo(() => {
    const needle = paymentSearch.trim().toLowerCase();
    const rows = payments.filter((payment) => {
      const haystack = [payment.reference, payment.company_name, payment.gateway, payment.method, payment.status]
        .join(" ")
        .toLowerCase();

      if (needle && !haystack.includes(needle)) return false;
      if (paymentStatus !== "all" && payment.status !== paymentStatus) return false;
      return isWithinDate(payment.paid_at || payment.created_at, paymentDateFrom, paymentDateTo);
    });

    return sortRows(rows, paymentSort, (row) => row.paid_at || row.created_at, (row) => row.amount, (row) => row.company_name);
  }, [paymentDateFrom, paymentDateTo, paymentSearch, paymentSort, paymentStatus, payments]);

  const hasCompanyFilters = Boolean(companySearch || companyStatus !== "all" || companyDateFrom || companyDateTo || companySort !== "newest");
  const hasSubscriptionFilters = Boolean(
    subscriptionSearch || subscriptionStatus !== "all" || subscriptionDateFrom || subscriptionDateTo || subscriptionSort !== "newest",
  );
  const hasPaymentFilters = Boolean(paymentSearch || paymentStatus !== "all" || paymentDateFrom || paymentDateTo || paymentSort !== "newest");

  const companyColumns = React.useMemo<DataColumn<CompanyRecord>[]>(
    () => [
      {
        key: "company",
        label: t.company,
        className: "w-[240px]",
        render: (company) => (
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">{company.name || t.unknown}</span>
            <span className="block truncate text-xs text-muted-foreground">#{company.id || company.code || "—"}</span>
          </div>
        ),
      },
      { key: "code", label: t.code, className: "w-[130px]", render: (company) => <span className="truncate text-sm tabular-nums text-muted-foreground">{company.code || "—"}</span> },
      { key: "owner", label: t.owner, className: "w-[180px]", render: (company) => <span className="truncate text-sm text-muted-foreground">{company.owner || "—"}</span> },
      { key: "activity", label: t.activity, className: "w-[170px]", render: (company) => <span className="truncate text-sm text-muted-foreground">{company.activity || "—"}</span> },
      { key: "subscription", label: t.subscription, className: "w-[170px]", render: (company) => <span className="truncate text-sm text-muted-foreground">{company.subscription || "—"}</span> },
      { key: "status", label: t.status, className: "w-[125px]", render: (company) => <StatusBadge value={company.status} label={getStatusLabel(company.status, locale)} /> },
      { key: "created", label: t.createdAt, className: "w-[150px]", render: (company) => <span className="text-sm tabular-nums text-muted-foreground">{formatDateTime(company.created_at)}</span> },
      { key: "open", label: t.open, className: "w-[80px] text-center", render: (company) => <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg"><Link href={`/system/companies/${company.id}`}>{t.open}</Link></Button> },
    ],
    [locale, t.activity, t.code, t.company, t.createdAt, t.open, t.owner, t.status, t.subscription, t.unknown],
  );

  const subscriptionColumns = React.useMemo<DataColumn<SubscriptionRecord>[]>(
    () => [
      { key: "company", label: t.company, className: "w-[230px]", render: (subscription) => <span className="block truncate text-sm font-semibold text-foreground">{subscription.company_name || t.unknown}</span> },
      { key: "plan", label: t.plan, className: "w-[170px]", render: (subscription) => <span className="truncate text-sm text-muted-foreground">{subscription.plan_name || "—"}</span> },
      { key: "status", label: t.status, className: "w-[125px]", render: (subscription) => <StatusBadge value={subscription.status} label={getStatusLabel(subscription.status, locale)} /> },
      { key: "cycle", label: t.billingCycle, className: "w-[140px]", render: (subscription) => <span className="truncate text-sm text-muted-foreground">{subscription.billing_cycle || "—"}</span> },
      { key: "amount", label: t.amount, className: "w-[150px]", render: (subscription) => <MoneyValue value={subscription.amount} label={t.sar} /> },
      { key: "starts", label: t.startsAt, className: "w-[135px]", render: (subscription) => <span className="text-sm tabular-nums text-muted-foreground">{formatDate(subscription.starts_at)}</span> },
      { key: "ends", label: t.endsAt, className: "w-[135px]", render: (subscription) => <span className="text-sm tabular-nums text-muted-foreground">{formatDate(subscription.ends_at)}</span> },
      { key: "open", label: t.open, className: "w-[80px] text-center", render: (subscription) => <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg"><Link href={`/system/subscriptions/${subscription.id}`}>{t.open}</Link></Button> },
    ],
    [locale, t.amount, t.billingCycle, t.company, t.endsAt, t.open, t.plan, t.sar, t.startsAt, t.status, t.unknown],
  );

  const paymentColumns = React.useMemo<DataColumn<PlatformPaymentRecord>[]>(
    () => [
      { key: "reference", label: t.reference, className: "w-[170px]", render: (payment) => <span className="truncate text-sm font-semibold tabular-nums text-foreground">{payment.reference || `#${payment.id || "—"}`}</span> },
      { key: "company", label: t.company, className: "w-[220px]", render: (payment) => <span className="truncate text-sm text-muted-foreground">{payment.company_name || t.unknown}</span> },
      { key: "gateway", label: t.gateway, className: "w-[150px]", render: (payment) => <span className="truncate text-sm text-muted-foreground">{payment.gateway || "—"}</span> },
      { key: "method", label: t.method, className: "w-[140px]", render: (payment) => <span className="truncate text-sm text-muted-foreground">{payment.method || "—"}</span> },
      { key: "status", label: t.status, className: "w-[125px]", render: (payment) => <StatusBadge value={payment.status} label={getStatusLabel(payment.status, locale)} /> },
      { key: "amount", label: t.amount, className: "w-[150px]", render: (payment) => <MoneyValue value={payment.amount} label={t.sar} /> },
      { key: "paid", label: t.paidAt, className: "w-[150px]", render: (payment) => <span className="text-sm tabular-nums text-muted-foreground">{formatDateTime(payment.paid_at || payment.created_at)}</span> },
      { key: "open", label: t.open, className: "w-[80px] text-center", render: (payment) => <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg"><Link href={`/system/platform-payments/${payment.id}`}>{t.open}</Link></Button> },
    ],
    [locale, t.amount, t.company, t.gateway, t.method, t.open, t.paidAt, t.reference, t.sar, t.status, t.unknown],
  );

  function buildExportSections() {
    return [
      {
        title: t.latestCompanies,
        headers: [t.company, t.code, t.owner, t.activity, t.subscription, t.status, t.createdAt],
        rows: filteredCompanies.map((company) => [
          company.name,
          company.code,
          company.owner,
          company.activity,
          company.subscription,
          getStatusLabel(company.status, locale),
          formatDateTime(company.created_at),
        ]),
      },
      {
        title: t.latestSubscriptions,
        headers: [t.company, t.plan, t.status, t.billingCycle, t.amount, t.startsAt, t.endsAt],
        rows: filteredSubscriptions.map((subscription) => [
          subscription.company_name,
          subscription.plan_name,
          getStatusLabel(subscription.status, locale),
          subscription.billing_cycle,
          formatMoney(subscription.amount),
          formatDate(subscription.starts_at),
          formatDate(subscription.ends_at),
        ]),
      },
      {
        title: t.latestPayments,
        headers: [t.reference, t.company, t.gateway, t.method, t.status, t.amount, t.paidAt],
        rows: filteredPayments.map((payment) => [
          payment.reference,
          payment.company_name,
          payment.gateway,
          payment.method,
          getStatusLabel(payment.status, locale),
          formatMoney(payment.amount),
          formatDateTime(payment.paid_at || payment.created_at),
        ]),
      },
    ];
  }

  function tableHtmlForSections(sections: ReturnType<typeof buildExportSections>) {
    return sections
      .filter((section) => section.rows.length)
      .map(
        (section) => `
          <h2>${escapeHtml(section.title)}</h2>
          <table border="1" cellspacing="0" cellpadding="6">
            <thead><tr>${section.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
            <tbody>
              ${section.rows
                .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
                .join("")}
            </tbody>
          </table>`
      )
      .join("<br />");
  }

  function exportExcel() {
    const sections = buildExportSections();
    const totalRows = sections.reduce((sum, section) => sum + section.rows.length, 0);

    if (!totalRows) {
      toast.error(t.exportEmpty);
      return;
    }

    const html = `
      <html dir="${dir}" lang="${locale}">
        <head><meta charset="utf-8" /></head>
        <body>
          <h1>${escapeHtml(t.printTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${tableHtmlForSections(sections)}
        </body>
      </html>`;

    const blob = new Blob([`\ufeff${html}`], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `primeyacc-system-dashboard-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function printPage() {
    const sections = buildExportSections();
    const totalRows = sections.reduce((sum, section) => sum + section.rows.length, 0);

    if (!totalRows) {
      toast.error(t.printEmpty);
      return;
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html dir="${dir}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.printTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            h2 { margin: 24px 0 10px; font-size: 18px; }
            p { color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: ${dir === "rtl" ? "right" : "left"}; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.printTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${tableHtmlForSections(sections)}
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>`);
    printWindow.document.close();
  }

  if (loading) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <DashboardSkeleton />
      </main>
    );
  }

  if (error) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl rounded-3xl border-destructive/30 bg-card shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-full bg-destructive/10 p-4 text-destructive">
              <TriangleAlert className="h-8 w-8" />
            </div>
            <CardTitle>{t.errorTitle}</CardTitle>
            <CardDescription>{t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => void loadDashboard({ silent: true })} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t.systemHealth}
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{t.subtitle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => void loadDashboard({ silent: true })} disabled={refreshing}>
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.export}
                </Button>
                <Button className="rounded-xl" onClick={printPage}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {warnings.length ? (
          <Card className="rounded-2xl border-amber-200 bg-amber-50 text-amber-950 shadow-sm">
            <CardContent className="flex gap-3 p-4">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{t.partialWarningTitle}</p>
                <p className="mt-1 text-sm opacity-80">{t.partialWarningDesc}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.totalCompanies} value={stats.companies} description={t.companies} href="/system/companies/list" icon={Building2} t={t} />
          <KpiCard title={t.activeCompanies} value={stats.activeCompanies} description={t.connectedToLiveApis} href="/system/companies/list" icon={CheckCircle2} t={t} />
          <KpiCard title={t.totalSubscriptions} value={stats.subscriptions} description={t.subscriptions} href="/system/subscriptions/list" icon={ShieldCheck} t={t} />
          <KpiCard title={t.activeSubscriptions} value={stats.activeSubscriptions} description={t.connectedToLiveApis} href="/system/subscriptions/list" icon={Activity} t={t} />
          <KpiCard title={t.platformPayments} value={stats.platformPayments} description={t.payments} href="/system/platform-payments/list" icon={CreditCard} t={t} />
          <KpiCard title={t.platformPaymentAmount} value={stats.platformPaymentAmount} description={t.sar} href="/system/platform-payments/reports" icon={Gauge} money t={t} />
          <KpiCard title={t.apiContracts} value={stats.apiContracts} description={t.connectedToLiveApis} href="/system/api-contracts" icon={ServerCog} t={t} />
          <KpiCard title={t.readinessScore} value={stats.readinessScore} description={t.connectedToLiveApis} href="/system/release-readiness" icon={ShieldCheck} percent t={t} />
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.latestCompanies}</CardTitle>
            <CardDescription>{t.latestCompaniesDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FiltersBar
              search={companySearch}
              onSearchChange={setCompanySearch}
              searchPlaceholder={t.companySearchPlaceholder}
              status={companyStatus}
              onStatusChange={setCompanyStatus}
              sort={companySort}
              onSortChange={setCompanySort}
              dateFrom={companyDateFrom}
              onDateFromChange={setCompanyDateFrom}
              dateTo={companyDateTo}
              onDateToChange={setCompanyDateTo}
              onReset={resetCompanyFilters}
              t={t}
              locale={locale}
            />
            <DataTable
              rows={filteredCompanies}
              allRowsCount={companies.length}
              columns={companyColumns}
              rowKey={(row) => row.id || row.code || row.name}
              emptyTitle={t.noDataTitle}
              emptyDescription={t.noDataDesc}
              noResultsTitle={t.noResultsTitle}
              noResultsDescription={t.noResultsDesc}
              hasFilters={hasCompanyFilters}
              onReset={resetCompanyFilters}
              resetLabel={t.reset}
              showingLabel={t.showing}
              ofLabel={t.of}
              rowsLabel={t.rows}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.latestSubscriptions}</CardTitle>
            <CardDescription>{t.latestSubscriptionsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FiltersBar
              search={subscriptionSearch}
              onSearchChange={setSubscriptionSearch}
              searchPlaceholder={t.subscriptionSearchPlaceholder}
              status={subscriptionStatus}
              onStatusChange={setSubscriptionStatus}
              sort={subscriptionSort}
              onSortChange={setSubscriptionSort}
              dateFrom={subscriptionDateFrom}
              onDateFromChange={setSubscriptionDateFrom}
              dateTo={subscriptionDateTo}
              onDateToChange={setSubscriptionDateTo}
              onReset={resetSubscriptionFilters}
              t={t}
              locale={locale}
            />
            <DataTable
              rows={filteredSubscriptions}
              allRowsCount={subscriptions.length}
              columns={subscriptionColumns}
              rowKey={(row) => row.id || `${row.company_name}-${row.plan_name}`}
              emptyTitle={t.noDataTitle}
              emptyDescription={t.noDataDesc}
              noResultsTitle={t.noResultsTitle}
              noResultsDescription={t.noResultsDesc}
              hasFilters={hasSubscriptionFilters}
              onReset={resetSubscriptionFilters}
              resetLabel={t.reset}
              showingLabel={t.showing}
              ofLabel={t.of}
              rowsLabel={t.rows}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.latestPayments}</CardTitle>
            <CardDescription>{t.latestPaymentsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FiltersBar
              search={paymentSearch}
              onSearchChange={setPaymentSearch}
              searchPlaceholder={t.paymentSearchPlaceholder}
              status={paymentStatus}
              onStatusChange={setPaymentStatus}
              sort={paymentSort}
              onSortChange={setPaymentSort}
              dateFrom={paymentDateFrom}
              onDateFromChange={setPaymentDateFrom}
              dateTo={paymentDateTo}
              onDateToChange={setPaymentDateTo}
              onReset={resetPaymentFilters}
              t={t}
              locale={locale}
            />
            <DataTable
              rows={filteredPayments}
              allRowsCount={payments.length}
              columns={paymentColumns}
              rowKey={(row) => row.id || row.reference}
              emptyTitle={t.noDataTitle}
              emptyDescription={t.noDataDesc}
              noResultsTitle={t.noResultsTitle}
              noResultsDescription={t.noResultsDesc}
              hasFilters={hasPaymentFilters}
              onReset={resetPaymentFilters}
              resetLabel={t.reset}
              showingLabel={t.showing}
              ofLabel={t.of}
              rowsLabel={t.rows}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}