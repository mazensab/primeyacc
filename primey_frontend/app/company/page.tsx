"use client";

/* ============================================================
   📂 primey_frontend/app/company/page.tsx
   🧠 PrimeyAcc — Company Dashboard
   ------------------------------------------------------------
   ✅ PrimeyAcc Approved Design
   ✅ Real company APIs only
   ✅ Correct receipt/payment/treasury data
   ✅ Clickable document rows and ⋮ actions
   ✅ Table-level Excel and print actions
   ✅ Shared Calendar filters
   ✅ English digits and SAR icon after the number
   ✅ sonner toast
   ✅ NEXT_PUBLIC_API_URL only
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  CalendarDays,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Landmark,
  Loader2,
  MoreVertical,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  TriangleAlert,
  Users,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
type VoucherKind = "receipt" | "payment";
type VoucherStatus = "draft" | "confirmed" | "cancelled";
type TransactionStatus = "draft" | "posted" | "cancelled";
type TransactionType = "inflow" | "outflow" | "transfer" | "adjustment";
type SortKey = "newest" | "oldest" | "amount_high" | "amount_low" | "number" | "name";
type KindFilter = "all" | VoucherKind;
type TransactionTypeFilter = "all" | TransactionType;

type DashboardStats = {
  salesTotal: number;
  salesInvoices: number;
  receiptTotal: number;
  paymentTotal: number;
  customers: number;
  suppliers: number;
  vouchers: number;
  netFlow: number;
};

type SalesInvoiceRecord = {
  id: string;
  number: string;
  customerName: string;
  status: string;
  amount: number;
  date: string | null;
};

type VoucherRecord = {
  id: string;
  kind: VoucherKind;
  number: string;
  partyName: string;
  partyPhone: string;
  treasuryAccountName: string;
  method: string;
  status: VoucherStatus;
  amount: number;
  date: string | null;
  reference: string;
  transactionNumber: string;
  accountingEntryNumber: string;
};

type TreasuryTransactionRecord = {
  id: string;
  number: string;
  date: string | null;
  accountName: string;
  accountCode: string;
  accountingAccountId: string;
  accountingEntryNumber: string;
  sourceType: string;
  sourceNumber: string;
  reference: string;
  description: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
};

type DataColumn<T> = {
  key: string;
  label: string;
  className?: string;
  render: (row: T) => React.ReactNode;
};

type ExportColumn<T> = {
  label: string;
  value: (row: T) => string | number;
};

const ENDPOINTS = {
  whoami: "/api/auth/whoami/",
  customers: "/api/company/customers/",
  suppliers: "/api/company/suppliers/",
  salesInvoices: "/api/company/sales/invoices/",
  receipts: "/api/company/treasury/customer-payments/",
  payments: "/api/company/treasury/supplier-payments/",
  transactions: "/api/company/treasury/transactions/",
} as const;

const translations = {
  ar: {
    badge: "مساحة الشركة",
    title: "لوحة الشركة",
    subtitle:
      "مركز متابعة الشركة الحالية للمبيعات، العملاء، الموردين، سندات القبض والصرف، وحركات الخزينة.",
    currentCompany: "الشركة الحالية",
    activity: "النشاط",
    unknown: "غير محدد",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    search: "بحث",
    all: "الكل",
    from: "من تاريخ",
    to: "إلى تاريخ",
    newest: "الأحدث",
    oldest: "الأقدم",
    amountHigh: "الأعلى مبلغًا",
    amountLow: "الأقل مبلغًا",
    numberSort: "الرقم",
    nameSort: "الاسم",
    salesTotal: "إجمالي المبيعات",
    salesInvoices: "فواتير المبيعات",
    receiptTotal: "إجمالي المقبوضات",
    paymentTotal: "إجمالي المصروفات",
    customers: "العملاء",
    suppliers: "الموردون",
    vouchers: "إجمالي السندات",
    netFlow: "صافي التدفق",
    salesDesc: "قيمة فواتير المبيعات المتاحة",
    invoicesDesc: "عدد فواتير المبيعات",
    receiptsDesc: "إجمالي سندات القبض",
    paymentsDesc: "إجمالي سندات الصرف",
    customersDesc: "عدد العملاء المسجلين",
    suppliersDesc: "عدد الموردين المسجلين",
    vouchersDesc: "سندات القبض والصرف",
    netFlowDesc: "المقبوضات ناقص المصروفات",
    invoicesTitle: "آخر فواتير المبيعات",
    invoicesSubtitle: "أحدث فواتير المبيعات الخاصة بالشركة الحالية.",
    vouchersTitle: "آخر سندات القبض والصرف",
    vouchersSubtitle: "أحدث السندات المسجلة والمرتبطة بحسابات الخزينة.",
    transactionsTitle: "آخر حركات الخزينة",
    transactionsSubtitle: "أحدث الحركات المرتبطة بالسندات والحسابات والقيود المحاسبية.",
    invoiceSearch: "ابحث برقم الفاتورة أو العميل أو الحالة...",
    voucherSearch: "ابحث برقم السند أو الطرف أو الحساب أو المرجع...",
    transactionSearch: "ابحث برقم الحركة أو الحساب أو المصدر أو المرجع...",
    invoice: "الفاتورة",
    customer: "العميل",
    date: "التاريخ",
    amount: "المبلغ",
    status: "الحالة",
    kind: "النوع",
    voucher: "رقم السند",
    party: "الطرف",
    method: "الطريقة",
    treasuryAccount: "حساب الخزينة",
    transaction: "رقم الحركة",
    source: "المصدر",
    accounting: "المحاسبة",
    actions: "الإجراءات",
    receiptVoucher: "سند قبض",
    paymentVoucher: "سند صرف",
    inflow: "وارد",
    outflow: "صادر",
    transfer: "تحويل",
    adjustment: "تسوية",
    draft: "مسودة",
    confirmed: "مؤكد",
    posted: "مرحل",
    cancelled: "ملغي",
    paid: "مدفوع",
    unpaid: "غير مدفوع",
    partial: "جزئي",
    pending: "معلق",
    active: "نشط",
    inactive: "غير نشط",
    openDetails: "فتح التفاصيل",
    printVoucher: "طباعة السند",
    openSales: "فتح فواتير المبيعات",
    showing: "عرض",
    of: "من",
    rows: "صفوف",
    noInvoices: "لا توجد فواتير مبيعات مسجلة حاليًا.",
    noVouchers: "لا توجد سندات قبض أو صرف مسجلة حاليًا.",
    noTransactions: "لا توجد حركات خزينة مسجلة حاليًا.",
    noResults: "لا توجد نتائج مطابقة للبحث أو الفلاتر الحالية.",
    errorTitle: "تعذر تحميل لوحة الشركة",
    errorDesc: "تأكد من تسجيل الدخول داخل مساحة الشركة ومن تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    partialTitle: "تعذر تحميل بعض السجلات",
    partialDesc: "تم عرض البيانات المتاحة، ويمكن إعادة التحديث لاحقًا.",
    refreshed: "تم تحديث لوحة الشركة.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    exportReady: "تم تجهيز ملف Excel.",
    printReady: "تم تجهيز صفحة الطباعة.",
    printBlocked: "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.",
    generatedAt: "تم الإنشاء في",
    reportTitle: "تقرير لوحة الشركة",
    sar: "ر.س",
  },
  en: {
    badge: "Company workspace",
    title: "Company Dashboard",
    subtitle:
      "Monitor the current company sales, customers, suppliers, receipt and payment vouchers, and treasury movements.",
    currentCompany: "Current company",
    activity: "Activity",
    unknown: "Unknown",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    search: "Search",
    all: "All",
    from: "From date",
    to: "To date",
    newest: "Newest",
    oldest: "Oldest",
    amountHigh: "Highest amount",
    amountLow: "Lowest amount",
    numberSort: "Number",
    nameSort: "Name",
    salesTotal: "Sales total",
    salesInvoices: "Sales invoices",
    receiptTotal: "Total receipts",
    paymentTotal: "Total payments",
    customers: "Customers",
    suppliers: "Suppliers",
    vouchers: "Total vouchers",
    netFlow: "Net cash flow",
    salesDesc: "Available sales invoice value",
    invoicesDesc: "Sales invoice count",
    receiptsDesc: "Receipt voucher total",
    paymentsDesc: "Payment voucher total",
    customersDesc: "Registered customers",
    suppliersDesc: "Registered suppliers",
    vouchersDesc: "Receipt and payment vouchers",
    netFlowDesc: "Receipts minus payments",
    invoicesTitle: "Latest sales invoices",
    invoicesSubtitle: "Newest sales invoices for the current company.",
    vouchersTitle: "Latest receipt and payment vouchers",
    vouchersSubtitle: "Newest vouchers linked to treasury accounts.",
    transactionsTitle: "Latest treasury transactions",
    transactionsSubtitle: "Newest movements linked to vouchers, accounts, and journal entries.",
    invoiceSearch: "Search by invoice number, customer, or status...",
    voucherSearch: "Search by voucher number, party, account, or reference...",
    transactionSearch: "Search by movement number, account, source, or reference...",
    invoice: "Invoice",
    customer: "Customer",
    date: "Date",
    amount: "Amount",
    status: "Status",
    kind: "Type",
    voucher: "Voucher No.",
    party: "Party",
    method: "Method",
    treasuryAccount: "Treasury account",
    transaction: "Movement No.",
    source: "Source",
    accounting: "Accounting",
    actions: "Actions",
    receiptVoucher: "Receipt voucher",
    paymentVoucher: "Payment voucher",
    inflow: "Inflow",
    outflow: "Outflow",
    transfer: "Transfer",
    adjustment: "Adjustment",
    draft: "Draft",
    confirmed: "Confirmed",
    posted: "Posted",
    cancelled: "Cancelled",
    paid: "Paid",
    unpaid: "Unpaid",
    partial: "Partial",
    pending: "Pending",
    active: "Active",
    inactive: "Inactive",
    openDetails: "Open details",
    printVoucher: "Print voucher",
    openSales: "Open sales invoices",
    showing: "Showing",
    of: "of",
    rows: "rows",
    noInvoices: "No sales invoices are currently recorded.",
    noVouchers: "No receipt or payment vouchers are currently recorded.",
    noTransactions: "No treasury movements are currently recorded.",
    noResults: "No records match the current search or filters.",
    errorTitle: "Could not load company dashboard",
    errorDesc: "Make sure you are signed in to the company workspace and the backend is running, then try again.",
    tryAgain: "Try again",
    partialTitle: "Some records could not be loaded",
    partialDesc: "Available data is shown. Refresh again later.",
    refreshed: "Company dashboard refreshed.",
    exportEmpty: "There is no data to export.",
    printEmpty: "There is no data to print.",
    exportReady: "Excel file prepared.",
    printReady: "Print page prepared.",
    printBlocked: "The print window could not be opened. Allow pop-ups and try again.",
    generatedAt: "Generated at",
    reportTitle: "Company Dashboard Report",
    sar: "SAR",
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

function toEnglishDigits(value: unknown) {
  // PRIMEY_ENGLISH_DIGITS_REPORTS_V1
  return String(value ?? "")
    .replace(/[٠-٩]/g, (digit) =>
      String(digit.charCodeAt(0) - "٠".charCodeAt(0)),
    )
    .replace(/[۰-۹]/g, (digit) =>
      String(digit.charCodeAt(0) - "۰".charCodeAt(0)),
    )
    .replaceAll("٫", ".")
    .replaceAll("٬", ",");
}

function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return toEnglishDigits(value).trim() || fallback;
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const normalized = toEnglishDigits(value).replaceAll(",", "");
    const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function formatMoney(value: unknown) {
  return toEnglishDigits(
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numberValue(value)),
  );
}

function reportMoney(value: unknown) {
  /*
   * Print and Excel reports use English digits and numeric values only.
   * No currency abbreviation or currency icon is included.
   */
  return formatMoney(value);
}

