"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpDown,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  MoreVertical,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldOff,
  TableProperties,
} from "lucide-react";
import { toast } from "sonner";

import {
  DataRegisterDatePicker,
  DataRegisterEmptyState,
  DataRegisterSearch,
  DataRegisterToolbar,
  registerBrandButtonClass,
  registerOutlineButtonClass,
} from "@/components/ui/data-register";
import {
  DataRegisterPreviewLink,
  DataRegisterResultCount,
  DataRegisterTableFrame,
} from "@/components/ui/data-register-table";
import {
  downloadExcelReport,
  type ExcelReportSection,
} from "@/lib/excel-report";
import {
  openPrintTableReport,
  type PrintReportTableSection,
} from "@/lib/print-report";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import { SystemMetricCard } from "@/components/ui/system-metric-card";
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
    subtitle: "إدارة الشركات وحالاتها واشتراكاتها من واجهة النظام الموحدة.",
    refresh: "تحديث",
    exportExcel: "تصدير Excel",
    print: "طباعة",
    addCompany: "إضافة شركة",
    reset: "إعادة ضبط",
    from: "من",
    to: "إلى",
    searchPlaceholder: "ابحث باسم الشركة أو الكود أو المالك أو النشاط أو المدينة...",
    all: "الكل",
    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    codeSort: "الكود",
    open: "فتح",
    totalCompanies: "إجمالي الشركات",
    activeCompanies: "الشركات النشطة",
    inactiveCompanies: "غير النشطة",
    subscribedCompanies: "لديها اشتراك",
    currentSnapshot: "الوضع الحالي",
    statusOverview: "حالة الشركات",
    statusOverviewDesc: "توزيع سريع لحالات الشركات الحالية.",
    latestCompanies: "أحدث الشركات",
    latestCompaniesDesc: "أحدث السجلات مع البحث والفلاتر وإجراءات التصدير.",
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
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل الشركات",
    errorDesc: "تأكد من تسجيل الدخول بصلاحية نظام ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    reportTitle: "تقرير شركات Mhamcloud",
    generatedAt: "تاريخ الإنشاء",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    viewAll: "عرض الكل",
    refreshed: "تم تحديث الشركات.",
  },
  en: {
    title: "Companies",
    subtitle: "Manage companies, statuses, and subscriptions in the unified system experience.",
    refresh: "Refresh",
    exportExcel: "Export Excel",
    print: "Print",
    addCompany: "Add company",
    reset: "Reset",
    from: "From",
    to: "To",
    searchPlaceholder: "Search by company, code, owner, activity, or city...",
    all: "All",
    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    codeSort: "Code",
    open: "Open",
    totalCompanies: "Total companies",
    activeCompanies: "Active companies",
    inactiveCompanies: "Inactive",
    subscribedCompanies: "With subscription",
    currentSnapshot: "Current snapshot",
    statusOverview: "Company status",
    statusOverviewDesc: "A quick distribution of current company statuses.",
    latestCompanies: "Latest companies",
    latestCompaniesDesc: "Latest records with search, filters, and export actions.",
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
    errorTitle: "Could not load companies",
    errorDesc: "Make sure you are signed in as a system user and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    reportTitle: "Mhamcloud Companies Report",
    generatedAt: "Generated at",
    showing: "Showing",
    of: "of",
    rows: "rows",
    viewAll: "View all",
    refreshed: "Companies refreshed.",
  },
} as const;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
}

