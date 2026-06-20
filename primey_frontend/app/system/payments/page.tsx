"use client";

/* ============================================================
   📂 primey_frontend/app/system/payments/page.tsx
   💳 Primey Care — Payments
   ------------------------------------------------------------
   ✅ Same approved Customers / Invoices visual pattern
   ✅ Header buttons / KPI cards / toolbar / table unified
   ✅ Fixed table columns like Customers page
   ✅ Internal UI components only
   ✅ Real API only: /api/payments/
   ✅ Confirm: /api/payments/{id}/confirm/
   ✅ Cancel: /api/payments/{id}/cancel/
   ✅ No /api/payments/list/
   ✅ No localhost
   ✅ No fake data
   ✅ Excel .xls + Web print
   ✅ SAR icon from /currency/sar.svg
   ✅ sonner toast
   ✅ RTL/LTR through primey-locale
============================================================ */

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpDown,
  Banknote,
  CheckCircle2,
  ColumnsIcon,
  Copy,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
  XCircle,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type PaymentStatus =
  | "all"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

type MethodFilter =
  | "all"
  | "CASH"
  | "BANK_TRANSFER"
  | "GATEWAY"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "APPLE_PAY"
  | "STC_PAY"
  | "TAMARA"
  | "TABBY"
  | "WALLET";

type PostingFilter = "all" | "posted" | "pending";

type SortKey =
  | "newest"
  | "oldest"
  | "highest_amount"
  | "highest_paid"
  | "highest_refunded";

type ColumnKey =
  | "select"
  | "payment"
  | "customer"
  | "invoice"
  | "order"
  | "amount"
  | "paid"
  | "refunded"
  | "method"
  | "status"
  | "treasury"
  | "accounting"
  | "date"
  | "actions";

type PaymentCustomer = {
  id: number | null;
  customer_code: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  status: string;
  has_customer_account: boolean;
};

type PaymentInvoice = {
  id: number | null;
  invoice_number: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
};

type PaymentOrder = {
  id: number | null;
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  total_amount: number;
  amount_paid: number;
  remaining_amount: number;
};

type PaymentRecord = {
  id: number;
  payment_number: string;
  reference: string;
  status: string;
  payment_method: string;
  provider: string;
  currency: string;

  amount: number;
  paid_amount: number;
  refunded_amount: number;
  remaining_amount: number;
  net_collected_amount: number;

  invoice_id: number | null;
  invoice: PaymentInvoice | null;

  order_id: number | null;
  order: PaymentOrder | null;

  customer_id: number | null;
  customer: PaymentCustomer | null;
  customer_name: string;

  external_reference: string;
  transaction_id: string;
  gateway_response_code: string;
  gateway_message: string;

  treasury_movement_reference: string;
  accounting_entry_reference: string;
  is_treasury_posted: boolean;
  is_accounting_posted: boolean;

  initiated_at: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  cancelled_at: string | null;
  created_at: string | null;
  updated_at: string | null;

  notes: string;
  failure_reason: string;
};

type PaymentSummary = {
  total_count: number;
  total_amount: number;
  total_paid_amount: number;
  total_refunded_amount: number;
  net_collected_amount: number;
  posted_treasury_count: number;
  unposted_treasury_count: number;
  posted_accounting_count: number;
  unposted_accounting_count: number;
  currency: string;
};

type PaymentsApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: {
    items?: unknown[];
    results?: unknown[];
    summary?: unknown;
    totals?: unknown;
    pagination?: unknown;
  };
  items?: unknown[];
  results?: unknown[];
  summary?: unknown;
  totals?: unknown;
  pagination?: unknown;
  count?: number;
  total_count?: number;
};

const SAR_ICON = "/currency/sar.svg";

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  select: true,
  payment: true,
  customer: true,
  invoice: true,
  order: true,
  amount: true,
  paid: true,
  refunded: true,
  method: true,
  status: true,
  treasury: true,
  accounting: true,
  date: true,
  actions: true,
};