function transactionSourceLabel(value: string, locale: Locale) {
  const normalized = value.trim().toUpperCase();

  if (normalized.includes("CUSTOMER_PAYMENT")) {
    return locale === "ar" ? "دفعة عميل" : "Customer payment";
  }

  if (normalized.includes("SUPPLIER_PAYMENT")) {
    return locale === "ar" ? "دفعة مورد" : "Supplier payment";
  }

  if (normalized.includes("TRANSFER")) {
    return locale === "ar" ? "تحويل خزينة" : "Treasury transfer";
  }

  if (normalized.includes("ADJUSTMENT")) {
    return locale === "ar" ? "تسوية خزينة" : "Treasury adjustment";
  }

  return value || "—";
}

function formatInteger(value: unknown) {
  return toEnglishDigits(
    new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(Math.round(numberValue(value))),
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const normalized = toEnglishDigits(value);
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return normalized.slice(0, 10) || "—";
  }

  return parsed.toISOString().slice(0, 10);
}

function reportDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function escapeHtml(value: unknown) {
  return toEnglishDigits(value)
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

function apiBase() {
  const value = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  return value.endsWith("/api") ? value.slice(0, -4) : value;
}

function apiUrl(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return `${apiBase()}${path}${query ? `?${query}` : ""}`;
}

async function fetchJson<T>(path: string, params?: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const response = await fetch(apiUrl(path, params), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();
  let payload: unknown = {};
  if (rawText && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch {
      payload = {};
    }
  }
  if (!response.ok) {
    const record = asRecord(payload);
    throw new Error(
      text(record.message) ||
        text(record.detail) ||
        text(record.error) ||
        `HTTP ${response.status}`,
    );
  }
  return payload as T;
}

function extractArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const visited = new Set<unknown>();
  const walk = (value: unknown, depth = 0): unknown[] => {
    if (Array.isArray(value)) return value;
    if (!isRecord(value) || depth > 6 || visited.has(value)) return [];
    visited.add(value);
    const preferred = [
      value.results,
      value.items,
      value.records,
      value.rows,
      value.data,
      value.result,
      value.payments,
      value.transactions,
      value.invoices,
    ];
    for (const candidate of preferred) {
      if (Array.isArray(candidate)) return candidate;
    }
    for (const candidate of preferred) {
      const nested = walk(candidate, depth + 1);
      if (nested.length) return nested;
    }
    return [];
  };
  return walk(payload);
}

function extractCount(payload: unknown) {
  const record = asRecord(payload);
  const data = asRecord(record.data);
  const meta = asRecord(record.meta);
  const candidates = [
    record.count,
    record.total,
    record.total_count,
    data.count,
    data.total,
    meta.count,
    meta.total,
  ];
  for (const candidate of candidates) {
    const parsed = numberValue(candidate, Number.NaN);
    if (Number.isFinite(parsed)) return parsed;
  }
  return extractArray(payload).length;
}

function getCompanyRecord(payload: unknown) {
  const record = asRecord(payload);
  const candidates = [
    record.company,
    record.current_company,
    record.active_company,
    record.workspace_company,
    record.tenant,
  ];
  for (const candidate of candidates) {
    if (isRecord(candidate)) return candidate;
  }
  return {};
}

function getCompanyName(payload: unknown, fallback: string) {
  const record = asRecord(payload);
  const company = getCompanyRecord(payload);
  return (
    text(company.name || company.legal_name || company.commercial_name) ||
    text(record.company_name || record.current_company_name || record.tenant_name) ||
    fallback
  );
}

function getActivityName(payload: unknown, fallback: string) {
  const record = asRecord(payload);
  const company = getCompanyRecord(payload);
  const activity = company.activity_profile || company.activity || record.activity_profile || record.activity;
  if (typeof activity === "string") return activity;
  const activityRecord = asRecord(activity);
  return text(
    activityRecord.name_ar ||
      activityRecord.name ||
      activityRecord.title ||
      company.activity_name ||
      record.activity_name,
    fallback,
  );
}

function normalizeVoucherStatus(value: unknown): VoucherStatus {
  const normalized = text(value).toUpperCase();
  if (normalized === "CONFIRMED" || normalized === "POSTED") return "confirmed";
  if (normalized === "CANCELLED" || normalized === "CANCELED" || normalized === "REVERSED") {
    return "cancelled";
  }
  return "draft";
}

function normalizeTransactionStatus(value: unknown): TransactionStatus {
  const normalized = text(value).toUpperCase();
  if (normalized === "POSTED" || normalized === "CONFIRMED") return "posted";
  if (normalized === "CANCELLED" || normalized === "CANCELED" || normalized === "REVERSED") {
    return "cancelled";
  }
  return "draft";
}

function normalizeTransactionType(value: unknown): TransactionType {
  const normalized = text(value).toUpperCase();
  if (normalized === "OUTFLOW") return "outflow";
  if (normalized === "TRANSFER") return "transfer";
  if (normalized === "ADJUSTMENT") return "adjustment";
  return "inflow";
}

function normalizeInvoice(value: unknown): SalesInvoiceRecord {
  const record = asRecord(value);
  const customer = asRecord(record.customer || record.party || record.client);
  return {
    id: text(record.id || record.uuid || record.pk || record.invoice_number || record.number),
    number: text(record.invoice_number || record.number || record.code || record.reference, "—"),
    customerName:
      text(record.customer_name || record.party_name || record.client_name) ||
      text(customer.name || customer.display_name || customer.full_name, "—"),
    status: text(record.status || record.state || record.payment_status, "draft").toLowerCase(),
    amount: numberValue(
      record.total_amount || record.grand_total || record.net_total || record.total || record.amount,
    ),
    date:
      text(record.issue_date || record.invoice_date || record.date || record.created_at) || null,
  };
}

function normalizeVoucher(value: unknown, kind: VoucherKind): VoucherRecord {
  const record = asRecord(value);
  const isReceipt = kind === "receipt";
  return {
    id: `${kind}-${text(record.id || record.pk || record.uuid || record.payment_number)}`,
    kind,
    number: text(record.payment_number || record.number || record.reference, "—"),
    partyName: text(isReceipt ? record.customer_name : record.supplier_name, "—"),
    partyPhone: text(isReceipt ? record.customer_phone : record.supplier_phone),
    treasuryAccountName: text(record.treasury_account_name, "—"),
    method: text(record.payment_method_label || record.payment_method, "—"),
    status: normalizeVoucherStatus(record.status),
    amount: numberValue(record.amount),
    date: text(record.payment_date || record.date || record.created_at) || null,
    reference: text(record.reference),
    transactionNumber: text(record.treasury_transaction_number),
    accountingEntryNumber: text(record.accounting_entry_number),
  };
}

function normalizeTransaction(value: unknown): TreasuryTransactionRecord {
  const record = asRecord(value);
  const account = asRecord(record.account || record.treasury_account);
  return {
    id: text(record.id || record.uuid || record.pk || record.transaction_number),
    number: text(record.transaction_number || record.number || record.reference, "—"),
    date: text(record.transaction_date || record.date || record.created_at) || null,
    accountName: text(record.account_name || account.name, "—"),
    accountCode: text(record.account_code || account.code),
    accountingAccountId: text(
      record.accounting_account_id || account.accounting_account_id || asRecord(account.accounting_account).id,
    ),
    accountingEntryNumber: text(record.accounting_entry_number),
    sourceType: text(record.source_type),
    sourceNumber: text(
      record.source_number || record.payment_number || record.voucher_number || record.source_reference,
    ),
    reference: text(record.reference),
    description: text(record.description || record.notes),
    type: normalizeTransactionType(record.transaction_type || record.type),
    status: normalizeTransactionStatus(record.status),
    amount: numberValue(record.amount),
  };
}

function statusLabel(value: string, locale: Locale) {
  const t = translations[locale];
  const normalized = value.toLowerCase();
  if (normalized === "confirmed") return t.confirmed;
  if (normalized === "posted") return t.posted;
  if (normalized === "cancelled" || normalized === "canceled" || normalized === "reversed") return t.cancelled;
  if (normalized === "paid") return t.paid;
  if (normalized === "unpaid") return t.unpaid;
  if (normalized === "partial") return t.partial;
  if (normalized === "pending") return t.pending;
  if (normalized === "active") return t.active;
  if (normalized === "inactive") return t.inactive;
  return t.draft;
}

function transactionTypeLabel(value: TransactionType, locale: Locale) {
  const t = translations[locale];
  if (value === "outflow") return t.outflow;
  if (value === "transfer") return t.transfer;
  if (value === "adjustment") return t.adjustment;
  return t.inflow;
}

function badgeClass(value: string) {
  const normalized = value.toLowerCase();
  if (["confirmed", "posted", "paid", "active", "inflow"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["draft", "pending", "partial", "unpaid", "transfer", "adjustment"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["cancelled", "canceled", "reversed", "inactive", "outflow"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-border bg-muted/30 text-muted-foreground";
}

function rowTime(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function isWithinDate(value: string | null, from: string, to: string) {
  const normalized = formatDate(value);
  if (normalized === "—") return !from && !to;
  if (from && normalized < from) return false;
  if (to && normalized > to) return false;
  return true;
}

function sortRows<T>(
  rows: T[],
  sort: SortKey,
  getDate: (row: T) => string | null,
  getAmount: (row: T) => number,
  getNumber: (row: T) => string,
  getName: (row: T) => string,
) {
  return [...rows].sort((a, b) => {
    if (sort === "oldest") return rowTime(getDate(a)) - rowTime(getDate(b));
    if (sort === "amount_high") return getAmount(b) - getAmount(a);
    if (sort === "amount_low") return getAmount(a) - getAmount(b);
    if (sort === "number") return getNumber(a).localeCompare(getNumber(b), undefined, { numeric: true });
    if (sort === "name") return getName(a).localeCompare(getName(b));
    return rowTime(getDate(b)) - rowTime(getDate(a));
  });
}

function parseIsoDate(value: string) {
  if (!value) return undefined;

  const normalized = toEnglishDigits(value);
  const [year, month, day] = normalized
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!year || !month || !day) return undefined;

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
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
  locale,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full justify-start bg-background px-3 text-start font-normal shadow-none sm:w-[150px]"
        >
          <CalendarDays className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <span dir="ltr" lang="en" className="truncate tabular-nums">
            {value || label}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={locale === "ar" ? "end" : "start"}>
        <Calendar
          mode="single"
          selected={parseIsoDate(value)}
          onSelect={(date: Date | undefined) => {
            onChange(dateToIso(date));
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
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
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs", badgeClass(value))}
    >
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
  currencyLabel,
}: {
  title: string;
  value: number;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  money?: boolean;
  currencyLabel: string;
}) {
  return (
    <Card className="group overflow-hidden rounded-lg border bg-card shadow-none transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm">
      <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
          <div className="min-w-0">
            <CardDescription className="truncate text-sm">{title}</CardDescription>
            <CardTitle className="mt-2 text-2xl font-bold tracking-tight tabular-nums">
              {money ? <MoneyValue value={value} label={currencyLabel} /> : formatInteger(value)}
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
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-full max-w-3xl" />
          <Skeleton className="h-7 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="rounded-lg border shadow-none">
            <CardHeader>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="rounded-lg border shadow-none">
          <CardHeader>
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-80" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({
  textValue,
  filtered,
  onReset,
  resetLabel,
}: {
  textValue: string;
  filtered: boolean;
  onReset: () => void;
  resetLabel: string;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="rounded-full bg-muted p-4 text-muted-foreground">
        <Search className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold">{textValue}</p>
      {filtered ? (
        <Button variant="outline" size="sm" onClick={onReset}>
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
  placeholder,
  status,
  onStatusChange,
  statusOptions,
  kind,
  onKindChange,
  kindOptions,
  sort,
  onSortChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onReset,
  locale,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  status: string;
  onStatusChange: (value: string) => void;
  statusOptions: Array<{ value: string; label: string }>;
  kind?: string;
  onKindChange?: (value: string) => void;
  kindOptions?: Array<{ value: string; label: string }>;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  onReset: () => void;
  locale: Locale;
}) {
  const t = translations[locale];
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-2 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          className="h-9 bg-background ps-9 shadow-none"
        />
      </div>
      {kindOptions?.length && onKindChange ? (
        <Select value={kind || "all"} onValueChange={onKindChange}>
          <SelectTrigger className="h-9 w-full bg-background shadow-none sm:w-[145px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {kindOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="h-9 w-full bg-background shadow-none sm:w-[145px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DatePickerField label={t.from} value={dateFrom} onChange={onDateFromChange} locale={locale} />
      <DatePickerField label={t.to} value={dateTo} onChange={onDateToChange} locale={locale} />
      <Select value={sort} onValueChange={(value: string) => onSortChange(value as SortKey)}>
        <SelectTrigger className="h-9 w-full bg-background shadow-none sm:w-[145px]">
          <ArrowUpDown className="me-2 h-4 w-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">{t.newest}</SelectItem>
          <SelectItem value="oldest">{t.oldest}</SelectItem>
          <SelectItem value="amount_high">{t.amountHigh}</SelectItem>
          <SelectItem value="amount_low">{t.amountLow}</SelectItem>
          <SelectItem value="number">{t.numberSort}</SelectItem>
          <SelectItem value="name">{t.nameSort}</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={onReset} className="h-9 bg-background">
        <RotateCcw className="h-4 w-4" />
        {t.reset}
      </Button>
    </div>
  );
}

function DataTable<T extends { id: string }>({
  rows,
  totalRows,
  columns,
  rowKey,
  rowHref,
  emptyText,
  filtered,
  onReset,
  locale,
}: {
  rows: T[];
  totalRows: number;
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  emptyText: string;
  filtered: boolean;
  onReset: () => void;
  locale: Locale;
}) {
  const router = useRouter();
  const t = translations[locale];
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border bg-background">
        <div className="overflow-x-auto">
          <Table className="min-w-[1120px] table-fixed">
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
                rows.map((row) => {
                  const href = rowHref?.(row) || "";
                  return (
                    <TableRow
                      key={rowKey(row)}
                      className={cn(
                        "h-[64px] transition-colors",
                        href ? "cursor-pointer hover:bg-muted/40" : "",
                      )}
                      onClick={(event: React.MouseEvent<HTMLTableRowElement>) => {
                        if (!href) return;
                        const target = event.target as HTMLElement;
                        if (target.closest("button, a, input, select, textarea, [role='menuitem']")) return;
                        router.push(href);
                      }}
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={column.key}
                          className={cn(
                            "h-[64px] overflow-hidden px-4 text-start align-middle",
                            column.className,
                          )}
                        >
                          {column.render(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-72">
                    <EmptyState
                      textValue={filtered ? t.noResults : emptyText}
                      filtered={filtered}
                      onReset={onReset}
                      resetLabel={t.reset}
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
        <span className="font-medium text-foreground tabular-nums">{formatInteger(rows.length)}</span>{" "}
        {t.of}{" "}
        <span className="font-medium text-foreground tabular-nums">{formatInteger(totalRows)}</span>{" "}
        {t.rows}
      </div>
    </div>
  );
}

function buildTableHtml<T>(
  columns: ExportColumn<T>[],
  rows: T[],
) {
  // PRIMEY_COMPANY_DASHBOARD_REPORTS_FIXED_V4
  const head = columns
    .map(
      (column) =>
        `<th class="excel-text" style="mso-number-format:'\\@';">${escapeHtml(
          column.label,
        )}</th>`,
    )
    .join("");

  const emptyLabel =
    typeof document !== "undefined" &&
    document.documentElement.lang === "en"
      ? "No data"
      : "لا توجد بيانات";

  const body = rows.length
    ? rows
        .map(
          (row) =>
            `<tr>${columns
              .map(
                (column) =>
                  `<td class="excel-text" style="mso-number-format:'\\@';">${escapeHtml(
                    column.value(row),
                  )}</td>`,
              )
              .join("")}</tr>`,
        )
        .join("")
    : `<tr>
        <td
          class="empty-row excel-text"
          style="mso-number-format:'\\@';"
          colspan="${Math.max(columns.length, 1)}"
        >
          ${escapeHtml(emptyLabel)}
        </td>
      </tr>`;

  return `
    <table class="data-table">
      <thead>
        <tr>${head}</tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function downloadExcelFile(
  filename: string,
  title: string,
  html: string,
  locale: Locale,
) {
  const direction = locale === "ar" ? "rtl" : "ltr";
  const alignment = locale === "ar" ? "right" : "left";

  const sheetName =
    title
      .replace(/[\\/:?*\[\]]/g, " ")
      .trim()
      .slice(0, 31) || (locale === "ar" ? "التقرير" : "Report");
  const rightToLeftWorksheet =
    locale === "ar" ? "<x:DisplayRightToLeft />" : "";

  const documentHtml = `
    <!doctype html>
    <html
      dir="${direction}"
      lang="${locale}"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
    >
      <head>
        <meta charset="UTF-8" />

        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${escapeHtml(sheetName)}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines />
                  ${rightToLeftWorksheet}
                  <x:Selected />
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 10px;
            color: #111827;
            direction: ${direction};
            font-family: Tahoma, Arial, sans-serif;
            font-size: 11px;
          }

          h1 {
            margin: 0 0 14px;
            font-size: 22px;
            font-weight: 700;
            text-align: ${alignment};
          }

          h2 {
            margin: 18px 0 8px;
            font-size: 16px;
            font-weight: 700;
            text-align: ${alignment};
          }

          .section {
            margin-top: 18px;
          }

          .summary-table {
            width: 100%;
            margin-bottom: 18px;
            border-collapse: collapse;
            table-layout: fixed;
          }

          .summary-table td {
            width: 25%;
            border: 1px solid #000000;
            padding: 8px;
            text-align: ${alignment};
            vertical-align: top;
            mso-number-format: "\\@";
          }

          .summary-table span {
            display: block;
            color: #4b5563;
          }

          .summary-table b {
            display: block;
            margin-top: 5px;
            direction: ltr;
            font-size: 14px;
            font-weight: 700;
            white-space: nowrap;
            mso-number-format: "\\@";
          }

          .excel-summary-table .summary-label-row td {
            color: #4b5563;
            font-weight: 400;
          }

          .excel-summary-table .summary-value-row td {
            direction: ltr;
            unicode-bidi: embed;
            text-align: center;
            font-family: Arial, Tahoma, sans-serif;
            font-size: 14px;
            font-weight: 700;
            white-space: nowrap;
            mso-number-format: "\\@";
          }

          .data-table {
            width: 100%;
            margin-bottom: 22px;
            border-collapse: collapse;
            table-layout: auto;
          }

          .data-table th,
          .data-table td {
            border: 1px solid #000000;
            padding: 7px 6px;
            text-align: ${alignment};
            vertical-align: middle;
            white-space: normal;
            mso-number-format: "\\@";
          }

          .data-table th {
            background: #e5e7eb;
            font-weight: 700;
          }

          .excel-text {
            mso-number-format: "\\@";
          }

          .empty-row {
            padding: 14px !important;
            color: #6b7280;
            text-align: center !important;
          }
        </style>
      </head>

      <body>
        <h1>${escapeHtml(title)}</h1>
        ${html}
      </body>
    </html>
  `;

  const blob = new Blob(
    ["\uFEFF", documentHtml],
    {
      type: "application/vnd.ms-excel;charset=utf-8;",
    },
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${filename}-${new Date()
    .toISOString()
    .slice(0, 10)}.xls`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function openPrintWindow(
  title: string,
  subtitle: string,
  html: string,
  locale: Locale,
) {
  /*
   * لا نضع noopener داخل window.open لأن Chromium قد يعيد null
   * رغم إنشاء نافذة about:blank.
   */
  const win = window.open(
    "",
    "_blank",
    "width=1400,height=900",
  );

  if (!win) return false;

  win.opener = null;

  const direction = locale === "ar" ? "rtl" : "ltr";
  const alignment = locale === "ar" ? "right" : "left";

  win.document.open();

  win.document.write(`
    <!doctype html>
    <html dir="${direction}" lang="${locale}">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>

        <style>
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #000000;
            direction: ${direction};
            font-family: Tahoma, Arial, sans-serif;
            font-size: 11px;
          }

          h1 {
            margin: 0 0 5px;
            font-size: 22px;
            font-weight: 700;
            text-align: ${alignment};
          }

          h2 {
            margin: 16px 0 7px;
            font-size: 15px;
            font-weight: 700;
            text-align: ${alignment};
            break-after: avoid;
            page-break-after: avoid;
          }

          p {
            margin: 0 0 12px;
            color: #4b5563;
            font-size: 10px;
            text-align: ${alignment};
          }

          .section {
            margin-top: 16px;
          }

          .summary-table {
            width: 100%;
            margin: 12px 0 16px;
            border-collapse: collapse;
            table-layout: fixed;
          }

          .summary-table td {
            width: 25%;
            border: 1px solid #000000;
            padding: 7px;
            text-align: ${alignment};
            vertical-align: top;
          }

          .summary-table span {
            display: block;
            color: #4b5563;
          }

          .summary-table b {
            display: block;
            margin-top: 4px;
            direction: ltr;
            font-size: 13px;
            font-weight: 700;
            white-space: nowrap;
          }

          .data-table {
            width: 100%;
            margin-bottom: 16px;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 9px;
          }

          .data-table thead {
            display: table-header-group;
          }

          .data-table tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .data-table th,
          .data-table td {
            border: 1px solid #000000;
            padding: 5px;
            text-align: ${alignment};
            vertical-align: middle;
            overflow-wrap: anywhere;
          }

          .data-table th {
            background: #e5e7eb !important;
            font-weight: 700;
          }

          .empty-row {
            padding: 14px !important;
            color: #6b7280;
            text-align: center !important;
          }
        </style>
      </head>

      <body>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(subtitle)}</p>
        ${html}
      </body>
    </html>
  `);

  win.document.close();

  win.onafterprint = () => {
    win.close();
  };

  win.setTimeout(() => {
    win.focus();
    win.print();
  }, 350);

  return true;
}

function extractVoucherNumber(...values: string[]) {
  for (const value of values) {
    const match = value.match(/\b(?:CP|SP)-\d{4}-\d{6}\b/i);
    if (match) return match[0].toUpperCase();
  }
  return "";
}

function voucherHref(row: VoucherRecord) {
  const base =
    row.kind === "payment"
      ? "/company/treasury/payment-vouchers"
      : "/company/treasury/receipt-vouchers";
  return row.number && row.number !== "—" ? `${base}/${encodeURIComponent(row.number)}` : base;
}

function transactionHref(row: TreasuryTransactionRecord) {
  const sourceType = row.sourceType.toUpperCase();
  const sourceNumber =
    row.sourceNumber || extractVoucherNumber(row.reference, row.description, row.number);
  if (sourceNumber.startsWith("CP-") || sourceType.includes("CUSTOMER_PAYMENT")) {
    return sourceNumber
      ? `/company/treasury/receipt-vouchers/${encodeURIComponent(sourceNumber)}`
      : "/company/treasury/receipt-vouchers";
  }
  if (sourceNumber.startsWith("SP-") || sourceType.includes("SUPPLIER_PAYMENT")) {
    return sourceNumber
      ? `/company/treasury/payment-vouchers/${encodeURIComponent(sourceNumber)}`
      : "/company/treasury/payment-vouchers";
  }
  if (row.accountingEntryNumber) {
    return `/company/accounting/journal-entries/${encodeURIComponent(row.accountingEntryNumber)}`;
  }
  if (row.accountingAccountId) {
    return `/company/accounting/chart-of-accounts/${encodeURIComponent(row.accountingAccountId)}`;
  }
  return "";
}

export default function CompanyDashboardPage() {
  const router = useRouter();
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [authPayload, setAuthPayload] = React.useState<ApiResponse>({});
  const [stats, setStats] = React.useState<DashboardStats>({
    salesTotal: 0,
    salesInvoices: 0,
    receiptTotal: 0,
    paymentTotal: 0,
    customers: 0,
    suppliers: 0,
    vouchers: 0,
    netFlow: 0,
  });
  const [invoices, setInvoices] = React.useState<SalesInvoiceRecord[]>([]);
  const [vouchers, setVouchers] = React.useState<VoucherRecord[]>([]);
  const [transactions, setTransactions] = React.useState<TreasuryTransactionRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [warnings, setWarnings] = React.useState<string[]>([]);

  const [invoiceSearch, setInvoiceSearch] = React.useState("");
  const [invoiceStatus, setInvoiceStatus] = React.useState("all");
  const [invoiceSort, setInvoiceSort] = React.useState<SortKey>("newest");
  const [invoiceFrom, setInvoiceFrom] = React.useState("");
  const [invoiceTo, setInvoiceTo] = React.useState("");

  const [voucherSearch, setVoucherSearch] = React.useState("");
  const [voucherStatus, setVoucherStatus] = React.useState("all");
  const [voucherKind, setVoucherKind] = React.useState<KindFilter>("all");
  const [voucherSort, setVoucherSort] = React.useState<SortKey>("newest");
  const [voucherFrom, setVoucherFrom] = React.useState("");
  const [voucherTo, setVoucherTo] = React.useState("");

  const [transactionSearch, setTransactionSearch] = React.useState("");
  const [transactionStatus, setTransactionStatus] = React.useState("all");
  const [transactionType, setTransactionType] = React.useState<TransactionTypeFilter>("all");
  const [transactionSort, setTransactionSort] = React.useState<SortKey>("newest");
  const [transactionFrom, setTransactionFrom] = React.useState("");
  const [transactionTo, setTransactionTo] = React.useState("");

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
    async ({
      silent = false,
      signal,
    }: {
      silent?: boolean;
      signal?: AbortSignal;
    } = {}) => {
      try {
        if (!silent) setLoading(true);
        setRefreshing(true);
        setError("");
        setWarnings([]);
        const params = new URLSearchParams({ page: "1", page_size: "200", ordering: "-created_at" });
        const results = await Promise.allSettled([
          fetchJson<ApiResponse>(ENDPOINTS.whoami, undefined, signal),
          fetchJson<ApiResponse>(ENDPOINTS.customers, params, signal),
          fetchJson<ApiResponse>(ENDPOINTS.suppliers, params, signal),
          fetchJson<ApiResponse>(ENDPOINTS.receipts, params, signal),
          fetchJson<ApiResponse>(ENDPOINTS.payments, params, signal),
          fetchJson<ApiResponse>(ENDPOINTS.transactions, params, signal),
          fetchJson<ApiResponse>(ENDPOINTS.salesInvoices, params, signal),
        ]);

        const authResult = results[0];
        if (authResult.status === "rejected") {
          throw authResult.reason instanceof Error ? authResult.reason : new Error(t.errorDesc);
        }

        const valueAt = (index: number): ApiResponse =>
          results[index]?.status === "fulfilled"
            ? (results[index] as PromiseFulfilledResult<ApiResponse>).value
            : {};

        const auth = valueAt(0);
        const customersPayload = valueAt(1);
        const suppliersPayload = valueAt(2);
        const receiptsPayload = valueAt(3);
        const paymentsPayload = valueAt(4);
        const transactionsPayload = valueAt(5);
        const invoicesPayload = valueAt(6);

        const receiptRows = extractArray(receiptsPayload).map((row) => normalizeVoucher(row, "receipt"));
        const paymentRows = extractArray(paymentsPayload).map((row) => normalizeVoucher(row, "payment"));
        const voucherRows = [...receiptRows, ...paymentRows];
        const invoiceRows = extractArray(invoicesPayload).map(normalizeInvoice);
        const transactionRows = extractArray(transactionsPayload).map(normalizeTransaction);
        const receiptTotal = receiptRows.reduce((sum, row) => sum + row.amount, 0);
        const paymentTotal = paymentRows.reduce((sum, row) => sum + row.amount, 0);

        setAuthPayload(auth);
        setInvoices(invoiceRows);
        setVouchers(voucherRows);
        setTransactions(transactionRows);
        setStats({
          salesTotal: invoiceRows.reduce((sum, row) => sum + row.amount, 0),
          salesInvoices: extractCount(invoicesPayload),
          receiptTotal,
          paymentTotal,
          customers: extractCount(customersPayload),
          suppliers: extractCount(suppliersPayload),
          vouchers: extractCount(receiptsPayload) + extractCount(paymentsPayload),
          netFlow: receiptTotal - paymentTotal,
        });

        const requiredFailures = results
          .slice(1, 6)
          .filter((result): result is PromiseRejectedResult => result.status === "rejected")
          .map((result) =>
            text(result.reason instanceof Error ? result.reason.message : result.reason),
          )
          .filter(Boolean);
        setWarnings(requiredFailures);

        if (silent && requiredFailures.length) toast.warning(t.partialTitle);
        else if (silent) toast.success(t.refreshed);
      } catch (caughtError) {
        if (signal?.aborted) return;
        const message = caughtError instanceof Error ? caughtError.message : t.errorDesc;
        setError(message);
        if (silent) toast.error(message);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [t.errorDesc, t.partialTitle, t.refreshed],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void loadDashboard({ signal: controller.signal });
    return () => controller.abort();
  }, [loadDashboard]);

  const resetInvoices = React.useCallback(() => {
    setInvoiceSearch("");
    setInvoiceStatus("all");
    setInvoiceSort("newest");
    setInvoiceFrom("");
    setInvoiceTo("");
  }, []);

  const resetVouchers = React.useCallback(() => {
    setVoucherSearch("");
    setVoucherStatus("all");
    setVoucherKind("all");
    setVoucherSort("newest");
    setVoucherFrom("");
    setVoucherTo("");
  }, []);

  const resetTransactions = React.useCallback(() => {
    setTransactionSearch("");
    setTransactionStatus("all");
    setTransactionType("all");
    setTransactionSort("newest");
    setTransactionFrom("");
    setTransactionTo("");
  }, []);

  const filteredInvoices = React.useMemo(() => {
    const needle = invoiceSearch.trim().toLowerCase();
    const rows = invoices.filter((row) => {
      const haystack = [row.number, row.customerName, row.status, row.amount].join(" ").toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (invoiceStatus !== "all" && row.status !== invoiceStatus) return false;
      return isWithinDate(row.date, invoiceFrom, invoiceTo);
    });
    return sortRows(rows, invoiceSort, (row) => row.date, (row) => row.amount, (row) => row.number, (row) => row.customerName);
  }, [invoiceFrom, invoiceSearch, invoiceSort, invoiceStatus, invoiceTo, invoices]);

  const filteredVouchers = React.useMemo(() => {
    const needle = voucherSearch.trim().toLowerCase();
    const rows = vouchers.filter((row) => {
      const haystack = [
        row.number,
        row.partyName,
        row.partyPhone,
        row.treasuryAccountName,
        row.method,
        row.reference,
        row.transactionNumber,
        row.accountingEntryNumber,
        row.status,
        row.kind,
        row.amount,
      ]
        .join(" ")
        .toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (voucherStatus !== "all" && row.status !== voucherStatus) return false;
      if (voucherKind !== "all" && row.kind !== voucherKind) return false;
      return isWithinDate(row.date, voucherFrom, voucherTo);
    });
    return sortRows(rows, voucherSort, (row) => row.date, (row) => row.amount, (row) => row.number, (row) => row.partyName);
  }, [voucherFrom, voucherKind, voucherSearch, voucherSort, voucherStatus, voucherTo, vouchers]);

  const filteredTransactions = React.useMemo(() => {
    const needle = transactionSearch.trim().toLowerCase();
    const rows = transactions.filter((row) => {
      const haystack = [
        row.number,
        row.accountName,
        row.accountCode,
        row.sourceType,
        row.sourceNumber,
        row.reference,
        row.description,
        row.accountingEntryNumber,
        row.type,
        row.status,
        row.amount,
      ]
        .join(" ")
        .toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (transactionStatus !== "all" && row.status !== transactionStatus) return false;
      if (transactionType !== "all" && row.type !== transactionType) return false;
      return isWithinDate(row.date, transactionFrom, transactionTo);
    });
    return sortRows(rows, transactionSort, (row) => row.date, (row) => row.amount, (row) => row.number, (row) => row.accountName);
  }, [transactionFrom, transactionSearch, transactionSort, transactionStatus, transactionTo, transactionType, transactions]);

  const invoiceFiltered = Boolean(invoiceSearch || invoiceStatus !== "all" || invoiceFrom || invoiceTo || invoiceSort !== "newest");
  const voucherFiltered = Boolean(voucherSearch || voucherStatus !== "all" || voucherKind !== "all" || voucherFrom || voucherTo || voucherSort !== "newest");
  const transactionFiltered = Boolean(transactionSearch || transactionStatus !== "all" || transactionType !== "all" || transactionFrom || transactionTo || transactionSort !== "newest");

  const invoiceExportColumns = React.useMemo<ExportColumn<SalesInvoiceRecord>[]>(
    () => [
      { label: t.invoice, value: (row) => row.number },
      { label: t.customer, value: (row) => row.customerName },
      { label: t.date, value: (row) => formatDate(row.date) },
      { label: t.amount, value: (row) => reportMoney(row.amount) },
      { label: t.status, value: (row) => statusLabel(row.status, locale) },
    ],
    [locale, t.amount, t.customer, t.date, t.invoice, t.status],
  );

  const voucherExportColumns = React.useMemo<ExportColumn<VoucherRecord>[]>(
    () => [
      { label: t.kind, value: (row) => (row.kind === "receipt" ? t.receiptVoucher : t.paymentVoucher) },
      { label: t.voucher, value: (row) => row.number },
      { label: t.party, value: (row) => row.partyName },
      { label: t.date, value: (row) => formatDate(row.date) },
      { label: t.amount, value: (row) => reportMoney(row.amount) },
      { label: t.status, value: (row) => statusLabel(row.status, locale) },
      { label: t.treasuryAccount, value: (row) => row.treasuryAccountName },
      { label: t.transaction, value: (row) => row.transactionNumber || "—" },
      { label: t.accounting, value: (row) => row.accountingEntryNumber || "—" },
    ],
    [locale, t.accounting, t.amount, t.date, t.kind, t.party, t.paymentVoucher, t.receiptVoucher, t.status, t.transaction, t.treasuryAccount, t.voucher],
  );

  const transactionExportColumns = React.useMemo<ExportColumn<TreasuryTransactionRecord>[]>(
    () => [
      { label: t.transaction, value: (row) => row.number },
      { label: t.date, value: (row) => formatDate(row.date) },
      { label: t.treasuryAccount, value: (row) => row.accountName },
      { label: t.kind, value: (row) => transactionTypeLabel(row.type, locale) },
      { label: t.amount, value: (row) => reportMoney(row.amount) },
      { label: t.status, value: (row) => statusLabel(row.status, locale) },
      { label: t.source, value: (row) => row.sourceNumber || transactionSourceLabel(row.sourceType, locale) },
      { label: t.accounting, value: (row) => row.accountingEntryNumber || "—" },
    ],
    [locale, t.accounting, t.amount, t.date, t.kind, t.source, t.status, t.transaction, t.treasuryAccount],
  );

  const printVoucher = React.useCallback(
    (row: VoucherRecord) => {
      const href = voucherHref(row);
      const separator = href.includes("?") ? "&" : "?";
      const printWindow = window.open(
        `${href}${separator}print=voucher`,
        "_blank",
        "width=1400,height=900",
      );

      if (!printWindow) {
        toast.error(t.printBlocked);
        return;
      }

      printWindow.opener = null;
    },
    [t.printBlocked],
  );

  const invoiceColumns = React.useMemo<DataColumn<SalesInvoiceRecord>[]>(
    () => [
      {
        key: "invoice",
        label: t.invoice,
        className: "w-[210px]",
        render: (row) => <span className="font-semibold tabular-nums">{row.number}</span>,
      },
      {
        key: "customer",
        label: t.customer,
        className: "w-[260px]",
        render: (row) => <span className="truncate">{row.customerName}</span>,
      },
      {
        key: "date",
        label: t.date,
        className: "w-[150px]",
        render: (row) => <span dir="ltr" lang="en" className="tabular-nums">{formatDate(row.date)}</span>,
      },
      {
        key: "amount",
        label: t.amount,
        className: "w-[170px]",
        render: (row) => <MoneyValue value={row.amount} label={t.sar} />,
      },
      {
        key: "status",
        label: t.status,
        className: "w-[150px]",
        render: (row) => <StatusBadge value={row.status} label={statusLabel(row.status, locale)} />,
      },
      {
        key: "actions",
        label: t.actions,
        className: "w-[110px]",
        render: () => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t.actions}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={locale === "ar" ? "start" : "end"}>
              <DropdownMenuItem asChild>
                <Link href="/company/sales/invoices">
                  <ExternalLink className="h-4 w-4" />
                  {t.openSales}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [locale, t.actions, t.amount, t.customer, t.date, t.invoice, t.openSales, t.sar, t.status],
  );

  const voucherColumns = React.useMemo<DataColumn<VoucherRecord>[]>(
    () => [
      {
        key: "kind",
        label: t.kind,
        className: "w-[150px]",
        render: (row) => (
          <StatusBadge
            value={row.kind === "receipt" ? "confirmed" : "cancelled"}
            label={row.kind === "receipt" ? t.receiptVoucher : t.paymentVoucher}
          />
        ),
      },
      {
        key: "voucher",
        label: t.voucher,
        className: "w-[190px]",
        render: (row) => <span className="font-semibold tabular-nums">{row.number}</span>,
      },
      {
        key: "party",
        label: t.party,
        className: "w-[220px]",
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.partyName}</p>
            {row.partyPhone ? <p className="truncate text-xs text-muted-foreground">{row.partyPhone}</p> : null}
          </div>
        ),
      },
      {
        key: "date",
        label: t.date,
        className: "w-[135px]",
        render: (row) => <span dir="ltr" lang="en" className="tabular-nums">{formatDate(row.date)}</span>,
      },
      {
        key: "amount",
        label: t.amount,
        className: "w-[150px]",
        render: (row) => <MoneyValue value={row.amount} label={t.sar} />,
      },
      {
        key: "status",
        label: t.status,
        className: "w-[135px]",
        render: (row) => <StatusBadge value={row.status} label={statusLabel(row.status, locale)} />,
      },
      {
        key: "treasury",
        label: t.treasuryAccount,
        className: "w-[220px]",
        render: (row) => <span className="truncate">{row.treasuryAccountName}</span>,
      },
      {
        key: "actions",
        label: t.actions,
        className: "w-[110px]",
        render: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t.actions} onClick={(event: React.MouseEvent<HTMLButtonElement>) => event.stopPropagation()}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={locale === "ar" ? "start" : "end"}>
              <DropdownMenuItem onSelect={() => router.push(voucherHref(row))}>
                <ExternalLink className="h-4 w-4" />
                {t.openDetails}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => printVoucher(row)}>
                <Printer className="h-4 w-4" />
                {t.printVoucher}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [locale, printVoucher, router, t.actions, t.amount, t.date, t.kind, t.openDetails, t.party, t.paymentVoucher, t.printVoucher, t.receiptVoucher, t.sar, t.status, t.treasuryAccount, t.voucher],
  );

  const transactionColumns = React.useMemo<DataColumn<TreasuryTransactionRecord>[]>(
    () => [
      {
        key: "number",
        label: t.transaction,
        className: "w-[190px]",
        render: (row) => <span className="font-semibold tabular-nums">{row.number}</span>,
      },
      {
        key: "date",
        label: t.date,
        className: "w-[135px]",
        render: (row) => <span dir="ltr" lang="en" className="tabular-nums">{formatDate(row.date)}</span>,
      },
      {
        key: "account",
        label: t.treasuryAccount,
        className: "w-[240px]",
        render: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.accountName}</p>
            {row.accountCode ? <p className="truncate text-xs text-muted-foreground">{row.accountCode}</p> : null}
          </div>
        ),
      },
      {
        key: "type",
        label: t.kind,
        className: "w-[130px]",
        render: (row) => <StatusBadge value={row.type} label={transactionTypeLabel(row.type, locale)} />,
      },
      {
        key: "amount",
        label: t.amount,
        className: "w-[150px]",
        render: (row) => <MoneyValue value={row.amount} label={t.sar} />,
      },
      {
        key: "status",
        label: t.status,
        className: "w-[130px]",
        render: (row) => <StatusBadge value={row.status} label={statusLabel(row.status, locale)} />,
      },
      {
        key: "source",
        label: t.source,
        className: "w-[210px]",
        render: (row) => <span className="truncate">{row.sourceNumber || transactionSourceLabel(row.sourceType, locale)}</span>,
      },
      {
        key: "actions",
        label: t.actions,
        className: "w-[110px]",
        render: (row) => {
          const href = transactionHref(row);
          return href ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t.actions} onClick={(event: React.MouseEvent<HTMLButtonElement>) => event.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={locale === "ar" ? "start" : "end"}>
                <DropdownMenuItem onSelect={() => router.push(href)}>
                  <ExternalLink className="h-4 w-4" />
                  {t.openDetails}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
    ],
    [locale, router, t.actions, t.amount, t.date, t.kind, t.openDetails, t.sar, t.source, t.status, t.transaction, t.treasuryAccount],
  );

  const exportInvoices = React.useCallback(() => {
    if (!filteredInvoices.length) return toast.error(t.exportEmpty);
    downloadExcelFile("company-sales-invoices", t.invoicesTitle, buildTableHtml(invoiceExportColumns, filteredInvoices), locale);
    toast.success(t.exportReady);
  }, [filteredInvoices, invoiceExportColumns, locale, t.exportEmpty, t.exportReady, t.invoicesTitle]);

  const exportVouchers = React.useCallback(() => {
    if (!filteredVouchers.length) return toast.error(t.exportEmpty);
    downloadExcelFile("company-vouchers", t.vouchersTitle, buildTableHtml(voucherExportColumns, filteredVouchers), locale);
    toast.success(t.exportReady);
  }, [filteredVouchers, locale, t.exportEmpty, t.exportReady, t.vouchersTitle, voucherExportColumns]);

  const exportTransactions = React.useCallback(() => {
    if (!filteredTransactions.length) return toast.error(t.exportEmpty);
    downloadExcelFile("company-treasury-transactions", t.transactionsTitle, buildTableHtml(transactionExportColumns, filteredTransactions), locale);
    toast.success(t.exportReady);
  }, [filteredTransactions, locale, t.exportEmpty, t.exportReady, t.transactionsTitle, transactionExportColumns]);

  const printInvoices = React.useCallback(() => {
    if (!filteredInvoices.length) return toast.error(t.printEmpty);
    const ok = openPrintWindow(t.invoicesTitle, `${t.generatedAt}: ${reportDateTime()}`, buildTableHtml(invoiceExportColumns, filteredInvoices), locale);
    if (!ok) toast.error(t.printBlocked);
    else toast.success(t.printReady);
  }, [filteredInvoices, invoiceExportColumns, locale, t.generatedAt, t.invoicesTitle, t.printBlocked, t.printEmpty, t.printReady]);

  const printVouchers = React.useCallback(() => {
    if (!filteredVouchers.length) return toast.error(t.printEmpty);
    const ok = openPrintWindow(t.vouchersTitle, `${t.generatedAt}: ${reportDateTime()}`, buildTableHtml(voucherExportColumns, filteredVouchers), locale);
    if (!ok) toast.error(t.printBlocked);
    else toast.success(t.printReady);
  }, [filteredVouchers, locale, t.generatedAt, t.printBlocked, t.printEmpty, t.printReady, t.vouchersTitle, voucherExportColumns]);

  const printTransactions = React.useCallback(() => {
    if (!filteredTransactions.length) return toast.error(t.printEmpty);
    const ok = openPrintWindow(t.transactionsTitle, `${t.generatedAt}: ${reportDateTime()}`, buildTableHtml(transactionExportColumns, filteredTransactions), locale);
    if (!ok) toast.error(t.printBlocked);
    else toast.success(t.printReady);
  }, [filteredTransactions, locale, t.generatedAt, t.printBlocked, t.printEmpty, t.printReady, t.transactionsTitle, transactionExportColumns]);

  const printSummaryHtml = React.useMemo(
    () => `<table class="summary-table">
      <tbody>
        <tr>
          <td><span>${escapeHtml(t.salesTotal)}</span><b>${escapeHtml(reportMoney(stats.salesTotal))}</b></td>
          <td><span>${escapeHtml(t.salesInvoices)}</span><b>${escapeHtml(formatInteger(stats.salesInvoices))}</b></td>
          <td><span>${escapeHtml(t.receiptTotal)}</span><b>${escapeHtml(reportMoney(stats.receiptTotal))}</b></td>
          <td><span>${escapeHtml(t.paymentTotal)}</span><b>${escapeHtml(reportMoney(stats.paymentTotal))}</b></td>
        </tr>
        <tr>
          <td><span>${escapeHtml(t.customers)}</span><b>${escapeHtml(formatInteger(stats.customers))}</b></td>
          <td><span>${escapeHtml(t.suppliers)}</span><b>${escapeHtml(formatInteger(stats.suppliers))}</b></td>
          <td><span>${escapeHtml(t.vouchers)}</span><b>${escapeHtml(formatInteger(stats.vouchers))}</b></td>
          <td><span>${escapeHtml(t.netFlow)}</span><b>${escapeHtml(reportMoney(stats.netFlow))}</b></td>
        </tr>
      </tbody>
    </table>`,
    [locale, stats, t.customers, t.netFlow, t.paymentTotal, t.receiptTotal, t.salesInvoices, t.salesTotal, t.suppliers, t.vouchers],
  );

  const excelSummaryHtml = React.useMemo(
    () => `<table class="summary-table excel-summary-table">
      <tbody>
        <tr class="summary-label-row">
          <td>${escapeHtml(t.salesTotal)}</td>
          <td>${escapeHtml(t.salesInvoices)}</td>
          <td>${escapeHtml(t.receiptTotal)}</td>
          <td>${escapeHtml(t.paymentTotal)}</td>
        </tr>
        <tr class="summary-value-row">
          <td class="summary-value excel-text" dir="ltr" lang="en" style="mso-number-format:'\\@';">&#8206;${escapeHtml(reportMoney(stats.salesTotal))}&#8206;</td>
          <td class="summary-value excel-text" dir="ltr" lang="en" style="mso-number-format:'\\@';">&#8206;${escapeHtml(formatInteger(stats.salesInvoices))}&#8206;</td>
          <td class="summary-value excel-text" dir="ltr" lang="en" style="mso-number-format:'\\@';">&#8206;${escapeHtml(reportMoney(stats.receiptTotal))}&#8206;</td>
          <td class="summary-value excel-text" dir="ltr" lang="en" style="mso-number-format:'\\@';">&#8206;${escapeHtml(reportMoney(stats.paymentTotal))}&#8206;</td>
        </tr>
        <tr class="summary-label-row">
          <td>${escapeHtml(t.customers)}</td>
          <td>${escapeHtml(t.suppliers)}</td>
          <td>${escapeHtml(t.vouchers)}</td>
          <td>${escapeHtml(t.netFlow)}</td>
        </tr>
        <tr class="summary-value-row">
          <td class="summary-value excel-text" dir="ltr" lang="en" style="mso-number-format:'\\@';">&#8206;${escapeHtml(formatInteger(stats.customers))}&#8206;</td>
          <td class="summary-value excel-text" dir="ltr" lang="en" style="mso-number-format:'\\@';">&#8206;${escapeHtml(formatInteger(stats.suppliers))}&#8206;</td>
          <td class="summary-value excel-text" dir="ltr" lang="en" style="mso-number-format:'\\@';">&#8206;${escapeHtml(formatInteger(stats.vouchers))}&#8206;</td>
          <td class="summary-value excel-text" dir="ltr" lang="en" style="mso-number-format:'\\@';">&#8206;${escapeHtml(reportMoney(stats.netFlow))}&#8206;</td>
        </tr>
      </tbody>
    </table>`,
    [locale, stats, t.customers, t.netFlow, t.paymentTotal, t.receiptTotal, t.salesInvoices, t.salesTotal, t.suppliers, t.vouchers],
  );

  const dashboardTableSectionsHtml = React.useMemo(
    () => `<div class="section"><h2>${escapeHtml(t.invoicesTitle)}</h2>${buildTableHtml(invoiceExportColumns, filteredInvoices)}</div>
      <div class="section"><h2>${escapeHtml(t.vouchersTitle)}</h2>${buildTableHtml(voucherExportColumns, filteredVouchers)}</div>
      <div class="section"><h2>${escapeHtml(t.transactionsTitle)}</h2>${buildTableHtml(transactionExportColumns, filteredTransactions)}</div>`,
    [filteredInvoices, filteredTransactions, filteredVouchers, invoiceExportColumns, t.invoicesTitle, t.transactionsTitle, t.vouchersTitle, transactionExportColumns, voucherExportColumns],
  );

  const dashboardExcelSectionsHtml = React.useMemo(
    () => `${excelSummaryHtml}${dashboardTableSectionsHtml}`,
    [dashboardTableSectionsHtml, excelSummaryHtml],
  );

  const dashboardPrintSectionsHtml = React.useMemo(
    () => `${printSummaryHtml}${dashboardTableSectionsHtml}`,
    [dashboardTableSectionsHtml, printSummaryHtml],
  );

  const exportDashboard = React.useCallback(() => {
    if (!filteredInvoices.length && !filteredVouchers.length && !filteredTransactions.length) {
      return toast.error(t.exportEmpty);
    }
    downloadExcelFile("company-dashboard", t.reportTitle, dashboardExcelSectionsHtml, locale);
    toast.success(t.exportReady);
  }, [dashboardExcelSectionsHtml, filteredInvoices.length, filteredTransactions.length, filteredVouchers.length, locale, t.exportEmpty, t.exportReady, t.reportTitle]);

  const printDashboard = React.useCallback(() => {
    if (!filteredInvoices.length && !filteredVouchers.length && !filteredTransactions.length) {
      return toast.error(t.printEmpty);
    }
    const ok = openPrintWindow(
      t.reportTitle,
      `${getCompanyName(authPayload, t.unknown)} — ${t.generatedAt}: ${reportDateTime()}`,
      dashboardPrintSectionsHtml,
      locale,
    );
    if (!ok) toast.error(t.printBlocked);
    else toast.success(t.printReady);
  }, [authPayload, dashboardPrintSectionsHtml, filteredInvoices.length, filteredTransactions.length, filteredVouchers.length, locale, t.generatedAt, t.printBlocked, t.printEmpty, t.printReady, t.reportTitle, t.unknown]);

  if (loading) {
    return (
      <main dir={dir} className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <DashboardSkeleton />
      </main>
    );
  }

  if (error) {
    return (
      <main dir={dir} className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl rounded-lg border-destructive/30 shadow-none">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 rounded-full bg-destructive/10 p-4 text-destructive">
              <TriangleAlert className="h-8 w-8" />
            </div>
            <CardTitle>{t.errorTitle}</CardTitle>
            <CardDescription>{t.errorDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => void loadDashboard({ silent: true })}>
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const invoiceStatusOptions = [
    { value: "all", label: t.all },
    { value: "draft", label: t.draft },
    { value: "confirmed", label: t.confirmed },
    { value: "posted", label: t.posted },
    { value: "paid", label: t.paid },
    { value: "unpaid", label: t.unpaid },
    { value: "partial", label: t.partial },
    { value: "cancelled", label: t.cancelled },
  ];
  const voucherStatusOptions = [
    { value: "all", label: t.all },
    { value: "draft", label: t.draft },
    { value: "confirmed", label: t.confirmed },
    { value: "cancelled", label: t.cancelled },
  ];
  const transactionStatusOptions = [
    { value: "all", label: t.all },
    { value: "draft", label: t.draft },
    { value: "posted", label: t.posted },
    { value: "cancelled", label: t.cancelled },
  ];

  return (
    <main dir={dir} className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <Badge variant="outline" className="mb-3 rounded-full bg-background px-3 py-1 text-xs">
              {t.badge}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.title}</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground sm:text-base">{t.subtitle}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border bg-background px-3 py-1">
                {t.currentCompany}: {getCompanyName(authPayload, t.unknown)}
              </span>
              <span className="rounded-full border bg-background px-3 py-1">
                {t.activity}: {getActivityName(authPayload, t.unknown)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void loadDashboard({ silent: true })} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t.refresh}
            </Button>
            <Button variant="outline" onClick={exportDashboard}>
              <FileSpreadsheet className="h-4 w-4" />
              {t.export}
            </Button>
            <Button variant="outline" onClick={printDashboard}>
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>
          </div>
        </section>

        {warnings.length ? (
          <Card className="rounded-lg border-amber-200 bg-amber-50 shadow-none">
            <CardContent className="flex gap-3 p-4 text-amber-950">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{t.partialTitle}</p>
                <p className="mt-1 text-sm opacity-80">{t.partialDesc}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t.salesTotal} value={stats.salesTotal} description={t.salesDesc} href="/company/sales/invoices" icon={ShoppingCart} money currencyLabel={t.sar} />
          <KpiCard title={t.salesInvoices} value={stats.salesInvoices} description={t.invoicesDesc} href="/company/sales/invoices" icon={FileText} currencyLabel={t.sar} />
          <KpiCard title={t.receiptTotal} value={stats.receiptTotal} description={t.receiptsDesc} href="/company/treasury/receipt-vouchers" icon={ArrowDownLeft} money currencyLabel={t.sar} />
          <KpiCard title={t.paymentTotal} value={stats.paymentTotal} description={t.paymentsDesc} href="/company/treasury/payment-vouchers" icon={ArrowUpRight} money currencyLabel={t.sar} />
          <KpiCard title={t.customers} value={stats.customers} description={t.customersDesc} href="/company/customers" icon={Users} currencyLabel={t.sar} />
          <KpiCard title={t.suppliers} value={stats.suppliers} description={t.suppliersDesc} href="/company/suppliers" icon={Landmark} currencyLabel={t.sar} />
          <KpiCard title={t.vouchers} value={stats.vouchers} description={t.vouchersDesc} href="/company/payments" icon={ReceiptText} currencyLabel={t.sar} />
          <KpiCard title={t.netFlow} value={stats.netFlow} description={t.netFlowDesc} href="/company/treasury" icon={WalletCards} money currencyLabel={t.sar} />
        </div>

        <Card className="rounded-lg border shadow-none">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{t.invoicesTitle}</CardTitle>
              <CardDescription className="mt-1">{t.invoicesSubtitle}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={exportInvoices}>
                <FileSpreadsheet className="h-4 w-4" />
                {t.export}
              </Button>
              <Button variant="outline" size="sm" onClick={printInvoices}>
                <Printer className="h-4 w-4" />
                {t.print}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FiltersBar
              search={invoiceSearch}
              onSearchChange={setInvoiceSearch}
              placeholder={t.invoiceSearch}
              status={invoiceStatus}
              onStatusChange={setInvoiceStatus}
              statusOptions={invoiceStatusOptions}
              sort={invoiceSort}
              onSortChange={setInvoiceSort}
              dateFrom={invoiceFrom}
              onDateFromChange={setInvoiceFrom}
              dateTo={invoiceTo}
              onDateToChange={setInvoiceTo}
              onReset={resetInvoices}
              locale={locale}
            />
            <DataTable<SalesInvoiceRecord>
              rows={filteredInvoices}
              totalRows={invoices.length}
              columns={invoiceColumns}
              rowKey={(row) => row.id || row.number}
              emptyText={t.noInvoices}
              filtered={invoiceFiltered}
              onReset={resetInvoices}
              locale={locale}
            />
          </CardContent>
        </Card>

        <Card className="rounded-lg border shadow-none">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{t.vouchersTitle}</CardTitle>
              <CardDescription className="mt-1">{t.vouchersSubtitle}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={exportVouchers}>
                <FileSpreadsheet className="h-4 w-4" />
                {t.export}
              </Button>
              <Button variant="outline" size="sm" onClick={printVouchers}>
                <Printer className="h-4 w-4" />
                {t.print}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FiltersBar
              search={voucherSearch}
              onSearchChange={setVoucherSearch}
              placeholder={t.voucherSearch}
              status={voucherStatus}
              onStatusChange={setVoucherStatus}
              statusOptions={voucherStatusOptions}
              kind={voucherKind}
              onKindChange={(value) => setVoucherKind(value as KindFilter)}
              kindOptions={[
                { value: "all", label: t.all },
                { value: "receipt", label: t.receiptVoucher },
                { value: "payment", label: t.paymentVoucher },
              ]}
              sort={voucherSort}
              onSortChange={setVoucherSort}
              dateFrom={voucherFrom}
              onDateFromChange={setVoucherFrom}
              dateTo={voucherTo}
              onDateToChange={setVoucherTo}
              onReset={resetVouchers}
              locale={locale}
            />
            <DataTable<VoucherRecord>
              rows={filteredVouchers}
              totalRows={vouchers.length}
              columns={voucherColumns}
              rowKey={(row) => row.id || row.number}
              rowHref={voucherHref}
              emptyText={t.noVouchers}
              filtered={voucherFiltered}
              onReset={resetVouchers}
              locale={locale}
            />
          </CardContent>
        </Card>

        <Card className="rounded-lg border shadow-none">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{t.transactionsTitle}</CardTitle>
              <CardDescription className="mt-1">{t.transactionsSubtitle}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={exportTransactions}>
                <FileSpreadsheet className="h-4 w-4" />
                {t.export}
              </Button>
              <Button variant="outline" size="sm" onClick={printTransactions}>
                <Printer className="h-4 w-4" />
                {t.print}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FiltersBar
              search={transactionSearch}
              onSearchChange={setTransactionSearch}
              placeholder={t.transactionSearch}
              status={transactionStatus}
              onStatusChange={setTransactionStatus}
              statusOptions={transactionStatusOptions}
              kind={transactionType}
              onKindChange={(value) => setTransactionType(value as TransactionTypeFilter)}
              kindOptions={[
                { value: "all", label: t.all },
                { value: "inflow", label: t.inflow },
                { value: "outflow", label: t.outflow },
                { value: "transfer", label: t.transfer },
                { value: "adjustment", label: t.adjustment },
              ]}
              sort={transactionSort}
              onSortChange={setTransactionSort}
              dateFrom={transactionFrom}
              onDateFromChange={setTransactionFrom}
              dateTo={transactionTo}
              onDateToChange={setTransactionTo}
              onReset={resetTransactions}
              locale={locale}
            />
            <DataTable<TreasuryTransactionRecord>
              rows={filteredTransactions}
              totalRows={transactions.length}
              columns={transactionColumns}
              rowKey={(row) => row.id || row.number}
              rowHref={transactionHref}
              emptyText={t.noTransactions}
              filtered={transactionFiltered}
              onReset={resetTransactions}
              locale={locale}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
