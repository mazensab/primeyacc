"use client";

/* ============================================================
   📂 app/system/accounting/journals/page.tsx
   🧾 Primey Care — Accounting Journal Entries
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API only: /api/accounting/journals/
   ✅ Fixed 400 by removing unsupported ordering query
   ✅ Removed wrong fallback: /api/accounting/journal-entries/
   ✅ Header / KPI cards / search / filters / columns / table
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error / Empty states
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  TriangleAlert,
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
  ok?: boolean;
  success?: boolean;
  count?: number;
  total?: number;
  total_count?: number;
  results?: unknown[];
  items?: unknown[];
  data?: unknown;
  summary?: unknown;
  meta?: unknown;
};

type JournalRecord = {
  id: string;
  entry_number: string;
  entry_date: string | null;
  period_id: string;
  period_name: string;
  status: string;
  status_label: string;
  posting_source: string;
  posting_source_label: string;
  source_number: string;
  reference: string;
  description: string;
  notes: string;
  total_debit: number;
  total_credit: number;
  difference: number;
  is_balanced: boolean;
  lines_count: number;
  created_by_name: string;
  created_at: string | null;
  updated_at: string | null;
};

type JournalSummary = {
  total: number;
  posted: number;
  draft: number;
  cancelled: number;
  reversed: number;
  unbalanced: number;
  total_debit: number;
  total_credit: number;
};

type StatusFilter = "all" | "draft" | "posted" | "cancelled" | "reversed";
type BalanceFilter = "all" | "balanced" | "unbalanced";
type SortKey =
  | "newest"
  | "oldest"
  | "amount_high"
  | "amount_low"
  | "entry_number"
  | "source";

type ColumnKey =
  | "entry"
  | "date"
  | "period"
  | "status"
  | "source"
  | "reference"
  | "description"
  | "debit"
  | "credit"
  | "balance"
  | "lines"
  | "actions";

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  entry: true,
  date: true,
  period: true,
  status: true,
  source: true,
  reference: true,
  description: true,
  debit: true,
  credit: true,
  balance: true,
  lines: true,
  actions: true,
};

const translations = {
  ar: {
    title: "قيود اليومية",
    subtitle:
      "إدارة واستعراض القيود المحاسبية مع حالة الترحيل والتوازن ومصادر العمليات.",
    back: "المحاسبة",
    create: "قيد جديد",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    from: "من",
    to: "إلى",
    all: "الكل",
    searchPlaceholder: "ابحث برقم القيد أو المصدر أو المرجع أو الوصف...",
    status: "الحالة",
    source: "المصدر",
    balanceStatus: "التوازن",
    sort: "الترتيب",
    columns: "الأعمدة",
    open: "فتح",

    totalEntries: "إجمالي القيود",
    postedEntries: "القيود المرحلة",
    draftEntries: "المسودات",
    unbalancedEntries: "غير المتوازنة",

    entry: "رقم القيد",
    date: "تاريخ القيد",
    period: "الفترة",
    reference: "المرجع",
    description: "الوصف",
    debit: "مدين",
    credit: "دائن",
    balance: "التوازن",
    lines: "السطور",
    actions: "الإجراءات",

    draft: "مسودة",
    posted: "مرحل",
    cancelled: "ملغي",
    reversed: "معكوس",
    balanced: "متوازن",
    unbalanced: "غير متوازن",

    newest: "الأحدث",
    oldest: "الأقدم",
    amountHigh: "الأعلى مبلغًا",
    amountLow: "الأقل مبلغًا",
    entryNumberSort: "رقم القيد",
    sourceSort: "المصدر",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    noDataTitle: "لا توجد قيود يومية",
    noDataDesc: "ستظهر القيود اليومية هنا بعد إنشائها أو ترحيلها من النظام.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل قيود اليومية",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث قيود اليومية.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير قيود اليومية",
    generatedAt: "تاريخ الطباعة",
    sar: "ر.س",
    unknown: "غير محدد",
  },
  en: {
    title: "Journal Entries",
    subtitle:
      "Manage and review accounting journal entries with posting, balance, and source status.",
    back: "Accounting",
    create: "New journal",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    from: "From",
    to: "To",
    all: "All",
    searchPlaceholder: "Search by entry number, source, reference, or description...",
    status: "Status",
    source: "Source",
    balanceStatus: "Balance",
    sort: "Sort",
    columns: "Columns",
    open: "Open",

    totalEntries: "Total entries",
    postedEntries: "Posted entries",
    draftEntries: "Draft entries",
    unbalancedEntries: "Unbalanced entries",

    entry: "Entry number",
    date: "Entry date",
    period: "Period",
    reference: "Reference",
    description: "Description",
    debit: "Debit",
    credit: "Credit",
    balance: "Balance",
    lines: "Lines",
    actions: "Actions",

    draft: "Draft",
    posted: "Posted",
    cancelled: "Cancelled",
    reversed: "Reversed",
    balanced: "Balanced",
    unbalanced: "Unbalanced",

    newest: "Newest",
    oldest: "Oldest",
    amountHigh: "Highest amount",
    amountLow: "Lowest amount",
    entryNumberSort: "Entry number",
    sourceSort: "Source",

    showing: "Showing",
    of: "of",
    rows: "rows",
    noDataTitle: "No journal entries",
    noDataDesc: "Journal entries will appear here after they are created or posted.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load journal entries",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Journal entries refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Journal entries report",
    generatedAt: "Generated at",
    sar: "SAR",
    unknown: "Unknown",
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

    if (["1", "true", "yes", "on", "balanced", "posted"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off", "draft", "unbalanced"].includes(normalized)) {
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

function formatMoney(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 10);
  }

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

  const data = asRecord(payload.data);

  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.entries)) return data.entries;
  if (Array.isArray(data.journals)) return data.journals;
  if (Array.isArray(data.journal_entries)) return data.journal_entries;

  return [];
}

function normalizeJournal(value: unknown): JournalRecord {
  const item = asRecord(value);
  const period = asRecord(item.period);
  const createdBy = asRecord(item.created_by || item.user || item.owner);

  const id = normalizeText(item.id || item.pk || item.uuid);
  const totalDebit = toNumber(item.total_debit ?? item.debit_total ?? item.debit);
  const totalCredit = toNumber(item.total_credit ?? item.credit_total ?? item.credit);
  const difference = Math.abs(totalDebit - totalCredit);

  return {
    id,
    entry_number: normalizeText(
      item.entry_number || item.number || item.journal_number || item.code || `#${id}`,
    ),
    entry_date: normalizeText(item.entry_date || item.date || item.posting_date) || null,
    period_id: normalizeText(item.period_id || period.id),
    period_name: normalizeText(item.period_name || period.name || period.title),
    status: normalizeText(item.status || item.entry_status || "draft"),
    status_label: normalizeText(item.status_label || item.status),
    posting_source: normalizeText(item.posting_source || item.source || item.source_type),
    posting_source_label: normalizeText(
      item.posting_source_label || item.source_label || item.posting_source || item.source,
    ),
    source_number: normalizeText(
      item.source_number || item.reference_number || item.external_reference,
    ),
    reference: normalizeText(item.reference || item.ref || item.reference_number),
    description: normalizeText(item.description || item.notes || item.memo),
    notes: normalizeText(item.notes),
    total_debit: totalDebit,
    total_credit: totalCredit,
    difference: toNumber(item.difference, difference),
    is_balanced: toBoolean(item.is_balanced, difference < 0.01),
    lines_count: toNumber(item.lines_count || item.items_count || item.details_count),
    created_by_name: normalizeText(
      item.created_by_name ||
        item.user_name ||
        createdBy.name ||
        createdBy.full_name ||
        createdBy.username,
    ),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function extractSummary(payload: ApiResponse, rows: JournalRecord[]): JournalSummary {
  const data = asRecord(payload.data);
  const summary = asRecord(payload.summary || data.summary || data.totals);

  return {
    total: toNumber(
      summary.total_entries ??
        summary.total_count ??
        summary.total ??
        payload.count ??
        payload.total ??
        payload.total_count,
      rows.length,
    ),
    posted: toNumber(
      summary.posted_entries ?? summary.posted_count ?? summary.posted,
      rows.filter((row) => row.status.toLowerCase() === "posted").length,
    ),
    draft: toNumber(
      summary.draft_entries ?? summary.draft_count ?? summary.draft,
      rows.filter((row) => row.status.toLowerCase() === "draft").length,
    ),
    cancelled: toNumber(
      summary.cancelled_entries ?? summary.cancelled_count ?? summary.cancelled,
      rows.filter((row) => ["cancelled", "canceled"].includes(row.status.toLowerCase())).length,
    ),
    reversed: toNumber(
      summary.reversed_entries ?? summary.reversed_count ?? summary.reversed,
      rows.filter((row) => row.status.toLowerCase() === "reversed").length,
    ),
    unbalanced: toNumber(
      summary.unbalanced_entries ?? summary.unbalanced_count ?? summary.unbalanced,
      rows.filter((row) => !row.is_balanced).length,
    ),
    total_debit: toNumber(
      summary.total_debit,
      rows.reduce((sum, row) => sum + row.total_debit, 0),
    ),
    total_credit: toNumber(
      summary.total_credit,
      rows.reduce((sum, row) => sum + row.total_credit, 0),
    ),
  };
}

function statusLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const status = value.toLowerCase();

  if (status === "posted") return t.posted;
  if (status === "cancelled" || status === "canceled") return t.cancelled;
  if (status === "reversed") return t.reversed;

  return t.draft;
}

function getBadgeClass(value: string) {
  const normalized = value.toLowerCase();

  if (["posted", "balanced", "system", "manual"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (["cancelled", "canceled", "unbalanced"].includes(normalized)) {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (["reversed"].includes(normalized)) {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
}

function StatusBadge({ value, label }: { value: string; label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", getBadgeClass(value))}
    >
      {label || value || "—"}
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

function JournalsSkeleton() {
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

export default function AccountingJournalsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [journals, setJournals] = React.useState<JournalRecord[]>([]);
  const [summary, setSummary] = React.useState<JournalSummary>({
    total: 0,
    posted: 0,
    draft: 0,
    cancelled: 0,
    reversed: 0,
    unbalanced: 0,
    total_debit: 0,
    total_credit: 0,
  });

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const [balanceFilter, setBalanceFilter] = React.useState<BalanceFilter>("all");
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

  const loadJournals = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          page: "1",
          page_size: "200",
        });

        const payload = await fetchJson<ApiResponse>(
          makeApiUrl("/api/accounting/journals/", params),
          controller.signal,
        );

        const rows = extractArray(payload).map(normalizeJournal);

        setJournals(rows);
        setSummary(extractSummary(payload, rows));

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
    void loadJournals();
  }, [loadJournals]);

  const sourceOptions = React.useMemo(() => {
    return Array.from(
      new Set(
        journals
          .map((journal) => journal.posting_source_label || journal.posting_source)
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [journals]);

  const filteredRows = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let rows = journals.filter((journal) => {
      const matchesSearch =
        !query ||
        journal.entry_number.toLowerCase().includes(query) ||
        journal.posting_source_label.toLowerCase().includes(query) ||
        journal.posting_source.toLowerCase().includes(query) ||
        journal.source_number.toLowerCase().includes(query) ||
        journal.reference.toLowerCase().includes(query) ||
        journal.description.toLowerCase().includes(query) ||
        journal.period_name.toLowerCase().includes(query);

      const date = formatDate(journal.entry_date || journal.created_at);
      const matchesFrom = !dateFrom || (date !== "—" && date >= dateFrom);
      const matchesTo = !dateTo || (date !== "—" && date <= dateTo);

      const status = journal.status.toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        status === statusFilter ||
        (statusFilter === "cancelled" && status === "canceled");

      const sourceLabel = journal.posting_source_label || journal.posting_source;
      const matchesSource = sourceFilter === "all" || sourceLabel === sourceFilter;

      const matchesBalance =
        balanceFilter === "all" ||
        (balanceFilter === "balanced" && journal.is_balanced) ||
        (balanceFilter === "unbalanced" && !journal.is_balanced);

      return matchesSearch && matchesFrom && matchesTo && matchesStatus && matchesSource && matchesBalance;
    });

    rows = [...rows].sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.entry_date || a.created_at || "").localeCompare(
          String(b.entry_date || b.created_at || ""),
        );
      }

      if (sortKey === "amount_high") return b.total_debit - a.total_debit;
      if (sortKey === "amount_low") return a.total_debit - b.total_debit;
      if (sortKey === "entry_number") return a.entry_number.localeCompare(b.entry_number);
      if (sortKey === "source") return a.posting_source_label.localeCompare(b.posting_source_label);

      return String(b.entry_date || b.created_at || "").localeCompare(
        String(a.entry_date || a.created_at || ""),
      );
    });

    return rows;
  }, [
    balanceFilter,
    dateFrom,
    dateTo,
    journals,
    searchInput,
    sortKey,
    sourceFilter,
    statusFilter,
  ]);

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    statusFilter !== "all" ||
    sourceFilter !== "all" ||
    balanceFilter !== "all" ||
    sortKey !== "newest";

  const visibleColumnCount = Object.values(columns).filter(Boolean).length;

  function resetFilters() {
    setSearchInput("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    setSourceFilter("all");
    setBalanceFilter("all");
    setSortKey("newest");
  }

  function columnLabel(key: ColumnKey) {
    if (key === "entry") return t.entry;
    if (key === "date") return t.date;
    if (key === "period") return t.period;
    if (key === "status") return t.status;
    if (key === "source") return t.source;
    if (key === "reference") return t.reference;
    if (key === "description") return t.description;
    if (key === "debit") return t.debit;
    if (key === "credit") return t.credit;
    if (key === "balance") return t.balance;
    if (key === "lines") return t.lines;
    return t.actions;
  }

  function buildExportRows() {
    return filteredRows.map((journal) => ({
      entry: journal.entry_number,
      date: formatDate(journal.entry_date || journal.created_at),
      period: journal.period_name,
      status: journal.status_label || statusLabel(journal.status, locale),
      source: journal.posting_source_label || journal.posting_source,
      reference: journal.reference || journal.source_number,
      description: journal.description,
      debit: formatMoney(journal.total_debit),
      credit: formatMoney(journal.total_credit),
      balance: journal.is_balanced ? t.balanced : t.unbalanced,
      lines: journal.lines_count,
      createdAt: formatDateTime(journal.created_at),
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
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.entry)}</th>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.period)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.source)}</th>
                <th>${escapeHtml(t.reference)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
                <th>${escapeHtml(t.balance)}</th>
                <th>${escapeHtml(t.lines)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.entry)}</td>
                      <td>${escapeHtml(row.date)}</td>
                      <td>${escapeHtml(row.period)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.source)}</td>
                      <td>${escapeHtml(row.reference)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.debit)}</td>
                      <td>${escapeHtml(row.credit)}</td>
                      <td>${escapeHtml(row.balance)}</td>
                      <td>${escapeHtml(row.lines)}</td>
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
    link.download = `primey-care-journal-entries-${new Date().toISOString().slice(0, 10)}.xls`;
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
            <div class="box"><span>${escapeHtml(t.totalEntries)}</span><strong>${escapeHtml(summary.total)}</strong></div>
            <div class="box"><span>${escapeHtml(t.postedEntries)}</span><strong>${escapeHtml(summary.posted)}</strong></div>
            <div class="box"><span>${escapeHtml(t.debit)}</span><strong>${escapeHtml(formatMoney(summary.total_debit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.credit)}</span><strong>${escapeHtml(formatMoney(summary.total_credit))}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.entry)}</th>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.period)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.source)}</th>
                <th>${escapeHtml(t.reference)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
                <th>${escapeHtml(t.balance)}</th>
                <th>${escapeHtml(t.lines)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.entry)}</td>
                      <td>${escapeHtml(row.date)}</td>
                      <td>${escapeHtml(row.period)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.source)}</td>
                      <td>${escapeHtml(row.reference)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.debit)}</td>
                      <td>${escapeHtml(row.credit)}</td>
                      <td>${escapeHtml(row.balance)}</td>
                      <td>${escapeHtml(row.lines)}</td>
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
        <JournalsSkeleton />
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

          <Button asChild className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90">
            <Link href="/system/accounting/journals/create">
              <Plus className="h-4 w-4" />
              {t.create}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadJournals({ silent: true })}
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
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalEntries}
          value={formatInteger(summary.total)}
          trend={`${formatMoney(summary.total_debit)} ${t.sar}`}
          icon={ReceiptText}
        />

        <KpiCard
          title={t.postedEntries}
          value={formatInteger(summary.posted)}
          trend={t.posted}
          icon={CheckCircle2}
        />

        <KpiCard
          title={t.draftEntries}
          value={formatInteger(summary.draft)}
          trend={t.draft}
          icon={FileText}
        />

        <KpiCard
          title={t.unbalancedEntries}
          value={formatInteger(summary.unbalanced)}
          trend={t.unbalanced}
          icon={XCircle}
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
              onClick={() => void loadJournals()}
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
              <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t.from}</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-7 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                />
              </div>

              <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3">
                <span className="text-xs text-muted-foreground">{t.to}</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-7 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.status}: {t.all}</SelectItem>
                  <SelectItem value="draft">{t.draft}</SelectItem>
                  <SelectItem value="posted">{t.posted}</SelectItem>
                  <SelectItem value="cancelled">{t.cancelled}</SelectItem>
                  <SelectItem value="reversed">{t.reversed}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.source}: {t.all}</SelectItem>
                  {sourceOptions.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={balanceFilter}
                onValueChange={(value) => setBalanceFilter(value as BalanceFilter)}
              >
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[165px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.balanceStatus}: {t.all}</SelectItem>
                  <SelectItem value="balanced">{t.balanced}</SelectItem>
                  <SelectItem value="unbalanced">{t.unbalanced}</SelectItem>
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
                  <SelectItem value="amount_high">{t.amountHigh}</SelectItem>
                  <SelectItem value="amount_low">{t.amountLow}</SelectItem>
                  <SelectItem value="entry_number">{t.entryNumberSort}</SelectItem>
                  <SelectItem value="source">{t.sourceSort}</SelectItem>
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

              <Button variant="outline" className="h-9 rounded-lg bg-background" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[1280px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    {columns.entry ? (
                      <TableHead className="h-11 w-[150px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.entry}
                      </TableHead>
                    ) : null}

                    {columns.date ? (
                      <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.date}
                      </TableHead>
                    ) : null}

                    {columns.period ? (
                      <TableHead className="h-11 w-[150px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.period}
                      </TableHead>
                    ) : null}

                    {columns.status ? (
                      <TableHead className="h-11 w-[115px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.status}
                      </TableHead>
                    ) : null}

                    {columns.source ? (
                      <TableHead className="h-11 w-[155px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.source}
                      </TableHead>
                    ) : null}

                    {columns.reference ? (
                      <TableHead className="h-11 w-[155px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.reference}
                      </TableHead>
                    ) : null}

                    {columns.description ? (
                      <TableHead className="h-11 w-[240px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.description}
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

                    {columns.balance ? (
                      <TableHead className="h-11 w-[120px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.balance}
                      </TableHead>
                    ) : null}

                    {columns.lines ? (
                      <TableHead className="h-11 w-[95px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.lines}
                      </TableHead>
                    ) : null}

                    {columns.actions ? (
                      <TableHead className="h-11 w-[85px] whitespace-nowrap px-4 text-center text-xs font-semibold text-muted-foreground">
                        {t.actions}
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredRows.length ? (
                    filteredRows.map((journal) => (
                      <TableRow key={journal.id || journal.entry_number} className="h-[62px]">
                        {columns.entry ? (
                          <TableCell className="h-[62px] w-[150px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {journal.entry_number}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.date ? (
                          <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm tabular-nums text-muted-foreground">
                              {formatDate(journal.entry_date || journal.created_at)}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.period ? (
                          <TableCell className="h-[62px] w-[150px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm text-muted-foreground">
                              {journal.period_name || "—"}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.status ? (
                          <TableCell className="h-[62px] w-[115px] overflow-hidden px-4 text-right align-middle">
                            <StatusBadge
                              value={journal.status}
                              label={journal.status_label || statusLabel(journal.status, locale)}
                            />
                          </TableCell>
                        ) : null}

                        {columns.source ? (
                          <TableCell className="h-[62px] w-[155px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm text-muted-foreground">
                              {journal.posting_source_label || journal.posting_source || "—"}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.reference ? (
                          <TableCell className="h-[62px] w-[155px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm text-muted-foreground">
                              {journal.reference || journal.source_number || "—"}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.description ? (
                          <TableCell className="h-[62px] w-[240px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm text-muted-foreground">
                              {journal.description || "—"}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.debit ? (
                          <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={journal.total_debit} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.credit ? (
                          <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={journal.total_credit} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.balance ? (
                          <TableCell className="h-[62px] w-[120px] overflow-hidden px-4 text-right align-middle">
                            <StatusBadge
                              value={journal.is_balanced ? "balanced" : "unbalanced"}
                              label={journal.is_balanced ? t.balanced : t.unbalanced}
                            />
                          </TableCell>
                        ) : null}

                        {columns.lines ? (
                          <TableCell className="h-[62px] w-[95px] overflow-hidden px-4 text-right align-middle">
                            <span className="text-sm font-medium tabular-nums">
                              {formatInteger(journal.lines_count)}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.actions ? (
                          <TableCell className="h-[62px] w-[85px] overflow-hidden px-4 text-center align-middle">
                            <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
                              <Link href={`/system/accounting/journals/${journal.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
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
                            <Button variant="outline" className="h-9 rounded-lg" onClick={resetFilters}>
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
              {formatInteger(journals.length)}
            </span>{" "}
            {t.rows}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}