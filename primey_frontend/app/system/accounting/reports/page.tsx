"use client";

/* ============================================================
   📂 app/system/accounting/reports/page.tsx
   🧾 Primey Care — Accounting Reports Center
   ------------------------------------------------------------
   ✅ Approved operational pattern
   ✅ Real API only:
      GET /api/accounting/accounts/?page=1&page_size=500
      GET /api/accounting/ledger/?page=1&page_size=500
   ✅ No missing reports endpoint calls
   ✅ Accounting reports hub + live summary
   ✅ Search / type filter / sort / columns
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
  BarChart3,
  BookOpen,
  Building2,
  CalendarClock,
  FileSpreadsheet,
  FolderTree,
  Landmark,
  Layers3,
  Loader2,
  NotebookText,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
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
  is_active: boolean;
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

type ReportType =
  | "all"
  | "statement"
  | "financial"
  | "operations"
  | "setup";

type SortKey = "recommended" | "name" | "type" | "status";

type ColumnKey =
  | "report"
  | "type"
  | "description"
  | "status"
  | "updated"
  | "actions";

type AccountingReport = {
  id: string;
  title: string;
  description: string;
  type: Exclude<ReportType, "all">;
  href: string;
  status: "ready" | "setup";
  updated: string;
  icon: React.ComponentType<{ className?: string }>;
};

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  report: true,
  type: true,
  description: true,
  status: true,
  updated: true,
  actions: true,
};

const translations = {
  ar: {
    title: "تقارير المحاسبة",
    subtitle:
      "مركز تقارير المحاسبة لعرض القوائم المالية، دفتر الأستاذ، القيود، والحسابات.",
    back: "المحاسبة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    open: "فتح التقرير",

    searchPlaceholder: "ابحث باسم التقرير أو الوصف...",
    reportType: "نوع التقرير",
    sort: "الترتيب",
    columns: "الأعمدة",

    all: "الكل",
    statement: "قوائم مالية",
    financial: "تحليل مالي",
    operations: "عمليات محاسبية",
    setup: "إعدادات محاسبية",

    recommended: "الموصى به",
    nameSort: "اسم التقرير",
    typeSort: "نوع التقرير",
    statusSort: "الحالة",

    accounts: "الحسابات",
    movements: "الحركات",
    revenue: "الإيرادات",
    expenses: "المصروفات",
    activeAccounts: "حساب نشط",
    ledgerMovements: "حركة محاسبية",
    revenueAccounts: "حساب إيراد",
    expenseAccounts: "حساب مصروف",

    report: "التقرير",
    type: "النوع",
    description: "الوصف",
    status: "الحالة",
    updated: "آخر تحديث",
    actions: "الإجراءات",
    ready: "جاهز",
    setupNeeded: "إعداد",

    trialBalance: "ميزان المراجعة",
    trialBalanceDesc: "مراجعة أرصدة الحسابات المدينة والدائنة والتأكد من توازنها.",
    profitLoss: "الأرباح والخسائر",
    profitLossDesc: "تحليل الإيرادات والمصروفات وصافي الربح أو الخسارة.",
    balanceSheet: "الميزانية العمومية",
    balanceSheetDesc: "عرض الأصول والالتزامات وحقوق الملكية وفرق التوازن.",
    ledger: "دفتر الأستاذ",
    ledgerDesc: "استعراض حركات الحسابات والمدين والدائن والرصيد الجاري.",
    journals: "قيود اليومية",
    journalsDesc: "متابعة القيود المحاسبية وسطورها وحالة الترحيل والتوازن.",
    accountsReport: "دليل الحسابات",
    accountsReportDesc: "عرض شجرة الحسابات وأنواعها وحالتها وقابليتها للترحيل.",
    periods: "الفترات المحاسبية",
    periodsDesc: "إدارة الفترات المحاسبية وحالة الفتح والإغلاق.",
    fiscalYears: "السنوات المالية",
    fiscalYearsDesc: "إدارة السنوات المالية وربطها بالفترات المحاسبية.",
    costCenters: "مراكز التكلفة",
    costCentersDesc: "تحليل الحسابات والقيود حسب مراكز التكلفة.",

    showing: "عرض",
    of: "من",
    rows: "صفوف",
    noDataTitle: "لا توجد تقارير",
    noDataDesc: "لم يتم العثور على تقارير محاسبية للعرض.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل بيانات التقارير",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث تقارير المحاسبة.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير مركز تقارير المحاسبة",
    generatedAt: "تاريخ الطباعة",
    sar: "ر.س",
  },
  en: {
    title: "Accounting Reports",
    subtitle:
      "Accounting reports center for financial statements, ledger, journals, and accounts.",
    back: "Accounting",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    open: "Open report",

    searchPlaceholder: "Search by report name or description...",
    reportType: "Report type",
    sort: "Sort",
    columns: "Columns",

    all: "All",
    statement: "Statements",
    financial: "Financial analysis",
    operations: "Accounting operations",
    setup: "Accounting setup",

    recommended: "Recommended",
    nameSort: "Report name",
    typeSort: "Report type",
    statusSort: "Status",

    accounts: "Accounts",
    movements: "Movements",
    revenue: "Revenue",
    expenses: "Expenses",
    activeAccounts: "Active accounts",
    ledgerMovements: "Ledger movements",
    revenueAccounts: "Revenue accounts",
    expenseAccounts: "Expense accounts",

    report: "Report",
    type: "Type",
    description: "Description",
    status: "Status",
    updated: "Updated",
    actions: "Actions",
    ready: "Ready",
    setupNeeded: "Setup",

    trialBalance: "Trial Balance",
    trialBalanceDesc: "Review debit and credit account balances and verify balance.",
    profitLoss: "Profit & Loss",
    profitLossDesc: "Analyze revenue, expenses, and net profit or loss.",
    balanceSheet: "Balance Sheet",
    balanceSheetDesc: "View assets, liabilities, equity, and balance difference.",
    ledger: "General Ledger",
    ledgerDesc: "Review account movements, debit, credit, and running balance.",
    journals: "Journal Entries",
    journalsDesc: "Track accounting entries, lines, posting, and balance status.",
    accountsReport: "Chart of Accounts",
    accountsReportDesc: "View account tree, types, status, and posting readiness.",
    periods: "Accounting Periods",
    periodsDesc: "Manage accounting periods and opening or closing status.",
    fiscalYears: "Fiscal Years",
    fiscalYearsDesc: "Manage fiscal years and related accounting periods.",
    costCenters: "Cost Centers",
    costCentersDesc: "Analyze accounts and journal entries by cost center.",

    showing: "Showing",
    of: "of",
    rows: "rows",
    noDataTitle: "No reports",
    noDataDesc: "No accounting reports were found.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load reports data",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Accounting reports refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Accounting reports center report",
    generatedAt: "Generated at",
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
    is_active: toBoolean(item.is_active, true),
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
    account_name: normalizeText(
      item.account_name || account.name || account.name_ar || account.name_en,
    ),
    debit: toNumber(item.debit ?? item.debit_amount ?? item.total_debit),
    credit: toNumber(item.credit ?? item.credit_amount ?? item.total_credit),
  };
}

function normalizeAccountType(value: string) {
  const type = value.toLowerCase();

  if (["revenue", "income", "sales", "sale"].includes(type)) return "revenue";
  if (["expense", "expenses", "cost", "costs"].includes(type)) return "expense";
  if (["asset", "assets"].includes(type)) return "asset";
  if (["liability", "liabilities"].includes(type)) return "liability";
  if (["equity", "owner_equity", "capital"].includes(type)) return "equity";

  return "other";
}

function getReportTypeLabel(type: AccountingReport["type"], locale: Locale) {
  const t = translations[locale];

  if (type === "statement") return t.statement;
  if (type === "financial") return t.financial;
  if (type === "operations") return t.operations;

  return t.setup;
}

function getStatusLabel(status: AccountingReport["status"], locale: Locale) {
  const t = translations[locale];
  return status === "ready" ? t.ready : t.setupNeeded;
}

function getBadgeClass(value: string) {
  const normalized = value.toLowerCase();

  if (["ready", "statement", "revenue"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (["financial", "operations"].includes(normalized)) {
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

function ReportsSkeleton() {
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

export default function AccountingReportsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [accounts, setAccounts] = React.useState<AccountRecord[]>([]);
  const [ledgerRows, setLedgerRows] = React.useState<LedgerRecord[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const [searchInput, setSearchInput] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<ReportType>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("recommended");
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

  const reports = React.useMemo<AccountingReport[]>(
    () => [
      {
        id: "trial-balance",
        title: t.trialBalance,
        description: t.trialBalanceDesc,
        type: "statement",
        href: "/system/accounting/trial-balance",
        status: "ready",
        updated: formatDateTime(new Date().toISOString()),
        icon: ShieldCheck,
      },
      {
        id: "profit-loss",
        title: t.profitLoss,
        description: t.profitLossDesc,
        type: "financial",
        href: "/system/accounting/profit-loss",
        status: "ready",
        updated: formatDateTime(new Date().toISOString()),
        icon: TrendingUp,
      },
      {
        id: "balance-sheet",
        title: t.balanceSheet,
        description: t.balanceSheetDesc,
        type: "statement",
        href: "/system/accounting/balance-sheet",
        status: "ready",
        updated: formatDateTime(new Date().toISOString()),
        icon: Landmark,
      },
      {
        id: "ledger",
        title: t.ledger,
        description: t.ledgerDesc,
        type: "operations",
        href: "/system/accounting/ledger",
        status: "ready",
        updated: formatDateTime(new Date().toISOString()),
        icon: BookOpen,
      },
      {
        id: "journals",
        title: t.journals,
        description: t.journalsDesc,
        type: "operations",
        href: "/system/accounting/journals",
        status: "ready",
        updated: formatDateTime(new Date().toISOString()),
        icon: NotebookText,
      },
      {
        id: "accounts",
        title: t.accountsReport,
        description: t.accountsReportDesc,
        type: "setup",
        href: "/system/accounting/accounts",
        status: "ready",
        updated: formatDateTime(new Date().toISOString()),
        icon: FolderTree,
      },
      {
        id: "periods",
        title: t.periods,
        description: t.periodsDesc,
        type: "setup",
        href: "/system/accounting/periods",
        status: "ready",
        updated: formatDateTime(new Date().toISOString()),
        icon: CalendarClock,
      },
      {
        id: "fiscal-years",
        title: t.fiscalYears,
        description: t.fiscalYearsDesc,
        type: "setup",
        href: "/system/accounting/fiscal-years",
        status: "ready",
        updated: formatDateTime(new Date().toISOString()),
        icon: Layers3,
      },
      {
        id: "cost-centers",
        title: t.costCenters,
        description: t.costCentersDesc,
        type: "setup",
        href: "/system/accounting/cost-centers",
        status: "ready",
        updated: formatDateTime(new Date().toISOString()),
        icon: Building2,
      },
    ],
    [t],
  );

  const loadReportsData = React.useCallback(
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
    void loadReportsData();
  }, [loadReportsData]);

  const summary = React.useMemo(() => {
    const revenueAccounts = accounts.filter(
      (account) => normalizeAccountType(account.account_type) === "revenue",
    );

    const expenseAccounts = accounts.filter(
      (account) => normalizeAccountType(account.account_type) === "expense",
    );

    let revenue = 0;
    let expenses = 0;

    ledgerRows.forEach((row) => {
      const relatedAccount = accounts.find(
        (account) =>
          account.id === row.account_id ||
          account.code === row.account_code ||
          account.name === row.account_name,
      );

      const type = normalizeAccountType(relatedAccount?.account_type || "");

      if (type === "revenue") {
        revenue += Math.max(0, row.credit - row.debit);
      }

      if (type === "expense") {
        expenses += Math.max(0, row.debit - row.credit);
      }
    });

    return {
      activeAccounts: accounts.length,
      ledgerMovements: ledgerRows.length,
      revenue,
      expenses,
      revenueAccounts: revenueAccounts.length,
      expenseAccounts: expenseAccounts.length,
    };
  }, [accounts, ledgerRows]);

  const filteredReports = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let result = reports.filter((report) => {
      const matchesSearch =
        !query ||
        report.title.toLowerCase().includes(query) ||
        report.description.toLowerCase().includes(query) ||
        getReportTypeLabel(report.type, locale).toLowerCase().includes(query);

      const matchesType = typeFilter === "all" || report.type === typeFilter;

      return matchesSearch && matchesType;
    });

    result = [...result].sort((a, b) => {
      if (sortKey === "name") return a.title.localeCompare(b.title);
      if (sortKey === "type") return a.type.localeCompare(b.type);
      if (sortKey === "status") return a.status.localeCompare(b.status);

      return reports.findIndex((report) => report.id === a.id) - reports.findIndex((report) => report.id === b.id);
    });

    return result;
  }, [locale, reports, searchInput, sortKey, typeFilter]);

  const hasActiveFilters =
    Boolean(searchInput.trim()) || typeFilter !== "all" || sortKey !== "recommended";

  const visibleColumnCount = Object.values(columns).filter(Boolean).length;

  function resetFilters() {
    setSearchInput("");
    setTypeFilter("all");
    setSortKey("recommended");
  }

  function columnLabel(key: ColumnKey) {
    if (key === "report") return t.report;
    if (key === "type") return t.type;
    if (key === "description") return t.description;
    if (key === "status") return t.status;
    if (key === "updated") return t.updated;
    return t.actions;
  }

  function buildExportRows() {
    return filteredReports.map((report) => ({
      report: report.title,
      type: getReportTypeLabel(report.type, locale),
      description: report.description,
      status: getStatusLabel(report.status, locale),
      updated: report.updated,
      href: report.href,
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
          <p>${escapeHtml(t.accounts)}: ${escapeHtml(summary.activeAccounts)}</p>
          <p>${escapeHtml(t.movements)}: ${escapeHtml(summary.ledgerMovements)}</p>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.report)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.updated)}</th>
              </tr>
            </thead>
            <tbody>
              ${exportRows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.report)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.updated)}</td>
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
    link.download = `primey-care-accounting-reports-${new Date()
      .toISOString()
      .slice(0, 10)}.xls`;
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
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
            <div>
              <p>${escapeHtml(t.showing)}: ${escapeHtml(exportRows.length)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.accounts)}</span><strong>${escapeHtml(summary.activeAccounts)}</strong></div>
            <div class="box"><span>${escapeHtml(t.movements)}</span><strong>${escapeHtml(summary.ledgerMovements)}</strong></div>
            <div class="box"><span>${escapeHtml(t.revenue)}</span><strong>${escapeHtml(formatMoney(summary.revenue))}</strong></div>
            <div class="box"><span>${escapeHtml(t.expenses)}</span><strong>${escapeHtml(formatMoney(summary.expenses))}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.report)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.updated)}</th>
              </tr>
            </thead>
            <tbody>
              ${exportRows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.report)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.updated)}</td>
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
        <ReportsSkeleton />
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
            onClick={() => void loadReportsData({ silent: true })}
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
          title={t.accounts}
          value={formatInteger(summary.activeAccounts)}
          trend={t.activeAccounts}
          icon={FolderTree}
        />

        <KpiCard
          title={t.movements}
          value={formatInteger(summary.ledgerMovements)}
          trend={t.ledgerMovements}
          icon={BookOpen}
        />

        <KpiCard
          title={t.revenue}
          value={<MoneyValue value={summary.revenue} label={t.sar} />}
          trend={`${t.revenueAccounts}: ${formatInteger(summary.revenueAccounts)}`}
          icon={TrendingUp}
        />

        <KpiCard
          title={t.expenses}
          value={<MoneyValue value={summary.expenses} label={t.sar} />}
          trend={`${t.expenseAccounts}: ${formatInteger(summary.expenseAccounts)}`}
          icon={TrendingDown}
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
              onClick={() => void loadReportsData()}
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
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as ReportType)}
              >
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[185px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t.reportType}: {t.all}
                  </SelectItem>
                  <SelectItem value="statement">{t.statement}</SelectItem>
                  <SelectItem value="financial">{t.financial}</SelectItem>
                  <SelectItem value="operations">{t.operations}</SelectItem>
                  <SelectItem value="setup">{t.setup}</SelectItem>
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
                  <SelectItem value="recommended">{t.recommended}</SelectItem>
                  <SelectItem value="name">{t.nameSort}</SelectItem>
                  <SelectItem value="type">{t.typeSort}</SelectItem>
                  <SelectItem value="status">{t.statusSort}</SelectItem>
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
              <Table className="min-w-[1080px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    {columns.report ? (
                      <TableHead className="h-11 w-[280px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.report}
                      </TableHead>
                    ) : null}

                    {columns.type ? (
                      <TableHead className="h-11 w-[155px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.type}
                      </TableHead>
                    ) : null}

                    {columns.description ? (
                      <TableHead className="h-11 w-[340px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.description}
                      </TableHead>
                    ) : null}

                    {columns.status ? (
                      <TableHead className="h-11 w-[120px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.status}
                      </TableHead>
                    ) : null}

                    {columns.updated ? (
                      <TableHead className="h-11 w-[150px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                        {t.updated}
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
                  {filteredReports.length ? (
                    filteredReports.map((report) => {
                      const Icon = report.icon;

                      return (
                        <TableRow key={report.id} className="h-[66px]">
                          {columns.report ? (
                            <TableCell className="h-[66px] w-[280px] overflow-hidden px-4 text-right align-middle">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-foreground">
                                    {report.title}
                                  </span>
                                  <span className="block truncate text-xs text-muted-foreground">
                                    {report.id}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                          ) : null}

                          {columns.type ? (
                            <TableCell className="h-[66px] w-[155px] overflow-hidden px-4 text-right align-middle">
                              <StatusBadge
                                value={report.type}
                                label={getReportTypeLabel(report.type, locale)}
                              />
                            </TableCell>
                          ) : null}

                          {columns.description ? (
                            <TableCell className="h-[66px] w-[340px] overflow-hidden px-4 text-right align-middle">
                              <span className="block truncate text-sm text-muted-foreground">
                                {report.description}
                              </span>
                            </TableCell>
                          ) : null}

                          {columns.status ? (
                            <TableCell className="h-[66px] w-[120px] overflow-hidden px-4 text-right align-middle">
                              <StatusBadge
                                value={report.status}
                                label={getStatusLabel(report.status, locale)}
                              />
                            </TableCell>
                          ) : null}

                          {columns.updated ? (
                            <TableCell className="h-[66px] w-[150px] overflow-hidden px-4 text-right align-middle">
                              <span className="block truncate text-sm text-muted-foreground tabular-nums">
                                {report.updated}
                              </span>
                            </TableCell>
                          ) : null}

                          {columns.actions ? (
                            <TableCell className="h-[66px] w-[120px] overflow-hidden px-4 text-center align-middle">
                              <Button asChild variant="outline" size="sm" className="h-8 rounded-lg">
                                <Link href={report.href}>
                                  <BarChart3 className="h-4 w-4" />
                                  {t.open}
                                </Link>
                              </Button>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      );
                    })
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
              {formatInteger(filteredReports.length)}
            </span>{" "}
            {t.of}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatInteger(reports.length)}
            </span>{" "}
            {t.rows}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}