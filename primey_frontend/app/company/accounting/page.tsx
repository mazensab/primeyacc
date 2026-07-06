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
import {
  Activity,
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  BadgeDollarSign,
  Banknote,
  BarChart3,
  BookOpen,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  FileSpreadsheet,
  Landmark,
  Layers3,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  TriangleAlert,
  WalletCards,
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
    "/api/company/reports/profit-loss/",
  ],
  balanceSheet: [
    "/api/company/reports/balance-sheet/",
  ],
  cashFlow: [
    "/api/company/reports/cash-flow/",
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
    href: "/company/accounting/chart",
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
    titleAr: "الأرباح والخسائر",
    titleEn: "Profit & Loss",
    descAr: "تحليل الإيرادات والمصروفات وصافي الربح.",
    descEn: "Analyze revenue, expenses, and net income.",
    badgeAr: "تقرير",
    badgeEn: "Report",
    icon: CircleDollarSign,
  },
  {
    href: "/company/accounting/balance-sheet",
    titleAr: "الميزانية العمومية",
    titleEn: "Balance Sheet",
    descAr: "عرض الأصول والخصوم وحقوق الملكية.",
    descEn: "View assets, liabilities, and equity.",
    badgeAr: "تقرير",
    badgeEn: "Report",
    icon: Landmark,
  },
  {
    href: "/company/accounting/cash-flow",
    titleAr: "التدفقات النقدية",
    titleEn: "Cash Flow",
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
  const fallbackBase = "http://127.0.0.1:8000";
  const envBase =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(
          /\/+$/,
          "",
        )
      : "";

  if (!envBase) return fallbackBase;
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
  if (normalized.includes("post") || value.includes("مرح")) return locale === "ar" ? "مرحّل" : "Posted";
  if (normalized.includes("draft") || value.includes("مسودة")) return locale === "ar" ? "مسودة" : "Draft";
  if (normalized.includes("cancel") || value.includes("ملغ")) return locale === "ar" ? "ملغي" : "Cancelled";
  if (normalized.includes("active") || value.includes("نشط")) return locale === "ar" ? "نشط" : "Active";
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
  if (normalized.includes("cancel") || normalized.includes("unbalanced")) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-border bg-muted/30 text-muted-foreground";
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
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold tabular-nums">
      <Image src="/currency/sar.svg" alt={label} width={14} height={14} className="h-3.5 w-3.5" />
      <span>{formatMoney(value)}</span>
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
    <Card className="group overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
          <div className="min-w-0">
            <CardDescription className="truncate text-sm">{title}</CardDescription>
            <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
              {money ? <MoneyValue value={value} label={t.sar} /> : formatInteger(value)}
            </CardTitle>
          </div>
          <span className="rounded-2xl bg-primary/10 p-2.5 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
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
      <div className="rounded-3xl border bg-card p-6 shadow-sm">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-8 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="rounded-2xl">
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
      <Card className="rounded-2xl">
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
        <Button variant="outline" size="sm" onClick={onReset} className="rounded-lg">
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
  t: (typeof translations)[Locale];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 rounded-xl bg-background ps-9"
          />
        </div>
        <Select value={status} onValueChange={(value) => onStatusChange(value as StatusFilter)}>
          <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusFilters.map((item) => (
              <SelectItem key={item} value={item}>
                {item === "all"
                  ? t.all
                  : item === "posted"
                    ? t.posted
                    : item === "draft"
                      ? t.draft
                      : item === "cancelled"
                        ? t.cancelled
                        : item === "balanced"
                          ? t.balanced
                          : t.notBalanced}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-10 items-center gap-2 rounded-xl border bg-background px-3">
          <span className="text-xs text-muted-foreground">{t.from}</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
            className="h-8 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex h-10 items-center gap-2 rounded-xl border bg-background px-3">
          <span className="text-xs text-muted-foreground">{t.to}</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
            className="h-8 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
          />
        </div>
        <Select value={sort} onValueChange={(value) => onSortChange(value as SortKey)}>
          <SelectTrigger className="h-10 rounded-xl bg-background sm:w-[160px]">
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
        <Button variant="outline" className="h-10 rounded-xl bg-background" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          {t.reset}
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
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border bg-background">
        <div className="overflow-x-auto">
          <Table className="min-w-[960px] table-fixed">
            <TableHeader>
              <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      "h-11 whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground",
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
                  <TableRow key={rowKey(row)} className="h-[62px]">
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn("h-[62px] overflow-hidden px-4 text-right align-middle", column.className)}
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
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [stats, setStats] = React.useState<DashboardStats>(emptyStats);
  const [entries, setEntries] = React.useState<JournalRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [warnings, setWarnings] = React.useState<string[]>([]);
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
        setWarnings([]);
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
        setWarnings(hasPartialData ? failedMessages.filter(Boolean) : []);

        if (hasPartialData && !silent) {
          toast.warning(t.partialWarningTitle);
        }
        if (failedMessages.length === results.length) {
          setStats(emptyStats);
          setEntries([]);
          setWarnings([]);
          return;
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
      href: "/company/accounting/chart",
      icon: BookOpen,
    },
  ];
  const entryColumns: DataColumn<JournalRecord>[] = [
    {
      key: "number",
      label: t.entryNo,
      className: "w-[170px]",
      render: (row) => <span className="font-semibold text-foreground">{row.number}</span>,
    },
    {
      key: "date",
      label: t.date,
      className: "w-[140px]",
      render: (row) => <span className="text-sm text-muted-foreground tabular-nums">{formatDate(row.date)}</span>,
    },
    {
      key: "description",
      label: t.description,
      render: (row) => <span className="line-clamp-2 text-sm">{row.description}</span>,
    },
    {
      key: "status",
      label: t.status,
      className: "w-[140px]",
      render: (row) => <StatusBadge value={row.status} label={getStatusLabel(row.status, locale)} />,
    },
    {
      key: "amount",
      label: t.amount,
      className: "w-[150px]",
      render: (row) => <MoneyValue value={row.amount} label={t.sar} />,
    },
  ];
  function exportExcel() {
    if (!entries.length && !stats.accounts) {
      toast.warning(t.exportEmpty);
      return;
    }
    const rows = [
      [t.title],
      [t.generatedAt, new Date().toLocaleString()],
      [],
      [t.totalAssets, formatMoney(stats.assets)],
      [t.liabilities, formatMoney(stats.liabilities)],
      [t.equity, formatMoney(stats.equity)],
      [t.revenue, formatMoney(stats.revenue)],
      [t.expenses, formatMoney(stats.expenses)],
      [t.netIncome, formatMoney(stats.netIncome)],
      [t.cashFlow, formatMoney(stats.cashFlow)],
      [t.accounts, formatInteger(stats.accounts)],
      [t.journalEntries, formatInteger(stats.journalEntries)],
      [t.debit, formatMoney(stats.trialDebit)],
      [t.credit, formatMoney(stats.trialCredit)],
      [t.trialBalance, balanceLabel],
      [],
      [t.entryNo, t.date, t.description, t.status, t.amount],
      ...filteredEntries.map((row) => [
        row.number,
        formatDate(row.date),
        row.description,
        getStatusLabel(row.status, locale),
        formatMoney(row.amount),
      ]),
    ];
    const html = `
      <html>
        <head><meta charset="utf-8" /></head>
        <body>
          <table border="1">
            ${rows
              .map(
                (row) =>
                  `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
              )
              .join("")}
          </table>
        </body>
      </html>
    `;
    const blob = new Blob(["\uFEFF", html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "company-accounting-dashboard.xls";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(t.export);
  }
  function printPage() {
    if (!entries.length && !stats.accounts) {
      toast.warning(t.printEmpty);
      return;
    }
    window.print();
  }
  if (loading) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px]">
          <DashboardSkeleton />
        </div>
      </main>
    );
  }
  if (error) {
    return (
      <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-[900px] rounded-3xl border-destructive/30 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="h-5 w-5" />
              {t.errorTitle}
            </CardTitle>
            <CardDescription>{error || t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void loadDashboard()} className="rounded-xl" disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  return (
    <main dir={dir} className="min-h-screen bg-muted/30 px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {t.moduleBadge}
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{t.subtitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="rounded-xl bg-background" onClick={() => void loadDashboard({ silent: true })} disabled={refreshing}>
                  {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t.refresh}
                </Button>
                <Button variant="outline" className="rounded-xl bg-background" onClick={exportExcel}>
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.export}
                </Button>
                <Button className="rounded-xl" onClick={printPage}>
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
              </div>
            </div>
          </div>
        </section>
        {warnings.length ? (
          <Card className="rounded-2xl border-amber-200 bg-amber-50 text-amber-950 shadow-sm">
            <CardContent className="flex gap-3 p-4">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{t.partialWarningTitle}</p>
                <p className="mt-1 text-sm opacity-80">{t.partialWarningDesc}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
        <Card className="rounded-2xl border-amber-200/70 bg-amber-50/70 text-amber-950 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <TriangleAlert className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{t.readOnlyTitle}</p>
              <p className="mt-1 text-sm opacity-80">{t.readOnlyDesc}</p>
            </div>
          </CardContent>
        </Card>
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
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{t.shortcutsTitle}</CardTitle>
              <CardDescription>{t.shortcutsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {shortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-2xl border bg-background p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="rounded-2xl bg-primary/10 p-2.5 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                              {locale === "ar" ? item.titleAr : item.titleEn}
                            </h3>
                            <Badge variant="outline" className="rounded-full bg-muted/30 text-[11px]">
                              {locale === "ar" ? item.badgeAr : item.badgeEn}
                            </Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {locale === "ar" ? item.descAr : item.descEn}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground transition group-hover:text-primary">
                        {t.open}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>{t.summaryTitle}</CardTitle>
              <CardDescription>
                {t.summaryDesc} — {t.trialBalance}: {balanceLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{t.debit}</p>
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums">
                    <MoneyValue value={stats.trialDebit} label={t.sar} />
                  </p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{t.credit}</p>
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums">
                    <MoneyValue value={stats.trialCredit} label={t.sar} />
                  </p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{t.journalEntries}</p>
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums">{formatInteger(stats.journalEntries)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.postedEntries}: {formatInteger(stats.postedEntries)} · {t.draftEntries}: {formatInteger(stats.draftEntries)}
                  </p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
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
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.latestEntries}</CardTitle>
            <CardDescription>{t.latestEntriesDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}