"use client";

/* ============================================================
   📂 primey_frontend/app/system/companies/page.tsx
   🏢 PrimeyAcc — System Companies Overview
   ------------------------------------------------------------
   ✅ Premium PrimeyCare admin pattern adapted for PrimeyAcc
   ✅ System companies module center page
   ✅ Real API only: GET /api/system/companies/
   ✅ KPI cards + quick actions + recent companies table
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
import Link from "next/link";
import {
  Activity,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UsersRound,
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
  | "cancelled";

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

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const API_ENDPOINT = "/api/system/companies/";

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
    title: "الشركات",
    subtitle:
      "مركز إدارة شركات PrimeyAcc لمتابعة الشركات المسجلة حالة النشاط الاشتراكات والتقارير من مكان واحد.",
    badge: "إدارة المنصة",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    pdf: "PDF",
    addCompany: "إضافة شركة",
    list: "قائمة الشركات",
    reports: "تقارير الشركات",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث باسم الشركة أو الكود أو المالك أو النشاط أو المدينة...",
    all: "الكل",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    codeSort: "الكود",
    open: "فتح",

    totalCompanies: "إجمالي الشركات",
    activeCompanies: "الشركات النشطة",
    inactiveCompanies: "غير النشطة",
    subscribedCompanies: "شركات لديها اشتراك",
    fromLiveApi: "من واجهات النظام الحقيقية",

    actionsTitle: "اختصارات وحدة الشركات",
    actionsDesc: "تنقل سريع بين صفحات الشركات الأساسية بنفس نمط إدارة المنصة.",
    openListTitle: "عرض قائمة الشركات",
    openListDesc: "جدول كامل للشركات مع الفلاتر والتصدير والطباعة.",
    createTitle: "إضافة شركة جديدة",
    createDesc: "إنشاء شركة جديدة وربطها بإعدادات المنصة.",
    reportsTitle: "تقارير الشركات",
    reportsDesc: "تحليل الشركات حسب الحالة والنشاط والاشتراك.",
    dashboardTitle: "لوحة النظام",
    dashboardDesc: "العودة إلى لوحة تحكم النظام الرئيسية.",

    tableTitle: "أحدث الشركات",
    tableDesc:
      "نظرة سريعة على أحدث الشركات المسجلة في PrimeyAcc مع الحالة والنشاط والاشتراك.",
    company: "الشركة",
    code: "الكود",
    owner: "المالك",
    activity: "النشاط",
    subscription: "الاشتراك",
    city: "المدينة",
    status: "الحالة",
    createdAt: "تاريخ الإنشاء",

    active: "نشط",
    inactive: "غير نشط",
    suspended: "موقوف",
    trial: "تجريبي",
    pending: "معلق",
    draft: "مسودة",
    cancelled: "ملغي",
    unknown: "غير محدد",

    noDataTitle: "لا توجد شركات",
    noDataDesc: "ستظهر الشركات هنا عند توفرها من API.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غير البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل مركز الشركات",
    errorDesc:
      "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    pdfHint: "اختر حفظ كـ PDF من نافذة الطباعة.",
    reportTitle: "تقرير مركز شركات PrimeyAcc",
    generatedAt: "تاريخ الإنشاء",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    refreshed: "تم تحديث مركز الشركات.",
  },
  en: {
    title: "Companies",
    subtitle:
      "PrimeyAcc companies center for registered companies, activity status, subscriptions, and reports in one place.",
    badge: "Platform management",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    pdf: "PDF",
    addCompany: "Add company",
    list: "Companies list",
    reports: "Companies reports",
    reset: "Reset",
    searchPlaceholder: "Search by company, code, owner, activity, or city...",
    all: "All",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    codeSort: "Code",
    open: "Open",

    totalCompanies: "Total companies",
    activeCompanies: "Active companies",
    inactiveCompanies: "Inactive",
    subscribedCompanies: "With subscription",
    fromLiveApi: "From real system APIs",

    actionsTitle: "Companies module shortcuts",
    actionsDesc: "Quick navigation between companies pages using the platform management pattern.",
    openListTitle: "Open companies list",
    openListDesc: "Full companies table with filters, export, and print.",
    createTitle: "Add a new company",
    createDesc: "Create a new company and connect it to platform settings.",
    reportsTitle: "Companies reports",
    reportsDesc: "Analyze companies by status, activity, and subscription.",
    dashboardTitle: "System dashboard",
    dashboardDesc: "Return to the main system dashboard.",

    tableTitle: "Latest companies",
    tableDesc:
      "A quick view of the newest companies registered in PrimeyAcc with status, activity, and subscription.",
    company: "Company",
    code: "Code",
    owner: "Owner",
    activity: "Activity",
    subscription: "Subscription",
    city: "City",
    status: "Status",
    createdAt: "Created at",

    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
    trial: "Trial",
    pending: "Pending",
    draft: "Draft",
    cancelled: "Cancelled",
    unknown: "Unknown",

    noDataTitle: "No companies",
    noDataDesc: "Companies will appear here when returned by the API.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    errorTitle: "Could not load companies center",
    errorDesc:
      "Make sure you are signed in as a system user and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    pdfHint: "Choose Save as PDF from the print dialog.",
    reportTitle: "PrimeyAcc Companies Center Report",
    generatedAt: "Generated at",
    showing: "Showing",
    of: "of",
    rows: "rows",
    refreshed: "Companies center refreshed.",
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
  const owner = record.owner || record.user || record.account_owner || record.created_by;
  const activity = record.activity_profile_ref || record.activity_profile || record.activity;
  const subscription =
    record.subscription ||
    record.current_subscription ||
    record.active_subscription ||
    record.plan;
  const contact = asRecord(record.contact);
  const address = asRecord(record.address);

  return {
    id: normalizeText(record.id || record.uuid || record.pk || record.slug || record.code),
    name: normalizeText(record.name || record.company_name || record.title, "—"),
    code: normalizeText(
      record.code ||
        record.company_code ||
        record.slug ||
        record.registration_number ||
        record.commercial_registration,
      "—",
    ),
    status: normalizeStatus(record.status ?? record.state ?? record.is_active),
    owner: normalizeNestedName(owner, ["name", "full_name", "email", "username"]) || "—",
    activity: normalizeNestedName(activity, ["name", "code", "title"]) || "—",
    subscription:
      normalizeText(record.subscription_status) ||
      normalizeNestedName(subscription, ["plan_name", "name", "title", "status"]) ||
      "—",
    email: normalizeText(record.email || record.company_email || contact.email),
    phone: normalizeText(record.phone || record.mobile || record.company_phone || contact.phone),
    city: normalizeText(record.city || record.address_city || record.national_address_city || address.city, "—"),
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

function QuickActionCard({ action }: { action: QuickAction }) {
  const Icon = action.icon;

  return (
    <Card className="group rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={action.href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="min-w-0">
            <CardTitle className="text-base">{action.title}</CardTitle>
            <CardDescription className="mt-2 line-clamp-2">{action.description}</CardDescription>
          </div>
          <span className="rounded-2xl bg-primary/10 p-2.5 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="h-5 w-5" />
          </span>
        </CardHeader>
      </Link>
    </Card>
  );
}

function CompaniesOverviewSkeleton() {
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
            <Skeleton className="h-80 w-full" />
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
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
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

export default function SystemCompaniesPage() {
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

        const params = new URLSearchParams({
          page: "1",
          page_size: "100",
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
      if (sort === "oldest") return rowDateValue(a.created_at) - rowDateValue(b.created_at);
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "code") return a.code.localeCompare(b.code);
      return rowDateValue(b.created_at) - rowDateValue(a.created_at);
    });
  }, [companies, search, sort, status]);

  const stats = React.useMemo(() => {
    return {
      total: apiTotal || companies.length,
      active: companies.filter((company) => company.status === "active").length,
      inactive: companies.filter((company) =>
        ["inactive", "suspended", "cancelled"].includes(company.status),
      ).length,
      subscribed: companies.filter((company) => company.subscription && company.subscription !== "—").length,
    };
  }, [apiTotal, companies]);

  const quickActions = React.useMemo<QuickAction[]>(
    () => [
      {
        title: t.openListTitle,
        description: t.openListDesc,
        href: "/system/companies/list",
        icon: ListChecks,
      },
      {
        title: t.createTitle,
        description: t.createDesc,
        href: "/system/companies/create",
        icon: Plus,
      },
      {
        title: t.reportsTitle,
        description: t.reportsDesc,
        href: "/system/companies/reports",
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
    return filteredCompanies.map((company) => [
      company.name,
      company.code,
      company.owner,
      company.activity,
      company.subscription,
      company.city,
      getStatusLabel(company.status, locale),
      formatDate(company.created_at),
    ]);
  }

  function buildTableHtml() {
    const headers = [
      t.company,
      t.code,
      t.owner,
      t.activity,
      t.subscription,
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
    link.download = `primeyacc-system-companies-overview-${new Date().toISOString().slice(0, 10)}.xls`;
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

  if (loading) return <CompaniesOverviewSkeleton />;

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
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t.badge}
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
                  <Link href="/system/companies/create">
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

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.actionsTitle}</CardTitle>
            <CardDescription>{t.actionsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => (
                <QuickActionCard key={action.href} action={action} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="w-full rounded-2xl shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{t.tableTitle}</CardTitle>
                <CardDescription className="mt-2">{t.tableDesc}</CardDescription>
              </div>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                <UsersRound className="h-3.5 w-3.5" />
                {t.showing} {formatInteger(previewRows.length)} {t.of} {formatInteger(apiTotal || companies.length)} {t.rows}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
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
                <Table className="w-full min-w-[980px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className={cn("h-11 w-[220px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.company}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[135px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.code}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.owner}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.activity}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[130px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.subscription}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[115px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
                        {t.city}
                      </TableHead>
                      <TableHead className={cn("h-11 w-[110px] px-4 text-xs font-semibold text-muted-foreground", alignClass)}>
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
                    {previewRows.length ? (
                      previewRows.map((company) => (
                        <TableRow key={company.id || company.code || company.name} className="h-[64px]">
                          <TableCell className={cn("h-[64px] overflow-hidden px-4 align-middle", alignClass)}>
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">
                                {company.name || t.unknown}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                #{company.id || company.code || "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className={cn("h-[64px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm tabular-nums text-muted-foreground">
                              {company.code || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[64px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {company.owner || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[64px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {company.activity || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[64px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {company.subscription || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[64px] overflow-hidden px-4 align-middle", alignClass)}>
                            <span className="block truncate text-sm text-muted-foreground">
                              {company.city || "—"}
                            </span>
                          </TableCell>
                          <TableCell className={cn("h-[64px] px-4 align-middle", alignClass)}>
                            <StatusBadge value={company.status} locale={locale} />
                          </TableCell>
                          <TableCell className={cn("h-[64px] px-4 align-middle", alignClass)}>
                            <span className="text-sm tabular-nums text-muted-foreground">
                              {formatDate(company.created_at)}
                            </span>
                          </TableCell>
                          <TableCell className="sticky left-0 z-10 h-[64px] bg-background px-3 text-center align-middle">
                            <Button asChild variant="outline" size="sm" className="h-8 rounded-lg bg-background px-3">
                              <Link href={company.id ? `/system/companies/${company.id}` : "/system/companies/list"}>
                                {t.open}
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9}>
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

            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                {t.showing}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(previewRows.length)}
                </span>{" "}
                {t.of}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(apiTotal || companies.length)}
                </span>{" "}
                {t.rows}
              </p>
              <Button asChild variant="outline" className="w-fit rounded-xl bg-background">
                <Link href="/system/companies/list">
                  <ListChecks className="h-4 w-4" />
                  {t.list}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
