"use client";

/* ============================================================
   📂 app/system/treasury/statement/page.tsx
   🧠 Primey Care | Treasury Statement Page
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API:
      GET /api/treasury/transactions/
      GET /api/treasury/accounts/
   ✅ Account statement with running balance
   ✅ Search / account / type / status / date / sort
   ✅ Excel .xls HTML Workbook
   ✅ Web Print
   ✅ Skeleton Loading
   ✅ Error / Empty states
   ✅ sonner
   ✅ RTL/LTR through primey-locale
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost
   ✅ No fake data
   ✅ Create/save/confirm buttons rule: black primary only
============================================================ */

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Banknote,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  FileSpreadsheet,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
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
  rows?: unknown[];
  data?: unknown;
  summary?: unknown;
  message?: string;
  detail?: string;
  error?: string;
};

type TreasuryAccount = {
  id: string;
  name: string;
  code: string;
  account_type: string;
  account_type_label: string;
  current_balance: number;
  opening_balance: number;
  currency: string;
  status: string;
};

type TreasuryTransaction = {
  id: string;
  transaction_number: string;
  transaction_type: string;
  transaction_type_label: string;
  source: string;
  source_label: string;
  status: string;
  status_label: string;
  transaction_date: string | null;
  treasury_account_id: string;
  treasury_account_name: string;
  treasury_account_code: string;
  destination_account_id: string;
  destination_account_name: string;
  destination_account_code: string;
  amount: number;
  fees_amount: number;
  net_amount: number;
  currency: string;
  reference: string;
  source_number: string;
  party_name: string;
  description: string;
  balance_applied: boolean;
  created_at: string | null;
};

type StatementRow = TreasuryTransaction & {
  debit: number;
  credit: number;
  running_balance: number;
};

type StatusFilter = "all" | "draft" | "confirmed" | "cancelled";
type TypeFilter =
  | "all"
  | "income"
  | "expense"
  | "transfer"
  | "deposit"
  | "withdraw"
  | "opening_balance"
  | "refund"
  | "fee"
  | "adjustment";
type SortKey = "newest" | "oldest" | "amount_high" | "amount_low" | "number";

const API = {
  transactions: "/api/treasury/transactions/",
  accounts: "/api/treasury/accounts/",
};

