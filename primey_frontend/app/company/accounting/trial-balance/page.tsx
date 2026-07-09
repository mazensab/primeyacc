// ============================================================
// 📂 app/company/accounting/trial-balance/page.tsx
// 🧠 Mhamcloud | Company Accounting Trial Balance
// ------------------------------------------------------------
// ✅ Approved company dashboard premium pattern
// ✅ Real API only
// ✅ SMACC-style trial balance columns
// ✅ Account level filter
// ✅ Calendar + Popover from components/ui
// ============================================================
"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpDown,
  BadgeCheck,
  CalendarDays,
  FileSpreadsheet,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
type AccountTypeFilter = "all" | "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
type AccountLevelFilter = "leaf" | "all" | "1" | "2" | "3" | "4" | "5";
type SortKey = "code" | "name" | "period_debit" | "period_credit" | "closing";
type TrialBalanceRow = {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  accountType: string;
  nature: string;
  parentCode: string;
  parentName: string;
  openingDebit: number;
  openingCredit: number;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
  closingBalance: number;
};
const ALL_TYPES = "all";
const translations = {
  ar: {
    title: "ميزان المراجعة",
    subtitle:
      "كشف أرصدة الحسابات حسب المستوى مع رصيد أول الفترة وحركة العمليات والإغلاق مثل تقارير الأنظمة المحاسبية.",
    badge: "وحدة الحسابات",
    accountingDashboard: "لوحة الحسابات",
    journalEntries: "القيود اليومية",
    ledger: "دفتر الأستاذ",
    chartOfAccounts: "دليل الحسابات",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    totalAccounts: "الحسابات المعروضة",
    totalDebit: "إجمالي حركة المدين",
    totalCredit: "إجمالي حركة الدائن",
    difference: "فرق الإغلاق",
    totalAccountsDesc: "عدد الحسابات حسب المستوى المحدد",
    totalDebitDesc: "حركة العمليات - الجانب المدين",
    totalCreditDesc: "حركة العمليات - الجانب الدائن",
    differenceDesc: "فرق رصيد آخر المدة",
    balanced: "متوازن",
    notBalanced: "غير متوازن",
    filtersTitle: "فلاتر ميزان المراجعة",
    filtersDesc: "اختر الفترة والمستوى ونوع الحساب ثم حدّث النتائج من قاعدة البيانات.",
    dateFrom: "من تاريخ",
    dateTo: "إلى تاريخ",
    accountType: "نوع الحساب",
    accountLevel: "المستوى",
    allTypes: "كل الأنواع",
    allLevels: "كل المستويات",
    leafLevel: "الحسابات التفصيلية",
    level1: "المستوى 1",
    level2: "المستوى 2",
    level3: "المستوى 3",
    level4: "المستوى 4",
    level5: "المستوى 5",
    ASSET: "الأصول",
    LIABILITY: "الالتزامات",
    EQUITY: "حقوق الملكية",
    REVENUE: "الإيرادات",
    EXPENSE: "المصروفات",
    includeZero: "إظهار الحسابات الصفرية",
    showAccountCode: "إظهار رقم الحساب",
    searchPlaceholder: "ابحث بالكود أو الاسم أو نوع الحساب...",
    sortCode: "ترتيب بالكود",
    sortName: "ترتيب بالاسم",
    sortPeriodDebit: "ترتيب بحركة المدين",
    sortPeriodCredit: "ترتيب بحركة الدائن",
    sortClosing: "ترتيب برصيد الإغلاق",
    registerTitle: "سجل ميزان المراجعة",
    registerDesc:
      "يعرض الحسابات حسب المستوى المختار مع أرصدة أول الفترة وحركة العمليات ورصيد آخر المدة.",
    accountName: "اسم الحساب",
    openingGroup: "أول الفترة",
    movementGroup: "حركة العمليات",
    closingGroup: "الإغلاق",
    debitShort: "مدين",
    creditShort: "دائن",
    balanceShort: "الرصيد",
    openingDebit: "رصيد الجانب المدين أول الفترة",
    openingCredit: "رصيد الجانب الدائن أول الفترة",
    openingBalance: "الرصيد الافتتاحي",
    periodDebit: "حركة العمليات - الجانب المدين",
    periodCredit: "حركة العمليات - الجانب الدائن",
    closingDebit: "إغلاق - الجانب المدين",
    closingCredit: "إغلاق - الجانب الدائن",
    closingBalance: "الرصيد الختامي",
    emptyTitle: "لا توجد بيانات في ميزان المراجعة",
    emptyDesc: "غيّر الفلاتر أو أنشئ قيودًا مرحلة من صفحة القيود اليومية.",
    loading: "جاري تحميل ميزان المراجعة...",
    loadFailed: "تعذر تحميل ميزان المراجعة.",
    sar: "ر.س",
  },
  en: {
    title: "Trial Balance",
    subtitle:
      "Account balances by level with opening balance, period movement, and closing balance.",
    badge: "Accounting Module",
    accountingDashboard: "Accounting Dashboard",
    journalEntries: "Journal Entries",
    ledger: "General Ledger",
    chartOfAccounts: "Chart of Accounts",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    totalAccounts: "Displayed accounts",
    totalDebit: "Period debit total",
    totalCredit: "Period credit total",
    difference: "Closing difference",
    totalAccountsDesc: "Accounts by selected level",
    totalDebitDesc: "Period movement - debit side",
    totalCreditDesc: "Period movement - credit side",
    differenceDesc: "Closing balance difference",
    balanced: "Balanced",
    notBalanced: "Not balanced",
    filtersTitle: "Trial Balance Filters",
    filtersDesc: "Choose period, level, and account type, then refresh results from the database.",
    dateFrom: "From date",
    dateTo: "To date",
    accountType: "Account type",
    accountLevel: "Level",
    allTypes: "All types",
    allLevels: "All levels",
    leafLevel: "Detailed accounts",
    level1: "Level 1",
    level2: "Level 2",
    level3: "Level 3",
    level4: "Level 4",
    level5: "Level 5",
    ASSET: "Assets",
    LIABILITY: "Liabilities",
    EQUITY: "Equity",
    REVENUE: "Revenue",
    EXPENSE: "Expenses",
    includeZero: "Show zero accounts",
    showAccountCode: "Show account code",
    searchPlaceholder: "Search by code, name, or account type...",
    sortCode: "Sort by code",
    sortName: "Sort by name",
    sortPeriodDebit: "Sort by period debit",
    sortPeriodCredit: "Sort by period credit",
    sortClosing: "Sort by closing",
    registerTitle: "Trial Balance Register",
    registerDesc:
      "Displays accounts by selected level with opening, period movement, and closing balances.",
    accountName: "Account name",
    openingGroup: "Opening",
    movementGroup: "Movement",
    closingGroup: "Closing",
    debitShort: "Debit",
    creditShort: "Credit",
    balanceShort: "Balance",
    openingDebit: "Opening debit side balance",
    openingCredit: "Opening credit side balance",
    openingBalance: "Opening balance",
    periodDebit: "Period movement - debit side",
    periodCredit: "Period movement - credit side",
    closingDebit: "Closing - debit side",
    closingCredit: "Closing - credit side",
    closingBalance: "Closing balance",
    emptyTitle: "No trial balance data",
    emptyDesc: "Change filters or create posted entries from Journal Entries.",
    loading: "Loading trial balance...",
    loadFailed: "Could not load trial balance.",
    sar: "SAR",
  },
} as const;
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
function apiBase() {
  const value = (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");
  return value.endsWith("/api") ? value.slice(0, -4) : value;
}
function apiUrl(path: string) {
  return `${apiBase()}${path}`;
}
function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2
    ? decodeURIComponent(parts.pop()?.split(";").shift() || "")
    : "";
}
async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  if (method !== "GET" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (method !== "GET") {
    const csrf = getCookie("csrftoken") || getCookie("csrf_token");
    if (csrf) headers.set("X-CSRFToken", csrf);
  }
  const response = await fetch(apiUrl(path), {
    ...init,
    method,
    credentials: "include",
    headers,
  });
  const text = await response.text();
  const payload = (text ? JSON.parse(text) : {}) as ApiRecord;
  if (!response.ok) {
    throw new Error(String(payload.message || payload.detail || `HTTP ${response.status}`));
  }
  return payload as T;
}
function record(value: unknown): ApiRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ApiRecord)
    : {};
}
function arrayFromPayload(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const row = record(value);
  for (const key of ["results", "items", "rows", "data"]) {
    const next = row[key];
    if (Array.isArray(next)) return next;
    if (next && typeof next === "object") {
      const nested = arrayFromPayload(next);
      if (nested.length) return nested;
    }
  }
  return [];
}
function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}
function numberValue(value: unknown) {
  const parsed = Number(String(value ?? "0").replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
function formatMoney(value: unknown) {
  const parsed = numberValue(value);
  return parsed.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function formatInteger(value: number) {
  return Math.trunc(value || 0).toLocaleString("en-US");
}
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function yearStartIso() {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}
function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function normalizeRow(value: unknown): TrialBalanceRow {
  const row = record(value);
  const account = record(row.account);
  const parent = record(account.parent);
  return {
    id: text(account.id || row.id || account.code),
    code: text(account.code || row.code),
    name: text(account.name || row.name || account.code),
    nameEn: text(account.name_en || row.name_en),
    accountType: text(account.account_type || row.account_type),
    nature: text(account.nature || row.nature),
    parentCode: text(parent.code || row.parent_code),
    parentName: text(parent.name || row.parent_name),
    openingDebit: numberValue(row.opening_debit),
    openingCredit: numberValue(row.opening_credit),
    openingBalance: numberValue(row.opening_balance),
    periodDebit: numberValue(row.period_debit || row.total_debit),
    periodCredit: numberValue(row.period_credit || row.total_credit),
    closingDebit: numberValue(row.closing_debit),
    closingCredit: numberValue(row.closing_credit),
    closingBalance: numberValue(row.closing_balance || row.balance),
  };
}
function MoneyValue({ value, label }: { value: unknown; label: string }) {
  return (
    <span className="inline-flex min-w-[92px] items-center justify-end gap-1 font-black tabular-nums">
      <span>{formatMoney(value)}</span>
      <Image src="/currency/sar.svg" alt={label} width={13} height={13} />
    </span>
  );
}
function DatePickerField({
  label,
  value,
  onChange,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir: "rtl" | "ltr";
}) {
  const selectedDate = parseIsoDate(value);
  return (
    <label className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-start rounded-xl bg-background px-3 font-mono text-sm font-semibold tabular-nums"
          >
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span>{value || "YYYY-MM-DD"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align={dir === "rtl" ? "end" : "start"} className="w-auto rounded-2xl p-0" dir={dir}>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) onChange(toIsoDate(date));
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </label>
  );
}
function AccountTypeLabel({
  value,
  locale,
}: {
  value: string;
  locale: Locale;
}) {
  const labels: Record<string, { ar: string; en: string }> = {
    ASSET: { ar: "الأصول", en: "Assets" },
    LIABILITY: { ar: "الالتزامات", en: "Liabilities" },
    EQUITY: { ar: "حقوق الملكية", en: "Equity" },
    REVENUE: { ar: "الإيرادات", en: "Revenue" },
    EXPENSE: { ar: "المصروفات", en: "Expenses" },
  };
  return <>{labels[value]?.[locale] || value || "—"}</>;
}
function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  money,
  label,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  money?: boolean;
  label: string;
}) {
  return (
    <Card className="group h-[128px] overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-5 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-black tracking-tight tabular-nums">
            {money ? <MoneyValue value={value} label={label} /> : formatInteger(value)}
          </CardTitle>
        </div>
        <span className="rounded-2xl bg-primary/10 p-2.5 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="px-5 pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
export default function CompanyAccountingTrialBalancePage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [rows, setRows] = React.useState<TrialBalanceRow[]>([]);
  const [search, setSearch] = React.useState("")
  React.useEffect(() => {
    // primeyAccountQueryPrefill: open reports already filtered by the selected account.
    const params = new URLSearchParams(window.location.search);
    const query =
      params.get("account_code") ||
      params.get("search") ||
      params.get("q") ||
      params.get("account") ||
      params.get("account_id") ||
      "";
    if (query.trim()) {
      setSearch(query.trim());
    }
  }, []);
;
  const [dateFrom, setDateFrom] = React.useState(yearStartIso);
  const [dateTo, setDateTo] = React.useState(todayIso);
  const [accountType, setAccountType] = React.useState<AccountTypeFilter>(ALL_TYPES);
  const [accountLevel, setAccountLevel] = React.useState<AccountLevelFilter>("leaf");
  const [includeZero, setIncludeZero] = React.useState(false);
  const [showAccountCode, setShowAccountCode] = React.useState(false);
  const [sort, setSort] = React.useState<SortKey>("code");
  const [loading, setLoading] = React.useState(true);
  const [apiSummary, setApiSummary] = React.useState<ApiRecord>({});
  React.useEffect(() => {
    const applyLocale = () => {
      const next = getInitialLocale();
      setLocale(next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      document.body.dir = next === "ar" ? "rtl" : "ltr";
    };
    applyLocale();
    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);
    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);
  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = rows.filter((row) => {
      if (!q) return true;
      return [
        row.code,
        row.name,
        row.nameEn,
        row.accountType,
        row.nature,
        row.parentCode,
        row.parentName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    return [...result].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, locale === "ar" ? "ar" : "en");
      if (sort === "period_debit") return b.periodDebit - a.periodDebit;
      if (sort === "period_credit") return b.periodCredit - a.periodCredit;
      if (sort === "closing") return Math.abs(b.closingBalance) - Math.abs(a.closingBalance);
      return a.code.localeCompare(b.code, "en");
    });
  }, [locale, rows, search, sort]);
  const stats = React.useMemo(() => {
    const totalDebit =
      numberValue(apiSummary.period_debit_total || apiSummary.total_debit) ||
      filteredRows.reduce((sum, row) => sum + row.periodDebit, 0);
    const totalCredit =
      numberValue(apiSummary.period_credit_total || apiSummary.total_credit) ||
      filteredRows.reduce((sum, row) => sum + row.periodCredit, 0);
    const difference =
      numberValue(apiSummary.closing_difference || apiSummary.difference) ||
      filteredRows.reduce((sum, row) => sum + row.closingDebit - row.closingCredit, 0);
    return {
      rowsCount: filteredRows.length,
      totalDebit,
      totalCredit,
      difference,
      isBalanced: Math.abs(difference) < 0.005,
    };
  }, [apiSummary, filteredRows]);
  const loadTrialBalance = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (accountType !== ALL_TYPES) params.set("account_type", accountType);
      if (accountLevel) params.set("level", accountLevel);
      if (includeZero) params.set("include_zero", "true");
      const payload = await fetchJson<unknown>(
        `/api/company/accounting/reports/trial-balance/?${params.toString()}`,
      );
      const payloadRecord = record(payload);
      setApiSummary(record(payloadRecord.summary));
      setRows(arrayFromPayload(payload).map(normalizeRow));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [accountLevel, accountType, dateFrom, dateTo, includeZero, t.loadFailed]);
  React.useEffect(() => {
    void loadTrialBalance();
  }, [loadTrialBalance]);
  function resetFilters() {
    setSearch("");
    setDateFrom(yearStartIso());
    setDateTo(todayIso());
    setAccountType(ALL_TYPES);
    setAccountLevel("leaf");
    setIncludeZero(false);
    setShowAccountCode(false);
    setSort("code");
  }
  function exportExcel() {
    const headers = [
      t.accountName,
      t.openingDebit,
      t.openingCredit,
      t.openingBalance,
      t.periodDebit,
      t.periodCredit,
      t.closingDebit,
      t.closingCredit,
      t.closingBalance,
    ];
    const exportRows = filteredRows.map((row) => [
      showAccountCode ? `${row.code} — ${row.name}` : row.name,
      formatMoney(row.openingDebit),
      formatMoney(row.openingCredit),
      formatMoney(row.openingBalance),
      formatMoney(row.periodDebit),
      formatMoney(row.periodCredit),
      formatMoney(row.closingDebit),
      formatMoney(row.closingCredit),
      formatMoney(row.closingBalance),
    ]);
    const html = `<html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${headers
      .map((header) => `<th>${header}</th>`)
      .join("")}</tr></thead><tbody>${exportRows
      .map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replaceAll("<", "&lt;")}</td>`).join("")}</tr>`)
      .join("")}</tbody></table></body></html>`;
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "trial-balance.xls";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative min-h-[154px] p-5 sm:p-7">
            <div className="absolute inset-x-0 top-0 h-[5px] bg-slate-950" />
            <div className="flex h-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-4xl">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t.badge}
                </div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t.title}</h1>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">{t.subtitle}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Link href="/company/accounting" className="rounded-full border bg-background px-3 py-1 transition hover:bg-muted">
                    <ArrowLeft className="inline h-3.5 w-3.5" /> {t.accountingDashboard}
                  </Link>
                  <Link href="/company/accounting/journal-entries" className="rounded-full border bg-background px-3 py-1 transition hover:bg-muted">
                    {t.journalEntries}
                  </Link>
                  <Link href="/company/accounting/ledger" className="rounded-full border bg-background px-3 py-1 transition hover:bg-muted">
                    {t.ledger}
                  </Link>
                  <Link href="/company/accounting/chart-of-accounts" className="rounded-full border bg-background px-3 py-1 transition hover:bg-muted">
                    {t.chartOfAccounts}
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button className="rounded-xl bg-slate-950 text-white shadow-sm hover:bg-slate-800" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background shadow-sm hover:bg-muted/70" onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.export}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background shadow-sm hover:bg-muted/70" onClick={() => void loadTrialBalance()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
              </div>
            </div>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.totalAccounts} value={stats.rowsCount} description={t.totalAccountsDesc} icon={Scale} label={t.sar} />
          <KpiCard title={t.totalDebit} value={stats.totalDebit} description={t.totalDebitDesc} icon={WalletCards} money label={t.sar} />
          <KpiCard title={t.totalCredit} value={stats.totalCredit} description={t.totalCreditDesc} icon={WalletCards} money label={t.sar} />
          <KpiCard title={t.difference} value={stats.difference} description={t.differenceDesc} icon={ArrowUpDown} money label={t.sar} />
        </div>
        <Card className="rounded-2xl border-border/70 bg-card shadow-sm transition hover:shadow-md">
          <CardHeader className="px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{t.filtersTitle}</CardTitle>
                <CardDescription className="mt-1">{t.filtersDesc}</CardDescription>
              </div>
              <Badge
                variant="outline"
                className={
                  stats.isBalanced
                    ? "w-fit rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700"
                    : "w-fit rounded-full border-rose-200 bg-rose-50 px-3 py-1 text-rose-700"
                }
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                {stats.isBalanced ? t.balanced : t.notBalanced}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-5">
            <div className="grid gap-3 rounded-2xl border bg-muted/20 p-3 lg:grid-cols-4 xl:grid-cols-[160px_160px_170px_170px_150px_145px_145px_130px]">
              <DatePickerField label={t.dateFrom} value={dateFrom} onChange={setDateFrom} dir={dir} />
              <DatePickerField label={t.dateTo} value={dateTo} onChange={setDateTo} dir={dir} />
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t.accountLevel}</span>
                <Select value={accountLevel} onValueChange={(value) => setAccountLevel(value as AccountLevelFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leaf">{t.leafLevel}</SelectItem>
                    <SelectItem value="1">{t.level1}</SelectItem>
                    <SelectItem value="2">{t.level2}</SelectItem>
                    <SelectItem value="3">{t.level3}</SelectItem>
                    <SelectItem value="4">{t.level4}</SelectItem>
                    <SelectItem value="5">{t.level5}</SelectItem>
                    <SelectItem value="all">{t.allLevels}</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t.accountType}</span>
                <Select value={accountType} onValueChange={(value) => setAccountType(value as AccountTypeFilter)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allTypes}</SelectItem>
                    <SelectItem value="ASSET">{t.ASSET}</SelectItem>
                    <SelectItem value="LIABILITY">{t.LIABILITY}</SelectItem>
                    <SelectItem value="EQUITY">{t.EQUITY}</SelectItem>
                    <SelectItem value="REVENUE">{t.REVENUE}</SelectItem>
                    <SelectItem value="EXPENSE">{t.EXPENSE}</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">ترتيب</span>
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background">
                    <Filter className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code">{t.sortCode}</SelectItem>
                    <SelectItem value="name">{t.sortName}</SelectItem>
                    <SelectItem value="period_debit">{t.sortPeriodDebit}</SelectItem>
                    <SelectItem value="period_credit">{t.sortPeriodCredit}</SelectItem>
                    <SelectItem value="closing">{t.sortClosing}</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="flex items-end">
                <Button
                  type="button"
                  variant={includeZero ? "default" : "outline"}
                  className="h-10 w-full rounded-xl"
                  onClick={() => setIncludeZero((current) => !current)}
                >
                  {t.includeZero}
                </Button>
              </label>
              <label className="flex items-end">
                <Button
                  type="button"
                  variant={showAccountCode ? "default" : "outline"}
                  className="h-10 w-full rounded-xl"
                  onClick={() => setShowAccountCode((current) => !current)}
                >
                  {t.showAccountCode}
                </Button>
              </label>
              <div className="flex items-end">
                <Button variant="outline" className="h-10 w-full rounded-xl bg-background" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t.searchPlaceholder}
                className="h-10 rounded-xl bg-background ps-9"
              />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/70 bg-card shadow-sm transition hover:shadow-md">
          <CardHeader className="px-5 py-4 sm:px-6">
            <CardTitle>{t.registerTitle}</CardTitle>
            <CardDescription className="mt-1">{t.registerDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
            {loading ? (
              <div className="space-y-3 rounded-2xl border p-4">
                <p className="text-sm text-muted-foreground">{t.loading}</p>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredRows.length ? (
              <div className="overflow-hidden rounded-2xl border">
                <div className="overflow-x-auto">
                  <Table className="min-w-[1360px] table-fixed">
                    <TableHeader>
                      <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
                        <TableHead
                          rowSpan={2}
                          className="w-[330px] align-middle text-start"
                        >
                          {t.accountName}
                        </TableHead>
                        <TableHead colSpan={3} className="text-center text-sm font-black">
                          {t.openingGroup}
                        </TableHead>
                        <TableHead colSpan={2} className="text-center text-sm font-black">
                          {t.movementGroup}
                        </TableHead>
                        <TableHead colSpan={3} className="text-center text-sm font-black">
                          {t.closingGroup}
                        </TableHead>
                      </TableRow>
                      <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-[120px] text-end text-xs">
                          {t.debitShort}
                        </TableHead>
                        <TableHead className="w-[120px] text-end text-xs">
                          {t.creditShort}
                        </TableHead>
                        <TableHead className="w-[135px] text-end text-xs">
                          {t.openingBalance}
                        </TableHead>
                        <TableHead className="w-[120px] text-end text-xs">
                          {t.debitShort}
                        </TableHead>
                        <TableHead className="w-[120px] text-end text-xs">
                          {t.creditShort}
                        </TableHead>
                        <TableHead className="w-[120px] text-end text-xs">
                          {t.debitShort}
                        </TableHead>
                        <TableHead className="w-[120px] text-end text-xs">
                          {t.creditShort}
                        </TableHead>
                        <TableHead className="w-[135px] text-end text-xs">
                          {t.closingBalance}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow key={row.id || row.code} className="h-[66px] bg-card hover:bg-muted/30">
                          <TableCell className="align-middle">
                            <div className="min-w-0 space-y-1">
                              <div className="flex min-w-0 items-center gap-2">
                                {showAccountCode ? (
                                  <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-black tabular-nums text-slate-700">
                                    {row.code}
                                  </span>
                                ) : null}
                                <span className="min-w-0 truncate text-sm font-black">
                                  {row.name}
                                </span>
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {row.nameEn || "—"}
                              </div>
                              <div className="flex min-w-0 flex-wrap gap-1">
                                <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[11px]">
                                  <AccountTypeLabel value={row.accountType} locale={locale} />
                                </Badge>
                                {row.parentCode ? (
                                  <Badge
                                    variant="outline"
                                    className="max-w-full truncate rounded-full px-2 py-0.5 text-[11px] text-muted-foreground"
                                  >
                                    {showAccountCode ? `${row.parentCode} — ${row.parentName}` : row.parentName}
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-end"><MoneyValue value={row.openingDebit} label={t.sar} /></TableCell>
                          <TableCell className="whitespace-nowrap text-end"><MoneyValue value={row.openingCredit} label={t.sar} /></TableCell>
                          <TableCell className="whitespace-nowrap text-end"><MoneyValue value={row.openingBalance} label={t.sar} /></TableCell>
                          <TableCell className="whitespace-nowrap text-end"><MoneyValue value={row.periodDebit} label={t.sar} /></TableCell>
                          <TableCell className="whitespace-nowrap text-end"><MoneyValue value={row.periodCredit} label={t.sar} /></TableCell>
                          <TableCell className="whitespace-nowrap text-end"><MoneyValue value={row.closingDebit} label={t.sar} /></TableCell>
                          <TableCell className="whitespace-nowrap text-end"><MoneyValue value={row.closingCredit} label={t.sar} /></TableCell>
                          <TableCell className="whitespace-nowrap text-end"><MoneyValue value={row.closingBalance} label={t.sar} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center">
                <Scale className="h-7 w-7 text-muted-foreground" />
                <div>
                  <h3 className="text-sm font-semibold">{t.emptyTitle}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.emptyDesc}</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-lg" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
