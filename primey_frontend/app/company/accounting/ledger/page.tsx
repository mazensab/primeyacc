// ============================================================
// 📂 app/company/accounting/ledger/page.tsx
// 🧠 Mhamcloud | Company Accounting General Ledger
// ------------------------------------------------------------
// ✅ Approved company dashboard premium pattern
// ✅ Real API only
// ✅ Uses existing company reports general-ledger endpoint
// ✅ Fallback from journal entry details when needed
// ✅ Arabic/English locale + English digits
// ============================================================
"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpDown,
  BookOpenText,
  CalendarDays,
  FileSpreadsheet,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
type SortKey = "date" | "account" | "entry" | "amount";
type AccountFilter = string;
type AccountOption = {
  id: number;
  code: string;
  name: string;
  nameEn: string;
  isActive: boolean;
  isGroup: boolean;
  canPost: boolean;
};
type LedgerLine = {
  id: string;
  date: string;
  entryId: string;
  entryNumber: string;
  accountCode: string;
  accountName: string;
  costCenterCode: string;
  costCenterName: string;
  description: string;
  debit: number;
  credit: number;
  balance: number | null;
  status: string;
  source: string;
};
const ALL_ACCOUNTS = "__all_accounts__";
const translations = {
  ar: {
    title: "دفتر الأستاذ",
    subtitle:
      "استعراض حركات الحسابات المرحلة من القيود اليومية مع الأرصدة، الحسابات، مراكز التكلفة، والبحث التفصيلي.",
    badge: "وحدة الحسابات",
    accountingDashboard: "لوحة الحسابات",
    journalEntries: "القيود اليومية",
    chartOfAccounts: "دليل الحسابات",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    totalLines: "إجمالي الحركات",
    totalDebit: "إجمالي المدين",
    totalCredit: "إجمالي الدائن",
    netBalance: "صافي الحركة",
    totalLinesDesc: "حركات دفتر الأستاذ المعروضة",
    totalDebitDesc: "مجموع المدين للفترة",
    totalCreditDesc: "مجموع الدائن للفترة",
    netBalanceDesc: "المدين ناقص الدائن",
    filtersTitle: "فلاتر دفتر الأستاذ",
    filtersDesc: "اختر الحساب والفترة ثم حدّث النتائج من قاعدة البيانات.",
    account: "الحساب",
    allAccounts: "كل الحسابات",
    dateFrom: "من تاريخ",
    dateTo: "إلى تاريخ",
    searchPlaceholder: "ابحث برقم القيد أو الحساب أو مركز التكلفة أو الوصف...",
    sortDate: "ترتيب بالتاريخ",
    sortAccount: "ترتيب بالحساب",
    sortEntry: "ترتيب بالقيد",
    sortAmount: "ترتيب بالمبلغ",
    ledgerRegister: "سجل دفتر الأستاذ",
    ledgerRegisterDesc:
      "كل الحركات المحاسبية المرحلة الخاصة بالشركة. القيود غير المرحلة لا تدخل في دفتر الأستاذ.",
    date: "التاريخ",
    entryNumber: "رقم القيد",
    costCenter: "مركز التكلفة",
    description: "الوصف",
    debit: "مدين",
    credit: "دائن",
    balance: "الرصيد",
    status: "الحالة",
    source: "المصدر",
    posted: "مرحل",
    reversed: "معكوس",
    emptyTitle: "لا توجد حركات في دفتر الأستاذ",
    emptyDesc: "غيّر الفلاتر أو أنشئ قيودًا مرحلة من صفحة القيود اليومية.",
    loading: "جاري تحميل دفتر الأستاذ...",
    loadFailed: "تعذر تحميل دفتر الأستاذ.",
    sar: "ر.س",
    fallbackNotice:
      "تم استخدام بيانات القيود اليومية كمسار احتياطي لأن تقرير دفتر الأستاذ لم يرجع تفاصيل كافية.",
  },
  en: {
    title: "General Ledger",
    subtitle:
      "Review posted accounting movements from journal entries with balances, accounts, cost centers, and detailed search.",
    badge: "Accounting Module",
    accountingDashboard: "Accounting Dashboard",
    journalEntries: "Journal Entries",
    chartOfAccounts: "Chart of Accounts",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    totalLines: "Total lines",
    totalDebit: "Total debit",
    totalCredit: "Total credit",
    netBalance: "Net movement",
    totalLinesDesc: "Displayed ledger movements",
    totalDebitDesc: "Debit total for period",
    totalCreditDesc: "Credit total for period",
    netBalanceDesc: "Debit minus credit",
    filtersTitle: "Ledger Filters",
    filtersDesc: "Choose account and period, then refresh results from the database.",
    account: "Account",
    allAccounts: "All accounts",
    dateFrom: "From date",
    dateTo: "To date",
    searchPlaceholder: "Search by entry, account, cost center, or description...",
    sortDate: "Sort by date",
    sortAccount: "Sort by account",
    sortEntry: "Sort by entry",
    sortAmount: "Sort by amount",
    ledgerRegister: "General Ledger Register",
    ledgerRegisterDesc:
      "All posted accounting movements for the company. Draft entries do not affect the ledger.",
    date: "Date",
    entryNumber: "Entry number",
    costCenter: "Cost center",
    description: "Description",
    debit: "Debit",
    credit: "Credit",
    balance: "Balance",
    status: "Status",
    source: "Source",
    posted: "Posted",
    reversed: "Reversed",
    emptyTitle: "No ledger movements",
    emptyDesc: "Change filters or create posted entries from Journal Entries.",
    loading: "Loading general ledger...",
    loadFailed: "Could not load general ledger.",
    sar: "SAR",
    fallbackNotice:
      "Journal entry details were used as fallback because the ledger report did not return enough line details.",
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
function text(value: unknown) {
  return value === null || value === undefined ? "" : String(value).trim();
}
function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function moneyValue(value: unknown) {
  const parsed = Number(String(value ?? "0").replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
function formatMoney(value: unknown) {
  const parsed = moneyValue(value);
  return parsed.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function formatInteger(value: number) {
  return Math.trunc(value || 0).toLocaleString("en-US");
}
function normalizeDate(value: unknown) {
  const raw = text(value);
  if (!raw) return "";
  return raw.slice(0, 10);
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
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function yearStartIso() {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}
function arrayFromPayload(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const row = record(value);
  for (const key of [
    "results",
    "items",
    "lines",
    "entries",
    "transactions",
    "movements",
    "rows",
    "data",
  ]) {
    const next = row[key];
    if (Array.isArray(next)) return next;
    if (next && typeof next === "object") {
      const nested = arrayFromPayload(next);
      if (nested.length) return nested;
    }
  }
  return [];
}
function extractLedgerArrays(value: unknown): unknown[] {
  const payload = record(value);
  const direct = arrayFromPayload(payload);
  if (direct.length) return direct;
  const accounts = arrayFromPayload(payload.accounts || payload.account_ledgers || payload.ledgers);
  if (!accounts.length) return [];
  return accounts.flatMap((account) => {
    const accountRow = record(account);
    const accountLines = arrayFromPayload(
      accountRow.lines ||
        accountRow.entries ||
        accountRow.transactions ||
        accountRow.movements ||
        accountRow.rows,
    );
    return accountLines.map((line) => ({
      ...record(line),
      account_code: record(line).account_code || accountRow.code || accountRow.account_code,
      account_name: record(line).account_name || accountRow.name || accountRow.account_name,
      closing_balance:
        record(line).closing_balance ||
        record(line).balance ||
        accountRow.closing_balance ||
        accountRow.balance,
    }));
  });
}
function normalizeAccount(value: unknown): AccountOption {
  const row = record(value);
  return {
    id: numberValue(row.id),
    code: text(row.code),
    name: text(row.name || row.name_ar || row.display_name || row.code),
    nameEn: text(row.name_en),
    isActive: Boolean(row.is_active ?? true),
    isGroup: Boolean(row.is_group),
    canPost: Boolean(row.can_post ?? (!row.is_group && row.is_active !== false)),
  };
}
function normalizeLedgerLine(value: unknown, index: number): LedgerLine {
  const row = record(value);
  const entry = record(row.journal_entry || row.entry);
  const account = record(row.account);
  const costCenter = record(row.cost_center);
  const debit = moneyValue(
    row.debit ||
      row.debit_amount ||
      row.total_debit ||
      row.amount_debit ||
      row.debitAmount,
  );
  const credit = moneyValue(
    row.credit ||
      row.credit_amount ||
      row.total_credit ||
      row.amount_credit ||
      row.creditAmount,
  );
  const rawBalance =
    row.balance ||
    row.running_balance ||
    row.closing_balance ||
    row.balance_after ||
    row.runningBalance;
  return {
    id: text(row.id || row.line_id || `${row.entry_number || entry.entry_number || "line"}-${index}`),
    date: normalizeDate(row.date || row.entry_date || row.transaction_date || entry.entry_date),
    entryId: text(row.entry_id || row.journal_entry_id || entry.id),
    entryNumber: text(row.entry_number || row.journal_entry_number || entry.entry_number || row.number),
    accountCode: text(row.account_code || account.code),
    accountName: text(row.account_name || account.name || account.name_ar || account.name_en),
    costCenterCode: text(row.cost_center_code || costCenter.code),
    costCenterName: text(row.cost_center_name || costCenter.name || costCenter.name_en),
    description: text(row.description || row.memo || entry.description),
    debit,
    credit,
    balance: rawBalance === undefined || rawBalance === null || rawBalance === ""
      ? null
      : moneyValue(rawBalance),
    status: text(row.status || entry.status || "POSTED"),
    source: text(row.source || row.posting_source || entry.posting_source || entry.source_type),
  };
}
function computeRunningBalances(lines: LedgerLine[]) {
  let balance = 0;
  return lines.map((line) => {
    balance += line.debit - line.credit;
    return {
      ...line,
      balance: line.balance === null ? balance : line.balance,
    };
  });
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
              if (date) {
                onChange(toIsoDate(date));
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </label>
  );
}
function MoneyValue({ value, label }: { value: unknown; label: string }) {
  return (
    <span className="inline-flex items-center justify-end gap-1 font-black tabular-nums">
      <span>{formatMoney(value)}</span>
      <Image src="/currency/sar.svg" alt={label} width={13} height={13} />
    </span>
  );
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
export default function CompanyAccountingLedgerPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const [accounts, setAccounts] = React.useState<AccountOption[]>([]);
  const [lines, setLines] = React.useState<LedgerLine[]>([]);
  const [search, setSearch] = React.useState("");
  const [accountCode, setAccountCode] = React.useState<AccountFilter>(ALL_ACCOUNTS);
  const [dateFrom, setDateFrom] = React.useState(yearStartIso);
  const [dateTo, setDateTo] = React.useState(todayIso);
  const [sort, setSort] = React.useState<SortKey>("date");
  const [loading, setLoading] = React.useState(true);
  const [usedFallback, setUsedFallback] = React.useState(false);
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
  const accountOptions = React.useMemo(
    () =>
      accounts
        .filter((account) => account.canPost && account.isActive && !account.isGroup)
        .sort((a, b) => a.code.localeCompare(b.code, "en")),
    [accounts],
  );
  const filteredLines = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = lines.filter((line) => {
      const bySearch =
        !q ||
        [
          line.date,
          line.entryNumber,
          line.accountCode,
          line.accountName,
          line.costCenterCode,
          line.costCenterName,
          line.description,
          line.source,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const byAccount = accountCode === ALL_ACCOUNTS || line.accountCode === accountCode;
      return bySearch && byAccount;
    });
    const sorted = [...rows].sort((a, b) => {
      if (sort === "account") return a.accountCode.localeCompare(b.accountCode, "en") || a.date.localeCompare(b.date);
      if (sort === "entry") return a.entryNumber.localeCompare(b.entryNumber, "en") || a.date.localeCompare(b.date);
      if (sort === "amount") return Math.abs(b.debit - b.credit) - Math.abs(a.debit - a.credit);
      return a.date.localeCompare(b.date) || a.entryNumber.localeCompare(b.entryNumber, "en");
    });
    return computeRunningBalances(sorted);
  }, [accountCode, lines, search, sort]);
  const stats = React.useMemo(() => {
    const totalDebit = filteredLines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = filteredLines.reduce((sum, line) => sum + line.credit, 0);
    return {
      totalLines: filteredLines.length,
      totalDebit,
      totalCredit,
      netBalance: totalDebit - totalCredit,
    };
  }, [filteredLines]);
  const loadAccounts = React.useCallback(async () => {
    const payload = await fetchJson<unknown>("/api/company/accounting/accounts/");
    setAccounts(arrayFromPayload(payload).map(normalizeAccount));
  }, []);
  const loadFromJournalFallback = React.useCallback(async () => {
    const listPayload = await fetchJson<unknown>("/api/company/accounting/journal-entries/");
    const entries = arrayFromPayload(listPayload).map(record);
    const entryIds = entries.map((entry) => text(entry.id)).filter(Boolean);
    const details = await Promise.all(
      entryIds.slice(0, 100).map(async (id) => {
        try {
          return await fetchJson<unknown>(`/api/company/accounting/journal-entries/${id}/`);
        } catch {
          return null;
        }
      }),
    );
    const fallbackLines = details.flatMap((payload) => {
      const detail = record(payload);
      const entry = record(detail.entry || detail.journal_entry || detail);
      const entryLines = arrayFromPayload(entry.lines || detail.lines);
      return entryLines.map((line) => ({
        ...record(line),
        entry_id: entry.id,
        entry_number: entry.entry_number || entry.entryNumber,
        entry_date: entry.entry_date || entry.entryDate,
        status: entry.status,
        posting_source: entry.posting_source || entry.postingSource,
      }));
    });
    return fallbackLines.map(normalizeLedgerLine);
  }, []);
  const loadLedger = React.useCallback(async () => {
    setLoading(true);
    try {
      await loadAccounts();
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (accountCode !== ALL_ACCOUNTS) params.set("account_code", accountCode);
      const path = `/api/company/accounting/reports/ledger/?${params.toString()}`;
      const payload = await fetchJson<unknown>(path);
      const reportLines = extractLedgerArrays(payload).map(normalizeLedgerLine);
      if (reportLines.length) {
        setLines(reportLines);
        setUsedFallback(false);
        return;
      }
      const fallbackLines = await loadFromJournalFallback();
      setLines(
        fallbackLines.filter((line) => {
          const inFrom = !dateFrom || line.date >= dateFrom;
          const inTo = !dateTo || line.date <= dateTo;
          const inAccount = accountCode === ALL_ACCOUNTS || line.accountCode === accountCode;
          return inFrom && inTo && inAccount && line.status === "POSTED";
        }),
      );
      setUsedFallback(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [accountCode, dateFrom, dateTo, loadAccounts, loadFromJournalFallback, t.loadFailed]);
  React.useEffect(() => {
    void loadLedger();
  }, [loadLedger]);
  function resetFilters() {
    setSearch("");
    setAccountCode(ALL_ACCOUNTS);
    setDateFrom(yearStartIso());
    setDateTo(todayIso());
    setSort("date");
  }
  function exportExcel() {
    const headers = [
      t.date,
      t.entryNumber,
      t.account,
      t.costCenter,
      t.description,
      t.debit,
      t.credit,
      t.balance,
      t.status,
      t.source,
    ];
    const rows = filteredLines.map((line) => [
      line.date,
      line.entryNumber,
      `${line.accountCode} — ${line.accountName}`,
      line.costCenterCode ? `${line.costCenterCode} — ${line.costCenterName}` : "—",
      line.description,
      formatMoney(line.debit),
      formatMoney(line.credit),
      formatMoney(line.balance || 0),
      line.status,
      line.source,
    ]);
    const html = `<html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${headers
      .map((header) => `<th>${header}</th>`)
      .join("")}</tr></thead><tbody>${rows
      .map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replaceAll("<", "&lt;")}</td>`).join("")}</tr>`)
      .join("")}</tbody></table></body></html>`;
    const blob = new Blob(["\ufeff", html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "general-ledger.xls";
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
                <Button variant="outline" className="rounded-xl bg-background shadow-sm hover:bg-muted/70" onClick={() => void loadLedger()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
              </div>
            </div>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.totalLines} value={stats.totalLines} description={t.totalLinesDesc} icon={BookOpenText} label={t.sar} />
          <KpiCard title={t.totalDebit} value={stats.totalDebit} description={t.totalDebitDesc} icon={WalletCards} money label={t.sar} />
          <KpiCard title={t.totalCredit} value={stats.totalCredit} description={t.totalCreditDesc} icon={WalletCards} money label={t.sar} />
          <KpiCard title={t.netBalance} value={stats.netBalance} description={t.netBalanceDesc} icon={ArrowUpDown} money label={t.sar} />
        </div>
        <Card className="rounded-2xl border-border/70 bg-card shadow-sm transition hover:shadow-md">
          <CardHeader className="px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{t.filtersTitle}</CardTitle>
                <CardDescription className="mt-1">{t.filtersDesc}</CardDescription>
              </div>
              {usedFallback ? (
                <Badge variant="outline" className="w-fit rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                  {t.fallbackNotice}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-5">
            <div className="grid gap-3 rounded-2xl border bg-muted/20 p-3 lg:grid-cols-[1.4fr_170px_170px_170px_130px]">
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t.account}</span>
                <Select value={accountCode} onValueChange={setAccountCode}>
                  <SelectTrigger className="h-10 rounded-xl bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_ACCOUNTS}>{t.allAccounts}</SelectItem>
                    {accountOptions.map((account) => (
                      <SelectItem key={account.id || account.code} value={account.code}>
                        {account.code} — {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
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
              <label className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">{t.status}</span>
                <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
                  <SelectTrigger className="h-10 rounded-xl bg-background">
                    <Filter className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">{t.sortDate}</SelectItem>
                    <SelectItem value="account">{t.sortAccount}</SelectItem>
                    <SelectItem value="entry">{t.sortEntry}</SelectItem>
                    <SelectItem value="amount">{t.sortAmount}</SelectItem>
                  </SelectContent>
                </Select>
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
            <CardTitle>{t.ledgerRegister}</CardTitle>
            <CardDescription className="mt-1">{t.ledgerRegisterDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
            {loading ? (
              <div className="space-y-3 rounded-2xl border p-4">
                <p className="text-sm text-muted-foreground">{t.loading}</p>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredLines.length ? (
              <div className="overflow-hidden rounded-2xl border">
                <div className="overflow-x-auto">
                  <Table className="min-w-[1280px] table-fixed">
                    <TableHeader>
                      <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-[120px] text-start">{t.date}</TableHead>
                        <TableHead className="w-[160px] text-start">{t.entryNumber}</TableHead>
                        <TableHead className="w-[260px] text-start">{t.account}</TableHead>
                        <TableHead className="w-[210px] text-start">{t.costCenter}</TableHead>
                        <TableHead className="text-start">{t.description}</TableHead>
                        <TableHead className="w-[140px] text-end">{t.debit}</TableHead>
                        <TableHead className="w-[140px] text-end">{t.credit}</TableHead>
                        <TableHead className="w-[140px] text-end">{t.balance}</TableHead>
                        <TableHead className="w-[120px] text-center">{t.status}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLines.map((line, index) => (
                        <TableRow key={`${line.id}-${index}`} className="h-[58px] bg-card hover:bg-muted/30">
                          <TableCell className="font-mono font-semibold tabular-nums">{line.date || "—"}</TableCell>
                          <TableCell className="font-mono font-black tabular-nums">{line.entryNumber || "—"}</TableCell>
                          <TableCell className="font-semibold">
                            {line.accountCode ? `${line.accountCode} — ${line.accountName}` : "—"}
                          </TableCell>
                          <TableCell>
                            {line.costCenterCode ? `${line.costCenterCode} — ${line.costCenterName}` : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{line.description || "—"}</TableCell>
                          <TableCell className="text-end">
                            <MoneyValue value={line.debit} label={t.sar} />
                          </TableCell>
                          <TableCell className="text-end">
                            <MoneyValue value={line.credit} label={t.sar} />
                          </TableCell>
                          <TableCell className="text-end">
                            <MoneyValue value={line.balance || 0} label={t.sar} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                line.status === "REVERSED"
                                  ? "rounded-full border-purple-200 bg-purple-50 px-2.5 py-1 text-purple-700"
                                  : "rounded-full border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700"
                              }
                            >
                              {line.status === "REVERSED" ? t.reversed : t.posted}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center">
                <BookOpenText className="h-7 w-7 text-muted-foreground" />
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
