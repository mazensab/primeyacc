"use client";

/* ============================================================
   📂 app/system/accounting/periods/[id]/page.tsx
   🧾 Primey Care — Accounting Period Details
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders detail pattern
   ✅ Real API:
      GET /api/accounting/periods/{id}/
      fallback:
      GET /api/accounting/fiscal-periods/{id}/
      GET /api/accounting/reports/periods/{id}/
      GET /api/accounting/journals/?page=1&page_size=500
   ✅ Profile side card + main detail content
   ✅ Related journals table
   ✅ Search / status / sort / columns / local pagination
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error / Not Found / Empty states
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  Copy,
  Eye,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  LockKeyhole,
  NotebookText,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
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
  item?: unknown;
  period?: unknown;
  fiscal_period?: unknown;
  summary?: unknown;
};

type PeriodStatus = "open" | "closed" | "locked" | "draft" | "unknown";
type JournalStatus = "posted" | "draft" | "balanced" | "unbalanced" | "cancelled" | "unknown";
type JournalStatusFilter = "all" | JournalStatus;
type SortKey = "newest" | "oldest" | "number" | "status" | "debit_high" | "credit_high";

type ColumnKey =
  | "entry"
  | "date"
  | "description"
  | "source"
  | "status"
  | "debit"
  | "credit"
  | "actions";

type PeriodRecord = {
  id: string;
  code: string;
  name: string;
  fiscal_year_id: string;
  fiscal_year_name: string;
  start_date: string | null;
  end_date: string | null;
  status: PeriodStatus;
  is_closed: boolean;
  is_locked: boolean;
  journals_count: number;
  transactions_count: number;
  total_debit: number;
  total_credit: number;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
};

type JournalRecord = {
  id: string;
  entry_number: string;
  entry_date: string | null;
  description: string;
  source: string;
  source_label: string;
  period_id: string;
  period_name: string;
  status: JournalStatus;
  is_posted: boolean;
  is_balanced: boolean;
  total_debit: number;
  total_credit: number;
  created_at: string | null;
};

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  entry: true,
  date: true,
  description: true,
  source: true,
  status: true,
  debit: true,
  credit: true,
  actions: true,
};

const translations = {
  ar: {
    title: "تفاصيل الفترة المحاسبية",
    subtitle: "عرض بيانات الفترة المحاسبية والقيود المرتبطة بها.",
    back: "الفترات المحاسبية",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    openDetails: "فتح التفاصيل",
    copy: "نسخ",
    copied: "تم النسخ.",
    reset: "إعادة ضبط",

    periodInfo: "بيانات الفترة",
    periodInfoDesc: "ملخص الفترة والسنة المالية وحالة الإقفال.",
    journalsTitle: "قيود الفترة",
    journalsDesc: "أحدث القيود المحاسبية المرتبطة بهذه الفترة.",
    timelineTitle: "معلومات تشغيلية",
    timelineDesc: "تواريخ الإنشاء والتحديث وملاحظات الفترة.",

    totalJournals: "عدد القيود",
    totalDebit: "إجمالي المدين",
    totalCredit: "إجمالي الدائن",
    difference: "فرق التوازن",

    period: "الفترة",
    periodCode: "كود الفترة",
    fiscalYear: "السنة المالية",
    startDate: "تاريخ البداية",
    endDate: "تاريخ النهاية",
    status: "الحالة",
    notes: "الملاحظات",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",

    open: "مفتوحة",
    closed: "مغلقة",
    locked: "مقفلة",
    draft: "مسودة",
    unknown: "غير محددة",

    posted: "مرحل",
    balanced: "متوازن",
    unbalanced: "غير متوازن",
    cancelled: "ملغي",

    searchPlaceholder: "ابحث برقم القيد أو الوصف أو المصدر...",
    statusFilter: "حالة القيد",
    sort: "الترتيب",
    columns: "الأعمدة",
    rowsPerPage: "عدد الصفوف",

    entry: "القيد",
    date: "التاريخ",
    description: "الوصف",
    source: "المصدر",
    debit: "مدين",
    credit: "دائن",
    actions: "الإجراءات",

    newest: "الأحدث",
    oldest: "الأقدم",
    numberSort: "رقم القيد",
    statusSort: "الحالة",
    debitHigh: "الأعلى مدين",
    creditHigh: "الأعلى دائن",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    page: "صفحة",
    previous: "السابق",
    next: "التالي",
    noDataTitle: "لا توجد قيود مرتبطة",
    noDataDesc: "ستظهر القيود المرتبطة بهذه الفترة هنا عند توفرها.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل تفاصيل الفترة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    notFoundTitle: "الفترة غير موجودة",
    notFoundDesc: "لم يتم العثور على الفترة المطلوبة أو ربما تم حذفها.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث تفاصيل الفترة.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير تفاصيل الفترة المحاسبية",
    generatedAt: "تاريخ الطباعة",
    sar: "ر.س",
    notAvailable: "—",
  },
  en: {
    title: "Accounting Period Details",
    subtitle: "View accounting period details and related journal entries.",
    back: "Accounting periods",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    openDetails: "Open details",
    copy: "Copy",
    copied: "Copied.",
    reset: "Reset",

    periodInfo: "Period information",
    periodInfoDesc: "Period, fiscal year, and closing status summary.",
    journalsTitle: "Period journals",
    journalsDesc: "Latest journal entries linked to this period.",
    timelineTitle: "Operational information",
    timelineDesc: "Creation, update dates, and period notes.",

    totalJournals: "Journals count",
    totalDebit: "Total debit",
    totalCredit: "Total credit",
    difference: "Difference",

    period: "Period",
    periodCode: "Period code",
    fiscalYear: "Fiscal year",
    startDate: "Start date",
    endDate: "End date",
    status: "Status",
    notes: "Notes",
    createdAt: "Created at",
    updatedAt: "Updated at",

    open: "Open",
    closed: "Closed",
    locked: "Locked",
    draft: "Draft",
    unknown: "Unknown",

    posted: "Posted",
    balanced: "Balanced",
    unbalanced: "Unbalanced",
    cancelled: "Cancelled",

    searchPlaceholder: "Search by journal number, description, or source...",
    statusFilter: "Journal status",
    sort: "Sort",
    columns: "Columns",
    rowsPerPage: "Rows per page",

    entry: "Entry",
    date: "Date",
    description: "Description",
    source: "Source",
    debit: "Debit",
    credit: "Credit",
    actions: "Actions",

    newest: "Newest",
    oldest: "Oldest",
    numberSort: "Entry number",
    statusSort: "Status",
    debitHigh: "Highest debit",
    creditHigh: "Highest credit",

    showing: "Showing",
    of: "of",
    rows: "rows",
    page: "Page",
    previous: "Previous",
    next: "Next",
    noDataTitle: "No related journals",
    noDataDesc: "Related journal entries will appear here once available.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load period details",
    errorDesc: "Make sure the backend is running, then try again.",
    notFoundTitle: "Period not found",
    notFoundDesc: "The requested period was not found or may have been deleted.",
    tryAgain: "Try again",
    refreshed: "Period details refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Accounting period details report",
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
      ["1", "true", "yes", "on", "active", "open", "opened", "locked", "closed", "posted", "balanced"].includes(
        normalized,
      )
    ) {
      return true;
    }

    if (["0", "false", "no", "off", "inactive", "draft", "unbalanced"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    toNumber(value),
  );
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
  if (Array.isArray(data.journals)) return data.journals;
  if (Array.isArray(data.entries)) return data.entries;
  if (Array.isArray(data.journal_entries)) return data.journal_entries;

  return [];
}

function extractObject(payload: ApiResponse) {
  const candidates = [
    payload.period,
    payload.fiscal_period,
    payload.item,
    payload.data,
    payload.summary,
  ];

  for (const candidate of candidates) {
    if (isRecord(candidate)) return candidate;
  }

  return {};
}

function normalizeStatus(value: unknown, isClosed: boolean, isLocked: boolean): PeriodStatus {
  const status = normalizeText(value).toLowerCase();

  if (isLocked || ["locked", "lock", "posted", "finalized"].includes(status)) return "locked";
  if (isClosed || ["closed", "close"].includes(status)) return "closed";
  if (["open", "opened", "active"].includes(status)) return "open";
  if (["draft", "new", "pending"].includes(status)) return "draft";

  return "unknown";
}

function normalizePeriod(value: unknown, fallbackId = ""): PeriodRecord {
  const item = asRecord(value);
  const fiscalYear = asRecord(
    item.fiscal_year || item.fiscalYear || item.year || item.fiscal_year_object,
  );

  const id = normalizeText(item.id || item.pk || item.uuid || fallbackId);
  const isClosed = toBoolean(item.is_closed ?? item.closed ?? item.isClosed, false);
  const isLocked = toBoolean(item.is_locked ?? item.locked ?? item.isLocked, false);
  const status = normalizeStatus(item.status || item.period_status, isClosed, isLocked);

  const name =
    normalizeText(item.name || item.title || item.period_name) ||
    normalizeText(item.code || item.period_code) ||
    (id ? `#${id}` : "");

  return {
    id,
    code: normalizeText(item.code || item.period_code || item.number),
    name,
    fiscal_year_id: normalizeText(item.fiscal_year_id || fiscalYear.id),
    fiscal_year_name: normalizeText(
      item.fiscal_year_name ||
        item.fiscal_year_label ||
        fiscalYear.name ||
        fiscalYear.title ||
        fiscalYear.code,
    ),
    start_date:
      normalizeText(item.start_date || item.date_from || item.from_date || item.starts_at) ||
      null,
    end_date:
      normalizeText(item.end_date || item.date_to || item.to_date || item.ends_at) || null,
    status,
    is_closed: status === "closed" || status === "locked",
    is_locked: status === "locked",
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

function normalizeJournalStatus(item: ApiRecord): JournalStatus {
  const status = normalizeText(item.status || item.entry_status).toLowerCase();
  const isPosted = toBoolean(item.is_posted ?? item.posted, false);
  const isBalanced = toBoolean(item.is_balanced ?? item.balanced, true);

  if (["cancelled", "canceled", "void"].includes(status)) return "cancelled";
  if (isPosted || status === "posted") return "posted";
  if (!isBalanced || status === "unbalanced") return "unbalanced";
  if (status === "balanced") return "balanced";
  if (["draft", "pending", "new"].includes(status)) return "draft";

  return "unknown";
}

function normalizeJournal(value: unknown): JournalRecord {
  const item = asRecord(value);
  const period = asRecord(item.period || item.accounting_period || item.fiscal_period);

  const totalDebit = toNumber(item.total_debit ?? item.debit ?? item.debit_amount);
  const totalCredit = toNumber(item.total_credit ?? item.credit ?? item.credit_amount);

  return {
    id: normalizeText(item.id || item.pk || item.uuid),
    entry_number: normalizeText(
      item.entry_number || item.number || item.journal_number || item.code,
    ),
    entry_date:
      normalizeText(item.entry_date || item.date || item.posting_date || item.created_at) ||
      null,
    description: normalizeText(item.description || item.notes || item.memo),
    source: normalizeText(item.source || item.posting_source || item.reference),
    source_label: normalizeText(
      item.source_label || item.posting_source_label || item.source || item.reference,
    ),
    period_id: normalizeText(
      item.period_id ||
        item.accounting_period_id ||
        item.fiscal_period_id ||
        period.id ||
        period.pk,
    ),
    period_name: normalizeText(
      item.period_name ||
        item.accounting_period_name ||
        item.fiscal_period_name ||
        period.name ||
        period.code,
    ),
    status: normalizeJournalStatus(item),
    is_posted: toBoolean(item.is_posted ?? item.posted, false),
    is_balanced: toBoolean(item.is_balanced ?? item.balanced, Math.abs(totalDebit - totalCredit) < 0.01),
    total_debit: totalDebit,
    total_credit: totalCredit,
    created_at: normalizeText(item.created_at) || null,
  };
}

function statusLabel(status: PeriodStatus, locale: Locale) {
  const t = translations[locale];

  if (status === "open") return t.open;
  if (status === "closed") return t.closed;
  if (status === "locked") return t.locked;
  if (status === "draft") return t.draft;

  return t.unknown;
}

function journalStatusLabel(status: JournalStatus, locale: Locale) {
  const t = translations[locale];

  if (status === "posted") return t.posted;
  if (status === "draft") return t.draft;
  if (status === "balanced") return t.balanced;
  if (status === "unbalanced") return t.unbalanced;
  if (status === "cancelled") return t.cancelled;

  return t.unknown;
}

function getPeriodStatusClass(status: PeriodStatus) {
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

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
}

function getJournalStatusClass(status: JournalStatus) {
  if (status === "posted" || status === "balanced") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (status === "unbalanced" || status === "cancelled") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (status === "draft") {
    return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
  }

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
}

function PeriodStatusBadge({ status, locale }: { status: PeriodStatus; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", getPeriodStatusClass(status))}
    >
      {statusLabel(status, locale)}
    </Badge>
  );
}

function JournalStatusBadge({ status, locale }: { status: JournalStatus; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", getJournalStatusClass(status))}
    >
      {journalStatusLabel(status, locale)}
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

function DetailLine({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border bg-background px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-left text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-20 w-full" />
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
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
      </div>
    </div>
  );
}

export default function AccountingPeriodDetailsPage() {
  const params = useParams<{ id?: string }>();
  const periodId = decodeURIComponent(String(params?.id || ""));

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [period, setPeriod] = React.useState<PeriodRecord | null>(null);
  const [journals, setJournals] = React.useState<JournalRecord[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notFound, setNotFound] = React.useState(false);

  const [searchInput, setSearchInput] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<JournalStatusFilter>("all");
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

  const loadPeriodDetails = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");
        setNotFound(false);

        const detailEndpoints = [
          `/api/accounting/periods/${periodId}/`,
          `/api/accounting/fiscal-periods/${periodId}/`,
          `/api/accounting/reports/periods/${periodId}/`,
        ];

        let periodPayload: ApiResponse | null = null;
        let lastError: unknown = null;

        for (const endpoint of detailEndpoints) {
          try {
            periodPayload = await fetchJson<ApiResponse>(
              makeApiUrl(endpoint),
              controller.signal,
            );
            break;
          } catch (caughtError) {
            lastError = caughtError;
          }
        }

        if (!periodPayload) {
          const message = lastError instanceof Error ? lastError.message : "";
          if (message.includes("404") || message.toLowerCase().includes("not found")) {
            setNotFound(true);
            setPeriod(null);
            setJournals([]);
            return;
          }

          throw lastError instanceof Error ? lastError : new Error(t.errorDesc);
        }

        const periodRecord = normalizePeriod(extractObject(periodPayload), periodId);
        setPeriod(periodRecord);

        const journalParams = new URLSearchParams({
          page: "1",
          page_size: "500",
        });

        const journalEndpoints = [
          `/api/accounting/journals/?${journalParams.toString()}`,
          `/api/accounting/journal-entries/?${journalParams.toString()}`,
        ];

        let loadedJournals: JournalRecord[] = [];

        for (const endpoint of journalEndpoints) {
          try {
            const payload = await fetchJson<ApiResponse>(
              makeApiUrl(endpoint.startsWith("/api") ? endpoint : endpoint),
              controller.signal,
            );

            loadedJournals = extractArray(payload).map(normalizeJournal);
            break;
          } catch {
            loadedJournals = [];
          }
        }

        const linkedJournals = loadedJournals.filter((journal) => {
          if (!periodRecord.id && !periodRecord.code && !periodRecord.name) return true;

          return (
            journal.period_id === periodRecord.id ||
            journal.period_id === periodId ||
            journal.period_name === periodRecord.name ||
            journal.period_name === periodRecord.code ||
            journal.period_name === periodRecord.fiscal_year_name
          );
        });

        setJournals(linkedJournals);

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
    [periodId, t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadPeriodDetails();
  }, [loadPeriodDetails]);

  const computedSummary = React.useMemo(() => {
    const journalsCount = journals.length || period?.journals_count || 0;
    const debit =
      journals.length > 0
        ? journals.reduce((sum, journal) => sum + journal.total_debit, 0)
        : period?.total_debit || 0;
    const credit =
      journals.length > 0
        ? journals.reduce((sum, journal) => sum + journal.total_credit, 0)
        : period?.total_credit || 0;

    return {
      journalsCount,
      debit,
      credit,
      difference: Math.abs(debit - credit),
    };
  }, [journals, period?.journals_count, period?.total_credit, period?.total_debit]);

  const filteredJournals = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let result = journals.filter((journal) => {
      const matchesSearch =
        !query ||
        journal.entry_number.toLowerCase().includes(query) ||
        journal.description.toLowerCase().includes(query) ||
        journal.source.toLowerCase().includes(query) ||
        journal.source_label.toLowerCase().includes(query) ||
        journal.status.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || journal.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    result = [...result].sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.entry_date || a.created_at || "").localeCompare(
          String(b.entry_date || b.created_at || ""),
        );
      }

      if (sortKey === "number") return a.entry_number.localeCompare(b.entry_number);
      if (sortKey === "status") return a.status.localeCompare(b.status);
      if (sortKey === "debit_high") return b.total_debit - a.total_debit;
      if (sortKey === "credit_high") return b.total_credit - a.total_credit;

      return String(b.entry_date || b.created_at || "").localeCompare(
        String(a.entry_date || a.created_at || ""),
      );
    });

    return result;
  }, [journals, searchInput, sortKey, statusFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [pageSize, searchInput, sortKey, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredJournals.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredJournals.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasActiveFilters =
    Boolean(searchInput.trim()) || statusFilter !== "all" || sortKey !== "newest";

  const visibleColumnCount = Object.values(columns).filter(Boolean).length;

  function resetFilters() {
    setSearchInput("");
    setStatusFilter("all");
    setSortKey("newest");
    setPage(1);
  }

  function columnLabel(key: ColumnKey) {
    if (key === "entry") return t.entry;
    if (key === "date") return t.date;
    if (key === "description") return t.description;
    if (key === "source") return t.source;
    if (key === "status") return t.status;
    if (key === "debit") return t.debit;
    if (key === "credit") return t.credit;
    return t.actions;
  }

  async function copyValue(value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(t.copied);
    } catch {
      toast.success(t.copied);
    }
  }

  function buildExportRows() {
    return filteredJournals.map((journal) => ({
      entry: journal.entry_number || journal.id || "—",
      date: formatDate(journal.entry_date),
      description: journal.description || "—",
      source: journal.source_label || journal.source || "—",
      status: journalStatusLabel(journal.status, locale),
      debit: formatMoney(journal.total_debit),
      credit: formatMoney(journal.total_credit),
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
          <p>${escapeHtml(t.period)}: ${escapeHtml(period?.name || "")}</p>
          <p>${escapeHtml(t.periodCode)}: ${escapeHtml(period?.code || period?.id || "")}</p>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.entry)}</th>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.source)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.entry)}</td>
                      <td>${escapeHtml(row.date)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.source)}</td>
                      <td>${escapeHtml(row.status)}</td>
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
    link.download = `primey-care-accounting-period-${periodId}-${new Date()
      .toISOString()
      .slice(0, 10)}.xls`;
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
              <p>${escapeHtml(t.period)}: ${escapeHtml(period?.name || "")}</p>
              <p>${escapeHtml(t.periodCode)}: ${escapeHtml(period?.code || period?.id || "")}</p>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
            <div>
              <p>${escapeHtml(t.showing)}: ${escapeHtml(rows.length)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.totalJournals)}</span><strong>${escapeHtml(computedSummary.journalsCount)}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalDebit)}</span><strong>${escapeHtml(formatMoney(computedSummary.debit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalCredit)}</span><strong>${escapeHtml(formatMoney(computedSummary.credit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.difference)}</span><strong>${escapeHtml(formatMoney(computedSummary.difference))}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.entry)}</th>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.source)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.entry)}</td>
                      <td>${escapeHtml(row.date)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.source)}</td>
                      <td>${escapeHtml(row.status)}</td>
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

  if (notFound) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted/40">
              <XCircle className="h-7 w-7 text-muted-foreground" />
            </div>

            <div className="space-y-1">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {t.notFoundTitle}
              </h1>
              <p className="text-sm text-muted-foreground">{t.notFoundDesc}</p>
            </div>

            <Button asChild variant="outline" className="h-9 rounded-lg">
              <Link href="/system/accounting/periods">
                <BackIcon className="h-4 w-4" />
                {t.back}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1 text-right">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {period?.name || t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/accounting/periods">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadPeriodDetails({ silent: true })}
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
              onClick={() => void loadPeriodDetails()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{t.periodInfo}</CardTitle>
                  <CardDescription>{t.periodInfoDesc}</CardDescription>
                </div>

                <CardAction>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                    <CalendarClock className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardAction>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 px-6 pb-6">
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">
                      {period?.name || t.notAvailable}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground tabular-nums">
                      {period?.code || period?.id || t.notAvailable}
                    </p>
                  </div>

                  <PeriodStatusBadge status={period?.status || "unknown"} locale={locale} />
                </div>
              </div>

              <DetailLine
                label={t.periodCode}
                value={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:underline"
                    onClick={() => void copyValue(period?.code || period?.id || "")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {period?.code || period?.id || t.notAvailable}
                  </button>
                }
              />

              <DetailLine
                label={t.fiscalYear}
                value={period?.fiscal_year_name || t.notAvailable}
              />

              <DetailLine
                label={t.startDate}
                value={
                  <span className="tabular-nums">
                    {formatDate(period?.start_date)}
                  </span>
                }
              />

              <DetailLine
                label={t.endDate}
                value={
                  <span className="tabular-nums">
                    {formatDate(period?.end_date)}
                  </span>
                }
              />

              <DetailLine
                label={t.status}
                value={<PeriodStatusBadge status={period?.status || "unknown"} locale={locale} />}
              />
            </CardContent>
          </Card>

          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.timelineTitle}</CardTitle>
              <CardDescription>{t.timelineDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 px-6 pb-6">
              <DetailLine
                label={t.createdAt}
                value={<span className="tabular-nums">{formatDateTime(period?.created_at)}</span>}
              />

              <DetailLine
                label={t.updatedAt}
                value={<span className="tabular-nums">{formatDateTime(period?.updated_at)}</span>}
              />

              <div className="rounded-lg border bg-background p-4">
                <p className="mb-2 text-sm font-medium text-foreground">{t.notes}</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  {period?.notes || t.notAvailable}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title={t.totalJournals}
              value={formatInteger(computedSummary.journalsCount)}
              trend={t.journalsTitle}
              icon={NotebookText}
            />

            <KpiCard
              title={t.totalDebit}
              value={<MoneyValue value={computedSummary.debit} label={t.sar} />}
              trend={t.debit}
              icon={FolderOpen}
            />

            <KpiCard
              title={t.totalCredit}
              value={<MoneyValue value={computedSummary.credit} label={t.sar} />}
              trend={t.credit}
              icon={ShieldCheck}
            />

            <KpiCard
              title={t.difference}
              value={<MoneyValue value={computedSummary.difference} label={t.sar} />}
              trend={computedSummary.difference < 0.01 ? t.balanced : t.unbalanced}
              icon={computedSummary.difference < 0.01 ? CheckCircle2 : XCircle}
            />
          </div>

          <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
            <CardHeader className="px-4 py-4">
              <CardTitle>{t.journalsTitle}</CardTitle>
              <CardDescription>{t.journalsDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 p-4 pt-0">
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
                    onValueChange={(value) => setStatusFilter(value as JournalStatusFilter)}
                  >
                    <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[170px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t.statusFilter}: {t.notAvailable === "—" ? "الكل" : "All"}
                      </SelectItem>
                      <SelectItem value="posted">{t.posted}</SelectItem>
                      <SelectItem value="draft">{t.draft}</SelectItem>
                      <SelectItem value="balanced">{t.balanced}</SelectItem>
                      <SelectItem value="unbalanced">{t.unbalanced}</SelectItem>
                      <SelectItem value="cancelled">{t.cancelled}</SelectItem>
                      <SelectItem value="unknown">{t.unknown}</SelectItem>
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
                      <SelectItem value="number">{t.numberSort}</SelectItem>
                      <SelectItem value="status">{t.statusSort}</SelectItem>
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
                  <Table className="min-w-[1060px] table-fixed">
                    <TableHeader>
                      <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                        {columns.entry ? (
                          <TableHead className="h-11 w-[165px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.entry}
                          </TableHead>
                        ) : null}

                        {columns.date ? (
                          <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.date}
                          </TableHead>
                        ) : null}

                        {columns.description ? (
                          <TableHead className="h-11 w-[260px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.description}
                          </TableHead>
                        ) : null}

                        {columns.source ? (
                          <TableHead className="h-11 w-[140px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.source}
                          </TableHead>
                        ) : null}

                        {columns.status ? (
                          <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.status}
                          </TableHead>
                        ) : null}

                        {columns.debit ? (
                          <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.debit}
                          </TableHead>
                        ) : null}

                        {columns.credit ? (
                          <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.credit}
                          </TableHead>
                        ) : null}

                        {columns.actions ? (
                          <TableHead className="h-11 w-[95px] whitespace-nowrap px-4 text-center text-xs font-semibold text-muted-foreground">
                            {t.actions}
                          </TableHead>
                        ) : null}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {pageRows.length ? (
                        pageRows.map((journal) => (
                          <TableRow key={journal.id || journal.entry_number} className="h-[62px]">
                            {columns.entry ? (
                              <TableCell className="h-[62px] w-[165px] overflow-hidden px-4 text-right align-middle">
                                <div className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-foreground">
                                    {journal.entry_number || journal.id || t.notAvailable}
                                  </span>
                                  <span className="block truncate text-xs text-muted-foreground tabular-nums">
                                    {journal.id || t.notAvailable}
                                  </span>
                                </div>
                              </TableCell>
                            ) : null}

                            {columns.date ? (
                              <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                                <span className="block truncate text-sm text-muted-foreground tabular-nums">
                                  {formatDate(journal.entry_date)}
                                </span>
                              </TableCell>
                            ) : null}

                            {columns.description ? (
                              <TableCell className="h-[62px] w-[260px] overflow-hidden px-4 text-right align-middle">
                                <span className="block truncate text-sm text-muted-foreground">
                                  {journal.description || t.notAvailable}
                                </span>
                              </TableCell>
                            ) : null}

                            {columns.source ? (
                              <TableCell className="h-[62px] w-[140px] overflow-hidden px-4 text-right align-middle">
                                <span className="block truncate text-sm text-muted-foreground">
                                  {journal.source_label || journal.source || t.notAvailable}
                                </span>
                              </TableCell>
                            ) : null}

                            {columns.status ? (
                              <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                                <JournalStatusBadge status={journal.status} locale={locale} />
                              </TableCell>
                            ) : null}

                            {columns.debit ? (
                              <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                                <MoneyValue value={journal.total_debit} label={t.sar} />
                              </TableCell>
                            ) : null}

                            {columns.credit ? (
                              <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                                <MoneyValue value={journal.total_credit} label={t.sar} />
                              </TableCell>
                            ) : null}

                            {columns.actions ? (
                              <TableCell className="h-[62px] w-[95px] overflow-hidden px-4 text-center align-middle">
                                {journal.id ? (
                                  <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
                                    <Link href={`/system/accounting/journals/${journal.id}`}>
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
                    {formatInteger(filteredJournals.length)}
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
                          {t.rows}: {size}
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
                    <span className="mx-1 tabular-nums">
                      {formatInteger(currentPage)}
                    </span>{" "}
                    {t.of}{" "}
                    <span className="mx-1 tabular-nums">{formatInteger(totalPages)}</span>
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
      </div>
    </div>
  );
}