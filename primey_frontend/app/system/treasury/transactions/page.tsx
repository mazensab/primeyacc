"use client";

/* ============================================================
   📂 app/system/treasury/transactions/page.tsx
   🧠 Primey Care | Treasury Transactions Page
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API:
      GET /api/treasury/transactions/
      GET /api/treasury/accounts/
   ✅ Treasury transactions KPI cards
   ✅ Search / status / type / account / date / columns / pagination
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
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  FileSpreadsheet,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Tags,
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
  pagination?: unknown;
  message?: string;
  detail?: string;
  error?: string;
};

type TreasuryAccount = {
  id: string;
  name: string;
  code: string;
  account_type: string;
  current_balance: number;
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
  destination_account_id: string;
  destination_account_name: string;
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

type Stats = {
  total: number;
  confirmed: number;
  draft: number;
  cancelled: number;
  incomeTotal: number;
  expenseTotal: number;
  transferTotal: number;
  feesTotal: number;
  netTotal: number;
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
type BalanceFilter = "all" | "applied" | "not_applied";
type SortKey = "newest" | "oldest" | "amount_high" | "amount_low" | "number";

type ColumnKey =
  | "number"
  | "date"
  | "type"
  | "status"
  | "account"
  | "party"
  | "description"
  | "amount"
  | "fees"
  | "net"
  | "balanceApplied"
  | "actions";

const API = {
  transactions: "/api/treasury/transactions/",
  accounts: "/api/treasury/accounts/",
};

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  number: true,
  date: true,
  type: true,
  status: true,
  account: true,
  party: true,
  description: true,
  amount: true,
  fees: true,
  net: true,
  balanceApplied: true,
  actions: true,
};

const translations = {
  ar: {
    title: "حركات الخزينة",
    subtitle: "إدارة واستعراض كل حركات الخزينة من قبض وصرف وتحويل وتسويات.",
    back: "الخزينة",
    create: "حركة جديدة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    open: "فتح",
    all: "الكل",
    from: "من",
    to: "إلى",

    totalTransactions: "إجمالي الحركات",
    confirmedTransactions: "الحركات المؤكدة",
    draftTransactions: "المسودات",
    cancelledTransactions: "الملغاة",
    incomeTotal: "المقبوضات",
    expenseTotal: "المصروفات",
    transferTotal: "التحويلات",
    feesTotal: "الرسوم",
    netTotal: "الصافي",

    searchPlaceholder: "ابحث برقم الحركة أو الحساب أو الطرف أو الوصف...",
    status: "الحالة",
    type: "نوع الحركة",
    account: "الحساب",
    balanceImpact: "أثر الرصيد",
    sort: "الترتيب",
    columns: "الأعمدة",
    rowsPerPage: "عدد الصفوف",

    number: "رقم الحركة",
    date: "التاريخ",
    source: "المصدر",
    party: "الطرف",
    description: "الوصف",
    amount: "المبلغ",
    fees: "الرسوم",
    net: "الصافي",
    balanceApplied: "أثر الرصيد",
    actions: "الإجراءات",

    draft: "مسودة",
    confirmed: "مؤكدة",
    cancelled: "ملغاة",
    income: "قبض",
    expense: "صرف",
    transfer: "تحويل",
    deposit: "إيداع",
    withdraw: "سحب",
    openingBalance: "رصيد افتتاحي",
    refund: "استرداد",
    fee: "رسوم",
    adjustment: "تسوية",
    applied: "مطبق",
    notApplied: "غير مطبق",

    newest: "الأحدث",
    oldest: "الأقدم",
    amountHigh: "الأعلى مبلغًا",
    amountLow: "الأقل مبلغًا",
    numberSort: "رقم الحركة",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    page: "صفحة",
    previous: "السابق",
    next: "التالي",

    errorTitle: "تعذر تحميل حركات الخزينة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث حركات الخزينة.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير حركات الخزينة",
    generatedAt: "تاريخ الطباعة",
    noDataTitle: "لا توجد حركات خزينة",
    noDataDesc: "ستظهر حركات الخزينة هنا بعد تسجيلها.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    sar: "ر.س",
    notAvailable: "—",
  },
  en: {
    title: "Treasury Transactions",
    subtitle: "Manage and review all treasury income, expense, transfer, and adjustment movements.",
    back: "Treasury",
    create: "New transaction",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    open: "Open",
    all: "All",
    from: "From",
    to: "To",

    totalTransactions: "Total transactions",
    confirmedTransactions: "Confirmed transactions",
    draftTransactions: "Drafts",
    cancelledTransactions: "Cancelled",
    incomeTotal: "Income",
    expenseTotal: "Expenses",
    transferTotal: "Transfers",
    feesTotal: "Fees",
    netTotal: "Net total",

    searchPlaceholder: "Search by transaction number, account, party, or description...",
    status: "Status",
    type: "Type",
    account: "Account",
    balanceImpact: "Balance impact",
    sort: "Sort",
    columns: "Columns",
    rowsPerPage: "Rows per page",

    number: "Transaction number",
    date: "Date",
    source: "Source",
    party: "Party",
    description: "Description",
    amount: "Amount",
    fees: "Fees",
    net: "Net",
    balanceApplied: "Balance impact",
    actions: "Actions",

    draft: "Draft",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    income: "Income",
    expense: "Expense",
    transfer: "Transfer",
    deposit: "Deposit",
    withdraw: "Withdraw",
    openingBalance: "Opening balance",
    refund: "Refund",
    fee: "Fee",
    adjustment: "Adjustment",
    applied: "Applied",
    notApplied: "Not applied",

    newest: "Newest",
    oldest: "Oldest",
    amountHigh: "Highest amount",
    amountLow: "Lowest amount",
    numberSort: "Transaction number",

    showing: "Showing",
    of: "of",
    rows: "rows",
    page: "Page",
    previous: "Previous",
    next: "Next",

    errorTitle: "Unable to load treasury transactions",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Treasury transactions refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Treasury transactions report",
    generatedAt: "Generated at",
    noDataTitle: "No treasury transactions",
    noDataDesc: "Treasury transactions will appear here once recorded.",
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
  if (Array.isArray(data.transactions)) return data.transactions;
  if (Array.isArray(data.accounts)) return data.accounts;

  return [];
}

function normalizeAccount(value: unknown): TreasuryAccount {
  const item = asRecord(value);

  return {
    id: normalizeText(item.id || item.pk || item.uuid),
    name: normalizeText(item.name || item.title),
    code: normalizeText(item.code || item.number),
    account_type: normalizeText(item.account_type || item.type),
    current_balance: toNumber(item.current_balance ?? item.balance),
  };
}

function normalizeTransaction(value: unknown): TreasuryTransaction {
  const item = asRecord(value);
  const account = asRecord(item.treasury_account);
  const destination = asRecord(item.destination_account);

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
    treasury_account_id: normalizeText(item.treasury_account_id || account.id || account.pk),
    treasury_account_name: normalizeText(account.name || item.treasury_account_name),
    destination_account_id: normalizeText(item.destination_account_id || destination.id || destination.pk),
    destination_account_name: normalizeText(destination.name || item.destination_account_name),
    amount: toNumber(item.amount),
    fees_amount: toNumber(item.fees_amount),
    net_amount: toNumber(item.net_amount ?? item.amount),
    currency: normalizeText(item.currency || "SAR"),
    reference: normalizeText(item.reference || item.external_reference),
    source_number: normalizeText(item.source_number || item.source_reference),
    party_name: normalizeText(item.party_name),
    description: normalizeText(item.description || item.notes),
    balance_applied: toBoolean(item.balance_applied),
    created_at: normalizeText(item.created_at) || null,
  };
}

function buildStats(payload: ApiResponse | null, rows: TreasuryTransaction[]): Stats {
  const summary = extractSummary(payload);

  const incomeTotal =
    toNumber(summary.income_total) ||
    rows
      .filter((row) => ["income", "deposit", "opening_balance"].includes(row.transaction_type))
      .reduce((sum, row) => sum + row.net_amount, 0);

  const expenseTotal =
    toNumber(summary.expense_total) ||
    rows
      .filter((row) => ["expense", "withdraw", "refund", "fee"].includes(row.transaction_type))
      .reduce((sum, row) => sum + row.net_amount, 0);

  const transferTotal =
    toNumber(summary.transfer_total) ||
    rows
      .filter((row) => row.transaction_type === "transfer")
      .reduce((sum, row) => sum + row.net_amount, 0);

  const feesTotal =
    toNumber(summary.fees_total) ||
    rows.reduce((sum, row) => sum + row.fees_amount, 0);

  return {
    total: toNumber(summary.total_transactions ?? payload?.count, rows.length),
    confirmed: toNumber(
      summary.confirmed_transactions,
      rows.filter((row) => row.status === "confirmed").length,
    ),
    draft: toNumber(
      summary.draft_transactions,
      rows.filter((row) => row.status === "draft").length,
    ),
    cancelled: toNumber(
      summary.cancelled_transactions,
      rows.filter((row) => row.status === "cancelled").length,
    ),
    incomeTotal,
    expenseTotal,
    transferTotal,
    feesTotal,
    netTotal: toNumber(summary.net_total, incomeTotal - expenseTotal - feesTotal),
  };
}

function typeLabel(type: string, locale: Locale) {
  const t = translations[locale];
  const normalized = type.toLowerCase();

  if (normalized === "income") return t.income;
  if (normalized === "expense") return t.expense;
  if (normalized === "transfer") return t.transfer;
  if (normalized === "deposit") return t.deposit;
  if (normalized === "withdraw") return t.withdraw;
  if (normalized === "opening_balance") return t.openingBalance;
  if (normalized === "refund") return t.refund;
  if (normalized === "fee") return t.fee;
  if (normalized === "adjustment") return t.adjustment;

  return type || t.notAvailable;
}

function statusLabel(status: string, locale: Locale) {
  const t = translations[locale];
  const normalized = status.toLowerCase();

  if (normalized === "confirmed") return t.confirmed;
  if (normalized === "cancelled") return t.cancelled;

  return t.draft;
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "confirmed") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (normalized === "cancelled") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
}

function typeClass(type: string) {
  const normalized = type.toLowerCase();

  if (["income", "deposit", "opening_balance"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (["expense", "withdraw", "refund", "fee"].includes(normalized)) {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (normalized === "transfer") {
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

function AppliedBadge({ value, locale }: { value: boolean; locale: Locale }) {
  const t = translations[locale];

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        value
          ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
          : "border-slate-500/30 bg-slate-50 text-slate-700 hover:bg-slate-50",
      )}
    >
      {value ? t.applied : t.notApplied}
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
        {Array.from({ length: 8 }).map((_, index) => (
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

export default function TreasuryTransactionsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [accounts, setAccounts] = React.useState<TreasuryAccount[]>([]);
  const [transactions, setTransactions] = React.useState<TreasuryTransaction[]>([]);
  const [stats, setStats] = React.useState<Stats>({
    total: 0,
    confirmed: 0,
    draft: 0,
    cancelled: 0,
    incomeTotal: 0,
    expenseTotal: 0,
    transferTotal: 0,
    feesTotal: 0,
    netTotal: 0,
  });

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const [accountFilter, setAccountFilter] = React.useState("all");
  const [balanceFilter, setBalanceFilter] = React.useState<BalanceFilter>("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
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

  const loadTransactions = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const transactionParams = new URLSearchParams({
          page: "1",
          page_size: "500",
          ordering: "-transaction_date",
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
        setStats(buildStats(transactionsPayload, nextTransactions));

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
    void loadTransactions();
  }, [loadTransactions]);

  const filteredRows = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let result = transactions.filter((transaction) => {
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

      const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
      const matchesType = typeFilter === "all" || transaction.transaction_type === typeFilter;
      const matchesAccount =
        accountFilter === "all" ||
        transaction.treasury_account_id === accountFilter ||
        transaction.destination_account_id === accountFilter;
      const matchesBalance =
        balanceFilter === "all" ||
        (balanceFilter === "applied" && transaction.balance_applied) ||
        (balanceFilter === "not_applied" && !transaction.balance_applied);
      const matchesFrom = !dateFrom || rowDate >= dateFrom;
      const matchesTo = !dateTo || rowDate <= dateTo;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesAccount &&
        matchesBalance &&
        matchesFrom &&
        matchesTo
      );
    });

    result = [...result].sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.transaction_date || a.created_at || "").localeCompare(
          String(b.transaction_date || b.created_at || ""),
        );
      }

      if (sortKey === "amount_high") return b.net_amount - a.net_amount;
      if (sortKey === "amount_low") return a.net_amount - b.net_amount;
      if (sortKey === "number") return a.transaction_number.localeCompare(b.transaction_number);

      return String(b.transaction_date || b.created_at || "").localeCompare(
        String(a.transaction_date || a.created_at || ""),
      );
    });

    return result;
  }, [
    accountFilter,
    balanceFilter,
    dateFrom,
    dateTo,
    searchInput,
    sortKey,
    statusFilter,
    transactions,
    typeFilter,
  ]);

  React.useEffect(() => {
    setPage(1);
  }, [accountFilter, balanceFilter, dateFrom, dateTo, pageSize, searchInput, sortKey, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasFilters =
    Boolean(searchInput.trim()) ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    accountFilter !== "all" ||
    balanceFilter !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    sortKey !== "newest";

  const visibleColumnCount = Object.values(columns).filter(Boolean).length;

  function resetFilters() {
    setSearchInput("");
    setStatusFilter("all");
    setTypeFilter("all");
    setAccountFilter("all");
    setBalanceFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortKey("newest");
    setPage(1);
  }

  function columnLabel(key: ColumnKey) {
    if (key === "number") return t.number;
    if (key === "date") return t.date;
    if (key === "type") return t.type;
    if (key === "status") return t.status;
    if (key === "account") return t.account;
    if (key === "party") return t.party;
    if (key === "description") return t.description;
    if (key === "amount") return t.amount;
    if (key === "fees") return t.fees;
    if (key === "net") return t.net;
    if (key === "balanceApplied") return t.balanceApplied;
    return t.actions;
  }

  function buildExportRows() {
    return filteredRows.map((transaction) => ({
      number: transaction.transaction_number || t.notAvailable,
      date: formatDate(transaction.transaction_date),
      type: transaction.transaction_type_label || typeLabel(transaction.transaction_type, locale),
      status: transaction.status_label || statusLabel(transaction.status, locale),
      account: transaction.treasury_account_name || t.notAvailable,
      destination: transaction.destination_account_name || t.notAvailable,
      party: transaction.party_name || t.notAvailable,
      source: transaction.source_label || transaction.source || t.notAvailable,
      description: transaction.description || t.notAvailable,
      amount: formatMoney(transaction.amount),
      fees: formatMoney(transaction.fees_amount),
      net: formatMoney(transaction.net_amount),
      balanceApplied: transaction.balance_applied ? t.applied : t.notApplied,
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
          <p>${escapeHtml(t.totalTransactions)}: ${escapeHtml(stats.total)}</p>
          <p>${escapeHtml(t.confirmedTransactions)}: ${escapeHtml(stats.confirmed)}</p>
          <p>${escapeHtml(t.incomeTotal)}: ${escapeHtml(formatMoney(stats.incomeTotal))}</p>
          <p>${escapeHtml(t.expenseTotal)}: ${escapeHtml(formatMoney(stats.expenseTotal))}</p>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.number)}</th>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.account)}</th>
                <th>${escapeHtml(t.party)}</th>
                <th>${escapeHtml(t.source)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.amount)}</th>
                <th>${escapeHtml(t.fees)}</th>
                <th>${escapeHtml(t.net)}</th>
                <th>${escapeHtml(t.balanceApplied)}</th>
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
                      <td>${escapeHtml(row.source)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.amount)}</td>
                      <td>${escapeHtml(row.fees)}</td>
                      <td>${escapeHtml(row.net)}</td>
                      <td>${escapeHtml(row.balanceApplied)}</td>
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
    link.download = `primey-care-treasury-transactions-${new Date().toISOString().slice(0, 10)}.xls`;
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
            <div class="box"><span>${escapeHtml(t.totalTransactions)}</span><strong>${escapeHtml(stats.total)}</strong></div>
            <div class="box"><span>${escapeHtml(t.confirmedTransactions)}</span><strong>${escapeHtml(stats.confirmed)}</strong></div>
            <div class="box"><span>${escapeHtml(t.incomeTotal)}</span><strong>${escapeHtml(formatMoney(stats.incomeTotal))}</strong></div>
            <div class="box"><span>${escapeHtml(t.expenseTotal)}</span><strong>${escapeHtml(formatMoney(stats.expenseTotal))}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.number)}</th>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.account)}</th>
                <th>${escapeHtml(t.party)}</th>
                <th>${escapeHtml(t.amount)}</th>
                <th>${escapeHtml(t.fees)}</th>
                <th>${escapeHtml(t.net)}</th>
                <th>${escapeHtml(t.balanceApplied)}</th>
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
                      <td>${escapeHtml(row.amount)}</td>
                      <td>${escapeHtml(row.fees)}</td>
                      <td>${escapeHtml(row.net)}</td>
                      <td>${escapeHtml(row.balanceApplied)}</td>
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
            <Link href="/system/treasury/transactions/create">
              <CircleDollarSign className="h-4 w-4" />
              {t.create}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadTransactions({ silent: true })}
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
          title={t.totalTransactions}
          value={formatInteger(stats.total)}
          trend={`${t.confirmed}: ${formatInteger(stats.confirmed)}`}
          icon={ReceiptText}
        />

        <KpiCard
          title={t.draftTransactions}
          value={formatInteger(stats.draft)}
          trend={`${t.cancelled}: ${formatInteger(stats.cancelled)}`}
          icon={CalendarDays}
        />

        <KpiCard
          title={t.incomeTotal}
          value={<MoneyValue value={stats.incomeTotal} label={t.sar} />}
          trend={t.income}
          icon={Banknote}
        />

        <KpiCard
          title={t.expenseTotal}
          value={<MoneyValue value={stats.expenseTotal} label={t.sar} />}
          trend={t.expense}
          icon={CreditCard}
        />

        <KpiCard
          title={t.transferTotal}
          value={<MoneyValue value={stats.transferTotal} label={t.sar} />}
          trend={t.transfer}
          icon={WalletCards}
        />

        <KpiCard
          title={t.feesTotal}
          value={<MoneyValue value={stats.feesTotal} label={t.sar} />}
          trend={t.fee}
          icon={Tags}
        />

        <KpiCard
          title={t.netTotal}
          value={<MoneyValue value={stats.netTotal} label={t.sar} />}
          trend={t.net}
          icon={CircleDollarSign}
        />

        <KpiCard
          title={t.confirmedTransactions}
          value={formatInteger(stats.confirmed)}
          trend={t.balanceApplied}
          icon={ReceiptText}
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
              onClick={() => void loadTransactions()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
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
                  <SelectItem value="opening_balance">{t.openingBalance}</SelectItem>
                  <SelectItem value="refund">{t.refund}</SelectItem>
                  <SelectItem value="fee">{t.fee}</SelectItem>
                  <SelectItem value="adjustment">{t.adjustment}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[220px]">
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

              <Select value={balanceFilter} onValueChange={(value) => setBalanceFilter(value as BalanceFilter)}>
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.balanceImpact}: {t.all}</SelectItem>
                  <SelectItem value="applied">{t.applied}</SelectItem>
                  <SelectItem value="not_applied">{t.notApplied}</SelectItem>
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
              <Table className="min-w-[1420px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    {columns.number ? (
                      <TableHead className="h-11 w-[170px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.number}
                      </TableHead>
                    ) : null}

                    {columns.date ? (
                      <TableHead className="h-11 w-[140px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.date}
                      </TableHead>
                    ) : null}

                    {columns.type ? (
                      <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.type}
                      </TableHead>
                    ) : null}

                    {columns.status ? (
                      <TableHead className="h-11 w-[115px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.status}
                      </TableHead>
                    ) : null}

                    {columns.account ? (
                      <TableHead className="h-11 w-[220px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.account}
                      </TableHead>
                    ) : null}

                    {columns.party ? (
                      <TableHead className="h-11 w-[150px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.party}
                      </TableHead>
                    ) : null}

                    {columns.description ? (
                      <TableHead className="h-11 w-[220px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.description}
                      </TableHead>
                    ) : null}

                    {columns.amount ? (
                      <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.amount}
                      </TableHead>
                    ) : null}

                    {columns.fees ? (
                      <TableHead className="h-11 w-[115px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.fees}
                      </TableHead>
                    ) : null}

                    {columns.net ? (
                      <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.net}
                      </TableHead>
                    ) : null}

                    {columns.balanceApplied ? (
                      <TableHead className="h-11 w-[120px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.balanceApplied}
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
                    pageRows.map((transaction) => (
                      <TableRow key={transaction.id || transaction.transaction_number} className="h-[62px]">
                        {columns.number ? (
                          <TableCell className="h-[62px] w-[170px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm font-semibold text-foreground tabular-nums">
                              {transaction.transaction_number || t.notAvailable}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {transaction.reference || transaction.source_number || t.notAvailable}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.date ? (
                          <TableCell className="h-[62px] w-[140px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm tabular-nums text-muted-foreground">
                              {formatDate(transaction.transaction_date)}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.type ? (
                          <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                            <TypeBadge type={transaction.transaction_type} locale={locale} />
                          </TableCell>
                        ) : null}

                        {columns.status ? (
                          <TableCell className="h-[62px] w-[115px] overflow-hidden px-4 text-right align-middle">
                            <StatusBadge status={transaction.status} locale={locale} />
                          </TableCell>
                        ) : null}

                        {columns.account ? (
                          <TableCell className="h-[62px] w-[220px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {transaction.treasury_account_name || t.notAvailable}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {transaction.destination_account_name ||
                                transaction.source_label ||
                                transaction.source ||
                                t.notAvailable}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.party ? (
                          <TableCell className="h-[62px] w-[150px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm text-muted-foreground">
                              {transaction.party_name || t.notAvailable}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.description ? (
                          <TableCell className="h-[62px] w-[220px] overflow-hidden px-4 text-right align-middle">
                            <span className="block truncate text-sm text-muted-foreground">
                              {transaction.description || t.notAvailable}
                            </span>
                          </TableCell>
                        ) : null}

                        {columns.amount ? (
                          <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={transaction.amount} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.fees ? (
                          <TableCell className="h-[62px] w-[115px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={transaction.fees_amount} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.net ? (
                          <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                            <MoneyValue value={transaction.net_amount} label={t.sar} />
                          </TableCell>
                        ) : null}

                        {columns.balanceApplied ? (
                          <TableCell className="h-[62px] w-[120px] overflow-hidden px-4 text-right align-middle">
                            <AppliedBadge value={transaction.balance_applied} locale={locale} />
                          </TableCell>
                        ) : null}

                        {columns.actions ? (
                          <TableCell className="h-[62px] w-[90px] overflow-hidden px-4 text-center align-middle">
                            <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
                              <Link href={`/system/treasury/transactions/${encodeURIComponent(transaction.id)}`}>
                                {t.open}
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
                {formatInteger(filteredRows.length)}
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