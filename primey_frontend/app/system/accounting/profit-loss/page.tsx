"use client";

/* ============================================================
   📂 app/system/accounting/profit-loss/page.tsx
   🧾 Primey Care — Profit & Loss Report
   ------------------------------------------------------------
   ✅ Approved operational pattern
   ✅ Real API only:
      GET /api/accounting/accounts/?page=1&page_size=500
      GET /api/accounting/ledger/?page=1&page_size=500
   ✅ Builds P&L locally from accounts + ledger
   ✅ No missing profit-loss endpoint calls
   ✅ Search / dates / account type / sort / columns
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
  CheckCircle2,
  FileSpreadsheet,
  Landmark,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
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
import { Checkbox } from "@/components/ui/checkbox";
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

type AccountRecord = {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  name_en: string;
  account_type: string;
  account_type_label: string;
  level: number;
  is_active: boolean;
};

type LedgerRecord = {
  account_id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  date: string;
};

type ProfitLossRow = {
  id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: "revenue" | "expense";
  account_type_label: string;
  level: number;
  debit: number;
  credit: number;
  amount: number;
  percentage: number;
};

type ProfitLossSummary = {
  revenue: number;
  expenses: number;
  gross_profit: number;
  net_profit: number;
  rows_count: number;
  revenue_accounts: number;
  expense_accounts: number;
};

type AccountTypeFilter = "all" | "revenue" | "expense";
type SortKey =
  | "code"
  | "name"
  | "amount_desc"
  | "amount_asc"
  | "type"
  | "percentage_desc";

type ColumnKey =
  | "account"
  | "type"
  | "debit"
  | "credit"
  | "amount"
  | "percentage";

const SAR_ICON = "/currency/sar.svg";

const translations = {
  ar: {
    title: "قائمة الأرباح والخسائر",
    subtitle:
      "تقرير الإيرادات والمصروفات وصافي الربح اعتمادًا على الحسابات وحركات دفتر الأستاذ.",
    back: "المحاسبة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث بالحساب أو الكود أو النوع...",
    from: "من",
    to: "إلى",
    accountType: "نوع الحساب",
    sort: "الترتيب",
    columns: "الأعمدة",
    all: "الكل",

    revenue: "الإيرادات",
    expenses: "المصروفات",
    grossProfit: "مجمل الربح",
    netProfit: "صافي الربح",
    revenueAccounts: "حسابات الإيراد",
    expenseAccounts: "حسابات المصروف",

    account: "الحساب",
    type: "النوع",
    debit: "مدين",
    credit: "دائن",
    amount: "المبلغ",
    percentage: "النسبة",
    profit: "ربح",
    loss: "خسارة",

    codeSort: "الكود",
    nameSort: "الاسم",
    amountHigh: "الأعلى مبلغًا",
    amountLow: "الأقل مبلغًا",
    typeSort: "النوع",
    percentageHigh: "الأعلى نسبة",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    noDataTitle: "لا توجد بيانات",
    noDataDesc: "ستظهر بيانات الأرباح والخسائر بعد وجود حسابات وحركات دفتر أستاذ.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل تقرير الأرباح والخسائر",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث تقرير الأرباح والخسائر.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير الأرباح والخسائر",
    generatedAt: "تاريخ الطباعة",
    currentPeriod: "الفترة الحالية",
    total: "الإجمالي",
    unknown: "غير محدد",
  },
  en: {
    title: "Profit & Loss",
    subtitle:
      "Revenue, expenses, and net profit report based on accounts and ledger movements.",
    back: "Accounting",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    searchPlaceholder: "Search by account, code, or type...",
    from: "From",
    to: "To",
    accountType: "Account type",
    sort: "Sort",
    columns: "Columns",
    all: "All",

    revenue: "Revenue",
    expenses: "Expenses",
    grossProfit: "Gross profit",
    netProfit: "Net profit",
    revenueAccounts: "Revenue accounts",
    expenseAccounts: "Expense accounts",

    account: "Account",
    type: "Type",
    debit: "Debit",
    credit: "Credit",
    amount: "Amount",
    percentage: "Percentage",
    profit: "Profit",
    loss: "Loss",

    codeSort: "Code",
    nameSort: "Name",
    amountHigh: "Highest amount",
    amountLow: "Lowest amount",
    typeSort: "Type",
    percentageHigh: "Highest percentage",

    showing: "Showing",
    of: "of",
    rows: "rows",
    noDataTitle: "No data",
    noDataDesc: "Profit and loss data will appear after accounts and ledger movements exist.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load profit and loss report",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Profit and loss report refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Profit and loss report",
    generatedAt: "Generated at",
    currentPeriod: "Current period",
    total: "Total",
    unknown: "Unknown",
  },
} as const;

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  account: true,
  type: true,
  debit: true,
  credit: true,
  amount: true,
  percentage: true,
};

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

    if (["1", "true", "yes", "on", "active"].includes(normalized)) return true;
    if (["0", "false", "no", "off", "inactive"].includes(normalized)) return false;
  }

  return fallback;
}

function getApiBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "";

  return configured.replace(/\/+$/, "");
}

function apiUrl(path: string) {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!baseUrl) return normalizedPath;

  return `${baseUrl}${normalizedPath}`;
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
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

function formatPercent(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(toNumber(value));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function extractError(payload: unknown, fallback: string) {
  if (!isRecord(payload)) return fallback;

  const direct =
    normalizeText(payload.message) ||
    normalizeText(payload.detail) ||
    normalizeText(payload.error);

  if (direct) return direct;

  const errors = payload.errors;

  if (typeof errors === "string") return errors;

  if (Array.isArray(errors)) {
    return errors.map((item) => normalizeText(item)).filter(Boolean).join(" ") || fallback;
  }

  if (isRecord(errors)) {
    const first = Object.values(errors)[0];

    if (Array.isArray(first)) return first.map((item) => normalizeText(item)).filter(Boolean).join(" ");
    if (typeof first === "string") return first;
  }

  return fallback;
}

function extractArray(payload: unknown, key: string): unknown[] {
  if (Array.isArray(payload)) return payload;

  const root = asRecord(payload);
  const data = root.data;

  if (Array.isArray(root.results)) return root.results;
  if (Array.isArray(root[key])) return root[key];
  if (Array.isArray(data)) return data;

  if (isRecord(data)) {
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data[key])) return data[key];
  }

  return [];
}

function normalizeAccountType(value: string): "revenue" | "expense" | "other" {
  const type = value.toLowerCase();

  if (["revenue", "income", "sales", "sale"].includes(type)) return "revenue";
  if (["expense", "expenses", "cost", "costs"].includes(type)) return "expense";

  return "other";
}

function accountTypeLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const type = normalizeAccountType(value);

  if (type === "revenue") return t.revenue;
  if (type === "expense") return t.expenses;

  return t.unknown;
}

function normalizeAccount(rawValue: unknown): AccountRecord | null {
  const raw = asRecord(rawValue);

  const id = normalizeText(raw.id || raw.pk || raw.account_id || raw.uuid);
  const code = normalizeText(raw.code || raw.account_code || raw.number);
  const name = normalizeText(raw.name || raw.title || raw.name_ar || raw.name_en || code || id);

  if (!id && !code) return null;

  return {
    id: id || code,
    code: code || id,
    name,
    name_ar: normalizeText(raw.name_ar || raw.arabic_name || name),
    name_en: normalizeText(raw.name_en || raw.english_name || name),
    account_type: normalizeText(raw.account_type || raw.type || raw.category),
    account_type_label: normalizeText(raw.account_type_label || raw.type_label),
    level: toNumber(raw.level || raw.depth, 0),
    is_active: toBoolean(raw.is_active ?? raw.active, true),
  };
}

function normalizeLedgerRow(rawValue: unknown): LedgerRecord | null {
  const raw = asRecord(rawValue);

  const account = asRecord(raw.account || raw.account_data);

  const accountId = normalizeText(
    raw.account_id ||
      raw.account ||
      raw.account_pk ||
      account.id ||
      account.pk,
  );

  const accountCode = normalizeText(
    raw.account_code ||
      raw.code ||
      account.code ||
      account.account_code,
  );

  const accountName = normalizeText(
    raw.account_name ||
      account.name ||
      account.name_ar ||
      account.name_en,
  );

  if (!accountId && !accountCode && !accountName) return null;

  return {
    account_id: accountId,
    account_code: accountCode,
    account_name: accountName,
    debit: toNumber(raw.debit || raw.debit_amount),
    credit: toNumber(raw.credit || raw.credit_amount),
    date: normalizeText(raw.date || raw.entry_date || raw.created_at),
  };
}

function normalizeAccounts(payload: unknown): AccountRecord[] {
  return extractArray(payload, "accounts")
    .map(normalizeAccount)
    .filter((item): item is AccountRecord => Boolean(item));
}

function normalizeLedger(payload: unknown): LedgerRecord[] {
  return extractArray(payload, "ledger")
    .map(normalizeLedgerRow)
    .filter((item): item is LedgerRecord => Boolean(item));
}

function filterLedgerByDate(rows: LedgerRecord[], fromDate: string, toDate: string) {
  if (!fromDate && !toDate) return rows;

  return rows.filter((row) => {
    if (!row.date) return true;

    const current = row.date.slice(0, 10);

    if (fromDate && current < fromDate) return false;
    if (toDate && current > toDate) return false;

    return true;
  });
}

function buildProfitLossRows(accounts: AccountRecord[], ledgerRows: LedgerRecord[]) {
  const ledgerByAccount = new Map<string, { debit: number; credit: number }>();

  ledgerRows.forEach((row) => {
    const key = row.account_id || row.account_code || row.account_name;
    if (!key) return;

    const current = ledgerByAccount.get(key) || { debit: 0, credit: 0 };
    current.debit += row.debit;
    current.credit += row.credit;
    ledgerByAccount.set(key, current);
  });

  const rawRows = accounts
    .filter((account) => account.is_active)
    .map((account) => {
      const accountType = normalizeAccountType(account.account_type);

      if (accountType === "other") return null;

      const key = account.id || account.code || account.name;
      const movement = ledgerByAccount.get(key) || { debit: 0, credit: 0 };

      const amount =
        accountType === "revenue"
          ? Math.max(0, movement.credit - movement.debit)
          : Math.max(0, movement.debit - movement.credit);

      return {
        id: account.id || account.code,
        account_id: account.id,
        account_code: account.code,
        account_name: account.name,
        account_type: accountType,
        account_type_label: account.account_type_label,
        level: account.level,
        debit: movement.debit,
        credit: movement.credit,
        amount,
        percentage: 0,
      } satisfies ProfitLossRow;
    })
    .filter((row): row is ProfitLossRow => Boolean(row));

  const totalRevenue = rawRows
    .filter((row) => row.account_type === "revenue")
    .reduce((sum, row) => sum + row.amount, 0);

  return rawRows.map((row) => ({
    ...row,
    percentage:
      row.account_type === "revenue"
        ? totalRevenue > 0
          ? (row.amount / totalRevenue) * 100
          : 0
        : totalRevenue > 0
          ? (row.amount / totalRevenue) * 100
          : 0,
  }));
}

function buildSummary(rows: ProfitLossRow[]): ProfitLossSummary {
  const revenueRows = rows.filter((row) => row.account_type === "revenue");
  const expenseRows = rows.filter((row) => row.account_type === "expense");

  const revenue = revenueRows.reduce((sum, row) => sum + row.amount, 0);
  const expenses = expenseRows.reduce((sum, row) => sum + row.amount, 0);
  const netProfit = revenue - expenses;

  return {
    revenue,
    expenses,
    gross_profit: revenue - expenses,
    net_profit: netProfit,
    rows_count: rows.length,
    revenue_accounts: revenueRows.length,
    expense_accounts: expenseRows.length,
  };
}

function sortRows(rows: ProfitLossRow[], sort: SortKey, locale: Locale) {
  const copy = [...rows];

  copy.sort((a, b) => {
    if (sort === "name") {
      return a.account_name.localeCompare(b.account_name, locale);
    }

    if (sort === "amount_desc") {
      return b.amount - a.amount;
    }

    if (sort === "amount_asc") {
      return a.amount - b.amount;
    }

    if (sort === "type") {
      return a.account_type.localeCompare(b.account_type, "en") ||
        a.account_code.localeCompare(b.account_code, "en", { numeric: true });
    }

    if (sort === "percentage_desc") {
      return b.percentage - a.percentage;
    }

    return a.account_code.localeCompare(b.account_code, "en", { numeric: true });
  });

  return copy;
}

function MoneyValue({
  value,
  strong = false,
}: {
  value: number;
  strong?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center justify-end gap-1 tabular-nums", strong && "font-semibold")}>
      <span>{formatMoney(value)}</span>
      <img src={SAR_ICON} alt="SAR" className="h-4 w-4 opacity-80" />
    </span>
  );
}

function BadgePill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "purple";
}) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : tone === "purple"
            ? "border-purple-200 bg-purple-50 text-purple-700"
            : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <Badge variant="outline" className={className}>
      {children}
    </Badge>
  );
}

function StatCard({
  title,
  value,
  icon,
  tone = "default",
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone?: "default" | "success" | "danger";
}) {
  const valueClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "danger"
        ? "text-red-700"
        : "text-foreground";

  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className={cn("mt-2 text-2xl font-semibold tabular-nums", valueClass)}>
            <MoneyValue value={value} strong />
          </div>
        </div>

        <div className="rounded-lg bg-muted p-2 text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

function CountCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{formatInteger(value)}</div>
        </div>

        <div className="rounded-lg bg-muted p-2 text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

function PageSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
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
          <Skeleton key={index} className="h-24 rounded-lg" />
        ))}
      </div>

      <Skeleton className="h-[620px] rounded-lg" />
    </div>
  );
}

export default function AccountingProfitLossPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [accounts, setAccounts] = React.useState<AccountRecord[]>([]);
  const [ledgerRows, setLedgerRows] = React.useState<LedgerRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<AccountTypeFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("code");
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

  const loadReport = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setLoading(true);
      setRefreshing(true);
      setError("");

      try {
        const [accountsResponse, ledgerResponse] = await Promise.all([
          fetch(apiUrl("/api/accounting/accounts/?page=1&page_size=500"), {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
          }),
          fetch(apiUrl("/api/accounting/ledger/?page=1&page_size=500"), {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
          }),
        ]);

        const accountsPayload = await accountsResponse.json().catch(() => null);
        const ledgerPayload = await ledgerResponse.json().catch(() => null);

        if (!accountsResponse.ok) {
          throw new Error(extractError(accountsPayload, t.errorDesc));
        }

        if (!ledgerResponse.ok) {
          throw new Error(extractError(ledgerPayload, t.errorDesc));
        }

        setAccounts(normalizeAccounts(accountsPayload));
        setLedgerRows(normalizeLedger(ledgerPayload));

        if (silent) toast.success(t.refreshed);
      } catch (requestError) {
        const message =
          requestError instanceof Error && requestError.message
            ? requestError.message
            : t.errorDesc;

        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t.errorDesc, t.refreshed],
  );

  React.useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const rows = React.useMemo(() => {
    const datedLedger = filterLedgerByDate(ledgerRows, fromDate, toDate);

    return buildProfitLossRows(accounts, datedLedger);
  }, [accounts, fromDate, ledgerRows, toDate]);

  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      const haystack = [
        row.account_code,
        row.account_name,
        accountTypeLabel(row.account_type, locale),
      ]
        .join(" ")
        .toLowerCase();

      if (query && !haystack.includes(query)) return false;
      if (typeFilter !== "all" && row.account_type !== typeFilter) return false;

      return true;
    });

    return sortRows(filtered, sort, locale);
  }, [locale, rows, search, sort, typeFilter]);

  const summary = React.useMemo(() => buildSummary(filteredRows), [filteredRows]);

  const resetFilters = React.useCallback(() => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setTypeFilter("all");
    setSort("code");
    setColumns(DEFAULT_COLUMNS);
  }, []);

  const exportExcel = React.useCallback(() => {
    if (!filteredRows.length) {
      toast.error(t.exportEmpty);
      return;
    }

    const rowsForExport = filteredRows.map((row) => ({
      [t.account]: `${row.account_code} - ${row.account_name}`,
      [t.type]: accountTypeLabel(row.account_type, locale),
      [t.debit]: row.debit,
      [t.credit]: row.credit,
      [t.amount]: row.amount,
      [t.percentage]: `${formatPercent(row.percentage)}%`,
    }));

    const headers = Object.keys(rowsForExport[0] || {});
    const htmlRows = rowsForExport
      .map(
        (row) =>
          `<tr>${headers
            .map((header) => `<td>${escapeHtml(String(row[header as keyof typeof row] ?? ""))}</td>`)
            .join("")}</tr>`,
      )
      .join("");

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
        </head>
        <body>
          <table border="1">
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
    link.download = `primey-care-profit-loss-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();

    URL.revokeObjectURL(url);
  }, [filteredRows, locale, t]);

  const printTable = React.useCallback(() => {
    if (!filteredRows.length) {
      toast.error(t.printEmpty);
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error(t.printEmpty);
      return;
    }

    const direction = locale === "ar" ? "rtl" : "ltr";

    const rowsHtml = filteredRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(`${row.account_code} - ${row.account_name}`)}</td>
            <td>${escapeHtml(accountTypeLabel(row.account_type, locale))}</td>
            <td>${escapeHtml(formatMoney(row.debit))}</td>
            <td>${escapeHtml(formatMoney(row.credit))}</td>
            <td>${escapeHtml(formatMoney(row.amount))}</td>
            <td>${escapeHtml(`${formatPercent(row.percentage)}%`)}</td>
          </tr>
        `,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html dir="${direction}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t.printTitle)}</title>
          <style>
            body {
              font-family: Arial, Tahoma, sans-serif;
              margin: 24px;
              color: #111827;
            }

            h1 {
              margin: 0 0 8px;
              font-size: 22px;
            }

            .meta {
              color: #6b7280;
              margin-bottom: 20px;
              font-size: 12px;
            }

            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }

            .box {
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 12px;
            }

            .box span {
              display: block;
              color: #6b7280;
              font-size: 12px;
              margin-bottom: 6px;
            }

            .box strong {
              font-size: 16px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }

            th,
            td {
              border: 1px solid #e5e7eb;
              padding: 8px;
              text-align: start;
            }

            th {
              background: #f9fafb;
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(t.printTitle)}</h1>
          <div class="meta">${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString("en-US"))}</div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.revenue)}</span><strong>${escapeHtml(formatMoney(summary.revenue))}</strong></div>
            <div class="box"><span>${escapeHtml(t.expenses)}</span><strong>${escapeHtml(formatMoney(summary.expenses))}</strong></div>
            <div class="box"><span>${escapeHtml(t.grossProfit)}</span><strong>${escapeHtml(formatMoney(summary.gross_profit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.netProfit)}</span><strong>${escapeHtml(formatMoney(summary.net_profit))}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.account)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
                <th>${escapeHtml(t.amount)}</th>
                <th>${escapeHtml(t.percentage)}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
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
  }, [filteredRows, locale, summary, t]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="w-full space-y-4" dir={dir}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href="/system/accounting" className="hover:text-foreground">
              {t.back}
            </Link>
            <span>/</span>
            <span className="text-foreground">{t.title}</span>
          </div>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/system/accounting">
              <BackIcon className="h-4 w-4" />
              {t.back}
            </Link>
          </Button>

          <Button
            variant="outline"
            onClick={() => void loadReport({ silent: true })}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {t.refresh}
          </Button>

          <Button variant="outline" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            {t.export}
          </Button>

          <Button variant="outline" onClick={printTable}>
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50/60 shadow-none">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-red-100 p-2 text-red-700">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-red-900">{t.errorTitle}</h2>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>

            <Button variant="outline" className="bg-background" onClick={() => void loadReport()}>
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t.revenue}
          value={summary.revenue}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          title={t.expenses}
          value={summary.expenses}
          icon={<TrendingDown className="h-5 w-5" />}
          tone="danger"
        />
        <StatCard
          title={t.grossProfit}
          value={summary.gross_profit}
          icon={<Landmark className="h-5 w-5" />}
          tone={summary.gross_profit >= 0 ? "success" : "danger"}
        />
        <StatCard
          title={t.netProfit}
          value={summary.net_profit}
          icon={<WalletCards className="h-5 w-5" />}
          tone={summary.net_profit >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
        <CountCard
          title={t.revenueAccounts}
          value={summary.revenue_accounts}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <CountCard
          title={t.expenseAccounts}
          value={summary.expense_accounts}
          icon={<BookOpen className="h-5 w-5" />}
        />
      </div>

      <Card className="rounded-lg border bg-card shadow-none">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>{t.title}</CardTitle>
              <CardDescription>{t.subtitle}</CardDescription>
            </div>

            <CardAction>
              <BadgePill tone={summary.net_profit >= 0 ? "success" : "danger"}>
                <CheckCircle2 className="me-1 h-3.5 w-3.5" />
                {summary.net_profit >= 0 ? t.profit : t.loss}
              </BadgePill>
            </CardAction>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_170px]">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.searchPlaceholder}
                className="ps-9"
              />
            </div>

            <div className="relative">
              <CalendarDays className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="ps-9"
                dir="ltr"
                aria-label={t.from}
              />
            </div>

            <div className="relative">
              <CalendarDays className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="ps-9"
                dir="ltr"
                aria-label={t.to}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as AccountTypeFilter)}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder={t.accountType} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="revenue">{t.revenue}</SelectItem>
                  <SelectItem value="expense">{t.expenses}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                <SelectTrigger className="w-[190px]">
                  <ArrowUpDown className="h-4 w-4" />
                  <SelectValue placeholder={t.sort} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="code">{t.codeSort}</SelectItem>
                  <SelectItem value="name">{t.nameSort}</SelectItem>
                  <SelectItem value="amount_desc">{t.amountHigh}</SelectItem>
                  <SelectItem value="amount_asc">{t.amountLow}</SelectItem>
                  <SelectItem value="type">{t.typeSort}</SelectItem>
                  <SelectItem value="percentage_desc">{t.percentageHigh}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select
                value=""
                onValueChange={(value) => {
                  if (value in columns) {
                    setColumns((current) => ({
                      ...current,
                      [value]: !current[value as ColumnKey],
                    }));
                  }
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SlidersHorizontal className="h-4 w-4" />
                  <SelectValue placeholder={t.columns} />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(columns) as ColumnKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {columns[key] ? "✓ " : ""}{t[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button type="button" variant="outline" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[940px]">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40">
                    <TableHead className="w-12">
                      <Checkbox checked={false} disabled />
                    </TableHead>
                    {columns.account ? <TableHead>{t.account}</TableHead> : null}
                    {columns.type ? <TableHead>{t.type}</TableHead> : null}
                    {columns.debit ? <TableHead className="text-end">{t.debit}</TableHead> : null}
                    {columns.credit ? <TableHead className="text-end">{t.credit}</TableHead> : null}
                    {columns.amount ? <TableHead className="text-end">{t.amount}</TableHead> : null}
                    {columns.percentage ? <TableHead className="text-end">{t.percentage}</TableHead> : null}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredRows.length ? (
                    filteredRows.map((row) => (
                      <TableRow key={row.id} className="h-[62px]">
                        <TableCell>
                          <Checkbox checked={false} disabled />
                        </TableCell>

                        {columns.account ? (
                          <TableCell>
                            <div className="font-medium">{row.account_name}</div>
                            <div className="text-xs text-muted-foreground" dir="ltr">
                              {row.account_code}
                            </div>
                          </TableCell>
                        ) : null}

                        {columns.type ? (
                          <TableCell>
                            <BadgePill tone={row.account_type === "revenue" ? "success" : "danger"}>
                              {accountTypeLabel(row.account_type, locale)}
                            </BadgePill>
                          </TableCell>
                        ) : null}

                        {columns.debit ? (
                          <TableCell className="text-end">
                            <MoneyValue value={row.debit} />
                          </TableCell>
                        ) : null}

                        {columns.credit ? (
                          <TableCell className="text-end">
                            <MoneyValue value={row.credit} />
                          </TableCell>
                        ) : null}

                        {columns.amount ? (
                          <TableCell className="text-end">
                            <MoneyValue value={row.amount} strong />
                          </TableCell>
                        ) : null}

                        {columns.percentage ? (
                          <TableCell className="text-end tabular-nums">
                            {formatPercent(row.percentage)}%
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="rounded-full bg-muted p-4">
                            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <h3 className="mt-4 font-semibold">
                            {rows.length ? t.noResultsTitle : t.noDataTitle}
                          </h3>
                          <p className="mt-1 max-w-md text-sm text-muted-foreground">
                            {rows.length ? t.noResultsDesc : t.noDataDesc}
                          </p>
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