const translations = {
  ar: {
    title: "كشف حساب الخزينة",
    subtitle: "كشف تفصيلي لحركات الخزينة حسب الحساب والفترة ونوع الحركة.",
    back: "الخزينة",
    transactions: "حركات الخزينة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    all: "الكل",
    from: "من",
    to: "إلى",

    openingBalance: "الرصيد الافتتاحي",
    totalDebit: "إجمالي المدين",
    totalCredit: "إجمالي الدائن",
    closingBalance: "الرصيد الختامي",

    statementTable: "جدول كشف الحساب",
    statementTableDesc: "الحركات المالية مع الرصيد الجاري بعد كل حركة.",
    searchPlaceholder: "ابحث برقم الحركة أو الحساب أو الطرف أو الوصف...",
    account: "الحساب",
    status: "الحالة",
    type: "نوع الحركة",
    sort: "الترتيب",

    number: "رقم الحركة",
    date: "التاريخ",
    movementType: "نوع الحركة",
    movementStatus: "الحالة",
    treasuryAccount: "حساب الخزينة",
    party: "الطرف",
    description: "الوصف",
    debit: "مدين",
    credit: "دائن",
    runningBalance: "الرصيد الجاري",
    reference: "المرجع",

    draft: "مسودة",
    confirmed: "مؤكدة",
    cancelled: "ملغاة",
    income: "قبض",
    expense: "صرف",
    transfer: "تحويل",
    deposit: "إيداع",
    withdraw: "سحب",
    openingBalanceType: "رصيد افتتاحي",
    refund: "استرداد",
    fee: "رسوم",
    adjustment: "تسوية",

    newest: "الأحدث",
    oldest: "الأقدم",
    amountHigh: "الأعلى مبلغًا",
    amountLow: "الأقل مبلغًا",
    numberSort: "رقم الحركة",

    showing: "عرض",
    of: "من",
    rows: "صفوف",

    errorTitle: "تعذر تحميل كشف الحساب",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث كشف الحساب.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "كشف حساب الخزينة",
    generatedAt: "تاريخ الطباعة",
    noDataTitle: "لا توجد حركات خزينة",
    noDataDesc: "ستظهر حركات كشف الحساب هنا بعد تسجيلها.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    notAvailable: "—",
    sar: "ر.س",
  },
  en: {
    title: "Treasury Statement",
    subtitle: "Detailed treasury statement by account, date range, and movement type.",
    back: "Treasury",
    transactions: "Treasury transactions",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    all: "All",
    from: "From",
    to: "To",

    openingBalance: "Opening balance",
    totalDebit: "Total debit",
    totalCredit: "Total credit",
    closingBalance: "Closing balance",

    statementTable: "Statement table",
    statementTableDesc: "Financial movements with running balance after each transaction.",
    searchPlaceholder: "Search by transaction number, account, party, or description...",
    account: "Account",
    status: "Status",
    type: "Type",
    sort: "Sort",

    number: "Transaction number",
    date: "Date",
    movementType: "Type",
    movementStatus: "Status",
    treasuryAccount: "Treasury account",
    party: "Party",
    description: "Description",
    debit: "Debit",
    credit: "Credit",
    runningBalance: "Running balance",
    reference: "Reference",

    draft: "Draft",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    income: "Income",
    expense: "Expense",
    transfer: "Transfer",
    deposit: "Deposit",
    withdraw: "Withdraw",
    openingBalanceType: "Opening balance",
    refund: "Refund",
    fee: "Fee",
    adjustment: "Adjustment",

    newest: "Newest",
    oldest: "Oldest",
    amountHigh: "Highest amount",
    amountLow: "Lowest amount",
    numberSort: "Transaction number",

    showing: "Showing",
    of: "of",
    rows: "rows",

    errorTitle: "Unable to load statement",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Treasury statement refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Treasury statement",
    generatedAt: "Generated at",
    noDataTitle: "No treasury transactions",
    noDataDesc: "Statement movements will appear here once recorded.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    notAvailable: "—",
    sar: "SAR",
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
    if (["1", "true", "yes", "on", "applied", "confirmed"].includes(normalized)) return true;
    if (["0", "false", "no", "off", "draft", "cancelled"].includes(normalized)) return false;
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
  if (Array.isArray(data.transactions)) return data.transactions;

  return [];
}

function normalizeAccount(value: unknown): TreasuryAccount {
  const item = asRecord(value);

  return {
    id: normalizeText(item.id || item.pk || item.uuid),
    name: normalizeText(item.name || item.title),
    code: normalizeText(item.code || item.number),
    account_type: normalizeText(item.account_type || item.type),
    account_type_label: normalizeText(item.account_type_label || item.type_label),
    current_balance: toNumber(item.current_balance ?? item.balance),
    opening_balance: toNumber(item.opening_balance),
    currency: normalizeText(item.currency || "SAR"),
    status: normalizeText(item.status || "active"),
  };
}

function normalizeTransaction(value: unknown): TreasuryTransaction {
  const item = asRecord(value);
  const account = asRecord(item.treasury_account || item.account);
  const destination = asRecord(item.destination_account || item.to_account);

  return {
    id: normalizeText(item.id || item.pk || item.uuid),
    transaction_number: normalizeText(item.transaction_number || item.number || item.reference),
    transaction_type: normalizeText(item.transaction_type || item.type || "adjustment"),
    transaction_type_label: normalizeText(item.transaction_type_label || item.type_label),
    source: normalizeText(item.source),
    source_label: normalizeText(item.source_label),
    status: normalizeText(item.status || "draft").toLowerCase(),
    status_label: normalizeText(item.status_label),
    transaction_date:
      normalizeText(item.transaction_date || item.date || item.created_at) || null,
    treasury_account_id: normalizeText(item.treasury_account_id || item.account_id || account.id || account.pk),
    treasury_account_name: normalizeText(account.name || item.treasury_account_name || item.account_name),
    treasury_account_code: normalizeText(account.code || item.treasury_account_code || item.account_code),
    destination_account_id: normalizeText(item.destination_account_id || item.to_account_id || destination.id || destination.pk),
    destination_account_name: normalizeText(destination.name || item.destination_account_name || item.to_account_name),
    destination_account_code: normalizeText(destination.code || item.destination_account_code || item.to_account_code),
    amount: toNumber(item.amount),
    fees_amount: toNumber(item.fees_amount || item.fee_amount),
    net_amount: toNumber(item.net_amount ?? item.amount),
    currency: normalizeText(item.currency || "SAR"),
    reference: normalizeText(item.reference || item.external_reference),
    source_number: normalizeText(item.source_number || item.source_reference),
    party_name: normalizeText(item.party_name),
    description: normalizeText(item.description || item.notes),
    balance_applied: toBoolean(item.balance_applied || item.is_balance_applied),
    created_at: normalizeText(item.created_at) || null,
  };
}

function statusLabel(status: string, locale: Locale) {
  const t = translations[locale];

  if (status === "confirmed") return t.confirmed;
  if (status === "cancelled") return t.cancelled;

  return t.draft;
}

function typeLabel(type: string, locale: Locale) {
  const t = translations[locale];

  if (type === "income") return t.income;
  if (type === "expense") return t.expense;
  if (type === "transfer") return t.transfer;
  if (type === "deposit") return t.deposit;
  if (type === "withdraw") return t.withdraw;
  if (type === "opening_balance") return t.openingBalanceType;
  if (type === "refund") return t.refund;
  if (type === "fee") return t.fee;
  if (type === "adjustment") return t.adjustment;

  return type || t.notAvailable;
}

function statusClass(status: string) {
  if (status === "confirmed") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (status === "cancelled") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
}

function typeClass(type: string) {
  if (["income", "deposit", "opening_balance"].includes(type)) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (["expense", "withdraw", "refund", "fee"].includes(type)) {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (type === "transfer") {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  return "border-violet-500/30 bg-violet-50 text-violet-700 hover:bg-violet-50";
}

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", statusClass(status))}
    >
      {statusLabel(status, locale)}
    </Badge>
  );
}

function TypeBadge({ type, locale }: { type: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", typeClass(type))}
    >
      {typeLabel(type, locale)}
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
          <Skeleton className="h-8 w-64" />
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

export default function TreasuryStatementPage() {
  const searchParams = useSearchParams();

  const [locale, setLocale] = React.useState<Locale>("ar");
  const [accounts, setAccounts] = React.useState<TreasuryAccount[]>([]);
  const [transactions, setTransactions] = React.useState<TreasuryTransaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [accountFilter, setAccountFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("newest");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  React.useEffect(() => {
    const urlAccountId = searchParams.get("account_id") || searchParams.get("account") || "";
    if (urlAccountId) setAccountFilter(urlAccountId);
  }, [searchParams]);

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

  const loadStatement = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const transactionParams = new URLSearchParams({
          page: "1",
          page_size: "1000",
          ordering: "transaction_date",
        });

        if (dateFrom) transactionParams.set("date_from", dateFrom);
        if (dateTo) transactionParams.set("date_to", dateTo);

        const accountParams = new URLSearchParams({
          page: "1",
          page_size: "500",
          ordering: "account_type",
        });

        const [transactionsPayload, accountsPayload] = await Promise.all([
          fetchJson<ApiResponse>(makeApiUrl(API.transactions, transactionParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(API.accounts, accountParams), controller.signal).catch(() => null),
        ]);

        const nextTransactions = extractItems(transactionsPayload)
          .map(normalizeTransaction)
          .filter((row) => row.id || row.transaction_number);

        const nextAccounts = extractItems(accountsPayload)
          .map(normalizeAccount)
          .filter((row) => row.id || row.name || row.code);

        setTransactions(nextTransactions);
        setAccounts(nextAccounts);

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
    [dateFrom, dateTo, t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadStatement();
  }, [loadStatement]);

  const selectedAccount = React.useMemo(() => {
    return accounts.find((account) => account.id === accountFilter) || null;
  }, [accountFilter, accounts]);

  const statementRows = React.useMemo<StatementRow[]>(() => {
    const query = searchInput.trim().toLowerCase();

    const filtered = transactions.filter((transaction) => {
      const rowDate = formatDate(transaction.transaction_date).slice(0, 10);

      const matchesSearch =
        !query ||
        transaction.transaction_number.toLowerCase().includes(query) ||
        transaction.treasury_account_name.toLowerCase().includes(query) ||
        transaction.destination_account_name.toLowerCase().includes(query) ||
        transaction.party_name.toLowerCase().includes(query) ||
        transaction.description.toLowerCase().includes(query) ||
        transaction.reference.toLowerCase().includes(query) ||
        transaction.source_number.toLowerCase().includes(query);

      const matchesAccount =
        accountFilter === "all" ||
        transaction.treasury_account_id === accountFilter ||
        transaction.destination_account_id === accountFilter;

      const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
      const matchesType = typeFilter === "all" || transaction.transaction_type === typeFilter;
      const matchesFrom = !dateFrom || rowDate >= dateFrom;
      const matchesTo = !dateTo || rowDate <= dateTo;

      return matchesSearch && matchesAccount && matchesStatus && matchesType && matchesFrom && matchesTo;
    });

    const chronological = [...filtered].sort((a, b) => {
      const aDate = String(a.transaction_date || a.created_at || "");
      const bDate = String(b.transaction_date || b.created_at || "");
      return aDate.localeCompare(bDate);
    });

    const openingBalance = selectedAccount ? selectedAccount.opening_balance : 0;
    let runningBalance = openingBalance;

    const rows = chronological.map((transaction) => {
      const type = transaction.transaction_type;
      const isDestination =
        accountFilter !== "all" && transaction.destination_account_id === accountFilter;
      const isSource =
        accountFilter === "all" || transaction.treasury_account_id === accountFilter;

      let debit = 0;
      let credit = 0;

      if (type === "transfer") {
        if (isDestination) debit = transaction.net_amount;
        else if (isSource) credit = transaction.net_amount;
      } else if (["income", "deposit", "opening_balance"].includes(type)) {
        debit = transaction.net_amount;
      } else if (["expense", "withdraw", "refund", "fee"].includes(type)) {
        credit = transaction.net_amount;
      } else if (type === "adjustment") {
        if (transaction.net_amount >= 0) debit = transaction.net_amount;
        else credit = Math.abs(transaction.net_amount);
      }

      runningBalance = runningBalance + debit - credit;

      return {
        ...transaction,
        debit,
        credit,
        running_balance: runningBalance,
      };
    });

    const sorted = [...rows].sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.transaction_date || a.created_at || "").localeCompare(
          String(b.transaction_date || b.created_at || ""),
        );
      }

      if (sortKey === "amount_high") return Math.abs(b.net_amount) - Math.abs(a.net_amount);
      if (sortKey === "amount_low") return Math.abs(a.net_amount) - Math.abs(b.net_amount);
      if (sortKey === "number") return a.transaction_number.localeCompare(b.transaction_number);

      return String(b.transaction_date || b.created_at || "").localeCompare(
        String(a.transaction_date || a.created_at || ""),
      );
    });

    return sorted;
  }, [
    accountFilter,
    dateFrom,
    dateTo,
    searchInput,
    selectedAccount,
    sortKey,
    statusFilter,
    transactions,
    typeFilter,
  ]);

  const openingBalance = selectedAccount ? selectedAccount.opening_balance : 0;
  const totalDebit = statementRows.reduce((sum, row) => sum + row.debit, 0);
  const totalCredit = statementRows.reduce((sum, row) => sum + row.credit, 0);
  const closingBalance = openingBalance + totalDebit - totalCredit;

  const hasFilters =
    Boolean(searchInput.trim()) ||
    accountFilter !== "all" ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    sortKey !== "newest";

  function resetFilters() {
    setSearchInput("");
    setAccountFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortKey("newest");
  }

  function buildExportRows() {
    return statementRows.map((row) => ({
      number: row.transaction_number || t.notAvailable,
      date: formatDate(row.transaction_date),
      type: row.transaction_type_label || typeLabel(row.transaction_type, locale),
      status: row.status_label || statusLabel(row.status, locale),
      account: row.treasury_account_name || t.notAvailable,
      party: row.party_name || t.notAvailable,
      description: row.description || t.notAvailable,
      reference: row.reference || row.source_number || t.notAvailable,
      debit: formatMoney(row.debit),
      credit: formatMoney(row.credit),
      runningBalance: formatMoney(row.running_balance),
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
          <p>${escapeHtml(t.account)}: ${escapeHtml(selectedAccount?.name || t.all)}</p>
          <p>${escapeHtml(t.openingBalance)}: ${escapeHtml(formatMoney(openingBalance))}</p>
          <p>${escapeHtml(t.totalDebit)}: ${escapeHtml(formatMoney(totalDebit))}</p>
          <p>${escapeHtml(t.totalCredit)}: ${escapeHtml(formatMoney(totalCredit))}</p>
          <p>${escapeHtml(t.closingBalance)}: ${escapeHtml(formatMoney(closingBalance))}</p>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.number)}</th>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.movementType)}</th>
                <th>${escapeHtml(t.movementStatus)}</th>
                <th>${escapeHtml(t.treasuryAccount)}</th>
                <th>${escapeHtml(t.party)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.reference)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
                <th>${escapeHtml(t.runningBalance)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.number)}</td>
                      <td>${escapeHtml(row.date)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.account)}</td>
                      <td>${escapeHtml(row.party)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.reference)}</td>
                      <td>${escapeHtml(row.debit)}</td>
                      <td>${escapeHtml(row.credit)}</td>
                      <td>${escapeHtml(row.runningBalance)}</td>
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
    link.download = `primey-care-treasury-statement-${new Date().toISOString().slice(0, 10)}.xls`;
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
              <p>${escapeHtml(t.account)}: ${escapeHtml(selectedAccount?.name || t.all)}</p>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.openingBalance)}</span><strong>${escapeHtml(formatMoney(openingBalance))}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalDebit)}</span><strong>${escapeHtml(formatMoney(totalDebit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalCredit)}</span><strong>${escapeHtml(formatMoney(totalCredit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.closingBalance)}</span><strong>${escapeHtml(formatMoney(closingBalance))}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.number)}</th>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.movementType)}</th>
                <th>${escapeHtml(t.treasuryAccount)}</th>
                <th>${escapeHtml(t.party)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
                <th>${escapeHtml(t.runningBalance)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.number)}</td>
                      <td>${escapeHtml(row.date)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.account)}</td>
                      <td>${escapeHtml(row.party)}</td>
                      <td>${escapeHtml(row.debit)}</td>
                      <td>${escapeHtml(row.credit)}</td>
                      <td>${escapeHtml(row.runningBalance)}</td>
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

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/treasury/transactions">
              <WalletCards className="h-4 w-4" />
              {t.transactions}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadStatement({ silent: true })}
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
          value={<MoneyValue value={openingBalance} label={t.sar} />}
          trend={selectedAccount?.name || t.all}
          icon={CalendarDays}
        />

        <KpiCard
          title={t.totalDebit}
          value={<MoneyValue value={totalDebit} label={t.sar} />}
          trend={t.debit}
          icon={Banknote}
        />

        <KpiCard
          title={t.totalCredit}
          value={<MoneyValue value={totalCredit} label={t.sar} />}
          trend={t.credit}
          icon={CreditCard}
        />

        <KpiCard
          title={t.closingBalance}
          value={<MoneyValue value={closingBalance} label={t.sar} />}
          trend={`${t.rows}: ${formatInteger(statementRows.length)}`}
          icon={CircleDollarSign}
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
              onClick={() => void loadStatement()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
        <CardHeader className="px-6 py-5">
          <CardTitle>{t.statementTable}</CardTitle>
          <CardDescription>{t.statementTableDesc}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 p-4">
          <div className="grid gap-2 xl:grid-cols-[1fr_160px_160px]">
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

            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 rounded-lg bg-background"
              title={t.from}
            />

            <Input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-10 rounded-lg bg-background"
              title={t.to}
            />
          </div>

          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.account}: {t.all}</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id || account.code} value={account.id || account.code}>
                      {account.code ? `${account.code} — ${account.name}` : account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[155px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.status}: {t.all}</SelectItem>
                  <SelectItem value="draft">{t.draft}</SelectItem>
                  <SelectItem value="confirmed">{t.confirmed}</SelectItem>
                  <SelectItem value="cancelled">{t.cancelled}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.type}: {t.all}</SelectItem>
                  <SelectItem value="income">{t.income}</SelectItem>
                  <SelectItem value="expense">{t.expense}</SelectItem>
                  <SelectItem value="transfer">{t.transfer}</SelectItem>
                  <SelectItem value="deposit">{t.deposit}</SelectItem>
                  <SelectItem value="withdraw">{t.withdraw}</SelectItem>
                  <SelectItem value="opening_balance">{t.openingBalanceType}</SelectItem>
                  <SelectItem value="refund">{t.refund}</SelectItem>
                  <SelectItem value="fee">{t.fee}</SelectItem>
                  <SelectItem value="adjustment">{t.adjustment}</SelectItem>
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
                  <SelectItem value="number">{t.numberSort}</SelectItem>
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
                    <TableHead className="h-11 w-[170px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.number}
                    </TableHead>
                    <TableHead className="h-11 w-[140px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.date}
                    </TableHead>
                    <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.movementType}
                    </TableHead>
                    <TableHead className="h-11 w-[115px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.movementStatus}
                    </TableHead>
                    <TableHead className="h-11 w-[220px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.treasuryAccount}
                    </TableHead>
                    <TableHead className="h-11 w-[150px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.party}
                    </TableHead>
                    <TableHead className="h-11 w-[220px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.description}
                    </TableHead>
                    <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.debit}
                    </TableHead>
                    <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.credit}
                    </TableHead>
                    <TableHead className="h-11 w-[145px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.runningBalance}
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {statementRows.length ? (
                    statementRows.map((row) => (
                      <TableRow key={row.id || row.transaction_number} className="h-[62px]">
                        <TableCell className="h-[62px] w-[170px] overflow-hidden px-4 text-right align-middle">
                          <Link
                            href={`/system/treasury/transactions/${encodeURIComponent(row.id)}`}
                            className="block truncate text-sm font-semibold text-foreground tabular-nums hover:underline"
                          >
                            {row.transaction_number || t.notAvailable}
                          </Link>
                          <span className="block truncate text-xs text-muted-foreground">
                            {row.reference || row.source_number || t.notAvailable}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[140px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm tabular-nums text-muted-foreground">
                            {formatDate(row.transaction_date)}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                          <TypeBadge type={row.transaction_type} locale={locale} />
                        </TableCell>

                        <TableCell className="h-[62px] w-[115px] overflow-hidden px-4 text-right align-middle">
                          <StatusBadge status={row.status} locale={locale} />
                        </TableCell>

                        <TableCell className="h-[62px] w-[220px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {row.treasury_account_name || t.notAvailable}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground tabular-nums">
                            {row.treasury_account_code || row.destination_account_name || t.notAvailable}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[150px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm text-muted-foreground">
                            {row.party_name || t.notAvailable}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[220px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm text-muted-foreground">
                            {row.description || t.notAvailable}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                          <MoneyValue value={row.debit} label={t.sar} />
                        </TableCell>

                        <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                          <MoneyValue value={row.credit} label={t.sar} />
                        </TableCell>

                        <TableCell className="h-[62px] w-[145px] overflow-hidden px-4 text-right align-middle">
                          <MoneyValue value={row.running_balance} label={t.sar} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="h-72">
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

          <div className="text-sm text-muted-foreground">
            {t.showing}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatInteger(statementRows.length)}
            </span>{" "}
            {t.of}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatInteger(transactions.length)}
            </span>{" "}
            {t.rows}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}