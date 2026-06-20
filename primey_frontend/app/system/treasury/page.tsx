"use client";

/* ============================================================
   📂 app/system/treasury/page.tsx
   🧠 Primey Care | Treasury Overview
   ------------------------------------------------------------
   ✅ Approved Products / Customers / Orders operational pattern
   ✅ Real API only:
      GET /api/treasury/accounts/
      GET /api/treasury/transactions/
      GET /api/treasury/cashboxes/
      GET /api/treasury/banks/
   ✅ Treasury KPI cards
   ✅ Operational links for all treasury pages
   ✅ Latest transactions table
   ✅ Search / status / type / account / date / sort
   ✅ Excel .xls HTML Workbook
   ✅ Web Print
   ✅ Skeleton Loading
   ✅ Error / Empty states
   ✅ sonner
   ✅ RTL/LTR through primey-locale
   ✅ SAR icon from /currency/sar.svg
   ✅ No localhost
   ✅ No fake data
============================================================ */

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Banknote,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Landmark,
  Layers3,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  TriangleAlert,
  Wallet,
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
  ok?: boolean;
  success?: boolean;
  count?: number;
  total?: number;
  total_count?: number;
  results?: unknown[];
  items?: unknown[];
  rows?: unknown[];
  data?: unknown;
  summary?: unknown;
  pagination?: unknown;
  choices?: unknown;
  message?: string;
  detail?: string;
  error?: string;
};

type TreasuryAccount = {
  id: string;
  name: string;
  code: string;
  account_type: string;
  account_type_label: string;
  status: string;
  status_label: string;
  current_balance: number;
  opening_balance: number;
  currency: string;
  bank_name: string;
  provider_name: string;
  account_holder_name: string;
  iban: string;
  is_default: boolean;
};

type TreasuryTransaction = {
  id: string;
  transaction_number: string;
  transaction_type: string;
  transaction_type_label: string;
  source: string;
  source_label: string;
  status: string;
  status_label: string;
  transaction_date: string | null;
  treasury_account_id: string;
  treasury_account_name: string;
  destination_account_id: string;
  destination_account_name: string;
  amount: number;
  fees_amount: number;
  net_amount: number;
  currency: string;
  reference: string;
  source_number: string;
  party_name: string;
  description: string;
  balance_applied: boolean;
  created_at: string | null;
};

type DashboardStats = {
  totalAccounts: number;
  activeAccounts: number;
  cashboxes: number;
  banks: number;
  gateways: number;
  wallets: number;
  totalCurrentBalance: number;
  totalOpeningBalance: number;
  totalTransactions: number;
  draftTransactions: number;
  confirmedTransactions: number;
  cancelledTransactions: number;
  incomeTotal: number;
  expenseTotal: number;
  transferTotal: number;
  feesTotal: number;
  grossTotal: number;
  netTotal: number;
  netOperationalAmount: number;
  currency: string;
};

type StatusFilter = "all" | "draft" | "confirmed" | "cancelled";
type TypeFilter =
  | "all"
  | "income"
  | "expense"
  | "transfer"
  | "deposit"
  | "withdraw"
  | "opening_balance"
  | "refund"
  | "fee"
  | "adjustment";
type SortKey =
  | "newest"
  | "oldest"
  | "amount_high"
  | "amount_low"
  | "number";

