"use client";
/* ============================================================
   📂 primey_frontend/app/company/accounting/page.tsx
   🧠 PrimeyAcc — Company General Accounting Dashboard
   ------------------------------------------------------------
   ✅ Approved Premium company/system dashboard pattern
   ✅ Real API only, no fake demo data
   ✅ Company scoped overview
   ✅ Read-only dashboard page
   ✅ Operational links only to accounting child pages
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error / Empty states
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost hardcoding
============================================================ */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  BadgeDollarSign,
  Banknote,
  BarChart3,
  BookOpen,
  Calculator,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  FileSpreadsheet,
  Landmark,
  Layers3,
  Loader2,
  MoreVertical,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  TriangleAlert,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
type ApiResponse = ApiRecord | ApiRecord[];
type SortKey = "newest" | "oldest" | "amount_high" | "amount_low" | "number";
type StatusFilter = "all" | "posted" | "draft" | "cancelled" | "balanced" | "unbalanced";
type DashboardStats = {
  assets: number;
  liabilities: number;
  equity: number;
  revenue: number;
  expenses: number;
  netIncome: number;
  cashFlow: number;
  accounts: number;
  activeAccounts: number;
  journalEntries: number;
  postedEntries: number;
  draftEntries: number;
  trialDebit: number;
  trialCredit: number;
  isBalanced: boolean | null;
};
type JournalRecord = {
  id: string;
  number: string;
  date: string | null;
  description: string;
  status: string;
  amount: number;
  isBalanced: boolean | null;
};
type ShortcutRecord = {
  href: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  badgeAr: string;
  badgeEn: string;
  icon: React.ComponentType<{ className?: string }>;
};
type DataColumn<T> = {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};
const ACCOUNTING_ENDPOINTS = {
  trialBalance: [
    "/api/company/accounting/reports/trial-balance/",
    "/api/company/reports/trial-balance/",
  ],
  profitLoss: [
    "/api/company/accounting/reports/income-statement/",
  ],
  balanceSheet: [
    "/api/company/accounting/reports/financial-position/",
  ],
  cashFlow: [
    "/api/company/accounting/reports/cash-flow/",
  ],
  accounts: [
    "/api/company/accounting/accounts/",
  ],
  journalEntries: [
    "/api/company/accounting/journal-entries/",
  ],
};
const shortcuts: ShortcutRecord[] = [
  {
    href: "/company/accounting/chart-of-accounts",
    titleAr: "دليل الحسابات",
    titleEn: "Chart of Accounts",
    descAr: "إضافة وتعديل وتنظيم الحسابات الرئيسية والفرعية.",
    descEn: "Create, update, and organize parent and child accounts.",
    badgeAr: "تشغيلي",
    badgeEn: "Operational",
    icon: Layers3,
  },
  {
    href: "/company/accounting/journal-entries",
    titleAr: "القيود اليومية",
    titleEn: "Journal Entries",
    descAr: "إنشاء القيود اليدوية وترحيلها بعد التوازن.",
    descEn: "Create and post balanced manual journal entries.",
    badgeAr: "تشغيلي",
    badgeEn: "Operational",
    icon: Calculator,
  },
  {
    href: "/company/accounting/ledger",
    titleAr: "دفتر الأستاذ",
    titleEn: "General Ledger",
    descAr: "عرض حركة الحسابات والأرصدة حسب الفترة.",
    descEn: "Review account movements and balances by period.",
    badgeAr: "تقرير",
    badgeEn: "Report",
    icon: BookOpen,
  },
  {
    href: "/company/accounting/trial-balance",
    titleAr: "ميزان المراجعة",
    titleEn: "Trial Balance",
    descAr: "مطابقة إجمالي المدين والدائن للحسابات.",
    descEn: "Compare debit and credit balances across accounts.",
    badgeAr: "تقرير",
    badgeEn: "Report",
    icon: BarChart3,
  },
  {
    href: "/company/accounting/profit-loss",
    titleAr: "قائمة الدخل",
    titleEn: "Income Statement",
    descAr: "تحليل الإيرادات والمصروفات وصافي الربح.",
    descEn: "Analyze revenue, expenses, and net income.",
    badgeAr: "تقرير",
    badgeEn: "Report",
    icon: CircleDollarSign,
  },
  {
    href: "/company/accounting/balance-sheet",
    titleAr: "المركز المالي",
    titleEn: "Financial Position",
    descAr: "عرض الأصول والالتزامات وحقوق الملكية.",
    descEn: "View assets, liabilities, and equity.",
    badgeAr: "تقرير",
    badgeEn: "Report",
    icon: Landmark,
  },
  {
    href: "/company/accounting/cash-flow",
    titleAr: "قائمة التدفقات النقدية",
    titleEn: "Cash Flow Statement",
    descAr: "متابعة حركة النقد التشغيلية والتمويلية.",
    descEn: "Track operating and financing cash movements.",
    badgeAr: "تقرير",
    badgeEn: "Report",
    icon: WalletCards,
  },
];
const translations = {
  ar: {
    title: "الحسابات العامة",
    subtitle:
      "لوحة متابعة مالية للشركة تعرض الحسابات، القيود، الأرصدة، وملخصات التقارير المحاسبية من مكان واحد.",
    moduleBadge: "وحدة الشركة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    search: "بحث",
    all: "الكل",
    from: "من",
    to: "إلى",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    amountHigh: "الأعلى مبلغًا",
    amountLow: "الأقل مبلغًا",
    numberSort: "رقم القيد",
    open: "فتح",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    sar: "ر.س",
    unknown: "غير محدد",
    readOnlyTitle: "صفحة متابعة فقط",
    readOnlyDesc:
      "العمليات التشغيلية مثل إضافة الحسابات أو ترحيل القيود تتم من الصفحات المختصة داخل الوحدة.",
    totalAssets: "إجمالي الأصول",
    liabilities: "إجمالي الخصوم",
    equity: "حقوق الملكية",
    revenue: "الإيرادات",
    expenses: "المصروفات",
    netIncome: "صافي الربح / الخسارة",
    cashFlow: "صافي التدفق النقدي",
    accounts: "الحسابات",
    activeAccounts: "نشط",
    journalEntries: "القيود اليومية",
    postedEntries: "مرحّل",
    draftEntries: "مسودة",
    trialBalance: "ميزان المراجعة",
    debit: "مدين",
    credit: "دائن",
    balanced: "متوازن",
    notBalanced: "غير متوازن",
    unavailable: "غير متاح",
    shortcutsTitle: "اختصارات الوحدة",
    shortcutsDesc: "انتقال سريع لصفحات الحسابات العامة التشغيلية والتقارير.",
    summaryTitle: "ملخص الحسابات",
    summaryDesc: "قراءة مالية مختصرة من واجهات الحسابات والتقارير.",
    latestEntries: "آخر القيود اليومية",
    latestEntriesDesc: "أحدث القيود المحاسبية الخاصة بالشركة.",
    entrySearchPlaceholder: "ابحث برقم القيد أو الوصف أو الحالة...",
    entryNo: "رقم القيد",
    date: "التاريخ",
    description: "الوصف",
    status: "الحالة",
    amount: "المبلغ",
    posted: "مرحّل",
    draft: "مسودة",
    cancelled: "ملغي",
    active: "نشط",
    inactive: "غير نشط",
    noDataTitle: "لا توجد بيانات",
    noDataDesc: "ستظهر البيانات هنا عند توفرها من API.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل لوحة الحسابات",
    errorDesc: "تأكد من تسجيل الدخول للشركة ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير لوحة الحسابات العامة",
    generatedAt: "تم الإنشاء في",
    refreshed: "تم تحديث لوحة الحسابات.",
    partialWarningTitle: "تم تحميل الصفحة جزئيًا",
    partialWarningDesc: "بعض واجهات الحسابات لم تعد بيانات صالحة، لذلك تظهر البيانات المتاحة فقط.",
  },
  en: {
    title: "General Accounting",
    subtitle:
      "A financial dashboard for company accounts, journal entries, balances, and accounting reports in one place.",
    moduleBadge: "Company module",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    search: "Search",
    all: "All",
    from: "From",
    to: "To",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    amountHigh: "Highest amount",
    amountLow: "Lowest amount",
    numberSort: "Entry number",
    open: "Open",
    showing: "Showing",
    of: "of",
    rows: "rows",
    sar: "SAR",
    unknown: "Unknown",
    readOnlyTitle: "Read-only overview",
    readOnlyDesc:
      "Operational actions like creating accounts or posting journal entries are handled in the dedicated pages.",
    totalAssets: "Total assets",
    liabilities: "Liabilities",
    equity: "Equity",
    revenue: "Revenue",
    expenses: "Expenses",
    netIncome: "Net income / loss",
    cashFlow: "Net cash flow",
    accounts: "Accounts",
    activeAccounts: "Active",
    journalEntries: "Journal entries",
    postedEntries: "Posted",
    draftEntries: "Draft",
    trialBalance: "Trial balance",
    debit: "Debit",
    credit: "Credit",
    balanced: "Balanced",
    notBalanced: "Not balanced",
    unavailable: "Unavailable",
    shortcutsTitle: "Module shortcuts",
    shortcutsDesc: "Quick access to operational accounting pages and reports.",
    summaryTitle: "Accounting summary",
    summaryDesc: "A compact financial reading from accounting and reporting APIs.",
    latestEntries: "Latest journal entries",
    latestEntriesDesc: "Newest company accounting journal entries.",
    entrySearchPlaceholder: "Search by entry number, description, or status...",
    entryNo: "Entry No.",
    date: "Date",
    description: "Description",
    status: "Status",
    amount: "Amount",
    posted: "Posted",
    draft: "Draft",
    cancelled: "Cancelled",
    active: "Active",
    inactive: "Inactive",
    noDataTitle: "No data",
    noDataDesc: "Data will appear here when returned by the API.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    errorTitle: "Could not load accounting dashboard",
    errorDesc: "Make sure you are signed in to the company and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    printTitle: "General Accounting Dashboard Report",
    generatedAt: "Generated at",
    refreshed: "Accounting dashboard refreshed.",
    partialWarningTitle: "Page loaded partially",
    partialWarningDesc: "Some accounting APIs did not return valid data, so only available data is shown.",
  },
} as const;
const statusFilters: StatusFilter[] = ["all", "posted", "draft", "cancelled", "balanced", "unbalanced"];
const emptyStats: DashboardStats = {
  assets: 0,
  liabilities: 0,
  equity: 0,
  revenue: 0,
  expenses: 0,
  netIncome: 0,
  cashFlow: 0,
  accounts: 0,
  activeAccounts: 0,
  journalEntries: 0,
  postedEntries: 0,
  draftEntries: 0,
  trialDebit: 0,
  trialCredit: 0,
  isBalanced: null,
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
  return String(value).trim() || fallback;
}
function normalizeKey(key: string) {
  return key.replace(/[\s_-]/g, "").toLowerCase();
}
function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "active", "posted", "balanced"].includes(normalized)) return true;
    if (["false", "0", "no", "inactive", "draft", "unbalanced"].includes(normalized)) return false;
  }
  return null;
}
function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(toNumber(value)),
  );
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
function parseIsoDate(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}
function dateToIso(value?: Date) {
  if (!value) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function formatReportDateTime(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
function DatePickerField({
  value,
  onChange,
  placeholder,
  locale,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  locale: Locale;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-9 w-full justify-start rounded-lg bg-background px-3 text-start font-normal shadow-none sm:w-[150px]",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarDays className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <span dir="ltr" lang="en" className="truncate tabular-nums">
            {value || placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={locale === "ar" ? "end" : "start"}>
        <Calendar
          mode="single"
          selected={parseIsoDate(value)}
          onSelect={(date) => {
            if (date) {
              onChange(dateToIso(date));
              setOpen(false);
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
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
      ? (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/+$/, "")
      : "";

  if (!envBase) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  return envBase.endsWith("/api") ? envBase.slice(0, -4) : envBase;
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
  let payload: unknown = null;
  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    const record = asRecord(payload);
    const message =
      normalizeText(record.message) ||
      normalizeText(record.detail) ||
      normalizeText(record.error) ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return (payload || {}) as T;
}
async function fetchFirstAvailable(paths: string[], params: URLSearchParams, signal?: AbortSignal) {
  const errors: string[] = [];
  for (const path of paths) {
    try {
      return await fetchJson<ApiResponse>(makeApiUrl(path, params), signal);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(errors[0] || "No API endpoint returned valid data");
}
function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  const data = record.data;
  const meta = record.meta;
  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(record.rows)) return record.rows;
  if (Array.isArray(record.accounts)) return record.accounts;
  if (Array.isArray(record.entries)) return record.entries;
  if (Array.isArray(data)) return data;
  const dataRecord = asRecord(data);
  if (Array.isArray(dataRecord.results)) return dataRecord.results;
  if (Array.isArray(dataRecord.items)) return dataRecord.items;
  if (Array.isArray(dataRecord.records)) return dataRecord.records;
  if (Array.isArray(dataRecord.rows)) return dataRecord.rows;
  if (Array.isArray(dataRecord.accounts)) return dataRecord.accounts;
  if (Array.isArray(dataRecord.entries)) return dataRecord.entries;
  const metaRecord = asRecord(meta);
  if (Array.isArray(metaRecord.results)) return metaRecord.results;
  return [];
}
function extractSummary(payload: unknown): ApiRecord {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const metaRecord = asRecord(record.meta);
  return {
    ...asRecord(record.summary),
    ...asRecord(dataRecord.summary),
    ...asRecord(metaRecord.summary),
    ...record,
    ...dataRecord,
  };
}
function extractCount(payload: unknown) {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  const metaRecord = asRecord(record.meta);
  return toNumber(
    record.count ??
      record.total ??
      record.total_count ??
      dataRecord.count ??
      dataRecord.total ??
      dataRecord.total_count ??
      metaRecord.count ??
      metaRecord.total ??
      metaRecord.total_count,
    extractArray(payload).length,
  );
}
function findValue(value: unknown, keys: string[], depth = 0): unknown {
  if (depth > 5) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findValue(item, keys, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (!isRecord(value)) return undefined;
  const wanted = keys.map(normalizeKey);
  for (const [key, itemValue] of Object.entries(value)) {
    if (wanted.includes(normalizeKey(key))) return itemValue;
  }
  for (const itemValue of Object.values(value)) {
    const found = findValue(itemValue, keys, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}
function firstNumber(payload: unknown, keys: string[], fallback = 0) {
  return toNumber(findValue(payload, keys), fallback);
}
function firstBoolean(payload: unknown, keys: string[]) {
  return toBoolean(findValue(payload, keys));
}
function firstText(payload: unknown, keys: string[], fallback = "") {
  return normalizeText(findValue(payload, keys), fallback);
}
function sumRows(rows: ApiRecord[], keys: string[]) {
  return rows.reduce((sum, row) => sum + firstNumber(row, keys), 0);
}
function rowDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}
function getStatusLabel(value: string, locale: Locale) {
  const normalized = value.toLowerCase();

  if (normalized.includes("revers")) {
    return locale === "ar" ? "معكوس" : "Reversed";
  }
  if (normalized.includes("post") || value.includes("مرح")) {
    return locale === "ar" ? "مرحّل" : "Posted";
  }
  if (normalized.includes("draft") || value.includes("مسودة")) {
    return locale === "ar" ? "مسودة" : "Draft";
  }
  if (normalized.includes("cancel") || value.includes("ملغ")) {
    return locale === "ar" ? "ملغي" : "Cancelled";
  }
  if (normalized.includes("active") || value.includes("نشط")) {
    return locale === "ar" ? "نشط" : "Active";
  }

  return value || "—";
}
function getBadgeClass(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("post") || normalized.includes("active") || normalized.includes("balanced")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized.includes("draft")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (
    normalized.includes("cancel") ||
    normalized.includes("unbalanced") ||
    normalized.includes("revers")
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-border bg-background text-muted-foreground";
}
function normalizeJournal(value: unknown, index: number): JournalRecord {
  const record = asRecord(value);
  const status = firstText(record, ["status", "state"], "");
  const debitTotal = firstNumber(record, ["total_debit", "debit_total", "debit"]);
  const creditTotal = firstNumber(record, ["total_credit", "credit_total", "credit"]);
  const amount =
    firstNumber(record, ["amount", "total_amount", "value"], 0) ||
    Math.max(debitTotal, creditTotal);
  const explicitBalanced = firstBoolean(record, ["is_balanced", "balanced"]);
  const calculatedBalanced =
    debitTotal || creditTotal ? Math.abs(debitTotal - creditTotal) < 0.01 : null;
  return {
    id: firstText(record, ["id", "uuid", "pk"], String(index + 1)),
    number: firstText(record, ["entry_number", "number", "reference", "ref"], "—"),
    date: firstText(record, ["date", "entry_date", "posting_date", "created_at"], "") || null,
    description: firstText(record, ["description", "memo", "notes", "narration"], "—"),
    status: status || "—",
    amount,
    isBalanced: explicitBalanced ?? calculatedBalanced,
  };
}
function buildStats(payloads: {
  trialBalance: unknown;
  profitLoss: unknown;
  balanceSheet: unknown;
  cashFlow: unknown;
  accounts: unknown;
  journalEntries: unknown;
}): DashboardStats {
  const trialRows = extractArray(payloads.trialBalance).filter(isRecord);
  const accountRows = extractArray(payloads.accounts).filter(isRecord);
  const journalRows = extractArray(payloads.journalEntries).filter(isRecord);
  const trialDebit =
    firstNumber(payloads.trialBalance, ["total_debit", "debit_total", "total_debits"]) ||
    sumRows(trialRows, ["debit", "debit_balance", "debit_amount", "total_debit"]);
  const trialCredit =
    firstNumber(payloads.trialBalance, ["total_credit", "credit_total", "total_credits"]) ||
    sumRows(trialRows, ["credit", "credit_balance", "credit_amount", "total_credit"]);
  const revenue =
    firstNumber(payloads.profitLoss, ["total_revenue", "revenue", "revenues", "income_total"]) ||
    sumRows(extractArray(findValue(payloads.profitLoss, ["revenues", "revenue_rows", "income"])).filter(isRecord), [
      "amount",
      "balance",
      "total",
    ]);
  const expenses =
    firstNumber(payloads.profitLoss, ["total_expenses", "expenses", "expense_total"]) ||
    sumRows(extractArray(findValue(payloads.profitLoss, ["expenses", "expense_rows"])).filter(isRecord), [
      "amount",
      "balance",
      "total",
    ]);
  const assets =
    firstNumber(payloads.balanceSheet, ["total_assets", "assets_total", "assets"]) ||
    sumRows(extractArray(findValue(payloads.balanceSheet, ["assets", "asset_rows"])).filter(isRecord), [
      "amount",
      "balance",
      "total",
    ]);
  const liabilities =
    firstNumber(payloads.balanceSheet, ["total_liabilities", "liabilities_total", "liabilities"]) ||
    sumRows(extractArray(findValue(payloads.balanceSheet, ["liabilities", "liability_rows"])).filter(isRecord), [
      "amount",
      "balance",
      "total",
    ]);
  const equity =
    firstNumber(payloads.balanceSheet, ["total_equity", "equity_total", "equity"]) ||
    sumRows(extractArray(findValue(payloads.balanceSheet, ["equity", "equity_rows"])).filter(isRecord), [
      "amount",
      "balance",
      "total",
    ]);
  const cashFlow =
    firstNumber(payloads.cashFlow, ["net_cash_flow", "cash_flow", "net_change", "closing_cash_change"]) ||
    firstNumber(payloads.cashFlow, ["ending_cash", "closing_cash"]);
  const activeAccounts = accountRows.filter((row) => firstBoolean(row, ["is_active", "active", "enabled"]) !== false);
  const postedEntries = journalRows.filter((row) => firstText(row, ["status", "state"]).toLowerCase().includes("post"));
  const draftEntries = journalRows.filter((row) => firstText(row, ["status", "state"]).toLowerCase().includes("draft"));
  const explicitBalanced = firstBoolean(payloads.trialBalance, ["is_balanced", "balanced"]);
  return {
    assets,
    liabilities,
    equity,
    revenue,
    expenses,
    netIncome:
      firstNumber(payloads.profitLoss, ["net_income", "net_profit", "profit", "net_result"], revenue - expenses),
    cashFlow,
    accounts: extractCount(payloads.accounts) || accountRows.length || trialRows.length,
    activeAccounts: activeAccounts.length,
    journalEntries: extractCount(payloads.journalEntries) || journalRows.length,
    postedEntries: postedEntries.length,
    draftEntries: draftEntries.length,
    trialDebit,
    trialCredit,
    isBalanced: explicitBalanced ?? (trialDebit + trialCredit > 0 ? Math.abs(trialDebit - trialCredit) < 0.01 : null),
  };
}
function filterRows(rows: JournalRecord[], search: string, status: StatusFilter, dateFrom: string, dateTo: string) {
  const query = search.trim().toLowerCase();
  const fromTime = dateFrom ? new Date(dateFrom).getTime() : null;
  const toTime = dateTo ? new Date(dateTo).getTime() : null;
  return rows.filter((row) => {
    const statusText = row.status.toLowerCase();
    const dateTime = rowDateValue(row.date);
    const matchesSearch =
      !query ||
      [row.number, row.description, row.status, row.date || ""].some((value) =>
        value.toLowerCase().includes(query),
      );
    const matchesStatus =
      status === "all" ||
      (status === "posted" && statusText.includes("post")) ||
      (status === "draft" && statusText.includes("draft")) ||
      (status === "cancelled" && statusText.includes("cancel")) ||
      (status === "balanced" && row.isBalanced === true) ||
      (status === "unbalanced" && row.isBalanced === false);
    const matchesFrom = !fromTime || (dateTime && dateTime >= fromTime);
    const matchesTo = !toTime || (dateTime && dateTime <= toTime);
    return matchesSearch && matchesStatus && matchesFrom && matchesTo;
  });
}
function sortRows(rows: JournalRecord[], sort: SortKey) {
  return [...rows].sort((a, b) => {
    if (sort === "oldest") return rowDateValue(a.date) - rowDateValue(b.date);
    if (sort === "amount_high") return b.amount - a.amount;
    if (sort === "amount_low") return a.amount - b.amount;
    if (sort === "number") return a.number.localeCompare(b.number);
    return rowDateValue(b.date) - rowDateValue(a.date);
  });
}
function MoneyValue({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold">
      <span dir="ltr" lang="en" className="tabular-nums">
        {formatMoney(value)}
      </span>
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
function StatusBadge({ value, label }: { value: string; label: string }) {
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", getBadgeClass(value))}>
      {label}
    </Badge>
  );
}
function KpiCard({
  title,
  value,
  description,
  href,
  icon: Icon,
  money,
  t,
}: {
  title: string;
  value: number;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  money?: boolean;
  t: (typeof translations)[Locale];
}) {
  return (
    <Card className="group overflow-hidden rounded-lg border bg-card shadow-none transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm">
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
          <div className="min-w-0">
            <CardDescription className="truncate text-sm">{title}</CardDescription>
            <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
              {money ? <MoneyValue value={value} label={t.sar} /> : formatInteger(value)}
            </CardTitle>
          </div>
          <span className="rounded-lg border bg-background p-2.5 text-muted-foreground transition group-hover:border-foreground/20 group-hover:text-foreground">
            <Icon className="h-5 w-5" />
          </span>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Link>
    </Card>
  );
}
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-8 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="rounded-lg">
            <CardHeader>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-lg">
        <CardHeader>
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
function EmptyTableState({
  title,
  description,
  showReset,
  onReset,
  resetLabel,
}: {
  title: string;
  description: string;
  showReset?: boolean;
  onReset?: () => void;
  resetLabel: string;
}) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {showReset && onReset ? (
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          {resetLabel}
        </Button>
      ) : null}
    </div>
  );
}
function FiltersBar({
  search,
  onSearchChange,
  searchPlaceholder,
  status,
  onStatusChange,
  sort,
  onSortChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onReset,
  locale,
  t,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  onReset: () => void;
  locale: Locale;
  t: (typeof translations)[Locale];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} className="h-9 rounded-lg bg-background ps-9" />
        </div>
        <Select value={status} onValueChange={(value) => onStatusChange(value as StatusFilter)}>
          <SelectTrigger className="h-9 rounded-lg bg-background sm:w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {statusFilters.map((item) => (
              <SelectItem key={item} value={item}>
                {item === "all" ? t.all : item === "posted" ? t.posted : item === "draft" ? t.draft : item === "cancelled" ? t.cancelled : item === "balanced" ? t.balanced : t.notBalanced}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DatePickerField value={dateFrom} onChange={onDateFromChange} placeholder={locale === "ar" ? "من تاريخ" : "From date"} locale={locale} />
        <DatePickerField value={dateTo} onChange={onDateToChange} placeholder={locale === "ar" ? "إلى تاريخ" : "To date"} locale={locale} />
        <Select value={sort} onValueChange={(value) => onSortChange(value as SortKey)}>
          <SelectTrigger className="h-9 rounded-lg bg-background sm:w-[160px]"><ArrowUpDown className="h-4 w-4" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t.newest}</SelectItem>
            <SelectItem value="oldest">{t.oldest}</SelectItem>
            <SelectItem value="amount_high">{t.amountHigh}</SelectItem>
            <SelectItem value="amount_low">{t.amountLow}</SelectItem>
            <SelectItem value="number">{t.numberSort}</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />{t.reset}
        </Button>
      </div>
    </div>
  );
}
function DataTable<T extends { id: string }>({
  rows,
  allRowsCount,
  columns,
  rowKey,
  emptyTitle,
  emptyDescription,
  noResultsTitle,
  noResultsDescription,
  hasFilters,
  onReset,
  resetLabel,
  showingLabel,
  ofLabel,
  rowsLabel,
  onRowOpen,
}: {
  rows: T[];
  allRowsCount: number;
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  emptyTitle: string;
  emptyDescription: string;
  noResultsTitle: string;
  noResultsDescription: string;
  hasFilters: boolean;
  onReset: () => void;
  resetLabel: string;
  showingLabel: string;
  ofLabel: string;
  rowsLabel: string;
  onRowOpen?: (row: T) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="overflow-x-auto">
          <Table className="min-w-[960px] table-fixed">
            <TableHeader>
              <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      "h-11 whitespace-nowrap px-4 text-start text-xs font-semibold text-muted-foreground",
                      column.className,
                    )}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow
                    key={rowKey(row)}
                    onClick={onRowOpen ? () => onRowOpen(row) : undefined}
                    className={cn(
                      "h-[64px]",
                      onRowOpen && "cursor-pointer hover:bg-muted/35",
                    )}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn("h-[64px] overflow-hidden px-4 text-start align-middle", column.className)}
                      >
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-72">
                    <EmptyTableState
                      title={hasFilters ? noResultsTitle : emptyTitle}
                      description={hasFilters ? noResultsDescription : emptyDescription}
                      showReset={hasFilters}
                      onReset={onReset}
                      resetLabel={resetLabel}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {showingLabel} <span className="font-medium text-foreground tabular-nums">{formatInteger(rows.length)}</span> {ofLabel}{" "}
        <span className="font-medium text-foreground tabular-nums">{formatInteger(allRowsCount)}</span> {rowsLabel}
      </div>
    </div>
  );
}
export default function CompanyAccountingPage() {
  const router = useRouter();
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [stats, setStats] = React.useState<DashboardStats>(emptyStats);
  const [entries, setEntries] = React.useState<JournalRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [entrySearch, setEntrySearch] = React.useState("");
  const [entryStatus, setEntryStatus] = React.useState<StatusFilter>("all");
  const [entrySort, setEntrySort] = React.useState<SortKey>("newest");
  const [entryDateFrom, setEntryDateFrom] = React.useState("");
  const [entryDateTo, setEntryDateTo] = React.useState("");
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
        const reportParams = new URLSearchParams();
        if (entryDateFrom) reportParams.set("date_from", entryDateFrom);
        if (entryDateTo) reportParams.set("date_to", entryDateTo);
        const accountsParams = new URLSearchParams({ page: "1", page_size: "200" });
        const entriesParams = new URLSearchParams({ page: "1", page_size: "12", ordering: "-date" });
        if (entryDateFrom) entriesParams.set("date_from", entryDateFrom);
        if (entryDateTo) entriesParams.set("date_to", entryDateTo);
        const results = await Promise.allSettled([
          fetchFirstAvailable(ACCOUNTING_ENDPOINTS.trialBalance, reportParams, controller.signal),
          fetchFirstAvailable(ACCOUNTING_ENDPOINTS.profitLoss, reportParams, controller.signal),
          fetchFirstAvailable(ACCOUNTING_ENDPOINTS.balanceSheet, reportParams, controller.signal),
          fetchFirstAvailable(ACCOUNTING_ENDPOINTS.cashFlow, reportParams, controller.signal),
          fetchFirstAvailable(ACCOUNTING_ENDPOINTS.accounts, accountsParams, controller.signal),
          fetchFirstAvailable(ACCOUNTING_ENDPOINTS.journalEntries, entriesParams, controller.signal),
        ]);
        const failedMessages = results
          .filter((result): result is PromiseRejectedResult => result.status === "rejected")
          .map((result) => normalizeText(result.reason instanceof Error ? result.reason.message : result.reason));
        const [trialBalance, profitLoss, balanceSheet, cashFlow, accounts, journalEntries] = results.map(
          (result) => (result.status === "fulfilled" ? result.value : {}),
        );
        const journalRows = extractArray(journalEntries).map(normalizeJournal);
        setStats(
          buildStats({
            trialBalance,
            profitLoss,
            balanceSheet,
            cashFlow,
            accounts,
            journalEntries,
          }),
        );
        setEntries(journalRows);
        const hasPartialData = failedMessages.length > 0 && failedMessages.length < results.length;

        if (hasPartialData && !silent) {
          toast.warning(t.partialWarningTitle);
        }
        if (failedMessages.length === results.length) {
          throw new Error(failedMessages[0] || t.errorDesc);
        }

        if (silent) toast.success(t.refreshed);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (!silent) toast.error(t.errorTitle);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
      return () => controller.abort();
    },
    [entryDateFrom, entryDateTo, t],
  );
  React.useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);
  const filteredEntries = React.useMemo(() => {
    return sortRows(filterRows(entries, entrySearch, entryStatus, entryDateFrom, entryDateTo), entrySort);
  }, [entries, entrySearch, entryStatus, entrySort, entryDateFrom, entryDateTo]);
  const hasEntryFilters = Boolean(entrySearch || entryStatus !== "all" || entryDateFrom || entryDateTo || entrySort !== "newest");
  const resetEntryFilters = React.useCallback(() => {
    setEntrySearch("");
    setEntryStatus("all");
    setEntrySort("newest");
    setEntryDateFrom("");
    setEntryDateTo("");
  }, []);
  const balanceLabel =
    stats.isBalanced === null ? t.unavailable : stats.isBalanced ? t.balanced : t.notBalanced;
  const kpiCards = [
    {
      title: t.totalAssets,
      value: stats.assets,
      description: t.trialBalance,
      href: "/company/accounting/balance-sheet",
      icon: Landmark,
      money: true,
    },
    {
      title: t.liabilities,
      value: stats.liabilities,
      description: locale === "ar" ? "التزامات الشركة" : "Company obligations",
      href: "/company/accounting/balance-sheet",
      icon: ArrowDownLeft,
      money: true,
    },
    {
      title: t.equity,
      value: stats.equity,
      description: locale === "ar" ? "رأس المال والأرباح المحتجزة" : "Capital and retained earnings",
      href: "/company/accounting/balance-sheet",
      icon: Layers3,
      money: true,
    },
    {
      title: t.revenue,
      value: stats.revenue,
      description: locale === "ar" ? "إجمالي إيرادات الفترة" : "Period revenue",
      href: "/company/accounting/profit-loss",
      icon: ArrowUpRight,
      money: true,
    },
    {
      title: t.expenses,
      value: stats.expenses,
      description: locale === "ar" ? "إجمالي مصروفات الفترة" : "Period expenses",
      href: "/company/accounting/profit-loss",
      icon: ArrowDownLeft,
      money: true,
    },
    {
      title: t.netIncome,
      value: stats.netIncome,
      description: stats.netIncome >= 0 ? t.balanced : t.notBalanced,
      href: "/company/accounting/profit-loss",
      icon: BadgeDollarSign,
      money: true,
    },
    {
      title: t.cashFlow,
      value: stats.cashFlow,
      description: locale === "ar" ? "صافي حركة النقد" : "Net cash movement",
      href: "/company/accounting/cash-flow",
      icon: WalletCards,
      money: true,
    },
    {
      title: t.accounts,
      value: stats.accounts,
      description: `${t.activeAccounts}: ${formatInteger(stats.activeAccounts)}`,
      href: "/company/accounting/chart-of-accounts",
      icon: BookOpen,
    },
  ];
  const openEntryDetails = React.useCallback(
    (row: JournalRecord) => {
      if (!row.number || row.number === "—") return;

      router.push(
        `/company/accounting/journal-entries/${encodeURIComponent(row.number)}`,
      );
    },
    [router],
  );

  const entryColumns: DataColumn<JournalRecord>[] = [
    {
      key: "number",
      label: t.entryNo,
      className: "sticky start-0 z-10 w-[175px] bg-inherit",
      render: (row) => <span dir="ltr" lang="en" className="block truncate font-semibold text-foreground">{row.number}</span>,
    },
    {
      key: "date",
      label: t.date,
      className: "w-[125px]",
      render: (row) => <span dir="ltr" lang="en" className="text-sm tabular-nums text-muted-foreground">{formatDate(row.date)}</span>,
    },
    {
      key: "description",
      label: t.description,
      render: (row) => <span className="line-clamp-2 text-sm">{row.description}</span>,
    },
    {
      key: "status",
      label: t.status,
      className: "w-[125px]",
      render: (row) => <StatusBadge value={row.status} label={getStatusLabel(row.status, locale)} />,
    },
    {
      key: "amount",
      label: t.amount,
      className: "w-[135px]",
      render: (row) => <MoneyValue value={row.amount} label={t.sar} />,
    },
    {
      key: "actions",
      label: locale === "ar" ? "الإجراءات" : "Actions",
      className: "sticky end-0 z-10 w-[76px] bg-inherit text-center",
      render: (row) => (
        <div className="flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={
                  locale === "ar"
                    ? "إجراءات القيد"
                    : "Entry actions"
                }
                title={
                  locale === "ar"
                    ? "إجراءات القيد"
                    : "Entry actions"
                }
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-44">
              <DropdownMenuItem onClick={() => openEntryDetails(row)}>
                <ExternalLink className="h-4 w-4" />{locale === "ar" ? "فتح التفاصيل" : "Open details"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openPrintReport(locale === "ar" ? `القيد ${row.number}` : `Entry ${row.number}`, [row], false)}>
                <Printer className="h-4 w-4" />{locale === "ar" ? "طباعة القيد" : "Print entry"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  function buildEntriesTableHtml(
    reportRows: JournalRecord[],
    mode: "excel" | "print",
  ) {
    const excelMode = mode === "excel";
    const body = reportRows.length
      ? reportRows
          .map(
            (row) => `<tr>
              <td
                class="report-text"
                lang="en-US"
              >&#8203;${escapeHtml(row.number)}</td>
              <td
                class="report-text"
                lang="en-US"
              >&#8203;${escapeHtml(formatDate(row.date))}</td>
              <td class="description-cell">
                ${escapeHtml(row.description)}
              </td>
              <td class="status-cell">
                ${escapeHtml(
                  getStatusLabel(row.status, locale),
                )}
              </td>
              <td
                class="number"
                lang="en-US"
                ${excelMode ? `x:num="${row.amount}"` : ""}
              >${escapeHtml(formatMoney(row.amount))}</td>
            </tr>`,
          )
          .join("")
      : `<tr>
          <td
            colspan="5"
            class="empty-cell"
          >
            ${escapeHtml(t.noDataTitle)}
          </td>
        </tr>`;
    return `<table class="data">
      <colgroup>
        ${
          excelMode
            ? `
              <col style="width: 180px;" />
              <col style="width: 130px;" />
              <col style="width: 460px;" />
              <col style="width: 130px;" />
              <col style="width: 130px;" />
            `
            : `
              <col style="width: 18%;" />
              <col style="width: 14%;" />
              <col style="width: 40%;" />
              <col style="width: 14%;" />
              <col style="width: 14%;" />
            `
        }
      </colgroup>
      <thead>
        <tr>
          <th>${escapeHtml(t.entryNo)}</th>
          <th>${escapeHtml(t.date)}</th>
          <th>${escapeHtml(t.description)}</th>
          <th>${escapeHtml(t.status)}</th>
          <th>${escapeHtml(t.amount)}</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
  }
  function buildAccountingReport(
    title: string,
    reportRows: JournalRecord[],
    includeSummary: boolean,
    mode: "excel" | "print",
  ) {
    const generatedAt = formatReportDateTime();
    const excelMode = mode === "excel";
    const summary = includeSummary
      ? `<table class="summary">
          <tbody>
            <tr>
              <th>${escapeHtml(t.totalAssets)}</th>
              <td
                class="number"
                ${excelMode ? `x:num="${stats.assets}"` : ""}
              >
                ${escapeHtml(formatMoney(stats.assets))}
              </td>
              <th>${escapeHtml(t.liabilities)}</th>
              <td
                class="number"
                ${excelMode ? `x:num="${stats.liabilities}"` : ""}
              >
                ${escapeHtml(formatMoney(stats.liabilities))}
              </td>
            </tr>
            <tr>
              <th>${escapeHtml(t.equity)}</th>
              <td
                class="number"
                ${excelMode ? `x:num="${stats.equity}"` : ""}
              >
                ${escapeHtml(formatMoney(stats.equity))}
              </td>
              <th>${escapeHtml(t.revenue)}</th>
              <td
                class="number"
                ${excelMode ? `x:num="${stats.revenue}"` : ""}
              >
                ${escapeHtml(formatMoney(stats.revenue))}
              </td>
            </tr>
            <tr>
              <th>${escapeHtml(t.expenses)}</th>
              <td
                class="number"
                ${excelMode ? `x:num="${stats.expenses}"` : ""}
              >
                ${escapeHtml(formatMoney(stats.expenses))}
              </td>
              <th>${escapeHtml(t.netIncome)}</th>
              <td
                class="number"
                ${excelMode ? `x:num="${stats.netIncome}"` : ""}
              >
                ${escapeHtml(formatMoney(stats.netIncome))}
              </td>
            </tr>
            <tr>
              <th>${escapeHtml(t.cashFlow)}</th>
              <td
                class="number"
                ${excelMode ? `x:num="${stats.cashFlow}"` : ""}
              >
                ${escapeHtml(formatMoney(stats.cashFlow))}
              </td>
              <th>${escapeHtml(t.accounts)}</th>
              <td
                class="integer"
                ${excelMode ? `x:num="${stats.accounts}"` : ""}
              >
                ${escapeHtml(formatInteger(stats.accounts))}
              </td>
            </tr>
            <tr>
              <th>${escapeHtml(t.debit)}</th>
              <td
                class="number"
                ${excelMode ? `x:num="${stats.trialDebit}"` : ""}
              >
                ${escapeHtml(formatMoney(stats.trialDebit))}
              </td>
              <th>${escapeHtml(t.credit)}</th>
              <td
                class="number"
                ${excelMode ? `x:num="${stats.trialCredit}"` : ""}
              >
                ${escapeHtml(formatMoney(stats.trialCredit))}
              </td>
            </tr>
          </tbody>
        </table>`
      : "";
    const officeXml = excelMode
      ? `<!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>
                    ${escapeHtml(title.slice(0, 31))}
                  </x:Name>
                  <x:WorksheetOptions>
                    ${
                      locale === "ar"
                        ? "<x:DisplayRightToLeft/>"
                        : ""
                    }
                    <x:FreezePanes/>
                    <x:FrozenNoSplit/>
                    <x:SplitHorizontal>1</x:SplitHorizontal>
                    <x:TopRowBottomPane>1</x:TopRowBottomPane>
                    <x:FitToPage/>
                    <x:Selected/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
        <![endif]-->`
      : "";
    return `<!doctype html>
      <html
        lang="${locale}"
        dir="${dir}"
        xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40"
      >
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(title)}</title>
          ${officeXml}
          <style>
            * {
              box-sizing: border-box;
            }
            html,
            body {
              width: 100%;
              margin: 0;
              background: #ffffff;
            }
            body {
              margin: 0;
              padding: ${excelMode ? "8px" : "0"};
              color: #111827;
              font-family: Tahoma, Arial, sans-serif;
              font-size: 12px;
            }
            .report-sheet {
              width: ${excelMode ? "1030px" : "100%"};
              max-width: none;
              margin: 0 auto;
            }
            .report-header {
              margin-bottom: 12px;
              padding-bottom: 9px;
              border-bottom: 2px solid #111827;
            }
            h1 {
              margin: 0;
              font-size: 24px;
              line-height: 1.25;
            }
            h2 {
              margin: 16px 0 8px;
              font-size: 16px;
              line-height: 1.4;
            }
            .meta {
              margin-top: 7px;
              color: #4b5563;
              font-size: 10px;
            }
            table {
              border-collapse: collapse;
              table-layout: fixed;
            }
            .summary,
            .data {
              width: ${excelMode ? "1030px" : "100%"};
            }
            th,
            td {
              border: 1px solid #000000;
              padding: ${excelMode ? "7px 8px" : "5px 4px"};
              text-align: start;
              vertical-align: middle;
              overflow-wrap: anywhere;
            }
            th {
              background: #e5e7eb;
              color: #111827;
              font-weight: 700;
            }
            .summary {
              margin-bottom: 12px;
            }
            .summary th {
              width: 18%;
              color: #4b5563;
              font-size: 10px;
            }
            .summary td {
              width: 32%;
              font-size: 13px;
              font-weight: 700;
            }
            .report-text,
            .number,
            .integer {
              direction: ltr;
              unicode-bidi: plaintext;
              font-family: Arial, Tahoma, sans-serif;
              font-variant-numeric: tabular-nums;
              white-space: nowrap;
            }
            .report-text {
              mso-number-format: "\\@";
            }
            .number {
              mso-number-format: "0.00";
              text-align: end;
            }
            .integer {
              mso-number-format: "0";
              text-align: end;
            }
            .description-cell {
              white-space: normal;
              overflow-wrap: anywhere;
            }
            .status-cell {
              white-space: nowrap;
            }
            .empty-cell {
              padding: 20px;
              text-align: center;
              color: #6b7280;
            }
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
            @media print {
              html,
              body,
              .report-sheet,
              .summary,
              .data {
                width: 100% !important;
                max-width: none !important;
              }
              body {
                padding: 0 !important;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              thead {
                display: table-header-group;
              }
              tr {
                break-inside: avoid;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <main class="report-sheet">
            <header class="report-header">
              <h1>${escapeHtml(title)}</h1>
              <div class="meta">
                ${escapeHtml(t.generatedAt)}:
                <span
                  class="report-text"
                  lang="en-US"
                >
                  &#8203;${escapeHtml(generatedAt)}
                </span>
              </div>
            </header>
            ${summary}
            ${
              includeSummary
                ? `<h2>${escapeHtml(t.latestEntries)}</h2>`
                : ""
            }
            ${buildEntriesTableHtml(reportRows, mode)}
          </main>
        </body>
      </html>`;
  }
  function downloadExcelReport(
    filename: string,
    title: string,
    reportRows: JournalRecord[],
    includeSummary: boolean,
  ) {
    const reportHtml = buildAccountingReport(
      title,
      reportRows,
      includeSummary,
      "excel",
    );
    const blob = new Blob(
      ["\uFEFF", reportHtml],
      {
        type: "application/vnd.ms-excel;charset=utf-8;",
      },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success(t.export);
  }
  function openPrintReport(
    title: string,
    reportRows: JournalRecord[],
    includeSummary: boolean,
  ) {
    const printWindow = window.open(
      "",
      "_blank",
      "width=1400,height=900",
    );
    if (!printWindow) {
      toast.error(
        locale === "ar"
          ? "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة."
          : "Could not open the print window. Allow pop-ups and try again.",
      );
      return;
    }
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(
      buildAccountingReport(
        title,
        reportRows,
        includeSummary,
        "print",
      ),
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.onafterprint = () => {
      printWindow.close();
    };
    window.setTimeout(() => {
      printWindow.print();
    }, 250);
  }
  function exportExcel() {
    if (!entries.length && !stats.accounts) {
      toast.warning(t.exportEmpty);
      return;
    }

    downloadExcelReport(
      "company-accounting-dashboard.xls",
      t.printTitle,
      filteredEntries,
      true,
    );
  }

  function buildEntriesExcelDocument(
    title: string,
    reportRows: JournalRecord[],
  ) {
    const generatedAt = formatReportDateTime();
    const dir = locale === "ar" ? "rtl" : "ltr";
    const sheetName = title.slice(0, 31);
    const rowsHtml = reportRows
      .map(
        (row) => `<tr>
          <td
            class="text-cell"
            lang="en-US"
          >
            &#8203;${escapeHtml(row.number)}
          </td>
          <td
            class="text-cell"
            lang="en-US"
          >
            &#8203;${escapeHtml(formatDate(row.date))}
          </td>
          <td class="description-cell">
            ${escapeHtml(row.description || "—")}
          </td>
          <td class="status-cell">
            ${escapeHtml(
              getStatusLabel(
                row.status,
                locale,
              ),
            )}
          </td>
          <td
            class="number-cell"
            lang="en-US"
            x:num="${row.amount}"
          >
            ${escapeHtml(formatMoney(row.amount))}
          </td>
        </tr>`,
      )
      .join("");
    const officeXml = `<!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>
                ${escapeHtml(sheetName)}
              </x:Name>
              <x:WorksheetOptions>
                ${
                  locale === "ar"
                    ? "<x:DisplayRightToLeft/>"
                    : ""
                }
                <x:FreezePanes/>
                <x:FrozenNoSplit/>
                <x:SplitHorizontal>3</x:SplitHorizontal>
                <x:TopRowBottomPane>3</x:TopRowBottomPane>
                <x:FitToPage/>
                <x:Selected/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
    <![endif]-->`;
    return `<!doctype html>
      <html
        lang="${locale}"
        dir="${dir}"
        xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40"
      >
        <head>
          <meta charset="utf-8" />
          <title>
            ${escapeHtml(title)}
          </title>
          ${officeXml}
          <style>
            * {
              box-sizing: border-box;
            }
            html,
            body {
              margin: 0;
              background: #ffffff;
            }
            body {
              padding: 8px;
              color: #111827;
              font-family: Tahoma, Arial, sans-serif;
              font-size: 12px;
            }
            table {
              width: 1030px;
              border-collapse: collapse;
              table-layout: fixed;
            }
            th,
            td {
              border: 1px solid #000000;
              padding: 7px 8px;
              text-align: start;
              vertical-align: middle;
            }
            .title-cell {
              height: 38px;
              border: 0;
              padding: 0 0 8px;
              font-size: 24px;
              font-weight: 700;
            }
            .meta-cell {
              height: 28px;
              border: 0;
              padding: 0 0 12px;
              color: #4b5563;
              font-size: 10px;
            }
            .header-cell {
              background: #e5e7eb;
              color: #111827;
              font-weight: 700;
              white-space: nowrap;
            }
            .entry-number {
              width: 180px;
            }
            .entry-date {
              width: 130px;
            }
            .entry-description {
              width: 460px;
            }
            .entry-status {
              width: 130px;
            }
            .entry-amount {
              width: 130px;
            }
            .text-cell,
            .number-cell {
              direction: ltr;
              unicode-bidi: plaintext;
              font-family: Arial, Tahoma, sans-serif;
              font-variant-numeric: tabular-nums;
              white-space: nowrap;
            }
            .text-cell {
              mso-number-format: "\\@";
            }
            .number-cell {
              mso-number-format: "0.00";
              text-align: end;
            }
            .description-cell {
              white-space: normal;
              overflow-wrap: anywhere;
            }
            .status-cell {
              white-space: nowrap;
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th
                  class="title-cell"
                  colspan="5"
                >
                  ${escapeHtml(title)}
                </th>
              </tr>
              <tr>
                <td
                  class="meta-cell"
                  colspan="5"
                >
                  ${escapeHtml(t.generatedAt)}:
                  <span
                    class="text-cell"
                    lang="en-US"
                  >
                    &#8203;${escapeHtml(generatedAt)}
                  </span>
                </td>
              </tr>
              <tr>
                <th class="header-cell entry-number">
                  ${escapeHtml(t.entryNo)}
                </th>
                <th class="header-cell entry-date">
                  ${escapeHtml(t.date)}
                </th>
                <th class="header-cell entry-description">
                  ${escapeHtml(t.description)}
                </th>
                <th class="header-cell entry-status">
                  ${escapeHtml(t.status)}
                </th>
                <th class="header-cell entry-amount">
                  ${escapeHtml(t.amount)}
                </th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>`;
  }
  function exportEntriesExcel() {
    if (!filteredEntries.length) {
      toast.warning(t.exportEmpty);
      return;
    }
    const reportHtml =
      buildEntriesExcelDocument(
        t.latestEntries,
        filteredEntries,
      );
    const blob = new Blob(
      [
        "\uFEFF",
        reportHtml,
      ],
      {
        type:
          "application/vnd.ms-excel;charset=utf-8;",
      },
    );
    const url =
      URL.createObjectURL(blob);
    const anchor =
      document.createElement("a");
    anchor.href = url;
    anchor.download =
      "company-journal-entries.xls";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(
      () => URL.revokeObjectURL(url),
      0,
    );
    toast.success(t.export);
  }
  function printPage() {
    if (!entries.length && !stats.accounts) {
      toast.warning(t.printEmpty);
      return;
    }

    openPrintReport(t.printTitle, filteredEntries, true);
  }

  function printEntries() {
    if (!filteredEntries.length) {
      toast.warning(t.printEmpty);
      return;
    }

    openPrintReport(t.latestEntries, filteredEntries, false);
  }

  if (loading) {
    return (
      <main dir={dir} className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px]">
          <DashboardSkeleton />
        </div>
      </main>
    );
  }
  if (error) {
    return (
      <main dir={dir} className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-[900px] rounded-lg border-destructive/30 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="h-5 w-5" />
              {t.errorTitle}
            </CardTitle>
            <CardDescription>{error || t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => void loadDashboard()} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  return (
    <main dir={dir} className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1 text-start">
            <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">{t.title}</h1>
            <p className="max-w-4xl text-sm leading-6 text-muted-foreground">{t.subtitle}</p>
            <nav aria-label={t.title} className="flex flex-wrap items-center gap-5 pt-2">
              <Link href="/company/accounting" aria-current="page" className="border-b-2 border-foreground pb-1 text-sm font-semibold text-foreground">
                {locale === "ar" ? "لوحة الحسابات" : "Accounting dashboard"}
              </Link>
              <Link href="/company/accounting/chart-of-accounts" className="border-b-2 border-transparent pb-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
                {locale === "ar" ? "دليل الحسابات" : "Chart of accounts"}
              </Link>
              <Link href="/company/accounting/journal-entries" className="border-b-2 border-transparent pb-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
                {locale === "ar" ? "القيود اليومية" : "Journal entries"}
              </Link>
              <Link href="/company/accounting/cost-centers" className="border-b-2 border-transparent pb-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
                {locale === "ar" ? "مراكز التكلفة" : "Cost centers"}
              </Link>
            </nav>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void loadDashboard({ silent: true })} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />{t.refresh}
            </Button>
            <Button type="button" variant="outline" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4" />{t.export}</Button>
            <Button type="button" variant="outline" onClick={printPage}><Printer className="h-4 w-4" />{t.print}</Button>
          </div>
        </header>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <KpiCard
              key={card.title}
              title={card.title}
              value={card.value}
              description={card.description}
              href={card.href}
              icon={card.icon}
              money={card.money}
              t={t}
            />
          ))}
        </div>
        <div className="space-y-6">
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader>
              <CardTitle>{t.shortcutsTitle}</CardTitle>
              <CardDescription>{t.shortcutsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {shortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-lg border bg-background p-4 transition hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="rounded-lg border bg-background p-2.5 text-muted-foreground transition group-hover:border-foreground/20 group-hover:text-foreground">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                              {locale === "ar" ? item.titleAr : item.titleEn}
                            </h3>
                            <Badge variant="outline" className="rounded-full bg-background text-[11px]">
                              {locale === "ar" ? item.badgeAr : item.badgeEn}
                            </Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {locale === "ar" ? item.descAr : item.descEn}
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader>
              <CardTitle>{t.summaryTitle}</CardTitle>
              <CardDescription>
                {t.summaryDesc} — {t.trialBalance}: {balanceLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{t.debit}</p>
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums">
                    <MoneyValue value={stats.trialDebit} label={t.sar} />
                  </p>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{t.credit}</p>
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums">
                    <MoneyValue value={stats.trialCredit} label={t.sar} />
                  </p>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{t.journalEntries}</p>
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums">{formatInteger(stats.journalEntries)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.postedEntries}: {formatInteger(stats.postedEntries)} · {t.draftEntries}: {formatInteger(stats.draftEntries)}
                  </p>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{t.trialBalance}</p>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums">{balanceLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.accounts}: {formatInteger(stats.accounts)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 pt-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 text-start">
                <CardTitle>{t.latestEntries}</CardTitle>
                <CardDescription className="mt-1">
                  {t.latestEntriesDesc}
                </CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={exportEntriesExcel}
                >
                  <FileSpreadsheet />
                  {t.export}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={printEntries}
                >
                  <Printer />
                  {t.print}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 sm:px-6">
            <FiltersBar
              search={entrySearch}
              onSearchChange={setEntrySearch}
              searchPlaceholder={t.entrySearchPlaceholder}
              status={entryStatus}
              onStatusChange={setEntryStatus}
              sort={entrySort}
              onSortChange={setEntrySort}
              dateFrom={entryDateFrom}
              onDateFromChange={setEntryDateFrom}
              dateTo={entryDateTo}
              onDateToChange={setEntryDateTo}
              onReset={resetEntryFilters}
              locale={locale}
              t={t}
            />
            <DataTable
              rows={filteredEntries}
              allRowsCount={entries.length}
              columns={entryColumns}
              rowKey={(row) => row.id || row.number}
              emptyTitle={t.noDataTitle}
              emptyDescription={t.noDataDesc}
              noResultsTitle={t.noResultsTitle}
              noResultsDescription={t.noResultsDesc}
              hasFilters={hasEntryFilters}
              onReset={resetEntryFilters}
              resetLabel={t.reset}
              showingLabel={t.showing}
              ofLabel={t.of}
              rowsLabel={t.rows}
              onRowOpen={openEntryDetails}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}