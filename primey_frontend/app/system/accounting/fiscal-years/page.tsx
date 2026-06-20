"use client";

/* ============================================================
   📂 app/system/accounting/fiscal-years/page.tsx
   🧾 Primey Care — Fiscal Years
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API:
      GET /api/accounting/fiscal-years/?page=1&page_size=500
      fallback:
      GET /api/accounting/fiscal_years/?page=1&page_size=500
      GET /api/accounting/years/?page=1&page_size=500
      GET /api/accounting/reports/fiscal-years/?page=1&page_size=500
   ✅ Create + details links
   ✅ Search / status / current-year / sort / columns
   ✅ Local pagination
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error / Empty states
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  LockKeyhole,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  TriangleAlert,
  UnlockKeyhole,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

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

type ApiResponse = {
  count?: number;
  total?: number;
  total_count?: number;
  results?: unknown[];
  items?: unknown[];
  rows?: unknown[];
  data?: unknown;
  summary?: unknown;
};

type FiscalYearStatus = "open" | "closed" | "locked" | "draft" | "archived" | "unknown";
type StatusFilter = "all" | FiscalYearStatus;
type CurrentFilter = "all" | "current" | "not_current";

type SortKey =
  | "newest"
  | "oldest"
  | "name"
  | "code"
  | "status"
  | "periods_high"
  | "journals_high"
  | "debit_high"
  | "credit_high";

type ColumnKey =
  | "year"
  | "code"
  | "startDate"
  | "endDate"
  | "status"
  | "current"
  | "periods"
  | "journals"
  | "debit"
  | "credit"
  | "actions";

type FiscalYearRecord = {
  id: string;
  code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: FiscalYearStatus;
  is_current: boolean;
  is_closed: boolean;
  is_locked: boolean;
  periods_count: number;
  journals_count: number;
  transactions_count: number;
  total_debit: number;
  total_credit: number;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
};

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  year: true,
  code: true,
  startDate: true,
  endDate: true,
  status: true,
  current: true,
  periods: true,
  journals: true,
  debit: true,
  credit: true,
  actions: true,
};

const translations = {
  ar: {
    title: "السنوات المالية",
    subtitle: "إدارة السنوات المالية والفترات المرتبطة بها وحالة الإقفال المحاسبي.",
    back: "المحاسبة",
    create: "سنة مالية جديدة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    openDetails: "فتح التفاصيل",

    totalYears: "إجمالي السنوات",
    openYears: "سنوات مفتوحة",
    closedYears: "سنوات مغلقة",
    journalEntries: "قيود اليومية",

    all: "الكل",
    searchPlaceholder: "ابحث باسم السنة المالية أو الكود أو الحالة...",
    statusFilter: "الحالة",
    currentFilter: "السنة الحالية",
    sort: "الترتيب",
    columns: "الأعمدة",
    rowsPerPage: "عدد الصفوف",

    year: "السنة المالية",
    code: "الكود",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",
    status: "الحالة",
    current: "الحالية",
    periods: "الفترات",
    journals: "القيود",
    debit: "مدين",
    credit: "دائن",
    actions: "الإجراءات",

    open: "مفتوحة",
    closed: "مغلقة",
    locked: "مقفلة",
    draft: "مسودة",
    archived: "مؤرشفة",
    unknown: "غير محددة",

    yes: "نعم",
    no: "لا",
    currentOnly: "الحالية فقط",
    notCurrentOnly: "غير الحالية",

    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "اسم السنة",
    codeSort: "الكود",
    statusSort: "الحالة",
    periodsHigh: "الأكثر فترات",
    journalsHigh: "الأكثر قيودًا",
    debitHigh: "الأعلى مدين",
    creditHigh: "الأعلى دائن",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    page: "صفحة",
    previous: "السابق",
    next: "التالي",
    noDataTitle: "لا توجد سنوات مالية",
    noDataDesc: "ستظهر السنوات المالية هنا بعد إنشائها.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل السنوات المالية",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث السنوات المالية.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير السنوات المالية",
    generatedAt: "تاريخ الطباعة",
    sar: "ر.س",
    notAvailable: "—",
  },
  en: {
    title: "Fiscal Years",
    subtitle: "Manage fiscal years, related periods, and accounting closing status.",
    back: "Accounting",
    create: "New fiscal year",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    openDetails: "Open details",

    totalYears: "Total years",
    openYears: "Open years",
    closedYears: "Closed years",
    journalEntries: "Journal entries",

    all: "All",
    searchPlaceholder: "Search by fiscal year name, code, or status...",
    statusFilter: "Status",
    currentFilter: "Current year",
    sort: "Sort",
    columns: "Columns",
    rowsPerPage: "Rows per page",

    year: "Fiscal year",
    code: "Code",
    startDate: "Start date",
    endDate: "End date",
    status: "Status",
    current: "Current",
    periods: "Periods",
    journals: "Journals",
    debit: "Debit",
    credit: "Credit",
    actions: "Actions",

    open: "Open",
    closed: "Closed",
    locked: "Locked",
    draft: "Draft",
    archived: "Archived",
    unknown: "Unknown",

    yes: "Yes",
    no: "No",
    currentOnly: "Current only",
    notCurrentOnly: "Not current",

    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Year name",
    codeSort: "Code",
    statusSort: "Status",
    periodsHigh: "Most periods",
    journalsHigh: "Most journals",
    debitHigh: "Highest debit",
    creditHigh: "Highest credit",

    showing: "Showing",
    of: "of",
    rows: "rows",
    page: "Page",
    previous: "Previous",
    next: "Next",
    noDataTitle: "No fiscal years",
    noDataDesc: "Fiscal years will appear here once created.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load fiscal years",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Fiscal years refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Fiscal years report",
    generatedAt: "Generated at",
    sar: "SAR",
    notAvailable: "—",
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
  const cleaned = String(value).trim();
  return cleaned || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    if (
      ["1", "true", "yes", "on", "active", "open", "opened", "current", "locked", "closed"].includes(
        normalized,
      )
    ) {
      return true;
    }

    if (["0", "false", "no", "off", "inactive", "draft", "not_current"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(toNumber(value));
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
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

  let payload: any = null;

  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.detail ||
      payload?.error ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return (payload || {}) as T;
}

function extractArray(payload: ApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;

  const data = asRecord(payload.data);

  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.fiscal_years)) return data.fiscal_years;
  if (Array.isArray(data.fiscalYears)) return data.fiscalYears;
  if (Array.isArray(data.years)) return data.years;

  return [];
}

function normalizeStatus(value: unknown, isClosed: boolean, isLocked: boolean): FiscalYearStatus {
  const status = normalizeText(value).toLowerCase();

  if (isLocked || ["locked", "lock", "finalized"].includes(status)) return "locked";
  if (isClosed || ["closed", "close"].includes(status)) return "closed";
  if (["archived", "archive"].includes(status)) return "archived";
  if (["open", "opened", "active"].includes(status)) return "open";
  if (["draft", "new", "pending"].includes(status)) return "draft";

  return "unknown";
}

function normalizeFiscalYear(value: unknown): FiscalYearRecord {
  const item = asRecord(value);

  const id = normalizeText(item.id || item.pk || item.uuid);
  const isClosed = toBoolean(item.is_closed ?? item.closed ?? item.isClosed, false);
  const isLocked = toBoolean(item.is_locked ?? item.locked ?? item.isLocked, false);
  const status = normalizeStatus(item.status || item.year_status || item.fiscal_year_status, isClosed, isLocked);

  const code = normalizeText(item.code || item.year_code || item.number || item.fiscal_year_code);
  const name =
    normalizeText(item.name || item.title || item.fiscal_year_name || item.year_name) ||
    code ||
    (id ? `#${id}` : "");

  return {
    id,
    code,
    name,
    start_date:
      normalizeText(item.start_date || item.date_from || item.from_date || item.starts_at) || null,
    end_date:
      normalizeText(item.end_date || item.date_to || item.to_date || item.ends_at) || null,
    status,
    is_current: toBoolean(item.is_current ?? item.current ?? item.isCurrent, false),
    is_closed: status === "closed" || status === "locked",
    is_locked: status === "locked",
    periods_count: toNumber(
      item.periods_count ??
        item.accounting_periods_count ??
        item.fiscal_periods_count ??
        item.period_count,
    ),
    journals_count: toNumber(
      item.journals_count ??
        item.journal_entries_count ??
        item.entries_count ??
        item.transactions_count,
    ),
    transactions_count: toNumber(item.transactions_count ?? item.movements_count),
    total_debit: toNumber(item.total_debit ?? item.debit ?? item.debit_amount),
    total_credit: toNumber(item.total_credit ?? item.credit ?? item.credit_amount),
    notes: normalizeText(item.notes || item.description || item.internal_notes),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function statusLabel(status: FiscalYearStatus, locale: Locale) {
  const t = translations[locale];

  if (status === "open") return t.open;
  if (status === "closed") return t.closed;
  if (status === "locked") return t.locked;
  if (status === "draft") return t.draft;
  if (status === "archived") return t.archived;

  return t.unknown;
}

function getStatusClass(status: FiscalYearStatus) {
  if (status === "open") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (status === "locked") {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  if (status === "closed") {
    return "border-slate-500/30 bg-slate-50 text-slate-700 hover:bg-slate-50";
  }

  if (status === "draft") {
    return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
  }

  if (status === "archived") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
}

function StatusBadge({ status, locale }: { status: FiscalYearStatus; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", getStatusClass(status))}
    >
      {statusLabel(status, locale)}
    </Badge>
  );
}

function CurrentBadge({ isCurrent, locale }: { isCurrent: boolean; locale: Locale }) {
  const t = translations[locale];

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        isCurrent
          ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
          : "border-slate-500/30 bg-slate-50 text-slate-700 hover:bg-slate-50",
      )}
    >
      {isCurrent ? t.yes : t.no}
    </Badge>
  );
}

function MoneyValue({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center justify-start gap-1 text-sm font-semibold tabular-nums">
      <span>{formatMoney(value)}</span>
      <img src="/currency/sar.svg" alt={label} className="h-3.5 w-3.5" />
    </div>
  );
}

function KpiCard({
  title,
  value,
  trend,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  trend: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardHeader className="relative min-h-[112px] px-6 py-5">
        <CardDescription className="text-sm font-medium text-muted-foreground">
          {title}
        </CardDescription>

        <CardTitle className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
          {value}
        </CardTitle>

        <CardAction>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardAction>

        <div className="pt-1">
          <Badge
            variant="outline"
            className="rounded-full border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            {trend}
          </Badge>
        </div>
      </CardHeader>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-lg border bg-card shadow-none">
            <CardHeader className="min-h-[112px] px-6 py-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-5 w-20" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="rounded-lg border bg-card shadow-none">
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AccountingFiscalYearsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [years, setYears] = React.useState<FiscalYearRecord[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [currentFilter, setCurrentFilter] = React.useState<CurrentFilter>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("newest");
  const [columns, setColumns] = React.useState<Record<ColumnKey, boolean>>(DEFAULT_COLUMNS);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

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

  const loadFiscalYears = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          page: "1",
          page_size: "500",
        });

        const endpoints = [
          "/api/accounting/fiscal-years/",
          "/api/accounting/fiscal_years/",
          "/api/accounting/years/",
          "/api/accounting/reports/fiscal-years/",
        ];

        let payload: ApiResponse | null = null;
        let lastError: unknown = null;

        for (const endpoint of endpoints) {
          try {
            payload = await fetchJson<ApiResponse>(
              makeApiUrl(endpoint, params),
              controller.signal,
            );
            break;
          } catch (caughtError) {
            lastError = caughtError;
          }
        }

        if (!payload) {
          throw lastError instanceof Error ? lastError : new Error(t.errorDesc);
        }

        const nextRows = extractArray(payload)
          .map(normalizeFiscalYear)
          .filter((year) => year.id || year.name || year.code);

        setYears(nextRows);

        if (silent) toast.success(t.refreshed);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadFiscalYears();
  }, [loadFiscalYears]);

  const summary = React.useMemo(() => {
    return {
      total: years.length,
      open: years.filter((year) => year.status === "open").length,
      closed: years.filter((year) => year.status === "closed" || year.status === "locked").length,
      journals: years.reduce((sum, year) => sum + year.journals_count, 0),
      debit: years.reduce((sum, year) => sum + year.total_debit, 0),
      credit: years.reduce((sum, year) => sum + year.total_credit, 0),
    };
  }, [years]);

  const filteredYears = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let result = years.filter((year) => {
      const matchesSearch =
        !query ||
        year.name.toLowerCase().includes(query) ||
        year.code.toLowerCase().includes(query) ||
        year.status.toLowerCase().includes(query) ||
        year.notes.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || year.status === statusFilter;

      const matchesCurrent =
        currentFilter === "all" ||
        (currentFilter === "current" && year.is_current) ||
        (currentFilter === "not_current" && !year.is_current);

      return matchesSearch && matchesStatus && matchesCurrent;
    });

    result = [...result].sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.start_date || a.created_at || "").localeCompare(
          String(b.start_date || b.created_at || ""),
        );
      }

      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "code") return a.code.localeCompare(b.code);
      if (sortKey === "status") return a.status.localeCompare(b.status);
      if (sortKey === "periods_high") return b.periods_count - a.periods_count;
      if (sortKey === "journals_high") return b.journals_count - a.journals_count;
      if (sortKey === "debit_high") return b.total_debit - a.total_debit;
      if (sortKey === "credit_high") return b.total_credit - a.total_credit;

      return String(b.start_date || b.created_at || "").localeCompare(
        String(a.start_date || a.created_at || ""),
      );
    });

    return result;
  }, [currentFilter, years, searchInput, sortKey, statusFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [currentFilter, pageSize, searchInput, sortKey, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredYears.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredYears.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    statusFilter !== "all" ||
    currentFilter !== "all" ||
    sortKey !== "newest";

  const visibleColumnCount = Object.values(columns).filter(Boolean).length;

  function resetFilters() {
    setSearchInput("");
    setStatusFilter("all");
    setCurrentFilter("all");
    setSortKey("newest");
    setPage(1);
  }

  function columnLabel(key: ColumnKey) {
    if (key === "year") return t.year;
    if (key === "code") return t.code;
    if (key === "startDate") return t.startDate;
    if (key === "endDate") return t.endDate;
    if (key === "status") return t.status;
    if (key === "current") return t.current;
    if (key === "periods") return t.periods;
    if (key === "journals") return t.journals;
    if (key === "debit") return t.debit;
    if (key === "credit") return t.credit;
    return t.actions;
  }

  function buildExportRows() {
    return filteredYears.map((year) => ({
      year: year.name || t.notAvailable,
      code: year.code || t.notAvailable,
      startDate: formatDate(year.start_date),
      endDate: formatDate(year.end_date),
      status: statusLabel(year.status, locale),
      current: year.is_current ? t.yes : t.no,
      periods: year.periods_count,
      journals: year.journals_count,
      debit: formatMoney(year.total_debit),
      credit: formatMoney(year.total_credit),
    }));
  }

  function exportExcel() {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.exportEmpty);
      return;
    }

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; direction: ${dir}; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #d9d9d9; padding: 8px; text-align: ${locale === "ar" ? "right" : "left"}; }
            th { background: #f3f4f6; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.printTitle)}</h1>
          <p>${escapeHtml(t.totalYears)}: ${escapeHtml(summary.total)}</p>
          <p>${escapeHtml(t.openYears)}: ${escapeHtml(summary.open)}</p>
          <p>${escapeHtml(t.closedYears)}: ${escapeHtml(summary.closed)}</p>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.year)}</th>
                <th>${escapeHtml(t.code)}</th>
                <th>${escapeHtml(t.startDate)}</th>
                <th>${escapeHtml(t.endDate)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.current)}</th>
                <th>${escapeHtml(t.periods)}</th>
                <th>${escapeHtml(t.journals)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.year)}</td>
                      <td>${escapeHtml(row.code)}</td>
                      <td>${escapeHtml(row.startDate)}</td>
                      <td>${escapeHtml(row.endDate)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.current)}</td>
                      <td>${escapeHtml(row.periods)}</td>
                      <td>${escapeHtml(row.journals)}</td>
                      <td>${escapeHtml(row.debit)}</td>
                      <td>${escapeHtml(row.credit)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `primey-care-fiscal-years-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function printPage() {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.printEmpty);
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error(t.printEmpty);
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="${locale}" dir="${dir}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.printTitle)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 28px;
              font-family: Arial, sans-serif;
              color: #111827;
              background: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              border-bottom: 2px solid #111827;
              padding-bottom: 16px;
              margin-bottom: 18px;
            }
            h1 { margin: 0; font-size: 22px; }
            p { margin: 4px 0 0; color: #6b7280; font-size: 12px; }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 10px;
              margin-bottom: 18px;
            }
            .box {
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 10px;
            }
            .box span {
              display: block;
              color: #6b7280;
              font-size: 11px;
              margin-bottom: 4px;
            }
            .box strong { font-size: 16px; }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              margin-bottom: 18px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 8px;
              text-align: ${locale === "ar" ? "right" : "left"};
              vertical-align: top;
            }
            th {
              background: #f9fafb;
              color: #374151;
              font-weight: 700;
            }
            @media print { body { padding: 16px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Primey Care - ${escapeHtml(t.printTitle)}</h1>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
            <div>
              <p>${escapeHtml(t.showing)}: ${escapeHtml(rows.length)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.totalYears)}</span><strong>${escapeHtml(summary.total)}</strong></div>
            <div class="box"><span>${escapeHtml(t.openYears)}</span><strong>${escapeHtml(summary.open)}</strong></div>
            <div class="box"><span>${escapeHtml(t.closedYears)}</span><strong>${escapeHtml(summary.closed)}</strong></div>
            <div class="box"><span>${escapeHtml(t.journalEntries)}</span><strong>${escapeHtml(summary.journals)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.year)}</th>
                <th>${escapeHtml(t.code)}</th>
                <th>${escapeHtml(t.startDate)}</th>
                <th>${escapeHtml(t.endDate)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.current)}</th>
                <th>${escapeHtml(t.periods)}</th>
                <th>${escapeHtml(t.journals)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.year)}</td>
                      <td>${escapeHtml(row.code)}</td>
                      <td>${escapeHtml(row.startDate)}</td>
                      <td>${escapeHtml(row.endDate)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.current)}</td>
                      <td>${escapeHtml(row.periods)}</td>
                      <td>${escapeHtml(row.journals)}</td>
                      <td>${escapeHtml(row.debit)}</td>
                      <td>${escapeHtml(row.credit)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  if (loading) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 text-right">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/accounting">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadFiscalYears({ silent: true })}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t.refresh}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            {t.export}
          </Button>

          <Button variant="outline" className="h-9 rounded-lg" onClick={printPage}>
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>

          <Button asChild className="h-9 rounded-lg bg-black text-white hover:bg-black/90">
            <Link href="/system/accounting/fiscal-years/create">
              <Plus className="h-4 w-4" />
              {t.create}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalYears}
          value={formatInteger(summary.total)}
          trend={t.year}
          icon={CalendarClock}
        />

        <KpiCard
          title={t.openYears}
          value={formatInteger(summary.open)}
          trend={t.open}
          icon={UnlockKeyhole}
        />

        <KpiCard
          title={t.closedYears}
          value={formatInteger(summary.closed)}
          trend={t.closed}
          icon={LockKeyhole}
        />

        <KpiCard
          title={t.journalEntries}
          value={formatInteger(summary.journals)}
          trend={`${t.debit}: ${formatMoney(summary.debit)}`}
          icon={FolderOpen}
        />
      </div>

      {error ? (
        <Card className="rounded-lg border border-red-200 bg-red-50 shadow-none">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3 text-right">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">{t.errorTitle}</p>
                <p className="text-sm text-red-700">{error || t.errorDesc}</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="h-9 rounded-lg bg-white"
              onClick={() => void loadFiscalYears()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
        <CardContent className="space-y-3 p-4">
          <div className="relative w-full">
            <Search
              className={cn(
                "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                locale === "ar" ? "right-3" : "left-3",
              )}
            />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t.searchPlaceholder}
              className={cn(
                "h-10 rounded-lg bg-background",
                locale === "ar" ? "pr-9" : "pl-9",
              )}
            />
          </div>

          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[165px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t.statusFilter}: {t.all}
                  </SelectItem>
                  <SelectItem value="open">{t.open}</SelectItem>
                  <SelectItem value="closed">{t.closed}</SelectItem>
                  <SelectItem value="locked">{t.locked}</SelectItem>
                  <SelectItem value="draft">{t.draft}</SelectItem>
                  <SelectItem value="archived">{t.archived}</SelectItem>
                  <SelectItem value="unknown">{t.unknown}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={currentFilter}
                onValueChange={(value) => setCurrentFilter(value as CurrentFilter)}
              >
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[175px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t.currentFilter}: {t.all}
                  </SelectItem>
                  <SelectItem value="current">{t.currentOnly}</SelectItem>
                  <SelectItem value="not_current">{t.notCurrentOnly}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[165px]">
                  <ArrowUpDown className="h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t.newest}</SelectItem>
                  <SelectItem value="oldest">{t.oldest}</SelectItem>
                  <SelectItem value="name">{t.nameSort}</SelectItem>
                  <SelectItem value="code">{t.codeSort}</SelectItem>
                  <SelectItem value="status">{t.statusSort}</SelectItem>
                  <SelectItem value="periods_high">{t.periodsHigh}</SelectItem>
                  <SelectItem value="journals_high">{t.journalsHigh}</SelectItem>
                  <SelectItem value="debit_high">{t.debitHigh}</SelectItem>
                  <SelectItem value="credit_high">{t.creditHigh}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value="columns"
                onValueChange={(value) => {
                  if (value in columns) {
                    setColumns((current) => ({
                      ...current,
                      [value]: !current[value as ColumnKey],
                    }));
                  }
                }}
              >
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[150px]">
                  <Settings2 className="h-4 w-4" />
                  <SelectValue placeholder={t.columns} />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(columns) as ColumnKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {columns[key] ? "✓ " : ""}
                      {columnLabel(key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                onClick={resetFilters}
              >
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[1320px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    {columns.year ? (
                      <TableHead className="h-11 w-[220px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.year}
                      </TableHead>
                    ) : null}

                    {columns.code ? (
                      <TableHead className="h-11 w-[120px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.code}
                      </TableHead>
                    ) : null}

                    {columns.startDate ? (
                      <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.startDate}
                      </TableHead>
                    ) : null}

                    {columns.endDate ? (
                      <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.endDate}
                      </TableHead>
                    ) : null}

                    {columns.status ? (
                      <TableHead className="h-11 w-[115px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.status}
                      </TableHead>
                    ) : null}

                    {columns.current ? (
                      <TableHead className="h-11 w-[105px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.current}
                      </TableHead>
                    ) : null}

                    {columns.periods ? (
                      <TableHead className="h-11 w-[95px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.periods}
                      </TableHead>
                    ) : null}

                    {columns.journals ? (
                      <TableHead className="h-11 w-[95px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.journals}
                      </TableHead>
                    ) : null}

                    {columns.debit ? (
                      <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.debit}
                      </TableHead>
                    ) : null}

                    {columns.credit ? (
                      <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.credit}
                      </TableHead>
                    ) : null}

                    {columns.actions ? (
                      <TableHead className="h-11 w-[90px] whitespace-nowrap px-4 text-center text-xs font-semibold text-muted-foreground">
                        {t.actions}
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pageRows.length ? (
                    pageRows.map((year) => (
                      <TableRow key={year.id || year.code || year.name} className="h-[62px]">
                        {columns.year ? (
                          <TableCell className="h-[62px] w-[220px] overflow-hidden px-4 text-right align-middle">
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">
                                {year.name || t.notAvailable}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground tabular-nums">
                                {year.id || t.notAvailable}
                              </span>
                            </div>
                          </TableCell>
                        ) : null}

                        {columns.code ? (
                          <TableCell className="h-[62px] w-[120px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm font-medium text-foreground tabular-nums">
                              {year.code || t.notAvailable}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.startDate ? (
                          <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                            <span className="text-sm text-muted-foreground tabular-nums">
                              {formatDate(year.start_date)}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.endDate ? (
                          <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                            <span className="text-sm text-muted-foreground tabular-nums">
                              {formatDate(year.end_date)}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.status ? (
                          <TableCell className="h-[62px] w-[115px] overflow-hidden px-4 text-right align-middle">
                            <StatusBadge status={year.status} locale={locale} />
                          </TableCell>
                        ) : null}

                        {columns.current ? (
                          <TableCell className="h-[62px] w-[105px] overflow-hidden px-4 text-right align-middle">
                            <CurrentBadge isCurrent={year.is_current} locale={locale} />
                          </TableCell>
                        ) : null}

                        {columns.periods ? (
                          <TableCell className="h-[62px] w-[95px] overflow-hidden px-4 text-right align-middle">
                            <span className="text-sm font-medium tabular-nums">
                              {formatInteger(year.periods_count)}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.journals ? (
                          <TableCell className="h-[62px] w-[95px] overflow-hidden px-4 text-right align-middle">
                            <span className="text-sm font-medium tabular-nums">
                              {formatInteger(year.journals_count)}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.debit ? (
                          <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={year.total_debit} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.credit ? (
                          <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={year.total_credit} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.actions ? (
                          <TableCell className="h-[62px] w-[90px] overflow-hidden px-4 text-center align-middle">
                            {year.id ? (
                              <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
                                <Link
                                  href={`/system/accounting/fiscal-years/${encodeURIComponent(year.id)}`}
                                  title={t.openDetails}
                                >
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={Math.max(1, visibleColumnCount)} className="h-72">
                        <div className="flex flex-col items-center justify-center gap-3 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
                            <Search className="h-6 w-6 text-muted-foreground" />
                          </div>

                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">
                              {hasActiveFilters ? t.noResultsTitle : t.noDataTitle}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {hasActiveFilters ? t.noResultsDesc : t.noDataDesc}
                            </p>
                          </div>

                          {hasActiveFilters ? (
                            <Button
                              variant="outline"
                              className="h-9 rounded-lg"
                              onClick={resetFilters}
                            >
                              <RotateCcw className="h-4 w-4" />
                              {t.reset}
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

          <div className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>
              {t.showing}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(pageRows.length)}
              </span>{" "}
              {t.of}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(filteredYears.length)}
              </span>{" "}
              {t.rows}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="h-9 w-[140px] rounded-lg bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {t.rowsPerPage}: {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                disabled={currentPage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                {t.previous}
              </Button>

              <div className="flex h-9 items-center rounded-lg border bg-background px-3 text-sm font-medium text-foreground">
                {t.page}{" "}
                <span className="mx-1 tabular-nums">{formatInteger(currentPage)}</span>{" "}
                {t.of} <span className="mx-1 tabular-nums">{formatInteger(totalPages)}</span>
              </div>

              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                {t.next}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}