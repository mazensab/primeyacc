"use client";

/* ============================================================
   📂 app/system/treasury/reports/page.tsx
   🧠 Primey Care | Treasury Reports Page
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API:
      GET /api/treasury/accounts/
      GET /api/treasury/transactions/
      GET /api/treasury/reports/summary/ optional
   ✅ Treasury accounts / transactions / transfers reports
   ✅ Search / date / account type / transaction type / status / balance impact
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
  Building2,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  FileSpreadsheet,
  Landmark,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  Repeat2,
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
  is_default: boolean;
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
  accounting_posted: boolean;
  created_at: string | null;
};

type ReportTab = "accounts" | "transactions" | "transfers";
type AccountTypeFilter = "all" | "cashbox" | "bank" | "wallet" | "other";
type TransactionTypeFilter =
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
type StatusFilter = "all" | "draft" | "confirmed" | "cancelled";
type BalanceFilter = "all" | "applied" | "not_applied";
type SortKey = "newest" | "oldest" | "amount_high" | "amount_low" | "number";

const API = {
  summary: "/api/treasury/reports/summary/",
  accounts: "/api/treasury/accounts/",
  transactions: "/api/treasury/transactions/",
};

const translations = {
  ar: {
    title: "تقارير الخزينة",
    subtitle: "تحليل أرصدة الخزينة والحركات والتحويلات وحالة الترحيل المالي.",
    treasury: "الخزينة",
    transactionsPage: "حركات الخزينة",
    statement: "كشف الخزينة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    all: "الكل",

    totalBalance: "إجمالي الرصيد",
    cashboxes: "الصناديق",
    banks: "البنوك",
    transactions: "الحركات",
    receipts: "القبض",
    payments: "الصرف",
    transfers: "التحويلات",
    fees: "الرسوم",
    confirmed: "مؤكدة",
    draft: "مسودة",
    cancelled: "ملغاة",
    applied: "مطبق",
    notApplied: "غير مطبق",

    accountsTab: "أرصدة الحسابات",
    transactionsTab: "الحركات المالية",
    transfersTab: "التحويلات",
    reportTable: "جدول التقرير",
    accountsTableDesc: "تقرير أرصدة الصناديق والبنوك وحسابات الخزينة.",
    transactionsTableDesc: "تقرير الحركات المالية حسب النوع والحالة والفترة.",
    transfersTableDesc: "تقرير التحويلات الداخلية بين حسابات الخزينة.",

    searchPlaceholder: "ابحث بالرقم أو الحساب أو الطرف أو الوصف أو المرجع...",
    accountType: "نوع الحساب",
    transactionType: "نوع الحركة",
    status: "الحالة",
    balanceImpact: "أثر الرصيد",
    balanceApplied: "تطبيق أثر الرصيد",
    sort: "الترتيب",
    from: "من",
    to: "إلى",

    accountCode: "كود الحساب",
    accountName: "اسم الحساب",
    accountKind: "نوع الحساب",
    openingBalance: "الرصيد الافتتاحي",
    currentBalance: "الرصيد الحالي",
    defaultAccount: "افتراضي",
    accountStatus: "الحالة",

    number: "رقم الحركة",
    date: "التاريخ",
    movementType: "نوع الحركة",
    sourceAccount: "حساب المصدر",
    destinationAccount: "حساب الوجهة",
    party: "الطرف",
    description: "الوصف",
    amount: "المبلغ",
    net: "الصافي",
    reference: "المرجع",
    accountingPosted: "محاسبيًا",

    cashbox: "صندوق",
    bank: "بنك",
    wallet: "محفظة",
    other: "أخرى",

    income: "قبض",
    expense: "صرف",
    transfer: "تحويل",
    deposit: "إيداع",
    withdraw: "سحب",
    openingBalanceType: "رصيد افتتاحي",
    refund: "استرداد",
    fee: "رسوم",
    adjustment: "تسوية",

    active: "نشط",
    inactive: "غير نشط",
    yes: "نعم",
    no: "لا",

    newest: "الأحدث",
    oldest: "الأقدم",
    amountHigh: "الأعلى مبلغًا",
    amountLow: "الأقل مبلغًا",
    numberSort: "الرقم",

    showing: "عرض",
    of: "من",
    rows: "صفوف",

    errorTitle: "تعذر تحميل تقارير الخزينة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث تقارير الخزينة.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير الخزينة",
    generatedAt: "تاريخ الطباعة",
    noDataTitle: "لا توجد بيانات",
    noDataDesc: "ستظهر بيانات التقرير هنا بعد تسجيل حركات أو حسابات خزينة.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    notAvailable: "—",
    sar: "ر.س",
  },
  en: {
    title: "Treasury Reports",
    subtitle: "Analyze treasury balances, movements, transfers, and posting status.",
    treasury: "Treasury",
    transactionsPage: "Treasury transactions",
    statement: "Treasury statement",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    all: "All",

    totalBalance: "Total balance",
    cashboxes: "Cashboxes",
    banks: "Banks",
    transactions: "Transactions",
    receipts: "Receipts",
    payments: "Payments",
    transfers: "Transfers",
    fees: "Fees",
    confirmed: "Confirmed",
    draft: "Draft",
    cancelled: "Cancelled",
    applied: "Applied",
    notApplied: "Not applied",

    accountsTab: "Account balances",
    transactionsTab: "Financial transactions",
    transfersTab: "Transfers",
    reportTable: "Report table",
    accountsTableDesc: "Treasury cashboxes, banks, and account balances report.",
    transactionsTableDesc: "Financial movements by type, status, and date range.",
    transfersTableDesc: "Internal transfers between treasury accounts.",

    searchPlaceholder: "Search by number, account, party, description, or reference...",
    accountType: "Account type",
    transactionType: "Transaction type",
    status: "Status",
    balanceImpact: "Balance impact",
    balanceApplied: "Balance applied",
    sort: "Sort",
    from: "From",
    to: "To",

    accountCode: "Account code",
    accountName: "Account name",
    accountKind: "Account type",
    openingBalance: "Opening balance",
    currentBalance: "Current balance",
    defaultAccount: "Default",
    accountStatus: "Status",

    number: "Number",
    date: "Date",
    movementType: "Movement type",
    sourceAccount: "Source account",
    destinationAccount: "Destination account",
    party: "Party",
    description: "Description",
    amount: "Amount",
    net: "Net",
    reference: "Reference",
    accountingPosted: "Accounting",

    cashbox: "Cashbox",
    bank: "Bank",
    wallet: "Wallet",
    other: "Other",

    income: "Income",
    expense: "Expense",
    transfer: "Transfer",
    deposit: "Deposit",
    withdraw: "Withdraw",
    openingBalanceType: "Opening balance",
    refund: "Refund",
    fee: "Fee",
    adjustment: "Adjustment",

    active: "Active",
    inactive: "Inactive",
    yes: "Yes",
    no: "No",

    newest: "Newest",
    oldest: "Oldest",
    amountHigh: "Highest amount",
    amountLow: "Lowest amount",
    numberSort: "Number",

    showing: "Showing",
    of: "of",
    rows: "rows",

    errorTitle: "Unable to load treasury reports",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Treasury reports refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Treasury report",
    generatedAt: "Generated at",
    noDataTitle: "No data",
    noDataDesc: "Report data will appear here after recording treasury accounts or movements.",
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

    if (
      ["1", "true", "yes", "on", "active", "default", "posted", "applied", "confirmed"].includes(
        normalized,
      )
    ) {
      return true;
    }

    if (["0", "false", "no", "off", "inactive", "draft", "cancelled"].includes(normalized)) {
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
    account_type: normalizeText(item.account_type || item.type || "other").toLowerCase(),
    account_type_label: normalizeText(item.account_type_label || item.type_label),
    current_balance: toNumber(item.current_balance ?? item.balance),
    opening_balance: toNumber(item.opening_balance),
    currency: normalizeText(item.currency || "SAR"),
    status: normalizeText(item.status || "active").toLowerCase(),
    is_default: toBoolean(item.is_default),
  };
}

function normalizeTransaction(value: unknown): TreasuryTransaction {
  const item = asRecord(value);
  const account = asRecord(item.treasury_account || item.account || item.from_account);
  const destination = asRecord(item.destination_account || item.to_account);

  return {
    id: normalizeText(item.id || item.pk || item.uuid),
    transaction_number: normalizeText(item.transaction_number || item.number || item.reference),
    transaction_type: normalizeText(item.transaction_type || item.type || "adjustment").toLowerCase(),
    transaction_type_label: normalizeText(item.transaction_type_label || item.type_label),
    source: normalizeText(item.source),
    source_label: normalizeText(item.source_label),
    status: normalizeText(item.status || "draft").toLowerCase(),
    status_label: normalizeText(item.status_label),
    transaction_date:
      normalizeText(item.transaction_date || item.date || item.created_at) || null,
    treasury_account_id: normalizeText(
      item.treasury_account_id || item.account_id || item.from_account_id || account.id || account.pk,
    ),
    treasury_account_name: normalizeText(
      account.name || item.treasury_account_name || item.account_name || item.from_account_name,
    ),
    treasury_account_code: normalizeText(
      account.code || item.treasury_account_code || item.account_code || item.from_account_code,
    ),
    destination_account_id: normalizeText(
      item.destination_account_id || item.to_account_id || destination.id || destination.pk,
    ),
    destination_account_name: normalizeText(
      destination.name || item.destination_account_name || item.to_account_name,
    ),
    destination_account_code: normalizeText(
      destination.code || item.destination_account_code || item.to_account_code,
    ),
    amount: toNumber(item.amount),
    fees_amount: toNumber(item.fees_amount || item.fee_amount),
    net_amount: toNumber(item.net_amount ?? item.amount),
    currency: normalizeText(item.currency || "SAR"),
    reference: normalizeText(item.reference || item.external_reference),
    source_number: normalizeText(item.source_number || item.source_reference),
    party_name: normalizeText(item.party_name),
    description: normalizeText(item.description || item.notes),
    balance_applied: toBoolean(item.balance_applied || item.is_balance_applied),
    accounting_posted: toBoolean(item.accounting_posted || item.is_accounting_posted),
    created_at: normalizeText(item.created_at) || null,
  };
}

function accountTypeLabel(type: string, locale: Locale) {
  const t = translations[locale];
  const normalized = type.toLowerCase();

  if (normalized.includes("cash")) return t.cashbox;
  if (normalized.includes("bank")) return t.bank;
  if (normalized.includes("wallet")) return t.wallet;

  return t.other;
}

function transactionTypeLabel(type: string, locale: Locale) {
  const t = translations[locale];

  if (type === "income") return t.income;
  if (type === "expense") return t.expense;
  if (type === "transfer" || type === "internal_transfer") return t.transfer;
  if (type === "deposit") return t.deposit;
  if (type === "withdraw") return t.withdraw;
  if (type === "opening_balance") return t.openingBalanceType;
  if (type === "refund") return t.refund;
  if (type === "fee") return t.fee;
  if (type === "adjustment") return t.adjustment;

  return type || t.notAvailable;
}

function statusLabel(status: string, locale: Locale) {
  const t = translations[locale];

  if (status === "confirmed") return t.confirmed;
  if (status === "cancelled") return t.cancelled;

  return t.draft;
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

  if (type === "transfer" || type === "internal_transfer") {
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
      {transactionTypeLabel(type, locale)}
    </Badge>
  );
}

function BooleanBadge({
  value,
  trueLabel,
  falseLabel,
}: {
  value: boolean;
  trueLabel: string;
  falseLabel: string;
}) {
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
      {value ? trueLabel : falseLabel}
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

export default function TreasuryReportsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [accounts, setAccounts] = React.useState<TreasuryAccount[]>([]);
  const [transactions, setTransactions] = React.useState<TreasuryTransaction[]>([]);
  const [summaryPayload, setSummaryPayload] = React.useState<ApiRecord>({});

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [activeTab, setActiveTab] = React.useState<ReportTab>("accounts");
  const [searchInput, setSearchInput] = React.useState("");
  const [accountTypeFilter, setAccountTypeFilter] = React.useState<AccountTypeFilter>("all");
  const [transactionTypeFilter, setTransactionTypeFilter] =
    React.useState<TransactionTypeFilter>("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [balanceFilter, setBalanceFilter] = React.useState<BalanceFilter>("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("newest");

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

  const loadReports = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const accountParams = new URLSearchParams({
          page: "1",
          page_size: "1000",
          ordering: "account_type",
        });

        const transactionParams = new URLSearchParams({
          page: "1",
          page_size: "1000",
          ordering: "-transaction_date",
        });

        if (dateFrom) transactionParams.set("date_from", dateFrom);
        if (dateTo) transactionParams.set("date_to", dateTo);

        const [accountsPayload, transactionsPayload, summaryResponse] = await Promise.all([
          fetchJson<ApiResponse>(makeApiUrl(API.accounts, accountParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(API.transactions, transactionParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(API.summary), controller.signal).catch(() => null),
        ]);

        const nextAccounts = extractItems(accountsPayload)
          .map(normalizeAccount)
          .filter((row) => row.id || row.name || row.code);

        const nextTransactions = extractItems(transactionsPayload)
          .map(normalizeTransaction)
          .filter((row) => row.id || row.transaction_number);

        setAccounts(nextAccounts);
        setTransactions(nextTransactions);
        setSummaryPayload(asRecord(summaryResponse?.data || summaryResponse?.summary || summaryResponse));

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
    void loadReports();
  }, [loadReports]);

  const reportStats = React.useMemo(() => {
    const totalBalance =
      toNumber(summaryPayload.total_balance, NaN) ||
      accounts.reduce((sum, account) => sum + account.current_balance, 0);

    const cashboxAccounts = accounts.filter((account) => account.account_type.includes("cash"));
    const bankAccounts = accounts.filter((account) => account.account_type.includes("bank"));
    const receiptRows = transactions.filter((row) =>
      ["income", "deposit", "opening_balance"].includes(row.transaction_type),
    );
    const paymentRows = transactions.filter((row) =>
      ["expense", "withdraw", "refund", "fee"].includes(row.transaction_type),
    );
    const transferRows = transactions.filter(
      (row) =>
        row.transaction_type === "transfer" ||
        row.transaction_type === "internal_transfer" ||
        Boolean(row.destination_account_id || row.destination_account_name),
    );

    return {
      totalBalance,
      cashboxCount: cashboxAccounts.length,
      bankCount: bankAccounts.length,
      transactionsCount: transactions.length,
      receiptsTotal: receiptRows.reduce((sum, row) => sum + row.net_amount, 0),
      paymentsTotal: paymentRows.reduce((sum, row) => sum + row.net_amount, 0),
      transfersTotal: transferRows.reduce((sum, row) => sum + row.net_amount, 0),
      feesTotal: transactions.reduce((sum, row) => sum + row.fees_amount, 0),
      confirmedCount: transactions.filter((row) => row.status === "confirmed").length,
      draftCount: transactions.filter((row) => row.status === "draft").length,
      appliedCount: transactions.filter((row) => row.balance_applied).length,
    };
  }, [accounts, summaryPayload, transactions]);

  const filteredAccounts = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let rows = accounts.filter((account) => {
      const matchesSearch =
        activeTab !== "accounts" ||
        !query ||
        account.name.toLowerCase().includes(query) ||
        account.code.toLowerCase().includes(query) ||
        account.account_type.toLowerCase().includes(query);

      const matchesType =
        accountTypeFilter === "all" ||
        (accountTypeFilter === "cashbox" && account.account_type.includes("cash")) ||
        (accountTypeFilter === "bank" && account.account_type.includes("bank")) ||
        (accountTypeFilter === "wallet" && account.account_type.includes("wallet")) ||
        (accountTypeFilter === "other" &&
          !account.account_type.includes("cash") &&
          !account.account_type.includes("bank") &&
          !account.account_type.includes("wallet"));

      return matchesSearch && matchesType;
    });

    rows = [...rows].sort((a, b) => {
      if (sortKey === "amount_high") return b.current_balance - a.current_balance;
      if (sortKey === "amount_low") return a.current_balance - b.current_balance;
      return a.code.localeCompare(b.code);
    });

    return rows;
  }, [accountTypeFilter, accounts, activeTab, searchInput, sortKey]);

  const filteredTransactions = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let rows = transactions.filter((row) => {
      const rowDate = formatDate(row.transaction_date).slice(0, 10);

      const matchesSearch =
        activeTab === "accounts" ||
        !query ||
        row.transaction_number.toLowerCase().includes(query) ||
        row.treasury_account_name.toLowerCase().includes(query) ||
        row.destination_account_name.toLowerCase().includes(query) ||
        row.party_name.toLowerCase().includes(query) ||
        row.description.toLowerCase().includes(query) ||
        row.reference.toLowerCase().includes(query) ||
        row.source_number.toLowerCase().includes(query);

      const isTransfer =
        row.transaction_type === "transfer" ||
        row.transaction_type === "internal_transfer" ||
        Boolean(row.destination_account_id || row.destination_account_name);

      const matchesTab = activeTab === "transactions" || (activeTab === "transfers" && isTransfer);
      const matchesType =
        transactionTypeFilter === "all" || row.transaction_type === transactionTypeFilter;
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const matchesBalance =
        balanceFilter === "all" ||
        (balanceFilter === "applied" && row.balance_applied) ||
        (balanceFilter === "not_applied" && !row.balance_applied);
      const matchesFrom = !dateFrom || rowDate >= dateFrom;
      const matchesTo = !dateTo || rowDate <= dateTo;

      return (
        matchesTab &&
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesBalance &&
        matchesFrom &&
        matchesTo
      );
    });

    rows = [...rows].sort((a, b) => {
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

    return rows;
  }, [
    activeTab,
    balanceFilter,
    dateFrom,
    dateTo,
    searchInput,
    sortKey,
    statusFilter,
    transactionTypeFilter,
    transactions,
  ]);

  const visibleRowsCount =
    activeTab === "accounts" ? filteredAccounts.length : filteredTransactions.length;

  const hasFilters =
    Boolean(searchInput.trim()) ||
    accountTypeFilter !== "all" ||
    transactionTypeFilter !== "all" ||
    statusFilter !== "all" ||
    balanceFilter !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    sortKey !== "newest";

  function resetFilters() {
    setSearchInput("");
    setAccountTypeFilter("all");
    setTransactionTypeFilter("all");
    setStatusFilter("all");
    setBalanceFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortKey("newest");
  }

  function currentTableDescription() {
    if (activeTab === "accounts") return t.accountsTableDesc;
    if (activeTab === "transfers") return t.transfersTableDesc;
    return t.transactionsTableDesc;
  }

  function buildExportRows() {
    if (activeTab === "accounts") {
      return filteredAccounts.map((account) => ({
        code: account.code || t.notAvailable,
        name: account.name || t.notAvailable,
        type: account.account_type_label || accountTypeLabel(account.account_type, locale),
        opening: formatMoney(account.opening_balance),
        balance: formatMoney(account.current_balance),
        status: account.status === "active" ? t.active : t.inactive,
        isDefault: account.is_default ? t.yes : t.no,
      }));
    }

    return filteredTransactions.map((row) => ({
      number: row.transaction_number || t.notAvailable,
      date: formatDate(row.transaction_date),
      type: row.transaction_type_label || transactionTypeLabel(row.transaction_type, locale),
      status: row.status_label || statusLabel(row.status, locale),
      sourceAccount: row.treasury_account_code
        ? `${row.treasury_account_code} - ${row.treasury_account_name}`
        : row.treasury_account_name || t.notAvailable,
      destinationAccount: row.destination_account_code
        ? `${row.destination_account_code} - ${row.destination_account_name}`
        : row.destination_account_name || t.notAvailable,
      party: row.party_name || t.notAvailable,
      amount: formatMoney(row.amount),
      fees: formatMoney(row.fees_amount),
      net: formatMoney(row.net_amount),
      reference: row.reference || row.source_number || t.notAvailable,
      balanceApplied: row.balance_applied ? t.applied : t.notApplied,
      accountingPosted: row.accounting_posted ? t.yes : t.no,
    }));
  }

  function exportExcel() {
    const rows = buildExportRows();

    if (!rows.length) {
      toast.error(t.exportEmpty);
      return;
    }

    const headers =
      activeTab === "accounts"
        ? [t.accountCode, t.accountName, t.accountKind, t.openingBalance, t.currentBalance, t.accountStatus, t.defaultAccount]
        : [
            t.number,
            t.date,
            t.movementType,
            t.status,
            t.sourceAccount,
            t.destinationAccount,
            t.party,
            t.amount,
            t.fees,
            t.net,
            t.reference,
            t.balanceApplied,
            t.accountingPosted,
          ];

    const htmlRows =
      activeTab === "accounts"
        ? (rows as Array<Record<string, string>>)
            .map(
              (row) => `
                <tr>
                  <td>${escapeHtml(row.code)}</td>
                  <td>${escapeHtml(row.name)}</td>
                  <td>${escapeHtml(row.type)}</td>
                  <td>${escapeHtml(row.opening)}</td>
                  <td>${escapeHtml(row.balance)}</td>
                  <td>${escapeHtml(row.status)}</td>
                  <td>${escapeHtml(row.isDefault)}</td>
                </tr>
              `,
            )
            .join("")
        : (rows as Array<Record<string, string>>)
            .map(
              (row) => `
                <tr>
                  <td>${escapeHtml(row.number)}</td>
                  <td>${escapeHtml(row.date)}</td>
                  <td>${escapeHtml(row.type)}</td>
                  <td>${escapeHtml(row.status)}</td>
                  <td>${escapeHtml(row.sourceAccount)}</td>
                  <td>${escapeHtml(row.destinationAccount)}</td>
                  <td>${escapeHtml(row.party)}</td>
                  <td>${escapeHtml(row.amount)}</td>
                  <td>${escapeHtml(row.fees)}</td>
                  <td>${escapeHtml(row.net)}</td>
                  <td>${escapeHtml(row.reference)}</td>
                  <td>${escapeHtml(row.balanceApplied)}</td>
                  <td>${escapeHtml(row.accountingPosted)}</td>
                </tr>
              `,
            )
            .join("");

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
              <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
            </thead>
            <tbody>${htmlRows}</tbody>
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
    link.download = `primey-care-treasury-report-${activeTab}-${new Date().toISOString().slice(0, 10)}.xls`;
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

    const tableHeader =
      activeTab === "accounts"
        ? `
          <tr>
            <th>${escapeHtml(t.accountCode)}</th>
            <th>${escapeHtml(t.accountName)}</th>
            <th>${escapeHtml(t.accountKind)}</th>
            <th>${escapeHtml(t.currentBalance)}</th>
            <th>${escapeHtml(t.accountStatus)}</th>
          </tr>
        `
        : `
          <tr>
            <th>${escapeHtml(t.number)}</th>
            <th>${escapeHtml(t.date)}</th>
            <th>${escapeHtml(t.movementType)}</th>
            <th>${escapeHtml(t.sourceAccount)}</th>
            <th>${escapeHtml(t.amount)}</th>
            <th>${escapeHtml(t.net)}</th>
            <th>${escapeHtml(t.balanceApplied)}</th>
          </tr>
        `;

    const tableRows =
      activeTab === "accounts"
        ? (rows as Array<Record<string, string>>)
            .map(
              (row) => `
                <tr>
                  <td>${escapeHtml(row.code)}</td>
                  <td>${escapeHtml(row.name)}</td>
                  <td>${escapeHtml(row.type)}</td>
                  <td>${escapeHtml(row.balance)}</td>
                  <td>${escapeHtml(row.status)}</td>
                </tr>
              `,
            )
            .join("")
        : (rows as Array<Record<string, string>>)
            .map(
              (row) => `
                <tr>
                  <td>${escapeHtml(row.number)}</td>
                  <td>${escapeHtml(row.date)}</td>
                  <td>${escapeHtml(row.type)}</td>
                  <td>${escapeHtml(row.sourceAccount)}</td>
                  <td>${escapeHtml(row.amount)}</td>
                  <td>${escapeHtml(row.net)}</td>
                  <td>${escapeHtml(row.balanceApplied)}</td>
                </tr>
              `,
            )
            .join("");

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
            <h1>Primey Care - ${escapeHtml(t.printTitle)}</h1>
            <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.totalBalance)}</span><strong>${escapeHtml(formatMoney(reportStats.totalBalance))}</strong></div>
            <div class="box"><span>${escapeHtml(t.transactions)}</span><strong>${escapeHtml(reportStats.transactionsCount)}</strong></div>
            <div class="box"><span>${escapeHtml(t.receipts)}</span><strong>${escapeHtml(formatMoney(reportStats.receiptsTotal))}</strong></div>
            <div class="box"><span>${escapeHtml(t.payments)}</span><strong>${escapeHtml(formatMoney(reportStats.paymentsTotal))}</strong></div>
          </div>

          <table>
            <thead>${tableHeader}</thead>
            <tbody>${tableRows}</tbody>
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
              {t.treasury}
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/treasury/transactions">
              <WalletCards className="h-4 w-4" />
              {t.transactionsPage}
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-9 rounded-lg">
            <Link href="/system/treasury/statement">
              <ReceiptText className="h-4 w-4" />
              {t.statement}
            </Link>
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadReports({ silent: true })}
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
          title={t.totalBalance}
          value={<MoneyValue value={reportStats.totalBalance} label={t.sar} />}
          trend={`${t.applied}: ${formatInteger(reportStats.appliedCount)}`}
          icon={CircleDollarSign}
        />

        <KpiCard
          title={t.cashboxes}
          value={formatInteger(reportStats.cashboxCount)}
          trend={t.cashbox}
          icon={Banknote}
        />

        <KpiCard
          title={t.banks}
          value={formatInteger(reportStats.bankCount)}
          trend={t.bank}
          icon={Landmark}
        />

        <KpiCard
          title={t.transactions}
          value={formatInteger(reportStats.transactionsCount)}
          trend={`${t.confirmed}: ${formatInteger(reportStats.confirmedCount)}`}
          icon={ReceiptText}
        />

        <KpiCard
          title={t.receipts}
          value={<MoneyValue value={reportStats.receiptsTotal} label={t.sar} />}
          trend={t.income}
          icon={Banknote}
        />

        <KpiCard
          title={t.payments}
          value={<MoneyValue value={reportStats.paymentsTotal} label={t.sar} />}
          trend={t.expense}
          icon={CreditCard}
        />

        <KpiCard
          title={t.transfers}
          value={<MoneyValue value={reportStats.transfersTotal} label={t.sar} />}
          trend={t.transfer}
          icon={Repeat2}
        />

        <KpiCard
          title={t.fees}
          value={<MoneyValue value={reportStats.feesTotal} label={t.sar} />}
          trend={t.fee}
          icon={CalendarDays}
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
              onClick={() => void loadReports()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
        <CardHeader className="px-6 py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle>{t.reportTable}</CardTitle>
              <CardDescription>{currentTableDescription()}</CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeTab === "accounts" ? "default" : "outline"}
                className={cn(
                  "h-9 rounded-lg",
                  activeTab === "accounts" && "bg-black text-white hover:bg-black/90",
                )}
                onClick={() => setActiveTab("accounts")}
              >
                <Building2 className="h-4 w-4" />
                {t.accountsTab}
              </Button>

              <Button
                variant={activeTab === "transactions" ? "default" : "outline"}
                className={cn(
                  "h-9 rounded-lg",
                  activeTab === "transactions" && "bg-black text-white hover:bg-black/90",
                )}
                onClick={() => setActiveTab("transactions")}
              >
                <ReceiptText className="h-4 w-4" />
                {t.transactionsTab}
              </Button>

              <Button
                variant={activeTab === "transfers" ? "default" : "outline"}
                className={cn(
                  "h-9 rounded-lg",
                  activeTab === "transfers" && "bg-black text-white hover:bg-black/90",
                )}
                onClick={() => setActiveTab("transfers")}
              >
                <Repeat2 className="h-4 w-4" />
                {t.transfersTab}
              </Button>
            </div>
          </div>
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
              disabled={activeTab === "accounts"}
            />

            <Input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-10 rounded-lg bg-background"
              title={t.to}
              disabled={activeTab === "accounts"}
            />
          </div>

          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {activeTab === "accounts" ? (
                <Select
                  value={accountTypeFilter}
                  onValueChange={(value) => setAccountTypeFilter(value as AccountTypeFilter)}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.accountType}: {t.all}</SelectItem>
                    <SelectItem value="cashbox">{t.cashbox}</SelectItem>
                    <SelectItem value="bank">{t.bank}</SelectItem>
                    <SelectItem value="wallet">{t.wallet}</SelectItem>
                    <SelectItem value="other">{t.other}</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <>
                  <Select
                    value={transactionTypeFilter}
                    onValueChange={(value) =>
                      setTransactionTypeFilter(value as TransactionTypeFilter)
                    }
                    disabled={activeTab === "transfers"}
                  >
                    <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.transactionType}: {t.all}</SelectItem>
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

                  <Select
                    value={statusFilter}
                    onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                  >
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

                  <Select
                    value={balanceFilter}
                    onValueChange={(value) => setBalanceFilter(value as BalanceFilter)}
                  >
                    <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t.balanceImpact}: {t.all}</SelectItem>
                      <SelectItem value="applied">{t.applied}</SelectItem>
                      <SelectItem value="not_applied">{t.notApplied}</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
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
              {activeTab === "accounts" ? (
                <Table className="min-w-[1100px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className="h-11 w-[140px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.accountCode}
                      </TableHead>
                      <TableHead className="h-11 w-[260px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.accountName}
                      </TableHead>
                      <TableHead className="h-11 w-[150px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.accountKind}
                      </TableHead>
                      <TableHead className="h-11 w-[160px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.openingBalance}
                      </TableHead>
                      <TableHead className="h-11 w-[160px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.currentBalance}
                      </TableHead>
                      <TableHead className="h-11 w-[120px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.accountStatus}
                      </TableHead>
                      <TableHead className="h-11 w-[120px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.defaultAccount}
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredAccounts.length ? (
                      filteredAccounts.map((account) => (
                        <TableRow key={account.id || account.code} className="h-[62px]">
                          <TableCell className="h-[62px] px-4 text-right align-middle font-semibold tabular-nums">
                            {account.code || t.notAvailable}
                          </TableCell>

                          <TableCell className="h-[62px] px-4 text-right align-middle">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {account.name || t.notAvailable}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {account.account_type_label || accountTypeLabel(account.account_type, locale)}
                            </span>
                          </TableCell>

                          <TableCell className="h-[62px] px-4 text-right align-middle">
                            <Badge
                              variant="outline"
                              className="rounded-full border-blue-500/30 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                            >
                              {account.account_type_label || accountTypeLabel(account.account_type, locale)}
                            </Badge>
                          </TableCell>

                          <TableCell className="h-[62px] px-4 text-right align-middle">
                            <MoneyValue value={account.opening_balance} label={t.sar} />
                          </TableCell>

                          <TableCell className="h-[62px] px-4 text-right align-middle">
                            <MoneyValue value={account.current_balance} label={t.sar} />
                          </TableCell>

                          <TableCell className="h-[62px] px-4 text-right align-middle">
                            <BooleanBadge
                              value={account.status === "active"}
                              trueLabel={t.active}
                              falseLabel={t.inactive}
                            />
                          </TableCell>

                          <TableCell className="h-[62px] px-4 text-right align-middle">
                            <BooleanBadge
                              value={account.is_default}
                              trueLabel={t.yes}
                              falseLabel={t.no}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-72">
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
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : (
                <Table className="min-w-[1450px] table-fixed">
                  <TableHeader>
                    <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                      <TableHead className="h-11 w-[170px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.number}
                      </TableHead>
                      <TableHead className="h-11 w-[140px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.date}
                      </TableHead>
                      <TableHead className="h-11 w-[120px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.movementType}
                      </TableHead>
                      <TableHead className="h-11 w-[115px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.status}
                      </TableHead>
                      <TableHead className="h-11 w-[220px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.sourceAccount}
                      </TableHead>
                      <TableHead className="h-11 w-[220px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.destinationAccount}
                      </TableHead>
                      <TableHead className="h-11 w-[140px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.party}
                      </TableHead>
                      <TableHead className="h-11 w-[125px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.amount}
                      </TableHead>
                      <TableHead className="h-11 w-[125px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.net}
                      </TableHead>
                      <TableHead className="h-11 w-[120px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.balanceImpact}
                      </TableHead>
                      <TableHead className="h-11 w-[120px] px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.accountingPosted}
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredTransactions.length ? (
                      filteredTransactions.map((row) => (
                        <TableRow key={row.id || row.transaction_number} className="h-[62px]">
                          <TableCell className="h-[62px] px-4 text-right align-middle">
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

                          <TableCell className="h-[62px] px-4 text-right align-middle text-sm text-muted-foreground tabular-nums">
                            {formatDate(row.transaction_date)}
                          </TableCell>

                          <TableCell className="h-[62px] px-4 text-right align-middle">
                            <TypeBadge type={row.transaction_type} locale={locale} />
                          </TableCell>

                          <TableCell className="h-[62px] px-4 text-right align-middle">
                            <StatusBadge status={row.status} locale={locale} />
                          </TableCell>

                          <TableCell className="h-[62px] px-4 text-right align-middle">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {row.treasury_account_name || t.notAvailable}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground tabular-nums">
                              {row.treasury_account_code || t.notAvailable}
                            </span>
                          </TableCell>

                          <TableCell className="h-[62px] px-4 text-right align-middle">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {row.destination_account_name || t.notAvailable}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground tabular-nums">
                              {row.destination_account_code || t.notAvailable}
                            </span>
                          </TableCell>

                          <TableCell className="h-[62px] px-4 text-right align-middle">
                            <span className="block truncate text-sm text-muted-foreground">
                              {row.party_name || t.notAvailable}
                            </span>
                          </TableCell>

                          <TableCell className="h-[62px] px-4 text-right align-middle">
                            <MoneyValue value={row.amount} label={t.sar} />
                          </TableCell>

                          <TableCell className="h-[62px] px-4 text-right align-middle">
                            <MoneyValue value={row.net_amount} label={t.sar} />
                          </TableCell>

                          <TableCell className="h-[62px] px-4 text-right align-middle">
                            <BooleanBadge
                              value={row.balance_applied}
                              trueLabel={t.applied}
                              falseLabel={t.notApplied}
                            />
                          </TableCell>

                          <TableCell className="h-[62px] px-4 text-right align-middle">
                            <BooleanBadge
                              value={row.accounting_posted}
                              trueLabel={t.yes}
                              falseLabel={t.no}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="h-72">
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
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {t.showing}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatInteger(visibleRowsCount)}
            </span>{" "}
            {t.of}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatInteger(activeTab === "accounts" ? accounts.length : transactions.length)}
            </span>{" "}
            {t.rows}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}