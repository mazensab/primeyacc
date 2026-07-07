"use client";
/* ============================================================
   📂 primey_frontend/app/company/accounting/ledger/page.tsx
   🧠 PrimeyAcc — Company Ledger Report
   ------------------------------------------------------------
   ✅ Approved Premium pattern
   ✅ Real API only
   ✅ Company scoped API
   ✅ SMACC-like grouped ledger sections
   ✅ Opening / movement / total / closing per account
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error / Empty states
   ✅ RTL/LTR through primey-locale
   ✅ English numbers/money always
   ✅ SAR icon from /currency/sar.svg
============================================================ */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpDown,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  FileSpreadsheet,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
type Locale = "ar" | "en";
type ApiRecord = Record<string, unknown>;
type ReportType = "accounts" | "general";
type SortKey = "date" | "account" | "entry" | "amount";
type AccountOption = {
  id: string;
  code: string;
  name: string;
  name_en: string;
  level: number;
  is_group: boolean;
  is_active: boolean;
};
type LedgerLine = {
  id: string;
  date: string;
  entry_number: string;
  reference_number: string;
  account_code: string;
  account_name: string;
  account_name_en: string;
  cost_center_code: string;
  cost_center_name: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  status: string;
  source: string;
};
type LedgerSection = {
  account: AccountOption;
  opening_balance: number;
  opening_balance_abs: number;
  opening_balance_side: "DEBIT" | "CREDIT";
  period_debit: number;
  period_credit: number;
  period_balance: number;
  closing_balance: number;
  closing_balance_abs: number;
  closing_balance_side: "DEBIT" | "CREDIT";
  line_count: number;
  lines: LedgerLine[];
};
type LedgerSummary = {
  total_sections: number;
  total_lines: number;
  total_debit: number;
  total_credit: number;
  net_balance: number;
  opening_balance: number;
  closing_balance: number;
};
const translations = {
  ar: {
    title: "دفتر الأستاذ",
    subtitle:
      "تقرير دفتر الأستاذ بطريقة مجمعة حسب الحساب مع الرصيد الافتتاحي والحركات والإجمالي والرصيد الختامي.",
    badge: "وحدة الحسابات",
    dashboard: "لوحة الحسابات",
    journalEntries: "القيود اليومية",
    chartOfAccounts: "دليل الحسابات",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    reportType: "نوع التقرير",
    accountsLedger: "حسابات دفتر الأستاذ",
    generalLedger: "دفتر الأستاذ العام",
    accountLevel: "مستوى التجميع",
    level2: "مستوى 2",
    level3: "مستوى 3",
    allGroups: "كل التجميعات",
    account: "الحساب",
    allAccounts: "كل الحسابات",
    dateFrom: "من تاريخ",
    dateTo: "إلى تاريخ",
    sort: "الترتيب",
    sortDate: "ترتيب بالتاريخ",
    sortAccount: "ترتيب بالحساب",
    sortEntry: "ترتيب بالقيد",
    sortAmount: "ترتيب بالمبلغ",
    searchPlaceholder: "ابحث برقم القيد أو الحساب أو مركز التكلفة أو الوصف...",
    totalSections: "عدد الحسابات",
    totalLines: "إجمالي الحركات",
    totalDebit: "إجمالي المدين",
    totalCredit: "إجمالي الدائن",
    netBalance: "صافي الحركة",
    openingBalance: "الرصيد الافتتاحي",
    closingBalance: "الرصيد الختامي",
    debitSide: "مدين",
    creditSide: "دائن",
    filtersTitle: "فلاتر دفتر الأستاذ",
    filtersDesc: "اختر نوع التقرير والحساب والفترة ثم حدّث النتائج من قاعدة البيانات.",
    registerTitle: "سجل دفتر الأستاذ",
    registerDesc:
      "يعرض التقرير الحسابات كمجموعات مستقلة مثل سماك: رصيد افتتاحي، حركات، إجمالي، ورصيد ختامي.",
    accountHeader: "الحساب",
    date: "التاريخ",
    operationNumber: "رقم العملية",
    referenceNumber: "رقم المرجع",
    definition: "تعريف",
    entryNumber: "رقم القيد",
    costCenter: "مركز التكلفة",
    description: "الوصف",
    debit: "مدين",
    credit: "دائن",
    balance: "الرصيد",
    status: "الحالة",
    posted: "مرحل",
    openingLine: "الرصيد الافتتاحي",
    totalOperation: "إجمالي العملية",
    noMovements: "لا توجد حركات لهذا الحساب ضمن الفترة.",
    emptyTitle: "لا توجد حركات في دفتر الأستاذ",
    emptyDesc: "غيّر الفلاتر أو أنشئ قيودًا مرحلة من صفحة القيود اليومية.",
    loading: "جاري تحميل دفتر الأستاذ...",
    loadFailed: "تعذر تحميل دفتر الأستاذ.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    generatedAt: "تاريخ الطباعة",
    sar: "ر.س",
    refreshed: "تم تحديث دفتر الأستاذ.",
  },
  en: {
    title: "General Ledger",
    subtitle:
      "Grouped ledger report by account with opening balance, movements, totals, and closing balance.",
    badge: "Accounting Module",
    dashboard: "Accounting Dashboard",
    journalEntries: "Journal Entries",
    chartOfAccounts: "Chart of Accounts",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    reportType: "Report type",
    accountsLedger: "Account Ledger",
    generalLedger: "General Ledger",
    accountLevel: "Group level",
    level2: "Level 2",
    level3: "Level 3",
    allGroups: "All groups",
    account: "Account",
    allAccounts: "All accounts",
    dateFrom: "From date",
    dateTo: "To date",
    sort: "Sort",
    sortDate: "Sort by date",
    sortAccount: "Sort by account",
    sortEntry: "Sort by entry",
    sortAmount: "Sort by amount",
    searchPlaceholder: "Search by entry, account, cost center, or description...",
    totalSections: "Accounts",
    totalLines: "Total lines",
    totalDebit: "Total debit",
    totalCredit: "Total credit",
    netBalance: "Net movement",
    openingBalance: "Opening balance",
    closingBalance: "Closing balance",
    debitSide: "Debit",
    creditSide: "Credit",
    filtersTitle: "Ledger Filters",
    filtersDesc: "Choose report type, account, and period, then refresh results.",
    registerTitle: "Ledger Register",
    registerDesc:
      "Accounts are displayed as separate sections: opening balance, movements, totals, and closing balance.",
    accountHeader: "Account",
    date: "Date",
    operationNumber: "Operation no.",
    referenceNumber: "Reference no.",
    definition: "Definition",
    entryNumber: "Entry number",
    costCenter: "Cost center",
    description: "Description",
    debit: "Debit",
    credit: "Credit",
    balance: "Balance",
    status: "Status",
    posted: "Posted",
    openingLine: "Opening balance",
    totalOperation: "Operation total",
    noMovements: "No movements for this account in the selected period.",
    emptyTitle: "No ledger movements",
    emptyDesc: "Change filters or create posted entries from Journal Entries.",
    loading: "Loading general ledger...",
    loadFailed: "Could not load general ledger.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    generatedAt: "Generated at",
    sar: "SAR",
    refreshed: "Ledger refreshed.",
  },
} as const;
function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}
function todayIso() {
  return new Date().toLocaleDateString("en-CA");
}
function yearStartIso() {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
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
  const raw = await response.text();
  const payload = raw ? (JSON.parse(raw) as ApiRecord) : {};
  if (!response.ok) {
    throw new Error(String(payload.message || payload.detail || `HTTP ${response.status}`));
  }
  return payload as T;
}
function isRecord(value: unknown): value is ApiRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function asRecord(value: unknown): ApiRecord {
  return isRecord(value) ? value : {};
}
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function text(value: unknown, fallback = "") {
  const result = value === null || value === undefined ? "" : String(value).trim();
  return result || fallback;
}
function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
}
function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}
function formatDate(value: string) {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10) || "—";
  return parsed.toLocaleDateString("en-CA");
}
function parseIsoDate(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}
function dateToIso(value?: Date) {
  if (!value) return "";
  return value.toLocaleDateString("en-CA");
}
function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = parseIsoDate(value);
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-start rounded-xl bg-background text-start font-normal"
          >
            <CalendarDays className="me-2 h-4 w-4 text-muted-foreground" />
            <span dir="ltr" lang="en" className="tabular-nums">
              {value || "YYYY-MM-DD"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => onChange(dateToIso(date))}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
