"use client";

/* ============================================================
   📂 app/system/treasury/cashboxes/page.tsx
   🧠 Primey Care | Treasury Cashboxes Page
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API:
      GET /api/treasury/cashboxes/
      fallback:
      GET /api/treasury/accounts/?account_type=cashbox
   ✅ Cashbox KPI cards
   ✅ Search / status / default / balance / columns / pagination
   ✅ Excel .xls HTML Workbook
   ✅ Web Print
   ✅ Skeleton Loading
   ✅ Error / Empty states
   ✅ sonner
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
  Banknote,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Star,
  TriangleAlert,
  Wallet,
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
  count?: number;
  total?: number;
  total_count?: number;
  results?: unknown[];
  items?: unknown[];
  rows?: unknown[];
  data?: unknown;
  summary?: unknown;
  pagination?: unknown;
  message?: string;
  detail?: string;
  error?: string;
};

type CashboxStatus = "active" | "inactive" | "archived" | "unknown";
type DefaultFilter = "all" | "default" | "not_default";
type BalanceFilter = "all" | "positive" | "zero" | "negative";
type SortKey =
  | "name"
  | "code"
  | "balance_high"
  | "balance_low"
  | "newest"
  | "oldest";

type ColumnKey =
  | "cashbox"
  | "status"
  | "balance"
  | "openingBalance"
  | "default"
  | "ledger"
  | "description"
  | "updatedAt"
  | "actions";

type TreasuryAccount = {
  id: string;
  name: string;
  code: string;
  account_type: string;
  account_type_label: string;
  status: CashboxStatus;
  status_label: string;
  ledger_account_id: string;
  ledger_account_code: string;
  ledger_account_name: string;
  opening_balance: number;
  current_balance: number;
  currency: string;
  description: string;
  is_default: boolean;
  allow_negative_balance: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type CashboxStats = {
  total: number;
  active: number;
  inactive: number;
  defaults: number;
  totalBalance: number;
  openingBalance: number;
  positive: number;
  zero: number;
  negative: number;
  currency: string;
};

const API = {
  cashboxes: "/api/treasury/cashboxes/",
  accounts: "/api/treasury/accounts/",
};

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  cashbox: true,
  status: true,
  balance: true,
  openingBalance: true,
  default: true,
  ledger: true,
  description: true,
  updatedAt: true,
  actions: true,
};

const translations = {
  ar: {
    title: "الصناديق",
    subtitle: "إدارة صناديق النقد وأرصدة الكاش داخل الخزينة.",
    back: "الخزينة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    open: "فتح",
    statement: "كشف الحساب",
    all: "الكل",
    searchPlaceholder: "ابحث باسم الصندوق أو الكود أو الحساب المحاسبي...",
    status: "الحالة",
    defaultFilter: "الافتراضي",
    balanceFilter: "الرصيد",
    sort: "الترتيب",
    columns: "الأعمدة",
    rowsPerPage: "عدد الصفوف",

    totalCashboxes: "إجمالي الصناديق",
    activeCashboxes: "الصناديق النشطة",
    defaultCashboxes: "الصناديق الافتراضية",
    totalBalance: "إجمالي الأرصدة",
    openingBalanceTotal: "الرصيد الافتتاحي",
    positiveBalance: "رصيد موجب",
    zeroBalance: "رصيد صفر",
    negativeBalance: "رصيد سالب",

    cashbox: "الصندوق",
    code: "الكود",
    ledger: "الحساب المحاسبي",
    balance: "الرصيد الحالي",
    openingBalance: "الرصيد الافتتاحي",
    default: "افتراضي",
    description: "الوصف",
    updatedAt: "آخر تحديث",
    actions: "الإجراءات",

    active: "نشط",
    inactive: "غير نشط",
    archived: "مؤرشف",
    unknown: "غير محدد",
    yes: "نعم",
    no: "لا",
    defaultOnly: "الافتراضية فقط",
    notDefaultOnly: "غير الافتراضية",
    positiveOnly: "رصيد موجب",
    zeroOnly: "رصيد صفر",
    negativeOnly: "رصيد سالب",

    nameSort: "الاسم",
    codeSort: "الكود",
    balanceHigh: "الأعلى رصيدًا",
    balanceLow: "الأقل رصيدًا",
    newest: "الأحدث",
    oldest: "الأقدم",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    page: "صفحة",
    previous: "السابق",
    next: "التالي",

    errorTitle: "تعذر تحميل الصناديق",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث الصناديق.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير صناديق الخزينة",
    generatedAt: "تاريخ الطباعة",
    noDataTitle: "لا توجد صناديق",
    noDataDesc: "ستظهر صناديق الخزينة هنا بعد إنشائها.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    sar: "ر.س",
    notAvailable: "—",
  },
  en: {
    title: "Cashboxes",
    subtitle: "Manage cashboxes and cash balances inside treasury.",
    back: "Treasury",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    open: "Open",
    statement: "Statement",
    all: "All",
    searchPlaceholder: "Search by cashbox name, code, or ledger account...",
    status: "Status",
    defaultFilter: "Default",
    balanceFilter: "Balance",
    sort: "Sort",
    columns: "Columns",
    rowsPerPage: "Rows per page",

    totalCashboxes: "Total cashboxes",
    activeCashboxes: "Active cashboxes",
    defaultCashboxes: "Default cashboxes",
    totalBalance: "Total balance",
    openingBalanceTotal: "Opening balance",
    positiveBalance: "Positive balance",
    zeroBalance: "Zero balance",
    negativeBalance: "Negative balance",

    cashbox: "Cashbox",
    code: "Code",
    ledger: "Ledger account",
    balance: "Current balance",
    openingBalance: "Opening balance",
    default: "Default",
    description: "Description",
    updatedAt: "Updated at",
    actions: "Actions",

    active: "Active",
    inactive: "Inactive",
    archived: "Archived",
    unknown: "Unknown",
    yes: "Yes",
    no: "No",
    defaultOnly: "Default only",
    notDefaultOnly: "Not default",
    positiveOnly: "Positive balance",
    zeroOnly: "Zero balance",
    negativeOnly: "Negative balance",

    nameSort: "Name",
    codeSort: "Code",
    balanceHigh: "Highest balance",
    balanceLow: "Lowest balance",
    newest: "Newest",
    oldest: "Oldest",

    showing: "Showing",
    of: "of",
    rows: "rows",
    page: "Page",
    previous: "Previous",
    next: "Next",

    errorTitle: "Unable to load cashboxes",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Cashboxes refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Treasury cashboxes report",
    generatedAt: "Generated at",
    noDataTitle: "No cashboxes",
    noDataDesc: "Treasury cashboxes will appear here once created.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
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

    if (["1", "true", "yes", "on", "active", "default"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off", "inactive"].includes(normalized)) {
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

function extractData(payload: ApiResponse | null) {
  return asRecord(payload?.data);
}

function extractSummary(payload: ApiResponse | null) {
  const data = extractData(payload);
  return asRecord(payload?.summary || data.summary);
}

function extractItems(payload: ApiResponse | null) {
  if (!payload) return [];

  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;

  const data = extractData(payload);

  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.accounts)) return data.accounts;

  return [];
}

function normalizeStatus(value: unknown): CashboxStatus {
  const status = normalizeText(value).toLowerCase();

  if (["active", "enabled", "open"].includes(status)) return "active";
  if (["inactive", "disabled", "closed"].includes(status)) return "inactive";
  if (["archived", "archive"].includes(status)) return "archived";

  return "unknown";
}

function normalizeAccount(value: unknown): TreasuryAccount {
  const item = asRecord(value);
  const ledger = asRecord(item.ledger_account);

  return {
    id: normalizeText(item.id || item.pk || item.uuid),
    name: normalizeText(item.name || item.title),
    code: normalizeText(item.code || item.number),
    account_type: normalizeText(item.account_type || item.type || "cashbox"),
    account_type_label: normalizeText(item.account_type_label || item.type_label),
    status: normalizeStatus(item.status),
    status_label: normalizeText(item.status_label),
    ledger_account_id: normalizeText(item.ledger_account_id || ledger.id || ledger.pk),
    ledger_account_code: normalizeText(ledger.code || item.ledger_account_code),
    ledger_account_name: normalizeText(ledger.name || item.ledger_account_name),
    opening_balance: toNumber(item.opening_balance),
    current_balance: toNumber(item.current_balance ?? item.balance),
    currency: normalizeText(item.currency || "SAR"),
    description: normalizeText(item.description || item.notes),
    is_default: toBoolean(item.is_default),
    allow_negative_balance: toBoolean(item.allow_negative_balance),
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,
  };
}

function buildStats(payload: ApiResponse | null, cashboxes: TreasuryAccount[]): CashboxStats {
  const summary = extractSummary(payload);

  return {
    total: toNumber(summary.total_accounts, cashboxes.length),
    active: toNumber(
      summary.active_accounts,
      cashboxes.filter((item) => item.status === "active").length,
    ),
    inactive: toNumber(
      summary.inactive_accounts,
      cashboxes.filter((item) => item.status !== "active").length,
    ),
    defaults: toNumber(
      summary.default_accounts,
      cashboxes.filter((item) => item.is_default).length,
    ),
    totalBalance:
      toNumber(summary.total_current_balance) ||
      cashboxes.reduce((sum, item) => sum + item.current_balance, 0),
    openingBalance:
      toNumber(summary.total_opening_balance) ||
      cashboxes.reduce((sum, item) => sum + item.opening_balance, 0),
    positive: cashboxes.filter((item) => item.current_balance > 0).length,
    zero: cashboxes.filter((item) => item.current_balance === 0).length,
    negative: cashboxes.filter((item) => item.current_balance < 0).length,
    currency: normalizeText(summary.currency || "SAR"),
  };
}

function statusLabel(status: CashboxStatus, locale: Locale) {
  const t = translations[locale];

  if (status === "active") return t.active;
  if (status === "inactive") return t.inactive;
  if (status === "archived") return t.archived;

  return t.unknown;
}

function statusClass(status: CashboxStatus) {
  if (status === "active") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (status === "inactive") {
    return "border-slate-500/30 bg-slate-50 text-slate-700 hover:bg-slate-50";
  }

  if (status === "archived") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
}

function StatusBadge({ status, locale }: { status: CashboxStatus; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", statusClass(status))}
    >
      {statusLabel(status, locale)}
    </Badge>
  );
}

function YesNoBadge({ value, locale }: { value: boolean; locale: Locale }) {
  const t = translations[locale];

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        value
          ? "border-violet-500/30 bg-violet-50 text-violet-700 hover:bg-violet-50"
          : "border-slate-500/30 bg-slate-50 text-slate-700 hover:bg-slate-50",
      )}
    >
      {value ? t.yes : t.no}
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

export default function TreasuryCashboxesPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [cashboxes, setCashboxes] = React.useState<TreasuryAccount[]>([]);
  const [stats, setStats] = React.useState<CashboxStats>({
    total: 0,
    active: 0,
    inactive: 0,
    defaults: 0,
    totalBalance: 0,
    openingBalance: 0,
    positive: 0,
    zero: 0,
    negative: 0,
    currency: "SAR",
  });

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<CashboxStatus | "all">("all");
  const [defaultFilter, setDefaultFilter] = React.useState<DefaultFilter>("all");
  const [balanceFilter, setBalanceFilter] = React.useState<BalanceFilter>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("name");
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

  const loadCashboxes = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          page: "1",
          page_size: "200",
          ordering: "code",
        });

        let payload: ApiResponse | null = null;

        try {
          payload = await fetchJson<ApiResponse>(
            makeApiUrl(API.cashboxes, params),
            controller.signal,
          );
        } catch {
          const fallbackParams = new URLSearchParams(params);
          fallbackParams.set("account_type", "cashbox");

          payload = await fetchJson<ApiResponse>(
            makeApiUrl(API.accounts, fallbackParams),
            controller.signal,
          );
        }

        const nextCashboxes = extractItems(payload)
          .map(normalizeAccount)
          .filter((account) => {
            if (!account.id && !account.name && !account.code) return false;

            const type = account.account_type.toLowerCase();
            return !type || type === "cashbox" || type === "cash";
          });

        setCashboxes(nextCashboxes);
        setStats(buildStats(payload, nextCashboxes));

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
    void loadCashboxes();
  }, [loadCashboxes]);

  const filteredCashboxes = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let result = cashboxes.filter((cashbox) => {
      const matchesSearch =
        !query ||
        cashbox.name.toLowerCase().includes(query) ||
        cashbox.code.toLowerCase().includes(query) ||
        cashbox.ledger_account_code.toLowerCase().includes(query) ||
        cashbox.ledger_account_name.toLowerCase().includes(query) ||
        cashbox.description.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || cashbox.status === statusFilter;

      const matchesDefault =
        defaultFilter === "all" ||
        (defaultFilter === "default" && cashbox.is_default) ||
        (defaultFilter === "not_default" && !cashbox.is_default);

      const matchesBalance =
        balanceFilter === "all" ||
        (balanceFilter === "positive" && cashbox.current_balance > 0) ||
        (balanceFilter === "zero" && cashbox.current_balance === 0) ||
        (balanceFilter === "negative" && cashbox.current_balance < 0);

      return matchesSearch && matchesStatus && matchesDefault && matchesBalance;
    });

    result = [...result].sort((a, b) => {
      if (sortKey === "code") return a.code.localeCompare(b.code);
      if (sortKey === "balance_high") return b.current_balance - a.current_balance;
      if (sortKey === "balance_low") return a.current_balance - b.current_balance;
      if (sortKey === "newest") return String(b.created_at || "").localeCompare(String(a.created_at || ""));
      if (sortKey === "oldest") return String(a.created_at || "").localeCompare(String(b.created_at || ""));

      return a.name.localeCompare(b.name);
    });

    return result;
  }, [balanceFilter, cashboxes, defaultFilter, searchInput, sortKey, statusFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [balanceFilter, defaultFilter, pageSize, searchInput, sortKey, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCashboxes.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredCashboxes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasFilters =
    Boolean(searchInput.trim()) ||
    statusFilter !== "all" ||
    defaultFilter !== "all" ||
    balanceFilter !== "all" ||
    sortKey !== "name";

  const visibleColumnCount = Object.values(columns).filter(Boolean).length;

  function resetFilters() {
    setSearchInput("");
    setStatusFilter("all");
    setDefaultFilter("all");
    setBalanceFilter("all");
    setSortKey("name");
    setPage(1);
  }

  function columnLabel(key: ColumnKey) {
    if (key === "cashbox") return t.cashbox;
    if (key === "status") return t.status;
    if (key === "balance") return t.balance;
    if (key === "openingBalance") return t.openingBalance;
    if (key === "default") return t.default;
    if (key === "ledger") return t.ledger;
    if (key === "description") return t.description;
    if (key === "updatedAt") return t.updatedAt;
    return t.actions;
  }

  function buildExportRows() {
    return filteredCashboxes.map((cashbox) => ({
      code: cashbox.code || t.notAvailable,
      name: cashbox.name || t.notAvailable,
      status: cashbox.status_label || statusLabel(cashbox.status, locale),
      balance: formatMoney(cashbox.current_balance),
      openingBalance: formatMoney(cashbox.opening_balance),
      default: cashbox.is_default ? t.yes : t.no,
      ledger: cashbox.ledger_account_code
        ? `${cashbox.ledger_account_code} - ${cashbox.ledger_account_name}`
        : cashbox.ledger_account_name || t.notAvailable,
      description: cashbox.description || t.notAvailable,
      updatedAt: formatDate(cashbox.updated_at),
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
          <p>${escapeHtml(t.totalCashboxes)}: ${escapeHtml(stats.total)}</p>
          <p>${escapeHtml(t.activeCashboxes)}: ${escapeHtml(stats.active)}</p>
          <p>${escapeHtml(t.totalBalance)}: ${escapeHtml(formatMoney(stats.totalBalance))}</p>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.code)}</th>
                <th>${escapeHtml(t.cashbox)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.balance)}</th>
                <th>${escapeHtml(t.openingBalance)}</th>
                <th>${escapeHtml(t.default)}</th>
                <th>${escapeHtml(t.ledger)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.updatedAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.code)}</td>
                      <td>${escapeHtml(row.name)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.balance)}</td>
                      <td>${escapeHtml(row.openingBalance)}</td>
                      <td>${escapeHtml(row.default)}</td>
                      <td>${escapeHtml(row.ledger)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.updatedAt)}</td>
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
    link.download = `primey-care-cashboxes-${new Date().toISOString().slice(0, 10)}.xls`;
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
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.totalCashboxes)}</span><strong>${escapeHtml(stats.total)}</strong></div>
            <div class="box"><span>${escapeHtml(t.activeCashboxes)}</span><strong>${escapeHtml(stats.active)}</strong></div>
            <div class="box"><span>${escapeHtml(t.defaultCashboxes)}</span><strong>${escapeHtml(stats.defaults)}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalBalance)}</span><strong>${escapeHtml(formatMoney(stats.totalBalance))}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.code)}</th>
                <th>${escapeHtml(t.cashbox)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.balance)}</th>
                <th>${escapeHtml(t.openingBalance)}</th>
                <th>${escapeHtml(t.default)}</th>
                <th>${escapeHtml(t.ledger)}</th>
                <th>${escapeHtml(t.updatedAt)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.code)}</td>
                      <td>${escapeHtml(row.name)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.balance)}</td>
                      <td>${escapeHtml(row.openingBalance)}</td>
                      <td>${escapeHtml(row.default)}</td>
                      <td>${escapeHtml(row.ledger)}</td>
                      <td>${escapeHtml(row.updatedAt)}</td>
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
            <Link href="/system/treasury">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadCashboxes({ silent: true })}
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
          title={t.totalCashboxes}
          value={formatInteger(stats.total)}
          trend={`${t.activeCashboxes}: ${formatInteger(stats.active)}`}
          icon={Wallet}
        />

        <KpiCard
          title={t.defaultCashboxes}
          value={formatInteger(stats.defaults)}
          trend={`${t.inactive}: ${formatInteger(stats.inactive)}`}
          icon={Star}
        />

        <KpiCard
          title={t.totalBalance}
          value={<MoneyValue value={stats.totalBalance} label={t.sar} />}
          trend={`${t.positiveBalance}: ${formatInteger(stats.positive)}`}
          icon={WalletCards}
        />

        <KpiCard
          title={t.openingBalanceTotal}
          value={<MoneyValue value={stats.openingBalance} label={t.sar} />}
          trend={`${t.negativeBalance}: ${formatInteger(stats.negative)}`}
          icon={Banknote}
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
              onClick={() => void loadCashboxes()}
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
                onValueChange={(value) => setStatusFilter(value as CashboxStatus | "all")}
              >
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[155px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.status}: {t.all}</SelectItem>
                  <SelectItem value="active">{t.active}</SelectItem>
                  <SelectItem value="inactive">{t.inactive}</SelectItem>
                  <SelectItem value="archived">{t.archived}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={defaultFilter}
                onValueChange={(value) => setDefaultFilter(value as DefaultFilter)}
              >
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[165px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.defaultFilter}: {t.all}</SelectItem>
                  <SelectItem value="default">{t.defaultOnly}</SelectItem>
                  <SelectItem value="not_default">{t.notDefaultOnly}</SelectItem>
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
                  <SelectItem value="all">{t.balanceFilter}: {t.all}</SelectItem>
                  <SelectItem value="positive">{t.positiveOnly}</SelectItem>
                  <SelectItem value="zero">{t.zeroOnly}</SelectItem>
                  <SelectItem value="negative">{t.negativeOnly}</SelectItem>
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
                  <SelectItem value="name">{t.nameSort}</SelectItem>
                  <SelectItem value="code">{t.codeSort}</SelectItem>
                  <SelectItem value="balance_high">{t.balanceHigh}</SelectItem>
                  <SelectItem value="balance_low">{t.balanceLow}</SelectItem>
                  <SelectItem value="newest">{t.newest}</SelectItem>
                  <SelectItem value="oldest">{t.oldest}</SelectItem>
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
              <Table className="min-w-[1240px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    {columns.cashbox ? (
                      <TableHead className="h-11 w-[230px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.cashbox}
                      </TableHead>
                    ) : null}

                    {columns.status ? (
                      <TableHead className="h-11 w-[120px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.status}
                      </TableHead>
                    ) : null}

                    {columns.balance ? (
                      <TableHead className="h-11 w-[145px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.balance}
                      </TableHead>
                    ) : null}

                    {columns.openingBalance ? (
                      <TableHead className="h-11 w-[145px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.openingBalance}
                      </TableHead>
                    ) : null}

                    {columns.default ? (
                      <TableHead className="h-11 w-[110px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.default}
                      </TableHead>
                    ) : null}

                    {columns.ledger ? (
                      <TableHead className="h-11 w-[220px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.ledger}
                      </TableHead>
                    ) : null}

                    {columns.description ? (
                      <TableHead className="h-11 w-[220px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.description}
                      </TableHead>
                    ) : null}

                    {columns.updatedAt ? (
                      <TableHead className="h-11 w-[145px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.updatedAt}
                      </TableHead>
                    ) : null}

                    {columns.actions ? (
                      <TableHead className="h-11 w-[120px] whitespace-nowrap px-4 text-center text-xs font-semibold text-muted-foreground">
                        {t.actions}
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {pageRows.length ? (
                    pageRows.map((cashbox) => (
                      <TableRow key={cashbox.id || cashbox.code} className="h-[62px]">
                        {columns.cashbox ? (
                          <TableCell className="h-[62px] w-[230px] overflow-hidden px-4 text-right align-middle">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                                <Wallet className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-foreground">
                                  {cashbox.name || t.notAvailable}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground tabular-nums">
                                  {cashbox.code || t.notAvailable}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                        ) : null}

                        {columns.status ? (
                          <TableCell className="h-[62px] w-[120px] overflow-hidden px-4 text-right align-middle">
                            <StatusBadge status={cashbox.status} locale={locale} />
                          </TableCell>
                        ) : null}

                        {columns.balance ? (
                          <TableCell className="h-[62px] w-[145px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={cashbox.current_balance} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.openingBalance ? (
                          <TableCell className="h-[62px] w-[145px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={cashbox.opening_balance} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.default ? (
                          <TableCell className="h-[62px] w-[110px] overflow-hidden px-4 text-right align-middle">
                            <YesNoBadge value={cashbox.is_default} locale={locale} />
                          </TableCell>
                        ) : null}

                        {columns.ledger ? (
                          <TableCell className="h-[62px] w-[220px] overflow-hidden px-4 text-right align-middle">
                            <div className="min-w-0">
                              <span className="block truncate text-sm text-foreground">
                                {cashbox.ledger_account_name || t.notAvailable}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground tabular-nums">
                                {cashbox.ledger_account_code || t.notAvailable}
                              </span>
                            </div>
                          </TableCell>
                        ) : null}

                        {columns.description ? (
                          <TableCell className="h-[62px] w-[220px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm text-muted-foreground">
                              {cashbox.description || t.notAvailable}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.updatedAt ? (
                          <TableCell className="h-[62px] w-[145px] overflow-hidden px-4 text-right align-middle">
                            <span className="text-sm text-muted-foreground tabular-nums">
                              {formatDate(cashbox.updated_at)}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.actions ? (
                          <TableCell className="h-[62px] w-[120px] overflow-hidden px-4 text-center align-middle">
                            <div className="flex items-center justify-center gap-1">
                              <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
                                <Link href={`/system/treasury/statement?account_id=${encodeURIComponent(cashbox.id)}`}>
                                  <FileText className="h-4 w-4" />
                                </Link>
                              </Button>
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
                              {hasFilters ? t.noResultsTitle : t.noDataTitle}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {hasFilters ? t.noResultsDesc : t.noDataDesc}
                            </p>
                          </div>

                          {hasFilters ? (
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
                {formatInteger(filteredCashboxes.length)}
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
  );
}