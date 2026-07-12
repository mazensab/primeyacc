"use client";
/* ============================================================
   📂 primey_frontend/app/company/treasury/page.tsx
   🧠 PrimeyAcc — Company Treasury & Payments Dashboard
   ------------------------------------------------------------
   ✅ Approved Premium company dashboard pattern
   ✅ Real API only, no fake demo data
   ✅ Company scoped treasury overview
   ✅ Operational dashboard with child-page shortcuts
   ✅ Treasury accounts snapshot
   ✅ Latest treasury transactions table
   ✅ Excel .xls + Web print
   ✅ Skeleton loading
   ✅ Error / Empty states
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
   ✅ English numbers/money always
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost hardcoding except safe dev fallback
============================================================ */
import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Landmark,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  TriangleAlert,
  Wallet,
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
type ApiResponse = ApiRecord | ApiRecord[];
type SortKey = "newest" | "oldest" | "amount_high" | "amount_low" | "number" | "name";
type StatusFilter = "all" | "active" | "inactive" | "draft" | "posted" | "cancelled";
type AccountTypeFilter = "all" | "cash" | "bank" | "wallet";
type TransactionTypeFilter = "all" | "inflow" | "outflow" | "transfer" | "adjustment";
type TreasuryStats = {
  totalBalance: number;
  cashBalance: number;
  bankBalance: number;
  walletBalance: number;
  postedInflows: number;
  postedOutflows: number;
  totalAccounts: number;
  activeAccounts: number;
  inactiveAccounts: number;
  draftTransactions: number;
  postedTransactions: number;
  cancelledTransactions: number;
};
type TreasuryAccountRecord = {
  id: string;
  name: string;
  code: string;
  type: AccountTypeFilter;
  status: "active" | "inactive";
  currency: string;
  openingBalance: number;
  currentBalance: number;
  accountingAccountId: string;
  accountingAccountCode: string;
  accountingAccountName: string;
  openingAccountingEntryId: string;
  openingAccountingEntryNumber: string;
  openingAccountingEntryStatus: string;
  bankName: string;
  bankAccountNumber: string;
  iban: string;
  isDefault: boolean;
  notes: string;
  updatedAt: string | null;
};
type TreasuryTransactionRecord = {
  id: string;
  sourceId: string;
  sourceNumber: string;
  treasuryAccountId: string;
  accountingAccountId: string;
  accountingEntryId: string;
  number: string;
  date: string | null;
  accountName: string;
  accountCode: string;
  accountingAccountCode: string;
  accountingAccountName: string;
  counterpartyName: string;
  type: TransactionTypeFilter;
  status: "draft" | "posted" | "cancelled";
  sourceType: string;
  sourceLabel: string;
  amount: number;
  currency: string;
  reference: string;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  accountingEntryNumber: string;
  accountingEntryStatus: string;
  isAccountingPosted: boolean;
  createdAt: string | null;
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
const TREASURY_ENDPOINTS = {
  summary: "/api/company/treasury/summary/",
  accounts: "/api/company/treasury/accounts/",
  transactions: "/api/company/treasury/transactions/",
};
const emptyStats: TreasuryStats = {
  totalBalance: 0,
  cashBalance: 0,
  bankBalance: 0,
  walletBalance: 0,
  postedInflows: 0,
  postedOutflows: 0,
  totalAccounts: 0,
  activeAccounts: 0,
  inactiveAccounts: 0,
  draftTransactions: 0,
  postedTransactions: 0,
  cancelledTransactions: 0,
};
const shortcuts: ShortcutRecord[] = [
  {
    href: "/company/treasury/cashboxes",
    titleAr: "حسابات الخزينة",
    titleEn: "Treasury Accounts",
    descAr: "إدارة الصناديق والبنوك والمحافظ وحالات التفعيل.",
    descEn: "Manage cash, bank, wallet accounts, and active status.",
    badgeAr: "تشغيلي",
    badgeEn: "Operational",
    icon: WalletCards,
  },
  {
    href: "/company/treasury/cashboxes",
    titleAr: "الصناديق",
    titleEn: "Cashboxes",
    descAr: "متابعة أرصدة الصناديق وحسابات النقد.",
    descEn: "Track cashbox and cash account balances.",
    badgeAr: "تشغيلي",
    badgeEn: "Operational",
    icon: Banknote,
  },
  {
    href: "/company/treasury/bank-accounts",
    titleAr: "الحسابات البنكية",
    titleEn: "Bank Accounts",
    descAr: "متابعة الحسابات البنكية والآيبان وربطها بالحركات.",
    descEn: "Track bank accounts, IBANs, and movements.",
    badgeAr: "تشغيلي",
    badgeEn: "Operational",
    icon: Landmark,
  },
  {
    href: "/company/treasury/transactions",
    titleAr: "سجل الحركات",
    titleEn: "Treasury Ledger",
    descAr: "متابعة الوارد والصادر والتحويلات والتسويات.",
    descEn: "Review inflows, outflows, transfers, and adjustments.",
    badgeAr: "سجل",
    badgeEn: "Ledger",
    icon: ArrowUpDown,
  },
  {
    href: "/company/treasury/receipt-vouchers",
    titleAr: "سندات القبض",
    titleEn: "Receipt Vouchers",
    descAr: "دفعات العملاء مع التأكيد والترحيل وربط الفواتير.",
    descEn: "Customer receipts with confirmation and invoice allocation.",
    badgeAr: "تشغيلي",
    badgeEn: "Operational",
    icon: ArrowDownLeft,
  },
  {
    href: "/company/treasury/payment-vouchers",
    titleAr: "سندات الصرف",
    titleEn: "Payment Vouchers",
    descAr: "دفعات الموردين مع عكس آمن عند الإلغاء.",
    descEn: "Supplier payments with safe cancellation reversal.",
    badgeAr: "تشغيلي",
    badgeEn: "Operational",
    icon: ArrowUpRight,
  },
];
const translations = {
  ar: {
    moduleBadge: "وحدة الشركة",
    title: "الخزينة والمدفوعات",
    subtitle:
      "إدارة أرصدة الصناديق والحسابات البنكية، ومراجعة حركات الوارد والصادر وسندات القبض والصرف.",
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
    numberSort: "الرقم",
    nameSort: "الاسم",
    open: "فتح",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    sar: "ر.س",
    unknown: "غير محدد",
    totalBalance: "إجمالي الرصيد",
    cashBalance: "رصيد الصناديق",
    bankBalance: "رصيد البنوك",
    walletBalance: "رصيد المحافظ",
    postedInflows: "إجمالي الوارد المرحل",
    postedOutflows: "إجمالي الصادر المرحل",
    accounts: "حسابات الخزينة",
    activeAccounts: "نشطة",
    inactiveAccounts: "معطلة",
    transactions: "حركات الخزينة",
    draftTransactions: "مسودة",
    postedTransactions: "مرحلة",
    cancelledTransactions: "ملغاة",
    shortcutsTitle: "اختصارات الوحدة",
    shortcutsDesc: "انتقال سريع لصفحات الخزينة والمدفوعات التشغيلية.",
    summaryTitle: "ملخص الخزينة",
    summaryDesc: "قراءة مختصرة لأرصدة الحسابات وحالة الحركات.",
    latestAccounts: "حسابات الخزينة",
    latestAccountsDesc: "أحدث حسابات الصندوق والبنك والمحفظة الخاصة بالشركة.",
    latestTransactions: "آخر حركات الخزينة",
    latestTransactionsDesc: "أحدث الحركات المرتبطة بالحسابات والمدفوعات.",
    accountSearchPlaceholder: "ابحث باسم الحساب أو الكود أو البنك أو الآيبان...",
    transactionSearchPlaceholder: "ابحث برقم الحركة أو الحساب أو المرجع أو الوصف...",
    account: "الحساب",
    accountType: "النوع",
    status: "الحالة",
    balance: "الرصيد",
    bank: "البنك",
    defaultAccount: "افتراضي",
    date: "التاريخ",
    transactionNo: "رقم الحركة",
    source: "المصدر",
    amount: "المبلغ",
    accounting: "المحاسبة",
    cash: "صندوق",
    bankAccount: "حساب بنكي",
    wallet: "محفظة",
    active: "نشط",
    inactive: "غير نشط",
    draft: "مسودة",
    posted: "مرحل",
    cancelled: "ملغي",
    inflow: "وارد",
    outflow: "صادر",
    transfer: "تحويل",
    adjustment: "تسوية",
    manual: "يدوي",
    customerPayment: "دفعة عميل",
    supplierPayment: "دفعة مورد",
    salesInvoice: "فاتورة مبيعات",
    purchaseBill: "فاتورة مشتريات",
    noDataTitle: "لا توجد بيانات",
    noDataDesc: "لا توجد بيانات مسجلة حاليًا.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل لوحة الخزينة",
    errorDesc: "تأكد من تسجيل الدخول للشركة ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    generatedAt: "تم الإنشاء في",
    refreshed: "تم تحديث لوحة الخزينة.",
  },
  en: {
    moduleBadge: "Company module",
    title: "Treasury & Payments",
    subtitle:
      "Manage cashbox and bank balances, treasury movements, receipt vouchers, and payment vouchers.",
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
    numberSort: "Number",
    nameSort: "Name",
    open: "Open",
    showing: "Showing",
    of: "of",
    rows: "rows",
    sar: "SAR",
    unknown: "Unknown",
    totalBalance: "Total balance",
    cashBalance: "Cash balance",
    bankBalance: "Bank balance",
    walletBalance: "Wallet balance",
    postedInflows: "Posted inflows",
    postedOutflows: "Posted outflows",
    accounts: "Treasury accounts",
    activeAccounts: "Active",
    inactiveAccounts: "Inactive",
    transactions: "Treasury transactions",
    draftTransactions: "Draft",
    postedTransactions: "Posted",
    cancelledTransactions: "Cancelled",
    shortcutsTitle: "Module shortcuts",
    shortcutsDesc: "Quick access to treasury and payments operational pages.",
    summaryTitle: "Treasury summary",
    summaryDesc: "Compact reading for balances and transaction statuses.",
    latestAccounts: "Treasury accounts",
    latestAccountsDesc: "Newest cash, bank, and wallet accounts for the company.",
    latestTransactions: "Latest treasury transactions",
    latestTransactionsDesc: "Newest movements linked to accounts and payments.",
    accountSearchPlaceholder: "Search by account name, code, bank, or IBAN...",
    transactionSearchPlaceholder: "Search by transaction number, account, reference, or description...",
    account: "Account",
    accountType: "Type",
    status: "Status",
    balance: "Balance",
    bank: "Bank",
    defaultAccount: "Default",
    date: "Date",
    transactionNo: "Transaction No.",
    source: "Source",
    amount: "Amount",
    accounting: "Accounting",
    cash: "Cash",
    bankAccount: "Bank",
    wallet: "Wallet",
    active: "Active",
    inactive: "Inactive",
    draft: "Draft",
    posted: "Posted",
    cancelled: "Cancelled",
    inflow: "Inflow",
    outflow: "Outflow",
    transfer: "Transfer",
    adjustment: "Adjustment",
    manual: "Manual",
    customerPayment: "Customer payment",
    supplierPayment: "Supplier payment",
    salesInvoice: "Sales invoice",
    purchaseBill: "Purchase bill",
    noDataTitle: "No data",
    noDataDesc: "No records are currently available.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change the search or filters to show other results.",
    errorTitle: "Could not load treasury dashboard",
    errorDesc: "Make sure you are signed in to the company and the backend is running, then try again.",
    tryAgain: "Try again",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    generatedAt: "Generated at",
    refreshed: "Treasury dashboard refreshed.",
  },
} as const;
const statusFilters: StatusFilter[] = ["all", "active", "inactive", "draft", "posted", "cancelled"];
const accountTypeFilters: AccountTypeFilter[] = ["all", "cash", "bank", "wallet"];
const transactionTypeFilters: TransactionTypeFilter[] = ["all", "inflow", "outflow", "transfer", "adjustment"];
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
function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "active", "posted", "default"].includes(normalized)) return true;
    if (["false", "0", "no", "inactive", "draft"].includes(normalized)) return false;
  }
  return fallback;
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
function accountDetailHref(
  row: TreasuryAccountRecord,
) {
  return row.accountingAccountId
    ? `/company/accounting/chart-of-accounts/${encodeURIComponent(
        row.accountingAccountId,
      )}`
    : "";
}
function extractVoucherNumber(
  ...values: string[]
) {
  for (const value of values) {
    const match = value.match(
      /\b(?:CP|SP)-\d{4}-\d{6}\b/i,
    );
    if (match) {
      return match[0].toUpperCase();
    }
  }
  return "";
}
function treasuryTransactionDetailHref(
  row: TreasuryTransactionRecord,
) {
  const sourceType = row.sourceType.toUpperCase();
  const sourceNumber =
    row.sourceNumber ||
    extractVoucherNumber(
      row.reference,
      row.description,
      row.number,
    );
  if (
    sourceNumber.startsWith("CP-") ||
    sourceType.includes("CUSTOMER_PAYMENT")
  ) {
    return sourceNumber
      ? `/company/treasury/receipt-vouchers/${encodeURIComponent(
          sourceNumber,
        )}`
      : "";
  }
  if (
    sourceNumber.startsWith("SP-") ||
    sourceType.includes("SUPPLIER_PAYMENT")
  ) {
    return sourceNumber
      ? `/company/treasury/payment-vouchers/${encodeURIComponent(
          sourceNumber,
        )}`
      : "";
  }
  if (row.accountingEntryNumber) {
    return `/company/accounting/journal-entries/${encodeURIComponent(
      row.accountingEntryNumber,
    )}`;
  }
  if (row.accountingAccountId) {
    return `/company/accounting/chart-of-accounts/${encodeURIComponent(
      row.accountingAccountId,
    )}`;
  }
  return "";
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
function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  const data = record.data;
  const result = record.result;
  const meta = record.meta;
  if (Array.isArray(record.results)) return record.results;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(record.rows)) return record.rows;
  if (Array.isArray(record.accounts)) return record.accounts;
  if (Array.isArray(record.transactions)) return record.transactions;
  if (Array.isArray(data)) return data;
  if (Array.isArray(result)) return result;
  const dataRecord = asRecord(data);
  if (Array.isArray(dataRecord.results)) return dataRecord.results;
  if (Array.isArray(dataRecord.items)) return dataRecord.items;
  if (Array.isArray(dataRecord.records)) return dataRecord.records;
  if (Array.isArray(dataRecord.rows)) return dataRecord.rows;
  if (Array.isArray(dataRecord.accounts)) return dataRecord.accounts;
  if (Array.isArray(dataRecord.transactions)) return dataRecord.transactions;
  const resultRecord = asRecord(result);
  if (Array.isArray(resultRecord.results)) return resultRecord.results;
  if (Array.isArray(resultRecord.items)) return resultRecord.items;
  if (Array.isArray(resultRecord.accounts)) return resultRecord.accounts;
  if (Array.isArray(resultRecord.transactions)) return resultRecord.transactions;
  const metaRecord = asRecord(meta);
  if (Array.isArray(metaRecord.results)) return metaRecord.results;
  return [];
}
function extractSummary(payload: unknown): ApiRecord {
  const record = asRecord(payload);
  const dataRecord = asRecord(record.data);
  return {
    ...asRecord(record.result),
    ...asRecord(dataRecord.result),
    ...asRecord(record.summary),
    ...asRecord(dataRecord.summary),
  };
}
function extractCompanyName(payload: unknown, fallback: string) {
  const record = asRecord(payload);
  const company = asRecord(record.company || asRecord(record.data).company);
  return normalizeText(company.name || company.display_name || company.legal_name, fallback);
}
function normalizeAccountType(value: unknown): AccountTypeFilter {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "CASH" || normalized === "cash") return "cash";
  if (normalized === "BANK" || normalized === "bank") return "bank";
  if (normalized === "WALLET" || normalized === "wallet") return "wallet";
  return "cash";
}
function normalizeTransactionType(value: unknown): TransactionTypeFilter {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "INFLOW") return "inflow";
  if (normalized === "OUTFLOW") return "outflow";
  if (normalized === "TRANSFER") return "transfer";
  if (normalized === "ADJUSTMENT") return "adjustment";
  return "inflow";
}
function normalizeStatus(value: unknown): "active" | "inactive" | "draft" | "posted" | "cancelled" {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "ACTIVE") return "active";
  if (normalized === "INACTIVE") return "inactive";
  if (normalized === "POSTED" || normalized === "CONFIRMED") return "posted";
  if (normalized === "CANCELLED" || normalized === "CANCELED") return "cancelled";
  return "draft";
}
function accountTypeLabel(type: AccountTypeFilter, locale: Locale) {
  const t = translations[locale];
  if (type === "bank") return t.bankAccount;
  if (type === "wallet") return t.wallet;
  if (type === "all") return t.all;
  return t.cash;
}
function transactionTypeLabel(type: TransactionTypeFilter, locale: Locale) {
  const t = translations[locale];
  if (type === "outflow") return t.outflow;
  if (type === "transfer") return t.transfer;
  if (type === "adjustment") return t.adjustment;
  if (type === "all") return t.all;
  return t.inflow;
}
function statusLabel(value: string, locale: Locale) {
  const t = translations[locale];
  if (value === "active") return t.active;
  if (value === "inactive") return t.inactive;
  if (value === "posted") return t.posted;
  if (value === "cancelled") return t.cancelled;
  if (value === "all") return t.all;
  return t.draft;
}
function sourceLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const normalized = value.toUpperCase();
  if (normalized.includes("CUSTOMER_PAYMENT")) return t.customerPayment;
  if (normalized.includes("SUPPLIER_PAYMENT")) return t.supplierPayment;
  if (normalized.includes("SALES_INVOICE")) return t.salesInvoice;
  if (normalized.includes("PURCHASE_BILL")) return t.purchaseBill;
  if (normalized.includes("TRANSFER")) return t.transfer;
  if (normalized.includes("ADJUSTMENT")) return t.adjustment;
  return t.manual;
}
function getStatusBadgeClass(value: string) {
  if (["active", "posted"].includes(value)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (value === "draft") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["inactive", "cancelled"].includes(value)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-border bg-muted/30 text-muted-foreground";
}
function getTypeBadgeClass(value: string) {
  if (value === "inflow") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "outflow") return "border-rose-200 bg-rose-50 text-rose-700";
  if (value === "transfer") return "border-blue-200 bg-blue-50 text-blue-700";
  if (value === "adjustment") return "border-violet-200 bg-violet-50 text-violet-700";
  if (value === "bank") return "border-blue-200 bg-blue-50 text-blue-700";
  if (value === "wallet") return "border-violet-200 bg-violet-50 text-violet-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}
function normalizeAccount(value: unknown): TreasuryAccountRecord {
  const record = asRecord(value);
  const accountSnapshot = asRecord(record.account);
  const type = normalizeAccountType(record.account_type || record.type);
  const status = normalizeStatus(record.status) === "inactive" ? "inactive" : "active";
  return {
    id: normalizeText(record.id || record.uuid || record.pk),
    name: normalizeText(record.name, "—"),
    code: normalizeText(record.code, "—"),
    type,
    status,
    currency: normalizeText(record.currency, "SAR"),
    openingBalance: toNumber(record.opening_balance),
    currentBalance: toNumber(record.current_balance),
    accountingAccountId: normalizeText(
      record.accounting_account_id ||
        accountSnapshot.accounting_account_id ||
        asRecord(
          accountSnapshot.accounting_account,
        ).id,
    ),
    accountingAccountCode: normalizeText(record.accounting_account_code),
    accountingAccountName: normalizeText(record.accounting_account_name),
    openingAccountingEntryId: normalizeText(record.opening_accounting_entry_id),
    openingAccountingEntryNumber: normalizeText(record.opening_accounting_entry_number),
    openingAccountingEntryStatus: normalizeText(record.opening_accounting_entry_status),
    bankName: normalizeText(record.bank_name),
    bankAccountNumber: normalizeText(record.bank_account_number),
    iban: normalizeText(record.iban),
    isDefault: toBoolean(record.is_default),
    notes: normalizeText(record.notes),
    updatedAt: normalizeText(record.updated_at || record.created_at) || null,
  };
}
function normalizeTransaction(value: unknown, locale: Locale): TreasuryTransactionRecord {
  const record = asRecord(value);
  const accountSnapshot = asRecord(record.account);
  const type = normalizeTransactionType(record.transaction_type || record.type);
  const status = normalizeStatus(record.status);
  return {
    id: normalizeText(
      record.id ||
        record.uuid ||
        record.pk,
    ),
    sourceId: normalizeText(
      record.source_id ||
        record.payment_id ||
        record.voucher_id,
    ),
    sourceNumber: normalizeText(
      record.source_number ||
        record.payment_number ||
        record.voucher_number ||
        record.source_reference,
    ),
    treasuryAccountId: normalizeText(
      record.treasury_account_id ||
        record.account_id ||
        accountSnapshot.id,
    ),
    accountingAccountId: normalizeText(
      record.accounting_account_id ||
        accountSnapshot.accounting_account_id ||
        asRecord(
          accountSnapshot.accounting_account,
        ).id,
    ),
    accountingEntryId: normalizeText(
      record.accounting_entry_id,
    ),
    number: normalizeText(
      record.transaction_number ||
        record.number ||
        record.reference,
      "—",
    ),
    date: normalizeText(record.transaction_date || record.date || record.created_at) || null,
    accountName: normalizeText(record.account_name || accountSnapshot.name, "—"),
    accountCode: normalizeText(record.account_code || accountSnapshot.code),
    accountingAccountCode: normalizeText(record.accounting_account_code || accountSnapshot.accounting_account_code),
    accountingAccountName: normalizeText(record.accounting_account_name || accountSnapshot.accounting_account_name),
    counterpartyName: normalizeText(record.counterparty_account_name || asRecord(record.counterparty_account).name),
    type,
    status: status === "posted" || status === "cancelled" ? status : "draft",
    sourceType: normalizeText(record.source_type),
    sourceLabel: sourceLabel(normalizeText(record.source_type), locale),
    amount: toNumber(record.amount),
    currency: normalizeText(record.currency, "SAR"),
    reference: normalizeText(record.reference),
    description: normalizeText(record.description || record.notes),
    balanceBefore: toNumber(record.balance_before),
    balanceAfter: toNumber(record.balance_after),
    accountingEntryNumber: normalizeText(record.accounting_entry_number),
    accountingEntryStatus: normalizeText(record.accounting_entry_status),
    isAccountingPosted: toBoolean(record.is_accounting_posted),
    createdAt: normalizeText(record.created_at) || null,
  };
}
function buildStats(
  summary: ApiRecord,
  accounts: TreasuryAccountRecord[],
  transactions: TreasuryTransactionRecord[],
): TreasuryStats {
  const cashBalance = toNumber(
    summary.cash_balance,
    accounts.filter((item) => item.type === "cash").reduce((sum, item) => sum + item.currentBalance, 0),
  );
  const bankBalance = toNumber(
    summary.bank_balance,
    accounts.filter((item) => item.type === "bank").reduce((sum, item) => sum + item.currentBalance, 0),
  );
  const walletBalance = toNumber(
    summary.wallet_balance,
    accounts.filter((item) => item.type === "wallet").reduce((sum, item) => sum + item.currentBalance, 0),
  );
  return {
    totalBalance: toNumber(summary.total_balance, cashBalance + bankBalance + walletBalance),
    cashBalance,
    bankBalance,
    walletBalance,
    postedInflows: toNumber(
      summary.posted_inflows,
      transactions
        .filter((item) => item.status === "posted" && item.type === "inflow")
        .reduce((sum, item) => sum + item.amount, 0),
    ),
    postedOutflows: toNumber(
      summary.posted_outflows,
      transactions
        .filter((item) => item.status === "posted" && item.type === "outflow")
        .reduce((sum, item) => sum + item.amount, 0),
    ),
    totalAccounts: toNumber(summary.total_accounts, accounts.length),
    activeAccounts: toNumber(
      summary.active_accounts,
      accounts.filter((item) => item.status === "active").length,
    ),
    inactiveAccounts: toNumber(
      summary.inactive_accounts,
      accounts.filter((item) => item.status === "inactive").length,
    ),
    draftTransactions: toNumber(
      summary.draft_transactions,
      transactions.filter((item) => item.status === "draft").length,
    ),
    postedTransactions: toNumber(
      summary.posted_transactions,
      transactions.filter((item) => item.status === "posted").length,
    ),
    cancelledTransactions: toNumber(
      summary.cancelled_transactions,
      transactions.filter((item) => item.status === "cancelled").length,
    ),
  };
}
function rowDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}
function isWithinDate(dateValue: string | null, from: string, to: string) {
  const normalized = formatDate(dateValue);
  if (normalized === "—") return !from && !to;
  if (from && normalized < from) return false;
  if (to && normalized > to) return false;
  return true;
}
function sortAccounts(rows: TreasuryAccountRecord[], sort: SortKey) {
  return [...rows].sort((a, b) => {
    if (sort === "amount_high") return b.currentBalance - a.currentBalance;
    if (sort === "amount_low") return a.currentBalance - b.currentBalance;
    if (sort === "name") return a.name.localeCompare(b.name);
    return a.code.localeCompare(b.code, undefined, { numeric: true });
  });
}
function sortTransactions(rows: TreasuryTransactionRecord[], sort: SortKey) {
  return [...rows].sort((a, b) => {
    if (sort === "oldest") return rowDateValue(a.date) - rowDateValue(b.date);
    if (sort === "amount_high") return b.amount - a.amount;
    if (sort === "amount_low") return a.amount - b.amount;
    if (sort === "number") return a.number.localeCompare(b.number, undefined, { numeric: true });
    return rowDateValue(b.date) - rowDateValue(a.date);
  });
}
function parseIsoDate(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value
    .slice(0, 10)
    .split("-")
    .map(Number);
  if (!year || !month || !day) {
    return undefined;
  }
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime())
    ? undefined
    : date;
}
function dateToIso(value?: Date) {
  if (!value) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const [open, setOpen] = React.useState(false);
  const selected = parseIsoDate(value);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={label}
          title={label}
          className="h-9 w-full justify-start bg-background px-3 text-start font-normal shadow-none sm:w-[150px]"
        >
          <CalendarDays className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <span
            dir="ltr"
            lang="en"
            className="truncate tabular-nums"
          >
            {value || label}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(dateToIso(date));
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
function MoneyValue({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <span dir="ltr" lang="en" className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold">
      <span
        dir="ltr"
        lang="en"
        className="tabular-nums"
      >
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
    <Badge variant="outline" className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", getStatusBadgeClass(value))}>
      {label}
    </Badge>
  );
}
function TypeBadge({ value, label }: { value: string; label: string }) {
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", getTypeBadgeClass(value))}>
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
  href?: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  money?: boolean;
  t: (typeof translations)[Locale];
}) {
  const content = (
    <>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="truncate text-sm">
            {title}
          </CardDescription>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
            {money ? (
              <MoneyValue
                value={value}
                label={t.sar}
              />
            ) : (
              formatInteger(value)
            )}
          </CardTitle>
        </div>
        <span className="rounded-lg border bg-background p-2.5 text-muted-foreground transition group-hover:border-foreground/20 group-hover:text-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </>
  );
  return (
    <Card className="group overflow-hidden rounded-lg border bg-card shadow-none transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm">
      {href ? (
        <Link
          href={href}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {content}
        </Link>
      ) : (
        content
      )}
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
          <Skeleton className="h-80 w-full" />
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
  rowHref,
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
  rowHref?: (row: T) => string;
}) {
  const router = useRouter();
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="overflow-x-auto">
          <Table className="min-w-[1080px] table-fixed">
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
                    className={cn(
                      "h-[64px] transition-colors",
                      rowHref?.(row)
                        ? "cursor-pointer hover:bg-muted/40"
                        : "",
                    )}
                    onClick={(event) => {
                      const href = rowHref?.(row);
                      if (!href) return;
                      const target = event.target as HTMLElement;
                      if (
                        target.closest(
                          "button, a, input, select, textarea, [role='menuitem']",
                        )
                      ) {
                        return;
                      }
                      router.push(href);
                    }}
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
function tableHtmlForSections(
  sections: Array<{
    title: string;
    headers: string[];
    rows: string[][];
  }>,
) {
  return sections
    .map(
      (section) => `
        <h2>${escapeHtml(section.title)}</h2>
        <table>
          <thead>
            <tr>${section.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${
              section.rows.length
                ? section.rows
                    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
                    .join("")
                : `<tr><td colspan="${section.headers.length}">—</td></tr>`
            }
          </tbody>
        </table>
      `,
    )
    .join("");
}
export default function CompanyTreasuryPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [stats, setStats] = React.useState<TreasuryStats>(emptyStats);
  const [accounts, setAccounts] = React.useState<TreasuryAccountRecord[]>([]);
  const [transactions, setTransactions] = React.useState<TreasuryTransactionRecord[]>([]);
  const [companyName, setCompanyName] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [accountSearch, setAccountSearch] = React.useState("");
  const [accountStatus, setAccountStatus] = React.useState<StatusFilter>("all");
  const [accountType, setAccountType] = React.useState<AccountTypeFilter>("all");
  const [accountSort, setAccountSort] = React.useState<SortKey>("amount_high");
  const [transactionSearch, setTransactionSearch] = React.useState("");
  const [transactionStatus, setTransactionStatus] = React.useState<StatusFilter>("all");
  const [transactionType, setTransactionType] = React.useState<TransactionTypeFilter>("all");
  const [transactionSort, setTransactionSort] = React.useState<SortKey>("newest");
  const [transactionDateFrom, setTransactionDateFrom] = React.useState("");
  const [transactionDateTo, setTransactionDateTo] = React.useState("");
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
        const accountParams = new URLSearchParams({
          page: "1",
          page_size: "50",
          ordering: "-current_balance",
        });
        const transactionParams = new URLSearchParams({
          page: "1",
          page_size: "50",
          ordering: "-transaction_date",
        });
        const results = await Promise.allSettled([
          fetchJson<ApiResponse>(makeApiUrl(TREASURY_ENDPOINTS.summary), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(TREASURY_ENDPOINTS.accounts, accountParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(TREASURY_ENDPOINTS.transactions, transactionParams), controller.signal),
        ]);
        const failedMessages = results
          .filter((result): result is PromiseRejectedResult => result.status === "rejected")
          .map((result) => normalizeText(result.reason instanceof Error ? result.reason.message : result.reason));
        const [summaryPayload, accountsPayload, transactionsPayload] = results.map((result) =>
          result.status === "fulfilled" ? result.value : {},
        );
        const summary = extractSummary(summaryPayload);
        const accountRows = extractArray(accountsPayload).map(normalizeAccount);
        const transactionRows = extractArray(transactionsPayload).map((item) => normalizeTransaction(item, locale));
        setCompanyName(extractCompanyName(summaryPayload, ""));
        setAccounts(accountRows);
        setTransactions(transactionRows);
        setStats(buildStats(summary, accountRows, transactionRows));
        if (failedMessages.length === results.length) {
          throw new Error(failedMessages[0] || t.errorDesc);
        }
        if (silent) {
          toast.success(t.refreshed);
        }
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
      return () => controller.abort();
    },
    [locale, t],
  );
  React.useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);
  const resetAccountFilters = React.useCallback(() => {
    setAccountSearch("");
    setAccountStatus("all");
    setAccountType("all");
    setAccountSort("amount_high");
  }, []);
  const resetTransactionFilters = React.useCallback(() => {
    setTransactionSearch("");
    setTransactionStatus("all");
    setTransactionType("all");
    setTransactionSort("newest");
    setTransactionDateFrom("");
    setTransactionDateTo("");
  }, []);
  const filteredAccounts = React.useMemo(() => {
    const query = accountSearch.trim().toLowerCase();
    const rows = accounts.filter((account) => {
      const haystack = [
        account.name,
        account.code,
        account.type,
        account.status,
        account.bankName,
        account.bankAccountNumber,
        account.iban,
        account.notes,
      ]
        .join(" ")
        .toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (accountStatus === "active" && account.status !== "active") return false;
      if (accountStatus === "inactive" && account.status !== "inactive") return false;
      if (accountType !== "all" && account.type !== accountType) return false;
      return true;
    });
    return sortAccounts(rows, accountSort);
  }, [accountSearch, accountSort, accountStatus, accountType, accounts]);
  const filteredTransactions = React.useMemo(() => {
    const query = transactionSearch.trim().toLowerCase();
    const rows = transactions.filter((transaction) => {
      const haystack = [
        transaction.number,
        transaction.accountName,
        transaction.accountCode,
        transaction.counterpartyName,
        transaction.type,
        transaction.status,
        transaction.sourceType,
        transaction.sourceLabel,
        transaction.reference,
        transaction.description,
        transaction.accountingEntryNumber,
      ]
        .join(" ")
        .toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (transactionStatus === "draft" && transaction.status !== "draft") return false;
      if (transactionStatus === "posted" && transaction.status !== "posted") return false;
      if (transactionStatus === "cancelled" && transaction.status !== "cancelled") return false;
      if (transactionType !== "all" && transaction.type !== transactionType) return false;
      return isWithinDate(transaction.date || transaction.createdAt, transactionDateFrom, transactionDateTo);
    });
    return sortTransactions(rows, transactionSort);
  }, [
    transactionDateFrom,
    transactionDateTo,
    transactionSearch,
    transactionSort,
    transactionStatus,
    transactionType,
    transactions,
  ]);
  const hasAccountFilters = Boolean(
    accountSearch || accountStatus !== "all" || accountType !== "all" || accountSort !== "amount_high",
  );
  const hasTransactionFilters = Boolean(
    transactionSearch ||
      transactionStatus !== "all" ||
      transactionType !== "all" ||
      transactionSort !== "newest" ||
      transactionDateFrom ||
      transactionDateTo,
  );
  const kpiCards = [
    {
      title: t.totalBalance,
      value: stats.totalBalance,
      description: t.accounts,
      href: "/company/treasury/cashboxes",
      icon: Wallet,
      money: true,
    },
    {
      title: t.cashBalance,
      value: stats.cashBalance,
      description: t.cash,
      href: "/company/treasury/cashboxes",
      icon: Banknote,
      money: true,
    },
    {
      title: t.bankBalance,
      value: stats.bankBalance,
      description: t.bankAccount,
      href: "/company/treasury/bank-accounts",
      icon: Landmark,
      money: true,
    },
    {
      title: t.walletBalance,
      value: stats.walletBalance,
      description: t.wallet,
      href: "/company/treasury/cashboxes",
      icon: WalletCards,
      money: true,
    },
    {
      title: t.postedInflows,
      value: stats.postedInflows,
      description: t.inflow,
      href: "/company/treasury/transactions?transaction_type=INFLOW",
      icon: ArrowDownLeft,
      money: true,
    },
    {
      title: t.postedOutflows,
      value: stats.postedOutflows,
      description: t.outflow,
      href: "/company/treasury/transactions?transaction_type=OUTFLOW",
      icon: ArrowUpRight,
      money: true,
    },
    {
      title: t.accounts,
      value: stats.totalAccounts,
      description: `${t.activeAccounts}: ${formatInteger(stats.activeAccounts)} · ${t.inactiveAccounts}: ${formatInteger(stats.inactiveAccounts)}`,
      href: "/company/treasury/cashboxes",
      icon: ShieldCheck,
    },
    {
      title: t.transactions,
      value: stats.postedTransactions + stats.draftTransactions + stats.cancelledTransactions,
      description: `${t.postedTransactions}: ${formatInteger(stats.postedTransactions)} · ${t.draftTransactions}: ${formatInteger(stats.draftTransactions)}`,
      href: "/company/treasury/transactions",
      icon: FileText,
    },
  ];
  const accountColumns: DataColumn<TreasuryAccountRecord>[] = [
    {
      key: "account",
      label: t.account,
      className: "w-[260px]",
      render: (row) => (
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{row.name || t.unknown}</span>
          <span className="block truncate text-xs text-muted-foreground tabular-nums">{row.code || "—"}</span>
          {row.accountingAccountCode ? (
            <span className="block truncate text-xs text-muted-foreground tabular-nums">
              {row.accountingAccountCode} — {row.accountingAccountName || (locale === "ar" ? "حساب محاسبي" : "Accounting account")}
            </span>
          ) : null}
          {row.openingAccountingEntryNumber ? (
            <span className="block truncate text-[11px] text-muted-foreground tabular-nums">
              {locale === "ar" ? "قيد افتتاحي" : "Opening entry"}: {row.openingAccountingEntryNumber}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "type",
      label: t.accountType,
      className: "w-[150px]",
      render: (row) => <TypeBadge value={row.type} label={accountTypeLabel(row.type, locale)} />,
    },
    {
      key: "balance",
      label: t.balance,
      className: "w-[170px]",
      render: (row) => <MoneyValue value={row.currentBalance} label={t.sar} />,
    },
    {
      key: "bank",
      label: t.bank,
      className: "w-[240px]",
      render: (row) => (
        <div className="min-w-0">
          <span className="block truncate text-sm text-muted-foreground">{row.bankName || "—"}</span>
          <span className="block truncate text-xs text-muted-foreground tabular-nums">{row.iban || row.bankAccountNumber || "—"}</span>
        </div>
      ),
    },
    {
      key: "status",
      label: t.status,
      className: "w-[160px]",
      render: (row) => <StatusBadge value={row.status} label={statusLabel(row.status, locale)} />,
    },
    {
      key: "default",
      label: t.defaultAccount,
      className: "w-[130px]",
      render: (row) =>
        row.isDefault ? (
          <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/5 text-xs text-primary">
            {t.defaultAccount}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
  ];
  const transactionColumns: DataColumn<TreasuryTransactionRecord>[] = [
    {
      key: "date",
      label: t.date,
      className: "w-[140px]",
      render: (row) => <span className="text-sm tabular-nums text-muted-foreground">{formatDate(row.date)}</span>,
    },
    {
      key: "number",
      label: t.transactionNo,
      className: "w-[190px]",
      render: (row) => (
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{row.number || t.unknown}</span>
          <span className="block truncate text-xs text-muted-foreground">{row.reference || "—"}</span>
        </div>
      ),
    },
    {
      key: "account",
      label: t.account,
      className: "w-[230px]",
      render: (row) => (
        <div className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">{row.accountName || "—"}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {row.counterpartyName ? `${transactionTypeLabel("transfer", locale)}: ${row.counterpartyName}` : row.accountCode || "—"}
          </span>
          {row.accountingAccountCode ? (
            <span className="block truncate text-[11px] text-muted-foreground tabular-nums">
              {row.accountingAccountCode} — {row.accountingAccountName || (locale === "ar" ? "حساب محاسبي" : "Accounting account")}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "source",
      label: t.source,
      className: "w-[190px]",
      render: (row) => (
        <div className="min-w-0">
          <TypeBadge value={row.type} label={transactionTypeLabel(row.type, locale)} />
          <span className="mt-1 block truncate text-xs text-muted-foreground">{row.sourceLabel}</span>
        </div>
      ),
    },
    {
      key: "amount",
      label: t.amount,
      className: "w-[160px]",
      render: (row) => <MoneyValue value={row.amount} label={t.sar} />,
    },
    {
      key: "status",
      label: t.status,
      className: "w-[140px]",
      render: (row) => <StatusBadge value={row.status} label={statusLabel(row.status, locale)} />,
    },
    {
      key: "accounting",
      label: t.accounting,
      className: "w-[170px]",
      render: (row) => (
        <div className="min-w-0">
          <span className="block truncate text-sm text-muted-foreground">
            {row.accountingEntryNumber || "—"}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {row.isAccountingPosted ? t.posted : row.accountingEntryStatus || "—"}
          </span>
        </div>
      ),
    },
  ];
  function buildExportSections() {
    return [
      {
        title: t.latestAccounts,
        headers: [
          t.account,
          t.accountType,
          t.balance,
          t.status,
          t.bank,
          locale === "ar" ? "الحساب المحاسبي" : "Accounting account",
          locale === "ar" ? "قيد افتتاحي" : "Opening entry",
        ],
        rows: filteredAccounts.map((row) => [
          `${row.code} — ${row.name}`,
          accountTypeLabel(row.type, locale),
          formatMoney(row.currentBalance),
          statusLabel(row.status, locale),
          row.bankName || row.iban || "—",
          row.accountingAccountCode
            ? `${row.accountingAccountCode} — ${row.accountingAccountName || ""}`
            : "—",
          row.openingAccountingEntryNumber || "—",
        ]),
      },
      {
        title: t.latestTransactions,
        headers: [
          t.date,
          t.transactionNo,
          t.account,
          locale === "ar" ? "الحساب المحاسبي" : "Accounting account",
          t.source,
          t.amount,
          t.status,
        ],
        rows: filteredTransactions.map((row) => [
          formatDate(row.date),
          row.number,
          row.accountName,
          row.accountingAccountCode
            ? `${row.accountingAccountCode} — ${row.accountingAccountName || ""}`
            : "—",
          `${transactionTypeLabel(row.type, locale)} / ${row.sourceLabel}`,
          formatMoney(row.amount),
          statusLabel(row.status, locale),
        ]),
      },
    ];
  }
  function exportExcel() {
    const sections = buildExportSections();
    const totalRows = sections.reduce((sum, section) => sum + section.rows.length, 0);
    if (!totalRows) {
      toast.warning(t.exportEmpty);
      return;
    }
    const html = `
      <html dir="${dir}" lang="${locale}">
        <head><meta charset="utf-8" /></head>
        <body>
          <h1>${escapeHtml(t.title)}</h1>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</p>
          <p>${escapeHtml(companyName || t.unknown)}</p>
          ${tableHtmlForSections(sections)}
        </body>
      </html>
    `;
    const blob = new Blob(["\uFEFF", html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `company-treasury-dashboard-${new Date().toISOString().slice(0, 10)}.xls`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success(t.export);
  }
  function printPage() {
    if (!filteredAccounts.length && !filteredTransactions.length) {
      toast.warning(t.printEmpty);
      return;
    }
    window.print();
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
    <main dir={dir} className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1 text-start">
            <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {t.title}
            </h1>
            <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
              {t.subtitle}
            </p>
            <nav
              aria-label={t.moduleBadge}
              className="flex flex-wrap items-center gap-5 pt-2"
            >
              <Link
                href="/company/treasury"
                aria-current="page"
                className="border-b-2 border-foreground pb-1 text-sm font-semibold text-foreground"
              >
                {locale === "ar"
                  ? "الخزينة"
                  : "Treasury"}
              </Link>
              <Link
                href="/company/treasury/cashboxes"
                className="border-b-2 border-transparent pb-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {locale === "ar"
                  ? "الصناديق"
                  : "Cashboxes"}
              </Link>
              <Link
                href="/company/treasury/bank-accounts"
                className="border-b-2 border-transparent pb-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {locale === "ar"
                  ? "الحسابات البنكية"
                  : "Bank accounts"}
              </Link>
            </nav>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void loadDashboard({
                  silent: true,
                })
              }
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t.refresh}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={exportExcel}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t.export}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={printPage}
            >
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>
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
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4 sm:px-6">
              <CardTitle className="text-base">{t.shortcutsTitle}</CardTitle>
              <CardDescription>{t.shortcutsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 px-5 pb-5 sm:px-6">
              {shortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={`${item.href}-${item.titleEn}`}
                    href={item.href}
                    className="group flex items-center justify-between gap-4 rounded-lg border bg-background p-4 transition hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-sm"
                  >
                    <div className="flex w-full items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="rounded-lg border bg-background p-2.5 text-muted-foreground transition group-hover:border-foreground/20 group-hover:text-foreground">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                              {locale === "ar" ? item.titleAr : item.titleEn}
                            </h3>
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
          <Card className="rounded-lg border bg-card shadow-none">
            <CardHeader className="px-5 py-4 sm:px-6">
              <CardTitle className="text-base">{t.summaryTitle}</CardTitle>
              <CardDescription>{t.summaryDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5 sm:px-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{t.activeAccounts}</p>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground"><ShieldCheck className="h-4 w-4" /></span>
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums">{formatInteger(stats.activeAccounts)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.accounts}: {formatInteger(stats.totalAccounts)}</p>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{t.draftTransactions}</p>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground"><FileText className="h-4 w-4" /></span>
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums">{formatInteger(stats.draftTransactions)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.transactions}</p>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{t.postedTransactions}</p>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground"><CheckCircle2 className="h-4 w-4" /></span>
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums">{formatInteger(stats.postedTransactions)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.posted}</p>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{t.cancelledTransactions}</p>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground"><TriangleAlert className="h-4 w-4" /></span>
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums">{formatInteger(stats.cancelledTransactions)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.cancelled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 pt-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle>
                  {t.latestAccounts}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t.latestAccountsDesc}
                </CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={exportExcel}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.export}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={printPage}
                >
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={accountSearch}
                    onChange={(event) => setAccountSearch(event.target.value)}
                    placeholder={t.accountSearchPlaceholder}
                    className="h-9 rounded-lg bg-background ps-9 shadow-none"
                  />
                </div>
                <Select value={accountStatus} onValueChange={(value) => setAccountStatus(value as StatusFilter)}>
                  <SelectTrigger className="h-9 rounded-lg bg-background shadow-none sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                    <SelectItem value="all">{t.all}</SelectItem>
                    <SelectItem value="active">{t.active}</SelectItem>
                    <SelectItem value="inactive">{t.inactive}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={accountType} onValueChange={(value) => setAccountType(value as AccountTypeFilter)}>
                  <SelectTrigger className="h-9 rounded-lg bg-background shadow-none sm:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                    {accountTypeFilters.map((item) => (
                      <SelectItem key={item} value={item}>
                        {accountTypeLabel(item, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={accountSort} onValueChange={(value) => setAccountSort(value as SortKey)}>
                  <SelectTrigger className="h-9 rounded-lg bg-background shadow-none sm:w-[170px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                    <SelectItem value="amount_high">{t.amountHigh}</SelectItem>
                    <SelectItem value="amount_low">{t.amountLow}</SelectItem>
                    <SelectItem value="name">{t.nameSort}</SelectItem>
                    <SelectItem value="number">{t.numberSort}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-9 rounded-lg bg-background shadow-none" onClick={resetAccountFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>
            <DataTable
              rows={filteredAccounts}
              allRowsCount={accounts.length}
              columns={accountColumns}
              rowKey={(row) => row.id}
              rowHref={accountDetailHref}
              emptyTitle={t.noDataTitle}
              emptyDescription={t.noDataDesc}
              noResultsTitle={t.noResultsTitle}
              noResultsDescription={t.noResultsDesc}
              hasFilters={hasAccountFilters}
              onReset={resetAccountFilters}
              resetLabel={t.reset}
              showingLabel={t.showing}
              ofLabel={t.of}
              rowsLabel={t.rows}
            />
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
          <CardHeader className="px-5 pt-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle>
                  {t.latestTransactions}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t.latestTransactionsDesc}
                </CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={exportExcel}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {t.export}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={printPage}
                >
                  <Printer className="h-4 w-4" />
                  {t.print}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={transactionSearch}
                    onChange={(event) => setTransactionSearch(event.target.value)}
                    placeholder={t.transactionSearchPlaceholder}
                    className="h-9 rounded-lg bg-background ps-9 shadow-none"
                  />
                </div>
                <Select value={transactionStatus} onValueChange={(value) => setTransactionStatus(value as StatusFilter)}>
                  <SelectTrigger className="h-9 rounded-lg bg-background shadow-none sm:w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                    {statusFilters.map((item) => (
                      <SelectItem key={item} value={item}>
                        {statusLabel(item, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={transactionType} onValueChange={(value) => setTransactionType(value as TransactionTypeFilter)}>
                  <SelectTrigger className="h-9 rounded-lg bg-background shadow-none sm:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                    {transactionTypeFilters.map((item) => (
                      <SelectItem key={item} value={item}>
                        {transactionTypeLabel(item, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DatePickerField
                  label={
                    locale === "ar"
                      ? "من تاريخ"
                      : "From date"
                  }
                  value={transactionDateFrom}
                  onChange={(value) => {
                    setTransactionDateFrom(value);
                    if (
                      transactionDateTo &&
                      value &&
                      value > transactionDateTo
                    ) {
                      setTransactionDateTo(value);
                    }
                  }}
                />
                <DatePickerField
                  label={
                    locale === "ar"
                      ? "إلى تاريخ"
                      : "To date"
                  }
                  value={transactionDateTo}
                  onChange={(value) => {
                    setTransactionDateTo(value);
                    if (
                      transactionDateFrom &&
                      value &&
                      value < transactionDateFrom
                    ) {
                      setTransactionDateFrom(value);
                    }
                  }}
                />
                <Select value={transactionSort} onValueChange={(value) => setTransactionSort(value as SortKey)}>
                  <SelectTrigger className="h-9 rounded-lg bg-background shadow-none sm:w-[160px]">
                    <ArrowUpDown className="h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="oldest">{t.oldest}</SelectItem>
                    <SelectItem value="amount_high">{t.amountHigh}</SelectItem>
                    <SelectItem value="amount_low">{t.amountLow}</SelectItem>
                    <SelectItem value="number">{t.numberSort}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-9 rounded-lg bg-background shadow-none" onClick={resetTransactionFilters}>
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </Button>
              </div>
            </div>
            <DataTable
              rows={filteredTransactions}
              allRowsCount={transactions.length}
              columns={transactionColumns}
              rowKey={(row) => row.id || row.number}
              rowHref={treasuryTransactionDetailHref}
              emptyTitle={t.noDataTitle}
              emptyDescription={t.noDataDesc}
              noResultsTitle={t.noResultsTitle}
              noResultsDescription={t.noResultsDesc}
              hasFilters={hasTransactionFilters}
              onReset={resetTransactionFilters}
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
