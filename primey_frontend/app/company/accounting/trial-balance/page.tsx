// ============================================================
// 📂 app/company/accounting/trial-balance/page.tsx
// 🧠 Mhamcloud | Company Accounting Trial Balance
// ------------------------------------------------------------
// ✅ PrimeyAcc Approved Design
// ✅ Real API only
// ✅ Full report + table print / Excel
// ✅ Company name from whoami
// ✅ SMACC-style trial balance columns
// ✅ Clickable account rows
// ============================================================
"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type AccountTypeFilter =
  | "all"
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "EXPENSE";
type AccountLevelFilter = "leaf" | "all" | "1" | "2" | "3" | "4" | "5";
type SortKey = "code" | "name" | "period_debit" | "period_credit" | "closing";
type ExportScope = "full" | "table";

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

type TrialBalanceTotals = {
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
    sort: "ترتيب",
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
    totals: "الإجمالي",
    emptyTitle: "لا توجد بيانات في ميزان المراجعة",
    emptyDesc: "غيّر الفلاتر أو أنشئ قيودًا مرحلة من صفحة القيود اليومية.",
    loading: "جاري تحميل ميزان المراجعة...",
    loadFailed: "تعذر تحميل ميزان المراجعة.",
    companyFallback: "الشركة",
    fullReportTitle: "تقرير ميزان المراجعة",
    tableReportTitle: "كشف ميزان المراجعة",
    generatedAt: "تاريخ التصدير",
    appliedFilters: "الفلاتر المطبقة",
    accountCount: "عدد الحسابات",
    printReady: "تم تجهيز ميزان المراجعة للطباعة.",
    exportReady: "تم تصدير ميزان المراجعة إلى Excel.",
    popupBlocked: "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.",
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
    sort: "Sort",
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
    totals: "Total",
    emptyTitle: "No trial balance data",
    emptyDesc: "Change filters or create posted entries from Journal Entries.",
    loading: "Loading trial balance...",
    loadFailed: "Could not load trial balance.",
    companyFallback: "Company",
    fullReportTitle: "Trial Balance Report",
    tableReportTitle: "Trial Balance Register",
    generatedAt: "Generated at",
    appliedFilters: "Applied filters",
    accountCount: "Account count",
    printReady: "Trial balance is ready to print.",
    exportReady: "Trial balance was exported to Excel.",
    popupBlocked: "Could not open the print window. Allow pop-ups and try again.",
    sar: "SAR",
  },
} as const;

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

