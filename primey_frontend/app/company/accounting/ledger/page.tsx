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
import { useRouter } from "next/navigation";
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
      <span>{value < 0 ? "-" : ""}{formatMoney(value)}</span>
      <Image
        src="/currency/sar.svg"
        alt={label}
        width={14}
        height={14}
        className="h-3.5 w-3.5 shrink-0"
      />
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

function hrefForLedgerDocumentNumber(documentNumber: string) {
  const normalized = documentNumber.trim();
  if (!normalized || normalized === "—") return "";
  const upper = normalized.toUpperCase();
  const encoded = encodeURIComponent(normalized);
  if (/^CP-\d{4}-/i.test(upper)) {
    return `/company/treasury/receipt-vouchers/${encoded}`;
  }
  if (/^SP-\d{4}-/i.test(upper)) {
    return `/company/treasury/payment-vouchers/${encoded}`;
  }
  if (/^(CPAY|SPAY|JE|REV)-\d{4}-/i.test(upper)) {
    return `/company/accounting/journal-entries/${encoded}`;
  }
  return `/company/accounting/journal-entries/${encoded}`;
}
function ledgerSourceDocumentNumber(line: LedgerLine) {
  const candidates = [line.description, line.source].filter(Boolean).join(" ");
  const match = candidates.match(/\b(?:CP|SP)-\d{4}-\d{5,}\b/i);
  return (match?.[0] || "").trim();
}
function ledgerReferenceDocumentNumber(line: LedgerLine) {
  const candidates = [line.reference_number, line.entry_number].filter(Boolean).join(" ");
  const match = candidates.match(/\b(?:CPAY|SPAY|JE|REV|CP|SP)-\d{4}-\d{5,}\b/i);
  return (match?.[0] || line.reference_number || line.entry_number || "").trim();
}
function ledgerDocumentHref(line: LedgerLine) {
  const sourceNumber = ledgerSourceDocumentNumber(line);
  const referenceNumber = ledgerReferenceDocumentNumber(line);
  return hrefForLedgerDocumentNumber(sourceNumber || referenceNumber);
}
function ledgerReferenceHref(line: LedgerLine) {
  return hrefForLedgerDocumentNumber(ledgerReferenceDocumentNumber(line));
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
type LedgerDocumentMode = "full" | "table";
function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function extractCompanyName(payload: unknown) {
  const root = asRecord(payload);
  const company = asRecord(
    root.company ||
      root.current_company ||
      root.company_profile ||
      root.tenant,
  );
  return text(
    company.name ||
      company.company_name ||
      company.legal_name ||
      root.company_name ||
      root.tenant_name,
  );
}
function documentMoney(value: number) {
  return `${value < 0 ? "-" : ""}${formatMoney(value)}`;
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
    <Card className="group rounded-lg border bg-card shadow-none">
      <CardContent className="flex min-h-[132px] items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="mt-2 text-2xl font-black tracking-tight tabular-nums">
            {money ? (
              <MoneyValue value={value} label={t.sar} className="text-2xl font-black" />
            ) : (
              formatInteger(value)
            )}
          </div>
          <p className="mt-5 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <span className="rounded-lg border bg-background p-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  );
}
function LedgerSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <Skeleton className="h-10 w-72" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[132px] rounded-lg" />
        ))}
      </div>
      <Card className="rounded-lg border shadow-none">
        <CardContent className="space-y-4 p-5">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}