function balanceSideLabel(side: string, locale: Locale) {
  const t = translations[locale];
  return side === "CREDIT" ? t.creditSide : t.debitSide;
}
function MoneyValue({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap tabular-nums", className)}>
      <Image src="/currency/sar.svg" alt={label} width={14} height={14} className="h-3.5 w-3.5" />
      <span>{value < 0 ? "-" : ""}{formatMoney(value)}</span>
    </span>
  );
}
function extractArray(payload: unknown, keys: string[]) {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  const nested = asRecord(record.data);
  for (const key of keys) {
    if (Array.isArray(nested[key])) return nested[key] as unknown[];
  }
  return [];
}
function normalizeAccount(value: unknown): AccountOption {
  const record = asRecord(value);
  return {
    id: text(record.id || record.pk || record.code),
    code: text(record.code),
    name: text(record.name),
    name_en: text(record.name_en || record.nameEn),
    level: numberValue(record.level),
    is_group: Boolean(record.is_group || record.isGroup),
    is_active: record.is_active === undefined ? true : Boolean(record.is_active),
  };
}
function normalizeLine(value: unknown): LedgerLine {
  const record = asRecord(value);
  return {
    id: text(record.id || record.line_id || record.entry_number),
    date: text(record.date || record.entry_date),
    entry_number: text(record.entry_number || record.journal_entry_number),
    reference_number: text(record.reference_number || record.entry_number || record.journal_entry_number),
    account_code: text(record.account_code),
    account_name: text(record.account_name),
    account_name_en: text(record.account_name_en),
    cost_center_code: text(record.cost_center_code),
    cost_center_name: text(record.cost_center_name),
    description: text(record.description),
    debit: numberValue(record.debit || record.debit_amount),
    credit: numberValue(record.credit || record.credit_amount),
    balance: numberValue(record.balance || record.running_balance),
    status: text(record.status, "POSTED"),
    source: text(record.source),
  };
}
function normalizeSection(value: unknown): LedgerSection {
  const record = asRecord(value);
  const account = normalizeAccount(record.account || record);
  return {
    account,
    opening_balance: numberValue(record.opening_balance),
    opening_balance_abs: numberValue(record.opening_balance_abs || Math.abs(numberValue(record.opening_balance))),
    opening_balance_side: text(record.opening_balance_side, "DEBIT") === "CREDIT" ? "CREDIT" : "DEBIT",
    period_debit: numberValue(record.period_debit),
    period_credit: numberValue(record.period_credit),
    period_balance: numberValue(record.period_balance),
    closing_balance: numberValue(record.closing_balance),
    closing_balance_abs: numberValue(record.closing_balance_abs || Math.abs(numberValue(record.closing_balance))),
    closing_balance_side: text(record.closing_balance_side, "DEBIT") === "CREDIT" ? "CREDIT" : "DEBIT",
    line_count: numberValue(record.line_count),
    lines: asArray(record.lines).map(normalizeLine),
  };
}
function normalizeSummary(value: unknown): LedgerSummary {
  const record = asRecord(value);
  return {
    total_sections: numberValue(record.total_sections),
    total_lines: numberValue(record.total_lines),
    total_debit: numberValue(record.total_debit),
    total_credit: numberValue(record.total_credit),
    net_balance: numberValue(record.net_balance),
    opening_balance: numberValue(record.opening_balance),
    closing_balance: numberValue(record.closing_balance),
  };
}
function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
function KpiCard({
  title,
  value,
  money,
  description,
  icon: Icon,
  t,
}: {
  title: string;
  value: number;
  money?: boolean;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  t: (typeof translations)[Locale];
}) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
            {money ? (
              <MoneyValue value={value} label={t.sar} className="text-2xl font-bold" />
            ) : (
              formatInteger(value)
            )}
          </CardTitle>
        </div>
        <span className="rounded-2xl bg-muted p-2.5 text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
function LedgerSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="rounded-3xl border bg-card p-6 shadow-sm">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-8 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="rounded-2xl">
            <CardHeader>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card className="rounded-2xl">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
export default function CompanyAccountingLedgerPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [loading, setLoading] = React.useState(true);
  const [accountsLoading, setAccountsLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [accounts, setAccounts] = React.useState<AccountOption[]>([]);
  const [sections, setSections] = React.useState<LedgerSection[]>([]);
  const [summary, setSummary] = React.useState<LedgerSummary>({
    total_sections: 0,
    total_lines: 0,
    total_debit: 0,
    total_credit: 0,
    net_balance: 0,
    opening_balance: 0,
    closing_balance: 0,
  });
  const [reportType, setReportType] = React.useState<ReportType>("accounts");
  const [level, setLevel] = React.useState("2");
  const [accountCode, setAccountCode] = React.useState("all");
  const [dateFrom, setDateFrom] = React.useState(yearStartIso());
  const [dateTo, setDateTo] = React.useState(todayIso());
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("date");
  React.useEffect(() => {
    const initial = getInitialLocale();
    setLocale(initial);
    const onStorage = () => setLocale(getInitialLocale());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const t = translations[locale];
  const isRtl = locale === "ar";
  const loadAccounts = React.useCallback(async () => {
    setAccountsLoading(true);
    try {
      const payload = await fetchJson<unknown>("/api/company/accounting/accounts/?page_size=1000");
      const rows = extractArray(payload, ["results", "items", "accounts", "data"])
        .map(normalizeAccount)
        .filter((account) => account.code);
      setAccounts(rows);
    } catch {
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  }, []);
  const loadLedger = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("report_type", reportType);
      params.set("include_zero", "false");
      if (reportType === "general") params.set("level", level);
      if (accountCode !== "all") params.set("account_code", accountCode);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (search.trim()) params.set("q", search.trim());
      const payload = await fetchJson<ApiRecord>(
        `/api/company/accounting/reports/ledger/?${params.toString()}`,
      );
      const normalizedSections = extractArray(payload, ["sections", "groups", "accounts"])
        .map(normalizeSection)
        .filter((section) => section.account.code);
      setSections(normalizedSections);
      setSummary(normalizeSummary(payload.summary));
    } catch (err) {
      const message = err instanceof Error ? err.message : t.loadFailed;
      setError(message || t.loadFailed);
      setSections([]);
      setSummary({
        total_sections: 0,
        total_lines: 0,
        total_debit: 0,
        total_credit: 0,
        net_balance: 0,
        opening_balance: 0,
        closing_balance: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [accountCode, dateFrom, dateTo, level, reportType, search, t.loadFailed]);
  React.useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);
  React.useEffect(() => {
    void loadLedger();
  }, [loadLedger]);
  const sortedSections = React.useMemo(() => {
    const copy = [...sections];
    if (sort === "account") {
      return copy.sort((a, b) => a.account.code.localeCompare(b.account.code));
    }
    if (sort === "amount") {
      return copy.sort((a, b) => Math.abs(b.closing_balance) - Math.abs(a.closing_balance));
    }
    return copy.map((section) => ({
      ...section,
      lines: [...section.lines].sort((a, b) => {
        if (sort === "entry") return a.entry_number.localeCompare(b.entry_number);
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.entry_number.localeCompare(b.entry_number);
      }),
    }));
  }, [sections, sort]);
  const resetFilters = React.useCallback(() => {
    setReportType("accounts");
    setLevel("2");
    setAccountCode("all");
    setDateFrom(yearStartIso());
    setDateTo(todayIso());
    setSearch("");
    setSort("date");
  }, []);
  const exportExcel = React.useCallback(() => {
    if (!sortedSections.length) {
      toast.error(t.exportEmpty);
      return;
    }
    const rows: string[] = [];
    rows.push(
      [
        t.accountHeader,
        t.date,
        t.operationNumber,
        t.referenceNumber,
        t.definition,
        t.debit,
        t.credit,
        t.balance,
        t.status,
      ].map(csvCell).join(","),
    );
    for (const section of sortedSections) {
      rows.push(
        [
          `${section.account.code} - ${locale === "en" && section.account.name_en ? section.account.name_en : section.account.name}`,
          "",
          "",
          "",
          t.openingLine,
          "",
          "",
          `${formatMoney(section.opening_balance)} ${balanceSideLabel(section.opening_balance_side, locale)}`,
          "",
        ].map(csvCell).join(","),
      );
      for (const line of section.lines) {
        rows.push(
          [
            `${line.account_code} - ${locale === "en" && line.account_name_en ? line.account_name_en : line.account_name}`,
            formatDate(line.date),
            line.entry_number,
            line.reference_number,
            line.description || line.cost_center_name,
            line.debit ? formatMoney(line.debit) : "",
            line.credit ? formatMoney(line.credit) : "",
            line.balance < 0 ? `-${formatMoney(line.balance)}` : formatMoney(line.balance),
            t.posted,
          ].map(csvCell).join(","),
        );
      }
      rows.push(
        [
          "",
          "",
          "",
          "",
          t.totalOperation,
          formatMoney(section.period_debit),
          formatMoney(section.period_credit),
          `${formatMoney(section.closing_balance)} ${balanceSideLabel(section.closing_balance_side, locale)}`,
          "",
        ].map(csvCell).join(","),
      );
    }
    const blob = new Blob([`\ufeff${rows.join("\n")}`], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ledger-${dateFrom || "from"}-${dateTo || "to"}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [dateFrom, dateTo, locale, sortedSections, t]);
  const printReport = React.useCallback(() => {
    if (!sortedSections.length) {
      toast.error(t.printEmpty);
      return;
    }
    const html = `
      <html dir="${isRtl ? "rtl" : "ltr"}" lang="${locale}">
        <head>
          <meta charset="utf-8" />
          <title>${t.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 4px; font-size: 24px; }
            .meta { color: #6b7280; margin-bottom: 20px; font-size: 12px; }
            .section { margin-top: 22px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
            .section-head { display: flex; justify-content: space-between; gap: 16px; padding: 12px 14px; background: #f9fafb; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border-top: 1px solid #e5e7eb; padding: 8px; text-align: ${isRtl ? "right" : "left"}; }
            th { background: #f3f4f6; }
            .num { direction: ltr; text-align: right; font-variant-numeric: tabular-nums; }
            .total { font-weight: 700; background: #f9fafb; }
          </style>
        </head>
        <body>
          <h1>${t.title}</h1>
          <div class="meta">${t.generatedAt}: ${new Date().toLocaleString("en-US")} | ${dateFrom} - ${dateTo}</div>
          ${sortedSections
            .map((section) => `
              <div class="section">
                <div class="section-head">
                  <span>${section.account.code} - ${locale === "en" && section.account.name_en ? section.account.name_en : section.account.name}</span>
                  <span>${t.closingBalance}: ${section.closing_balance < 0 ? "-" : ""}${formatMoney(section.closing_balance)} ${balanceSideLabel(section.closing_balance_side, locale)}</span>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>${t.date}</th>
                      <th>${t.referenceNumber}</th>
                      <th>${t.definition}</th>
                      <th>${t.debit}</th>
                      <th>${t.credit}</th>
                      <th>${t.balance}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td></td><td></td><td>${t.openingLine}</td>
                      <td class="num"></td><td class="num"></td>
                      <td class="num">${section.opening_balance < 0 ? "-" : ""}${formatMoney(section.opening_balance)}</td>
                    </tr>
                    ${section.lines.map((line) => `
                      <tr>
                        <td>${formatDate(line.date)}</td>
                        <td>${line.reference_number}</td>
                        <td>${line.description || line.cost_center_name || ""}</td>
                        <td class="num">${line.debit ? formatMoney(line.debit) : ""}</td>
                        <td class="num">${line.credit ? formatMoney(line.credit) : ""}</td>
                        <td class="num">${line.balance < 0 ? "-" : ""}${formatMoney(line.balance)}</td>
                      </tr>
                    `).join("")}
                    <tr class="total">
                      <td></td><td></td><td>${t.totalOperation}</td>
                      <td class="num">${formatMoney(section.period_debit)}</td>
                      <td class="num">${formatMoney(section.period_credit)}</td>
                      <td class="num">${section.closing_balance < 0 ? "-" : ""}${formatMoney(section.closing_balance)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            `).join("")}
        </body>
      </html>
    `;
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [dateFrom, dateTo, isRtl, locale, sortedSections, t]);
  if (loading && !sections.length) {
    return <LedgerSkeleton />;
  }
  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="mx-auto max-w-[1500px] space-y-6">
      <Card className="overflow-hidden rounded-3xl border-border/70 bg-card shadow-sm">
        <div className="h-1.5 bg-slate-950" />
        <CardHeader className="gap-4 p-6 md:flex md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t.badge}
            </Badge>
            <div>
              <CardTitle className="text-3xl font-bold tracking-tight">{t.title}</CardTitle>
              <CardDescription className="mt-2 text-sm leading-7">{t.subtitle}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href="/company/accounting">
                  <ChevronLeft className="h-4 w-4" />
                  {t.dashboard}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href="/company/accounting/journal-entries">{t.journalEntries}</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href="/company/accounting/chart-of-accounts">{t.chartOfAccounts}</Link>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadLedger()} className="rounded-xl" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t.refresh}
            </Button>
            <Button variant="outline" onClick={exportExcel} className="rounded-xl">
              <FileSpreadsheet className="h-4 w-4" />
              {t.export}
            </Button>
            <Button onClick={printReport} className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>
          </div>
        </CardHeader>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title={t.totalLines} value={summary.total_lines} description={t.registerDesc} icon={BookOpen} t={t} />
        <KpiCard title={t.totalDebit} value={summary.total_debit} money description={t.totalDebit} icon={BookOpen} t={t} />
        <KpiCard title={t.totalCredit} value={summary.total_credit} money description={t.totalCredit} icon={BookOpen} t={t} />
        <KpiCard title={t.netBalance} value={summary.net_balance} money description={t.netBalance} icon={ArrowUpDown} t={t} />
      </div>
      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t.filtersTitle}</CardTitle>
          <CardDescription>{t.filtersDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">{t.reportType}</label>
              <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accounts">{t.accountsLedger}</SelectItem>
                  <SelectItem value="general">{t.generalLedger}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">{t.accountLevel}</label>
              <Select value={level} onValueChange={setLevel} disabled={reportType !== "general"}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">{t.level2}</SelectItem>
                  <SelectItem value="3">{t.level3}</SelectItem>
                  <SelectItem value="all">{t.allGroups}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 xl:col-span-2">
              <label className="text-xs text-muted-foreground">{t.account}</label>
              <Select value={accountCode} onValueChange={setAccountCode} disabled={accountsLoading}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t.allAccounts} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allAccounts}</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id || account.code} value={account.code}>
                      {account.code} — {locale === "en" && account.name_en ? account.name_en : account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DatePickerField
              label={t.dateFrom}
              value={dateFrom}
              onChange={setDateFrom}
            />
            <DatePickerField
              label={t.dateTo}
              value={dateTo}
              onChange={setDateTo}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.searchPlaceholder} className="rounded-xl ps-9" />
            </div>
            <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
              <SelectTrigger className="w-full rounded-xl md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">{t.sortDate}</SelectItem>
                <SelectItem value="account">{t.sortAccount}</SelectItem>
                <SelectItem value="entry">{t.sortEntry}</SelectItem>
                <SelectItem value="amount">{t.sortAmount}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={resetFilters} className="rounded-xl">
              <RotateCcw className="h-4 w-4" />
              {t.reset}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t.registerTitle}</CardTitle>
          <CardDescription>{t.registerDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          {!loading && !sortedSections.length ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">{t.emptyTitle}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.emptyDesc}</p>
              </div>
              <Button variant="outline" onClick={resetFilters} className="rounded-xl">
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            </div>
          ) : null}
          {sortedSections.map((section) => (
            <div key={section.account.code} className="overflow-hidden rounded-2xl border">
              <div className="flex flex-col gap-3 bg-muted/35 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-base font-bold">
                    {section.account.code} — {locale === "en" && section.account.name_en ? section.account.name_en : section.account.name}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{t.openingBalance}: <MoneyValue value={section.opening_balance} label={t.sar} /> {balanceSideLabel(section.opening_balance_side, locale)}</span>
                    <span>•</span>
                    <span>{t.totalLines}: {formatInteger(section.line_count)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full">
                    {t.totalDebit}: <MoneyValue value={section.period_debit} label={t.sar} className="ms-1" />
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    {t.totalCredit}: <MoneyValue value={section.period_credit} label={t.sar} className="ms-1" />
                  </Badge>
                  <Badge className="rounded-full bg-slate-950 text-white">
                    {t.closingBalance}: <MoneyValue value={section.closing_balance} label={t.sar} className="ms-1" />
                    <span className="ms-1">{balanceSideLabel(section.closing_balance_side, locale)}</span>
                  </Badge>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table className="min-w-[1080px] table-fixed">
                  <colgroup>
                    <col className="w-[120px]" />
                    <col className="w-[170px]" />
                    <col className="w-[150px]" />
                    <col className="w-[270px]" />
                    <col className="w-[120px]" />
                    <col className="w-[120px]" />
                    <col className="w-[140px]" />
                    <col className="w-[110px]" />
                  </colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap text-start">{t.date}</TableHead>
                      <TableHead className="whitespace-nowrap text-start">{t.referenceNumber}</TableHead>
                      <TableHead className="whitespace-nowrap text-start">{t.costCenter}</TableHead>
                      <TableHead className="whitespace-nowrap text-start">{t.definition}</TableHead>
                      <TableHead className="whitespace-nowrap text-end">{t.debit}</TableHead>
                      <TableHead className="whitespace-nowrap text-end">{t.credit}</TableHead>
                      <TableHead className="whitespace-nowrap text-end">{t.balance}</TableHead>
                      <TableHead className="whitespace-nowrap text-center">{t.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-muted/20">
                      <TableCell className="text-start text-muted-foreground">—</TableCell>
                      <TableCell className="text-start text-muted-foreground">—</TableCell>
                      <TableCell className="text-start text-muted-foreground">—</TableCell>
                      <TableCell className="text-start font-medium">{t.openingLine}</TableCell>
                      <TableCell className="text-end text-muted-foreground">—</TableCell>
                      <TableCell className="text-end text-muted-foreground">—</TableCell>
                      <TableCell className="text-end font-semibold">
                        <MoneyValue value={section.opening_balance} label={t.sar} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="rounded-full">{balanceSideLabel(section.opening_balance_side, locale)}</Badge>
                      </TableCell>
                    </TableRow>
                    {section.lines.length ? section.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="whitespace-nowrap text-start tabular-nums" dir="ltr" lang="en">
                          {formatDate(line.date)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-start font-medium tabular-nums" dir="ltr" lang="en">
                          {line.reference_number}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-start">
                          {line.cost_center_code || line.cost_center_name || "—"}
                        </TableCell>
                        <TableCell className="truncate text-start">
                          {line.description || line.source || "—"}
                        </TableCell>
                        <TableCell className="text-end">
                          {line.debit ? <MoneyValue value={line.debit} label={t.sar} /> : "—"}
                        </TableCell>
                        <TableCell className="text-end">
                          {line.credit ? <MoneyValue value={line.credit} label={t.sar} /> : "—"}
                        </TableCell>
                        <TableCell className="text-end font-medium">
                          <MoneyValue value={line.balance} label={t.sar} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">
                            {t.posted}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                          {t.noMovements}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-start">{t.totalOperation}</TableCell>
                      <TableCell className="text-end"><MoneyValue value={section.period_debit} label={t.sar} /></TableCell>
                      <TableCell className="text-end"><MoneyValue value={section.period_credit} label={t.sar} /></TableCell>
                      <TableCell className="text-end"><MoneyValue value={section.closing_balance} label={t.sar} /></TableCell>
                      <TableCell className="text-center">{balanceSideLabel(section.closing_balance_side, locale)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