type LinkItem = {
  titleKey:
    | "accounts"
    | "cashboxes"
    | "banks"
    | "transactions"
    | "createTransaction"
    | "statement"
    | "transfers"
    | "vouchers"
    | "receiptVoucher"
    | "paymentVoucher"
    | "reports"
    | "settings";
  descKey:
    | "accountsDesc"
    | "cashboxesDesc"
    | "banksDesc"
    | "transactionsDesc"
    | "createTransactionDesc"
    | "statementDesc"
    | "transfersDesc"
    | "vouchersDesc"
    | "receiptVoucherDesc"
    | "paymentVoucherDesc"
    | "reportsDesc"
    | "settingsDesc";
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const API = {
  accounts: "/api/treasury/accounts/",
  transactions: "/api/treasury/transactions/",
  cashboxes: "/api/treasury/cashboxes/",
  banks: "/api/treasury/banks/",
};

const OPERATION_LINKS: LinkItem[] = [
  {
    titleKey: "accounts",
    descKey: "accountsDesc",
    href: "/system/treasury",
    icon: WalletCards,
  },
  {
    titleKey: "cashboxes",
    descKey: "cashboxesDesc",
    href: "/system/treasury/cashboxes",
    icon: Wallet,
  },
  {
    titleKey: "banks",
    descKey: "banksDesc",
    href: "/system/treasury/banks",
    icon: Landmark,
  },
  {
    titleKey: "transactions",
    descKey: "transactionsDesc",
    href: "/system/treasury/transactions",
    icon: ReceiptText,
  },
  {
    titleKey: "createTransaction",
    descKey: "createTransactionDesc",
    href: "/system/treasury/transactions/create",
    icon: CircleDollarSign,
  },
  {
    titleKey: "statement",
    descKey: "statementDesc",
    href: "/system/treasury/statement",
    icon: FileText,
  },
  {
    titleKey: "transfers",
    descKey: "transfersDesc",
    href: "/system/treasury/transfers",
    icon: Layers3,
  },
  {
    titleKey: "vouchers",
    descKey: "vouchersDesc",
    href: "/system/treasury/vouchers",
    icon: ClipboardList,
  },
  {
    titleKey: "receiptVoucher",
    descKey: "receiptVoucherDesc",
    href: "/system/treasury/vouchers/receipt",
    icon: Banknote,
  },
  {
    titleKey: "paymentVoucher",
    descKey: "paymentVoucherDesc",
    href: "/system/treasury/vouchers/payment",
    icon: CreditCard,
  },
  {
    titleKey: "reports",
    descKey: "reportsDesc",
    href: "/system/treasury/reports",
    icon: FileSpreadsheet,
  },
  {
    titleKey: "settings",
    descKey: "settingsDesc",
    href: "/system/treasury/settings",
    icon: Settings,
  },
];

const translations = {
  ar: {
    title: "الخزينة",
    subtitle:
      "لوحة تشغيلية لمتابعة الصناديق، البنوك، الأرصدة، الحركات، التحويلات، والسندات المالية.",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    open: "فتح",
    all: "الكل",
    from: "من",
    to: "إلى",
    sort: "الترتيب",
    newest: "الأحدث",
    oldest: "الأقدم",
    amountHigh: "الأعلى مبلغًا",
    amountLow: "الأقل مبلغًا",
    numberSort: "رقم الحركة",
    showing: "عرض",
    of: "من",
    rows: "صفوف",

    totalBalance: "إجمالي الأرصدة",
    openingBalance: "الرصيد الافتتاحي",
    totalAccounts: "حسابات الخزينة",
    activeAccounts: "الحسابات النشطة",
    cashboxes: "الصناديق",
    banks: "البنوك",
    gateways: "بوابات الدفع",
    wallets: "المحافظ",
    transactionsCount: "الحركات",
    confirmedTransactions: "المؤكدة",
    draftTransactions: "المسودات",
    cancelledTransactions: "الملغاة",
    incomeTotal: "المقبوضات",
    expenseTotal: "المصروفات",
    transferTotal: "التحويلات",
    feesTotal: "الرسوم",
    netTotal: "الصافي",
    netOperationalAmount: "الصافي التشغيلي",

    accounts: "حسابات الخزينة",
    cashboxesLink: "الصناديق",
    banksLink: "البنوك",
    cashboxesMenu: "الصناديق",
    banksMenu: "البنوك",
    cashboxesDesc: "إدارة صناديق النقد وأرصدة الكاش.",
    banksDesc: "إدارة الحسابات البنكية وربطها المحاسبي.",
    accountsDesc: "إدارة كل حسابات الخزينة والبنوك والبوابات والمحافظ.",
    transactions: "حركات الخزينة",
    transactionsDesc: "استعراض وتصفية كل الحركات المالية.",
    createTransaction: "إنشاء حركة",
    createTransactionDesc: "تسجيل حركة خزينة جديدة.",
    statement: "كشف الخزينة",
    statementDesc: "كشف حساب للصناديق والبنوك حسب الفترة.",
    transfers: "التحويلات",
    transfersDesc: "إدارة التحويل بين حسابات الخزينة.",
    vouchers: "السندات",
    vouchersDesc: "إدارة سندات القبض والصرف.",
    receiptVoucher: "سند قبض",
    receiptVoucherDesc: "إنشاء وإدارة سندات القبض.",
    paymentVoucher: "سند صرف",
    paymentVoucherDesc: "إنشاء وإدارة سندات الصرف.",
    reports: "تقارير الخزينة",
    reportsDesc: "تقارير الأرصدة والحركات والتحصيل.",
    settings: "إعدادات الخزينة",
    settingsDesc: "إعدادات الحسابات والسياسات المالية.",

    operationLinks: "روابط الخزينة التشغيلية",
    operationLinksDesc: "وصول مباشر لصفحات الخزينة حسب النمط المعتمد.",
    latestTransactions: "آخر حركات الخزينة",
    latestTransactionsDesc: "أحدث الحركات المالية مع حالة التأكيد وأثر الرصيد.",

    searchPlaceholder: "ابحث برقم الحركة أو الحساب أو الطرف أو الوصف...",
    status: "الحالة",
    type: "نوع الحركة",
    account: "الحساب",
    date: "التاريخ",
    transactionNumber: "رقم الحركة",
    source: "المصدر",
    party: "الطرف",
    description: "الوصف",
    amount: "المبلغ",
    fees: "الرسوم",
    netAmount: "الصافي",
    balanceApplied: "أثر الرصيد",

    draft: "مسودة",
    confirmed: "مؤكدة",
    cancelled: "ملغاة",
    income: "قبض",
    expense: "صرف",
    transfer: "تحويل",
    deposit: "إيداع",
    withdraw: "سحب",
    openingBalanceType: "رصيد افتتاحي",
    refund: "استرداد",
    fee: "رسوم",
    adjustment: "تسوية",
    applied: "مطبق",
    notApplied: "غير مطبق",

    errorTitle: "تعذر تحميل بيانات الخزينة",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    refreshed: "تم تحديث لوحة الخزينة.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير لوحة الخزينة",
    generatedAt: "تاريخ الطباعة",
    noDataTitle: "لا توجد حركات خزينة",
    noDataDesc: "ستظهر أحدث حركات الخزينة هنا بعد تسجيلها.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    sar: "ر.س",
    notAvailable: "—",
  },
  en: {
    title: "Treasury",
    subtitle:
      "Operational treasury dashboard for cashboxes, banks, balances, transactions, transfers, and vouchers.",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    open: "Open",
    all: "All",
    from: "From",
    to: "To",
    sort: "Sort",
    newest: "Newest",
    oldest: "Oldest",
    amountHigh: "Highest amount",
    amountLow: "Lowest amount",
    numberSort: "Transaction number",
    showing: "Showing",
    of: "of",
    rows: "rows",

    totalBalance: "Total balances",
    openingBalance: "Opening balance",
    totalAccounts: "Treasury accounts",
    activeAccounts: "Active accounts",
    cashboxes: "Cashboxes",
    banks: "Banks",
    gateways: "Payment gateways",
    wallets: "Wallets",
    transactionsCount: "Transactions",
    confirmedTransactions: "Confirmed",
    draftTransactions: "Draft",
    cancelledTransactions: "Cancelled",
    incomeTotal: "Income",
    expenseTotal: "Expenses",
    transferTotal: "Transfers",
    feesTotal: "Fees",
    netTotal: "Net total",
    netOperationalAmount: "Operational net",

    accounts: "Treasury accounts",
    cashboxesLink: "Cashboxes",
    banksLink: "Banks",
    cashboxesMenu: "Cashboxes",
    banksMenu: "Banks",
    cashboxesDesc: "Manage cashboxes and cash balances.",
    banksDesc: "Manage bank accounts and accounting linking.",
    accountsDesc: "Manage all treasury accounts, banks, gateways, and wallets.",
    transactions: "Treasury transactions",
    transactionsDesc: "Review and filter all financial transactions.",
    createTransaction: "Create transaction",
    createTransactionDesc: "Record a new treasury transaction.",
    statement: "Treasury statement",
    statementDesc: "Cashbox and bank statement by date range.",
    transfers: "Transfers",
    transfersDesc: "Manage transfers between treasury accounts.",
    vouchers: "Vouchers",
    vouchersDesc: "Manage receipt and payment vouchers.",
    receiptVoucher: "Receipt voucher",
    receiptVoucherDesc: "Create and manage receipt vouchers.",
    paymentVoucher: "Payment voucher",
    paymentVoucherDesc: "Create and manage payment vouchers.",
    reports: "Treasury reports",
    reportsDesc: "Balance, movement, and collection reports.",
    settings: "Treasury settings",
    settingsDesc: "Account and financial policy settings.",

    operationLinks: "Operational treasury links",
    operationLinksDesc: "Direct access to treasury pages using the approved pattern.",
    latestTransactions: "Latest treasury transactions",
    latestTransactionsDesc: "Recent financial transactions with confirmation and balance status.",

    searchPlaceholder: "Search by transaction number, account, party, or description...",
    status: "Status",
    type: "Transaction type",
    account: "Account",
    date: "Date",
    transactionNumber: "Transaction number",
    source: "Source",
    party: "Party",
    description: "Description",
    amount: "Amount",
    fees: "Fees",
    netAmount: "Net amount",
    balanceApplied: "Balance impact",

    draft: "Draft",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    income: "Income",
    expense: "Expense",
    transfer: "Transfer",
    deposit: "Deposit",
    withdraw: "Withdraw",
    openingBalanceType: "Opening balance",
    refund: "Refund",
    fee: "Fee",
    adjustment: "Adjustment",
    applied: "Applied",
    notApplied: "Not applied",

    errorTitle: "Unable to load treasury data",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    refreshed: "Treasury dashboard refreshed.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Treasury dashboard report",
    generatedAt: "Generated at",
    noDataTitle: "No treasury transactions",
    noDataDesc: "Latest treasury transactions will appear here once recorded.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    sar: "SAR",
    notAvailable: "—",
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

    if (["1", "true", "yes", "on", "active", "confirmed"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off", "inactive", "draft", "cancelled"].includes(normalized)) {
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

function extractData(payload: ApiResponse | null) {
  return asRecord(payload?.data);
}

function extractSummary(payload: ApiResponse | null) {
  const data = extractData(payload);
  return asRecord(payload?.summary || data.summary);
}

function extractItems(payload: ApiResponse | null) {
  if (!payload) return [];

  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.rows)) return payload.rows;

  const data = extractData(payload);

  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.accounts)) return data.accounts;
  if (Array.isArray(data.transactions)) return data.transactions;

  return [];
}

function normalizeAccount(value: unknown): TreasuryAccount {
  const item = asRecord(value);

  return {
    id: normalizeText(item.id || item.pk || item.uuid),
    name: normalizeText(item.name || item.title),
    code: normalizeText(item.code || item.number),
    account_type: normalizeText(item.account_type || item.type),
    account_type_label: normalizeText(item.account_type_label || item.type_label),
    status: normalizeText(item.status || "active"),
    status_label: normalizeText(item.status_label),
    current_balance: toNumber(item.current_balance || item.balance),
    opening_balance: toNumber(item.opening_balance),
    currency: normalizeText(item.currency || "SAR"),
    bank_name: normalizeText(item.bank_name),
    provider_name: normalizeText(item.provider_name),
    account_holder_name: normalizeText(item.account_holder_name),
    iban: normalizeText(item.iban),
    is_default: toBoolean(item.is_default),
  };
}

function normalizeTransaction(value: unknown): TreasuryTransaction {
  const item = asRecord(value);
  const account = asRecord(item.treasury_account);
  const destination = asRecord(item.destination_account);

  return {
    id: normalizeText(item.id || item.pk || item.uuid),
    transaction_number: normalizeText(item.transaction_number || item.number || item.reference),
    transaction_type: normalizeText(item.transaction_type || item.type),
    transaction_type_label: normalizeText(item.transaction_type_label || item.type_label),
    source: normalizeText(item.source),
    source_label: normalizeText(item.source_label),
    status: normalizeText(item.status || "draft"),
    status_label: normalizeText(item.status_label),
    transaction_date:
      normalizeText(item.transaction_date || item.date || item.created_at) || null,
    treasury_account_id: normalizeText(item.treasury_account_id || account.id || account.pk),
    treasury_account_name: normalizeText(account.name || item.treasury_account_name),
    destination_account_id: normalizeText(item.destination_account_id || destination.id || destination.pk),
    destination_account_name: normalizeText(destination.name || item.destination_account_name),
    amount: toNumber(item.amount),
    fees_amount: toNumber(item.fees_amount),
    net_amount: toNumber(item.net_amount || item.amount),
    currency: normalizeText(item.currency || "SAR"),
    reference: normalizeText(item.reference || item.external_reference),
    source_number: normalizeText(item.source_number),
    party_name: normalizeText(item.party_name),
    description: normalizeText(item.description || item.notes),
    balance_applied: toBoolean(item.balance_applied),
    created_at: normalizeText(item.created_at) || null,
  };
}

function buildStats(
  accountsPayload: ApiResponse | null,
  transactionsPayload: ApiResponse | null,
  accounts: TreasuryAccount[],
  transactions: TreasuryTransaction[],
): DashboardStats {
  const accountSummary = extractSummary(accountsPayload);
  const transactionSummary = extractSummary(transactionsPayload);

  const totalCurrentBalance =
    toNumber(accountSummary.total_current_balance) ||
    accounts.reduce((sum, account) => sum + account.current_balance, 0);

  const totalOpeningBalance =
    toNumber(accountSummary.total_opening_balance) ||
    accounts.reduce((sum, account) => sum + account.opening_balance, 0);

  return {
    totalAccounts: toNumber(accountSummary.total_accounts, accounts.length),
    activeAccounts: toNumber(
      accountSummary.active_accounts,
      accounts.filter((account) => account.status === "active").length,
    ),
    cashboxes: toNumber(
      accountSummary.cashbox_accounts,
      accounts.filter((account) => account.account_type === "cashbox").length,
    ),
    banks: toNumber(
      accountSummary.bank_accounts,
      accounts.filter((account) => account.account_type === "bank").length,
    ),
    gateways: toNumber(
      accountSummary.gateway_accounts,
      accounts.filter((account) => account.account_type === "gateway").length,
    ),
    wallets: toNumber(
      accountSummary.wallet_accounts,
      accounts.filter((account) => account.account_type === "wallet").length,
    ),
    totalCurrentBalance,
    totalOpeningBalance,
    totalTransactions: toNumber(transactionSummary.total_transactions, transactions.length),
    draftTransactions: toNumber(
      transactionSummary.draft_transactions,
      transactions.filter((txn) => txn.status === "draft").length,
    ),
    confirmedTransactions: toNumber(
      transactionSummary.confirmed_transactions,
      transactions.filter((txn) => txn.status === "confirmed").length,
    ),
    cancelledTransactions: toNumber(
      transactionSummary.cancelled_transactions,
      transactions.filter((txn) => txn.status === "cancelled").length,
    ),
    incomeTotal: toNumber(transactionSummary.income_total),
    expenseTotal: toNumber(transactionSummary.expense_total),
    transferTotal: toNumber(transactionSummary.transfer_total),
    feesTotal: toNumber(transactionSummary.fees_total),
    grossTotal: toNumber(transactionSummary.gross_total),
    netTotal: toNumber(transactionSummary.net_total),
    netOperationalAmount: toNumber(transactionSummary.net_operational_amount),
    currency: normalizeText(accountSummary.currency || transactionSummary.currency || "SAR"),
  };
}

function typeLabel(type: string, locale: Locale) {
  const t = translations[locale];
  const normalized = type.toLowerCase();

  if (normalized === "income") return t.income;
  if (normalized === "expense") return t.expense;
  if (normalized === "transfer") return t.transfer;
  if (normalized === "deposit") return t.deposit;
  if (normalized === "withdraw") return t.withdraw;
  if (normalized === "opening_balance") return t.openingBalanceType;
  if (normalized === "refund") return t.refund;
  if (normalized === "fee") return t.fee;
  if (normalized === "adjustment") return t.adjustment;

  return type || t.notAvailable;
}

function statusLabel(status: string, locale: Locale) {
  const t = translations[locale];
  const normalized = status.toLowerCase();

  if (normalized === "confirmed") return t.confirmed;
  if (normalized === "cancelled") return t.cancelled;

  return t.draft;
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "confirmed") {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (normalized === "cancelled") {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
}

function typeClass(type: string) {
  const normalized = type.toLowerCase();

  if (["income", "deposit", "opening_balance"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (["expense", "withdraw", "refund", "fee"].includes(normalized)) {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (normalized === "transfer") {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  return "border-violet-500/30 bg-violet-50 text-violet-700 hover:bg-violet-50";
}

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", statusClass(status))}
    >
      {statusLabel(status, locale)}
    </Badge>
  );
}

function TypeBadge({ type, locale }: { type: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", typeClass(type))}
    >
      {typeLabel(type, locale)}
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

function PageSkeleton() {
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
        <CardContent className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-lg border bg-card shadow-none">
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function SystemTreasuryPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [accounts, setAccounts] = React.useState<TreasuryAccount[]>([]);
  const [transactions, setTransactions] = React.useState<TreasuryTransaction[]>([]);
  const [stats, setStats] = React.useState<DashboardStats>({
    totalAccounts: 0,
    activeAccounts: 0,
    cashboxes: 0,
    banks: 0,
    gateways: 0,
    wallets: 0,
    totalCurrentBalance: 0,
    totalOpeningBalance: 0,
    totalTransactions: 0,
    draftTransactions: 0,
    confirmedTransactions: 0,
    cancelledTransactions: 0,
    incomeTotal: 0,
    expenseTotal: 0,
    transferTotal: 0,
    feesTotal: 0,
    grossTotal: 0,
    netTotal: 0,
    netOperationalAmount: 0,
    currency: "SAR",
  });

  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const [accountFilter, setAccountFilter] = React.useState("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("newest");

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

        const accountParams = new URLSearchParams({
          page: "1",
          page_size: "200",
          ordering: "account_type",
        });

        const transactionParams = new URLSearchParams({
          page: "1",
          page_size: "200",
          ordering: "-transaction_date",
        });

        if (dateFrom) transactionParams.set("date_from", dateFrom);
        if (dateTo) transactionParams.set("date_to", dateTo);

        const [accountsPayload, transactionsPayload] = await Promise.all([
          fetchJson<ApiResponse>(makeApiUrl(API.accounts, accountParams), controller.signal),
          fetchJson<ApiResponse>(makeApiUrl(API.transactions, transactionParams), controller.signal),
        ]);

        const nextAccounts = extractItems(accountsPayload)
          .map(normalizeAccount)
          .filter((account) => account.id || account.name || account.code);

        const nextTransactions = extractItems(transactionsPayload)
          .map(normalizeTransaction)
          .filter((transaction) => transaction.id || transaction.transaction_number);

        setAccounts(nextAccounts);
        setTransactions(nextTransactions);
        setStats(buildStats(accountsPayload, transactionsPayload, nextAccounts, nextTransactions));

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

  const filteredTransactions = React.useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    let result = transactions.filter((transaction) => {
      const matchesSearch =
        !query ||
        transaction.transaction_number.toLowerCase().includes(query) ||
        transaction.treasury_account_name.toLowerCase().includes(query) ||
        transaction.destination_account_name.toLowerCase().includes(query) ||
        transaction.party_name.toLowerCase().includes(query) ||
        transaction.description.toLowerCase().includes(query) ||
        transaction.reference.toLowerCase().includes(query) ||
        transaction.source_number.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
      const matchesType = typeFilter === "all" || transaction.transaction_type === typeFilter;
      const matchesAccount =
        accountFilter === "all" ||
        transaction.treasury_account_id === accountFilter ||
        transaction.destination_account_id === accountFilter;

      return matchesSearch && matchesStatus && matchesType && matchesAccount;
    });

    result = [...result].sort((a, b) => {
      if (sortKey === "oldest") {
        return String(a.transaction_date || a.created_at || "").localeCompare(
          String(b.transaction_date || b.created_at || ""),
        );
      }

      if (sortKey === "amount_high") return b.net_amount - a.net_amount;
      if (sortKey === "amount_low") return a.net_amount - b.net_amount;
      if (sortKey === "number") return a.transaction_number.localeCompare(b.transaction_number);

      return String(b.transaction_date || b.created_at || "").localeCompare(
        String(a.transaction_date || a.created_at || ""),
      );
    });

    return result.slice(0, 12);
  }, [accountFilter, searchInput, sortKey, statusFilter, transactions, typeFilter]);

  const hasFilters =
    Boolean(searchInput.trim()) ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    accountFilter !== "all" ||
    sortKey !== "newest";

  function resetFilters() {
    setSearchInput("");
    setStatusFilter("all");
    setTypeFilter("all");
    setAccountFilter("all");
    setSortKey("newest");
  }

  function buildExportRows() {
    return filteredTransactions.map((transaction) => ({
      transactionNumber: transaction.transaction_number || t.notAvailable,
      date: formatDate(transaction.transaction_date),
      type: transaction.transaction_type_label || typeLabel(transaction.transaction_type, locale),
      status: transaction.status_label || statusLabel(transaction.status, locale),
      account: transaction.treasury_account_name || t.notAvailable,
      destination: transaction.destination_account_name || t.notAvailable,
      party: transaction.party_name || t.notAvailable,
      source: transaction.source_label || transaction.source || t.notAvailable,
      description: transaction.description || t.notAvailable,
      amount: formatMoney(transaction.amount),
      fees: formatMoney(transaction.fees_amount),
      netAmount: formatMoney(transaction.net_amount),
      balanceApplied: transaction.balance_applied ? t.applied : t.notApplied,
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
          <p>${escapeHtml(t.totalBalance)}: ${escapeHtml(formatMoney(stats.totalCurrentBalance))}</p>
          <p>${escapeHtml(t.transactionsCount)}: ${escapeHtml(stats.totalTransactions)}</p>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.transactionNumber)}</th>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.account)}</th>
                <th>${escapeHtml(t.party)}</th>
                <th>${escapeHtml(t.source)}</th>
                <th>${escapeHtml(t.description)}</th>
                <th>${escapeHtml(t.amount)}</th>
                <th>${escapeHtml(t.fees)}</th>
                <th>${escapeHtml(t.netAmount)}</th>
                <th>${escapeHtml(t.balanceApplied)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.transactionNumber)}</td>
                      <td>${escapeHtml(row.date)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.account)}</td>
                      <td>${escapeHtml(row.party)}</td>
                      <td>${escapeHtml(row.source)}</td>
                      <td>${escapeHtml(row.description)}</td>
                      <td>${escapeHtml(row.amount)}</td>
                      <td>${escapeHtml(row.fees)}</td>
                      <td>${escapeHtml(row.netAmount)}</td>
                      <td>${escapeHtml(row.balanceApplied)}</td>
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
    link.download = `primey-care-treasury-${new Date().toISOString().slice(0, 10)}.xls`;
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
            <div class="box"><span>${escapeHtml(t.totalBalance)}</span><strong>${escapeHtml(formatMoney(stats.totalCurrentBalance))}</strong></div>
            <div class="box"><span>${escapeHtml(t.incomeTotal)}</span><strong>${escapeHtml(formatMoney(stats.incomeTotal))}</strong></div>
            <div class="box"><span>${escapeHtml(t.expenseTotal)}</span><strong>${escapeHtml(formatMoney(stats.expenseTotal))}</strong></div>
            <div class="box"><span>${escapeHtml(t.transactionsCount)}</span><strong>${escapeHtml(stats.totalTransactions)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.transactionNumber)}</th>
                <th>${escapeHtml(t.date)}</th>
                <th>${escapeHtml(t.type)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.account)}</th>
                <th>${escapeHtml(t.party)}</th>
                <th>${escapeHtml(t.source)}</th>
                <th>${escapeHtml(t.amount)}</th>
                <th>${escapeHtml(t.fees)}</th>
                <th>${escapeHtml(t.netAmount)}</th>
                <th>${escapeHtml(t.balanceApplied)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.transactionNumber)}</td>
                      <td>${escapeHtml(row.date)}</td>
                      <td>${escapeHtml(row.type)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.account)}</td>
                      <td>${escapeHtml(row.party)}</td>
                      <td>${escapeHtml(row.source)}</td>
                      <td>${escapeHtml(row.amount)}</td>
                      <td>${escapeHtml(row.fees)}</td>
                      <td>${escapeHtml(row.netAmount)}</td>
                      <td>${escapeHtml(row.balanceApplied)}</td>
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
        <PageSkeleton />
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
          {t.confirmedTransactions}:{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatInteger(stats.confirmedTransactions)}
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalBalance}
          value={<MoneyValue value={stats.totalCurrentBalance} label={t.sar} />}
          trend={`${t.totalAccounts}: ${formatInteger(stats.totalAccounts)}`}
          href="/system/treasury/statement"
          icon={WalletCards}
        />

        <KpiCard
          title={t.cashboxes}
          value={formatInteger(stats.cashboxes)}
          trend={`${t.activeAccounts}: ${formatInteger(stats.activeAccounts)}`}
          href="/system/treasury/cashboxes"
          icon={Wallet}
        />

        <KpiCard
          title={t.banks}
          value={formatInteger(stats.banks)}
          trend={`${t.gateways}: ${formatInteger(stats.gateways)}`}
          href="/system/treasury/banks"
          icon={Landmark}
        />

        <KpiCard
          title={t.transactionsCount}
          value={formatInteger(stats.totalTransactions)}
          trend={`${t.confirmedTransactions}: ${formatInteger(stats.confirmedTransactions)}`}
          href="/system/treasury/transactions"
          icon={ReceiptText}
        />

        <KpiCard
          title={t.incomeTotal}
          value={<MoneyValue value={stats.incomeTotal} label={t.sar} />}
          trend={t.confirmed}
          href="/system/treasury/transactions"
          icon={Banknote}
        />

        <KpiCard
          title={t.expenseTotal}
          value={<MoneyValue value={stats.expenseTotal} label={t.sar} />}
          trend={t.confirmed}
          href="/system/treasury/transactions"
          icon={CreditCard}
        />

        <KpiCard
          title={t.feesTotal}
          value={<MoneyValue value={stats.feesTotal} label={t.sar} />}
          trend={t.fee}
          href="/system/treasury/reports"
          icon={Tags}
        />

        <KpiCard
          title={t.netOperationalAmount}
          value={<MoneyValue value={stats.netOperationalAmount} label={t.sar} />}
          trend={t.netTotal}
          href="/system/treasury/reports"
          icon={CircleDollarSign}
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

      <Card className="rounded-lg border bg-card shadow-none">
        <CardHeader className="px-6 py-5">
          <CardTitle>{t.operationLinks}</CardTitle>
          <CardDescription>{t.operationLinksDesc}</CardDescription>
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

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
        <CardHeader className="px-6 py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>{t.latestTransactions}</CardTitle>
              <CardDescription>{t.latestTransactionsDesc}</CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" className="h-9 rounded-lg bg-background">
                <Link href="/system/treasury/transactions/create">
                  <CircleDollarSign className="h-4 w-4" />
                  {t.createTransaction}
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>

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
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.status}: {t.all}</SelectItem>
                  <SelectItem value="draft">{t.draft}</SelectItem>
                  <SelectItem value="confirmed">{t.confirmed}</SelectItem>
                  <SelectItem value="cancelled">{t.cancelled}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.type}: {t.all}</SelectItem>
                  <SelectItem value="income">{t.income}</SelectItem>
                  <SelectItem value="expense">{t.expense}</SelectItem>
                  <SelectItem value="transfer">{t.transfer}</SelectItem>
                  <SelectItem value="deposit">{t.deposit}</SelectItem>
                  <SelectItem value="withdraw">{t.withdraw}</SelectItem>
                  <SelectItem value="opening_balance">{t.openingBalanceType}</SelectItem>
                  <SelectItem value="refund">{t.refund}</SelectItem>
                  <SelectItem value="fee">{t.fee}</SelectItem>
                  <SelectItem value="adjustment">{t.adjustment}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="h-9 w-full rounded-lg bg-background sm:w-[210px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.account}: {t.all}</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id || account.code} value={account.id || account.code}>
                      {account.code ? `${account.code} — ${account.name}` : account.name}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="newest">{t.newest}</SelectItem>
                  <SelectItem value="oldest">{t.oldest}</SelectItem>
                  <SelectItem value="amount_high">{t.amountHigh}</SelectItem>
                  <SelectItem value="amount_low">{t.amountLow}</SelectItem>
                  <SelectItem value="number">{t.numberSort}</SelectItem>
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
              <Table className="min-w-[1320px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="h-11 w-[155px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.transactionNumber}
                    </TableHead>
                    <TableHead className="h-11 w-[120px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.date}
                    </TableHead>
                    <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.type}
                    </TableHead>
                    <TableHead className="h-11 w-[115px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.status}
                    </TableHead>
                    <TableHead className="h-11 w-[190px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.account}
                    </TableHead>
                    <TableHead className="h-11 w-[145px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.party}
                    </TableHead>
                    <TableHead className="h-11 w-[180px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.description}
                    </TableHead>
                    <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.amount}
                    </TableHead>
                    <TableHead className="h-11 w-[115px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.fees}
                    </TableHead>
                    <TableHead className="h-11 w-[125px] whitespace-nowrap px-4 text-right text-xs font-semibold text-muted-foreground">
                      {t.netAmount}
                    </TableHead>
                    <TableHead className="h-11 w-[110px] whitespace-nowrap px-4 text-center text-xs font-semibold text-muted-foreground">
                      {t.open}
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredTransactions.length ? (
                    filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id || transaction.transaction_number} className="h-[62px]">
                        <TableCell className="h-[62px] w-[155px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm font-semibold text-foreground tabular-nums">
                            {transaction.transaction_number || t.notAvailable}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {transaction.reference || transaction.source_number || t.notAvailable}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[120px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm tabular-nums text-muted-foreground">
                            {formatDate(transaction.transaction_date)}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                          <TypeBadge type={transaction.transaction_type} locale={locale} />
                        </TableCell>

                        <TableCell className="h-[62px] w-[115px] overflow-hidden px-4 text-right align-middle">
                          <StatusBadge status={transaction.status} locale={locale} />
                        </TableCell>

                        <TableCell className="h-[62px] w-[190px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {transaction.treasury_account_name || t.notAvailable}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {transaction.destination_account_name || transaction.source_label || transaction.source || t.notAvailable}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[145px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm text-muted-foreground">
                            {transaction.party_name || t.notAvailable}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[180px] overflow-hidden px-4 text-right align-middle">
                          <span className="block truncate text-sm text-muted-foreground">
                            {transaction.description || t.notAvailable}
                          </span>
                        </TableCell>

                        <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                          <MoneyValue value={transaction.amount} label={t.sar} />
                        </TableCell>

                        <TableCell className="h-[62px] w-[115px] overflow-hidden px-4 text-right align-middle">
                          <MoneyValue value={transaction.fees_amount} label={t.sar} />
                        </TableCell>

                        <TableCell className="h-[62px] w-[125px] overflow-hidden px-4 text-right align-middle">
                          <MoneyValue value={transaction.net_amount} label={t.sar} />
                        </TableCell>

                        <TableCell className="h-[62px] w-[110px] overflow-hidden px-4 text-center align-middle">
                          <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
                            <Link href={`/system/treasury/transactions/${encodeURIComponent(transaction.id)}`}>
                              {t.open}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="h-72">
                        <div className="flex flex-col items-center justify-center gap-3 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
                            <Search className="h-6 w-6 text-muted-foreground" />
                          </div>

                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">
                              {hasFilters ? t.noResultsTitle : t.noDataTitle}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {hasFilters ? t.noResultsDesc : t.noDataDesc}
                            </p>
                          </div>

                          {hasFilters ? (
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
              {formatInteger(filteredTransactions.length)}
            </span>{" "}
            {t.of}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatInteger(transactions.length)}
            </span>{" "}
            {t.rows}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}