export default function CompanyAccountingLedgerPage() {
  const router = useRouter();
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [loading, setLoading] = React.useState(true);
  const [accountsLoading, setAccountsLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
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
    const syncLocale = () => setLocale(getInitialLocale());
    syncLocale();
    window.addEventListener("storage", syncLocale);
    window.addEventListener("primey-locale-change", syncLocale as EventListener);
    return () => {
      window.removeEventListener("storage", syncLocale);
      window.removeEventListener("primey-locale-change", syncLocale as EventListener);
    };
  }, []);

  const t = translations[locale];
  const isRtl = locale === "ar";
  const extra = locale === "ar"
    ? {
        reportTitle: "تقرير دفتر الأستاذ",
        totalLinesDesc: "عدد الحركات المرحلة المعروضة في التقرير",
        totalDebitDesc: "إجمالي الجانب المدين خلال الفترة",
        totalCreditDesc: "إجمالي الجانب الدائن خلال الفترة",
        netBalanceDesc: "الفرق بين إجمالي المدين وإجمالي الدائن",
        totalMovement: "إجمالي الحركة",
        appliedFilters: "الفلاتر المطبقة",
        companyFallback: "الشركة",
        fullReportExported: "تم تجهيز تقرير دفتر الأستاذ الكامل بصيغة Excel.",
        tableReportExported: "تم تجهيز سجل دفتر الأستاذ بصيغة Excel.",
        fullReportPrintReady: "تم تجهيز تقرير دفتر الأستاذ للطباعة.",
        tableReportPrintReady: "تم تجهيز سجل دفتر الأستاذ للطباعة.",
      }
    : {
        reportTitle: "General Ledger Report",
        totalLinesDesc: "Number of posted movements displayed in the report",
        totalDebitDesc: "Total debit side during the selected period",
        totalCreditDesc: "Total credit side during the selected period",
        netBalanceDesc: "Difference between total debit and total credit",
        totalMovement: "Movement total",
        appliedFilters: "Applied filters",
        companyFallback: "Company",
        fullReportExported: "The full ledger report Excel file is ready.",
        tableReportExported: "The ledger register Excel file is ready.",
        fullReportPrintReady: "The full ledger report is ready to print.",
        tableReportPrintReady: "The ledger register is ready to print.",
      };

  const openLedgerLineDocument = React.useCallback(
    (line: LedgerLine) => {
      const href = ledgerDocumentHref(line);
      if (href) router.push(href);
    },
    [router],
  );

  const loadCompany = React.useCallback(async () => {
    try {
      const payload = await fetchJson<unknown>("/api/auth/whoami/");
      setCompanyName(extractCompanyName(payload));
    } catch {
      setCompanyName("");
    }
  }, []);

  const loadAccounts = React.useCallback(async () => {
    setAccountsLoading(true);
    try {
      const payload = await fetchJson<unknown>(
        "/api/company/accounting/accounts/?page_size=1000",
      );
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
      const normalizedSections = extractArray(payload, [
        "sections",
        "groups",
        "accounts",
      ])
        .map(normalizeSection)
        .filter((section) => section.account.code);
      setSections(normalizedSections);
      setSummary(normalizeSummary(payload.summary));
      return true;
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
      return false;
    } finally {
      setLoading(false);
    }
  }, [accountCode, dateFrom, dateTo, level, reportType, search, t.loadFailed]);

  React.useEffect(() => {
    void loadCompany();
    void loadAccounts();
  }, [loadAccounts, loadCompany]);

  React.useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  const sortedSections = React.useMemo(() => {
    const copy = [...sections];
    if (sort === "account") {
      return copy.sort((a, b) => a.account.code.localeCompare(b.account.code));
    }
    if (sort === "amount") {
      return copy.sort(
        (a, b) => Math.abs(b.closing_balance) - Math.abs(a.closing_balance),
      );
    }
    return copy.map((section) => ({
      ...section,
      lines: [...section.lines].sort((a, b) => {
        if (sort === "entry") {
          return a.entry_number.localeCompare(b.entry_number);
        }
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.entry_number.localeCompare(b.entry_number);
      }),
    }));
  }, [sections, sort]);

  const displayedLines = React.useMemo(
    () => sortedSections.reduce((total, section) => total + section.lines.length, 0),
    [sortedSections],
  );

  const selectedAccountLabel = React.useMemo(() => {
    if (accountCode === "all") return t.allAccounts;
    const account = accounts.find((item) => item.code === accountCode);
    if (!account) return accountCode;
    const name = locale === "en" && account.name_en ? account.name_en : account.name;
    return `${account.code} — ${name}`;
  }, [accountCode, accounts, locale, t.allAccounts]);

  const appliedFiltersText = React.useMemo(() => {
    const reportLabel =
      reportType === "general" ? t.generalLedger : t.accountsLedger;
    const parts = [
      `${t.dateFrom}: ${dateFrom || "—"}`,
      `${t.dateTo}: ${dateTo || "—"}`,
      `${t.reportType}: ${reportLabel}`,
      `${t.account}: ${selectedAccountLabel}`,
      `${t.sort}: ${
        sort === "account"
          ? t.sortAccount
          : sort === "entry"
            ? t.sortEntry
            : sort === "amount"
              ? t.sortAmount
              : t.sortDate
      }`,
    ];
    if (reportType === "general") {
      parts.push(
        `${t.accountLevel}: ${
          level === "2" ? t.level2 : level === "3" ? t.level3 : t.allGroups
        }`,
      );
    }
    if (search.trim()) parts.push(`${t.searchPlaceholder}: ${search.trim()}`);
    return parts.join(" • ");
  }, [
    dateFrom,
    dateTo,
    level,
    reportType,
    search,
    selectedAccountLabel,
    sort,
    t,
  ]);

  const resetFilters = React.useCallback(() => {
    setReportType("accounts");
    setLevel("2");
    setAccountCode("all");
    setDateFrom(yearStartIso());
    setDateTo(todayIso());
    setSearch("");
    setSort("date");
  }, []);

  const refreshLedger = React.useCallback(async () => {
    const ok = await loadLedger();
    if (ok) toast.success(t.refreshed);
  }, [loadLedger, t.refreshed]);

  const buildLedgerDocument = React.useCallback(
    (mode: LedgerDocumentMode) => {
      const direction = isRtl ? "rtl" : "ltr";
      const reportHeading = mode === "full" ? extra.reportTitle : t.registerTitle;
      const company = escapeHtml(companyName || extra.companyFallback);
      const sectionTables = sortedSections
        .map((section) => {
          const accountName =
            locale === "en" && section.account.name_en
              ? section.account.name_en
              : section.account.name;
          const movements = section.lines.length
            ? section.lines
                .map(
                  (line) => `
                    <tr>
                      <td class="date">${escapeHtml(formatDate(line.date))}</td>
                      <td class="ref">${escapeHtml(line.reference_number || line.entry_number || "—")}</td>
                      <td>${escapeHtml(line.cost_center_code || line.cost_center_name || "—")}</td>
                      <td>${escapeHtml(line.description || line.source || "—")}</td>
                      <td class="num">${line.debit ? documentMoney(line.debit) : "—"}</td>
                      <td class="num">${line.credit ? documentMoney(line.credit) : "—"}</td>
                      <td class="num">${documentMoney(line.balance)}</td>
                      <td>${escapeHtml(t.posted)}</td>
                    </tr>`,
                )
                .join("")
            : `<tr><td colspan="8" class="empty">${escapeHtml(t.noMovements)}</td></tr>`;
          return `
            <section class="account-section">
              <div class="account-heading">
                <div>
                  <strong>${escapeHtml(section.account.code)} — ${escapeHtml(accountName)}</strong>
                  <span>${escapeHtml(t.totalLines)}: ${formatInteger(section.line_count || section.lines.length)}</span>
                </div>
                <div class="account-meta">
                  <span>${escapeHtml(t.openingBalance)}: ${documentMoney(section.opening_balance)} ${escapeHtml(balanceSideLabel(section.opening_balance_side, locale))}</span>
                  <span>${escapeHtml(t.closingBalance)}: ${documentMoney(section.closing_balance)} ${escapeHtml(balanceSideLabel(section.closing_balance_side, locale))}</span>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>${escapeHtml(t.date)}</th>
                    <th>${escapeHtml(t.referenceNumber)}</th>
                    <th>${escapeHtml(t.costCenter)}</th>
                    <th>${escapeHtml(t.definition)}</th>
                    <th>${escapeHtml(t.debit)}</th>
                    <th>${escapeHtml(t.credit)}</th>
                    <th>${escapeHtml(t.balance)}</th>
                    <th>${escapeHtml(t.status)}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="opening-row">
                    <td>—</td><td>—</td><td>—</td>
                    <td>${escapeHtml(t.openingLine)}</td>
                    <td class="num">—</td><td class="num">—</td>
                    <td class="num">${documentMoney(section.opening_balance)}</td>
                    <td>${escapeHtml(balanceSideLabel(section.opening_balance_side, locale))}</td>
                  </tr>
                  ${movements}
                  <tr class="total-row">
                    <td></td><td></td><td></td>
                    <td>${escapeHtml(extra.totalMovement)}</td>
                    <td class="num">${documentMoney(section.period_debit)}</td>
                    <td class="num">${documentMoney(section.period_credit)}</td>
                    <td class="num">${documentMoney(section.period_balance)}</td>
                    <td></td>
                  </tr>
                  <tr class="closing-row">
                    <td></td><td></td><td></td>
                    <td>${escapeHtml(t.closingBalance)}</td>
                    <td class="num"></td><td class="num"></td>
                    <td class="num">${documentMoney(section.closing_balance)}</td>
                    <td>${escapeHtml(balanceSideLabel(section.closing_balance_side, locale))}</td>
                  </tr>
                </tbody>
              </table>
            </section>`;
        })
        .join("");
      const summaryBlock =
        mode === "full"
          ? `
            <table class="summary-table">
              <tbody>
                <tr>
                  <th>${escapeHtml(t.totalSections)}</th>
                  <td class="num">${formatInteger(sortedSections.length)}</td>
                  <th>${escapeHtml(t.totalLines)}</th>
                  <td class="num">${formatInteger(displayedLines)}</td>
                </tr>
                <tr>
                  <th>${escapeHtml(t.totalDebit)}</th>
                  <td class="num">${documentMoney(summary.total_debit)}</td>
                  <th>${escapeHtml(t.totalCredit)}</th>
                  <td class="num">${documentMoney(summary.total_credit)}</td>
                </tr>
                <tr>
                  <th>${escapeHtml(t.netBalance)}</th>
                  <td class="num">${documentMoney(summary.net_balance)}</td>
                  <th>${escapeHtml(t.closingBalance)}</th>
                  <td class="num">${documentMoney(summary.closing_balance)}</td>
                </tr>
              </tbody>
            </table>`
          : "";
      return `<!doctype html>
<html dir="${direction}" lang="${locale}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(reportHeading)}</title>
  <style>
    @page { size: A4 landscape; margin: 9mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111827; background: #fff; font-family: Tahoma, Arial, sans-serif; font-size: 10px; }
    .report { width: 100%; }
    .company { font-size: 11px; font-weight: 700; }
    h1 { margin: 2px 0 4px; font-size: 20px; line-height: 1.2; }
    .meta { margin-bottom: 8px; color: #374151; font-size: 9px; line-height: 1.7; }
    .filters { border: 1px solid #000; padding: 5px 7px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #000; padding: 4px 5px; vertical-align: middle; text-align: ${isRtl ? "right" : "left"}; }
    th { background: #f3f4f6; font-weight: 700; }
    .num { direction: ltr; text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
    .date, .ref { direction: ltr; font-variant-numeric: tabular-nums; }
    .summary-table { margin-bottom: 9px; }
    .summary-table th { width: 22%; }
    .summary-table td { width: 28%; }
    .account-section { break-inside: avoid; margin-top: 9px; }
    .account-heading { display: flex; justify-content: space-between; gap: 12px; border: 1px solid #000; border-bottom: 0; padding: 6px 7px; background: #f9fafb; }
    .account-heading strong { display: block; font-size: 11px; }
    .account-heading span { display: block; margin-top: 2px; color: #4b5563; font-size: 8px; }
    .account-meta { display: flex; gap: 14px; text-align: end; }
    .opening-row { background: #f8fafc; }
    .total-row { background: #f1f5f9; font-weight: 700; }
    .closing-row { background: #e5e7eb; border-top: 2px solid #64748b; font-weight: 700; }
    .empty { padding: 18px; text-align: center; color: #6b7280; }
    .footer { margin-top: 7px; text-align: ${isRtl ? "left" : "right"}; color: #4b5563; font-size: 8px; }
    @media print {
      .account-section { break-inside: avoid-page; }
      thead { display: table-header-group; }
    }
  </style>
</head>
<body>
  <main class="report">
    <div class="company">${company}</div>
    <h1>${escapeHtml(reportHeading)}</h1>
    <div class="meta">${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString("en-GB"))}</div>
    <div class="filters"><strong>${escapeHtml(extra.appliedFilters)}:</strong> ${escapeHtml(appliedFiltersText)}</div>
    ${summaryBlock}
    ${sectionTables}
    <div class="footer">${company} — ${escapeHtml(new Date().toLocaleString("en-GB"))}</div>
  </main>
</body>
</html>`;
    },
    [
      appliedFiltersText,
      companyName,
      displayedLines,
      isRtl,
      locale,
      sortedSections,
      summary,
      t,
    ],
  );

  const printLedger = React.useCallback(
    (mode: LedgerDocumentMode) => {
      if (!sortedSections.length) {
        toast.error(t.printEmpty);
        return;
      }
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error(
          locale === "ar"
            ? "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة."
            : "The print window could not be opened. Allow pop-ups and try again.",
        );
        return;
      }
      printWindow.document.open();
      printWindow.document.write(buildLedgerDocument(mode));
      printWindow.document.close();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
      window.setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
      toast.success(
        mode === "full"
          ? extra.fullReportPrintReady
          : extra.tableReportPrintReady,
      );
    },
    [
      buildLedgerDocument,
      extra.fullReportPrintReady,
      extra.tableReportPrintReady,
      locale,
      sortedSections.length,
      t.printEmpty,
    ],
  );

  const downloadLedger = React.useCallback(
    (mode: LedgerDocumentMode) => {
      if (!sortedSections.length) {
        toast.error(t.exportEmpty);
        return;
      }
      const html = buildLedgerDocument(mode);
      const blob = new Blob([`\ufeff${html}`], {
        type: "application/vnd.ms-excel;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${mode === "full" ? "ledger" : "ledger-table"}-${dateFrom || "from"}-${dateTo || "to"}.xls`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(
        mode === "full" ? extra.fullReportExported : extra.tableReportExported,
      );
    },
    [buildLedgerDocument, dateFrom, dateTo, sortedSections.length, t],
  );

  if (loading && !sections.length) return <LedgerSkeleton />;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="mx-auto max-w-[1500px] space-y-5"
    >
      <header className="flex flex-col gap-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t.badge}
          </Badge>
          <div>
            <h1 className="text-3xl font-black tracking-tight">{t.title}</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {t.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-lg">
              <Link href="/company/accounting">
                <ChevronLeft className="h-4 w-4" />
                {t.dashboard}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-lg">
              <Link href="/company/accounting/journal-entries">
                {t.journalEntries}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-lg">
              <Link href="/company/accounting/chart-of-accounts">
                {t.chartOfAccounts}
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void refreshLedger()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            {t.refresh}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadLedger("full")}
          >
            <FileSpreadsheet />
            {t.export}
          </Button>
          <Button
            type="button"
            onClick={() => printLedger("full")}
          >
            <Printer />
            {t.print}
          </Button>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalLines}
          value={displayedLines || summary.total_lines}
          description={extra.totalLinesDesc}
          icon={BookOpen}
          t={t}
        />
        <KpiCard
          title={t.totalDebit}
          value={summary.total_debit}
          money
          description={extra.totalDebitDesc}
          icon={BookOpen}
          t={t}
        />
        <KpiCard
          title={t.totalCredit}
          value={summary.total_credit}
          money
          description={extra.totalCreditDesc}
          icon={BookOpen}
          t={t}
        />
        <KpiCard
          title={t.netBalance}
          value={summary.net_balance}
          money
          description={extra.netBalanceDesc}
          icon={ArrowUpDown}
          t={t}
        />
      </div>

      <Card className="rounded-lg border bg-card shadow-none">
        <CardHeader className="gap-4 p-5 md:flex md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{t.registerTitle}</CardTitle>
              <Badge variant="outline" className="rounded-full tabular-nums">
                {formatInteger(sortedSections.length)}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {reportType === "general" ? t.generalLedger : t.accountsLedger}
              </Badge>
            </div>
            <CardDescription className="mt-2 leading-6">
              {t.registerDesc}
            </CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadLedger("table")}
            >
              <FileSpreadsheet />
              {t.export}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => printLedger("table")}
            >
              <Printer />
              {t.print}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 pt-0">
          <div className="rounded-lg border bg-muted/10 p-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  {t.reportType}
                </label>
                <Select
                  value={reportType}
                  onValueChange={(value) => setReportType(value as ReportType)}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                    <SelectItem value="accounts">{t.accountsLedger}</SelectItem>
                    <SelectItem value="general">{t.generalLedger}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  {t.accountLevel}
                </label>
                <Select
                  value={level}
                  onValueChange={setLevel}
                  disabled={reportType !== "general"}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                    <SelectItem value="2">{t.level2}</SelectItem>
                    <SelectItem value="3">{t.level3}</SelectItem>
                    <SelectItem value="all">{t.allGroups}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 xl:col-span-2">
                <label className="text-xs text-muted-foreground">
                  {t.account}
                </label>
                <Select
                  value={accountCode}
                  onValueChange={setAccountCode}
                  disabled={accountsLoading}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder={t.allAccounts} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                    <SelectItem value="all">{t.allAccounts}</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem
                        key={account.id || account.code}
                        value={account.code}
                      >
                        {account.code} — {locale === "en" && account.name_en
                          ? account.name_en
                          : account.name}
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
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="rounded-lg ps-9"
                />
              </div>
              <Select
                value={sort}
                onValueChange={(value) => setSort(value as SortKey)}
              >
                <SelectTrigger className="w-full rounded-lg md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                  <SelectItem value="date">{t.sortDate}</SelectItem>
                  <SelectItem value="account">{t.sortAccount}</SelectItem>
                  <SelectItem value="entry">{t.sortEntry}</SelectItem>
                  <SelectItem value="amount">{t.sortAmount}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={resetFilters}
                className="rounded-lg"
              >
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {!loading && !sortedSections.length ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">{t.emptyTitle}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.emptyDesc}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={resetFilters}
                className="rounded-lg"
              >
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            </div>
          ) : null}

          {sortedSections.map((section) => {
            const accountName =
              locale === "en" && section.account.name_en
                ? section.account.name_en
                : section.account.name;
            return (
              <div
                key={section.account.code}
                className="overflow-hidden rounded-lg border"
              >
                <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-base font-bold">
                      {section.account.code} — {accountName}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {t.openingBalance}: {" "}
                        <MoneyValue
                          value={section.opening_balance}
                          label={t.sar}
                        />
                      </span>
                      <Badge variant="outline" className="rounded-full">
                        {balanceSideLabel(section.opening_balance_side, locale)}
                      </Badge>
                      <span>•</span>
                      <span>
                        {t.totalLines}: {formatInteger(section.line_count)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full">
                      {t.totalDebit}: {" "}
                      <MoneyValue
                        value={section.period_debit}
                        label={t.sar}
                        className="ms-1"
                      />
                    </Badge>
                    <Badge variant="outline" className="rounded-full">
                      {t.totalCredit}: {" "}
                      <MoneyValue
                        value={section.period_credit}
                        label={t.sar}
                        className="ms-1"
                      />
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full bg-slate-100 text-slate-700"
                    >
                      {t.closingBalance}: {" "}
                      <MoneyValue
                        value={section.closing_balance}
                        label={t.sar}
                        className="ms-1"
                      />
                      <span className="ms-1">
                        {balanceSideLabel(section.closing_balance_side, locale)}
                      </span>
                    </Badge>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table className="min-w-[1180px] table-fixed">
                    <colgroup>
                      <col className="w-[130px]" />
                      <col className="w-[190px]" />
                      <col className="w-[150px]" />
                      <col className="w-[330px]" />
                      <col className="w-[125px]" />
                      <col className="w-[125px]" />
                      <col className="w-[145px]" />
                      <col className="w-[120px]" />
                    </colgroup>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap px-4 text-start">
                          {t.date}
                        </TableHead>
                        <TableHead className="whitespace-nowrap px-4 text-start">
                          {t.referenceNumber}
                        </TableHead>
                        <TableHead className="whitespace-nowrap px-4 text-start">
                          {t.costCenter}
                        </TableHead>
                        <TableHead className="whitespace-nowrap px-4 text-start">
                          {t.definition}
                        </TableHead>
                        <TableHead className="whitespace-nowrap px-4 text-end">
                          {t.debit}
                        </TableHead>
                        <TableHead className="whitespace-nowrap px-4 text-end">
                          {t.credit}
                        </TableHead>
                        <TableHead className="whitespace-nowrap px-4 text-end">
                          {t.balance}
                        </TableHead>
                        <TableHead className="whitespace-nowrap px-4 text-center">
                          {t.status}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="bg-muted/20">
                        <TableCell className="px-4 text-start text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="px-4 text-start text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="px-4 text-start text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="px-4 text-start font-medium">
                          {t.openingLine}
                        </TableCell>
                        <TableCell className="px-4 text-end text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="px-4 text-end text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="px-4 text-end font-semibold">
                          <MoneyValue
                            value={section.opening_balance}
                            label={t.sar}
                          />
                        </TableCell>
                        <TableCell className="px-4 text-center">
                          <Badge variant="outline" className="rounded-full">
                            {balanceSideLabel(
                              section.opening_balance_side,
                              locale,
                            )}
                          </Badge>
                        </TableCell>
                      </TableRow>

                      {section.lines.length ? (
                        section.lines.map((line) => {
                          const documentHref = ledgerDocumentHref(line);
                          const referenceHref = ledgerReferenceHref(line);
                          const sourceDocumentNumber =
                            ledgerSourceDocumentNumber(line);
                          const sourceDocumentHref =
                            hrefForLedgerDocumentNumber(sourceDocumentNumber);
                          return (
                            <TableRow
                              key={line.id}
                              role={documentHref ? "button" : undefined}
                              tabIndex={documentHref ? 0 : undefined}
                              title={
                                documentHref
                                  ? locale === "ar"
                                    ? "اضغط لفتح المستند أو تفاصيل القيد"
                                    : "Click to open document or entry details"
                                  : undefined
                              }
                              onClick={() => openLedgerLineDocument(line)}
                              onKeyDown={(event) => {
                                if (
                                  documentHref &&
                                  (event.key === "Enter" || event.key === " ")
                                ) {
                                  event.preventDefault();
                                  openLedgerLineDocument(line);
                                }
                              }}
                              className={cn(
                                "transition-colors hover:bg-muted/30",
                                documentHref && "cursor-pointer",
                              )}
                            >
                              <TableCell
                                className="whitespace-nowrap px-4 text-start tabular-nums"
                                dir="ltr"
                                lang="en"
                              >
                                {formatDate(line.date)}
                              </TableCell>
                              <TableCell
                                className="whitespace-nowrap px-4 text-start font-medium tabular-nums"
                                dir="ltr"
                                lang="en"
                              >
                                {referenceHref ? (
                                  <Link
                                    href={referenceHref}
                                    onClick={(event) => event.stopPropagation()}
                                    className="inline-flex max-w-full rounded-lg px-2 py-1 font-semibold text-slate-950 transition hover:bg-slate-100 hover:underline"
                                    title={
                                      locale === "ar"
                                        ? "فتح تفاصيل القيد"
                                        : "Open journal entry details"
                                    }
                                  >
                                    {line.reference_number ||
                                      ledgerReferenceDocumentNumber(line) ||
                                      "—"}
                                  </Link>
                                ) : (
                                  line.reference_number || "—"
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-4 text-start">
                                {line.cost_center_code ||
                                  line.cost_center_name ||
                                  "—"}
                              </TableCell>
                              <TableCell className="px-4 text-start">
                                <div
                                  className="truncate"
                                  title={line.description || line.source || "—"}
                                >
                                  {line.description || line.source || "—"}
                                </div>
                                {sourceDocumentHref ? (
                                  <Link
                                    href={sourceDocumentHref}
                                    onClick={(event) => event.stopPropagation()}
                                    className="mt-1 inline-flex w-fit rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 hover:underline"
                                    dir="ltr"
                                    lang="en"
                                    title={
                                      locale === "ar"
                                        ? "فتح تفاصيل السند الأصلي"
                                        : "Open source voucher details"
                                    }
                                  >
                                    {sourceDocumentNumber}
                                  </Link>
                                ) : null}
                              </TableCell>
                              <TableCell className="px-4 text-end">
                                {line.debit ? (
                                  <MoneyValue value={line.debit} label={t.sar} />
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell className="px-4 text-end">
                                {line.credit ? (
                                  <MoneyValue value={line.credit} label={t.sar} />
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell className="px-4 text-end font-medium">
                                <MoneyValue value={line.balance} label={t.sar} />
                              </TableCell>
                              <TableCell className="px-4 text-center">
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
                                >
                                  {t.posted}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="h-24 text-center text-muted-foreground"
                          >
                            {t.noMovements}
                          </TableCell>
                        </TableRow>
                      )}

                      <TableRow className="bg-slate-50 font-bold">
                        <TableCell />
                        <TableCell />
                        <TableCell />
                        <TableCell className="px-4 text-start">
                          {extra.totalMovement}
                        </TableCell>
                        <TableCell className="px-4 text-end">
                          <MoneyValue
                            value={section.period_debit}
                            label={t.sar}
                          />
                        </TableCell>
                        <TableCell className="px-4 text-end">
                          <MoneyValue
                            value={section.period_credit}
                            label={t.sar}
                          />
                        </TableCell>
                        <TableCell className="px-4 text-end">
                          <MoneyValue
                            value={section.period_balance}
                            label={t.sar}
                          />
                        </TableCell>
                        <TableCell />
                      </TableRow>
                      <TableRow className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                        <TableCell />
                        <TableCell />
                        <TableCell />
                        <TableCell className="px-4 text-start">
                          {t.closingBalance}
                        </TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell className="px-4 text-end">
                          <MoneyValue
                            value={section.closing_balance}
                            label={t.sar}
                          />
                        </TableCell>
                        <TableCell className="px-4 text-center">
                          {balanceSideLabel(
                            section.closing_balance_side,
                            locale,
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
