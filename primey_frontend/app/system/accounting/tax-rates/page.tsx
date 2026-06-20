"use client";

/* ============================================================
   📂 app/system/accounting/tax-rates/page.tsx
   🧾 Primey Care — Tax Rates
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API:
      GET /api/accounting/tax-rates/?page=1&page_size=500
      fallback:
      GET /api/accounting/taxes/?page=1&page_size=500
      GET /api/accounting/vat-rates/?page=1&page_size=500
   ✅ Create + details links
   ✅ Search / status / type / sort / columns
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
  BadgePercent,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  Loader2,
  Percent,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  TriangleAlert,
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

type TaxStatus = "active" | "inactive" | "draft" | "archived" | "unknown";
type TaxType = "vat" | "withholding" | "sales" | "service" | "other";

type StatusFilter = "all" | TaxStatus;
type TypeFilter = "all" | TaxType;

type SortKey =
  | "newest"
  | "oldest"
  | "name"
  | "code"
  | "rate_high"
  | "rate_low"
  | "status";

type ColumnKey =
  | "name"
  | "code"
  | "type"
  | "rate"
  | "status"
  | "effectiveFrom"
  | "effectiveTo"
  | "description"
  | "actions";

type TaxRateRecord = {
  id: string;
  code: string;
  name: string;
  type: TaxType;
  type_label: string;
  rate: number;
  percentage: number;
  status: TaxStatus;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
  description: string;
  created_at: string | null;
  updated_at: string | null;
};

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  name: true,
  code: true,
  type: true,
  rate: true,
  status: true,
  effectiveFrom: true,
  effectiveTo: true,
  description: true,
  actions: true,
};

const translations = {
  ar: {
    title: "معدلات الضريبة",
    subtitle:
      "إدارة واستعراض معدلات الضرائب المستخدمة في الفواتير والعمليات المحاسبية.",
    back: "المحاسبة",
    create: "إنشاء معدل ضريبة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    openDetails: "فتح التفاصيل",

    totalRates: "إجمالي المعدلات",
    activeRates: "المعدلات النشطة",
    vatRates: "ضريبة القيمة المضافة",
    highestRate: "أعلى نسبة",

    searchPlaceholder: "ابحث باسم الضريبة أو الكود أو النوع...",
    statusFilter: "الحالة",
    typeFilter: "النوع",
    sort: "الترتيب",
    columns: "الأعمدة",

    all: "الكل",
    name: "الاسم",
    code: "الكود",
    type: "النوع",
    rate: "النسبة",
    status: "الحالة",
    effectiveFrom: "تاريخ البداية",
    effectiveTo: "تاريخ النهاية",
    description: "الوصف",
    actions: "الإجراءات",

    active: "نشط",
    inactive: "غير نشط",
    draft: "مسودة",
    archived: "مؤرشف",
    unknown: "غير محدد",

    vat: "ضريبة القيمة المضافة",
    withholding: "ضريبة استقطاع",
    sales: "ضريبة مبيعات",
    service: "ضريبة خدمات",
    other: "أخرى",

    newest: "الأحدث",
    oldest: "الأقدم",
    nameSort: "الاسم",
    codeSort: "الكود",
    rateHigh: "الأعلى نسبة",
    rateLow: "الأقل نسبة",
    statusSort: "الحالة",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    noDataTitle: "لا توجد معدلات ضريبة",
    noDataDesc: "ستظهر معدلات الضريبة هنا بعد إضافتها من الباكند.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل معدلات الضريبة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث معدلات الضريبة.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير معدلات الضريبة",
    generatedAt: "تاريخ الطباعة",
    notAvailable: "—",
  },
  en: {
    title: "Tax Rates",
    subtitle:
      "Manage and review tax rates used in invoices and accounting operations.",
    back: "Accounting",
    create: "Create tax rate",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    openDetails: "Open details",

    totalRates: "Total rates",
    activeRates: "Active rates",
    vatRates: "VAT rates",
    highestRate: "Highest rate",

    searchPlaceholder: "Search by tax name, code, or type...",
    statusFilter: "Status",
    typeFilter: "Type",
    sort: "Sort",
    columns: "Columns",

    all: "All",
    name: "Name",
    code: "Code",
    type: "Type",
    rate: "Rate",
    status: "Status",
    effectiveFrom: "Effective from",
    effectiveTo: "Effective to",
    description: "Description",
    actions: "Actions",

    active: "Active",
    inactive: "Inactive",
    draft: "Draft",
    archived: "Archived",
    unknown: "Unknown",

    vat: "VAT",
    withholding: "Withholding tax",
    sales: "Sales tax",
    service: "Service tax",
    other: "Other",

    newest: "Newest",
    oldest: "Oldest",
    nameSort: "Name",
    codeSort: "Code",
    rateHigh: "Highest rate",
    rateLow: "Lowest rate",
    statusSort: "Status",

    showing: "Showing",
    of: "of",
    rows: "rows",
    noDataTitle: "No tax rates",
    noDataDesc: "Tax rates will appear here after they are added from the backend.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load tax rates",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Tax rates refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Tax rates report",
    generatedAt: "Generated at",
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
    const parsed = Number(value.replace(/,/g, "").replace("%", ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["1", "true", "yes", "on", "active", "enabled"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off", "inactive", "disabled", "archived"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatPercent(value: unknown) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value))}%`;
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
  if (Array.isArray(data.tax_rates)) return data.tax_rates;
  if (Array.isArray(data.taxes)) return data.taxes;
  if (Array.isArray(data.vat_rates)) return data.vat_rates;

  return [];
}

function normalizeTaxType(value: unknown): TaxType {
  const type = normalizeText(value).toLowerCase();

  if (["vat", "value_added_tax", "value-added-tax", "tax_vat"].includes(type)) {
    return "vat";
  }

  if (["withholding", "withholding_tax", "wht"].includes(type)) {
    return "withholding";
  }

  if (["sales", "sales_tax"].includes(type)) {
    return "sales";
  }

  if (["service", "service_tax"].includes(type)) {
    return "service";
  }

  return "other";
}

function normalizeStatus(value: unknown, isActive: boolean): TaxStatus {
  const status = normalizeText(value).toLowerCase();

  if (["active", "enabled", "open"].includes(status)) return "active";
  if (["inactive", "disabled"].includes(status)) return "inactive";
  if (["draft", "pending", "new"].includes(status)) return "draft";
  if (["archived", "archive"].includes(status)) return "archived";

  return isActive ? "active" : "inactive";
}

function normalizeTaxRate(value: unknown): TaxRateRecord {
  const item = asRecord(value);
  const id = normalizeText(item.id || item.pk || item.uuid);

  const isActive = toBoolean(item.is_active ?? item.active ?? item.enabled, true);
  const type = normalizeTaxType(item.type || item.tax_type || item.category);
  const rateValue = toNumber(
    item.rate ??
      item.percentage ??
      item.tax_rate ??
      item.tax_percentage ??
      item.value,
  );

  return {
    id,
    code: normalizeText(item.code || item.tax_code || item.slug),
    name:
      normalizeText(item.name || item.title || item.label || item.name_ar || item.name_en) ||
      (id ? `#${id}` : ""),
    type,
    type_label: normalizeText(item.type_label || item.tax_type_label || item.category_label),
    rate: rateValue,
    percentage: rateValue,
    status: normalizeStatus(item.status || item.tax_status, isActive),
    is_active: isActive,
    effective_from:
      normalizeText(
        item.effective_from ||
          item.valid_from ||
          item.start_date ||
          item.starts_at,
      ) || null,
    effective_to:
      normalizeText(
        item.effective_to ||
          item.valid_until ||
          item.end_date ||
          item.ends_at,
      ) || null,
    description: normalizeText(item.description || item.notes || item.internal_notes),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function typeLabel(type: TaxType, locale: Locale) {
  const t = translations[locale];

  if (type === "vat") return t.vat;
  if (type === "withholding") return t.withholding;
  if (type === "sales") return t.sales;
  if (type === "service") return t.service;

  return t.other;
}

function statusLabel(status: TaxStatus, locale: Locale) {
  const t = translations[locale];

  if (status === "active") return t.active;
  if (status === "inactive") return t.inactive;
  if (status === "draft") return t.draft;
  if (status === "archived") return t.archived;

  return t.unknown;
}

function getStatusClass(status: TaxStatus) {
  if (status === "active") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (status === "inactive") {
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

function getTypeClass(type: TaxType) {
  if (type === "vat") {
    return "border-violet-500/30 bg-violet-50 text-violet-700 hover:bg-violet-50";
  }

  if (type === "withholding") {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  if (type === "sales") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (type === "service") {
    return "border-cyan-500/30 bg-cyan-50 text-cyan-700 hover:bg-cyan-50";
  }

  return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
}

function StatusBadge({ status, locale }: { status: TaxStatus; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", getStatusClass(status))}
    >
      {statusLabel(status, locale)}
    </Badge>
  );
}

function TypeBadge({ type, locale }: { type: TaxType; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", getTypeClass(type))}
    >
      {typeLabel(type, locale)}
    </Badge>
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

export default function AccountingTaxRatesPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [rows, setRows] = React.useState<TaxRateRecord[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("newest");
  const [columns, setColumns] = React.useState<Record<ColumnKey, boolean>>(DEFAULT_COLUMNS);

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

  const loadTaxRates = React.useCallback(
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
          "/api/accounting/tax-rates/",
          "/api/accounting/taxes/",
          "/api/accounting/vat-rates/",
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
          .map(normalizeTaxRate)
          .filter((rate) => rate.id || rate.name || rate.code);

        setRows(nextRows);

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
    void loadTaxRates();
  }, [loadTaxRates]);

  const summary = React.useMemo(() => {
    const activeRows = rows.filter((row) => row.status === "active" || row.is_active);
    const vatRows = rows.filter((row) => row.type === "vat");
    const highestRate = rows.reduce((max, row) => Math.max(max, row.rate), 0);

    return {
      total: rows.length,
      active: activeRows.length,
      vat: vatRows.length,
      highestRate,
    };
  }, [rows]);

  const filteredRows = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let result = rows.filter((row) => {
      const matchesSearch =
        !query ||
        row.name.toLowerCase().includes(query) ||
        row.code.toLowerCase().includes(query) ||
        row.type.toLowerCase().includes(query) ||
        row.type_label.toLowerCase().includes(query) ||
        row.description.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const matchesType = typeFilter === "all" || row.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });

    result = [...result].sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.created_at || "").localeCompare(String(b.created_at || ""));
      }

      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "code") return a.code.localeCompare(b.code);
      if (sortKey === "rate_high") return b.rate - a.rate;
      if (sortKey === "rate_low") return a.rate - b.rate;
      if (sortKey === "status") return a.status.localeCompare(b.status);

      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });

    return result;
  }, [rows, searchInput, sortKey, statusFilter, typeFilter]);

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    sortKey !== "newest";

  const visibleColumnCount = Object.values(columns).filter(Boolean).length;

  function resetFilters() {
    setSearchInput("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSortKey("newest");
  }

  function columnLabel(key: ColumnKey) {
    if (key === "name") return t.name;
    if (key === "code") return t.code;
    if (key === "type") return t.type;
    if (key === "rate") return t.rate;
    if (key === "status") return t.status;
    if (key === "effectiveFrom") return t.effectiveFrom;
    if (key === "effectiveTo") return t.effectiveTo;
    if (key === "description") return t.description;
    return t.actions;
  }

  function buildExportRows() {
    return filteredRows.map((row) => ({
      name: row.name || t.notAvailable,
      code: row.code || t.notAvailable,
      type: typeLabel(row.type, locale),
      rate: formatPercent(row.rate),
      status: statusLabel(row.status, locale),
      effectiveFrom: formatDate(row.effective_from),
      effectiveTo: formatDate(row.effective_to),
      description: row.description || t.notAvailable,
    }));
  }

  function exportExcel() {
    const exportRows = buildExportRows();

    if (!exportRows.length) {
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
          <p>${escapeHtml(t.totalRates)}: ${escapeHtml(summary.total)}</p>
          <p>${escapeHtml(t.activeRates)}: ${escapeHtml(summary.active)}</p>
          <p>${escapeHtml(t.vatRates)}: ${escapeHtml(summary.vat)}</p>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.name)}</th>
                <th>${escapeHtml(t.code)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.rate)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.effectiveFrom)}</th>
                <th>${escapeHtml(t.effectiveTo)}</th>
                <th>${escapeHtml(t.description)}</th>
              </tr>
            </thead>
            <tbody>
              ${exportRows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.name)}</td>
                      <td>${escapeHtml(row.code)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.rate)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.effectiveFrom)}</td>
                      <td>${escapeHtml(row.effectiveTo)}</td>
                      <td>${escapeHtml(row.description)}</td>
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
    link.download = `primey-care-tax-rates-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function printPage() {
    const exportRows = buildExportRows();

    if (!exportRows.length) {
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
              <p>${escapeHtml(t.showing)}: ${escapeHtml(exportRows.length)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.totalRates)}</span><strong>${escapeHtml(summary.total)}</strong></div>
            <div class="box"><span>${escapeHtml(t.activeRates)}</span><strong>${escapeHtml(summary.active)}</strong></div>
            <div class="box"><span>${escapeHtml(t.vatRates)}</span><strong>${escapeHtml(summary.vat)}</strong></div>
            <div class="box"><span>${escapeHtml(t.highestRate)}</span><strong>${escapeHtml(formatPercent(summary.highestRate))}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.name)}</th>
                <th>${escapeHtml(t.code)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.rate)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.effectiveFrom)}</th>
                <th>${escapeHtml(t.effectiveTo)}</th>
                <th>${escapeHtml(t.description)}</th>
              </tr>
            </thead>
            <tbody>
              ${exportRows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.name)}</td>
                      <td>${escapeHtml(row.code)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.rate)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.effectiveFrom)}</td>
                      <td>${escapeHtml(row.effectiveTo)}</td>
                      <td>${escapeHtml(row.description)}</td>
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
            onClick={() => void loadTaxRates({ silent: true })}
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
            <Link href="/system/accounting/tax-rates/create">
              <Plus className="h-4 w-4" />
              {t.create}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalRates}
          value={formatInteger(summary.total)}
          trend={t.rows}
          icon={BadgePercent}
        />

        <KpiCard
          title={t.activeRates}
          value={formatInteger(summary.active)}
          trend={t.active}
          icon={CheckCircle2}
        />

        <KpiCard
          title={t.vatRates}
          value={formatInteger(summary.vat)}
          trend={t.vat}
          icon={ShieldCheck}
        />

        <KpiCard
          title={t.highestRate}
          value={formatPercent(summary.highestRate)}
          trend={t.rate}
          icon={Percent}
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
              onClick={() => void loadTaxRates()}
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
                  <SelectItem value="active">{t.active}</SelectItem>
                  <SelectItem value="inactive">{t.inactive}</SelectItem>
                  <SelectItem value="draft">{t.draft}</SelectItem>
                  <SelectItem value="archived">{t.archived}</SelectItem>
                  <SelectItem value="unknown">{t.unknown}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as TypeFilter)}
              >
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t.typeFilter}: {t.all}
                  </SelectItem>
                  <SelectItem value="vat">{t.vat}</SelectItem>
                  <SelectItem value="withholding">{t.withholding}</SelectItem>
                  <SelectItem value="sales">{t.sales}</SelectItem>
                  <SelectItem value="service">{t.service}</SelectItem>
                  <SelectItem value="other">{t.other}</SelectItem>
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
                  <SelectItem value="rate_high">{t.rateHigh}</SelectItem>
                  <SelectItem value="rate_low">{t.rateLow}</SelectItem>
                  <SelectItem value="status">{t.statusSort}</SelectItem>
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
              <Table className="min-w-[1190px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    {columns.name ? (
                      <TableHead className="h-11 w-[235px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.name}
                      </TableHead>
                    ) : null}

                    {columns.code ? (
                      <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.code}
                      </TableHead>
                    ) : null}

                    {columns.type ? (
                      <TableHead className="h-11 w-[160px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.type}
                      </TableHead>
                    ) : null}

                    {columns.rate ? (
                      <TableHead className="h-11 w-[105px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.rate}
                      </TableHead>
                    ) : null}

                    {columns.status ? (
                      <TableHead className="h-11 w-[120px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.status}
                      </TableHead>
                    ) : null}

                    {columns.effectiveFrom ? (
                      <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.effectiveFrom}
                      </TableHead>
                    ) : null}

                    {columns.effectiveTo ? (
                      <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.effectiveTo}
                      </TableHead>
                    ) : null}

                    {columns.description ? (
                      <TableHead className="h-11 w-[230px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.description}
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
                  {filteredRows.length ? (
                    filteredRows.map((row) => (
                      <TableRow key={row.id || row.code || row.name} className="h-[62px]">
                        {columns.name ? (
                          <TableCell className="h-[62px] w-[235px] overflow-hidden px-4 text-right align-middle">
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">
                                {row.name || t.notAvailable}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground tabular-nums">
                                {row.id || t.notAvailable}
                              </span>
                            </div>
                          </TableCell>
                        ) : null}

                        {columns.code ? (
                          <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm font-medium tabular-nums text-foreground">
                              {row.code || t.notAvailable}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.type ? (
                          <TableCell className="h-[62px] w-[160px] overflow-hidden px-4 text-right align-middle">
                            <TypeBadge type={row.type} locale={locale} />
                          </TableCell>
                        ) : null}

                        {columns.rate ? (
                          <TableCell className="h-[62px] w-[105px] overflow-hidden px-4 text-right align-middle">
                            <span className="text-sm font-semibold tabular-nums text-foreground">
                              {formatPercent(row.rate)}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.status ? (
                          <TableCell className="h-[62px] w-[120px] overflow-hidden px-4 text-right align-middle">
                            <StatusBadge status={row.status} locale={locale} />
                          </TableCell>
                        ) : null}

                        {columns.effectiveFrom ? (
                          <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                            <span className="text-sm text-muted-foreground tabular-nums">
                              {formatDate(row.effective_from)}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.effectiveTo ? (
                          <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                            <span className="text-sm text-muted-foreground tabular-nums">
                              {formatDate(row.effective_to)}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.description ? (
                          <TableCell className="h-[62px] w-[230px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm text-muted-foreground">
                              {row.description || t.notAvailable}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.actions ? (
                          <TableCell className="h-[62px] w-[90px] overflow-hidden px-4 text-center align-middle">
                            {row.id ? (
                              <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
                                <Link
                                  href={`/system/accounting/tax-rates/${encodeURIComponent(row.id)}`}
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

          <div className="text-sm text-muted-foreground">
            {t.showing}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatInteger(filteredRows.length)}
            </span>{" "}
            {t.of}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatInteger(rows.length)}
            </span>{" "}
            {t.rows}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}