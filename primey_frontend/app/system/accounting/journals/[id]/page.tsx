"use client";

/* ============================================================
   📂 app/system/accounting/journals/[id]/page.tsx
   🧾 Primey Care — Journal Entry Details
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API only: /api/accounting/journals/{id}/
   ✅ Header / profile card / KPI cards / journal lines table
   ✅ Search / movement filter / columns
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
  BookOpen,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  Landmark,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
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
  data?: unknown;
  item?: unknown;
  journal?: unknown;
  entry?: unknown;
  results?: unknown[];
  items?: unknown[];
  lines?: unknown[];
  message?: string;
  detail?: string;
  error?: string;
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

type JournalLineRecord = {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  cost_center_id: string;
  cost_center_code: string;
  cost_center_name: string;
  description: string;
  debit: number;
  credit: number;
  movement_type: "debit" | "credit" | "empty";
  reference: string;
};

type MovementFilter = "all" | "debit" | "credit" | "empty";

type ColumnKey =
  | "account"
  | "costCenter"
  | "description"
  | "reference"
  | "debit"
  | "credit"
  | "movement"
  | "actions";

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  account: true,
  costCenter: true,
  description: true,
  reference: true,
  debit: true,
  credit: true,
  movement: true,
  actions: true,
};

const translations = {
  ar: {
    title: "تفاصيل قيد اليومية",
    subtitle: "عرض بيانات القيد المحاسبي وسطور المدين والدائن وحالة التوازن.",
    back: "قيود اليومية",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    openAccount: "فتح الحساب",

    profile: "ملف القيد",
    profileDesc: "البيانات الأساسية للقيد وحالة الترحيل والتوازن.",
    linesTitle: "سطور القيد",
    linesDesc: "الحسابات، مراكز التكلفة، المدين والدائن لكل سطر.",

    entryNumber: "رقم القيد",
    entryDate: "تاريخ القيد",
    period: "الفترة",
    status: "الحالة",
    postingSource: "مصدر القيد",
    sourceNumber: "رقم المصدر",
    reference: "المرجع",
    description: "الوصف",
    notes: "ملاحظات",
    createdBy: "أنشئ بواسطة",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "آخر تحديث",

    totalDebit: "إجمالي المدين",
    totalCredit: "إجمالي الدائن",
    difference: "فرق التوازن",
    linesCount: "عدد السطور",

    account: "الحساب",
    costCenter: "مركز التكلفة",
    debit: "مدين",
    credit: "دائن",
    movement: "الحركة",
    actions: "الإجراءات",

    draft: "مسودة",
    posted: "مرحل",
    cancelled: "ملغي",
    reversed: "معكوس",
    balanced: "متوازن",
    unbalanced: "غير متوازن",
    empty: "فارغ",
    all: "الكل",
    columns: "الأعمدة",
    movementType: "نوع الحركة",
    searchPlaceholder: "ابحث بالحساب أو مركز التكلفة أو البيان أو المرجع...",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    noDataTitle: "لا توجد سطور",
    noDataDesc: "لا توجد سطور مرتبطة بهذا القيد.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    notFoundTitle: "القيد غير موجود",
    notFoundDesc: "تعذر العثور على قيد اليومية المطلوب.",
    errorTitle: "تعذر تحميل تفاصيل القيد",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث تفاصيل القيد.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير تفاصيل قيد اليومية",
    generatedAt: "تاريخ الطباعة",
    sar: "ر.س",
    unknown: "غير محدد",
  },
  en: {
    title: "Journal Entry Details",
    subtitle: "View journal entry data, debit and credit lines, and balance status.",
    back: "Journal entries",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    openAccount: "Open account",

    profile: "Journal profile",
    profileDesc: "Basic journal entry data, posting status, and balance status.",
    linesTitle: "Journal lines",
    linesDesc: "Accounts, cost centers, debit, and credit for each line.",

    entryNumber: "Entry number",
    entryDate: "Entry date",
    period: "Period",
    status: "Status",
    postingSource: "Posting source",
    sourceNumber: "Source number",
    reference: "Reference",
    description: "Description",
    notes: "Notes",
    createdBy: "Created by",
    createdAt: "Created at",
    updatedAt: "Updated at",

    totalDebit: "Total debit",
    totalCredit: "Total credit",
    difference: "Difference",
    linesCount: "Lines count",

    account: "Account",
    costCenter: "Cost center",
    debit: "Debit",
    credit: "Credit",
    movement: "Movement",
    actions: "Actions",

    draft: "Draft",
    posted: "Posted",
    cancelled: "Cancelled",
    reversed: "Reversed",
    balanced: "Balanced",
    unbalanced: "Unbalanced",
    empty: "Empty",
    all: "All",
    columns: "Columns",
    movementType: "Movement type",
    searchPlaceholder: "Search by account, cost center, description, or reference...",

    showing: "Showing",
    of: "of",
    rows: "rows",
    noDataTitle: "No lines",
    noDataDesc: "No lines are linked to this journal entry.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    notFoundTitle: "Journal entry not found",
    notFoundDesc: "The requested journal entry could not be found.",
    errorTitle: "Unable to load journal details",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Journal details refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Journal entry details report",
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

    if (["1", "true", "yes", "on", "balanced", "posted"].includes(normalized)) return true;
    if (["0", "false", "no", "off", "draft", "unbalanced"].includes(normalized)) return false;
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

function makeApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
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

function extractDetail(payload: ApiResponse) {
  const data = asRecord(payload.data);

  if (payload.journal) return payload.journal;
  if (payload.entry) return payload.entry;
  if (payload.item) return payload.item;
  if (data.journal) return data.journal;
  if (data.entry) return data.entry;
  if (data.item) return data.item;
  if (data.detail) return data.detail;

  return payload.data || payload;
}

function extractLines(payload: unknown) {
  const record = asRecord(payload);
  const data = asRecord(record.data);

  const possible =
    record.lines ||
    record.items ||
    record.details ||
    record.journal_lines ||
    record.entry_lines ||
    data.lines ||
    data.items ||
    data.details ||
    data.journal_lines ||
    data.entry_lines;

  return Array.isArray(possible) ? possible : [];
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

function normalizeLine(value: unknown): JournalLineRecord {
  const item = asRecord(value);
  const account = asRecord(item.account);
  const costCenter = asRecord(item.cost_center || item.costCenter);

  const id = normalizeText(item.id || item.pk || item.uuid);
  const debit = toNumber(item.debit ?? item.debit_amount ?? item.total_debit);
  const credit = toNumber(item.credit ?? item.credit_amount ?? item.total_credit);

  let movementType: JournalLineRecord["movement_type"] = "empty";
  if (debit > 0) movementType = "debit";
  if (credit > 0) movementType = "credit";

  return {
    id,
    account_id: normalizeText(item.account_id || account.id),
    account_code: normalizeText(item.account_code || account.code),
    account_name: normalizeText(
      item.account_name || account.name || account.name_ar || account.name_en,
    ),
    cost_center_id: normalizeText(item.cost_center_id || costCenter.id),
    cost_center_code: normalizeText(item.cost_center_code || costCenter.code),
    cost_center_name: normalizeText(
      item.cost_center_name || costCenter.name || costCenter.name_ar || costCenter.name_en,
    ),
    description: normalizeText(item.description || item.notes || item.memo),
    debit,
    credit,
    movement_type: movementType,
    reference: normalizeText(item.reference || item.ref || item.source_number),
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

function movementLabel(value: JournalLineRecord["movement_type"], locale: Locale) {
  const t = translations[locale];

  if (value === "debit") return t.debit;
  if (value === "credit") return t.credit;

  return t.empty;
}

function getBadgeClass(value: string) {
  const normalized = value.toLowerCase();

  if (["posted", "balanced", "debit"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (["cancelled", "canceled", "unbalanced"].includes(normalized)) {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (["reversed", "credit"].includes(normalized)) {
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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-left text-sm font-medium text-foreground">{value}</div>
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

function DetailsSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="space-y-3 p-6">
            {Array.from({ length: 10 }).map((_, index) => (
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

export default function AccountingJournalDetailsPage() {
  const params = useParams<{ id?: string }>();
  const journalId = Array.isArray(params?.id) ? params.id[0] : params?.id || "";

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [journal, setJournal] = React.useState<JournalRecord | null>(null);
  const [lines, setLines] = React.useState<JournalLineRecord[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notFound, setNotFound] = React.useState(false);

  const [searchInput, setSearchInput] = React.useState("");
  const [movementFilter, setMovementFilter] = React.useState<MovementFilter>("all");
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

  const loadDetails = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!journalId) return;

      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");
        setNotFound(false);

        const payload = await fetchJson<ApiResponse>(
          makeApiUrl(`/api/accounting/journals/${journalId}/`),
          controller.signal,
        );

        const detail = extractDetail(payload);
        const normalizedJournal = normalizeJournal(detail);

        if (!normalizedJournal.id && !normalizedJournal.entry_number) {
          setNotFound(true);
          setJournal(null);
          setLines([]);
          return;
        }

        const normalizedLines = extractLines(detail).map(normalizeLine);
        const totalDebit =
          normalizedLines.length > 0
            ? normalizedLines.reduce((sum, line) => sum + line.debit, 0)
            : normalizedJournal.total_debit;
        const totalCredit =
          normalizedLines.length > 0
            ? normalizedLines.reduce((sum, line) => sum + line.credit, 0)
            : normalizedJournal.total_credit;
        const difference = Math.abs(totalDebit - totalCredit);

        setJournal({
          ...normalizedJournal,
          total_debit: totalDebit,
          total_credit: totalCredit,
          difference,
          is_balanced: difference < 0.01,
          lines_count: normalizedLines.length || normalizedJournal.lines_count,
        });
        setLines(normalizedLines);

        if (silent) toast.success(t.refreshed);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        if (message.includes("404")) {
          setNotFound(true);
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [journalId, t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const filteredLines = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    return lines.filter((line) => {
      const matchesSearch =
        !query ||
        line.account_code.toLowerCase().includes(query) ||
        line.account_name.toLowerCase().includes(query) ||
        line.cost_center_code.toLowerCase().includes(query) ||
        line.cost_center_name.toLowerCase().includes(query) ||
        line.description.toLowerCase().includes(query) ||
        line.reference.toLowerCase().includes(query);

      const matchesMovement =
        movementFilter === "all" || line.movement_type === movementFilter;

      return matchesSearch && matchesMovement;
    });
  }, [lines, movementFilter, searchInput]);

  const hasActiveFilters = Boolean(searchInput.trim()) || movementFilter !== "all";
  const visibleColumnCount = Object.values(columns).filter(Boolean).length;

  function resetFilters() {
    setSearchInput("");
    setMovementFilter("all");
  }

  function columnLabel(key: ColumnKey) {
    if (key === "account") return t.account;
    if (key === "costCenter") return t.costCenter;
    if (key === "description") return t.description;
    if (key === "reference") return t.reference;
    if (key === "debit") return t.debit;
    if (key === "credit") return t.credit;
    if (key === "movement") return t.movement;
    return t.actions;
  }

  function buildExportRows() {
    return filteredLines.map((line) => ({
      account: `${line.account_code ? `${line.account_code} — ` : ""}${line.account_name || "—"}`,
      costCenter: `${line.cost_center_code ? `${line.cost_center_code} — ` : ""}${line.cost_center_name || "—"}`,
      description: line.description,
      reference: line.reference,
      debit: formatMoney(line.debit),
      credit: formatMoney(line.credit),
      movement: movementLabel(line.movement_type, locale),
    }));
  }

  function exportExcel() {
    if (!journal) return;

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
          <p>${escapeHtml(t.entryNumber)}: ${escapeHtml(journal.entry_number)}</p>
          <p>${escapeHtml(t.entryDate)}: ${escapeHtml(formatDate(journal.entry_date))}</p>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.account)}</th>
                <th>${escapeHtml(t.costCenter)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.reference)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
                <th>${escapeHtml(t.movement)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.account)}</td>
                      <td>${escapeHtml(row.costCenter)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.reference)}</td>
                      <td>${escapeHtml(row.debit)}</td>
                      <td>${escapeHtml(row.credit)}</td>
                      <td>${escapeHtml(row.movement)}</td>
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
    link.download = `primey-care-journal-${journal.entry_number || journal.id}-${new Date()
      .toISOString()
      .slice(0, 10)}.xls`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function printPage() {
    if (!journal) return;

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
              <p>${escapeHtml(t.entryNumber)}: ${escapeHtml(journal.entry_number)}</p>
              <p>${escapeHtml(t.entryDate)}: ${escapeHtml(formatDate(journal.entry_date))}</p>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
            <div>
              <p>${escapeHtml(t.showing)}: ${escapeHtml(rows.length)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.totalDebit)}</span><strong>${escapeHtml(formatMoney(journal.total_debit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalCredit)}</span><strong>${escapeHtml(formatMoney(journal.total_credit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.difference)}</span><strong>${escapeHtml(formatMoney(journal.difference))}</strong></div>
            <div class="box"><span>${escapeHtml(t.linesCount)}</span><strong>${escapeHtml(journal.lines_count)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.account)}</th>
                <th>${escapeHtml(t.costCenter)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.reference)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
                <th>${escapeHtml(t.movement)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.account)}</td>
                      <td>${escapeHtml(row.costCenter)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.reference)}</td>
                      <td>${escapeHtml(row.debit)}</td>
                      <td>${escapeHtml(row.credit)}</td>
                      <td>${escapeHtml(row.movement)}</td>
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
        <DetailsSkeleton />
      </div>
    );
  }

  if (notFound || !journal) {
    return (
      <div className="w-full space-y-4" dir={dir}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1 text-right">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t.title}
            </h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          </div>

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/accounting/journals">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>
        </div>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted/40">
              <XCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">{t.notFoundTitle}</p>
              <p className="text-sm text-muted-foreground">{t.notFoundDesc}</p>
            </div>
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
            {journal.entry_number || t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{journal.description || t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/accounting/journals">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadDetails({ silent: true })}
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
              onClick={() => void loadDetails()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{t.profile}</CardTitle>
                  <CardDescription>{t.profileDesc}</CardDescription>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
                  <ReceiptText className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-1 px-6 pb-6">
              <InfoRow label={t.entryNumber} value={<span className="tabular-nums">{journal.entry_number}</span>} />
              <InfoRow label={t.entryDate} value={<span className="tabular-nums">{formatDate(journal.entry_date)}</span>} />
              <InfoRow label={t.period} value={<span>{journal.period_name || "—"}</span>} />
              <InfoRow
                label={t.status}
                value={
                  <StatusBadge
                    value={journal.status}
                    label={journal.status_label || statusLabel(journal.status, locale)}
                  />
                }
              />
              <InfoRow
                label={t.postingSource}
                value={<span>{journal.posting_source_label || journal.posting_source || "—"}</span>}
              />
              <InfoRow label={t.sourceNumber} value={<span>{journal.source_number || "—"}</span>} />
              <InfoRow label={t.reference} value={<span>{journal.reference || "—"}</span>} />
              <InfoRow
                label={t.status}
                value={
                  <StatusBadge
                    value={journal.is_balanced ? "balanced" : "unbalanced"}
                    label={journal.is_balanced ? t.balanced : t.unbalanced}
                  />
                }
              />
              <InfoRow label={t.createdBy} value={<span>{journal.created_by_name || "—"}</span>} />
              <InfoRow label={t.createdAt} value={<span className="tabular-nums">{formatDateTime(journal.created_at)}</span>} />
              <InfoRow label={t.updatedAt} value={<span className="tabular-nums">{formatDateTime(journal.updated_at)}</span>} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title={t.totalDebit}
              value={<MoneyValue value={journal.total_debit} label={t.sar} />}
              trend={t.debit}
              icon={WalletCards}
            />

            <KpiCard
              title={t.totalCredit}
              value={<MoneyValue value={journal.total_credit} label={t.sar} />}
              trend={t.credit}
              icon={Landmark}
            />

            <KpiCard
              title={t.difference}
              value={<MoneyValue value={journal.difference} label={t.sar} />}
              trend={journal.is_balanced ? t.balanced : t.unbalanced}
              icon={ShieldCheck}
            />

            <KpiCard
              title={t.linesCount}
              value={formatInteger(journal.lines_count || lines.length)}
              trend={t.linesTitle}
              icon={BookOpen}
            />
          </div>

          <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
            <CardHeader className="px-6 py-5">
              <CardTitle>{t.linesTitle}</CardTitle>
              <CardDescription>{t.linesDesc}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 p-4">
              <div className="flex flex-col gap-3">
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
                      value={movementFilter}
                      onValueChange={(value) => setMovementFilter(value as MovementFilter)}
                    >
                      <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[165px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t.movementType}: {t.all}</SelectItem>
                        <SelectItem value="debit">{t.debit}</SelectItem>
                        <SelectItem value="credit">{t.credit}</SelectItem>
                        <SelectItem value="empty">{t.empty}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
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
              </div>

              <div className="overflow-hidden rounded-lg border bg-background">
                <div className="overflow-x-auto">
                  <Table className="min-w-[1180px] table-fixed">
                    <TableHeader>
                      <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                        {columns.account ? (
                          <TableHead className="h-11 w-[250px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.account}
                          </TableHead>
                        ) : null}

                        {columns.costCenter ? (
                          <TableHead className="h-11 w-[190px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.costCenter}
                          </TableHead>
                        ) : null}

                        {columns.description ? (
                          <TableHead className="h-11 w-[280px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.description}
                          </TableHead>
                        ) : null}

                        {columns.reference ? (
                          <TableHead className="h-11 w-[145px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.reference}
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

                        {columns.movement ? (
                          <TableHead className="h-11 w-[120px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                            {t.movement}
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
                      {filteredLines.length ? (
                        filteredLines.map((line, index) => (
                          <TableRow key={line.id || `${line.account_id}-${index}`} className="h-[62px]">
                            {columns.account ? (
                              <TableCell className="h-[62px] w-[250px] overflow-hidden px-4 text-right align-middle">
                                <div className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-foreground">
                                    {line.account_name || t.unknown}
                                  </span>
                                  <span className="block truncate text-xs text-muted-foreground tabular-nums">
                                    {line.account_code || "—"}
                                  </span>
                                </div>
                              </TableCell>
                            ) : null}

                            {columns.costCenter ? (
                              <TableCell className="h-[62px] w-[190px] overflow-hidden px-4 text-right align-middle">
                                <div className="min-w-0">
                                  <span className="block truncate text-sm text-foreground">
                                    {line.cost_center_name || "—"}
                                  </span>
                                  <span className="block truncate text-xs text-muted-foreground tabular-nums">
                                    {line.cost_center_code || "—"}
                                  </span>
                                </div>
                              </TableCell>
                            ) : null}

                            {columns.description ? (
                              <TableCell className="h-[62px] w-[280px] overflow-hidden px-4 text-right align-middle">
                                <span className="block truncate text-sm text-muted-foreground">
                                  {line.description || "—"}
                                </span>
                              </TableCell>
                            ) : null}

                            {columns.reference ? (
                              <TableCell className="h-[62px] w-[145px] overflow-hidden px-4 text-right align-middle">
                                <span className="block truncate text-sm text-muted-foreground">
                                  {line.reference || "—"}
                                </span>
                              </TableCell>
                            ) : null}

                            {columns.debit ? (
                              <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                                <MoneyValue value={line.debit} label={t.sar} />
                              </TableCell>
                            ) : null}

                            {columns.credit ? (
                              <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                                <MoneyValue value={line.credit} label={t.sar} />
                              </TableCell>
                            ) : null}

                            {columns.movement ? (
                              <TableCell className="h-[62px] w-[120px] overflow-hidden px-4 text-right align-middle">
                                <StatusBadge
                                  value={line.movement_type}
                                  label={movementLabel(line.movement_type, locale)}
                                />
                              </TableCell>
                            ) : null}

                            {columns.actions ? (
                              <TableCell className="h-[62px] w-[90px] overflow-hidden px-4 text-center align-middle">
                                {line.account_id ? (
                                  <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
                                    <Link href={`/system/accounting/accounts/${line.account_id}`}>
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
                  {formatInteger(filteredLines.length)}
                </span>{" "}
                {t.of}{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatInteger(lines.length)}
                </span>{" "}
                {t.rows}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}