function apiBase() {
  const value = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
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

  const textResponse = await response.text();
  let payload: ApiRecord = {};

  if (textResponse) {
    try {
      payload = JSON.parse(textResponse) as ApiRecord;
    } catch {
      payload = { detail: textResponse };
    }
  }

  if (!response.ok) {
    throw new Error(
      String(payload.message || payload.detail || `HTTP ${response.status}`),
    );
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
  return numberValue(value).toLocaleString("en-US", {
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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resolveCompanyName(payload: unknown) {
  const root = record(payload);
  const company = record(root.company);
  const currentCompany = record(root.current_company);
  const membership = record(root.membership);
  const membershipCompany = record(membership.company);

  return text(
    company.name ||
      company.name_ar ||
      currentCompany.name ||
      currentCompany.name_ar ||
      membershipCompany.name ||
      membershipCompany.name_ar ||
      root.company_name ||
      root.company_name_ar,
  );
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

function accountTypeText(value: string, locale: Locale) {
  const labels: Record<string, { ar: string; en: string }> = {
    ASSET: { ar: "الأصول", en: "Assets" },
    LIABILITY: { ar: "الالتزامات", en: "Liabilities" },
    EQUITY: { ar: "حقوق الملكية", en: "Equity" },
    REVENUE: { ar: "الإيرادات", en: "Revenue" },
    EXPENSE: { ar: "المصروفات", en: "Expenses" },
  };

  return labels[value]?.[locale] || value || "—";
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
    <label className="space-y-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full justify-start rounded-lg bg-background px-3 font-mono text-xs font-semibold tabular-nums"
          >
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span>{value || "YYYY-MM-DD"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align={dir === "rtl" ? "end" : "start"}
          className="w-auto rounded-xl p-0"
          dir={dir}
        >
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
  return <>{accountTypeText(value, locale)}</>;
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
    <Card className="group h-[124px] rounded-lg border bg-card shadow-none">
      <CardContent className="flex h-full items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{title}</p>
          <div className="mt-2 text-[22px] font-black tracking-tight tabular-nums">
            {money ? <MoneyValue value={value} label={label} /> : formatInteger(value)}
          </div>
          <p className="mt-5 line-clamp-1 text-[11px] text-muted-foreground">
            {description}
          </p>
        </div>
        <span className="rounded-lg border bg-background p-2 text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function buildTotals(rows: TrialBalanceRow[]): TrialBalanceTotals {
  return rows.reduce<TrialBalanceTotals>(
    (total, row) => ({
      openingDebit: total.openingDebit + row.openingDebit,
      openingCredit: total.openingCredit + row.openingCredit,
      openingBalance: total.openingBalance + row.openingBalance,
      periodDebit: total.periodDebit + row.periodDebit,
      periodCredit: total.periodCredit + row.periodCredit,
      closingDebit: total.closingDebit + row.closingDebit,
      closingCredit: total.closingCredit + row.closingCredit,
      closingBalance: total.closingBalance + row.closingBalance,
    }),
    {
      openingDebit: 0,
      openingCredit: 0,
      openingBalance: 0,
      periodDebit: 0,
      periodCredit: 0,
      closingDebit: 0,
      closingCredit: 0,
      closingBalance: 0,
    },
  );
}

export default function CompanyAccountingTrialBalancePage() {
  const router = useRouter();
  const [locale, setLocale] = React.useState<Locale>("ar");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  const [rows, setRows] = React.useState<TrialBalanceRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState(yearStartIso);
  const [dateTo, setDateTo] = React.useState(todayIso);
  const [accountType, setAccountType] = React.useState<AccountTypeFilter>(ALL_TYPES);
  const [accountLevel, setAccountLevel] = React.useState<AccountLevelFilter>("leaf");
  const [includeZero, setIncludeZero] = React.useState(false);
  const [showAccountCode, setShowAccountCode] = React.useState(false);
  const [sort, setSort] = React.useState<SortKey>("code");
  const [loading, setLoading] = React.useState(true);
  const [companyName, setCompanyName] = React.useState("");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query =
      params.get("account_code") ||
      params.get("search") ||
      params.get("q") ||
      params.get("account") ||
      params.get("account_id") ||
      "";

    if (query.trim()) setSearch(query.trim());
  }, []);

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

  React.useEffect(() => {
    let active = true;

    void fetchJson<unknown>("/api/auth/whoami/")
      .then((payload) => {
        if (active) setCompanyName(resolveCompanyName(payload));
      })
      .catch(() => {
        if (active) setCompanyName("");
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = rows.filter((row) => {
      if (!query) return true;

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
        .includes(query);
    });

    return [...result].sort((a, b) => {
      if (sort === "name") {
        return a.name.localeCompare(b.name, locale === "ar" ? "ar" : "en");
      }
      if (sort === "period_debit") return b.periodDebit - a.periodDebit;
      if (sort === "period_credit") return b.periodCredit - a.periodCredit;
      if (sort === "closing") {
        return Math.abs(b.closingBalance) - Math.abs(a.closingBalance);
      }
      return a.code.localeCompare(b.code, "en");
    });
  }, [locale, rows, search, sort]);

  const tableTotals = React.useMemo(() => buildTotals(filteredRows), [filteredRows]);

  const stats = React.useMemo(() => {
    const totalDebit = tableTotals.periodDebit;
    const totalCredit = tableTotals.periodCredit;
    const difference = tableTotals.closingDebit - tableTotals.closingCredit;

    return {
      rowsCount: filteredRows.length,
      totalDebit,
      totalCredit,
      difference,
      isBalanced: Math.abs(difference) < 0.005,
    };
  }, [filteredRows.length, tableTotals]);

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

  function currentFilterDescription() {
    const levelLabel =
      accountLevel === "leaf"
        ? t.leafLevel
        : accountLevel === "all"
          ? t.allLevels
          : accountLevel === "1"
            ? t.level1
            : accountLevel === "2"
              ? t.level2
              : accountLevel === "3"
                ? t.level3
                : accountLevel === "4"
                  ? t.level4
                  : t.level5;
    const typeLabel =
      accountType === ALL_TYPES ? t.allTypes : accountTypeText(accountType, locale);

    return [
      `${t.dateFrom}: ${dateFrom}`,
      `${t.dateTo}: ${dateTo}`,
      `${t.accountLevel}: ${String(levelLabel)}`,
      `${t.accountType}: ${typeLabel}`,
      `${t.sort}: ${
        sort === "code"
          ? t.sortCode
          : sort === "name"
            ? t.sortName
            : sort === "period_debit"
              ? t.sortPeriodDebit
              : sort === "period_credit"
                ? t.sortPeriodCredit
                : t.sortClosing
      }`,
      search.trim() ? `${t.searchPlaceholder}: ${search.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" • ");
  }

  function buildTableHtml() {
    const body = filteredRows
      .map((row) => {
        const name = showAccountCode ? `${row.code} — ${row.name}` : row.name;
        const secondary = [
          row.nameEn,
          accountTypeText(row.accountType, locale),
          row.parentName,
        ]
          .filter(Boolean)
          .join(" • ");

        return `
          <tr>
            <td class="account-cell">
              <strong>${escapeHtml(name)}</strong>
              ${secondary ? `<small>${escapeHtml(secondary)}</small>` : ""}
            </td>
            <td>${formatMoney(row.openingDebit)}</td>
            <td>${formatMoney(row.openingCredit)}</td>
            <td>${formatMoney(row.openingBalance)}</td>
            <td>${formatMoney(row.periodDebit)}</td>
            <td>${formatMoney(row.periodCredit)}</td>
            <td>${formatMoney(row.closingDebit)}</td>
            <td>${formatMoney(row.closingCredit)}</td>
            <td>${formatMoney(row.closingBalance)}</td>
          </tr>`;
      })
      .join("");

    return `
      <table class="report-table">
        <thead>
          <tr>
            <th rowspan="2">${escapeHtml(t.accountName)}</th>
            <th colspan="3">${escapeHtml(t.openingGroup)}</th>
            <th colspan="2">${escapeHtml(t.movementGroup)}</th>
            <th colspan="3">${escapeHtml(t.closingGroup)}</th>
          </tr>
          <tr>
            <th>${escapeHtml(t.debitShort)}</th>
            <th>${escapeHtml(t.creditShort)}</th>
            <th>${escapeHtml(t.balanceShort)}</th>
            <th>${escapeHtml(t.debitShort)}</th>
            <th>${escapeHtml(t.creditShort)}</th>
            <th>${escapeHtml(t.debitShort)}</th>
            <th>${escapeHtml(t.creditShort)}</th>
            <th>${escapeHtml(t.balanceShort)}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
        <tfoot>
          <tr>
            <th>${escapeHtml(t.totals)}</th>
            <th>${formatMoney(tableTotals.openingDebit)}</th>
            <th>${formatMoney(tableTotals.openingCredit)}</th>
            <th>${formatMoney(tableTotals.openingBalance)}</th>
            <th>${formatMoney(tableTotals.periodDebit)}</th>
            <th>${formatMoney(tableTotals.periodCredit)}</th>
            <th>${formatMoney(tableTotals.closingDebit)}</th>
            <th>${formatMoney(tableTotals.closingCredit)}</th>
            <th>${formatMoney(tableTotals.closingBalance)}</th>
          </tr>
        </tfoot>
      </table>`;
  }

  function buildTrialBalanceDocument(scope: ExportScope) {
    const reportTitle = scope === "full" ? t.fullReportTitle : t.tableReportTitle;
    const generatedAt = new Date().toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const direction = locale === "ar" ? "rtl" : "ltr";
    const company = companyName || t.companyFallback;
    const summary =
      scope === "full"
        ? `
          <table class="summary-table">
            <tr>
              <th>${escapeHtml(t.totalAccounts)}</th>
              <td>${formatInteger(stats.rowsCount)}</td>
              <th>${escapeHtml(t.totalDebit)}</th>
              <td>${formatMoney(stats.totalDebit)}</td>
            </tr>
            <tr>
              <th>${escapeHtml(t.totalCredit)}</th>
              <td>${formatMoney(stats.totalCredit)}</td>
              <th>${escapeHtml(t.difference)}</th>
              <td>${formatMoney(stats.difference)}</td>
            </tr>
          </table>`
        : "";

    return `<!doctype html>
<html lang="${locale}" dir="${direction}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 18px;
      color: #111827;
      background: #ffffff;
      font-family: Tahoma, Arial, sans-serif;
      direction: ${direction};
    }
    .report-header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: start;
      margin-bottom: 12px;
    }
    .company { font-size: 13px; font-weight: 700; }
    h1 { margin: 4px 0; font-size: 22px; }
    .meta { font-size: 10px; line-height: 1.7; color: #4b5563; }
    .stamp {
      min-width: 190px;
      border: 1px solid #111827;
      padding: 8px;
      font-size: 10px;
      line-height: 1.7;
    }
    table { width: 100%; border-collapse: collapse; }
    .summary-table { margin: 10px 0 12px; }
    .summary-table th,
    .summary-table td,
    .report-table th,
    .report-table td {
      border: 1px solid #000000;
      padding: 5px 6px;
      vertical-align: middle;
    }
    .summary-table th { width: 22%; background: #f3f4f6; text-align: start; }
    .summary-table td { width: 28%; font-weight: 700; text-align: end; }
    .report-table { table-layout: fixed; font-size: 9px; }
    .report-table thead th { background: #f3f4f6; font-weight: 700; text-align: center; }
    .report-table thead th:first-child { width: 28%; text-align: start; }
    .report-table tbody td { text-align: end; }
    .report-table .account-cell { text-align: start; }
    .report-table small { display: block; margin-top: 2px; color: #6b7280; font-size: 8px; }
    .report-table tfoot th {
      background: #e5e7eb;
      border-top: 2px solid #64748b;
      font-weight: 700;
      text-align: end;
    }
    .report-table tfoot th:first-child { text-align: start; }
    .footer { margin-top: 8px; font-size: 9px; color: #4b5563; }
    @page { size: A4 landscape; margin: 9mm; }
    @media print {
      body { padding: 0; }
      .report-table { page-break-inside: auto; }
      .report-table tr { page-break-inside: avoid; page-break-after: auto; }
      .report-table thead { display: table-header-group; }
      .report-table tfoot { display: table-footer-group; }
    }
  </style>
</head>
<body>
  <header class="report-header">
    <div>
      <div class="company">${escapeHtml(company)}</div>
      <h1>${escapeHtml(reportTitle)}</h1>
      <div class="meta">${escapeHtml(currentFilterDescription())}</div>
    </div>
    <div class="stamp">
      <div><strong>${escapeHtml(t.generatedAt)}:</strong> ${escapeHtml(generatedAt)}</div>
      <div><strong>${escapeHtml(t.accountCount)}:</strong> ${formatInteger(stats.rowsCount)}</div>
      <div><strong>${escapeHtml(t.appliedFilters)}:</strong> ${escapeHtml(
        stats.isBalanced ? t.balanced : t.notBalanced,
      )}</div>
    </div>
  </header>
  ${summary}
  ${buildTableHtml()}
  <div class="footer">${escapeHtml(company)} • ${escapeHtml(generatedAt)}</div>
</body>
</html>`;
  }

  function printTrialBalance(scope: ExportScope) {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      toast.error(t.popupBlocked);
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildTrialBalanceDocument(scope));
    printWindow.document.close();
    printWindow.focus();

    window.setTimeout(() => {
      printWindow.print();
    }, 250);

    toast.success(t.printReady);
  }

  function downloadTrialBalance(scope: ExportScope) {
    const html = buildTrialBalanceDocument(scope);
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const scopeName = scope === "full" ? "trial-balance" : "trial-balance-table";

    anchor.href = url;
    anchor.download = `${scopeName}-${dateFrom}-${dateTo}.xls`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success(t.exportReady);
  }

  function openAccount(row: TrialBalanceRow) {
    if (!row.id) return;
    router.push(`/company/accounting/chart-of-accounts/${encodeURIComponent(row.id)}`);
  }

  return (
    <main
      dir={dir}
      className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-4 py-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {t.badge}
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t.title}</h1>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
              {t.subtitle}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Link
                href="/company/accounting"
                className="rounded-lg border bg-background px-3 py-1.5 transition hover:bg-muted"
              >
                <ArrowLeft className="inline h-3.5 w-3.5" /> {t.accountingDashboard}
              </Link>
              <Link
                href="/company/accounting/journal-entries"
                className="rounded-lg border bg-background px-3 py-1.5 transition hover:bg-muted"
              >
                {t.journalEntries}
              </Link>
              <Link
                href="/company/accounting/ledger"
                className="rounded-lg border bg-background px-3 py-1.5 transition hover:bg-muted"
              >
                {t.ledger}
              </Link>
              <Link
                href="/company/accounting/chart-of-accounts"
                className="rounded-lg border bg-background px-3 py-1.5 transition hover:bg-muted"
              >
                {t.chartOfAccounts}
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:pt-1">
            <Button
              className="rounded-lg bg-slate-950 text-white shadow-none hover:bg-slate-800"
              onClick={() => printTrialBalance("full")}
            >
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>
            <Button
              variant="outline"
              className="rounded-lg bg-background shadow-none"
              onClick={() => downloadTrialBalance("full")}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t.export}
            </Button>
            <Button
              variant="outline"
              className="rounded-lg bg-background shadow-none"
              onClick={() => void loadTrialBalance()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t.refresh}
            </Button>
          </div>
        </header>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title={t.totalAccounts}
            value={stats.rowsCount}
            description={t.totalAccountsDesc}
            icon={Scale}
            label={t.sar}
          />
          <KpiCard
            title={t.totalDebit}
            value={stats.totalDebit}
            description={t.totalDebitDesc}
            icon={WalletCards}
            money
            label={t.sar}
          />
          <KpiCard
            title={t.totalCredit}
            value={stats.totalCredit}
            description={t.totalCreditDesc}
            icon={WalletCards}
            money
            label={t.sar}
          />
          <KpiCard
            title={t.difference}
            value={stats.difference}
            description={t.differenceDesc}
            icon={ArrowUpDown}
            money
            label={t.sar}
          />
        </div>

        <Card
          data-approved-trial-balance-table="true"
          className="rounded-lg border bg-card shadow-none"
        >
          <CardHeader className="px-5 pb-3 pt-5 sm:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{t.registerTitle}</CardTitle>
                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                    {formatInteger(stats.rowsCount)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      stats.isBalanced
                        ? "rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-emerald-700"
                        : "rounded-full border-rose-200 bg-rose-50 px-2.5 py-0.5 text-rose-700"
                    }
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {stats.isBalanced ? t.balanced : t.notBalanced}
                  </Badge>
                </div>
                <CardDescription className="mt-1">{t.registerDesc}</CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-lg bg-background shadow-none"
                  onClick={() => downloadTrialBalance("table")}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.export}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-lg bg-background shadow-none"
                  onClick={() => printTrialBalance("table")}
                >
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 px-5 pb-5 sm:px-6 sm:pb-6">
            <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[145px_145px_160px_160px_155px_155px_145px_130px]">
                <DatePickerField
                  label={t.dateFrom}
                  value={dateFrom}
                  onChange={setDateFrom}
                  dir={dir}
                />
                <DatePickerField
                  label={t.dateTo}
                  value={dateTo}
                  onChange={setDateTo}
                  dir={dir}
                />

                <label className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {t.accountLevel}
                  </span>
                  <Select
                    value={accountLevel}
                    onValueChange={(value) =>
                      setAccountLevel(value as AccountLevelFilter)
                    }
                  >
                    <SelectTrigger className="h-9 rounded-lg bg-background text-xs">
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

                <label className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {t.accountType}
                  </span>
                  <Select
                    value={accountType}
                    onValueChange={(value) =>
                      setAccountType(value as AccountTypeFilter)
                    }
                  >
                    <SelectTrigger className="h-9 rounded-lg bg-background text-xs">
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

                <label className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {t.sort}
                  </span>
                  <Select
                    value={sort}
                    onValueChange={(value) => setSort(value as SortKey)}
                  >
                    <SelectTrigger className="h-9 rounded-lg bg-background text-xs">
                      <Filter className="h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="code">{t.sortCode}</SelectItem>
                      <SelectItem value="name">{t.sortName}</SelectItem>
                      <SelectItem value="period_debit">
                        {t.sortPeriodDebit}
                      </SelectItem>
                      <SelectItem value="period_credit">
                        {t.sortPeriodCredit}
                      </SelectItem>
                      <SelectItem value="closing">{t.sortClosing}</SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                <label className="flex items-end">
                  <Button
                    type="button"
                    variant={includeZero ? "default" : "outline"}
                    className="h-9 w-full rounded-lg text-xs"
                    onClick={() => setIncludeZero((current) => !current)}
                  >
                    {t.includeZero}
                  </Button>
                </label>

                <label className="flex items-end">
                  <Button
                    type="button"
                    variant={showAccountCode ? "default" : "outline"}
                    className="h-9 w-full rounded-lg text-xs"
                    onClick={() => setShowAccountCode((current) => !current)}
                  >
                    {t.showAccountCode}
                  </Button>
                </label>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="h-9 w-full rounded-lg bg-background text-xs"
                    onClick={resetFilters}
                  >
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
                  className="h-9 rounded-lg bg-background ps-9 text-xs"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{t.loading}</p>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredRows.length ? (
              <div className="overflow-hidden rounded-lg border">
                <div className="overflow-x-auto">
                  <Table className="min-w-[1360px] table-fixed">
                    <TableHeader>
                      <TableRow className="h-9 bg-muted/30 hover:bg-muted/30">
                        <TableHead
                          rowSpan={2}
                          className="w-[330px] align-middle text-start"
                        >
                          {t.accountName}
                        </TableHead>
                        <TableHead colSpan={3} className="text-center text-xs font-black">
                          {t.openingGroup}
                        </TableHead>
                        <TableHead colSpan={2} className="text-center text-xs font-black">
                          {t.movementGroup}
                        </TableHead>
                        <TableHead colSpan={3} className="text-center text-xs font-black">
                          {t.closingGroup}
                        </TableHead>
                      </TableRow>
                      <TableRow className="h-9 bg-muted/30 hover:bg-muted/30">
                        <TableHead className="w-[120px] text-end text-[11px]">
                          {t.debitShort}
                        </TableHead>
                        <TableHead className="w-[120px] text-end text-[11px]">
                          {t.creditShort}
                        </TableHead>
                        <TableHead className="w-[135px] text-end text-[11px]">
                          {t.balanceShort}
                        </TableHead>
                        <TableHead className="w-[120px] text-end text-[11px]">
                          {t.debitShort}
                        </TableHead>
                        <TableHead className="w-[120px] text-end text-[11px]">
                          {t.creditShort}
                        </TableHead>
                        <TableHead className="w-[120px] text-end text-[11px]">
                          {t.debitShort}
                        </TableHead>
                        <TableHead className="w-[120px] text-end text-[11px]">
                          {t.creditShort}
                        </TableHead>
                        <TableHead className="w-[135px] text-end text-[11px]">
                          {t.balanceShort}
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredRows.map((row) => (
                        <TableRow
                          key={row.id || row.code}
                          tabIndex={row.id ? 0 : -1}
                          className={
                            row.id
                              ? "h-[66px] cursor-pointer bg-card hover:bg-muted/30"
                              : "h-[66px] bg-card"
                          }
                          onClick={() => openAccount(row)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openAccount(row);
                            }
                          }}
                        >
                          <TableCell className="align-middle">
                            <div className="min-w-0 space-y-1">
                              <div className="flex min-w-0 items-center gap-2">
                                {showAccountCode ? (
                                  <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-black tabular-nums text-slate-700">
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
                                <Badge
                                  variant="outline"
                                  className="rounded-full px-2 py-0.5 text-[10px]"
                                >
                                  <AccountTypeLabel
                                    value={row.accountType}
                                    locale={locale}
                                  />
                                </Badge>
                                {row.parentCode ? (
                                  <Badge
                                    variant="outline"
                                    className="max-w-full truncate rounded-full px-2 py-0.5 text-[10px] text-muted-foreground"
                                  >
                                    {showAccountCode
                                      ? `${row.parentCode} — ${row.parentName}`
                                      : row.parentName}
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-end text-sm">
                            <MoneyValue value={row.openingDebit} label={t.sar} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-end text-sm">
                            <MoneyValue value={row.openingCredit} label={t.sar} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-end text-sm">
                            <MoneyValue value={row.openingBalance} label={t.sar} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-end text-sm">
                            <MoneyValue value={row.periodDebit} label={t.sar} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-end text-sm">
                            <MoneyValue value={row.periodCredit} label={t.sar} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-end text-sm">
                            <MoneyValue value={row.closingDebit} label={t.sar} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-end text-sm">
                            <MoneyValue value={row.closingCredit} label={t.sar} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-end text-sm">
                            <MoneyValue value={row.closingBalance} label={t.sar} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>

                    <TableFooter>
                      <TableRow className="border-t-2 border-slate-300 bg-slate-100 hover:bg-slate-100">
                        <TableCell className="font-black">{t.totals}</TableCell>
                        <TableCell className="text-end">
                          <MoneyValue value={tableTotals.openingDebit} label={t.sar} />
                        </TableCell>
                        <TableCell className="text-end">
                          <MoneyValue value={tableTotals.openingCredit} label={t.sar} />
                        </TableCell>
                        <TableCell className="text-end">
                          <MoneyValue value={tableTotals.openingBalance} label={t.sar} />
                        </TableCell>
                        <TableCell className="text-end">
                          <MoneyValue value={tableTotals.periodDebit} label={t.sar} />
                        </TableCell>
                        <TableCell className="text-end">
                          <MoneyValue value={tableTotals.periodCredit} label={t.sar} />
                        </TableCell>
                        <TableCell className="text-end">
                          <MoneyValue value={tableTotals.closingDebit} label={t.sar} />
                        </TableCell>
                        <TableCell className="text-end">
                          <MoneyValue value={tableTotals.closingCredit} label={t.sar} />
                        </TableCell>
                        <TableCell className="text-end">
                          <MoneyValue value={tableTotals.closingBalance} label={t.sar} />
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
                <Scale className="h-7 w-7 text-muted-foreground" />
                <div>
                  <h3 className="text-sm font-semibold">{t.emptyTitle}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.emptyDesc}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={resetFilters}
                >
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