function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function number(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function integer(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(number(value)),
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

function readLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("Mhamcloud-locale") === "en" ? "en" : "ar";
}

function apiBase() {
  const raw = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");
  return raw.endsWith("/api") ? raw.slice(0, -4) : raw;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  const raw = await response.text();
  let payload: unknown = {};
  if (raw) {
    try {
      payload = JSON.parse(raw) as unknown;
    } catch {
      payload = {};
    }
  }

  if (!response.ok) {
    const record = asRecord(payload);
    throw new Error(
      text(record.message) ||
        text(record.detail) ||
        text(record.error) ||
        `HTTP ${response.status}`,
    );
  }

  return payload as T;
}

function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const result = asRecord(root.result);

  const candidates = [
    root.results,
    root.items,
    root.records,
    root.companies,
    root.data,
    data.results,
    data.items,
    data.records,
    data.companies,
    result.results,
    result.items,
    result.records,
    result.companies,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function extractCount(payload: unknown) {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const meta = asRecord(root.meta);
  return number(
    root.count ??
      root.total ??
      root.total_count ??
      data.count ??
      data.total ??
      data.total_count ??
      meta.count ??
      meta.total ??
      meta.total_count,
    extractArray(payload).length,
  );
}

function nestedName(value: unknown, keys = ["name", "title", "full_name"]) {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  for (const key of keys) {
    const resolved = text(record[key]);
    if (resolved) return resolved;
  }
  return "";
}

function normalizeStatus(value: unknown) {
  if (typeof value === "boolean") return value ? "active" : "inactive";
  const resolved = text(value, "unknown").toLowerCase();
  if (resolved === "true" || resolved === "enabled") return "active";
  if (resolved === "false" || resolved === "disabled") return "inactive";
  return resolved || "unknown";
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
    id: text(record.id || record.uuid || record.pk || record.slug || record.code),
    name: text(
      record.name ||
        record.company_name ||
        record.display_name ||
        record.legal_name ||
        record.name_ar ||
        record.title,
      "—",
    ),
    code: text(
      record.code ||
        record.company_code ||
        record.tenant_code ||
        record.slug ||
        record.registration_number ||
        record.commercial_registration,
      "—",
    ),
    status: normalizeStatus(record.status ?? record.state ?? record.is_active),
    owner: nestedName(owner, ["name", "full_name", "email", "username"]) || "—",
    activity:
      nestedName(activity, ["display_name", "name_ar", "name_en", "name", "title", "code"]) ||
      text(record.activity_profile_display) ||
      text(record.activity_profile_name) ||
      "—",
    subscription:
      text(record.subscription_status) ||
      nestedName(subscription, ["plan_name", "name", "title", "status"]) ||
      "—",
    email: text(record.email || record.company_email || contact.email),
    phone: text(record.phone || record.mobile || record.company_phone || contact.phone),
    city: text(record.city || record.address_city || record.national_address_city || address.city, "—"),
    created_at: text(record.created_at || record.created || record.inserted_at || record.date_joined) || null,
  };
}

function statusLabel(value: string, locale: Locale) {
  const labels = {
    ar: {
      active: "نشط",
      inactive: "غير نشط",
      suspended: "موقوف",
      trial: "تجريبي",
      pending: "معلق",
      draft: "مسودة",
      cancelled: "ملغي",
      canceled: "ملغي",
      unknown: "غير محدد",
    },
    en: {
      active: "Active",
      inactive: "Inactive",
      suspended: "Suspended",
      trial: "Trial",
      pending: "Pending",
      draft: "Draft",
      cancelled: "Cancelled",
      canceled: "Cancelled",
      unknown: "Unknown",
    },
  } as const;

  const key = value.toLowerCase() as keyof typeof labels.ar;
  return labels[locale][key] || value || translations[locale].unknown;
}

function statusVariant(value: string) {
  const key = value.toLowerCase();
  if (["active", "paid", "confirmed", "ready", "success"].includes(key)) return "success";
  if (["trial", "new"].includes(key)) return "info";
  if (["pending", "draft", "processing"].includes(key)) return "warning";
  if (["inactive", "failed", "cancelled", "canceled", "expired", "suspended", "blocked"].includes(key)) return "destructive";
  return "outline";
}

function StatusBadge({ value, locale }: { value: string; locale: Locale }) {
  return (
    <Badge variant={statusVariant(value) as any}>
      {statusLabel(value, locale)}
    </Badge>
  );
}

function ActionMenu({
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
        <Button type="button" variant="outline" size="icon" aria-label={label}>
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={locale === "ar" ? "start" : "end"}>
        <DropdownMenuItem asChild>
          <Link href={href}>
            <ExternalLink />
            {label}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-9 w-80" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3 lg:gap-6">
        <Skeleton className="h-[420px]" />
        <Skeleton className="h-[420px] xl:col-span-2" />
      </div>
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
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  React.useEffect(() => {
    const sync = () => {
      const next = readLocale();
      setLocale(next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      document.body.dir = next === "ar" ? "rtl" : "ltr";
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("Mhamcloud-locale-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("Mhamcloud-locale-changed", sync);
    };
  }, []);

  const load = React.useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");

        const payload = await fetchJson<unknown>(
          `${API_ENDPOINT}?page=1&page_size=250&ordering=-created_at`,
        );
        const rows = extractArray(payload).map(normalizeCompany);
        setCompanies(rows);
        setApiTotal(extractCount(payload));

        if (silent) toast.success(t.refreshed);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : t.errorDesc;
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
    void load();
  }, [load]);

  const filtered = React.useMemo(() => {
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

      const created = formatDate(company.created_at);
      if (dateFrom && created !== "—" && created < dateFrom) return false;
      if (dateTo && created !== "—" && created > dateTo) return false;

      return true;
    });

    return [...rows].sort((a, b) => {
      if (sort === "oldest") return rowDateValue(a.created_at) - rowDateValue(b.created_at);
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "code") return a.code.localeCompare(b.code);
      return rowDateValue(b.created_at) - rowDateValue(a.created_at);
    });
  }, [companies, dateFrom, dateTo, search, sort, status]);

  const previewRows = filtered.slice(0, 8);

  const stats = React.useMemo(
    () => ({
      total: apiTotal || companies.length,
      active: companies.filter((company) => company.status === "active").length,
      inactive: companies.filter((company) =>
        ["inactive", "suspended", "cancelled", "canceled"].includes(company.status),
      ).length,
      subscribed: companies.filter(
        (company) => company.subscription && company.subscription !== "—",
      ).length,
    }),
    [apiTotal, companies],
  );

  const statusRows = React.useMemo(
    () => [
      { key: "active", value: companies.filter((item) => item.status === "active").length },
      { key: "trial", value: companies.filter((item) => item.status === "trial").length },
      { key: "suspended", value: companies.filter((item) => item.status === "suspended").length },
      { key: "inactive", value: companies.filter((item) => ["inactive", "cancelled", "canceled"].includes(item.status)).length },
    ],
    [companies],
  );

  const hasFilters = Boolean(
    search || status !== "all" || sort !== "newest" || dateFrom || dateTo,
  );

  function resetFilters() {
    setSearch("");
    setStatus("all");
    setSort("newest");
    setDateFrom("");
    setDateTo("");
  }

  function exportRows() {
    return filtered.map((company) => [
      company.name,
      company.code,
      company.owner,
      company.activity,
      company.subscription,
      company.city,
      statusLabel(company.status, locale),
      formatDate(company.created_at),
    ]);
  }

  function excelSection(): ExcelReportSection {
    return {
      title: t.latestCompanies,
      headers: [
        t.company,
        t.code,
        t.owner,
        t.activity,
        t.subscription,
        t.city,
        t.status,
        t.createdAt,
      ],
      widths: [220, 130, 160, 160, 160, 130, 130, 160],
      rows: exportRows().map((row) =>
        row.map((value) => ({ value, type: "text" as const })),
      ),
    };
  }

  function printSection(): PrintReportTableSection {
    return {
      title: t.latestCompanies,
      columns: [
        { label: t.company, width: 220, type: "text" },
        { label: t.code, width: 130, type: "text" },
        { label: t.owner, width: 160, type: "text" },
        { label: t.activity, width: 160, type: "text" },
        { label: t.subscription, width: 160, type: "text" },
        { label: t.city, width: 130, type: "text" },
        { label: t.status, width: 130, type: "text" },
        { label: t.createdAt, width: 160, type: "text" },
      ],
      rows: exportRows(),
    };
  }

  function exportExcel() {
    const rows = exportRows();
    if (!rows.length) {
      toast.error(t.exportEmpty);
      return;
    }

    downloadExcelReport({
      locale,
      title: t.reportTitle,
      subtitle: t.subtitle,
      filename: `Mhamcloud-system-companies-${new Date().toISOString().slice(0, 10)}.xls`,
      generatedAtLabel: t.generatedAt,
      sections: [excelSection()],
    });
  }

  function printCompanies() {
    const rows = exportRows();
    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }

    const opened = openPrintTableReport({
      locale,
      title: t.reportTitle,
      subtitle: t.subtitle,
      sections: [printSection()],
      recordsCount: rows.length,
      recordsLabel: t.rows,
      generatedAtLabel: t.generatedAt,
    });

    if (!opened) {
      toast.error(t.printEmpty);
    }
  }

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <Card dir={dir}>
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
          <Building2 className="size-9 text-destructive" />
          <div>
            <CardTitle>{t.errorTitle}</CardTitle>
            <p className="text-muted-foreground mt-2 text-sm">{error}</p>
          </div>
          <Button onClick={() => void load()}>{t.tryAgain}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div dir={dir} className="space-y-4 lg:space-y-6">
      <div className="flex flex-row items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{t.title}</h1>
          <p className="text-muted-foreground mt-1 hidden text-sm lg:block">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className={registerOutlineButtonClass}
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            <span className="hidden lg:inline">{t.refresh}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className={registerOutlineButtonClass}
            onClick={exportExcel}
          >
            <FileSpreadsheet />
            <span className="hidden lg:inline">{t.exportExcel}</span>
          </Button>
          <Button
            type="button"
            onClick={printCompanies}
            className={registerBrandButtonClass}
          >
            <Printer />
            <span className="hidden lg:inline">{t.print}</span>
          </Button>
          <Button asChild className={registerBrandButtonClass}>
            <Link href="/system/companies/create">
              <Plus />
              <span>{t.addCompany}</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:gap-6">
        <SystemMetricCard title={t.totalCompanies} value={stats.total} description={t.currentSnapshot} icon={Building2} />
        <SystemMetricCard title={t.activeCompanies} value={stats.active} description={t.currentSnapshot} icon={CheckCircle2} />
        <SystemMetricCard title={t.inactiveCompanies} value={stats.inactive} description={t.currentSnapshot} icon={ShieldOff} />
        <SystemMetricCard title={t.subscribedCompanies} value={stats.subscribed} description={t.currentSnapshot} icon={BadgeCheck} />
      </div>

      <div className="space-y-4 lg:space-y-6">
        <Card>
          <CardHeader>
            <CardTitle icon={Activity} iconPosition="opposite">{t.statusOverview}</CardTitle>
            <CardDescription>{t.statusOverviewDesc}</CardDescription>
            <CardAction>
              <Button variant="outline" size="sm" asChild>
                <Link href="/system/companies/list">{t.viewAll}</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {statusRows.map((item) => (
              <div
                key={item.key}
                className="hover:bg-muted flex items-center justify-between rounded-md border px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <StatusBadge value={item.key} locale={locale} />
                </div>
                <span className="font-display text-lg tabular-nums">{integer(item.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={TableProperties}>{t.latestCompanies}</CardTitle>
            <CardDescription>{t.latestCompaniesDesc}</CardDescription>
            <CardAction>
              <Button variant="outline" size="sm" asChild>
                <Link href="/system/companies/list">{t.viewAll}</Link>
              </Button>
            </CardAction>
          </CardHeader>

          <CardContent className="space-y-4 p-0">
            <div className="px-(--card-spacing)">
              <DataRegisterToolbar className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <DataRegisterSearch
                  value={search}
                  onChange={setSearch}
                  placeholder={t.searchPlaceholder}
                  className="min-w-0 flex-1"
                />

                <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                  <SelectTrigger className="h-9 bg-background shadow-none lg:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilters.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === "all" ? t.all : statusLabel(item, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <DataRegisterDatePicker
                  value={dateFrom}
                  onChange={setDateFrom}
                  label={t.from}
                  locale={locale}
                />

                <DataRegisterDatePicker
                  value={dateTo}
                  onChange={setDateTo}
                  label={t.to}
                  locale={locale}
                />

                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-9 bg-background shadow-none lg:w-[145px]">
                    <ArrowUpDown />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="oldest">{t.oldest}</SelectItem>
                    <SelectItem value="name">{t.nameSort}</SelectItem>
                    <SelectItem value="code">{t.codeSort}</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  className="h-9 bg-background shadow-none"
                  onClick={resetFilters}
                >
                  <RotateCcw />
                  <span className="hidden 2xl:inline">{t.reset}</span>
                </Button>
              </DataRegisterToolbar>
            </div>

            <DataRegisterTableFrame className="rounded-none border-x-0">
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[980px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[220px] px-4">{t.company}</TableHead>
                      <TableHead className="w-[130px] px-4">{t.code}</TableHead>
                      <TableHead className="w-[130px] px-4">{t.owner}</TableHead>
                      <TableHead className="w-[130px] px-4">{t.activity}</TableHead>
                      <TableHead className="w-[130px] px-4">{t.subscription}</TableHead>
                      <TableHead className="w-[105px] px-4">{t.city}</TableHead>
                      <TableHead className="w-[110px] px-4">{t.status}</TableHead>
                      <TableHead className="w-[115px] px-4">{t.createdAt}</TableHead>
                      <TableHead className="sticky end-0 z-10 w-[76px] bg-card px-3 text-center">
                        {t.open}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.length ? (
                      previewRows.map((company) => (
                        <TableRow
                          key={company.id || company.code || company.name}
                          href={company.id ? `/system/companies/${company.id}` : undefined}
                          aria-label={`${t.open}: ${company.name}`}
                        >
                          <TableCell className="overflow-hidden px-4">
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-medium">{company.name}</span>
                              <span className="text-muted-foreground block truncate text-xs">
                                #{company.id || company.code}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="overflow-hidden px-4">
                            <span className="text-muted-foreground block truncate text-sm tabular-nums">
                              {company.code}
                            </span>
                          </TableCell>
                          <TableCell className="overflow-hidden px-4">
                            <span className="text-muted-foreground block truncate text-sm">{company.owner}</span>
                          </TableCell>
                          <TableCell className="overflow-hidden px-4">
                            <span className="text-muted-foreground block truncate text-sm">{company.activity}</span>
                          </TableCell>
                          <TableCell className="overflow-hidden px-4">
                            <span className="text-muted-foreground block truncate text-sm">{company.subscription}</span>
                          </TableCell>
                          <TableCell className="overflow-hidden px-4">
                            <span className="text-muted-foreground block truncate text-sm">{company.city}</span>
                          </TableCell>
                          <TableCell className="px-4">
                            <StatusBadge value={company.status} locale={locale} />
                          </TableCell>
                          <TableCell className="px-4">
                            <span className="text-muted-foreground text-sm tabular-nums">
                              {formatDate(company.created_at)}
                            </span>
                          </TableCell>
                          <TableCell className="sticky end-0 z-10 bg-card px-3 text-center">
                            <ActionMenu
                              href={company.id ? `/system/companies/${company.id}` : "/system/companies/list"}
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
            </DataRegisterTableFrame>

            <div className="space-y-3 px-(--card-spacing) pb-(--card-spacing)">
              <DataRegisterResultCount
                showingLabel={t.showing}
                showingCount={integer(previewRows.length)}
                ofLabel={t.of}
                totalCount={integer(apiTotal || companies.length)}
                rowsLabel={t.rows}
              />
              <DataRegisterPreviewLink
                href="/system/companies/list"
                label={t.viewAll}
                icon={Building2}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
