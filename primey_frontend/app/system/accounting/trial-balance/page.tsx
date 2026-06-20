"use client";

/* ============================================================
   📂 app/system/accounting/trial-balance/page.tsx
   🧾 Primey Care — Trial Balance
   ------------------------------------------------------------
   ✅ Approved operational pattern
   ✅ Real API only:
      GET /api/accounting/accounts/?page=1&page_size=500
      GET /api/accounting/ledger/?page=1&page_size=500
   ✅ Fixed backend page_size error: max 500
   ✅ Builds trial balance locally from accounts + ledger
   ✅ Search / filters / columns / Excel / Print
   ✅ sonner + SAR icon + RTL/LTR
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
  CheckCircle2,
  FileSpreadsheet,
  Landmark,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
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
  count?: number;
  total?: number;
  total_count?: number;
  results?: unknown[];
  items?: unknown[];
  rows?: unknown[];
  data?: unknown;
};

type AccountRecord = {
  id: string;
  code: string;
  name: string;
  account_type: string;
  account_type_label: string;
  level: number;
  is_active: boolean;
  opening_balance: number;
  current_balance: number;
};

type LedgerRecord = {
  id: string;
  date: string | null;
  account_id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
};

type TrialBalanceRow = {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_type_label: string;
  level: number;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
  net_balance: number;
};

type Summary = {
  accounts_count: number;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
  difference: number;
};

type AccountTypeFilter =
  | "all"
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense";

type BalanceFilter = "all" | "balanced" | "unbalanced";
type SortKey =
  | "code"
  | "name"
  | "type"
  | "level"
  | "debit_high"
  | "credit_high"
  | "difference_high";

type ColumnKey =
  | "account"
  | "type"
  | "level"
  | "openingDebit"
  | "openingCredit"
  | "periodDebit"
  | "periodCredit"
  | "closingDebit"
  | "closingCredit"
  | "netBalance"
  | "balance";

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  account: true,
  type: true,
  level: true,
  openingDebit: true,
  openingCredit: true,
  periodDebit: true,
  periodCredit: true,
  closingDebit: true,
  closingCredit: true,
  netBalance: true,
  balance: true,
};

const translations = {
  ar: {
    title: "ميزان المراجعة",
    subtitle:
      "استعراض أرصدة الحسابات المدينة والدائنة والتأكد من توازن القيود حسب الفترة.",
    back: "المحاسبة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    from: "من",
    to: "إلى",
    all: "الكل",
    accountType: "نوع الحساب",
    balanceStatus: "التوازن",
    sort: "الترتيب",
    columns: "الأعمدة",
    searchPlaceholder: "ابحث بكود الحساب أو اسم الحساب أو النوع...",
    accountsCount: "عدد الحسابات",
    totalDebit: "إجمالي المدين",
    totalCredit: "إجمالي الدائن",
    difference: "فرق التوازن",
    account: "الحساب",
    type: "النوع",
    level: "المستوى",
    openingDebit: "افتتاحي مدين",
    openingCredit: "افتتاحي دائن",
    periodDebit: "حركة مدين",
    periodCredit: "حركة دائن",
    closingDebit: "ختامي مدين",
    closingCredit: "ختامي دائن",
    netBalance: "صافي الرصيد",
    balance: "التوازن",
    asset: "أصول",
    liability: "التزامات",
    equity: "حقوق ملكية",
    revenue: "إيرادات",
    expense: "مصروفات",
    balanced: "متوازن",
    unbalanced: "غير متوازن",
    codeSort: "كود الحساب",
    nameSort: "اسم الحساب",
    typeSort: "نوع الحساب",
    levelSort: "المستوى",
    debitHigh: "الأعلى مدين",
    creditHigh: "الأعلى دائن",
    differenceHigh: "الأعلى فرقًا",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    noDataTitle: "لا توجد بيانات",
    noDataDesc: "ستظهر بيانات ميزان المراجعة بعد وجود حسابات أو قيود محاسبية.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل ميزان المراجعة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث ميزان المراجعة.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير ميزان المراجعة",
    generatedAt: "تاريخ الطباعة",
    sar: "ر.س",
    unknown: "غير محدد",
  },
  en: {
    title: "Trial Balance",
    subtitle: "Review account debit and credit balances by period.",
    back: "Accounting",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    from: "From",
    to: "To",
    all: "All",
    accountType: "Account type",
    balanceStatus: "Balance",
    sort: "Sort",
    columns: "Columns",
    searchPlaceholder: "Search by account code, account name, or type...",
    accountsCount: "Accounts count",
    totalDebit: "Total debit",
    totalCredit: "Total credit",
    difference: "Difference",
    account: "Account",
    type: "Type",
    level: "Level",
    openingDebit: "Opening debit",
    openingCredit: "Opening credit",
    periodDebit: "Period debit",
    periodCredit: "Period credit",
    closingDebit: "Closing debit",
    closingCredit: "Closing credit",
    netBalance: "Net balance",
    balance: "Balance",
    asset: "Assets",
    liability: "Liabilities",
    equity: "Equity",
    revenue: "Revenue",
    expense: "Expenses",
    balanced: "Balanced",
    unbalanced: "Unbalanced",
    codeSort: "Account code",
    nameSort: "Account name",
    typeSort: "Account type",
    levelSort: "Level",
    debitHigh: "Highest debit",
    creditHigh: "Highest credit",
    differenceHigh: "Highest difference",
    showing: "Showing",
    of: "of",
    rows: "rows",
    noDataTitle: "No data",
    noDataDesc: "Trial balance data will appear after accounting accounts or entries exist.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load trial balance",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Trial balance refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Trial balance report",
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
    if (["1", "true", "yes", "on", "active", "posting"].includes(normalized)) return true;
    if (["0", "false", "no", "off", "inactive"].includes(normalized)) return false;
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
  if (Array.isArray(data.accounts)) return data.accounts;
  if (Array.isArray(data.ledger)) return data.ledger;
  if (Array.isArray(data.movements)) return data.movements;
  if (Array.isArray(data.entries)) return data.entries;

  return [];
}

function normalizeAccount(value: unknown): AccountRecord {
  const item = asRecord(value);
  const id = normalizeText(item.id || item.pk || item.uuid);

  return {
    id,
    code: normalizeText(item.code),
    name: normalizeText(item.name || item.name_ar || item.name_en || `#${id}`),
    account_type: normalizeText(item.account_type || item.type),
    account_type_label: normalizeText(item.account_type_label || item.account_type || item.type),
    level: toNumber(item.level, 1),
    is_active: toBoolean(item.is_active, true),
    opening_balance: toNumber(item.opening_balance),
    current_balance: toNumber(
      item.current_balance ??
        item.balance ??
        item.closing_balance ??
        item.net_balance ??
        item.opening_balance,
    ),
  };
}

function normalizeLedger(value: unknown): LedgerRecord {
  const item = asRecord(value);
  const entry = asRecord(item.entry || item.journal || item.journal_entry);
  const account = asRecord(item.account);

  return {
    id: normalizeText(item.id || item.pk || item.uuid),
    date:
      normalizeText(item.date || item.entry_date || item.posting_date || entry.entry_date) ||
      null,
    account_id: normalizeText(item.account_id || account.id),
    account_code: normalizeText(item.account_code || account.code),
    account_name: normalizeText(item.account_name || account.name || account.name_ar || account.name_en),
    debit: toNumber(item.debit ?? item.debit_amount ?? item.total_debit),
    credit: toNumber(item.credit ?? item.credit_amount ?? item.total_credit),
  };
}

function accountTypeLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const type = value.toLowerCase();

  if (type === "asset" || type === "assets") return t.asset;
  if (type === "liability" || type === "liabilities") return t.liability;
  if (type === "equity") return t.equity;
  if (type === "revenue" || type === "income") return t.revenue;
  if (type === "expense" || type === "expenses") return t.expense;

  return value || "—";
}

function accountTypeMatchesFilter(type: string, filter: AccountTypeFilter) {
  const normalized = type.toLowerCase();

  if (filter === "all") return true;
  if (filter === "asset") return normalized === "asset" || normalized === "assets";
  if (filter === "liability") return normalized === "liability" || normalized === "liabilities";
  if (filter === "expense") return normalized === "expense" || normalized === "expenses";
  if (filter === "revenue") return normalized === "revenue" || normalized === "income";
  return normalized === filter;
}

function buildTrialBalanceRows(accounts: AccountRecord[], ledgerRows: LedgerRecord[]) {
  const ledgerByAccount = new Map<string, { debit: number; credit: number }>();

  ledgerRows.forEach((row) => {
    const key = row.account_id || row.account_code || row.account_name;
    if (!key) return;

    const current = ledgerByAccount.get(key) || { debit: 0, credit: 0 };
    current.debit += row.debit;
    current.credit += row.credit;
    ledgerByAccount.set(key, current);
  });

  return accounts
    .filter((account) => account.is_active)
    .map((account) => {
      const key = account.id || account.code || account.name;
      const movement = ledgerByAccount.get(key) || { debit: 0, credit: 0 };

      const opening = account.opening_balance || 0;
      const openingDebit = opening >= 0 ? opening : 0;
      const openingCredit = opening < 0 ? Math.abs(opening) : 0;

      const net = openingDebit - openingCredit + movement.debit - movement.credit;
      const closingDebit = net >= 0 ? net : 0;
      const closingCredit = net < 0 ? Math.abs(net) : 0;

      return {
        id: account.id || account.code,
        account_id: account.id,
        account_code: account.code,
        account_name: account.name,
        account_type: account.account_type,
        account_type_label: account.account_type_label,
        level: account.level,
        opening_debit: openingDebit,
        opening_credit: openingCredit,
        period_debit: movement.debit,
        period_credit: movement.credit,
        closing_debit: closingDebit,
        closing_credit: closingCredit,
        net_balance: net,
      } satisfies TrialBalanceRow;
    });
}

function buildSummary(rows: TrialBalanceRow[]): Summary {
  const openingDebit = rows.reduce((sum, row) => sum + row.opening_debit, 0);
  const openingCredit = rows.reduce((sum, row) => sum + row.opening_credit, 0);
  const periodDebit = rows.reduce((sum, row) => sum + row.period_debit, 0);
  const periodCredit = rows.reduce((sum, row) => sum + row.period_credit, 0);
  const closingDebit = rows.reduce((sum, row) => sum + row.closing_debit, 0);
  const closingCredit = rows.reduce((sum, row) => sum + row.closing_credit, 0);

  return {
    accounts_count: rows.length,
    opening_debit: openingDebit,
    opening_credit: openingCredit,
    period_debit: periodDebit,
    period_credit: periodCredit,
    closing_debit: closingDebit,
    closing_credit: closingCredit,
    difference: Math.abs(closingDebit - closingCredit),
  };
}

function getBadgeClass(value: string) {
  const normalized = value.toLowerCase();

  if (["balanced", "asset", "revenue"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (["unbalanced"].includes(normalized)) {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (["liability", "equity"].includes(normalized)) {
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

function TrialBalanceSkeleton() {
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

export default function AccountingTrialBalancePage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [accounts, setAccounts] = React.useState<AccountRecord[]>([]);
  const [ledgerRows, setLedgerRows] = React.useState<LedgerRecord[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<AccountTypeFilter>("all");
  const [balanceFilter, setBalanceFilter] = React.useState<BalanceFilter>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("code");
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

  const loadTrialBalance = React.useCallback(
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

        const [accountsResult, ledgerResult] = await Promise.allSettled([
          fetchJson<ApiResponse>(
            makeApiUrl("/api/accounting/accounts/", params),
            controller.signal,
          ),
          fetchJson<ApiResponse>(
            makeApiUrl("/api/accounting/ledger/", params),
            controller.signal,
          ),
        ]);

        if (accountsResult.status === "rejected") {
          throw accountsResult.reason;
        }

        setAccounts(
          extractArray(accountsResult.value)
            .map(normalizeAccount)
            .filter((account) => account.is_active)
            .sort((a, b) => a.code.localeCompare(b.code)),
        );

        if (ledgerResult.status === "fulfilled") {
          setLedgerRows(extractArray(ledgerResult.value).map(normalizeLedger));
        } else {
          setLedgerRows([]);
        }

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
    void loadTrialBalance();
  }, [loadTrialBalance]);

  const dateFilteredLedgerRows = React.useMemo(() => {
    return ledgerRows.filter((row) => {
      const rowDate = formatDate(row.date);
      const matchesFrom = !dateFrom || (rowDate !== "—" && rowDate >= dateFrom);
      const matchesTo = !dateTo || (rowDate !== "—" && rowDate <= dateTo);

      return matchesFrom && matchesTo;
    });
  }, [dateFrom, dateTo, ledgerRows]);

  const rows = React.useMemo(() => {
    return buildTrialBalanceRows(accounts, dateFilteredLedgerRows);
  }, [accounts, dateFilteredLedgerRows]);

  const summary = React.useMemo(() => buildSummary(rows), [rows]);

  const filteredRows = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let result = rows.filter((row) => {
      const matchesSearch =
        !query ||
        row.account_code.toLowerCase().includes(query) ||
        row.account_name.toLowerCase().includes(query) ||
        row.account_type_label.toLowerCase().includes(query) ||
        row.account_type.toLowerCase().includes(query);

      const matchesType = accountTypeMatchesFilter(row.account_type, typeFilter);

      const rowDifference = Math.abs(row.closing_debit - row.closing_credit);
      const rowBalanced = rowDifference >= 0;

      const matchesBalance =
        balanceFilter === "all" ||
        (balanceFilter === "balanced" && rowBalanced) ||
        (balanceFilter === "unbalanced" && !rowBalanced);

      return matchesSearch && matchesType && matchesBalance;
    });

    result = [...result].sort((a, b) => {
      if (sortKey === "name") return a.account_name.localeCompare(b.account_name);
      if (sortKey === "type") return a.account_type.localeCompare(b.account_type);
      if (sortKey === "level") return a.level - b.level || a.account_code.localeCompare(b.account_code);
      if (sortKey === "debit_high") return b.closing_debit - a.closing_debit;
      if (sortKey === "credit_high") return b.closing_credit - a.closing_credit;
      if (sortKey === "difference_high") {
        return Math.abs(b.closing_debit - b.closing_credit) - Math.abs(a.closing_debit - a.closing_credit);
      }

      return a.account_code.localeCompare(b.account_code);
    });

    return result;
  }, [balanceFilter, rows, searchInput, sortKey, typeFilter]);

  const hasActiveFilters =
    Boolean(searchInput.trim()) ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    typeFilter !== "all" ||
    balanceFilter !== "all" ||
    sortKey !== "code";

  const visibleColumnCount = Object.values(columns).filter(Boolean).length;

  function resetFilters() {
    setSearchInput("");
    setDateFrom("");
    setDateTo("");
    setTypeFilter("all");
    setBalanceFilter("all");
    setSortKey("code");
  }

  function columnLabel(key: ColumnKey) {
    if (key === "account") return t.account;
    if (key === "type") return t.type;
    if (key === "level") return t.level;
    if (key === "openingDebit") return t.openingDebit;
    if (key === "openingCredit") return t.openingCredit;
    if (key === "periodDebit") return t.periodDebit;
    if (key === "periodCredit") return t.periodCredit;
    if (key === "closingDebit") return t.closingDebit;
    if (key === "closingCredit") return t.closingCredit;
    if (key === "netBalance") return t.netBalance;
    return t.balance;
  }

  function buildExportRows() {
    return filteredRows.map((row) => ({
      account: `${row.account_code ? `${row.account_code} — ` : ""}${row.account_name || "—"}`,
      type: accountTypeLabel(row.account_type_label || row.account_type, locale),
      level: row.level,
      openingDebit: formatMoney(row.opening_debit),
      openingCredit: formatMoney(row.opening_credit),
      periodDebit: formatMoney(row.period_debit),
      periodCredit: formatMoney(row.period_credit),
      closingDebit: formatMoney(row.closing_debit),
      closingCredit: formatMoney(row.closing_credit),
      netBalance: formatMoney(row.net_balance),
      balance: t.balanced,
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
          <p>${escapeHtml(t.from)}: ${escapeHtml(formatDate(dateFrom))} — ${escapeHtml(t.to)}: ${escapeHtml(formatDate(dateTo))}</p>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.account)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.level)}</th>
                <th>${escapeHtml(t.openingDebit)}</th>
                <th>${escapeHtml(t.openingCredit)}</th>
                <th>${escapeHtml(t.periodDebit)}</th>
                <th>${escapeHtml(t.periodCredit)}</th>
                <th>${escapeHtml(t.closingDebit)}</th>
                <th>${escapeHtml(t.closingCredit)}</th>
                <th>${escapeHtml(t.netBalance)}</th>
                <th>${escapeHtml(t.balance)}</th>
              </tr>
            </thead>
            <tbody>
              ${exportRows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.account)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.level)}</td>
                      <td>${escapeHtml(row.openingDebit)}</td>
                      <td>${escapeHtml(row.openingCredit)}</td>
                      <td>${escapeHtml(row.periodDebit)}</td>
                      <td>${escapeHtml(row.periodCredit)}</td>
                      <td>${escapeHtml(row.closingDebit)}</td>
                      <td>${escapeHtml(row.closingCredit)}</td>
                      <td>${escapeHtml(row.netBalance)}</td>
                      <td>${escapeHtml(row.balance)}</td>
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
    link.download = `primey-care-trial-balance-${new Date().toISOString().slice(0, 10)}.xls`;
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
              <p>${escapeHtml(t.from)}: ${escapeHtml(formatDate(dateFrom))} — ${escapeHtml(t.to)}: ${escapeHtml(formatDate(dateTo))}</p>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
            <div>
              <p>${escapeHtml(t.showing)}: ${escapeHtml(exportRows.length)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.totalDebit)}</span><strong>${escapeHtml(formatMoney(summary.closing_debit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalCredit)}</span><strong>${escapeHtml(formatMoney(summary.closing_credit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.difference)}</span><strong>${escapeHtml(formatMoney(summary.difference))}</strong></div>
            <div class="box"><span>${escapeHtml(t.accountsCount)}</span><strong>${escapeHtml(summary.accounts_count)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.account)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.level)}</th>
                <th>${escapeHtml(t.openingDebit)}</th>
                <th>${escapeHtml(t.openingCredit)}</th>
                <th>${escapeHtml(t.periodDebit)}</th>
                <th>${escapeHtml(t.periodCredit)}</th>
                <th>${escapeHtml(t.closingDebit)}</th>
                <th>${escapeHtml(t.closingCredit)}</th>
                <th>${escapeHtml(t.netBalance)}</th>
                <th>${escapeHtml(t.balance)}</th>
              </tr>
            </thead>
            <tbody>
              ${exportRows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.account)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.level)}</td>
                      <td>${escapeHtml(row.openingDebit)}</td>
                      <td>${escapeHtml(row.openingCredit)}</td>
                      <td>${escapeHtml(row.periodDebit)}</td>
                      <td>${escapeHtml(row.periodCredit)}</td>
                      <td>${escapeHtml(row.closingDebit)}</td>
                      <td>${escapeHtml(row.closingCredit)}</td>
                      <td>${escapeHtml(row.netBalance)}</td>
                      <td>${escapeHtml(row.balance)}</td>
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
        <TrialBalanceSkeleton />
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
            onClick={() => void loadTrialBalance({ silent: true })}
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
          title={t.totalDebit}
          value={<MoneyValue value={summary.closing_debit} label={t.sar} />}
          trend={t.closingDebit}
          icon={WalletCards}
        />

        <KpiCard
          title={t.totalCredit}
          value={<MoneyValue value={summary.closing_credit} label={t.sar} />}
          trend={t.closingCredit}
          icon={Landmark}
        />

        <KpiCard
          title={t.difference}
          value={<MoneyValue value={summary.difference} label={t.sar} />}
          trend={summary.difference < 0.01 ? t.balanced : t.unbalanced}
          icon={summary.difference < 0.01 ? CheckCircle2 : XCircle}
        />

        <KpiCard
          title={t.accountsCount}
          value={formatInteger(summary.accounts_count || rows.length)}
          trend={`${t.unbalanced}: ${summary.difference < 0.01 ? "0" : formatInteger(rows.length)}`}
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
              onClick={() => void loadTrialBalance()}
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
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as AccountTypeFilter)}
              >
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[165px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t.accountType}: {t.all}
                  </SelectItem>
                  <SelectItem value="asset">{t.asset}</SelectItem>
                  <SelectItem value="liability">{t.liability}</SelectItem>
                  <SelectItem value="equity">{t.equity}</SelectItem>
                  <SelectItem value="revenue">{t.revenue}</SelectItem>
                  <SelectItem value="expense">{t.expense}</SelectItem>
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
                  <SelectItem value="all">
                    {t.balanceStatus}: {t.all}
                  </SelectItem>
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
                  <SelectItem value="code">{t.codeSort}</SelectItem>
                  <SelectItem value="name">{t.nameSort}</SelectItem>
                  <SelectItem value="type">{t.typeSort}</SelectItem>
                  <SelectItem value="level">{t.levelSort}</SelectItem>
                  <SelectItem value="debit_high">{t.debitHigh}</SelectItem>
                  <SelectItem value="credit_high">{t.creditHigh}</SelectItem>
                  <SelectItem value="difference_high">{t.differenceHigh}</SelectItem>
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
              <Table className="min-w-[1380px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    {columns.account ? (
                      <TableHead className="h-11 w-[260px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.account}
                      </TableHead>
                    ) : null}

                    {columns.type ? (
                      <TableHead className="h-11 w-[140px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.type}
                      </TableHead>
                    ) : null}

                    {columns.level ? (
                      <TableHead className="h-11 w-[90px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.level}
                      </TableHead>
                    ) : null}

                    {columns.openingDebit ? (
                      <TableHead className="h-11 w-[135px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.openingDebit}
                      </TableHead>
                    ) : null}

                    {columns.openingCredit ? (
                      <TableHead className="h-11 w-[135px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.openingCredit}
                      </TableHead>
                    ) : null}

                    {columns.periodDebit ? (
                      <TableHead className="h-11 w-[135px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.periodDebit}
                      </TableHead>
                    ) : null}

                    {columns.periodCredit ? (
                      <TableHead className="h-11 w-[135px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.periodCredit}
                      </TableHead>
                    ) : null}

                    {columns.closingDebit ? (
                      <TableHead className="h-11 w-[135px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.closingDebit}
                      </TableHead>
                    ) : null}

                    {columns.closingCredit ? (
                      <TableHead className="h-11 w-[135px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.closingCredit}
                      </TableHead>
                    ) : null}

                    {columns.netBalance ? (
                      <TableHead className="h-11 w-[135px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.netBalance}
                      </TableHead>
                    ) : null}

                    {columns.balance ? (
                      <TableHead className="h-11 w-[115px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.balance}
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredRows.length ? (
                    filteredRows.map((row) => (
                      <TableRow key={row.id || row.account_code} className="h-[62px]">
                        {columns.account ? (
                          <TableCell className="h-[62px] w-[260px] overflow-hidden px-4 text-right align-middle">
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

                        {columns.type ? (
                          <TableCell className="h-[62px] w-[140px] overflow-hidden px-4 text-right align-middle">
                            <StatusBadge
                              value={row.account_type}
                              label={accountTypeLabel(
                                row.account_type_label || row.account_type,
                                locale,
                              )}
                            />
                          </TableCell>
                        ) : null}

                        {columns.level ? (
                          <TableCell className="h-[62px] w-[90px] overflow-hidden px-4 text-right align-middle">
                            <span className="text-sm font-medium tabular-nums">
                              {formatInteger(row.level)}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.openingDebit ? (
                          <TableCell className="h-[62px] w-[135px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={row.opening_debit} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.openingCredit ? (
                          <TableCell className="h-[62px] w-[135px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={row.opening_credit} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.periodDebit ? (
                          <TableCell className="h-[62px] w-[135px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={row.period_debit} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.periodCredit ? (
                          <TableCell className="h-[62px] w-[135px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={row.period_credit} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.closingDebit ? (
                          <TableCell className="h-[62px] w-[135px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={row.closing_debit} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.closingCredit ? (
                          <TableCell className="h-[62px] w-[135px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={row.closing_credit} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.netBalance ? (
                          <TableCell className="h-[62px] w-[135px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={row.net_balance} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.balance ? (
                          <TableCell className="h-[62px] w-[115px] overflow-hidden px-4 text-right align-middle">
                            <StatusBadge value="balanced" label={t.balanced} />
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