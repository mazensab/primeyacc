"use client";

/* ============================================================
   📂 primey_frontend/app/system/subscriptions/list/page.tsx
   🏢 Mhamcloud — System Subscriptions List
   ------------------------------------------------------------
   ✅ Approved PrimeyCare premium table pattern adapted for Mhamcloud
   ✅ Full-width table layout
   ✅ Real API only: GET /api/system/subscriptions/
   ✅ Search, status filter, date range, sorting, reset
   ✅ KPI cards from live/loaded data
   ✅ Excel .xls export for filtered rows
   ✅ Web print + PDF via browser print dialog
   ✅ Skeleton loading
   ✅ Error / Empty / No results states
   ✅ sonner toast
   ✅ Arabic/English via primey-locale
   ✅ No localhost hardcoding
   ✅ No fake demo data
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Gauge,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
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
  name: string;
  code: string;
  status: string;
  owner: string;
  activity: string;
  subscription: string;
  email: string;
  phone: string;
  city: string;
  created_at: string | null;
};

type CompanyStats = {
  total: number;
  active: number;
  inactive: number;
  subscribed: number;
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
];

const translations = {
  ar: {
    title: "قائمة اشتراكات الشركات",
    subtitle:
      "إدارة ومراجعة الشركات المسجلة في منصة Mhamcloud مع البحث الفلاتر التصدير الطباعة وملف PDF.",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    addCompany: "مركز الاشتراكات",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث باسم الشركة أو الكود أو الخطة أو الدورة أو تاريخ الانتهاء...",
    status: "الحالة",
    all: "الكل",
    from: "من",
    to: "إلى",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    codeSort: "الكود",
    open: "فتح",

    totalCompanies: "إجمالي الاشتراكات",
    activeCompanies: "الاشتراكات النشطة",
    inactiveCompanies: "غير النشطة",
    subscribedCompanies: "اشتراكات بقيمة",
    filteredRows: "النتائج المعروضة",
    fromLiveApi: "من واجهات النظام الحقيقية",

    tableTitle: "قائمة الشركات",
    tableDesc:
      "جدول موحد كامل العرض يعرض الشركات مع الحالة النشاط الاشتراك بيانات التواصل وتاريخ الإنشاء.",
    company: "الشركة",
    code: "الكود",
    owner: "الخطة",
    activity: "الدورة",
    subscription: "القيمة",
    contact: "التواصل",
    city: "تاريخ الانتهاء",
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

    noDataTitle: "لا توجد اشتراكات",
    noDataDesc: "ستظهر الاشتراكات هنا عند توفرها من API.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غير البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل الشركات",
    errorDesc:
      "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    reportTitle: "تقرير شركات Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    refreshed: "تم تحديث قائمة الشركات.",
  },
  en: {
    title: "Company subscriptions list",
    subtitle:
      "Manage and review companies registered in Mhamcloud with search, filters, export, print, and PDF output.",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    addCompany: "Subscriptions center",
    reset: "Reset",
    searchPlaceholder: "Search by company, code, plan, cycle, or end date...",
    status: "Status",
    all: "All",
    from: "From",
    to: "To",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    codeSort: "Code",
    open: "Open",

    totalCompanies: "Total subscriptions",
    activeCompanies: "Active subscriptions",
    inactiveCompanies: "Inactive",
    subscribedCompanies: "With value",
    filteredRows: "Filtered rows",
    fromLiveApi: "From real system APIs",

    tableTitle: "Subscriptions list",
    tableDesc:
      "A unified full-width table showing companies with status, activity, subscription, contact details, and creation date.",
    company: "Company",
    code: "Code",
    owner: "Plan",
    activity: "Cycle",
    subscription: "Value",
    contact: "Contact",
    city: "End date",
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

    noDataTitle: "No subscriptions",
    noDataDesc: "Subscriptions will appear here when returned by the API.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    errorTitle: "Could not load companies",
    errorDesc:
      "Make sure you are signed in as a system user and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reportTitle: "Mhamcloud Companies Report",
    generatedAt: "Generated at",
    showing: "Showing",
    of: "of",
    rows: "rows",
    refreshed: "Subscriptions list refreshed.",
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

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value).replace("T", " ").slice(0, 16);
  }
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

  return text;
}

function normalizeCompany(value: unknown): CompanyRecord {
  const record = asRecord(value);
  const company = record.company || record.company_ref || record.tenant || record.account_company;
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
  return {
    id: normalizeText(record.id || record.uuid || record.pk || record.slug || record.code),
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
    email: currency,
    phone: normalizeText(record.starts_at || record.start_date || record.started_at || record.valid_from),
    city: normalizeText(record.ends_at || record.end_date || record.expires_at || record.valid_to, "—"),
    created_at: normalizeText(record.created_at || record.created || record.inserted_at) || null,
  };
}
function getStatusLabel(value: string, locale: Locale) {
  const normalized = value.toLowerCase().replace(/[^a-z_]/g, "") as keyof (typeof translations)["ar"];
  const fallback = normalizeText(value, translations[locale].unknown);
  return normalizeText(translations[locale][normalized], fallback);
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

function isWithinDate(dateValue: string | null, from: string, to: string) {
  const normalized = formatDate(dateValue);
  if (normalized === "—") return !from && !to;
  if (from && normalized < from) return false;
  if (to && normalized > to) return false;
  return true;
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

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
            {formatInteger(value)}
          </CardTitle>
        </div>
        <span className="rounded-2xl bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function CompaniesSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
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
            <Skeleton className="h-[520px] w-full" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function EmptyState({
  title,
  description,
  showReset,
  resetLabel,
  onReset,
}: {
  title: string;
  description: string;
  showReset?: boolean;
  resetLabel: string;
  onReset: () => void;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {showReset ? (
        <Button variant="outline" size="sm" onClick={onReset} className="rounded-lg">
          <RotateCcw className="h-4 w-4" />
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default function SystemSubscriptionsListPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [companies, setCompanies] = React.useState<CompanyRecord[]>([]);
  const [apiTotal, setApiTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("newest");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

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

        const params = new URLSearchParams({
          page: "1",
          page_size: "250",
          ordering: "-created_at",
        });

        const payload = await fetchJson<unknown>(makeApiUrl(API_ENDPOINT, params));
        const rows = extractArray(payload).map(normalizeCompany);

        setCompanies(rows);
        setApiTotal(extractCount(payload));

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
    setDateFrom("");
    setDateTo("");
  }, []);

  const filteredCompanies = React.useMemo(() => {
    const needle = search.trim().toLowerCase();

    const rows = companies.filter((company) => {
      const haystack = [
        company.name,
        company.code,
        company.owner,
        company.activity,
        company.subscription,
        company.email,
        company.phone,
        company.city,
        company.status,
      ]
        .join(" ")
        .toLowerCase();

      if (needle && !haystack.includes(needle)) return false;
      if (status !== "all" && company.status !== status) return false;

      return isWithinDate(company.created_at, dateFrom, dateTo);
    });

    return [...rows].sort((a, b) => {
      if (sort === "oldest") return rowDateValue(a.created_at) - rowDateValue(b.created_at);
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "code") return a.code.localeCompare(b.code);
      return rowDateValue(b.created_at) - rowDateValue(a.created_at);
    });
  }, [companies, dateFrom, dateTo, search, sort, status]);

  const stats = React.useMemo<CompanyStats>(() => {
    return {
      total: apiTotal || companies.length,
      active: companies.filter((company) => company.status === "active").length,
      inactive: companies.filter((company) =>
        ["inactive", "suspended", "cancelled"].includes(company.status),
      ).length,
      subscribed: companies.filter((company) => company.subscription && company.subscription !== "—").length,
    };
  }, [apiTotal, companies]);

  const hasFilters = Boolean(search || status !== "all" || sort !== "newest" || dateFrom || dateTo);

  function buildExportRows() {
    return filteredCompanies.map((company) => [
      company.name,
      company.code,
      company.owner,
      company.activity,
      company.subscription,
      company.email || "—",
      company.phone || "—",
      company.city,
      getStatusLabel(company.status, locale),
      formatDateTime(company.created_at),
    ]);
  }

  function buildTableHtml() {
    const headers = [
      t.company,
      t.code,
      t.owner,
      t.activity,
      t.subscription,
      t.contact,
      t.contact,
      t.city,
      t.status,
      t.createdAt,
    ];

    const rows = buildExportRows();

    return `
      <table border="1" cellspacing="0" cellpadding="6">
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
    `;
  }

  function exportExcel() {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.exportEmpty);
      return;
    }

    const html = `
      <html dir="${dir}" lang="${locale}">
        <head><meta charset="utf-8" /></head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${buildTableHtml()}
        </body>
      </html>
    `;

    const blob = new Blob([`\ufeff${html}`], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Mhamcloud-system-companies-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function openPrintWindow(mode: "print" | "pdf") {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }

    if (mode === "pdf") {
      toast.info(t.pdfHint);
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html dir="${dir}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.reportTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px;
              font-size: 12px;
              text-align: ${dir === "rtl" ? "right" : "left"};
              vertical-align: top;
            }
            th { background: #f1f5f9; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.reportTitle)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          ${buildTableHtml()}
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) return <CompaniesSkeleton />;

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
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-4xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  Mhamcloud System
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{t.subtitle}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl bg-background"
                  onClick={() => void loadCompanies({ silent: true })}
                  disabled={refreshing}
                >
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.exportExcel}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => openPrintWindow("print")}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => openPrintWindow("pdf")}>
                  <FileText className="h-4 w-4" />
                  {t.pdf}
                </Button>
                <Button asChild className="rounded-xl">
                  <Link href="/system/subscriptions">
                    <Plus className="h-4 w-4" />
                    {t.addCompany}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.totalCompanies} value={stats.total} description={t.fromLiveApi} icon={Building2} />
          <KpiCard title={t.activeCompanies} value={stats.active} description={t.fromLiveApi} icon={CheckCircle2} />
          <KpiCard title={t.inactiveCompanies} value={stats.inactive} description={t.fromLiveApi} icon={ShieldCheck} />
          <KpiCard title={t.subscribedCompanies} value={stats.subscribed} description={t.fromLiveApi} icon={Activity} />
        </div>

        <Card className="w-full rounded-2xl shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{t.tableTitle}</CardTitle>
                <CardDescription className="mt-2">{t.tableDesc}</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                <Gauge className="h-3.5 w-3.5" />
                {t.showing} {formatInteger(filteredCompanies.length)} {t.of} {formatInteger(apiTotal || companies.length)} {t.rows}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="h-10 rounded-xl ps-9"
                  />
                </div>

                <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background md:w-[170px]">
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
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="h-8 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>

                <div className="flex h-10 items-center gap-2 rounded-xl border bg-background px-3">
                  <span className="text-xs text-muted-foreground">{t.to}</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="h-8 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>

                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[160px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="oldest">{t.oldest}</SelectItem>
                    <SelectItem value="name">{t.nameSort}</SelectItem>
                    <SelectItem value="code">{t.codeSort}</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border bg-background">
              <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[1080px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("h-11 w-[215px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.company}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[135px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.code}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.owner}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.activity}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.subscription}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[145px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.contact}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[105px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.city}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[105px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.status}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.createdAt}
                      </TableHead>
                      <TableHead className="sticky left-0 z-10 h-11 w-[76px] bg-muted/40 px-3 text-center text-xs font-semibold text-muted-foreground">
                        {t.open}
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredCompanies.length ? (
                      filteredCompanies.map((company) => (
                        <TableRow key={company.id || company.code || company.name} className="h-[68px]">
                          <TableCell className={cn("h-[68px] overflow-hidden px-4 align-middle", alignClass)}>
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">
                                {company.name || t.unknown}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                #{company.id || company.code || "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className={cn("h-[68px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm tabular-nums text-muted-foreground">
                              {company.code || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[68px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {company.owner || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[68px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {company.activity || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[68px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {company.subscription || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[68px] overflow-hidden px-4 align-middle", alignClass)}>
                            <div className="min-w-0 text-sm text-muted-foreground">
                              <span className="block truncate">{company.email || "—"}</span>
                              <span className="block truncate text-xs">{company.phone || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell className={cn("h-[68px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {company.city || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[68px] px-4 align-middle", alignClass)}>
                            <StatusBadge value={company.status} locale={locale} />
                          </TableCell>
                          <TableCell className={cn("h-[68px] px-4 align-middle", alignClass)}>
                            <span className="text-sm tabular-nums text-muted-foreground">
                              {formatDate(company.created_at)}
                            </span>
                          </TableCell>
                          <TableCell className="sticky left-0 z-10 h-[68px] bg-background px-3 text-center align-middle">
                            <Button asChild variant="outline" size="sm" className="h-8 rounded-lg bg-background px-3">
                              <Link href={company.id ? `/system/subscriptions/${company.id}` : "/system/subscriptions"}>
                                {t.open}
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10}>
                          <EmptyState
                            title={hasFilters ? t.noResultsTitle : t.noDataTitle}
                            description={hasFilters ? t.noResultsDesc : t.noDataDesc}
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
            </div>

            <div className="text-sm text-muted-foreground">
              {t.showing}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(filteredCompanies.length)}
              </span>{" "}
              {t.of}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(apiTotal || companies.length)}
              </span>{" "}
              {t.rows}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}