const translations = {
  ar: {
    title: "المدفوعات",
    subtitle: "متابعة المدفوعات والتحصيل والترحيل للخزينة والمحاسبة.",
    create: "إضافة دفعة",
    refresh: "تحديث",
    export: "تصدير Excel",
    print: "طباعة",
    reset: "إعادة ضبط",
    searchPlaceholder: "ابحث في المدفوعات...",
    totalPayments: "إجمالي المدفوعات",
    totalAmount: "إجمالي المبالغ",
    paidAmount: "المحصل",
    refundedAmount: "المسترد",
    netCollected: "صافي التحصيل",
    treasuryPosted: "مرحلة للخزينة",
    accountingPosted: "مرحلة محاسبيًا",
    payment: "الدفعة",
    customer: "العميل",
    invoice: "الفاتورة",
    order: "الطلب",
    amount: "المبلغ",
    paid: "المحصل",
    refunded: "المسترد",
    method: "الطريقة",
    status: "الحالة",
    treasury: "الخزينة",
    accounting: "المحاسبة",
    date: "التاريخ",
    actions: "الإجراءات",
    columns: "الأعمدة",
    sort: "الترتيب",
    selected: "محدد",
    allStatuses: "كل الحالات",
    pending: "بانتظار",
    paidStatus: "مدفوعة",
    failed: "فاشلة",
    cancelled: "ملغاة",
    refundedStatus: "مستردة",
    partiallyRefunded: "مستردة جزئيًا",
    allMethods: "كل الطرق",
    cash: "نقدي",
    bankTransfer: "تحويل بنكي",
    gateway: "بوابة دفع",
    creditCard: "بطاقة ائتمان",
    debitCard: "مدى / بطاقة",
    applePay: "Apple Pay",
    stcPay: "STC Pay",
    tamara: "تمارا",
    tabby: "تابي",
    wallet: "محفظة",
    allPosting: "كل حالات الترحيل",
    posted: "مرحلة",
    postingPending: "غير مرحلة",
    newest: "الأحدث",
    oldest: "الأقدم",
    highestAmount: "الأعلى مبلغًا",
    highestPaid: "الأعلى تحصيلًا",
    highestRefunded: "الأعلى استردادًا",
    from: "من",
    to: "إلى",
    clearSelection: "إلغاء التحديد",
    activeFilters: "فلاتر مفعلة",
    view: "عرض التفاصيل",
    confirm: "تأكيد الدفعة",
    cancel: "إلغاء الدفعة",
    copyNumber: "نسخ رقم الدفعة",
    copied: "تم النسخ",
    noDataTitle: "لا توجد مدفوعات بعد",
    noDataDesc: "عند إنشاء المدفوعات ستظهر هنا.",
    noResultsTitle: "لا توجد نتائج مطابقة",
    noResultsDesc: "غيّر البحث أو الفلاتر لعرض نتائج أخرى.",
    errorTitle: "تعذر تحميل المدفوعات",
    errorDesc: "تأكد من تشغيل الباكند ثم أعد المحاولة.",
    tryAgain: "إعادة المحاولة",
    confirmPaymentQuestion: "هل تريد تأكيد هذه الدفعة؟",
    cancelPaymentQuestion: "هل تريد إلغاء هذه الدفعة؟",
    confirmSuccess: "تم تأكيد الدفعة بنجاح.",
    cancelSuccess: "تم إلغاء الدفعة بنجاح.",
    operationFailed: "تعذر تنفيذ العملية.",
    exportEmpty: "لا توجد بيانات للتصدير.",
    printEmpty: "لا توجد بيانات للطباعة.",
    printTitle: "تقرير المدفوعات",
    generatedAt: "تاريخ الطباعة",
    showing: "عرض",
    rows: "صفوف",
    page: "صفحة",
    of: "من",
    next: "التالي",
    previous: "السابق",
    unknown: "غير محدد",
    externalReference: "مرجع خارجي",
    transaction: "عملية",
  },
  en: {
    title: "Payments",
    subtitle: "Track payments, collection, treasury posting, and accounting posting.",
    create: "Add Payment",
    refresh: "Refresh",
    export: "Export Excel",
    print: "Print",
    reset: "Reset",
    searchPlaceholder: "Search payments...",
    totalPayments: "Total payments",
    totalAmount: "Total amount",
    paidAmount: "Collected",
    refundedAmount: "Refunded",
    netCollected: "Net collected",
    treasuryPosted: "Treasury posted",
    accountingPosted: "Accounting posted",
    payment: "Payment",
    customer: "Customer",
    invoice: "Invoice",
    order: "Order",
    amount: "Amount",
    paid: "Collected",
    refunded: "Refunded",
    method: "Method",
    status: "Status",
    treasury: "Treasury",
    accounting: "Accounting",
    date: "Date",
    actions: "Actions",
    columns: "Columns",
    sort: "Sort",
    selected: "Selected",
    allStatuses: "All statuses",
    pending: "Pending",
    paidStatus: "Paid",
    failed: "Failed",
    cancelled: "Cancelled",
    refundedStatus: "Refunded",
    partiallyRefunded: "Partially refunded",
    allMethods: "All methods",
    cash: "Cash",
    bankTransfer: "Bank transfer",
    gateway: "Gateway",
    creditCard: "Credit card",
    debitCard: "Debit card",
    applePay: "Apple Pay",
    stcPay: "STC Pay",
    tamara: "Tamara",
    tabby: "Tabby",
    wallet: "Wallet",
    allPosting: "All posting",
    posted: "Posted",
    postingPending: "Pending",
    newest: "Newest",
    oldest: "Oldest",
    highestAmount: "Highest amount",
    highestPaid: "Highest paid",
    highestRefunded: "Highest refunded",
    from: "From",
    to: "To",
    clearSelection: "Clear selection",
    activeFilters: "Active filters",
    view: "View details",
    confirm: "Confirm payment",
    cancel: "Cancel payment",
    copyNumber: "Copy payment number",
    copied: "Copied",
    noDataTitle: "No payments yet",
    noDataDesc: "Created payments will appear here.",
    noResultsTitle: "No matching results",
    noResultsDesc: "Change search or filters to show other results.",
    errorTitle: "Unable to load payments",
    errorDesc: "Make sure the backend is running, then try again.",
    tryAgain: "Try again",
    confirmPaymentQuestion: "Do you want to confirm this payment?",
    cancelPaymentQuestion: "Do you want to cancel this payment?",
    confirmSuccess: "Payment confirmed successfully.",
    cancelSuccess: "Payment cancelled successfully.",
    operationFailed: "Unable to complete operation.",
    exportEmpty: "No data to export.",
    printEmpty: "No data to print.",
    printTitle: "Payments report",
    generatedAt: "Generated at",
    showing: "Showing",
    rows: "Rows",
    page: "Page",
    of: "of",
    next: "Next",
    previous: "Previous",
    unknown: "Unknown",
    externalReference: "External ref",
    transaction: "Transaction",
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

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    return ["1", "true", "yes", "on", "posted"].includes(value.toLowerCase());
  }

  return false;
}

function formatInteger(value: unknown) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
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

  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 10);
  }

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

function getApiBaseUrl() {
  const envBase =
    typeof process !== "undefined"
      ? (
          process.env.NEXT_PUBLIC_API_BASE_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          ""
        ).replace(/\/+$/, "")
      : "";

  if (envBase.endsWith("/api")) {
    return envBase.slice(0, -4);
  }

  return envBase;
}

function makeApiUrl(path: string, params?: URLSearchParams) {
  const base = getApiBaseUrl();
  const query = params?.toString();

  return `${base}${path}${query ? `?${query}` : ""}`;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  const found = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));

  return found ? decodeURIComponent(found.split("=").slice(1).join("=")) : "";
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem("primey-locale") === "en" ? "en" : "ar";
}

