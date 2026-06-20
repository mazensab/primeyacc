"use client";

/* ============================================================
   📂 primey_frontend/app/system/accounting/page.tsx
   🧾 Primey Care — Accounting Dashboard
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API only
   ✅ Header / KPI cards / operational links / latest journals
   ✅ Removed financial reports card section
   ✅ Removed chart of accounts table section
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
  ArrowUpDown,
  BarChart3,
  BookOpen,
  CalendarDays,
  CircleDollarSign,
  FileSpreadsheet,
  FileText,
  Landmark,
  Layers3,
  Loader2,
  PieChart,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Split,
  Tags,
  TriangleAlert,
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
  count?: number;
  total?: number;
  total_count?: number;
  results?: unknown[];
  items?: unknown[];
  data?: unknown;
  summary?: unknown;
  meta?: unknown;
  report_code?: string;
};

type AccountingStats = {
  accounts: number;
  activeAccounts: number;
  postingAccounts: number;
  journals: number;
  postedJournals: number;
  unbalancedJournals: number;
  costCenters: number;
  periods: number;
  fiscalYears: number;
  taxRates: number;
  routingRules: number;
  totalDebit: number;
  totalCredit: number;
  netProfit: number;
  assetsTotal: number;
  liabilitiesTotal: number;
  equityTotal: number;
  isTrialBalanced: boolean;
  isBalanceSheetBalanced: boolean;
};

type JournalRecord = {
  id: string;
  entry_number: string;
  entry_date: string | null;
  period_name: string;
  status: string;
  status_label: string;
  posting_source: string;
  posting_source_label: string;
  source_number: string;
  description: string;
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  lines_count: number;
  created_at: string | null;
};

type JournalStatusFilter = "all" | "draft" | "posted" | "cancelled" | "reversed";
type SortKey = "newest" | "oldest" | "amount_high" | "amount_low" | "name";

type LinkItem = {
  titleKey:
    | "totalAccounts"
    | "journalEntries"
    | "accountStatement"
    | "ledger"
    | "trialBalance"
    | "profitLoss"
    | "balanceSheet"
    | "accountingReports"
    | "periods"
    | "fiscalYears"
    | "costCenters"
    | "taxRates"
    | "routingRules"
    | "accountingSettings";
  descKey:
    | "accountsDesc"
    | "journalsDesc"
    | "accountStatementDesc"
    | "ledgerDesc"
    | "trialBalanceDesc"
    | "profitLossDesc"
    | "balanceSheetDesc"
    | "reportsDesc"
    | "periodsDesc"
    | "fiscalYearsDesc"
    | "costCentersDesc"
    | "taxRatesDesc"
    | "routingRulesDesc"
    | "settingsDesc";
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const API = {
  accounts: "/api/accounting/accounts/",
  journals: "/api/accounting/journals/",
  trialBalance: "/api/accounting/reports/trial-balance/",
  profitLoss: "/api/accounting/reports/profit-loss/",
  balanceSheet: "/api/accounting/reports/balance-sheet/",
  costCenters: "/api/accounting/cost-centers/",
  fiscalYears: "/api/accounting/fiscal-years/",
  periods: "/api/accounting/periods/",
  taxRates: "/api/accounting/tax-rates/",
  routingRules: "/api/accounting/routing-rules/",
};

const translations = {
  ar: {
    title: "المحاسبة",
    subtitle:
      "لوحة محاسبية موحدة لمتابعة دليل الحسابات، القيود، التقارير المالية، الفترات، الضرائب، ومراكز التكلفة.",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    from: "من",
    to: "إلى",
    all: "الكل",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    amountHigh: "الأعلى مبلغًا",
    amountLow: "الأقل مبلغًا",
    nameSort: "الاسم",
    open: "فتح",
    showing: "عرض",
    rows: "صفوف",
    of: "من",

    totalAccounts: "دليل الحسابات",
    activeAccounts: "الحسابات النشطة",
    postingAccounts: "حسابات قابلة للترحيل",
    journalEntries: "قيود اليومية",
    costCenters: "مراكز التكلفة",
    periods: "الفترات المحاسبية",
    fiscalYears: "السنوات المالية",
    taxRates: "معدلات الضريبة",
    routingRules: "قواعد التوجيه",
    trialBalance: "ميزان المراجعة",
    profitLoss: "الأرباح والخسائر",
    balanceSheet: "الميزانية العمومية",
    ledger: "دفتر الأستاذ",
    accountStatement: "كشف الحساب",
    accountingReports: "التقارير المحاسبية",
    accountingSettings: "إعدادات المحاسبة",

    totalDebit: "إجمالي المدين",
    totalCredit: "إجمالي الدائن",
    netProfit: "صافي الربح",
    assetsTotal: "إجمالي الأصول",
    liabilitiesTotal: "إجمالي الالتزامات",
    equityTotal: "إجمالي حقوق الملكية",
    balanced: "متوازن",
    notBalanced: "غير متوازن",

    operationsSection: "روابط المحاسبة التشغيلية",
    operationsSectionDesc: "وصول مباشر إلى صفحات المحاسبة الرئيسية.",
    latestJournals: "آخر قيود اليومية",
    latestJournalsDesc: "أحدث القيود المحاسبية مع حالة التوازن والترحيل.",

    journalsSearchPlaceholder: "ابحث برقم القيد أو المصدر أو الوصف...",

    entryNumber: "رقم القيد",
    entryDate: "تاريخ القيد",
    period: "الفترة",
    status: "الحالة",
    postingSource: "مصدر الترحيل",
    sourceNumber: "رقم المصدر",
    description: "الوصف",
    debit: "مدين",
    credit: "دائن",
    lines: "السطور",

    draft: "مسودة",
    posted: "مرحل",
    cancelled: "ملغي",
    reversed: "معكوس",

    accountsDesc: "إدارة دليل الحسابات والشجرة المحاسبية.",
    journalsDesc: "إدارة قيود اليومية والترحيل المحاسبي.",
    accountStatementDesc: "كشف حساب تفصيلي للعميل أو المندوب مع الفلاتر والحركات المالية.",
    ledgerDesc: "استعراض حركة الحسابات والرصيد الجاري.",
    trialBalanceDesc: "تقرير ميزان المراجعة للفترة.",
    profitLossDesc: "تقرير الإيرادات والمصروفات وصافي الربح.",
    balanceSheetDesc: "تقرير الأصول والالتزامات وحقوق الملكية.",
    reportsDesc: "مركز التقارير المحاسبية.",
    periodsDesc: "إدارة الفترات المحاسبية.",
    fiscalYearsDesc: "إدارة السنوات المالية.",
    costCentersDesc: "إدارة مراكز التكلفة.",
    taxRatesDesc: "إدارة معدلات الضريبة.",
    routingRulesDesc: "إدارة قواعد التوجيه المحاسبي.",
    settingsDesc: "إعدادات المحاسبة العامة.",

    createJournal: "إنشاء قيد",
    errorTitle: "تعذر تحميل لوحة المحاسبة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث لوحة المحاسبة.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير لوحة المحاسبة",
    generatedAt: "تاريخ الطباعة",
    noDataTitle: "لا توجد قيود يومية",
    noDataDesc: "ستظهر أحدث القيود المحاسبية هنا.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    sar: "ر.س",
  },
  en: {
    title: "Accounting",
    subtitle:
      "Unified accounting dashboard for chart of accounts, journals, financial reports, periods, taxes, and cost centers.",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    from: "From",
    to: "To",
    all: "All",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    amountHigh: "Highest amount",
    amountLow: "Lowest amount",
    nameSort: "Name",
    open: "Open",
    showing: "Showing",
    rows: "rows",
    of: "of",

    totalAccounts: "Chart of accounts",
    activeAccounts: "Active accounts",
    postingAccounts: "Posting accounts",
    journalEntries: "Journal entries",
    costCenters: "Cost centers",
    periods: "Accounting periods",
    fiscalYears: "Fiscal years",
    taxRates: "Tax rates",
    routingRules: "Routing rules",
    trialBalance: "Trial balance",
    profitLoss: "Profit & loss",
    balanceSheet: "Balance sheet",
    ledger: "Ledger",
    accountStatement: "Account statement",
    accountingReports: "Accounting reports",
    accountingSettings: "Accounting settings",

    totalDebit: "Total debit",
    totalCredit: "Total credit",
    netProfit: "Net profit",
    assetsTotal: "Total assets",
    liabilitiesTotal: "Total liabilities",
    equityTotal: "Total equity",
    balanced: "Balanced",
    notBalanced: "Not balanced",

    operationsSection: "Operational accounting links",
    operationsSectionDesc: "Direct access to main accounting pages.",
    latestJournals: "Latest journal entries",
    latestJournalsDesc: "Recent accounting entries with balance and posting status.",

    journalsSearchPlaceholder: "Search by entry number, source, or description...",

    entryNumber: "Entry number",
    entryDate: "Entry date",
    period: "Period",
    status: "Status",
    postingSource: "Posting source",
    sourceNumber: "Source number",
    description: "Description",
    debit: "Debit",
    credit: "Credit",
    lines: "Lines",

    draft: "Draft",
    posted: "Posted",
    cancelled: "Cancelled",
    reversed: "Reversed",

    accountsDesc: "Manage chart of accounts and account tree.",
    journalsDesc: "Manage journal entries and accounting posting.",
    accountStatementDesc: "Detailed customer or agent statement with filters and financial movements.",
    ledgerDesc: "Review account movements and running balances.",
    trialBalanceDesc: "Trial balance report for the period.",
    profitLossDesc: "Revenue, expenses, and net profit report.",
    balanceSheetDesc: "Assets, liabilities, and equity report.",
    reportsDesc: "Accounting reports center.",
    periodsDesc: "Manage accounting periods.",
    fiscalYearsDesc: "Manage fiscal years.",
    costCentersDesc: "Manage cost centers.",
    taxRatesDesc: "Manage tax rates.",
    routingRulesDesc: "Manage accounting routing rules.",
    settingsDesc: "General accounting settings.",

    createJournal: "Create journal",
    errorTitle: "Unable to load accounting dashboard",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Accounting dashboard refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Accounting dashboard report",
    generatedAt: "Generated at",
    noDataTitle: "No journal entries",
    noDataDesc: "Latest journal entries will appear here.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    sar: "SAR",
  },
} as const;

const OPERATION_LINKS: LinkItem[] = [
  { titleKey: "totalAccounts", descKey: "accountsDesc", href: "/system/accounting/accounts", icon: BookOpen },
  { titleKey: "journalEntries", descKey: "journalsDesc", href: "/system/accounting/journals", icon: ReceiptText },
  { titleKey: "accountStatement", descKey: "accountStatementDesc", href: "/system/accounting/account_statement", icon: FileText },
  { titleKey: "ledger", descKey: "ledgerDesc", href: "/system/accounting/ledger", icon: BookOpen },
  { titleKey: "trialBalance", descKey: "trialBalanceDesc", href: "/system/accounting/trial-balance", icon: BarChart3 },
  { titleKey: "profitLoss", descKey: "profitLossDesc", href: "/system/accounting/profit-loss", icon: CircleDollarSign },
  { titleKey: "balanceSheet", descKey: "balanceSheetDesc", href: "/system/accounting/balance-sheet", icon: Landmark },
  { titleKey: "accountingReports", descKey: "reportsDesc", href: "/system/accounting/reports", icon: PieChart },
  { titleKey: "periods", descKey: "periodsDesc", href: "/system/accounting/periods", icon: CalendarDays },
  { titleKey: "fiscalYears", descKey: "fiscalYearsDesc", href: "/system/accounting/fiscal-years", icon: Layers3 },
  { titleKey: "costCenters", descKey: "costCentersDesc", href: "/system/accounting/cost-centers", icon: Split },
  { titleKey: "taxRates", descKey: "taxRatesDesc", href: "/system/accounting/tax-rates", icon: Tags },
  { titleKey: "routingRules", descKey: "routingRulesDesc", href: "/system/accounting/routing-rules", icon: ShieldCheck },
  { titleKey: "accountingSettings", descKey: "settingsDesc", href: "/system/accounting/settings", icon: Settings },
];

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

    if (["1", "true", "yes", "on", "active", "balanced", "posted"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off", "inactive", "unbalanced", "draft"].includes(normalized)) {
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

function extractArray(payload: ApiResponse | null) {
  if (!payload) return [];

  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;

  const data = asRecord(payload.data);

  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.accounts)) return data.accounts;
  if (Array.isArray(data.entries)) return data.entries;
  if (Array.isArray(data.journals)) return data.journals;

  return [];
}

function payloadCount(payload: ApiResponse | null, fallbackRows: unknown[]) {
  if (!payload) return fallbackRows.length;

  const data = asRecord(payload.data);
  const meta = asRecord(payload.meta);

  return toNumber(
    payload.count ??
      payload.total ??
      payload.total_count ??
      data.count ??
      data.total ??
      data.total_count ??
      meta.count ??
      meta.total,
    fallbackRows.length,
  );
}

function normalizeJournal(value: unknown): JournalRecord {
  const item = asRecord(value);
  const period = asRecord(item.period || item.accounting_period);
  const debit = toNumber(item.total_debit ?? item.debit ?? item.debit_amount);
  const credit = toNumber(item.total_credit ?? item.credit ?? item.credit_amount);

  return {
    id: normalizeText(item.id || item.pk || item.uuid),
    entry_number: normalizeText(
      item.entry_number || item.journal_number || item.number || item.reference || item.code,
    ),
    entry_date:
      normalizeText(item.entry_date || item.date || item.posting_date || item.created_at) || null,
    period_name: normalizeText(item.period_name || period.name || period.title || period.code),
    status: normalizeText(item.status || item.entry_status || "draft").toLowerCase(),
    status_label: normalizeText(item.status_label),
    posting_source: normalizeText(item.posting_source || item.source || item.module),
    posting_source_label: normalizeText(item.posting_source_label || item.source_label),
    source_number: normalizeText(item.source_number || item.source_reference || item.reference_number),
    description: normalizeText(item.description || item.notes || item.memo),
    total_debit: debit,
    total_credit: credit,
    is_balanced: toBoolean(item.is_balanced ?? item.balanced, Math.abs(debit - credit) < 0.01),
    lines_count: toNumber(item.lines_count ?? item.items_count ?? item.entries_count),
    created_at: normalizeText(item.created_at) || null,
  };
}

function statusLabel(status: string, locale: Locale) {
  const t = translations[locale];
  const normalized = status.toLowerCase();

  if (normalized === "posted") return t.posted;
  if (normalized === "cancelled") return t.cancelled;
  if (normalized === "reversed") return t.reversed;

  return t.draft;
}

function getStatusClass(value: string) {
  const normalized = value.toLowerCase();

  if (normalized === "posted" || normalized === "balanced") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (normalized === "cancelled" || normalized === "unbalanced") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (normalized === "reversed") {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
}

function StatusBadge({ value, label }: { value: string; label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", getStatusClass(value))}
    >
      {label}
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

function DashboardSkeleton() {
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

function KpiCard({
  title,
  value,
  trend,
  href,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  trend: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href}>
      <Card className="rounded-lg border bg-card shadow-none transition-colors hover:bg-muted/30">
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
    </Link>
  );
}

function EmptyTableState({
  title,
  description,
  resetLabel,
  onReset,
  showReset,
}: {
  title: string;
  description: string;
  resetLabel: string;
  onReset: () => void;
  showReset: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
        <Search className="h-6 w-6 text-muted-foreground" />
      </div>

      <div className="space-y-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {showReset ? (
        <Button variant="outline" className="h-9 rounded-lg" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default function SystemAccountingPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [stats, setStats] = React.useState<AccountingStats>({
    accounts: 0,
    activeAccounts: 0,
    postingAccounts: 0,
    journals: 0,
    postedJournals: 0,
    unbalancedJournals: 0,
    costCenters: 0,
    periods: 0,
    fiscalYears: 0,
    taxRates: 0,
    routingRules: 0,
    totalDebit: 0,
    totalCredit: 0,
    netProfit: 0,
    assetsTotal: 0,
    liabilitiesTotal: 0,
    equityTotal: 0,
    isTrialBalanced: true,
    isBalanceSheetBalanced: true,
  });
  const [journals, setJournals] = React.useState<JournalRecord[]>([]);

  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  const [journalsSearch, setJournalsSearch] = React.useState("");
  const [journalsStatus, setJournalsStatus] = React.useState<JournalStatusFilter>("all");
  const [journalsSort, setJournalsSort] = React.useState<SortKey>("newest");

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

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

  const loadDashboard = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const listParams = new URLSearchParams({
          page: "1",
          page_size: "500",
        });

        const journalParams = new URLSearchParams({
          page: "1",
          page_size: "500",
          ordering: "-entry_date",
        });

        if (dateFrom) journalParams.set("date_from", dateFrom);
        if (dateTo) journalParams.set("date_to", dateTo);

        const [
          accountsPayload,
          journalsPayload,
          trialPayload,
          profitPayload,
          balancePayload,
          costCentersPayload,
          fiscalYearsPayload,
          periodsPayload,
          taxRatesPayload,
          routingRulesPayload,
        ] = await Promise.all([
          fetchJson<ApiResponse>(makeApiUrl(API.accounts, listParams), controller.signal).catch(() => null),
          fetchJson<ApiResponse>(makeApiUrl(API.journals, journalParams), controller.signal).catch(() => null),
          fetchJson<ApiResponse>(makeApiUrl(API.trialBalance, listParams), controller.signal).catch(() => null),
          fetchJson<ApiResponse>(makeApiUrl(API.profitLoss, listParams), controller.signal).catch(() => null),
          fetchJson<ApiResponse>(makeApiUrl(API.balanceSheet, listParams), controller.signal).catch(() => null),
          fetchJson<ApiResponse>(makeApiUrl(API.costCenters, listParams), controller.signal).catch(() => null),
          fetchJson<ApiResponse>(makeApiUrl(API.fiscalYears, listParams), controller.signal).catch(() => null),
          fetchJson<ApiResponse>(makeApiUrl(API.periods, listParams), controller.signal).catch(() => null),
          fetchJson<ApiResponse>(makeApiUrl(API.taxRates, listParams), controller.signal).catch(() => null),
          fetchJson<ApiResponse>(makeApiUrl(API.routingRules, listParams), controller.signal).catch(() => null),
        ]);

        const accountRows = extractArray(accountsPayload);
        const journalRows = extractArray(journalsPayload)
          .map(normalizeJournal)
          .filter((item) => item.id || item.entry_number);

        const trialSummary = asRecord(trialPayload?.summary || asRecord(trialPayload?.data).summary);
        const profitSummary = asRecord(profitPayload?.summary || asRecord(profitPayload?.data).summary);
        const balanceSummary = asRecord(balancePayload?.summary || asRecord(balancePayload?.data).summary);

        const totalDebit =
          toNumber(trialSummary.total_debit ?? trialSummary.debit) ||
          journalRows.reduce((sum, item) => sum + item.total_debit, 0);

        const totalCredit =
          toNumber(trialSummary.total_credit ?? trialSummary.credit) ||
          journalRows.reduce((sum, item) => sum + item.total_credit, 0);

        const assetsTotal = toNumber(balanceSummary.assets_total ?? balanceSummary.total_assets);
        const liabilitiesTotal = toNumber(balanceSummary.liabilities_total ?? balanceSummary.total_liabilities);
        const equityTotal = toNumber(balanceSummary.equity_total ?? balanceSummary.total_equity);

        const nextStats: AccountingStats = {
          accounts: payloadCount(accountsPayload, accountRows),
          activeAccounts: accountRows.filter((row) => {
            const item = asRecord(row);
            return toBoolean(item.is_active ?? item.active, true);
          }).length,
          postingAccounts: accountRows.filter((row) => {
            const item = asRecord(row);
            return toBoolean(item.is_posting ?? item.allow_posting ?? item.posting_account, false);
          }).length,
          journals: payloadCount(journalsPayload, journalRows),
          postedJournals: journalRows.filter((item) => item.status === "posted").length,
          unbalancedJournals: journalRows.filter((item) => !item.is_balanced).length,
          costCenters: payloadCount(costCentersPayload, extractArray(costCentersPayload)),
          periods: payloadCount(periodsPayload, extractArray(periodsPayload)),
          fiscalYears: payloadCount(fiscalYearsPayload, extractArray(fiscalYearsPayload)),
          taxRates: payloadCount(taxRatesPayload, extractArray(taxRatesPayload)),
          routingRules: payloadCount(routingRulesPayload, extractArray(routingRulesPayload)),
          totalDebit,
          totalCredit,
          netProfit: toNumber(profitSummary.net_profit ?? profitSummary.profit ?? profitSummary.net_income),
          assetsTotal,
          liabilitiesTotal,
          equityTotal,
          isTrialBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
          isBalanceSheetBalanced: toBoolean(
            balanceSummary.is_balanced ?? balanceSummary.balanced,
            Math.abs(assetsTotal - (liabilitiesTotal + equityTotal)) < 0.01,
          ),
        };

        setStats(nextStats);
        setJournals(journalRows);

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
    void loadDashboard();
  }, [loadDashboard]);

  const filteredJournals = React.useMemo(() => {
    const query = journalsSearch.trim().toLowerCase();

    let result = journals.filter((journal) => {
      const matchesSearch =
        !query ||
        journal.entry_number.toLowerCase().includes(query) ||
        journal.posting_source.toLowerCase().includes(query) ||
        journal.posting_source_label.toLowerCase().includes(query) ||
        journal.source_number.toLowerCase().includes(query) ||
        journal.description.toLowerCase().includes(query);

      const matchesStatus = journalsStatus === "all" || journal.status === journalsStatus;

      return matchesSearch && matchesStatus;
    });

    result = [...result].sort((a, b) => {
      if (journalsSort === "oldest") {
        return String(a.entry_date || a.created_at || "").localeCompare(
          String(b.entry_date || b.created_at || ""),
        );
      }

      if (journalsSort === "amount_high") {
        return Math.max(b.total_debit, b.total_credit) - Math.max(a.total_debit, a.total_credit);
      }

      if (journalsSort === "amount_low") {
        return Math.max(a.total_debit, a.total_credit) - Math.max(b.total_debit, b.total_credit);
      }

      if (journalsSort === "name") {
        return a.entry_number.localeCompare(b.entry_number);
      }

      return String(b.entry_date || b.created_at || "").localeCompare(
        String(a.entry_date || a.created_at || ""),
      );
    });

    return result.slice(0, 12);
  }, [journals, journalsSearch, journalsSort, journalsStatus]);

  const hasJournalFilters =
    Boolean(journalsSearch.trim()) || journalsStatus !== "all" || journalsSort !== "newest";

  function resetJournalFilters() {
    setJournalsSearch("");
    setJournalsStatus("all");
    setJournalsSort("newest");
  }

  function buildExportRows() {
    return filteredJournals.map((journal) => ({
      entryNumber: journal.entry_number || "—",
      entryDate: formatDate(journal.entry_date),
      period: journal.period_name || "—",
      status: journal.status_label || statusLabel(journal.status, locale),
      postingSource: journal.posting_source_label || journal.posting_source || "—",
      sourceNumber: journal.source_number || "—",
      debit: formatMoney(journal.total_debit),
      credit: formatMoney(journal.total_credit),
      balanced: journal.is_balanced ? t.balanced : t.notBalanced,
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
          <p>${escapeHtml(t.totalAccounts)}: ${escapeHtml(stats.accounts)}</p>
          <p>${escapeHtml(t.journalEntries)}: ${escapeHtml(stats.journals)}</p>
          <p>${escapeHtml(t.totalDebit)}: ${escapeHtml(formatMoney(stats.totalDebit))}</p>
          <p>${escapeHtml(t.totalCredit)}: ${escapeHtml(formatMoney(stats.totalCredit))}</p>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.entryNumber)}</th>
                <th>${escapeHtml(t.entryDate)}</th>
                <th>${escapeHtml(t.period)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.postingSource)}</th>
                <th>${escapeHtml(t.sourceNumber)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
                <th>${escapeHtml(t.balanced)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.entryNumber)}</td>
                      <td>${escapeHtml(row.entryDate)}</td>
                      <td>${escapeHtml(row.period)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.postingSource)}</td>
                      <td>${escapeHtml(row.sourceNumber)}</td>
                      <td>${escapeHtml(row.debit)}</td>
                      <td>${escapeHtml(row.credit)}</td>
                      <td>${escapeHtml(row.balanced)}</td>
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
    link.download = `primey-care-accounting-${new Date().toISOString().slice(0, 10)}.xls`;
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
            <div class="box"><span>${escapeHtml(t.totalAccounts)}</span><strong>${escapeHtml(stats.accounts)}</strong></div>
            <div class="box"><span>${escapeHtml(t.journalEntries)}</span><strong>${escapeHtml(stats.journals)}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalDebit)}</span><strong>${escapeHtml(formatMoney(stats.totalDebit))}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalCredit)}</span><strong>${escapeHtml(formatMoney(stats.totalCredit))}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.entryNumber)}</th>
                <th>${escapeHtml(t.entryDate)}</th>
                <th>${escapeHtml(t.period)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.postingSource)}</th>
                <th>${escapeHtml(t.sourceNumber)}</th>
                <th>${escapeHtml(t.debit)}</th>
                <th>${escapeHtml(t.credit)}</th>
                <th>${escapeHtml(t.balanced)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.entryNumber)}</td>
                      <td>${escapeHtml(row.entryDate)}</td>
                      <td>${escapeHtml(row.period)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.postingSource)}</td>
                      <td>${escapeHtml(row.sourceNumber)}</td>
                      <td>${escapeHtml(row.debit)}</td>
                      <td>${escapeHtml(row.credit)}</td>
                      <td>${escapeHtml(row.balanced)}</td>
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
        <DashboardSkeleton />
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
          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={() => void loadDashboard({ silent: true })}
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

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-none xl:flex-row xl:items-center xl:justify-between">
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

          <Button
            variant="outline"
            className="h-9 rounded-lg bg-background"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
          >
            <RotateCcw className="h-4 w-4" />
            {t.reset}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          {t.trialBalance}:{" "}
          <span className="font-medium text-foreground">
            {stats.isTrialBalanced ? t.balanced : t.notBalanced}
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalAccounts}
          value={formatInteger(stats.accounts)}
          trend={`${t.postingAccounts}: ${formatInteger(stats.postingAccounts)}`}
          href="/system/accounting/accounts"
          icon={BookOpen}
        />

        <KpiCard
          title={t.journalEntries}
          value={formatInteger(stats.journals)}
          trend={`${t.posted}: ${formatInteger(stats.postedJournals)}`}
          href="/system/accounting/journals"
          icon={ReceiptText}
        />

        <KpiCard
          title={t.trialBalance}
          value={stats.isTrialBalanced ? t.balanced : t.notBalanced}
          trend={`${formatMoney(stats.totalDebit)} ${t.sar}`}
          href="/system/accounting/trial-balance"
          icon={BarChart3}
        />

        <KpiCard
          title={t.profitLoss}
          value={<MoneyValue value={stats.netProfit} label={t.sar} />}
          trend={t.netProfit}
          href="/system/accounting/profit-loss"
          icon={CircleDollarSign}
        />

        <KpiCard
          title={t.balanceSheet}
          value={stats.isBalanceSheetBalanced ? t.balanced : t.notBalanced}
          trend={`${formatMoney(stats.assetsTotal)} ${t.sar}`}
          href="/system/accounting/balance-sheet"
          icon={Landmark}
        />

        <KpiCard
          title={t.costCenters}
          value={formatInteger(stats.costCenters)}
          trend={t.costCenters}
          href="/system/accounting/cost-centers"
          icon={Split}
        />

        <KpiCard
          title={t.periods}
          value={formatInteger(stats.periods)}
          trend={`${t.fiscalYears}: ${formatInteger(stats.fiscalYears)}`}
          href="/system/accounting/periods"
          icon={CalendarDays}
        />

        <KpiCard
          title={t.taxRates}
          value={formatInteger(stats.taxRates)}
          trend={`${t.routingRules}: ${formatInteger(stats.routingRules)}`}
          href="/system/accounting/tax-rates"
          icon={Tags}
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
              onClick={() => void loadDashboard()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
        <CardHeader className="px-6 py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>{t.latestJournals}</CardTitle>
              <CardDescription>{t.latestJournalsDesc}</CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" className="h-9 rounded-lg bg-background">
                <Link href="/system/accounting/journals/create">
                  <ReceiptText className="h-4 w-4" />
                  {t.createJournal}
                </Link>
              </Button>
            </div>
          </div>
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
                value={journalsSearch}
                onChange={(event) => setJournalsSearch(event.target.value)}
                placeholder={t.journalsSearchPlaceholder}
                className={cn(
                  "h-10 rounded-lg bg-background",
                  locale === "ar" ? "pr-9" : "pl-9",
                )}
              />
            </div>

            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={journalsStatus}
                  onValueChange={(value) => setJournalsStatus(value as JournalStatusFilter)}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="draft">{t.draft}</SelectItem>
                    <SelectItem value="posted">{t.posted}</SelectItem>
                    <SelectItem value="cancelled">{t.cancelled}</SelectItem>
                    <SelectItem value="reversed">{t.reversed}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={journalsSort}
                  onValueChange={(value) => setJournalsSort(value as SortKey)}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[155px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="oldest">{t.oldest}</SelectItem>
                    <SelectItem value="amount_high">{t.amountHigh}</SelectItem>
                    <SelectItem value="amount_low">{t.amountLow}</SelectItem>
                    <SelectItem value="name">{t.nameSort}</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  className="h-9 rounded-lg bg-background"
                  onClick={resetJournalFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[1220px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="h-11 w-[150px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.entryNumber}
                    </TableHead>
                    <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.entryDate}
                    </TableHead>
                    <TableHead className="h-11 w-[155px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.period}
                    </TableHead>
                    <TableHead className="h-11 w-[115px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.status}
                    </TableHead>
                    <TableHead className="h-11 w-[150px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.postingSource}
                    </TableHead>
                    <TableHead className="h-11 w-[170px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.sourceNumber}
                    </TableHead>
                    <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.debit}
                    </TableHead>
                    <TableHead className="h-11 w-[130px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.credit}
                    </TableHead>
                    <TableHead className="h-11 w-[105px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.lines}
                    </TableHead>
                    <TableHead className="h-11 w-[80px] whitespace-nowrap px-4 text-center text-xs font-semibold text-muted-foreground">
                      {t.open}
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredJournals.length ? (
                    filteredJournals.map((journal) => (
                      <TableRow key={journal.id || journal.entry_number} className="h-[62px]">
                        <TableCell className="h-[62px] w-[150px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {journal.entry_number}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm tabular-nums text-muted-foreground">
                            {formatDate(journal.entry_date)}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[155px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm text-muted-foreground">
                            {journal.period_name || "—"}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[115px] overflow-hidden px-4 text-right align-middle">
                          <StatusBadge
                            value={journal.status}
                            label={journal.status_label || statusLabel(journal.status, locale)}
                          />
                        </TableCell>

                        <TableCell className="h-[62px] w-[150px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm text-muted-foreground">
                            {journal.posting_source_label || "—"}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[170px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm text-muted-foreground">
                            {journal.source_number || "—"}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                          <MoneyValue value={journal.total_debit} label={t.sar} />
                        </TableCell>

                        <TableCell className="h-[62px] w-[130px] overflow-hidden px-4 text-right align-middle">
                          <MoneyValue value={journal.total_credit} label={t.sar} />
                        </TableCell>

                        <TableCell className="h-[62px] w-[105px] overflow-hidden px-4 text-right align-middle">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium tabular-nums">
                              {formatInteger(journal.lines_count)}
                            </span>
                            <StatusBadge
                              value={journal.is_balanced ? "balanced" : "unbalanced"}
                              label={journal.is_balanced ? t.balanced : t.notBalanced}
                            />
                          </div>
                        </TableCell>

                        <TableCell className="h-[62px] w-[80px] overflow-hidden px-4 text-center align-middle">
                          <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
                            <Link href={`/system/accounting/journals/${journal.id}`}>{t.open}</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="h-72">
                        <EmptyTableState
                          title={hasJournalFilters ? t.noResultsTitle : t.noDataTitle}
                          description={hasJournalFilters ? t.noResultsDesc : t.noDataDesc}
                          resetLabel={t.reset}
                          onReset={resetJournalFilters}
                          showReset={hasJournalFilters}
                        />
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
              {formatInteger(filteredJournals.length)}
            </span>{" "}
            {t.of}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatInteger(journals.length)}
            </span>{" "}
            {t.rows}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border bg-card shadow-none">
        <CardHeader className="px-6 py-5">
          <CardTitle>{t.operationsSection}</CardTitle>
          <CardDescription>{t.operationsSectionDesc}</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {OPERATION_LINKS.map((item) => {
            const Icon = item.icon;

            return (
              <Button
                key={item.href}
                asChild
                variant="outline"
                className="h-auto justify-start rounded-lg bg-background p-3 text-right"
              >
                <Link href={item.href}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/30">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {t[item.titleKey]}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t[item.descKey]}
                    </p>
                  </div>
                </Link>
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}