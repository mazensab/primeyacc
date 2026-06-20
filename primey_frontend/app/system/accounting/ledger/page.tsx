"use client";

/* ============================================================
   📂 app/system/accounting/ledger/page.tsx
   🧾 Primey Care — General Ledger
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API only:
      GET /api/accounting/ledger/
      GET /api/accounting/accounts/
   ✅ Account selector / search / dates / movement / sort / columns
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
  BookOpen,
  CalendarDays,
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
  TriangleAlert,
  WalletCards,
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

type AccountOption = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  account_type_label: string;
  is_active: boolean;
  can_post: boolean;
  is_group: boolean;
};

type LedgerRecord = {
  id: string;
  date: string | null;
  entry_id: string;
  entry_number: string;
  line_id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  cost_center_id: string;
  cost_center_code: string;
  cost_center_name: string;
  description: string;
  reference: string;
  source: string;
  source_label: string;
  debit: number;
  credit: number;
  balance: number;
  movement_type: "debit" | "credit" | "opening" | "empty";
  status: string;
  created_at: string | null;
};

type LedgerSummary = {
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  movements_count: number;
};

type MovementFilter = "all" | "debit" | "credit" | "opening" | "empty";
type SortKey =
  | "newest"
  | "oldest"
  | "debit_high"
  | "credit_high"
  | "balance_high"
  | "balance_low"
  | "account";

type ColumnKey =
  | "date"
  | "entry"
  | "account"
  | "costCenter"
  | "description"
  | "reference"
  | "source"
  | "debit"
  | "credit"
  | "balance"
  | "movement"
  | "actions";

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  date: true,
  entry: true,
  account: true,
  costCenter: true,
  description: true,
  reference: true,
  source: true,
  debit: true,
  credit: true,
  balance: true,
  movement: true,
  actions: true,
};

const translations = {
  ar: {
    title: "دفتر الأستاذ",
    subtitle:
      "استعراض حركة الحسابات المحاسبية مع المدين والدائن والرصيد الجاري حسب الحساب والفترة.",
    back: "المحاسبة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    openJournal: "فتح القيد",
    openAccount: "فتح الحساب",

    account: "الحساب",
    allAccounts: "كل الحسابات",
    searchAccount: "ابحث عن حساب...",
    from: "من",
    to: "إلى",
    all: "الكل",
    movementType: "نوع الحركة",
    sort: "الترتيب",
    columns: "الأعمدة",
    searchPlaceholder: "ابحث برقم القيد أو الحساب أو الوصف أو المرجع أو المصدر...",

    openingBalance: "الرصيد الافتتاحي",
    totalDebit: "إجمالي المدين",
    totalCredit: "إجمالي الدائن",
    closingBalance: "الرصيد الختامي",
    movementsCount: "عدد الحركات",

    date: "التاريخ",
    entry: "القيد",
    costCenter: "مركز التكلفة",
    description: "الوصف",
    reference: "المرجع",
    source: "المصدر",
    debit: "مدين",
    credit: "دائن",
    balance: "الرصيد",
    movement: "الحركة",
    status: "الحالة",
    actions: "الإجراءات",

    opening: "افتتاحي",
    empty: "فارغ",
    posted: "مرحل",
    draft: "مسودة",
    newest: "الأحدث",
    oldest: "الأقدم",
    debitHigh: "الأعلى مدين",
    creditHigh: "الأعلى دائن",
    balanceHigh: "الأعلى رصيدًا",
    balanceLow: "الأقل رصيدًا",
    accountSort: "الحساب",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    noDataTitle: "لا توجد حركات",
    noDataDesc: "ستظهر حركة دفتر الأستاذ هنا بعد وجود قيود محاسبية.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل دفتر الأستاذ",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث دفتر الأستاذ.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير دفتر الأستاذ",
    generatedAt: "تاريخ الطباعة",
    sar: "ر.س",
    unknown: "غير محدد",
  },
  en: {
    title: "General Ledger",
    subtitle:
      "Review account movements with debit, credit, and running balance by account and period.",
    back: "Accounting",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    openJournal: "Open journal",
    openAccount: "Open account",

    account: "Account",
    allAccounts: "All accounts",
    searchAccount: "Search account...",
    from: "From",
    to: "To",
    all: "All",
    movementType: "Movement type",
    sort: "Sort",
    columns: "Columns",
    searchPlaceholder: "Search by journal, account, description, reference, or source...",

    openingBalance: "Opening balance",
    totalDebit: "Total debit",
    totalCredit: "Total credit",
    closingBalance: "Closing balance",
    movementsCount: "Movements count",

    date: "Date",
    entry: "Journal",
    costCenter: "Cost center",
    description: "Description",
    reference: "Reference",
    source: "Source",
    debit: "Debit",
    credit: "Credit",
    balance: "Balance",
    movement: "Movement",
    status: "Status",
    actions: "Actions",

    opening: "Opening",
    empty: "Empty",
    posted: "Posted",
    draft: "Draft",
    newest: "Newest",
    oldest: "Oldest",
    debitHigh: "Highest debit",
    creditHigh: "Highest credit",
    balanceHigh: "Highest balance",
    balanceLow: "Lowest balance",
    accountSort: "Account",

    showing: "Showing",
    of: "of",
    rows: "rows",
    noDataTitle: "No movements",
    noDataDesc: "General ledger movements will appear here once journal entries exist.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load general ledger",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "General ledger refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "General ledger report",
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
    if (["1", "true", "yes", "on", "active", "posting", "posted"].includes(normalized)) return true;
    if (["0", "false", "no", "off", "inactive", "draft"].includes(normalized)) return false;
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

  const data = asRecord(payload.data);

  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.ledger)) return data.ledger;
  if (Array.isArray(data.movements)) return data.movements;
  if (Array.isArray(data.entries)) return data.entries;
  if (Array.isArray(data.accounts)) return data.accounts;

  return [];
}

function extractSummary(payload: ApiResponse, rows: LedgerRecord[]): LedgerSummary {
  const data = asRecord(payload.data);
  const summary = asRecord(payload.summary || data.summary || data.totals || data);

  return {
    opening_balance: toNumber(summary.opening_balance),
    total_debit: toNumber(
      summary.total_debit,
      rows.reduce((sum, row) => sum + row.debit, 0),
    ),
    total_credit: toNumber(
      summary.total_credit,
      rows.reduce((sum, row) => sum + row.credit, 0),
    ),
    closing_balance: toNumber(
      summary.closing_balance ?? summary.current_balance ?? summary.balance,
      rows.length ? rows[rows.length - 1]?.balance : 0,
    ),
    movements_count: toNumber(
      summary.movements_count ??
        summary.total_count ??
        payload.count ??
        payload.total ??
        payload.total_count,
      rows.length,
    ),
  };
}

function normalizeAccount(value: unknown): AccountOption {
  const item = asRecord(value);
  const id = normalizeText(item.id || item.pk || item.uuid);

  return {
    id,
    code: normalizeText(item.code),
    name: normalizeText(item.name || item.name_ar || item.name_en || `#${id}`),
    account_type: normalizeText(item.account_type || item.type),
    account_type_label: normalizeText(item.account_type_label || item.account_type || item.type),
    is_active: toBoolean(item.is_active, true),
    can_post: toBoolean(item.can_post || item.is_posting),
    is_group: toBoolean(item.is_group),
  };
}

function normalizeLedger(value: unknown): LedgerRecord {
  const item = asRecord(value);
  const entry = asRecord(item.entry || item.journal || item.journal_entry);
  const account = asRecord(item.account);
  const costCenter = asRecord(item.cost_center || item.costCenter);

  const id = normalizeText(item.id || item.pk || item.uuid);
  const debit = toNumber(item.debit ?? item.debit_amount ?? item.total_debit);
  const credit = toNumber(item.credit ?? item.credit_amount ?? item.total_credit);

  let movementType: LedgerRecord["movement_type"] = "empty";

  if (normalizeText(item.movement_type).toLowerCase() === "opening") {
    movementType = "opening";
  } else if (debit > 0) {
    movementType = "debit";
  } else if (credit > 0) {
    movementType = "credit";
  }

  return {
    id,
    date:
      normalizeText(item.date || item.entry_date || item.posting_date || entry.entry_date) ||
      null,
    entry_id: normalizeText(item.entry_id || item.journal_entry_id || entry.id),
    entry_number: normalizeText(
      item.entry_number ||
        item.journal_number ||
        item.journal_entry_number ||
        entry.entry_number ||
        entry.number,
    ),
    line_id: normalizeText(item.line_id || item.journal_line_id),
    account_id: normalizeText(item.account_id || account.id),
    account_code: normalizeText(item.account_code || account.code),
    account_name: normalizeText(item.account_name || account.name || account.name_ar || account.name_en),
    cost_center_id: normalizeText(item.cost_center_id || costCenter.id),
    cost_center_code: normalizeText(item.cost_center_code || costCenter.code),
    cost_center_name: normalizeText(
      item.cost_center_name || costCenter.name || costCenter.name_ar || costCenter.name_en,
    ),
    description: normalizeText(item.description || item.notes || entry.description),
    reference: normalizeText(item.reference || item.source_number || entry.source_number),
    source: normalizeText(item.source || item.posting_source || entry.posting_source),
    source_label: normalizeText(item.source_label || item.posting_source_label || item.source || entry.posting_source),
    debit,
    credit,
    balance: toNumber(item.balance ?? item.running_balance ?? item.current_balance),
    movement_type: movementType,
    status: normalizeText(item.status || entry.status || "posted"),
    created_at: normalizeText(item.created_at || entry.created_at) || null,
  };
}

function movementLabel(value: LedgerRecord["movement_type"], locale: Locale) {
  const t = translations[locale];

  if (value === "debit") return t.debit;
  if (value === "credit") return t.credit;
  if (value === "opening") return t.opening;

  return t.empty;
}

function getBadgeClass(value: string) {
  const normalized = value.toLowerCase();

  if (["posted", "debit", "active"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (["cancelled", "canceled", "void"].includes(normalized)) {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (["credit", "opening"].includes(normalized)) {
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

function LedgerSkeleton() {
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

export default function AccountingLedgerPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [accounts, setAccounts] = React.useState<AccountOption[]>([]);
  const [ledgerRows, setLedgerRows] = React.useState<LedgerRecord[]>([]);
  const [summary, setSummary] = React.useState<LedgerSummary>({
    opening_balance: 0,
    total_debit: 0,
    total_credit: 0,
    closing_balance: 0,
    movements_count: 0,
  });

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [accountSearch, setAccountSearch] = React.useState("");
  const [selectedAccountId, setSelectedAccountId] = React.useState("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [movementFilter, setMovementFilter] = React.useState<MovementFilter>("all");
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

  const loadLedger = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const accountsParams = new URLSearchParams({
          page: "1",
          page_size: "500",
        });

        const ledgerParams = new URLSearchParams({
          page: "1",
          page_size: "500",
        });

        if (selectedAccountId !== "all") {
          ledgerParams.set("account_id", selectedAccountId);
        }

        if (dateFrom) ledgerParams.set("date_from", dateFrom);
        if (dateTo) ledgerParams.set("date_to", dateTo);

        const [accountsResult, ledgerResult] = await Promise.allSettled([
          fetchJson<ApiResponse>(
            makeApiUrl("/api/accounting/accounts/", accountsParams),
            controller.signal,
          ),
          fetchJson<ApiResponse>(
            makeApiUrl("/api/accounting/ledger/", ledgerParams),
            controller.signal,
          ),
        ]);

        if (accountsResult.status === "fulfilled") {
          setAccounts(
            extractArray(accountsResult.value)
              .map(normalizeAccount)
              .filter((account) => account.is_active)
              .sort((a, b) => a.code.localeCompare(b.code)),
          );
        } else {
          setAccounts([]);
        }

        if (ledgerResult.status === "rejected") {
          throw ledgerResult.reason;
        }

        const rows = extractArray(ledgerResult.value).map(normalizeLedger);

        setLedgerRows(rows);
        setSummary(extractSummary(ledgerResult.value, rows));

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
    [dateFrom, dateTo, selectedAccountId, t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  const filteredAccounts = React.useMemo(() => {
    const query = accountSearch.trim().toLowerCase();

    if (!query) return accounts;

    return accounts.filter(
      (account) =>
        account.code.toLowerCase().includes(query) ||
        account.name.toLowerCase().includes(query) ||
        account.account_type_label.toLowerCase().includes(query),
    );
  }, [accountSearch, accounts]);

  const selectedAccount = React.useMemo(() => {
    if (selectedAccountId === "all") return null;
    return accounts.find((account) => account.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  const filteredRows = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let rows = ledgerRows.filter((row) => {
      const matchesSearch =
        !query ||
        row.entry_number.toLowerCase().includes(query) ||
        row.account_code.toLowerCase().includes(query) ||
        row.account_name.toLowerCase().includes(query) ||
        row.cost_center_code.toLowerCase().includes(query) ||
        row.cost_center_name.toLowerCase().includes(query) ||
        row.description.toLowerCase().includes(query) ||
        row.reference.toLowerCase().includes(query) ||
        row.source_label.toLowerCase().includes(query) ||
        row.source.toLowerCase().includes(query);

      const date = formatDate(row.date || row.created_at);
      const matchesFrom = !dateFrom || (date !== "—" && date >= dateFrom);
      const matchesTo = !dateTo || (date !== "—" && date <= dateTo);

      const matchesMovement =
        movementFilter === "all" || row.movement_type === movementFilter;

      return matchesSearch && matchesFrom && matchesTo && matchesMovement;
    });

    rows = [...rows].sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.date || a.created_at || "").localeCompare(
          String(b.date || b.created_at || ""),
        );
      }

      if (sortKey === "debit_high") return b.debit - a.debit;
      if (sortKey === "credit_high") return b.credit - a.credit;
      if (sortKey === "balance_high") return b.balance - a.balance;
      if (sortKey === "balance_low") return a.balance - b.balance;
      if (sortKey === "account") {
        return `${a.account_code} ${a.account_name}`.localeCompare(
          `${b.account_code} ${b.account_name}`,
        );
      }

      return String(b.date || b.created_at || "").localeCompare(
        String(a.date || a.created_at || ""),
      );
    });

    return rows;
  }, [dateFrom, dateTo, ledgerRows, movementFilter, searchInput, sortKey]);

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    selectedAccountId !== "all" ||
    movementFilter !== "all" ||
    sortKey !== "newest";

  const visibleColumnCount = Object.values(columns).filter(Boolean).length;

  function resetFilters() {
    setSearchInput("");
    setDateFrom("");
    setDateTo("");
    setSelectedAccountId("all");
    setMovementFilter("all");
    setSortKey("newest");
    setAccountSearch("");
  }

  function columnLabel(key: ColumnKey) {
    if (key === "date") return t.date;
    if (key === "entry") return t.entry;
    if (key === "account") return t.account;
    if (key === "costCenter") return t.costCenter;
    if (key === "description") return t.description;
    if (key === "reference") return t.reference;
    if (key === "source") return t.source;
    if (key === "debit") return t.debit;
    if (key === "credit") return t.credit;
    if (key === "balance") return t.balance;
    if (key === "movement") return t.movement;
    return t.actions;
  }

  function buildExportRows() {
    return filteredRows.map((row) => ({
      date: formatDate(row.date || row.created_at),
      entry: row.entry_number,
      account: `${row.account_code ? `${row.account_code} — ` : ""}${row.account_name || "—"}`,
      costCenter: `${row.cost_center_code ? `${row.cost_center_code} — ` : ""}${row.cost_center_name || "—"}`,
      description: row.description,
      reference: row.reference,
      source: row.source_label || row.source,
      debit: formatMoney(row.debit),
      credit: formatMoney(row.credit),
      balance: formatMoney(row.balance),
      movement: movementLabel(row.movement_type, locale),
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
          <p>${escapeHtml(t.account)}: ${escapeHtml(selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : t.allAccounts)}</p>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.entry)}</th>
                <th>${escapeHtml(t.account)}</th>
                <th>${escapeHtml(t.costCenter)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.reference)}</th>
                <th>${escapeHtml(t.source)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
                <th>${escapeHtml(t.balance)}</th>
                <th>${escapeHtml(t.movement)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.date)}</td>
                      <td>${escapeHtml(row.entry)}</td>
                      <td>${escapeHtml(row.account)}</td>
                      <td>${escapeHtml(row.costCenter)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.reference)}</td>
                      <td>${escapeHtml(row.source)}</td>
                      <td>${escapeHtml(row.debit)}</td>
                      <td>${escapeHtml(row.credit)}</td>
                      <td>${escapeHtml(row.balance)}</td>
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
    link.download = `primey-care-general-ledger-${new Date().toISOString().slice(0, 10)}.xls`;
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
              <p>${escapeHtml(t.account)}: ${escapeHtml(selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : t.allAccounts)}</p>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
            <div>
              <p>${escapeHtml(t.showing)}: ${escapeHtml(rows.length)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.openingBalance)}</span><strong>${escapeHtml(formatMoney(summary.opening_balance))}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalDebit)}</span><strong>${escapeHtml(formatMoney(summary.total_debit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalCredit)}</span><strong>${escapeHtml(formatMoney(summary.total_credit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.closingBalance)}</span><strong>${escapeHtml(formatMoney(summary.closing_balance))}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.entry)}</th>
                <th>${escapeHtml(t.account)}</th>
                <th>${escapeHtml(t.costCenter)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.reference)}</th>
                <th>${escapeHtml(t.source)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
                <th>${escapeHtml(t.balance)}</th>
                <th>${escapeHtml(t.movement)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.date)}</td>
                      <td>${escapeHtml(row.entry)}</td>
                      <td>${escapeHtml(row.account)}</td>
                      <td>${escapeHtml(row.costCenter)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.reference)}</td>
                      <td>${escapeHtml(row.source)}</td>
                      <td>${escapeHtml(row.debit)}</td>
                      <td>${escapeHtml(row.credit)}</td>
                      <td>${escapeHtml(row.balance)}</td>
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
        <LedgerSkeleton />
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
            onClick={() => void loadLedger({ silent: true })}
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
          title={t.openingBalance}
          value={<MoneyValue value={summary.opening_balance} label={t.sar} />}
          trend={selectedAccount ? selectedAccount.code : t.allAccounts}
          icon={WalletCards}
        />

        <KpiCard
          title={t.totalDebit}
          value={<MoneyValue value={summary.total_debit} label={t.sar} />}
          trend={t.debit}
          icon={ReceiptText}
        />

        <KpiCard
          title={t.totalCredit}
          value={<MoneyValue value={summary.total_credit} label={t.sar} />}
          trend={t.credit}
          icon={Landmark}
        />

        <KpiCard
          title={t.closingBalance}
          value={<MoneyValue value={summary.closing_balance} label={t.sar} />}
          trend={`${t.movementsCount}: ${formatInteger(summary.movements_count || ledgerRows.length)}`}
          icon={BookOpen}
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
              onClick={() => void loadLedger()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
        <CardContent className="space-y-3 p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
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

            <div className="relative w-full">
              <Search
                className={cn(
                  "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                  locale === "ar" ? "right-3" : "left-3",
                )}
              />
              <Input
                value={accountSearch}
                onChange={(event) => setAccountSearch(event.target.value)}
                placeholder={t.searchAccount}
                className={cn(
                  "h-10 rounded-lg bg-background",
                  locale === "ar" ? "pr-9" : "pl-9",
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[260px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allAccounts}</SelectItem>
                  {filteredAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.code} — {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
                  <SelectItem value="opening">{t.opening}</SelectItem>
                  <SelectItem value="empty">{t.empty}</SelectItem>
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
                  <SelectItem value="debit_high">{t.debitHigh}</SelectItem>
                  <SelectItem value="credit_high">{t.creditHigh}</SelectItem>
                  <SelectItem value="balance_high">{t.balanceHigh}</SelectItem>
                  <SelectItem value="balance_low">{t.balanceLow}</SelectItem>
                  <SelectItem value="account">{t.accountSort}</SelectItem>
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
              <Table className="min-w-[1450px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    {columns.date ? (
                      <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.date}
                      </TableHead>
                    ) : null}

                    {columns.entry ? (
                      <TableHead className="h-11 w-[145px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.entry}
                      </TableHead>
                    ) : null}

                    {columns.account ? (
                      <TableHead className="h-11 w-[240px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.account}
                      </TableHead>
                    ) : null}

                    {columns.costCenter ? (
                      <TableHead className="h-11 w-[180px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.costCenter}
                      </TableHead>
                    ) : null}

                    {columns.description ? (
                      <TableHead className="h-11 w-[260px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.description}
                      </TableHead>
                    ) : null}

                    {columns.reference ? (
                      <TableHead className="h-11 w-[140px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.reference}
                      </TableHead>
                    ) : null}

                    {columns.source ? (
                      <TableHead className="h-11 w-[140px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.source}
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
                      <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.balance}
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
                  {filteredRows.length ? (
                    filteredRows.map((row, index) => (
                      <TableRow key={row.id || `${row.entry_number}-${index}`} className="h-[62px]">
                        {columns.date ? (
                          <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm tabular-nums text-muted-foreground">
                              {formatDate(row.date || row.created_at)}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.entry ? (
                          <TableCell className="h-[62px] w-[145px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {row.entry_number || "—"}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.account ? (
                          <TableCell className="h-[62px] w-[240px] overflow-hidden px-4 text-right align-middle">
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-foreground">
                                {row.account_name || t.unknown}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground tabular-nums">
                                {row.account_code || "—"}
                              </span>
                            </div>
                          </TableCell>
                        ) : null}

                        {columns.costCenter ? (
                          <TableCell className="h-[62px] w-[180px] overflow-hidden px-4 text-right align-middle">
                            <div className="min-w-0">
                              <span className="block truncate text-sm text-foreground">
                                {row.cost_center_name || "—"}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground tabular-nums">
                                {row.cost_center_code || "—"}
                              </span>
                            </div>
                          </TableCell>
                        ) : null}

                        {columns.description ? (
                          <TableCell className="h-[62px] w-[260px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm text-muted-foreground">
                              {row.description || "—"}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.reference ? (
                          <TableCell className="h-[62px] w-[140px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm text-muted-foreground">
                              {row.reference || "—"}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.source ? (
                          <TableCell className="h-[62px] w-[140px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm text-muted-foreground">
                              {row.source_label || row.source || "—"}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.debit ? (
                          <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={row.debit} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.credit ? (
                          <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={row.credit} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.balance ? (
                          <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={row.balance} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.movement ? (
                          <TableCell className="h-[62px] w-[120px] overflow-hidden px-4 text-right align-middle">
                            <StatusBadge
                              value={row.movement_type}
                              label={movementLabel(row.movement_type, locale)}
                            />
                          </TableCell>
                        ) : null}

                        {columns.actions ? (
                          <TableCell className="h-[62px] w-[90px] overflow-hidden px-4 text-center align-middle">
                            <div className="flex items-center justify-center gap-1">
                              {row.entry_id ? (
                                <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
                                  <Link href={`/system/accounting/journals/${row.entry_id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                              ) : row.account_id ? (
                                <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
                                  <Link href={`/system/accounting/accounts/${row.account_id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                              ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </div>
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
              {formatInteger(ledgerRows.length)}
            </span>{" "}
            {t.rows}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}