async function fetchJson<T>(
  url: string,
  options?: {
    signal?: AbortSignal;
    method?: "GET" | "POST";
    body?: unknown;
  },
): Promise<T> {
  const csrfToken = getCookie("csrftoken");

  const response = await fetch(url, {
    method: options?.method || "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "follow",
    signal: options?.signal,
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(options?.method === "POST" ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body:
      options?.method === "POST"
        ? JSON.stringify(options.body || {})
        : undefined,
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

  if (!payload) {
    throw new Error("Unexpected non-JSON response from server.");
  }

  return payload as T;
}

function extractPayments(payload: PaymentsApiResponse) {
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;

  if (payload.data && typeof payload.data === "object") {
    if (Array.isArray(payload.data.results)) return payload.data.results;
    if (Array.isArray(payload.data.items)) return payload.data.items;
  }

  return [];
}

function extractSummary(payload: PaymentsApiResponse) {
  if (payload.summary && typeof payload.summary === "object") return payload.summary;

  if (
    payload.data &&
    typeof payload.data === "object" &&
    payload.data.summary &&
    typeof payload.data.summary === "object"
  ) {
    return payload.data.summary;
  }

  return {};
}

function normalizeCustomer(value: unknown): PaymentCustomer | null {
  const item = asRecord(value);

  if (!Object.keys(item).length) return null;

  return {
    id: item.id === null || item.id === undefined ? null : toNumber(item.id),
    customer_code: normalizeText(item.customer_code),
    name: normalizeText(item.name || item.display_name || item.full_name),
    phone: normalizeText(item.phone || item.phone_number || item.mobile || item.primary_contact_number),
    whatsapp: normalizeText(item.whatsapp || item.whatsapp_number),
    email: normalizeText(item.email),
    status: normalizeText(item.status),
    has_customer_account: toBoolean(item.has_customer_account),
  };
}

function normalizeInvoice(value: unknown): PaymentInvoice | null {
  const item = asRecord(value);

  if (!Object.keys(item).length) return null;

  return {
    id: item.id === null || item.id === undefined ? null : toNumber(item.id),
    invoice_number: normalizeText(item.invoice_number || item.number || item.reference),
    status: normalizeText(item.status),
    total_amount: toNumber(item.total_amount),
    paid_amount: toNumber(item.paid_amount),
    due_amount: toNumber(item.due_amount),
  };
}

function normalizeOrder(value: unknown): PaymentOrder | null {
  const item = asRecord(value);

  if (!Object.keys(item).length) return null;

  return {
    id: item.id === null || item.id === undefined ? null : toNumber(item.id),
    order_number: normalizeText(item.order_number || item.number || item.code),
    status: normalizeText(item.status),
    payment_status: normalizeText(item.payment_status),
    fulfillment_status: normalizeText(item.fulfillment_status),
    total_amount: toNumber(item.total_amount),
    amount_paid: toNumber(item.amount_paid),
    remaining_amount: toNumber(item.remaining_amount),
  };
}

function normalizePayment(value: unknown): PaymentRecord {
  const item = asRecord(value);
  const customer = normalizeCustomer(item.customer);
  const invoice = normalizeInvoice(item.invoice);
  const order = normalizeOrder(item.order);

  const paymentNumber = normalizeText(
    item.payment_number || item.reference || `PAY-${normalizeText(item.id)}`,
  );

  return {
    id: toNumber(item.id),
    payment_number: paymentNumber,
    reference: paymentNumber,
    status: normalizeText(item.status).toUpperCase(),
    payment_method: normalizeText(item.payment_method || item.method).toUpperCase(),
    provider: normalizeText(item.provider).toUpperCase(),
    currency: normalizeText(item.currency, "SAR"),

    amount: toNumber(item.amount),
    paid_amount: toNumber(item.paid_amount),
    refunded_amount: toNumber(item.refunded_amount),
    remaining_amount: toNumber(item.remaining_amount),
    net_collected_amount: toNumber(item.net_collected_amount),

    invoice_id:
      item.invoice_id === null || item.invoice_id === undefined
        ? invoice?.id ?? null
        : toNumber(item.invoice_id),
    invoice,

    order_id:
      item.order_id === null || item.order_id === undefined
        ? order?.id ?? null
        : toNumber(item.order_id),
    order,

    customer_id:
      item.customer_id === null || item.customer_id === undefined
        ? customer?.id ?? null
        : toNumber(item.customer_id),
    customer,
    customer_name: normalizeText(item.customer_name || customer?.name),

    external_reference: normalizeText(item.external_reference),
    transaction_id: normalizeText(item.transaction_id),
    gateway_response_code: normalizeText(item.gateway_response_code),
    gateway_message: normalizeText(item.gateway_message),

    treasury_movement_reference: normalizeText(item.treasury_movement_reference),
    accounting_entry_reference: normalizeText(item.accounting_entry_reference),
    is_treasury_posted: toBoolean(item.is_treasury_posted),
    is_accounting_posted: toBoolean(item.is_accounting_posted),

    initiated_at: normalizeText(item.initiated_at) || null,
    paid_at: normalizeText(item.paid_at) || null,
    refunded_at: normalizeText(item.refunded_at) || null,
    cancelled_at: normalizeText(item.cancelled_at) || null,
    created_at: normalizeText(item.created_at) || null,
    updated_at: normalizeText(item.updated_at) || null,

    notes: normalizeText(item.notes),
    failure_reason: normalizeText(item.failure_reason),
  };
}

function buildSummaryFromRows(value: unknown, rows: PaymentRecord[]): PaymentSummary {
  const item = asRecord(value);

  const totalAmount = rows.reduce((sum, payment) => sum + payment.amount, 0);
  const totalPaid = rows.reduce((sum, payment) => sum + payment.paid_amount, 0);
  const totalRefunded = rows.reduce((sum, payment) => sum + payment.refunded_amount, 0);
  const netCollected = rows.reduce(
    (sum, payment) =>
      sum + (payment.net_collected_amount || payment.paid_amount - payment.refunded_amount),
    0,
  );

  const treasuryPosted = rows.filter((payment) => payment.is_treasury_posted).length;
  const accountingPosted = rows.filter((payment) => payment.is_accounting_posted).length;

  return {
    total_count: toNumber(item.total_count ?? item.count, rows.length),
    total_amount: toNumber(item.total_amount, totalAmount),
    total_paid_amount: toNumber(item.total_paid_amount, totalPaid),
    total_refunded_amount: toNumber(item.total_refunded_amount, totalRefunded),
    net_collected_amount: toNumber(item.net_collected_amount, netCollected),
    posted_treasury_count: toNumber(item.posted_treasury_count, treasuryPosted),
    unposted_treasury_count: toNumber(
      item.unposted_treasury_count,
      Math.max(rows.length - treasuryPosted, 0),
    ),
    posted_accounting_count: toNumber(item.posted_accounting_count, accountingPosted),
    unposted_accounting_count: toNumber(
      item.unposted_accounting_count,
      Math.max(rows.length - accountingPosted, 0),
    ),
    currency: normalizeText(item.currency, "SAR"),
  };
}

function getStatusLabel(status: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(status).toUpperCase();

  if (normalized === "PENDING" || normalized === "INITIATED") return t.pending;
  if (normalized === "PAID" || normalized === "CONFIRMED" || normalized === "SUCCESS") {
    return t.paidStatus;
  }
  if (normalized === "FAILED") return t.failed;
  if (normalized === "CANCELLED" || normalized === "CANCELED") return t.cancelled;
  if (normalized === "REFUNDED") return t.refundedStatus;
  if (normalized === "PARTIALLY_REFUNDED") return t.partiallyRefunded;

  return normalized || t.unknown;
}

function getStatusClass(status: string) {
  const normalized = normalizeText(status).toUpperCase();

  if (["PAID", "CONFIRMED", "SUCCESS"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50";
  }

  if (["PENDING", "INITIATED"].includes(normalized)) {
    return "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50";
  }

  if (["FAILED", "CANCELLED", "CANCELED"].includes(normalized)) {
    return "border-red-500/30 bg-red-50 text-red-700 hover:bg-red-50";
  }

  if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(normalized)) {
    return "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-50";
  }

  return "border-muted bg-muted/40 text-muted-foreground hover:bg-muted/40";
}

function getMethodLabel(method: string, locale: Locale) {
  const t = translations[locale];
  const normalized = normalizeText(method).toUpperCase();

  if (normalized === "CASH") return t.cash;
  if (normalized === "BANK_TRANSFER") return t.bankTransfer;
  if (normalized === "GATEWAY") return t.gateway;
  if (normalized === "CREDIT_CARD") return t.creditCard;
  if (normalized === "DEBIT_CARD") return t.debitCard;
  if (normalized === "APPLE_PAY") return t.applePay;
  if (normalized === "STC_PAY") return t.stcPay;
  if (normalized === "TAMARA") return t.tamara;
  if (normalized === "TABBY") return t.tabby;
  if (normalized === "WALLET") return t.wallet;

  return normalized || t.unknown;
}

function canConfirmPayment(payment: PaymentRecord) {
  const status = normalizeText(payment.status).toUpperCase();
  return Boolean(payment.id) && !["PAID", "CONFIRMED", "SUCCESS", "CANCELLED", "CANCELED", "REFUNDED"].includes(status);
}

function canCancelPayment(payment: PaymentRecord) {
  const status = normalizeText(payment.status).toUpperCase();
  return Boolean(payment.id) && !["PAID", "CONFIRMED", "SUCCESS", "CANCELLED", "CANCELED", "REFUNDED"].includes(status);
}

function SarIcon({ className }: { className?: string }) {
  return (
    <Image
      src={SAR_ICON}
      alt="SAR"
      width={14}
      height={14}
      className={cn("inline-block h-3.5 w-3.5 object-contain", className)}
      unoptimized
    />
  );
}

function MoneyValue({ value }: { value: unknown }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-medium tabular-nums text-foreground">
      <span>{formatMoney(value)}</span>
      <SarIcon />
    </span>
  );
}

function KpiCard({
  title,
  value,
  trend,
}: {
  title: string;
  value: React.ReactNode;
  trend: string;
}) {
  return (
    <Card className="rounded-lg border bg-card shadow-none">
      <CardHeader className="relative min-h-[112px] px-6 py-5">
        <CardDescription className="text-sm font-medium text-muted-foreground">
          {title}
        </CardDescription>

        <CardTitle className="font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
          {value}
        </CardTitle>

        <CardAction>
          <Badge
            variant="outline"
            className="rounded-full border-emerald-500/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            {trend}
          </Badge>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

function StatusBadge({ status, locale }: { status: string; locale: Locale }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full rounded-full px-2.5 py-1 text-xs font-medium",
        getStatusClass(status),
      )}
    >
      <span className="truncate">{getStatusLabel(status, locale)}</span>
    </Badge>
  );
}

function PostingBadge({
  posted,
  locale,
}: {
  posted: boolean;
  locale: Locale;
}) {
  const t = translations[locale];

  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full rounded-full px-2.5 py-1 text-xs font-medium",
        posted
          ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
          : "border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-50",
      )}
    >
      <span className="truncate">{posted ? t.posted : t.postingPending}</span>
    </Badge>
  );
}

function HeaderSortButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex w-full items-center justify-start gap-1 truncate text-xs font-semibold transition hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span className="truncate">{children}</span>
      <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

function TableHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <TableHead
      className={cn(
        "h-11 whitespace-nowrap px-4 text-right align-middle text-xs font-semibold text-muted-foreground",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

function TableBodyCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <TableCell
      className={cn(
        "h-[62px] overflow-hidden px-4 text-right align-middle",
        className,
      )}
    >
      {children}
    </TableCell>
  );
}

export default function SystemPaymentsPage() {
  const [locale, setLocale] = React.useState<Locale>("ar");
  const [payments, setPayments] = React.useState<PaymentRecord[]>([]);
  const [summary, setSummary] = React.useState<PaymentSummary>(() =>
    buildSummaryFromRows({}, []),
  );

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<number | null>(null);
  const [error, setError] = React.useState("");

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<PaymentStatus>("all");
  const [methodFilter, setMethodFilter] = React.useState<MethodFilter>("all");
  const [treasuryFilter, setTreasuryFilter] = React.useState<PostingFilter>("all");
  const [accountingFilter, setAccountingFilter] = React.useState<PostingFilter>("all");
  const [sortKey, setSortKey] = React.useState<SortKey>("newest");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Array<number>>([]);
  const [visibleColumns, setVisibleColumns] =
    React.useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
  const [page, setPage] = React.useState(1);

  const didLoadRef = React.useRef(false);

  const t = translations[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const pageSize = 10;

  React.useEffect(() => {
    const applyLocale = () => setLocale(getInitialLocale());

    applyLocale();

    window.addEventListener("storage", applyLocale);
    window.addEventListener("primey-locale-changed", applyLocale);

    return () => {
      window.removeEventListener("storage", applyLocale);
      window.removeEventListener("primey-locale-changed", applyLocale);
    };
  }, []);

  const loadPayments = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const controller = new AbortController();

      try {
        if (!silent) setLoading(true);

        setRefreshing(true);
        setError("");

        const params = new URLSearchParams({
          page: "1",
          page_size: "500",
        });

        const payload = await fetchJson<PaymentsApiResponse>(
          makeApiUrl("/api/payments/", params),
          { signal: controller.signal },
        );

        const nextPayments = extractPayments(payload).map(normalizePayment);
        const nextSummary = buildSummaryFromRows(extractSummary(payload), nextPayments);

        setPayments(nextPayments);
        setSummary(nextSummary);
        setSelectedIds([]);
        setPage(1);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error && caughtError.message
            ? caughtError.message
            : t.errorDesc;

        setPayments([]);
        setSummary(buildSummaryFromRows({}, []));
        setSelectedIds([]);
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }

      return () => controller.abort();
    },
    [t.errorDesc],
  );

  React.useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    void loadPayments();
  }, [loadPayments]);

  const filteredPayments = React.useMemo(() => {
    const query = search.trim().toLowerCase();

    const rows = payments.filter((payment) => {
      const status = normalizeText(payment.status).toUpperCase();
      const method = normalizeText(payment.payment_method).toUpperCase();

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (methodFilter !== "all" && method !== methodFilter) return false;

      if (treasuryFilter === "posted" && !payment.is_treasury_posted) return false;
      if (treasuryFilter === "pending" && payment.is_treasury_posted) return false;

      if (accountingFilter === "posted" && !payment.is_accounting_posted) return false;
      if (accountingFilter === "pending" && payment.is_accounting_posted) return false;

      if (dateFrom) {
        const value = (payment.paid_at || payment.created_at || "").slice(0, 10);
        if (value && value < dateFrom) return false;
      }

      if (dateTo) {
        const value = (payment.paid_at || payment.created_at || "").slice(0, 10);
        if (value && value > dateTo) return false;
      }

      if (!query) return true;

      const haystack = [
        payment.payment_number,
        payment.customer_name,
        payment.customer?.name,
        payment.customer?.phone,
        payment.customer?.email,
        payment.invoice?.invoice_number,
        payment.order?.order_number,
        payment.external_reference,
        payment.transaction_id,
        payment.gateway_response_code,
        payment.gateway_message,
        payment.treasury_movement_reference,
        payment.accounting_entry_reference,
        payment.notes,
        payment.failure_reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    return [...rows].sort((a, b) => {
      if (sortKey === "oldest") {
        return normalizeText(a.created_at || a.paid_at).localeCompare(
          normalizeText(b.created_at || b.paid_at),
        );
      }

      if (sortKey === "highest_amount") return b.amount - a.amount;
      if (sortKey === "highest_paid") return b.paid_amount - a.paid_amount;
      if (sortKey === "highest_refunded") return b.refunded_amount - a.refunded_amount;

      return normalizeText(b.created_at || b.paid_at).localeCompare(
        normalizeText(a.created_at || a.paid_at),
      );
    });
  }, [
    accountingFilter,
    dateFrom,
    dateTo,
    methodFilter,
    payments,
    search,
    sortKey,
    statusFilter,
    treasuryFilter,
  ]);

  const filteredSummary = React.useMemo(
    () => buildSummaryFromRows({}, filteredPayments),
    [filteredPayments],
  );

  const totalPages = Math.max(Math.ceil(filteredPayments.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);

  const paginatedPayments = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [currentPage, filteredPayments]);

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length || 1;

  const hasActiveFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    methodFilter !== "all" ||
    treasuryFilter !== "all" ||
    accountingFilter !== "all" ||
    sortKey !== "newest" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const allPageSelected =
    paginatedPayments.length > 0 &&
    paginatedPayments.every((payment) => selectedIds.includes(payment.id));

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setMethodFilter("all");
    setTreasuryFilter("all");
    setAccountingFilter("all");
    setSortKey("newest");
    setDateFrom("");
    setDateTo("");
    setSelectedIds([]);
    setPage(1);
  }

  function toggleSelectAllPage(checked: boolean) {
    if (!checked) {
      setSelectedIds((current) =>
        current.filter((id) => !paginatedPayments.some((payment) => payment.id === id)),
      );
      return;
    }

    setSelectedIds((current) => {
      const next = new Set(current);
      paginatedPayments.forEach((payment) => next.add(payment.id));
      return Array.from(next);
    });
  }

  function toggleSelectPayment(id: number, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, id]));
      return current.filter((item) => item !== id);
    });
  }

  async function copyPaymentNumber(payment: PaymentRecord) {
    try {
      await navigator.clipboard.writeText(payment.payment_number);
      toast.success(t.copied);
    } catch {
      toast.error(t.operationFailed);
    }
  }

  async function postPaymentAction(payment: PaymentRecord, action: "confirm" | "cancel") {
    const confirmed = window.confirm(
      action === "confirm" ? t.confirmPaymentQuestion : t.cancelPaymentQuestion,
    );

    if (!confirmed) return;

    setActionLoadingId(payment.id);

    try {
      await fetchJson<unknown>(makeApiUrl(`/api/payments/${payment.id}/${action}/`), {
        method: "POST",
        body:
          action === "confirm"
            ? {
                paid_amount: payment.amount || payment.paid_amount,
                auto_create_treasury_movement: true,
                auto_post_accounting: true,
              }
            : { reason: "" },
      });

      toast.success(action === "confirm" ? t.confirmSuccess : t.cancelSuccess);
      await loadPayments({ silent: true });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message
          ? caughtError.message
          : t.operationFailed;

      toast.error(message);
    } finally {
      setActionLoadingId(null);
    }
  }

  function buildExportRows() {
    return filteredPayments.map((payment) => ({
      payment: payment.payment_number,
      customer: payment.customer_name || payment.customer?.name || "—",
      invoice: payment.invoice?.invoice_number || "—",
      order: payment.order?.order_number || "—",
      amount: payment.amount,
      paid: payment.paid_amount,
      refunded: payment.refunded_amount,
      method: getMethodLabel(payment.payment_method, locale),
      status: getStatusLabel(payment.status, locale),
      treasury: payment.is_treasury_posted ? t.posted : t.postingPending,
      accounting: payment.is_accounting_posted ? t.posted : t.postingPending,
      date: formatDate(payment.paid_at || payment.created_at),
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
            .num { mso-number-format: "0.00"; }
          </style>
        </head>
        <body>
          <h2>${escapeHtml(t.printTitle)}</h2>
          <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.payment)}</th>
                <th>${escapeHtml(t.customer)}</th>
                <th>${escapeHtml(t.invoice)}</th>
                <th>${escapeHtml(t.order)}</th>
                <th>${escapeHtml(t.amount)}</th>
                <th>${escapeHtml(t.paid)}</th>
                <th>${escapeHtml(t.refunded)}</th>
                <th>${escapeHtml(t.method)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.treasury)}</th>
                <th>${escapeHtml(t.accounting)}</th>
                <th>${escapeHtml(t.date)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.payment)}</td>
                      <td>${escapeHtml(row.customer)}</td>
                      <td>${escapeHtml(row.invoice)}</td>
                      <td>${escapeHtml(row.order)}</td>
                      <td class="num">${escapeHtml(row.amount)}</td>
                      <td class="num">${escapeHtml(row.paid)}</td>
                      <td class="num">${escapeHtml(row.refunded)}</td>
                      <td>${escapeHtml(row.method)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.treasury)}</td>
                      <td>${escapeHtml(row.accounting)}</td>
                      <td>${escapeHtml(row.date)}</td>
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
    link.download = `primey-care-payments-${new Date().toISOString().slice(0, 10)}.xls`;
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
      toast.error(t.operationFailed);
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
              align-items: flex-start;
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
            .box strong {
              font-size: 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
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
            .num { direction: ltr; unicode-bidi: embed; white-space: nowrap; }
            @media print {
              body { padding: 16px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Primey Care - ${escapeHtml(t.printTitle)}</h1>
              <p>${escapeHtml(t.generatedAt)}: ${escapeHtml(new Date().toISOString().slice(0, 19).replace("T", " "))}</p>
            </div>
            <div>
              <p>${escapeHtml(t.showing)}: ${escapeHtml(rows.length)}</p>
            </div>
          </div>

          <div class="summary">
            <div class="box"><span>${escapeHtml(t.totalPayments)}</span><strong>${escapeHtml(filteredSummary.total_count)}</strong></div>
            <div class="box"><span>${escapeHtml(t.totalAmount)}</span><strong>${escapeHtml(formatMoney(filteredSummary.total_amount))}</strong></div>
            <div class="box"><span>${escapeHtml(t.paidAmount)}</span><strong>${escapeHtml(formatMoney(filteredSummary.total_paid_amount))}</strong></div>
            <div class="box"><span>${escapeHtml(t.netCollected)}</span><strong>${escapeHtml(formatMoney(filteredSummary.net_collected_amount))}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${escapeHtml(t.payment)}</th>
                <th>${escapeHtml(t.customer)}</th>
                <th>${escapeHtml(t.invoice)}</th>
                <th>${escapeHtml(t.order)}</th>
                <th>${escapeHtml(t.amount)}</th>
                <th>${escapeHtml(t.paid)}</th>
                <th>${escapeHtml(t.refunded)}</th>
                <th>${escapeHtml(t.method)}</th>
                <th>${escapeHtml(t.status)}</th>
                <th>${escapeHtml(t.treasury)}</th>
                <th>${escapeHtml(t.accounting)}</th>
                <th>${escapeHtml(t.date)}</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `
                    <tr>
                      <td>${escapeHtml(row.payment)}</td>
                      <td>${escapeHtml(row.customer)}</td>
                      <td>${escapeHtml(row.invoice)}</td>
                      <td>${escapeHtml(row.order)}</td>
                      <td class="num">${escapeHtml(formatMoney(row.amount))}</td>
                      <td class="num">${escapeHtml(formatMoney(row.paid))}</td>
                      <td class="num">${escapeHtml(formatMoney(row.refunded))}</td>
                      <td>${escapeHtml(row.method)}</td>
                      <td>${escapeHtml(row.status)}</td>
                      <td>${escapeHtml(row.treasury)}</td>
                      <td>${escapeHtml(row.accounting)}</td>
                      <td>${escapeHtml(row.date)}</td>
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
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
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
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
            onClick={() => void loadPayments({ silent: true })}
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
            variant="outline"
            className="h-9 rounded-lg"
            onClick={exportExcel}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {t.export}
          </Button>

          <Button
            variant="outline"
            className="h-9 rounded-lg"
            onClick={printPage}
          >
            <Printer className="h-4 w-4" />
            {t.print}
          </Button>

          <Button
            asChild
            className="h-9 rounded-lg bg-black px-4 text-white hover:bg-black/90"
          >
            <Link href="/system/payments/create">
              <Plus className="h-4 w-4" />
              {t.create}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.totalPayments}
          value={formatInteger(summary.total_count)}
          trend={`${formatInteger(filteredPayments.length)}+`}
        />

        <KpiCard
          title={t.totalAmount}
          value={<MoneyValue value={summary.total_amount} />}
          trend={t.totalAmount}
        />

        <KpiCard
          title={t.paidAmount}
          value={<MoneyValue value={summary.total_paid_amount} />}
          trend={t.paidAmount}
        />

        <KpiCard
          title={t.netCollected}
          value={<MoneyValue value={summary.net_collected_amount} />}
          trend={t.netCollected}
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
              onClick={() => void loadPayments()}
            >
              <RefreshCw className="h-4 w-4" />
              {t.tryAgain}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col gap-2 lg:flex-1">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="relative w-full lg:max-w-[360px]">
                  <Search
                    className={cn(
                      "absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
                      locale === "ar" ? "right-3" : "left-3",
                    )}
                  />
                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder={t.searchPlaceholder}
                    className={cn(
                      "h-9 rounded-lg bg-background",
                      locale === "ar" ? "pr-9" : "pl-9",
                    )}
                  />
                </div>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as PaymentStatus);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background lg:w-[138px]">
                    <CheckCircle2 className="h-4 w-4" />
                    <SelectValue placeholder={t.status} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allStatuses}</SelectItem>
                    <SelectItem value="PENDING">{t.pending}</SelectItem>
                    <SelectItem value="PAID">{t.paidStatus}</SelectItem>
                    <SelectItem value="FAILED">{t.failed}</SelectItem>
                    <SelectItem value="CANCELLED">{t.cancelled}</SelectItem>
                    <SelectItem value="REFUNDED">{t.refundedStatus}</SelectItem>
                    <SelectItem value="PARTIALLY_REFUNDED">{t.partiallyRefunded}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={methodFilter}
                  onValueChange={(value) => {
                    setMethodFilter(value as MethodFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background lg:w-[150px]">
                    <WalletCards className="h-4 w-4" />
                    <SelectValue placeholder={t.method} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allMethods}</SelectItem>
                    <SelectItem value="CASH">{t.cash}</SelectItem>
                    <SelectItem value="BANK_TRANSFER">{t.bankTransfer}</SelectItem>
                    <SelectItem value="GATEWAY">{t.gateway}</SelectItem>
                    <SelectItem value="CREDIT_CARD">{t.creditCard}</SelectItem>
                    <SelectItem value="DEBIT_CARD">{t.debitCard}</SelectItem>
                    <SelectItem value="APPLE_PAY">{t.applePay}</SelectItem>
                    <SelectItem value="STC_PAY">{t.stcPay}</SelectItem>
                    <SelectItem value="TAMARA">{t.tamara}</SelectItem>
                    <SelectItem value="TABBY">{t.tabby}</SelectItem>
                    <SelectItem value="WALLET">{t.wallet}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={treasuryFilter}
                  onValueChange={(value) => {
                    setTreasuryFilter(value as PostingFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background lg:w-[145px]">
                    <Banknote className="h-4 w-4" />
                    <SelectValue placeholder={t.treasury} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allPosting}</SelectItem>
                    <SelectItem value="posted">{t.posted}</SelectItem>
                    <SelectItem value="pending">{t.postingPending}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={accountingFilter}
                  onValueChange={(value) => {
                    setAccountingFilter(value as PostingFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-lg bg-background lg:w-[145px]">
                    <ReceiptText className="h-4 w-4" />
                    <SelectValue placeholder={t.accounting} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allPosting}</SelectItem>
                    <SelectItem value="posted">{t.posted}</SelectItem>
                    <SelectItem value="pending">{t.postingPending}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3">
                  <span className="text-xs text-muted-foreground">{t.from}</span>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => {
                      setDateFrom(event.target.value);
                      setPage(1);
                    }}
                    className="h-7 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>

                <div className="flex h-9 items-center gap-2 rounded-lg border bg-background px-3">
                  <span className="text-xs text-muted-foreground">{t.to}</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(event) => {
                      setDateTo(event.target.value);
                      setPage(1);
                    }}
                    className="h-7 w-[135px] border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 rounded-lg bg-background">
                    <ColumnsIcon className="h-4 w-4" />
                    {t.columns}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
                  <DropdownMenuLabel>{t.columns}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(
                    [
                      ["select", t.selected],
                      ["payment", t.payment],
                      ["customer", t.customer],
                      ["invoice", t.invoice],
                      ["order", t.order],
                      ["amount", t.amount],
                      ["paid", t.paid],
                      ["refunded", t.refunded],
                      ["method", t.method],
                      ["status", t.status],
                      ["treasury", t.treasury],
                      ["accounting", t.accounting],
                      ["date", t.date],
                      ["actions", t.actions],
                    ] as [ColumnKey, string][]
                  ).map(([key, label]) => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={visibleColumns[key]}
                      onCheckedChange={(checked) =>
                        setVisibleColumns((current) => ({
                          ...current,
                          [key]: Boolean(checked),
                        }))
                      }
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                onClick={resetFilters}
              >
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 rounded-lg bg-background">
                    <ArrowUpDown className="h-4 w-4" />
                    {t.sort}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={locale === "ar" ? "start" : "end"} className="w-56">
                  {(
                    [
                      ["newest", t.newest],
                      ["oldest", t.oldest],
                      ["highest_amount", t.highestAmount],
                      ["highest_paid", t.highestPaid],
                      ["highest_refunded", t.highestRefunded],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={sortKey === key}
                      onCheckedChange={() => {
                        setSortKey(key);
                        setPage(1);
                      }}
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {selectedIds.length > 0 ? (
                <Button
                  variant="outline"
                  className="h-9 rounded-lg bg-background"
                  onClick={() => setSelectedIds([])}
                >
                  <XCircle className="h-4 w-4" />
                  {t.clearSelection} ({formatInteger(selectedIds.length)})
                </Button>
              ) : null}

              {hasActiveFilters ? (
                <Badge variant="secondary" className="h-9 rounded-lg px-3 text-xs font-semibold">
                  {t.activeFilters}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="overflow-x-auto">
              <Table className="min-w-[1280px] table-fixed">
                <TableHeader>
                  <TableRow className="h-11 bg-muted/40 hover:bg-muted/40">
                    {visibleColumns.select ? (
                      <TableHeaderCell className="w-[46px] px-3">
                        <Checkbox
                          checked={allPageSelected}
                          onCheckedChange={(checked) =>
                            toggleSelectAllPage(Boolean(checked))
                          }
                          aria-label={t.selected}
                        />
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.payment ? (
                      <TableHeaderCell className="w-[190px]">
                        <HeaderSortButton
                          active={sortKey === "newest"}
                          onClick={() => {
                            setSortKey("newest");
                            setPage(1);
                          }}
                        >
                          {t.payment}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.customer ? (
                      <TableHeaderCell className="w-[185px]">{t.customer}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.invoice ? (
                      <TableHeaderCell className="w-[150px]">{t.invoice}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.order ? (
                      <TableHeaderCell className="w-[145px]">{t.order}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.amount ? (
                      <TableHeaderCell className="w-[110px]">
                        <HeaderSortButton
                          active={sortKey === "highest_amount"}
                          onClick={() => {
                            setSortKey("highest_amount");
                            setPage(1);
                          }}
                        >
                          {t.amount}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.paid ? (
                      <TableHeaderCell className="w-[110px]">
                        <HeaderSortButton
                          active={sortKey === "highest_paid"}
                          onClick={() => {
                            setSortKey("highest_paid");
                            setPage(1);
                          }}
                        >
                          {t.paid}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.refunded ? (
                      <TableHeaderCell className="w-[110px]">
                        <HeaderSortButton
                          active={sortKey === "highest_refunded"}
                          onClick={() => {
                            setSortKey("highest_refunded");
                            setPage(1);
                          }}
                        >
                          {t.refunded}
                        </HeaderSortButton>
                      </TableHeaderCell>
                    ) : null}

                    {visibleColumns.method ? (
                      <TableHeaderCell className="w-[120px]">{t.method}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.status ? (
                      <TableHeaderCell className="w-[110px]">{t.status}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.treasury ? (
                      <TableHeaderCell className="w-[110px]">{t.treasury}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.accounting ? (
                      <TableHeaderCell className="w-[110px]">{t.accounting}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.date ? (
                      <TableHeaderCell className="w-[115px]">{t.date}</TableHeaderCell>
                    ) : null}

                    {visibleColumns.actions ? (
                      <TableHeaderCell className="w-[72px] text-center">
                        {t.actions}
                      </TableHeaderCell>
                    ) : null}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedPayments.length ? (
                    paginatedPayments.map((payment) => (
                      <TableRow key={payment.id} className="h-[62px]">
                        {visibleColumns.select ? (
                          <TableBodyCell className="w-[46px] px-3">
                            <Checkbox
                              checked={selectedIds.includes(payment.id)}
                              onCheckedChange={(checked) =>
                                toggleSelectPayment(payment.id, Boolean(checked))
                              }
                              aria-label={payment.payment_number}
                            />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.payment ? (
                          <TableBodyCell className="w-[190px]">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                                <WalletCards className="h-4 w-4 text-muted-foreground" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <Link
                                  href={`/system/payments/${payment.id}`}
                                  className="block truncate text-sm font-semibold text-foreground hover:underline"
                                >
                                  {payment.payment_number}
                                </Link>
                                <p className="truncate text-xs text-muted-foreground">
                                  {payment.provider || "—"}
                                </p>
                              </div>
                            </div>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.customer ? (
                          <TableBodyCell className="w-[185px]">
                            <div className="min-w-0">
                              {payment.customer_id ? (
                                <Link
                                  href={`/system/customers/${payment.customer_id}`}
                                  className="block truncate text-sm font-medium text-foreground hover:underline"
                                >
                                  {payment.customer_name || payment.customer?.name || "—"}
                                </Link>
                              ) : (
                                <p className="truncate text-sm font-medium text-foreground">
                                  {payment.customer_name || payment.customer?.name || "—"}
                                </p>
                              )}

                              <p className="truncate text-xs text-muted-foreground">
                                {payment.customer?.phone || payment.customer?.email || "—"}
                              </p>
                            </div>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.invoice ? (
                          <TableBodyCell className="w-[150px]">
                            {payment.invoice_id ? (
                              <Link
                                href={`/system/invoices/${payment.invoice_id}`}
                                className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                              >
                                <span className="truncate">
                                  {payment.invoice?.invoice_number || `#${payment.invoice_id}`}
                                </span>
                                <ReceiptText className="h-3.5 w-3.5 shrink-0" />
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.order ? (
                          <TableBodyCell className="w-[145px]">
                            {payment.order_id ? (
                              <Link
                                href={`/system/orders/${payment.order_id}`}
                                className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                              >
                                <span className="truncate">
                                  {payment.order?.order_number || `#${payment.order_id}`}
                                </span>
                                <FileText className="h-3.5 w-3.5 shrink-0" />
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.amount ? (
                          <TableBodyCell className="w-[110px]">
                            <MoneyValue value={payment.amount} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.paid ? (
                          <TableBodyCell className="w-[110px]">
                            <MoneyValue value={payment.paid_amount} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.refunded ? (
                          <TableBodyCell className="w-[110px]">
                            <MoneyValue value={payment.refunded_amount} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.method ? (
                          <TableBodyCell className="w-[120px]">
                            <Badge
                              variant="outline"
                              className="max-w-full rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium"
                            >
                              <span className="truncate">
                                {getMethodLabel(payment.payment_method, locale)}
                              </span>
                            </Badge>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.status ? (
                          <TableBodyCell className="w-[110px]">
                            <StatusBadge status={payment.status} locale={locale} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.treasury ? (
                          <TableBodyCell className="w-[110px]">
                            <PostingBadge posted={payment.is_treasury_posted} locale={locale} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.accounting ? (
                          <TableBodyCell className="w-[110px]">
                            <PostingBadge posted={payment.is_accounting_posted} locale={locale} />
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.date ? (
                          <TableBodyCell className="w-[115px]">
                            <span className="block truncate text-sm tabular-nums text-muted-foreground">
                              {formatDate(payment.paid_at || payment.created_at)}
                            </span>
                          </TableBodyCell>
                        ) : null}

                        {visibleColumns.actions ? (
                          <TableBodyCell className="w-[72px] text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg"
                                  disabled={actionLoadingId === payment.id}
                                >
                                  {actionLoadingId === payment.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent
                                align={locale === "ar" ? "start" : "end"}
                                className="w-52"
                              >
                                <DropdownMenuItem asChild>
                                  <Link href={`/system/payments/${payment.id}`}>
                                    <Eye className="h-4 w-4" />
                                    {t.view}
                                  </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => void copyPaymentNumber(payment)}
                                >
                                  <Copy className="h-4 w-4" />
                                  {t.copyNumber}
                                </DropdownMenuItem>

                                {canConfirmPayment(payment) ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      void postPaymentAction(payment, "confirm")
                                    }
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    {t.confirm}
                                  </DropdownMenuItem>
                                ) : null}

                                {canCancelPayment(payment) ? (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onClick={() =>
                                        void postPaymentAction(payment, "cancel")
                                      }
                                    >
                                      <XCircle className="h-4 w-4" />
                                      {t.cancel}
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableBodyCell>
                        ) : null}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={visibleColumnCount} className="h-72">
                        <div className="flex flex-col items-center justify-center gap-3 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/40">
                            <WalletCards className="h-6 w-6 text-muted-foreground" />
                          </div>

                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">
                              {hasActiveFilters ? t.noResultsTitle : t.noDataTitle}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {hasActiveFilters ? t.noResultsDesc : t.noDataDesc}
                            </p>
                          </div>

                          {hasActiveFilters ? (
                            <Button
                              variant="outline"
                              className="h-9 rounded-lg"
                              onClick={resetFilters}
                            >
                              <RotateCcw className="h-4 w-4" />
                              {t.reset}
                            </Button>
                          ) : (
                            <Button
                              asChild
                              className="h-9 rounded-lg bg-black text-white hover:bg-black/90"
                            >
                              <Link href="/system/payments/create">
                                <Plus className="h-4 w-4" />
                                {t.create}
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              {t.showing}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(paginatedPayments.length)}
              </span>{" "}
              {t.of}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatInteger(filteredPayments.length)}
              </span>{" "}
              {t.rows}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                disabled={currentPage <= 1}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                {t.previous}
              </Button>

              <div className="rounded-lg border bg-background px-3 py-2 text-sm tabular-nums">
                {t.page} {formatInteger(currentPage)} {t.of}{" "}
                {formatInteger(totalPages)}
              </div>

              <Button
                variant="outline"
                className="h-9 rounded-lg bg-background"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(current + 1, totalPages))
                }
              >
                {t.next}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}